const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const GhostAPIService = require('../services/ghostApi');
const AnalyticsService = require('../services/analytics');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embedUtils');
const { handleAsyncError } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Newsletter subscription and member information')
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get information about newsletters and subscriptions')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('latest')
        .setDescription('Get the latest newsletter content')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('preview')
        .setDescription('Preview subscriber-only content (if available)')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const ghostApi = new GhostAPIService();
    const analytics = new AnalyticsService();
    await analytics.initialize();

    try {
      switch (subcommand) {
        case 'info':
          const settings = await ghostApi.getSettings();
          
          // Create subscription info embed
          const infoEmbed = new EmbedBuilder()
            .setColor(0x7289da)
            .setTitle('📧 Newsletter Subscription')
            .setDescription('Stay updated with our latest content!')
            .addFields(
              {
                name: '✉️ What you\'ll get',
                value: '• Latest blog posts delivered to your inbox\n• Exclusive subscriber-only content\n• Weekly digest of top articles\n• Early access to new features',
                inline: false
              },
              {
                name: '🔄 Frequency',
                value: 'Weekly newsletter + important updates',
                inline: true
              },
              {
                name: '🎁 Benefits',
                value: 'Free access to premium content',
                inline: true
              },
              {
                name: '📱 Easy Management',
                value: 'Unsubscribe anytime with one click',
                inline: true
              }
            )
            .setFooter({ text: 'Visit our website to subscribe!' });

          if (settings.settings?.cover_image) {
            infoEmbed.setThumbnail(settings.settings.cover_image);
          }

          // Create subscribe button
          const subscribeButton = new ButtonBuilder()
            .setLabel('Subscribe on Website')
            .setStyle(ButtonStyle.Link)
            .setURL(settings.settings?.url || 'https://example.com')
            .setEmoji('📧');

          const actionRow = new ActionRowBuilder().addComponents(subscribeButton);

          await interaction.editReply({ 
            embeds: [infoEmbed], 
            components: [actionRow] 
          });
          break;

        case 'latest':
          // Get latest posts that might be newsletter content
          const latestPosts = await ghostApi.getPosts({
            limit: 5,
            include: 'tags,authors',
            filter: 'featured:true'
          });

          if (!latestPosts.posts || latestPosts.posts.length === 0) {
            // Fallback to regular latest posts
            const regularPosts = await ghostApi.getPosts({ limit: 5, include: 'tags,authors' });
            
            const latestEmbed = createSuccessEmbed('Latest Newsletter Content')
              .setTitle('📧 Recent Updates')
              .setDescription('Here are our latest posts:');

            if (regularPosts.posts) {
              regularPosts.posts.forEach((post, index) => {
                latestEmbed.addFields({
                  name: `${index + 1}. ${post.title}`,
                  value: `📅 ${new Date(post.published_at).toLocaleDateString()}\n📖 [Read More](${post.url})`,
                  inline: false
                });
              });
            }

            await interaction.editReply({ embeds: [latestEmbed] });
          } else {
            const newsletterEmbed = createSuccessEmbed('Latest Newsletter Content')
              .setTitle('📧 Featured Newsletter Posts')
              .setDescription('Our latest featured content:');

            latestPosts.posts.forEach((post, index) => {
              const authors = post.authors?.map(author => author.name).join(', ') || 'Unknown';
              newsletterEmbed.addFields({
                name: `${index + 1}. ${post.title}`,
                value: `✍️ By ${authors}\n📅 ${new Date(post.published_at).toLocaleDateString()}\n📖 [Read More](${post.url})`,
                inline: false
              });
            });

            await interaction.editReply({ embeds: [newsletterEmbed] });
          }
          break;

        case 'preview':
          // Get member-only or premium content (if available through Content API)
          const memberPosts = await ghostApi.getPosts({
            limit: 5,
            include: 'tags,authors',
            filter: 'tag:premium+tag:members-only+tag:subscriber-only'
          });

          if (!memberPosts.posts || memberPosts.posts.length === 0) {
            const previewEmbed = createSuccessEmbed('Subscriber Preview')
              .setTitle('🔒 Subscriber-Only Content')
              .setDescription('Subscribe to unlock exclusive content!\n\nOur subscriber-only posts include:')
              .addFields(
                { name: '📝 In-depth Tutorials', value: 'Detailed guides and walkthroughs', inline: true },
                { name: '🎥 Video Content', value: 'Exclusive video tutorials and demos', inline: true },
                { name: '📊 Industry Reports', value: 'Monthly analysis and trends', inline: true },
                { name: '💡 Expert Insights', value: 'Behind-the-scenes content', inline: true },
                { name: '🎁 Bonus Resources', value: 'Templates, checklists, and tools', inline: true },
                { name: '🗣️ Q&A Sessions', value: 'Monthly subscriber-only discussions', inline: true }
              );

            await interaction.editReply({ embeds: [previewEmbed] });
          } else {
            const previewEmbed = createSuccessEmbed('Subscriber Preview')
              .setTitle('🔒 Subscriber-Only Content')
              .setDescription('Here\'s a preview of our exclusive content:');

            memberPosts.posts.forEach((post, index) => {
              const excerpt = post.excerpt ? post.excerpt.substring(0, 100) + '...' : 'Exclusive content for subscribers';
              previewEmbed.addFields({
                name: `${index + 1}. 🔒 ${post.title}`,
                value: `${excerpt}\n📅 ${new Date(post.published_at).toLocaleDateString()}\n*Subscribe to read full article*`,
                inline: false
              });
            });

            // Add subscribe button
            const previewSubscribeButton = new ButtonBuilder()
              .setLabel('Subscribe for Full Access')
              .setStyle(ButtonStyle.Link)
              .setURL(settings?.settings?.url || 'https://example.com')
              .setEmoji('🔓');

            const previewActionRow = new ActionRowBuilder().addComponents(previewSubscribeButton);

            await interaction.editReply({ 
              embeds: [previewEmbed], 
              components: [previewActionRow] 
            });
          }
          break;
      }

      // Track analytics
      await analytics.trackCommand('subscribe', interaction.user.id, interaction.guildId, interaction.channelId, Date.now() - interaction.createdTimestamp);
      await analytics.trackContentInteraction(
        'subscribe',
        subcommand,
        `Subscribe ${subcommand}`,
        interaction.user.id,
        interaction.guildId,
        'view'
      );

    } catch (error) {
      console.error('Subscribe command error:', error);
      const errorEmbed = createErrorEmbed('Failed to fetch subscription information. Please try again later.');
      await handleAsyncError(interaction, error, errorEmbed);
    }
  },
};
