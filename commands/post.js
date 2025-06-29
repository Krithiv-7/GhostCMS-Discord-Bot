const { SlashCommandBuilder } = require('discord.js');
const GhostAPIService = require('../services/ghostApi');
const { createPostEmbed, createErrorEmbed } = require('../utils/embedUtils');
const { handleAsyncError } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('post')
    .setDescription('Get blog posts from Ghost CMS')
    .addSubcommand(subcommand =>
      subcommand
        .setName('latest')
        .setDescription('Get the latest blog posts')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of posts to show (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('by-tag')
        .setDescription('Get posts filtered by tag')
        .addStringOption(option =>
          option
            .setName('tag')
            .setDescription('Tag slug to filter by')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of posts to show (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('search')
        .setDescription('Search for posts by title')
        .addStringOption(option =>
          option
            .setName('query')
            .setDescription('Search query')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of posts to show (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    await handleAsyncError(async () => {
      await interaction.deferReply();

      const ghostApi = new GhostAPIService();
      const subcommand = interaction.options.getSubcommand();
      const count = interaction.options.getInteger('count') || 5;

      try {
        let posts;
        let title;

        switch (subcommand) {
          case 'latest':
            posts = await ghostApi.getLatestPosts(count);
            title = `📰 Latest Blog Posts (${posts.posts.length})`;
            break;

          case 'by-tag':
            const tag = interaction.options.getString('tag');
            posts = await ghostApi.getPostsByTag(tag, count);
            title = `🏷️ Posts tagged with "${tag}" (${posts.posts.length})`;
            break;

          case 'search':
            const query = interaction.options.getString('query');
            posts = await ghostApi.getPosts({
              filter: `title:~'${query}'`,
              limit: count,
              order: 'published_at DESC',
            });
            title = `🔍 Search results for "${query}" (${posts.posts.length})`;
            break;

          default:
            throw new Error('Unknown subcommand');
        }

        if (!posts.posts || posts.posts.length === 0) {
          const noResultsEmbed = createErrorEmbed('No posts found matching your criteria.');
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
        console.error('Error in post command:', error);
        const errorEmbed = createErrorEmbed('Failed to fetch posts. Please check the Ghost CMS configuration.');
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    })(interaction);
  },
};
