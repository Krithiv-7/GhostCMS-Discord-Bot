const { SlashCommandBuilder } = require('discord.js');
const GhostAPIService = require('../services/ghostApi');
const { createPostEmbed, createErrorEmbed } = require('../utils/embedUtils');
const { handleAsyncError } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('latestposts')
    .setDescription('Get the latest blog posts (alias for /post latest)')
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('Number of posts to show (1-10)')
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)
    ),

  async execute(interaction) {
    await handleAsyncError(async () => {
      await interaction.deferReply();

      const ghostApi = new GhostAPIService();
      const count = interaction.options.getInteger('count') || 5;

      try {
        const posts = await ghostApi.getLatestPosts(count);
        const title = `📰 Latest Blog Posts (${posts.posts.length})`;

        if (!posts.posts || posts.posts.length === 0) {
          const noResultsEmbed = createErrorEmbed('No posts found.');
          await interaction.editReply({ embeds: [noResultsEmbed] });
          return;
        }

        // Create embeds for each post
        const embeds = posts.posts.slice(0, count).map(post => createPostEmbed(post));

        // Add a summary embed at the beginning
        const summaryEmbed = createPostEmbed({
          title: title,
          excerpt: `Found ${posts.posts.length} post${posts.posts.length !== 1 ? 's' : ''}`,
          url: posts.posts[0].url.split('/').slice(0, 3).join('/'), // Base URL
          published_at: new Date().toISOString(),
        });

        // Discord has a limit of 10 embeds per message
        const maxEmbeds = Math.min(embeds.length + 1, 10);
        const finalEmbeds = [summaryEmbed, ...embeds.slice(0, maxEmbeds - 1)];

        await interaction.editReply({ embeds: finalEmbeds });

      } catch (error) {
        console.error('Error in latestposts command:', error);
        const errorEmbed = createErrorEmbed('Failed to fetch posts. Please check the Ghost CMS configuration.');
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    })(interaction);
  },
};
