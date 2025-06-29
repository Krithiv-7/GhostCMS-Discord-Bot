const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const AnalyticsService = require('../services/analytics');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embedUtils');
const { handleAsyncError, formatBytes } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics')
    .setDescription('View bot usage analytics and insights')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('summary')
        .setDescription('Get comprehensive analytics summary')
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Number of days to analyze (1-90)')
            .setMinValue(1)
            .setMaxValue(90)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('commands')
        .setDescription('View command usage statistics')
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Number of days to analyze (1-90)')
            .setMinValue(1)
            .setMaxValue(90)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('content')
        .setDescription('View popular content statistics')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Content type to analyze')
            .addChoices(
              { name: 'All Content', value: 'all' },
              { name: 'Posts', value: 'post' },
              { name: 'Pages', value: 'page' },
              { name: 'Tags', value: 'tag' },
              { name: 'Authors', value: 'author' }
            )
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Number of days to analyze (1-90)')
            .setMinValue(1)
            .setMaxValue(90)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('searches')
        .setDescription('View search analytics')
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Number of days to analyze (1-90)')
            .setMinValue(1)
            .setMaxValue(90)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('trends')
        .setDescription('View usage trends over time')
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Number of days to analyze (1-30)')
            .setMinValue(1)
            .setMaxValue(30)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cleanup')
        .setDescription('Clean old analytics data')
        .addIntegerOption(option =>
          option
            .setName('keep_days')
            .setDescription('Days of data to keep (30-365)')
            .setMinValue(30)
            .setMaxValue(365)
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    await handleAsyncError(async () => {
      // Check if user has administrator permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const errorEmbed = createErrorEmbed('You need Administrator permissions to use this command.');
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const analytics = new AnalyticsService();
      await analytics.initialize();

      const subcommand = interaction.options.getSubcommand();
      const days = interaction.options.getInteger('days') || 7;

      try {
        switch (subcommand) {
          case 'summary':
            const summary = await analytics.getAnalyticsSummary(days);
            const summaryEmbed = await createSummaryEmbed(summary);
            await interaction.editReply({ embeds: [summaryEmbed] });
            break;

          case 'commands':
            const commandStats = await analytics.getCommandStats(days);
            const commandEmbed = await createCommandStatsEmbed(commandStats, days);
            await interaction.editReply({ embeds: [commandEmbed] });
            break;

          case 'content':
            const contentType = interaction.options.getString('type') || 'all';
            const contentStats = await analytics.getPopularContent(
              contentType === 'all' ? null : contentType, 
              days, 
              15
            );
            const contentEmbed = await createContentStatsEmbed(contentStats, contentType, days);
            await interaction.editReply({ embeds: [contentEmbed] });
            break;

          case 'searches':
            const searchStats = await analytics.getSearchStats(days);
            const searchEmbed = await createSearchStatsEmbed(searchStats, days);
            await interaction.editReply({ embeds: [searchEmbed] });
            break;

          case 'trends':
            const trends = await analytics.getDailyTrends(days);
            const trendsEmbed = await createTrendsEmbed(trends, days);
            await interaction.editReply({ embeds: [trendsEmbed] });
            break;

          case 'cleanup':
            const keepDays = interaction.options.getInteger('keep_days') || 90;
            await analytics.cleanOldData(keepDays);
            
            const cleanupEmbed = createSuccessEmbed(`Analytics data cleanup completed`)
              .setTitle('🧹 Data Cleanup')
              .addFields({
                name: 'Retention Period',
                value: `${keepDays} days`,
                inline: true
              })
              .setFooter({ text: 'Old data has been removed to free up space' });

            await interaction.editReply({ embeds: [cleanupEmbed] });
            break;

          default:
            throw new Error('Unknown subcommand');
        }

      } catch (error) {
        console.error('Error in analytics command:', error);
        const errorEmbed = createErrorEmbed('Failed to generate analytics report. Please try again later.');
        await interaction.editReply({ embeds: [errorEmbed] });
      } finally {
        await analytics.close();
      }
    })(interaction);
  },
};

async function createSummaryEmbed(summary) {
  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('📊 Analytics Summary')
    .setDescription(`Analysis for the past ${summary.period}`)
    .setTimestamp();

  // User stats
  if (summary.users) {
    embed.addFields({
      name: '👥 User Activity',
      value: `**${summary.users.unique_users || 0}** unique users\n**${summary.users.total_commands || 0}** total commands\n**${Math.round(summary.users.avg_commands_per_user || 0)}** avg commands/user`,
      inline: true
    });
  }

  // Top commands
  if (summary.commands && summary.commands.length > 0) {
    const topCommands = summary.commands.slice(0, 5);
    const commandsList = topCommands.map(cmd => 
      `**/${cmd.command_name}**: ${cmd.usage_count} uses`
    ).join('\n');
    
    embed.addFields({
      name: '🔧 Top Commands',
      value: commandsList || 'No data',
      inline: true
    });
  }

  // Popular content
  if (summary.popularContent && summary.popularContent.length > 0) {
    const topContent = summary.popularContent.slice(0, 3);
    const contentList = topContent.map(content => 
      `**${content.content_title}** (${content.content_type}): ${content.interaction_count} views`
    ).join('\n');
    
    embed.addFields({
      name: '🔥 Popular Content',
      value: contentList || 'No data',
      inline: false
    });
  }

  // Top searches
  if (summary.searches && summary.searches.length > 0) {
    const topSearches = summary.searches.slice(0, 3);
    const searchList = topSearches.map(search => 
      `**"${search.query}"**: ${search.search_count} searches`
    ).join('\n');
    
    embed.addFields({
      name: '🔍 Top Searches',
      value: searchList || 'No searches',
      inline: false
    });
  }

  return embed;
}

async function createCommandStatsEmbed(stats, days) {
  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('🔧 Command Usage Statistics')
    .setDescription(`Command usage for the past ${days} day${days !== 1 ? 's' : ''}`)
    .setTimestamp();

  if (!stats || stats.length === 0) {
    embed.addFields({
      name: 'No Data',
      value: 'No command usage data available for this period.',
      inline: false
    });
    return embed;
  }

  // Calculate totals
  const totalCommands = stats.reduce((sum, cmd) => sum + cmd.usage_count, 0);
  const totalSuccessful = stats.reduce((sum, cmd) => sum + cmd.successful_executions, 0);
  const successRate = totalCommands > 0 ? Math.round((totalSuccessful / totalCommands) * 100) : 0;

  embed.addFields({
    name: '📈 Overview',
    value: `**${totalCommands}** total commands\n**${successRate}%** success rate\n**${stats.length}** different commands used`,
    inline: true
  });

  // Top commands
  const topCommands = stats.slice(0, 10);
  const commandsList = topCommands.map((cmd, index) => {
    const avgTime = Math.round(cmd.avg_execution_time || 0);
    const successRate = cmd.usage_count > 0 ? Math.round((cmd.successful_executions / cmd.usage_count) * 100) : 0;
    return `${index + 1}. **/${cmd.command_name}** - ${cmd.usage_count} uses (${avgTime}ms avg, ${successRate}% success)`;
  }).join('\n');

  embed.addFields({
    name: '🏆 Most Used Commands',
    value: commandsList,
    inline: false
  });

  return embed;
}

async function createContentStatsEmbed(stats, contentType, days) {
  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle(`📚 Popular ${contentType === 'all' ? 'Content' : contentType.charAt(0).toUpperCase() + contentType.slice(1)} Statistics`)
    .setDescription(`Content interactions for the past ${days} day${days !== 1 ? 's' : ''}`)
    .setTimestamp();

  if (!stats || stats.length === 0) {
    embed.addFields({
      name: 'No Data',
      value: 'No content interaction data available for this period.',
      inline: false
    });
    return embed;
  }

  // Calculate totals
  const totalInteractions = stats.reduce((sum, content) => sum + content.interaction_count, 0);
  const uniqueUsers = stats.reduce((sum, content) => sum + content.unique_users, 0);

  embed.addFields({
    name: '📊 Overview',
    value: `**${totalInteractions}** total interactions\n**${uniqueUsers}** unique user interactions\n**${stats.length}** different content pieces`,
    inline: true
  });

  // Top content
  const topContent = stats.slice(0, 10);
  const contentList = topContent.map((content, index) => {
    const typeEmoji = getContentTypeEmoji(content.content_type);
    return `${index + 1}. ${typeEmoji} **${content.content_title}**\n   ${content.interaction_count} views • ${content.unique_users} unique users`;
  }).join('\n\n');

  embed.addFields({
    name: '🔥 Most Popular Content',
    value: contentList,
    inline: false
  });

  return embed;
}

async function createSearchStatsEmbed(stats, days) {
  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('🔍 Search Analytics')
    .setDescription(`Search queries for the past ${days} day${days !== 1 ? 's' : ''}`)
    .setTimestamp();

  if (!stats || stats.length === 0) {
    embed.addFields({
      name: 'No Data',
      value: 'No search data available for this period.',
      inline: false
    });
    return embed;
  }

  // Calculate totals
  const totalSearches = stats.reduce((sum, search) => sum + search.search_count, 0);
  const avgResults = stats.reduce((sum, search) => sum + (search.avg_results || 0), 0) / stats.length;

  embed.addFields({
    name: '📈 Overview',
    value: `**${totalSearches}** total searches\n**${Math.round(avgResults)}** avg results per search\n**${stats.length}** unique queries`,
    inline: true
  });

  // Top searches
  const topSearches = stats.slice(0, 15);
  const searchList = topSearches.map((search, index) => {
    return `${index + 1}. **"${search.query}"** - ${search.search_count} searches (${Math.round(search.avg_results || 0)} avg results)`;
  }).join('\n');

  embed.addFields({
    name: '🔥 Most Popular Searches',
    value: searchList,
    inline: false
  });

  return embed;
}

async function createTrendsEmbed(trends, days) {
  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('📈 Usage Trends')
    .setDescription(`Daily usage trends for the past ${days} day${days !== 1 ? 's' : ''}`)
    .setTimestamp();

  if (!trends || trends.length === 0) {
    embed.addFields({
      name: 'No Data',
      value: 'No trend data available for this period.',
      inline: false
    });
    return embed;
  }

  // Calculate trends
  const totalCommands = trends.reduce((sum, day) => sum + day.command_count, 0);
  const avgCommandsPerDay = Math.round(totalCommands / trends.length);
  const peakDay = trends.reduce((max, day) => day.command_count > max.command_count ? day : max);

  embed.addFields({
    name: '📊 Summary',
    value: `**${totalCommands}** total commands\n**${avgCommandsPerDay}** avg commands/day\n**Peak**: ${peakDay.command_count} commands on ${peakDay.date}`,
    inline: true
  });

  // Daily breakdown
  const trendsList = trends.slice(0, 14).map(day => {
    const date = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `**${date}**: ${day.command_count} commands, ${day.unique_users} users`;
  }).join('\n');

  embed.addFields({
    name: '📅 Daily Breakdown',
    value: trendsList,
    inline: false
  });

  return embed;
}

function getContentTypeEmoji(contentType) {
  const emojis = {
    'post': '📰',
    'page': '📄',
    'tag': '🏷️',
    'author': '👤'
  };
  return emojis[contentType] || '📄';
}
