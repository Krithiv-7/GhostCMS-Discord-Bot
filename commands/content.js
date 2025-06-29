const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GhostAPIService = require('../services/ghostApi');
const AnalyticsService = require('../services/analytics');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embedUtils');
const { handleAsyncError } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('content')
    .setDescription('Content discovery and recommendations')
    .addSubcommand(subcommand =>
      subcommand
        .setName('trending')
        .setDescription('Get trending/popular content based on views')
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Number of recent days to analyze (1-30)')
            .setMinValue(1)
            .setMaxValue(30)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('random')
        .setDescription('Get random content discovery')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Type of content to discover')
            .addChoices(
              { name: 'Posts', value: 'posts' },
              { name: 'Pages', value: 'pages' },
              { name: 'Mixed', value: 'mixed' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('archive')
        .setDescription('Browse content archive by date')
        .addStringOption(option =>
          option
            .setName('year')
            .setDescription('Year to browse (e.g., 2024)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('month')
            .setDescription('Month to browse (1-12)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('related')
        .setDescription('Find content related to a specific post')
        .addStringOption(option =>
          option
            .setName('post_slug')
            .setDescription('Slug of the post to find related content for')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const ghostApi = new GhostAPIService();
    const analytics = new AnalyticsService();
    await analytics.initialize();

    try {
      switch (subcommand) {
        case 'trending':
          const days = interaction.options.getInteger('days') || 7;
          
          // Get popular content from analytics
          const popularContent = await analytics.getPopularContent(null, days, 10);
          
          if (!popularContent || popularContent.length === 0) {
            // Fallback to recent posts if no analytics data
            const recentPosts = await ghostApi.getPosts({ 
              limit: 5,
              filter: 'featured:true+published_at:>now-7d',
              include: 'tags,authors'
            });

            const embed = createSuccessEmbed('Trending Content')
              .setTitle('📈 Trending Content')
              .setDescription('Based on recent featured posts:');

            if (recentPosts.posts && recentPosts.posts.length > 0) {
              recentPosts.posts.forEach((post, index) => {
                embed.addFields({
                  name: `${index + 1}. ${post.title}`,
                  value: `📅 ${new Date(post.published_at).toLocaleDateString()}\n📖 [Read More](${post.url})`,
                  inline: false
                });
              });
            } else {
              embed.setDescription('No trending content data available yet. Check back later!');
            }

            await interaction.editReply({ embeds: [embed] });
          } else {
            const embed = createSuccessEmbed('Trending Content')
              .setTitle('📈 Trending Content')
              .setDescription(`Most popular content in the last ${days} days:`);

            popularContent.slice(0, 10).forEach((content, index) => {
              const emoji = content.content_type === 'post' ? '📰' : '📄';
              embed.addFields({
                name: `${index + 1}. ${emoji} ${content.content_title}`,
                value: `👀 ${content.interaction_count} views • 👥 ${content.unique_users} unique viewers`,
                inline: false
              });
            });

            await interaction.editReply({ embeds: [embed] });
          }
          break;

        case 'random':
          const contentType = interaction.options.getString('type') || 'mixed';
          let randomContent = [];

          if (contentType === 'posts' || contentType === 'mixed') {
            const posts = await ghostApi.getPosts({ 
              limit: contentType === 'mixed' ? 3 : 5,
              include: 'tags,authors'
            });
            if (posts.posts) {
              randomContent.push(...posts.posts.map(post => ({ ...post, type: 'post' })));
            }
          }

          if (contentType === 'pages' || contentType === 'mixed') {
            const pages = await ghostApi.getPages({ 
              limit: contentType === 'mixed' ? 2 : 5,
              include: 'authors'
            });
            if (pages.pages) {
              randomContent.push(...pages.pages.map(page => ({ ...page, type: 'page' })));
            }
          }

          // Randomize the content
          randomContent = randomContent.sort(() => Math.random() - 0.5).slice(0, 5);

          const randomEmbed = createSuccessEmbed('Content Discovery')
            .setTitle('🎲 Random Content Discovery')
            .setDescription('Here are some randomly selected content pieces for you:');

          randomContent.forEach((content, index) => {
            const emoji = content.type === 'post' ? '📰' : '📄';
            const date = content.published_at || content.updated_at;
            randomEmbed.addFields({
              name: `${index + 1}. ${emoji} ${content.title}`,
              value: `📅 ${new Date(date).toLocaleDateString()}\n📖 [Read More](${content.url})`,
              inline: false
            });
          });

          await interaction.editReply({ embeds: [randomEmbed] });
          break;

        case 'archive':
          const year = interaction.options.getString('year');
          const month = interaction.options.getString('month');
          
          // Build date filter
          let dateFilter = `published_at:>=${year}-01-01+published_at:<${parseInt(year) + 1}-01-01`;
          if (month) {
            const monthNum = parseInt(month);
            const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
            const nextYear = monthNum === 12 ? parseInt(year) + 1 : parseInt(year);
            dateFilter = `published_at:>=${year}-${month.padStart(2, '0')}-01+published_at:<${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
          }

          const archivePosts = await ghostApi.getPosts({
            filter: dateFilter,
            limit: 15,
            include: 'tags,authors'
          });

          const archiveEmbed = createSuccessEmbed('Content Archive')
            .setTitle(`📚 Archive: ${month ? `${year}/${month}` : year}`)
            .setDescription(`Found ${archivePosts.posts?.length || 0} posts:`);

          if (archivePosts.posts && archivePosts.posts.length > 0) {
            archivePosts.posts.forEach((post, index) => {
              archiveEmbed.addFields({
                name: `${index + 1}. ${post.title}`,
                value: `📅 ${new Date(post.published_at).toLocaleDateString()}\n📖 [Read More](${post.url})`,
                inline: false
              });
            });
          } else {
            archiveEmbed.setDescription(`No posts found for ${month ? `${year}/${month}` : year}`);
          }

          await interaction.editReply({ embeds: [archiveEmbed] });
          break;

        case 'related':
          const postSlug = interaction.options.getString('post_slug');
          
          // Get the original post
          const originalPost = await ghostApi.getPosts({
            filter: `slug:${postSlug}`,
            limit: 1,
            include: 'tags,authors'
          });

          if (!originalPost.posts || originalPost.posts.length === 0) {
            const embed = createErrorEmbed(`Post with slug "${postSlug}" not found`);
            await interaction.editReply({ embeds: [embed] });
            return;
          }

          const post = originalPost.posts[0];
          
          // Find related posts by tags
          const postTags = post.tags?.map(tag => tag.slug).join('+') || '';
          let relatedPosts = null;

          if (postTags) {
            relatedPosts = await ghostApi.getPosts({
              filter: `tag:[${postTags}]+id:-${post.id}`, // Exclude the original post
              limit: 8,
              include: 'tags,authors'
            });
          }

          // Fallback to same author's posts
          if (!relatedPosts?.posts || relatedPosts.posts.length === 0) {
            const authorSlug = post.authors?.[0]?.slug;
            if (authorSlug) {
              relatedPosts = await ghostApi.getPosts({
                filter: `author:${authorSlug}+id:-${post.id}`,
                limit: 5,
                include: 'tags,authors'
              });
            }
          }

          const relatedEmbed = createSuccessEmbed('Related Content')
            .setTitle(`🔗 Related to: "${post.title}"`)
            .setDescription(`Content related to this post:`);

          if (relatedPosts?.posts && relatedPosts.posts.length > 0) {
            relatedPosts.posts.slice(0, 8).forEach((relatedPost, index) => {
              relatedEmbed.addFields({
                name: `${index + 1}. ${relatedPost.title}`,
                value: `📅 ${new Date(relatedPost.published_at).toLocaleDateString()}\n📖 [Read More](${relatedPost.url})`,
                inline: false
              });
            });
          } else {
            relatedEmbed.setDescription('No related content found for this post.');
          }

          await interaction.editReply({ embeds: [relatedEmbed] });
          break;
      }

      // Track analytics
      await analytics.trackCommand('content', interaction.user.id, interaction.guildId, interaction.channelId, Date.now() - interaction.createdTimestamp);
      await analytics.trackContentInteraction(
        'content',
        subcommand,
        `Content ${subcommand}`,
        interaction.user.id,
        interaction.guildId,
        'view'
      );

    } catch (error) {
      console.error('Content command error:', error);
      const errorEmbed = createErrorEmbed('Failed to fetch content. Please try again later.');
      await handleAsyncError(interaction, error, errorEmbed);
    }
  },
};
