require('dotenv').config();

module.exports = {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
  },
  
  // Ghost CMS Configuration
  ghost: {
    apiUrl: process.env.GHOST_API_URL,
    contentApiKey: process.env.GHOST_CONTENT_API_KEY,
  },
  
  // Auto-posting Configuration
  autoPost: {
    enabled: process.env.AUTO_POST_ENABLED === 'true',
    channelId: process.env.AUTO_POST_CHANNEL_ID,
    checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES) || 15,
  },
  
  // Database Configuration
  database: {
    path: process.env.DATABASE_PATH || './data/bot.db',
  },
  
  // Bot Settings
  bot: {
    embedColor: 0x7289da, // Discord blurple
    maxPostsPerPage: 5,
    postPreviewLength: 200,
  },
};
