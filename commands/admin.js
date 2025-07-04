const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embedUtils');
const { handleAsyncError, getMemoryUsage } = require('../utils/helpers');
const config = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Bot administration commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Get bot status and health information')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('Show current bot configuration (without sensitive data)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('test-ghost')
        .setDescription('Test connection to Ghost CMS')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle-autopost')
        .setDescription('Toggle automatic posting on/off')
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

      const subcommand = interaction.options.getSubcommand();

      try {
        switch (subcommand) {
          case 'status':
            const uptime = process.uptime();
            const uptimeFormatted = formatUptime(uptime);
            const memoryUsage = getMemoryUsage();
            const botUser = interaction.client.user;

            const statusEmbed = createSuccessEmbed('Bot Status Information')
              .setTitle('🤖 Bot Status')
              .addFields(
                { name: '⏱️ Uptime', value: uptimeFormatted, inline: true },
                { name: '🔢 Servers', value: interaction.client.guilds.cache.size.toString(), inline: true },
                { name: '👥 Users', value: interaction.client.users.cache.size.toString(), inline: true },
                { name: '💾 Memory (RSS)', value: memoryUsage.rss, inline: true },
                { name: '💾 Memory (Heap)', value: memoryUsage.heapUsed, inline: true },
                { name: '🏓 Ping', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
                { name: '🔄 Auto-posting', value: config.autoPost.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: '⚡ Node.js', value: process.version, inline: true },
                { name: '📦 Discord.js', value: require('discord.js').version, inline: true }
              )
              .setThumbnail(botUser.displayAvatarURL())
              .setFooter({ text: `Bot ID: ${botUser.id}` });

            await interaction.editReply({ embeds: [statusEmbed] });
            break;

          case 'config':
            const configEmbed = createSuccessEmbed('Bot Configuration')
              .setTitle('⚙️ Current Configuration')
              .addFields(
                { name: '🔗 Ghost API URL', value: config.ghost.apiUrl || 'Not configured', inline: false },
                { name: '🔑 Ghost API Key', value: config.ghost.contentApiKey ? '✅ Configured' : '❌ Not configured', inline: true },
                { name: '📢 Auto-post Channel', value: config.autoPost.channelId ? `<#${config.autoPost.channelId}>` : 'Not configured', inline: true },
                { name: '⏰ Check Interval', value: `${config.autoPost.checkIntervalMinutes} minutes`, inline: true },
                { name: '🎨 Embed Color', value: `#${config.bot.embedColor.toString(16).padStart(6, '0')}`, inline: true },
                { name: '📄 Max Posts Per Page', value: config.bot.maxPostsPerPage.toString(), inline: true },
                { name: '✂️ Preview Length', value: `${config.bot.postPreviewLength} characters`, inline: true }
              );

            await interaction.editReply({ embeds: [configEmbed] });
            break;

          case 'test-ghost':
            try {
              const GhostAPIService = require('../services/ghostApi');
              const ghostApi = new GhostAPIService();
              
              // Test basic connection
              const settings = await ghostApi.getSettings();
              const posts = await ghostApi.getPosts({ limit: 1 });
              
              const testEmbed = createSuccessEmbed('Ghost CMS Connection Test')
                .setTitle('✅ Connection Successful')
                .addFields(
                  { name: '🏠 Site Title', value: settings.settings?.title || 'Unknown', inline: true },
                  { name: '📝 Total Posts', value: posts.meta?.pagination?.total?.toString() || 'Unknown', inline: true },
                  { name: '🔗 Site URL', value: settings.settings?.url || 'Unknown', inline: false }
                );

              await interaction.editReply({ embeds: [testEmbed] });
              
            } catch (error) {
              const errorEmbed = createErrorEmbed(`Ghost CMS connection failed: ${error.message}`)
                .setTitle('❌ Connection Failed')
                .addFields(
                  { name: '💡 Troubleshooting', value: 'Check your Ghost API URL and Content API Key in the .env file', inline: false }
                );

              await interaction.editReply({ embeds: [errorEmbed] });
            }
            break;

          case 'toggle-autopost':
            const DatabaseService = require('../services/database');
            const db = new DatabaseService();
            await db.initialize();
            
            const currentSetting = await db.getBotSetting('autopost_enabled');
            const newSetting = currentSetting === 'false' ? 'true' : 'false';
            await db.setBotSetting('autopost_enabled', newSetting);
            
            const toggleEmbed = createSuccessEmbed(
              `Auto-posting has been ${newSetting === 'true' ? 'enabled' : 'disabled'}`
            )
              .setTitle('🔄 Auto-posting Toggled')
              .addFields(
                { name: 'Status', value: newSetting === 'true' ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: 'Channel', value: config.autoPost.channelId ? `<#${config.autoPost.channelId}>` : 'Not configured', inline: true }
              );

            await interaction.editReply({ embeds: [toggleEmbed] });
            await db.close();
            break;

          default:
            throw new Error('Unknown subcommand');
        }

      } catch (error) {
        console.error('Error in admin command:', error);
        const errorEmbed = createErrorEmbed('An error occurred while executing the admin command.');
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    })(interaction);
  },
};

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);
  
  return parts.join(' ') || '0s';
}
