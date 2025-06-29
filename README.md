# 🤖 Ghost CMS Discord Bot

A comprehensive Discord bot that integrates with Ghost CMS to share blog posts, pages, and manage content directly in your Discord server. Features automatic posting of new articles, slash commands for content exploration, and admin controls.

## ✨ Features

- **📰 Post Commands**: Get latest posts, search by tags, find specific articles
- **📄 Page Commands**: Access static pages like About, Contact, etc.
- **🏷️ Tag Management**: Browse and explore content by tags
- **👥 Author Information**: Get author bios and their recent posts
- **🔄 Auto-posting**: Automatically share new blog posts to Discord channels
- **⚙️ Admin Controls**: Bot management, configuration, and health monitoring
- **🎨 Rich Embeds**: Beautiful, formatted messages with images and metadata
- **🔐 Security**: Rate limiting, permission checks, and secure configuration

## 🛠️ Prerequisites

Before setting up the bot, ensure you have:

- ✅ **Node.js 18+** installed on your system
- ✅ **A Ghost CMS instance** (self-hosted or Ghost(Pro))
- ✅ **Ghost Content API key** (read-only access)
- ✅ **Discord bot token** from Discord Developer Portal
- ✅ **Discord application** with bot permissions

## 📦 Installation

1. **Fork the repository**

2. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/GhostCMS-Discord-Bot.git
   cd GhostCMS-Discord-Bot
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Discord Configuration
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_CLIENT_ID=your_discord_client_id_here
   DISCORD_GUILD_ID=your_discord_guild_id_here  # Optional, for faster dev deployment

   # Ghost CMS Configuration
   GHOST_API_URL=https://your-ghost-site.com
   GHOST_CONTENT_API_KEY=your_ghost_content_api_key_here

   # Auto-posting Configuration
   AUTO_POST_ENABLED=true
   AUTO_POST_CHANNEL_ID=your_discord_channel_id_here
   CHECK_INTERVAL_MINUTES=15
   ```

5. **Deploy slash commands**
   ```bash
   npm run deploy-commands
   ```

6. **Start the bot**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## 🎯 Getting API Keys

### Ghost Content API Key

1. Go to your Ghost Admin panel
2. Navigate to **Settings** → **Integrations**
3. Click **Add custom integration**
4. Name it "Discord Bot" and save
5. Copy the **Content API Key** (not the Admin API Key!)

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and name your bot
3. Go to **Bot** section and click **Add Bot**
4. Copy the **Token** (keep it secret!)
5. Under **OAuth2** → **URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Use Slash Commands`, `Embed Links`
6. Use the generated URL to invite the bot to your server

## 🎮 Available Commands

### 📰 Post Commands
- `/post latest [count]` - Get latest blog posts (1-10)
- `/post by-tag <tag> [count]` - Get posts by specific tag
- `/post search <query> [count]` - Search posts by title

### 📄 Page Commands
- `/page get <slug>` - Get a specific page (e.g., "about", "contact")
- `/page list [count]` - List all available pages

### 🏷️ Tag Commands
- `/tags list` - Show all available tags with post counts
- `/tags popular [count]` - Get most popular tags

### 👥 Author Commands
- `/author info <name>` - Get author bio and information
- `/author posts <name> [count]` - Get recent posts by author
- `/author list` - List all authors

### ⚙️ Admin Commands (Administrator only)
- `/admin status` - Bot health and status information
- `/admin config` - Show current configuration
- `/admin test-ghost` - Test Ghost CMS connection
- `/admin toggle-autopost` - Enable/disable automatic posting

## 🔄 Auto-posting Feature

The bot can automatically post new blog articles to a Discord channel:

1. **Configure** the channel ID in your `.env` file
2. **Set the check interval** (default: 15 minutes)
3. **Enable auto-posting** in configuration
4. **Toggle on/off** using `/admin toggle-autopost` command

The bot will:
- Check for new posts every X minutes
- Compare with the last posted article
- Send new posts with rich embeds
- Store posting history in SQLite database

## 📁 Project Structure

```
ghost-discord-bot/
├── commands/           # Slash command definitions
│   ├── admin.js       # Bot administration
│   ├── author.js      # Author information
│   ├── page.js        # Static pages
│   ├── post.js        # Blog posts
│   └── tags.js        # Tag management
├── config/
│   └── config.js      # Configuration management
├── services/
│   ├── database.js    # SQLite database service
│   └── ghostApi.js    # Ghost CMS API client
├── scheduler/
│   └── autoPoster.js  # Auto-posting scheduler
├── utils/
│   ├── embedUtils.js  # Discord embed utilities
│   └── helpers.js     # General helper functions
├── data/              # SQLite database storage
├── index.js           # Main bot file
├── deploy-commands.js # Command deployment script
└── package.json       # Dependencies and scripts
```

## 🚀 Deployment Options

### Option 1: Free Hosting (Render, Railway, Replit)

1. **Connect your GitHub repository**
2. **Set environment variables** in the platform's dashboard
3. **Deploy** with automatic builds
4. **Monitor** logs for any issues

### Option 2: VPS (DigitalOcean, AWS, etc.)

1. **Set up Node.js** on your server
2. **Clone and configure** the bot
3. **Use PM2** for process management:
   ```bash
   npm install -g pm2
   pm2 start index.js --name "ghost-discord-bot"
   pm2 startup
   pm2 save
   ```

### Option 3: Docker (Optional)

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `DISCORD_TOKEN` | Bot authentication token | Required |
| `DISCORD_CLIENT_ID` | Discord application ID | Required |
| `GHOST_API_URL` | Ghost CMS base URL | Required |
| `GHOST_CONTENT_API_KEY` | Ghost Content API key | Required |
| `AUTO_POST_ENABLED` | Enable automatic posting | `true` |
| `AUTO_POST_CHANNEL_ID` | Discord channel for auto-posts | Optional |
| `CHECK_INTERVAL_MINUTES` | Auto-post check frequency | `15` |

## 🛡️ Security Best Practices

- ✅ **Use Content API Key** (never Admin API key)
- ✅ **Keep tokens secure** (use `.env` file, never commit)
- ✅ **Set appropriate permissions** (minimal required permissions)
- ✅ **Rate limiting** built-in to prevent abuse
- ✅ **Administrator commands** require proper Discord permissions
- ✅ **Error handling** prevents crashes and information leaks

## 🔍 Troubleshooting

### Common Issues

**Bot not responding to commands:**
- Check if commands are deployed: `npm run deploy-commands`
- Verify bot has necessary permissions in Discord server
- Check console logs for errors

**Ghost API connection failed:**
- Verify Ghost API URL format (include `https://`)
- Ensure Content API key is correct (not Admin API key)
- Test connection using `/admin test-ghost` command

**Auto-posting not working:**
- Check `AUTO_POST_CHANNEL_ID` is set correctly
- Verify bot has permission to send messages in that channel
- Ensure `AUTO_POST_ENABLED=true` in configuration

**Database errors:**
- Ensure `data/` directory has write permissions
- Check disk space availability
- Database file will be created automatically

### Debug Mode

Set `NODE_ENV=development` for verbose logging:
```bash
NODE_ENV=development npm start
```

## 📈 Monitoring & Maintenance

### Health Checks
- Use `/admin status` to monitor bot health
- Check memory usage and uptime
- Monitor Ghost CMS API response times

### Regular Maintenance
- Update dependencies: `npm update`
- Monitor logs for errors or warnings
- Backup database file periodically
- Review and update bot permissions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m "Add feature: description"`
5. Push and create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) - Discord API library
- [Ghost](https://ghost.org/) - Content management system
- [Node-cron](https://github.com/node-cron/node-cron) - Task scheduling

## 📞 Support

- 📧 **Issues**: [GitHub Issues](https://github.com/your-username/GhostCMS-Discord-Bot/issues)
- 📖 **Documentation**: This README and inline code comments
- 💬 **Discord**: Join our community server (link here)

---

**Made with ❤️ for the Ghost and Discord communities**