const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const SearchService = require('../services/search');
const AnalyticsService = require('../services/analytics');
const { createPostEmbed, createPageEmbed, createErrorEmbed, createSuccessEmbed } = require('../utils/embedUtils');
const { handleAsyncError } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Advanced search across all Ghost CMS content')
    .addSubcommand(subcommand =>
      subcommand
        .setName('all')
        .setDescription('Search across all content types')
        .addStringOption(option =>
          option
            .setName('query')
            .setDescription('Search query')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of results to show (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('posts')
        .setDescription('Search only in blog posts')
        .addStringOption(option =>
          option
            .setName('query')
            .setDescription('Search query')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of results to show (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('pages')
        .setDescription('Search only in static pages')
        .addStringOption(option =>
          option
            .setName('query')
            .setDescription('Search query')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of results to show (1-10)')
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('suggestions')
        .setDescription('Get search suggestions')
        .addStringOption(option =>
          option
            .setName('partial')
            .setDescription('Partial search term')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('popular')
        .setDescription('Show popular search terms')
    ),

  async execute(interaction) {
    await handleAsyncError(async () => {
      const startTime = Date.now();
      await interaction.deferReply();

      const searchService = new SearchService();
      const analytics = new AnalyticsService();
      await analytics.initialize();

      const subcommand = interaction.options.getSubcommand();
      const query = interaction.options.getString('query');
      const limit = interaction.options.getInteger('limit') || 5;

      try {
        let results;
        let embedTitle;
        let searchType = 'all';

        switch (subcommand) {
          case 'all':
            results = await searchService.search(query, { limit });
            embedTitle = `🔍 Search Results for "${query}"`;
            searchType = 'all';
            break;

          case 'posts':
            results = await searchService.searchPosts(query, limit);
            embedTitle = `📰 Post Search Results for "${query}"`;
            searchType = 'posts';
            break;

          case 'pages':
            results = await searchService.searchPages(query, limit);
            embedTitle = `📄 Page Search Results for "${query}"`;
            searchType = 'pages';
            break;

          case 'suggestions':
            const partialQuery = interaction.options.getString('partial');
            const suggestions = await searchService.getSuggestions(partialQuery);
            
            const suggestionsEmbed = createSuccessEmbed('Search Suggestions')
              .setTitle(`💡 Suggestions for "${partialQuery}"`)
              .setDescription(
                suggestions.length > 0 
                  ? suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')
                  : 'No suggestions found. Try a different search term.'
              );

            await interaction.editReply({ embeds: [suggestionsEmbed] });
            
            // Track analytics
            const executionTime = Date.now() - startTime;
            await analytics.trackCommand('search', interaction.user.id, interaction.guildId, interaction.channelId, executionTime);
            
            return;

          case 'popular':
            const popularSearches = await searchService.getPopularSearches();
            
            const popularEmbed = createSuccessEmbed('Popular Search Terms')
              .setTitle('🔥 Popular Searches')
              .setDescription(
                popularSearches.length > 0
                  ? popularSearches.map((term, i) => `${i + 1}. **${term}**`).join('\n')
                  : 'No popular searches available yet.'
              );

            await interaction.editReply({ embeds: [popularEmbed] });
            
            // Track analytics
            const popularExecutionTime = Date.now() - startTime;
            await analytics.trackCommand('search', interaction.user.id, interaction.guildId, interaction.channelId, popularExecutionTime);
            
            return;

          default:
            throw new Error('Unknown subcommand');
        }

        // Track search analytics
        await analytics.trackSearch(query, interaction.user.id, interaction.guildId, results.total);

        if (!results.results || results.results.length === 0) {
          const noResultsEmbed = createErrorEmbed(`No results found for "${query}".`)
            .addFields({
              name: '💡 Search Tips',
              value: '• Try different keywords\n• Use shorter, simpler terms\n• Check spelling\n• Use `/search suggestions` for help',
              inline: false
            });

          await interaction.editReply({ embeds: [noResultsEmbed] });
          return;
        }

        // Create embeds for results
        const embeds = [];
        
        // Summary embed
        const summaryEmbed = new EmbedBuilder()
          .setColor(0x7289da)
          .setTitle(embedTitle)
          .setDescription(`Found ${results.total} result${results.total !== 1 ? 's' : ''} • Showing top ${results.results.length}`)
          .addFields({
            name: '📊 Search Info',
            value: `Query: \`${query}\`\nType: \`${searchType}\`\nResults: \`${results.results.length}/${results.total}\``,
            inline: true
          })
          .setTimestamp();

        embeds.push(summaryEmbed);

        // Create embeds for each result
        for (const result of results.results.slice(0, 8)) { // Discord limit consideration
          let embed;
          
          switch (result.type) {
            case 'post':
              embed = createPostEmbed({
                id: result.id,
                title: result.title,
                excerpt: result.excerpt,
                url: result.url,
                published_at: result.published_at,
                feature_image: result.feature_image,
                slug: result.slug,
                tags: [], // We'll add this if needed
                authors: [] // We'll add this if needed
              });
              break;

            case 'page':
              embed = createPageEmbed({
                id: result.id,
                title: result.title,
                excerpt: result.excerpt,
                url: result.url,
                updated_at: result.updated_at,
                feature_image: result.feature_image,
                slug: result.slug,
                authors: []
              });
              break;

            case 'tag':
              embed = new EmbedBuilder()
                .setColor(0x7289da)
                .setTitle(`🏷️ ${result.title}`)
                .setDescription(result.content || 'No description available')
                .addFields({
                  name: 'Posts',
                  value: result.count?.toString() || '0',
                  inline: true
                })
                .setFooter({ text: `Tag • Slug: ${result.slug}` });
              break;

            case 'author':
              embed = new EmbedBuilder()
                .setColor(0x7289da)
                .setTitle(`👤 ${result.title}`)
                .setDescription(result.content || 'No bio available')
                .setURL(result.url)
                .addFields({
                  name: 'Posts',
                  value: result.count?.toString() || '0',
                  inline: true
                })
                .setFooter({ text: `Author • Slug: ${result.slug}` });
              break;

            default:
              continue;
          }

          // Add search score if available
          if (result.score !== undefined) {
            embed.addFields({
              name: '🎯 Relevance',
              value: `${Math.round((1 - result.score) * 100)}%`,
              inline: true
            });
          }

          embeds.push(embed);

          // Track content interaction
          await analytics.trackContentInteraction(
            result.type,
            result.id,
            result.title,
            interaction.user.id,
            interaction.guildId,
            'view'
          );
        }

        // Create action row for additional options
        const actionRow = new ActionRowBuilder()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('search_filter')
              .setPlaceholder('Filter results by type...')
              .addOptions([
                {
                  label: 'All Results',
                  description: 'Show all content types',
                  value: 'all',
                  emoji: '🔍'
                },
                {
                  label: 'Posts Only',
                  description: 'Show only blog posts',
                  value: 'posts',
                  emoji: '📰'
                },
                {
                  label: 'Pages Only',
                  description: 'Show only static pages',
                  value: 'pages',
                  emoji: '📄'
                },
                {
                  label: 'Tags Only',
                  description: 'Show only tags',
                  value: 'tags',
                  emoji: '🏷️'
                },
                {
                  label: 'Authors Only',
                  description: 'Show only authors',
                  value: 'authors',
                  emoji: '👤'
                }
              ])
          );

        // Send results with interactive components
        await interaction.editReply({ 
          embeds: embeds.slice(0, 10), // Discord embed limit
          components: results.total > 5 ? [actionRow] : []
        });

        // Track analytics
        const executionTime = Date.now() - startTime;
        await analytics.trackCommand('search', interaction.user.id, interaction.guildId, interaction.channelId, executionTime);

      } catch (error) {
        console.error('Error in search command:', error);
        const errorEmbed = createErrorEmbed('Search operation failed. Please try again later.');
        await interaction.editReply({ embeds: [errorEmbed] });

        // Track failed command
        const executionTime = Date.now() - startTime;
        await analytics.trackCommand('search', interaction.user.id, interaction.guildId, interaction.channelId, executionTime, false, error.message);
      }
    })(interaction);
  },
};
