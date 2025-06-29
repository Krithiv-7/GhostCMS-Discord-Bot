const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const GhostAPIService = require('../services/ghostApi');
const AnalyticsService = require('../services/analytics');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embedUtils');
const { handleAsyncError } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Site statistics and content metrics')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('overview')
        .setDescription('Get overall site statistics')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('authors')
        .setDescription('Get author statistics and rankings')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('tags')
        .setDescription('Get tag usage statistics')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('content')
        .setDescription('Get content type breakdown')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('activity')
        .setDescription('Get recent activity summary')
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Number of days to analyze (1-90)')
            .setMinValue(1)
            .setMaxValue(90)
            .setRequired(false)
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
        case 'overview':
          // Get all content counts
          const [posts, pages, tags, authors, settings] = await Promise.all([
            ghostApi.getPosts({ limit: 1 }),
            ghostApi.getPages({ limit: 1 }),
            ghostApi.getTags(),
            ghostApi.getAuthors(),
            ghostApi.getSettings()
          ]);

          const overviewEmbed = new EmbedBuilder()
            .setColor(0x7289da)
            .setTitle('📊 Site Statistics Overview')
            .setDescription(`Statistics for ${settings.settings?.title || 'Ghost Site'}`)
            .addFields(
              { name: '📰 Total Posts', value: posts.meta?.pagination?.total?.toString() || '0', inline: true },
              { name: '📄 Total Pages', value: pages.meta?.pagination?.total?.toString() || '0', inline: true },
              { name: '🏷️ Total Tags', value: tags.tags?.length?.toString() || '0', inline: true },
              { name: '👥 Total Authors', value: authors.authors?.length?.toString() || '0', inline: true },
              { name: '🌐 Site URL', value: settings.settings?.url || 'N/A', inline: true },
              { name: '📅 Site Created', value: settings.settings?.created_at ? new Date(settings.settings.created_at).toLocaleDateString() : 'N/A', inline: true }
            );

          if (settings.settings?.cover_image) {
            overviewEmbed.setThumbnail(settings.settings.cover_image);
          }

          await interaction.editReply({ embeds: [overviewEmbed] });
          break;

        case 'authors':
          const authorsData = await ghostApi.getAuthors({ include: 'count.posts', limit: 15 });
          
          const authorsEmbed = createSuccessEmbed('Author Statistics')
            .setTitle('👥 Author Rankings')
            .setDescription('Authors ranked by post count:');

          if (authorsData.authors && authorsData.authors.length > 0) {
            authorsData.authors
              .sort((a, b) => (b.count?.posts || 0) - (a.count?.posts || 0))
              .slice(0, 15)
              .forEach((author, index) => {
                const postCount = author.count?.posts || 0;
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
                authorsEmbed.addFields({
                  name: `${medal} ${author.name}`,
                  value: `📰 ${postCount} post${postCount !== 1 ? 's' : ''}\n🔗 [Profile](${author.url || '#'})`,
                  inline: true
                });
              });
          } else {
            authorsEmbed.setDescription('No author data available.');
          }

          await interaction.editReply({ embeds: [authorsEmbed] });
          break;

        case 'tags':
          const tagsData = await ghostApi.getTags({ include: 'count.posts', limit: 20 });
          
          const tagsEmbed = createSuccessEmbed('Tag Statistics')
            .setTitle('🏷️ Tag Usage')
            .setDescription('Most used tags:');

          if (tagsData.tags && tagsData.tags.length > 0) {
            tagsData.tags
              .filter(tag => tag.visibility === 'public')
              .sort((a, b) => (b.count?.posts || 0) - (a.count?.posts || 0))
              .slice(0, 20)
              .forEach((tag, index) => {
                const postCount = tag.count?.posts || 0;
                tagsEmbed.addFields({
                  name: `${index + 1}. ${tag.name}`,
                  value: `📰 ${postCount} post${postCount !== 1 ? 's' : ''}${tag.description ? `\n💬 ${tag.description.substring(0, 50)}...` : ''}`,
                  inline: true
                });
              });
          } else {
            tagsEmbed.setDescription('No tag data available.');
          }

          await interaction.editReply({ embeds: [tagsEmbed] });
          break;

        case 'content':
          // Get content type breakdown
          const allPosts = await ghostApi.getPosts({ limit: 1 });
          const allPages = await ghostApi.getPages({ limit: 1 });
          
          // Get recent posts to analyze content patterns
          const recentPosts = await ghostApi.getPosts({ 
            limit: 50, 
            include: 'tags,authors' 
          });

          // Analyze content patterns
          let featuredCount = 0;
          let taggedCount = 0;
          let multiAuthorCount = 0;

          if (recentPosts.posts) {
            recentPosts.posts.forEach(post => {
              if (post.featured) featuredCount++;
              if (post.tags && post.tags.length > 0) taggedCount++;
              if (post.authors && post.authors.length > 1) multiAuthorCount++;
            });
          }

          const contentEmbed = createSuccessEmbed('Content Analysis')
            .setTitle('📈 Content Breakdown')
            .setDescription('Analysis of your content:')
            .addFields(
              { name: '📊 Content Types', value: `📰 Posts: ${allPosts.meta?.pagination?.total || 0}\n📄 Pages: ${allPages.meta?.pagination?.total || 0}`, inline: true },
              { name: '⭐ Featured Content', value: `${featuredCount} of ${recentPosts.posts?.length || 0} recent posts`, inline: true },
              { name: '🏷️ Tagged Content', value: `${taggedCount} of ${recentPosts.posts?.length || 0} recent posts`, inline: true },
              { name: '👥 Multi-Author Posts', value: `${multiAuthorCount} collaborative posts`, inline: true },
              { name: '📝 Avg Posts per Author', value: `${Math.round((allPosts.meta?.pagination?.total || 0) / (authorsData?.authors?.length || 1))}`, inline: true },
              { name: '🎯 Content Health', value: taggedCount > (recentPosts.posts?.length || 0) * 0.7 ? '✅ Good' : '⚠️ Needs Tags', inline: true }
            );

          await interaction.editReply({ embeds: [contentEmbed] });
          break;

        case 'activity':
          const days = interaction.options.getInteger('days') || 30;
          
          // Get recent posts to analyze activity
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          
          const recentActivity = await ghostApi.getPosts({
            filter: `published_at:>${cutoffDate.toISOString()}`,
            limit: 50,
            include: 'tags,authors'
          });

          // Analyze activity patterns
          const activityStats = {
            totalPosts: recentActivity.posts?.length || 0,
            uniqueAuthors: new Set(),
            uniqueTags: new Set(),
            avgPerDay: 0
          };

          if (recentActivity.posts) {
            recentActivity.posts.forEach(post => {
              post.authors?.forEach(author => activityStats.uniqueAuthors.add(author.id));
              post.tags?.forEach(tag => activityStats.uniqueTags.add(tag.id));
            });
            activityStats.avgPerDay = Math.round((activityStats.totalPosts / days) * 10) / 10;
          }

          const activityEmbed = createSuccessEmbed('Activity Summary')
            .setTitle('🔄 Recent Activity')
            .setDescription(`Activity summary for the last ${days} days:`)
            .addFields(
              { name: '📰 New Posts', value: activityStats.totalPosts.toString(), inline: true },
              { name: '👥 Active Authors', value: activityStats.uniqueAuthors.size.toString(), inline: true },
              { name: '🏷️ Tags Used', value: activityStats.uniqueTags.size.toString(), inline: true },
              { name: '📊 Posts per Day', value: activityStats.avgPerDay.toString(), inline: true },
              { name: '🎯 Activity Level', value: activityStats.avgPerDay > 1 ? '🔥 High' : activityStats.avgPerDay > 0.5 ? '📈 Moderate' : '📉 Low', inline: true },
              { name: '📅 Period', value: `${cutoffDate.toLocaleDateString()} - ${new Date().toLocaleDateString()}`, inline: true }
            );

          await interaction.editReply({ embeds: [activityEmbed] });
          break;
      }

      // Track analytics
      await analytics.trackCommand('stats', interaction.user.id, interaction.guildId, interaction.channelId, Date.now() - interaction.createdTimestamp);
      await analytics.trackContentInteraction(
        'stats',
        subcommand,
        `Stats ${subcommand}`,
        interaction.user.id,
        interaction.guildId,
        'view'
      );

    } catch (error) {
      console.error('Stats command error:', error);
      const errorEmbed = createErrorEmbed('Failed to fetch statistics. Please try again later.');
      await handleAsyncError(interaction, error, errorEmbed);
    }
  },
};
