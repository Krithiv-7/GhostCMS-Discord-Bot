const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load environment variables first
const config = require('./config/config');

const commands = [];

// Load all command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.discord.token);

// Deploy commands
async function deployCommands() {
  try {
    console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);

    let data;
    
    if (config.discord.guildId) {
      // Deploy to specific guild (faster for development)
      console.log(`📍 Deploying to guild: ${config.discord.guildId}`);
      data = await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands },
      );
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      console.log('🌍 Deploying globally (may take up to 1 hour to appear)');
      data = await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands },
      );
    }

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    
    // List deployed commands
    console.log('\n📋 Deployed commands:');
    data.forEach(command => {
      console.log(`   - /${command.name}: ${command.description}`);
    });
    
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

// Validate configuration
function validateConfig() {
  if (!config.discord.token) {
    console.error('❌ DISCORD_TOKEN is required');
    process.exit(1);
  }
  
  if (!config.discord.clientId) {
    console.error('❌ DISCORD_CLIENT_ID is required');
    process.exit(1);
  }
  
  console.log('✅ Configuration validated');
}

// Main execution
async function main() {
  validateConfig();
  await deployCommands();
}

if (require.main === module) {
  main();
}

module.exports = { deployCommands };
