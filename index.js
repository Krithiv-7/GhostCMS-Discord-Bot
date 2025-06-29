const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');
const AutoPoster = require('./scheduler/autoPoster');
const AnalyticsService = require('./services/analytics');

// Create Discord client
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ] 
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
  }
}

// Initialize auto-poster and analytics
let autoPoster;
let analytics;

// Event: Bot ready
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`🤖 Bot logged in as ${readyClient.user.tag}`);
  console.log(`📊 Serving ${readyClient.guilds.cache.size} servers`);
  
  // Set bot activity
  client.user.setActivity('Ghost CMS posts', { type: 'WATCHING' });
  
  // Initialize auto-poster and analytics
  try {
    autoPoster = new AutoPoster(client);
    await autoPoster.initialize();
    
    analytics = new AnalyticsService();
    await analytics.initialize();
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
  
  console.log('🚀 Bot is ready!');
});

// Event: Slash command interaction
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  
  if (!command) {
    console.error(`❌ No command matching ${interaction.commandName} was found.`);
    return;
  }

  const startTime = Date.now();
  let success = true;
  let errorMessage = null;

  try {
    console.log(`🔧 Executing command: ${interaction.commandName} by ${interaction.user.tag}`);
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ Error executing command:', error);
    success = false;
    errorMessage = error.message;
    
    const errorMessage_discord = {
      content: '❌ There was an error while executing this command!',
      ephemeral: true
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage_discord);
    } else {
      await interaction.reply(errorMessage_discord);
    }
  } finally {
    // Track command usage in analytics
    if (analytics) {
      const executionTime = Date.now() - startTime;
      await analytics.trackCommand(
        interaction.commandName,
        interaction.user.id,
        interaction.guildId,
        interaction.channelId,
        executionTime,
        success,
        errorMessage
      ).catch(err => console.error('Analytics tracking error:', err));
    }
  }
});

// Event: Error handling
client.on(Events.Error, error => {
  console.error('❌ Discord client error:', error);
});

client.on(Events.Warn, warning => {
  console.warn('⚠️ Discord client warning:', warning);
});

// Process error handling
process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  
  if (autoPoster) {
    await autoPoster.cleanup();
  }
  
  if (analytics) {
    await analytics.close();
  }
  
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  
  if (autoPoster) {
    await autoPoster.cleanup();
  }
  
  if (analytics) {
    await analytics.close();
  }
  
  client.destroy();
  process.exit(0);
});

// Validate configuration before starting
function validateConfig() {
  const requiredEnvVars = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
    'GHOST_API_URL',
    'GHOST_CONTENT_API_KEY'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    console.error('📝 Please check your .env file');
    process.exit(1);
  }
  
  // Validate Ghost API URL format
  try {
    new URL(config.ghost.apiUrl);
  } catch (error) {
    console.error('❌ Invalid Ghost API URL format');
    process.exit(1);
  }
  
  console.log('✅ Configuration validated');
}

// Start the bot
async function startBot() {
  try {
    validateConfig();
    
    console.log('🔑 Logging in to Discord...');
    await client.login(config.discord.token);
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Export for testing purposes
module.exports = { client, autoPoster };

// Start the bot if this file is run directly
if (require.main === module) {
  startBot();
}
