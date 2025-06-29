const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const GhostAPIService = require('../services/ghostApi');
const AnalyticsService = require('../services/analytics');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embedUtils');
const { handleAsyncError } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('newsletter')
    .setDescription('Newsletter and membership content')
    .addSubcommand(subcommand =>
      subcommand
        .setName('latest')
        .setDescription('Get latest newsletter posts')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of newsletter posts to show (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('tiers')
        .setDescription('Show membership tiers and benefits')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('featured')
        .setDescription('Get featured/premium content')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of featured posts to show (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
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
        case 'latest':
          const count = interaction.options.getInteger('count') || 5;
          
          // Get newsletter posts (posts with email tags or newsletter tags)
          const newsletterPosts = await ghostApi.getPosts({
            limit: count * 2, // Get more to filter
            filter: 'tag:newsletter+tag:email-only+tag:members-only', // Common newsletter tags
            include: 'tags,authors'
          });

          if (!newsletterPosts.posts || newsletterPosts.posts.length === 0) {
            // Fallback to recent posts if no newsletter-specific content
            const recentPosts = await ghostApi.getPosts({ limit: count });
            
            const embed = createSuccessEmbed('Latest Newsletter Content')
              .setTitle('📧 Recent Blog Posts')
              .setDescription('No specific newsletter posts found. Here are the latest blog posts:');

            recentPosts.posts.slice(0, count).forEach((post, index) => {
              embed.addFields({
                name: `${index + 1}. ${post.title}`,
                value: `📅 ${new Date(post.published_at).toLocaleDateString()}\n📖 [Read More](${post.url})`,
                inline: false
              });
            });

            await interaction.editReply({ embeds: [embed] });
          } else {
            const embed = createSuccessEmbed('Latest Newsletter Content')
              .setTitle('📧 Newsletter Posts')
              .setDescription(`Here are the latest ${Math.min(count, newsletterPosts.posts.length)} newsletter posts:`);

            newsletterPosts.posts.slice(0, count).forEach((post, index) => {
              const tags = post.tags?.map(tag => `\`${tag.name}\``).join(' ') || '';
              embed.addFields({
                name: `${index + 1}. ${post.title}`,
                value: `📅 ${new Date(post.published_at).toLocaleDateString()}\n🏷️ ${tags}\n📖 [Read More](${post.url})`,
                inline: false
              });
            });

            await interaction.editReply({ embeds: [embed] });
          }

          // Track analytics
          await analytics.trackCommand('newsletter', interaction.user.id, interaction.guildId, interaction.channelId, Date.now() - interaction.createdTimestamp);
          break;

        case 'tiers':
          // Get site settings to show membership info
          const settings = await ghostApi.getSettings();
          
          const tiersEmbed = new EmbedBuilder()
            .setColor(0x7289da)
            .setTitle('💎 Membership Tiers')
            .setDescription('Information about our membership and newsletter tiers')
            .addFields(
              {
                name: '🆓 Free Tier',
                value: '• Access to public blog posts\n• Weekly newsletter digest\n• Community access',
                inline: true
              },
              {
                name: '💰 Premium Members',
                value: '• Exclusive premium content\n• Early access to posts\n• Member-only newsletters\n• Priority support',
                inline: true
              },
              {
                name: '🌟 VIP Members',
                value: '• All premium benefits\n• Monthly live Q&A sessions\n• Direct author access\n• Custom content requests',
                inline: true
              }
            )
            .setFooter({ text: `Site: ${settings.settings?.title || 'Ghost Site'}` });

          if (settings.settings?.cover_image) {
            tiersEmbed.setThumbnail(settings.settings.cover_image);
          }

          await interaction.editReply({ embeds: [tiersEmbed] });
          break;

        case 'featured':
          const featuredCount = interaction.options.getInteger('count') || 5;
          
          // Get featured posts
          const featuredPosts = await ghostApi.getPosts({
            limit: featuredCount,
            filter: 'featured:true',
            include: 'tags,authors'
          });

          if (!featuredPosts.posts || featuredPosts.posts.length === 0) {
            const embed = createErrorEmbed('No featured content found');
            await interaction.editReply({ embeds: [embed] });
            return;
          }

          const featuredEmbed = createSuccessEmbed('Featured Content')
            .setTitle('🌟 Featured Posts')
            .setDescription(`Here are the top ${featuredPosts.posts.length} featured posts:`);

          featuredPosts.posts.forEach((post, index) => {
            const authors = post.authors?.map(author => author.name).join(', ') || 'Unknown';
            featuredEmbed.addFields({
              name: `${index + 1}. ${post.title}`,
              value: `✍️ By ${authors}\n📅 ${new Date(post.published_at).toLocaleDateString()}\n📖 [Read More](${post.url})`,
              inline: false
            });
          });

          await interaction.editReply({ embeds: [featuredEmbed] });
          break;
      }

      // Track content interaction
      await analytics.trackContentInteraction(
        'newsletter',
        subcommand,
        `Newsletter ${subcommand}`,
        interaction.user.id,
        interaction.guildId,
        'view'
      );

    } catch (error) {
      console.error('Newsletter command error:', error);
      const errorEmbed = createErrorEmbed('Failed to fetch newsletter content. Please try again later.');
      await handleAsyncError(interaction, error, errorEmbed);
    }
  },
};
