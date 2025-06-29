const { SlashCommandBuilder } = require('discord.js');
const GhostAPIService = require('../services/ghostApi');
const { createTagsEmbed, createErrorEmbed } = require('../utils/embedUtils');
const { handleAsyncError } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tags')
    .setDescription('Get information about blog tags')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all available tags with post counts')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('popular')
        .setDescription('Get the most popular tags')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of tags to show (1-25)')
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
        const tagsData = await ghostApi.getTags();
        
        if (!tagsData.tags || tagsData.tags.length === 0) {
          const noResultsEmbed = createErrorEmbed('No tags found.');
          await interaction.editReply({ embeds: [noResultsEmbed] });
          return;
        }

        // Filter out internal tags (those starting with #)
        const publicTags = tagsData.tags.filter(tag => 
          tag.visibility === 'public' && !tag.name.startsWith('#')
        );

        switch (subcommand) {
          case 'list':
            const tagsEmbed = createTagsEmbed(publicTags);
            await interaction.editReply({ embeds: [tagsEmbed] });
            break;

          case 'popular':
            const count = interaction.options.getInteger('count') || 10;
            
            // Sort by post count (descending)
            const popularTags = publicTags
              .sort((a, b) => (b.count?.posts || 0) - (a.count?.posts || 0))
              .slice(0, count);

            const popularEmbed = createTagsEmbed(popularTags);
            popularEmbed.setTitle('🔥 Most Popular Tags');
            popularEmbed.setDescription(`Top ${popularTags.length} tags by post count:`);

            // Override the fields to show in order
            popularEmbed.data.fields = [];
            
            const tagsList = popularTags.map((tag, index) => 
              `${index + 1}. **${tag.name}** - ${tag.count?.posts || 0} posts`
            ).join('\n');

            popularEmbed.addFields({
              name: 'Popular Tags',
              value: tagsList || 'No tags available',
              inline: false,
            });

            await interaction.editReply({ embeds: [popularEmbed] });
            break;

          default:
            throw new Error('Unknown subcommand');
        }

      } catch (error) {
        console.error('Error in tags command:', error);
        const errorEmbed = createErrorEmbed('Failed to fetch tags. Please check the Ghost CMS configuration.');
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    })(interaction);
  },
};
