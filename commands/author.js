const { SlashCommandBuilder } = require('discord.js');
const GhostAPIService = require('../services/ghostApi');
const { createAuthorEmbed, createPostEmbed, createErrorEmbed } = require('../utils/embedUtils');
const { handleAsyncError } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('author')
    .setDescription('Get information about blog authors')
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get author information and bio')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Author slug or name')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('posts')
        .setDescription('Get recent posts by an author')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Author slug or name')
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
        .setName('list')
        .setDescription('List all authors')
    ),

  async execute(interaction) {
    await handleAsyncError(async () => {
      await interaction.deferReply();

      const ghostApi = new GhostAPIService();
      const subcommand = interaction.options.getSubcommand();

      try {
        switch (subcommand) {
          case 'info':
            const authorSlug = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '-');
            
            try {
              const authorData = await ghostApi.getAuthorBySlug(authorSlug);
              
              if (!authorData.authors || authorData.authors.length === 0) {
                const notFoundEmbed = createErrorEmbed(`Author "${authorSlug}" not found.`);
                await interaction.editReply({ embeds: [notFoundEmbed] });
                return;
              }

              const author = authorData.authors[0];
              const authorEmbed = createAuthorEmbed(author);
              await interaction.editReply({ embeds: [authorEmbed] });
              
            } catch (error) {
              // Try searching by name in all authors if slug lookup fails
              const allAuthorsData = await ghostApi.getAuthors();
              const foundAuthor = allAuthorsData.authors?.find(author => 
                author.name.toLowerCase().includes(authorSlug.toLowerCase()) ||
                author.slug.toLowerCase() === authorSlug.toLowerCase()
              );
              
              if (foundAuthor) {
                const authorEmbed = createAuthorEmbed(foundAuthor);
                await interaction.editReply({ embeds: [authorEmbed] });
              } else {
                const notFoundEmbed = createErrorEmbed(`Author "${authorSlug}" not found.`);
                await interaction.editReply({ embeds: [notFoundEmbed] });
              }
            }
            break;

          case 'posts':
            const authorName = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '-');
            const count = interaction.options.getInteger('count') || 5;
            
            // Get posts by author
            const postsData = await ghostApi.getPosts({
              filter: `author:${authorName}`,
              limit: count,
              order: 'published_at DESC',
            });
            
            if (!postsData.posts || postsData.posts.length === 0) {
              const noResultsEmbed = createErrorEmbed(`No posts found for author "${authorName}".`);
              await interaction.editReply({ embeds: [noResultsEmbed] });
              return;
            }

            // Create embeds for each post
            const embeds = postsData.posts.map(post => createPostEmbed(post));
            
            // Add summary embed
            const author = postsData.posts[0].authors?.[0];
            const summaryEmbed = createPostEmbed({
              title: `📝 Posts by ${author?.name || authorName} (${postsData.posts.length})`,
              excerpt: `Recent posts by ${author?.name || authorName}`,
              url: author?.url || postsData.posts[0].url.split('/').slice(0, 3).join('/'),
              published_at: new Date().toISOString(),
            });

            const finalEmbeds = [summaryEmbed, ...embeds.slice(0, 9)]; // Discord limit
            await interaction.editReply({ embeds: finalEmbeds });
            break;

          case 'list':
            const authorsData = await ghostApi.getAuthors();
            
            if (!authorsData.authors || authorsData.authors.length === 0) {
              const noResultsEmbed = createErrorEmbed('No authors found.');
              await interaction.editReply({ embeds: [noResultsEmbed] });
              return;
            }

            const authorsList = authorsData.authors
              .slice(0, 25) // Discord field limit
              .map(author => 
                `**${author.name}** (@${author.slug})\n${author.count?.posts || 0} posts`
              ).join('\n\n');

            const listEmbed = createAuthorEmbed({
              name: `👥 All Authors (${authorsData.authors.length})`,
              bio: authorsList,
              count: { posts: authorsData.authors.reduce((sum, author) => sum + (author.count?.posts || 0), 0) },
              url: authorsData.authors[0]?.url?.split('/').slice(0, 3).join('/') || '#',
            });

            listEmbed.setTitle('👥 All Authors');
            listEmbed.setDescription('Here are all the blog authors:');
            listEmbed.data.fields = [{
              name: 'Authors',
              value: authorsList,
              inline: false,
            }];

            await interaction.editReply({ embeds: [listEmbed] });
            break;

          default:
            throw new Error('Unknown subcommand');
        }

      } catch (error) {
        console.error('Error in author command:', error);
        const errorEmbed = createErrorEmbed('Failed to fetch author information. Please check the Ghost CMS configuration.');
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    })(interaction);
  },
};
