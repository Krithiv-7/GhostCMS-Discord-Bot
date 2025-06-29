const { SlashCommandBuilder } = require('discord.js');
const GhostAPIService = require('../services/ghostApi');
const { createPageEmbed, createErrorEmbed } = require('../utils/embedUtils');
const { handleAsyncError } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('page')
    .setDescription('Get static pages from Ghost CMS')
    .addSubcommand(subcommand =>
      subcommand
        .setName('get')
        .setDescription('Get a specific page by slug')
        .addStringOption(option =>
          option
            .setName('slug')
            .setDescription('Page slug (e.g., "about", "contact")')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all available pages')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of pages to show (1-25)')
            .setMinValue(1)
            .setMaxValue(25)
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    await handleAsyncError(async () => {
      await interaction.deferReply();

      const ghostApi = new GhostAPIService();
      const subcommand = interaction.options.getSubcommand();

      try {
        switch (subcommand) {
          case 'get':
            const slug = interaction.options.getString('slug');
            const pageData = await ghostApi.getPageBySlug(slug);
            
            if (!pageData.pages || pageData.pages.length === 0) {
              const notFoundEmbed = createErrorEmbed(`Page "${slug}" not found.`);
              await interaction.editReply({ embeds: [notFoundEmbed] });
              return;
            }

            const page = pageData.pages[0];
            const pageEmbed = createPageEmbed(page);
            await interaction.editReply({ embeds: [pageEmbed] });
            break;

          case 'list':
            const count = interaction.options.getInteger('count') || 10;
            const pagesData = await ghostApi.getPages({ limit: count });
            
            if (!pagesData.pages || pagesData.pages.length === 0) {
              const noResultsEmbed = createErrorEmbed('No pages found.');
              await interaction.editReply({ embeds: [noResultsEmbed] });
              return;
            }

            // Create a summary embed
            const summaryEmbed = createPageEmbed({
              title: `📄 Available Pages (${pagesData.pages.length})`,
              excerpt: 'Here are the available static pages:',
              url: pagesData.pages[0].url.split('/').slice(0, 3).join('/'),
              updated_at: new Date().toISOString(),
            });

            // Create field list of pages
            const pagesList = pagesData.pages.map(page => 
              `**[${page.title}](${page.url})**\n${page.excerpt || 'No description available'}`
            ).join('\n\n');

            summaryEmbed.setDescription(pagesList);

            await interaction.editReply({ embeds: [summaryEmbed] });
            break;

          default:
            throw new Error('Unknown subcommand');
        }

      } catch (error) {
        console.error('Error in page command:', error);
        const errorEmbed = createErrorEmbed('Failed to fetch pages. Please check the Ghost CMS configuration.');
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    })(interaction);
  },
};
