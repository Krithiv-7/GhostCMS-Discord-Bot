const { SlashCommandBuilder } = require('discord.js');
const GhostAPIService = require('../services/ghostApi');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embedUtils');
const { handleAsyncError } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Test bot responsiveness and Ghost CMS connection'),

  async execute(interaction) {
    await handleAsyncError(async () => {
      const startTime = Date.now();
      
      // Defer reply to measure response time
      await interaction.deferReply();
      
      const botResponseTime = Date.now() - startTime;
      const websocketPing = Math.round(interaction.client.ws.ping);

      try {
        // Test Ghost CMS connection
        const ghostStartTime = Date.now();
        const ghostApi = new GhostAPIService();
        
        // Make a lightweight request to test Ghost CMS
        await ghostApi.getSettings();
        const ghostResponseTime = Date.now() - ghostStartTime;

        // Create success embed with all ping information
        const pingEmbed = createSuccessEmbed('🏓 Pong!')
          .setTitle('🏓 Ping Test Results')
          .addFields(
            {
              name: '🤖 Bot Response Time',
              value: `${botResponseTime}ms`,
              inline: true,
            },
            {
              name: '🌐 WebSocket Ping',
              value: `${websocketPing}ms`,
              inline: true,
            },
            {
              name: '👻 Ghost CMS Response',
              value: `${ghostResponseTime}ms`,
              inline: true,
            },
            {
              name: '📊 Status',
              value: getPingStatus(botResponseTime, websocketPing, ghostResponseTime),
              inline: false,
            }
          )
          .setTimestamp();

        // Add performance indicators
        if (botResponseTime < 100 && websocketPing < 100 && ghostResponseTime < 500) {
          pingEmbed.setColor(0x00ff00); // Green for excellent
        } else if (botResponseTime < 200 && websocketPing < 200 && ghostResponseTime < 1000) {
          pingEmbed.setColor(0xffff00); // Yellow for good
        } else {
          pingEmbed.setColor(0xff8800); // Orange for slower
        }

        await interaction.editReply({ embeds: [pingEmbed] });

      } catch (error) {
        console.error('Error testing Ghost CMS connection:', error);
        
        // Create embed showing bot ping but Ghost CMS error
        const errorEmbed = createErrorEmbed('Ping test completed with issues')
          .setTitle('🏓 Ping Test Results')
          .addFields(
            {
              name: '🤖 Bot Response Time',
              value: `${botResponseTime}ms ✅`,
              inline: true,
            },
            {
              name: '🌐 WebSocket Ping',
              value: `${websocketPing}ms ✅`,
              inline: true,
            },
            {
              name: '👻 Ghost CMS Response',
              value: `❌ Failed`,
              inline: true,
            },
            {
              name: '📊 Status',
              value: `Bot: ${getBotStatus(botResponseTime, websocketPing)}\nGhost CMS: ❌ Connection Failed`,
              inline: false,
            },
            {
              name: '⚠️ Error Details',
              value: `\`${error.message}\``,
              inline: false,
            }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
      }
    })(interaction);
  },
};

/**
 * Get overall ping status based on response times
 */
function getPingStatus(botTime, wsTime, ghostTime) {
  const botStatus = getBotStatus(botTime, wsTime);
  const ghostStatus = getGhostStatus(ghostTime);
  
  return `Bot: ${botStatus}\nGhost CMS: ${ghostStatus}`;
}

/**
 * Get bot status based on response times
 */
function getBotStatus(botTime, wsTime) {
  if (botTime < 100 && wsTime < 100) {
    return '🟢 Excellent';
  } else if (botTime < 200 && wsTime < 200) {
    return '🟡 Good';
  } else if (botTime < 500 && wsTime < 500) {
    return '🟠 Slow';
  } else {
    return '🔴 Very Slow';
  }
}

/**
 * Get Ghost CMS status based on response time
 */
function getGhostStatus(ghostTime) {
  if (ghostTime < 200) {
    return '🟢 Excellent';
  } else if (ghostTime < 500) {
    return '🟡 Good';
  } else if (ghostTime < 1000) {
    return '🟠 Slow';
  } else {
    return '🔴 Very Slow';
  }
}
