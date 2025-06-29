# 🤖 Discord Bot Setup Guide

A comprehensive guide to create and configure your Discord bot for the Ghost CMS Discord Bot project.

## 🚀 Overview

This guide will walk you through creating a Discord application, setting up a bot, configuring permissions, and inviting it to your server with the correct scopes and permissions.

## 📋 Prerequisites

- A Discord account
- Server Administrator permissions on the Discord server where you want to add the bot
- Basic understanding of Discord permissions

## 🛠️ Step 1: Create Discord Application

1. **Go to Discord Developer Portal**
   - Visit: [https://discord.com/developers/applications](https://discord.com/developers/applications)
   - Click **"Log in"** and sign in with your Discord account

2. **Create New Application**
   - Click **"New Application"** button (top-right)
   - Enter your bot name (e.g., "Ghost CMS Bot", "Blog Bot", "My Site Bot")
   - Click **"Create"**

3. **Configure Application Settings**
   - **Name**: Your bot's display name
   - **Description**: Brief description of what your bot does
   - **Avatar**: Upload an icon for your bot (optional but recommended)
   - **Tags**: Add relevant tags like "utility", "content", "blog"

## 🤖 Step 2: Create Bot User

1. **Navigate to Bot Section**
   - In the left sidebar, click **"Bot"**
   - Click **"Add Bot"** (or **"Create Bot"**)
   - Confirm by clicking **"Yes, do it!"**

2. **Configure Bot Settings**
   ```
   Username: Your bot's username (can be different from application name)
   Avatar: Bot's profile picture
   Public Bot: ❌ DISABLE (keeps your bot private)
   Requires OAuth2 Code Grant: ❌ DISABLE (not needed)
   Presence Intent: ✅ ENABLE (for bot status)
   Server Members Intent: ❌ DISABLE (not needed for this bot)
   Message Content Intent: ❌ DISABLE (not needed for slash commands)
   ```

3. **Copy Bot Token** 🔑
   - Click **"Reset Token"** (if needed)
   - Copy the token immediately
   - **⚠️ IMPORTANT**: Keep this token secret! Never share it publicly
   - Save it in your `.env` file as `DISCORD_TOKEN`

## 🔧 Step 3: OAuth2 Configuration

1. **Navigate to OAuth2 Section**
   - In the left sidebar, click **"OAuth2"** → **"URL Generator"**

2. **Select Scopes** ✅
   ```
   ☑️ bot                    (Required for bot functionality)
   ☑️ applications.commands  (Required for slash commands)
   ```
   
   **Don't select these scopes:**
   ```
   ❌ identify              (Not needed)
   ❌ guilds               (Not needed)
   ❌ email                (Not needed)
   ❌ webhook.incoming     (Not using webhooks)
   ```

3. **Select Bot Permissions** 🛡️

   ### **General Permissions**
   ```
   ❌ Administrator         (Too broad - security risk)
   ❌ Manage Server        (Not needed)
   ❌ Manage Roles         (Not needed)
   ❌ Manage Channels      (Not needed)
   ❌ Kick Members         (Not needed)
   ❌ Ban Members          (Not needed)
   ❌ Create Instant Invite (Not needed)
   ❌ Change Nickname      (Not needed)
   ❌ Manage Nicknames     (Not needed)
   ❌ Manage Emojis        (Not needed)
   ❌ Manage Webhooks      (Not using webhooks)
   ❌ View Audit Log       (Not needed)
   ```

   ### **Text Permissions** ✅
   ```
   ☑️ View Channels         (Required to see channels)
   ☑️ Send Messages         (Required to respond to commands)
   ☑️ Send Messages in Threads (If using threads)
   ☑️ Embed Links           (Required for rich embeds)
   ☑️ Attach Files          (For images in embeds)
   ☑️ Read Message History  (Helpful for context)
   ☑️ Use External Emojis   (For better embeds)
   ☑️ Add Reactions         (Optional - for user interaction)
   ☑️ Use Slash Commands    (Required for bot functionality)
   ```

   ### **Voice Permissions** ❌
   ```
   ❌ Connect              (Not a voice bot)
   ❌ Speak                (Not a voice bot)
   ❌ Video                (Not needed)
   ❌ Use Voice Activity   (Not needed)
   ❌ Priority Speaker     (Not needed)
   ❌ Mute Members         (Not needed)
   ❌ Deafen Members       (Not needed)
   ❌ Move Members         (Not needed)
   ```

## 🔗 Step 4: Generate Invite URL

1. **Copy the Generated URL**
   - After selecting scopes and permissions, copy the generated URL
   - It should look like:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274877924352&scope=bot%20applications.commands
   ```

2. **Verify Permissions** (The permission integer should be approximately `274877924352`)
   - View Channels: `1024`
   - Send Messages: `2048`
   - Embed Links: `16384`
   - Attach Files: `32768`
   - Read Message History: `65536`
   - Use External Emojis: `262144`
   - Add Reactions: `64`
   - Use Slash Commands: `2147483648`

## 🏠 Step 5: Invite Bot to Server

1. **Use the Generated URL**
   - Paste the URL in your browser
   - Select the server where you want to add the bot
   - **⚠️ Note**: You need **"Manage Server"** permission on the server

2. **Review Permissions**
   - Discord will show you the permissions the bot is requesting
   - Verify they match what you configured
   - Click **"Authorize"**

3. **Complete Captcha**
   - Complete the reCAPTCHA verification
   - Your bot should now appear in your server's member list

## 📝 Step 6: Get Required IDs

1. **Enable Developer Mode** (if not already enabled)
   - Discord Settings → Advanced → Developer Mode: ✅ ON

2. **Get Client ID** 🆔
   - Go back to Discord Developer Portal
   - Your Application → General Information
   - Copy **"Application ID"**
   - Save as `DISCORD_CLIENT_ID` in your `.env` file

3. **Get Guild ID** (Server ID) 🏠
   - Right-click your Discord server name
   - Click **"Copy Server ID"**
   - Save as `DISCORD_GUILD_ID` in your `.env` file (optional, for faster dev deployment)

4. **Get Channel ID** (for auto-posting) 📢
   - Right-click the channel where you want auto-posts
   - Click **"Copy Channel ID"**
   - Save as `AUTO_POST_CHANNEL_ID` in your `.env` file

## ⚙️ Step 7: Configure Environment Variables

Create/update your `.env` file with:

```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_GUILD_ID=your_server_id_here

# Auto-posting Configuration  
AUTO_POST_CHANNEL_ID=your_channel_id_here

# Ghost CMS Configuration
GHOST_API_URL=https://your-ghost-site.com
GHOST_CONTENT_API_KEY=your_ghost_content_api_key
```

## 🧪 Step 8: Test Bot Setup

1. **Deploy Commands**
   ```bash
   npm run deploy-commands
   ```

2. **Start the Bot**
   ```bash
   npm start
   ```

3. **Test in Discord**
   - Type `/ping` in your server
   - The bot should respond with connection status
   - Try other commands like `/post latest`

## 🔒 Security Best Practices

### ✅ **Do's**
- ✅ Keep your bot token secret
- ✅ Use minimal required permissions
- ✅ Enable only necessary intents
- ✅ Store sensitive data in `.env` file
- ✅ Add `.env` to `.gitignore`
- ✅ Regenerate token if compromised

### ❌ **Don'ts**
- ❌ Never share your bot token publicly
- ❌ Don't grant Administrator permissions
- ❌ Don't enable unnecessary intents
- ❌ Don't commit tokens to version control
- ❌ Don't use the same token across projects

## 🚨 Troubleshooting

### **Bot Not Responding**
```
Issue: Bot doesn't respond to slash commands
Solutions:
1. Check if commands are deployed: npm run deploy-commands
2. Verify bot has "Use Slash Commands" permission
3. Check bot token is correct in .env file
4. Ensure bot is online (should show as online in server)
```

### **Permission Errors**
```
Issue: "Missing permissions" errors
Solutions:
1. Verify bot has required permissions in channel
2. Check channel-specific permission overrides
3. Ensure bot role is high enough in hierarchy
4. Re-invite bot with correct permissions
```

### **Commands Not Appearing**
```
Issue: Slash commands don't show up when typing /
Solutions:
1. Wait up to 1 hour for global commands to sync
2. Use DISCORD_GUILD_ID for instant guild commands during development
3. Check console for deployment errors
4. Verify bot has applications.commands scope
```

## 📊 Final Verification Checklist

### **Discord Developer Portal** ✅
- [ ] Application created with proper name and description
- [ ] Bot user created with appropriate settings
- [ ] Bot token copied and stored securely
- [ ] OAuth2 scopes configured: `bot` + `applications.commands`
- [ ] Bot permissions configured with minimal required permissions

### **Environment Variables** ✅
- [ ] `DISCORD_TOKEN` - Bot token from Developer Portal
- [ ] `DISCORD_CLIENT_ID` - Application ID from General Information
- [ ] `DISCORD_GUILD_ID` - Server ID (optional, for development)
- [ ] `AUTO_POST_CHANNEL_ID` - Channel ID for auto-posting

### **Bot Testing** ✅
- [ ] Bot appears online in server member list
- [ ] `/ping` command works and shows connection status
- [ ] Other slash commands are visible when typing `/`
- [ ] Bot can send messages and embeds
- [ ] Admin-only commands restricted to administrators

### **Security** ✅
- [ ] Bot token kept secret and not committed to version control
- [ ] Minimal permissions granted (no Administrator)
- [ ] Public bot disabled in bot settings
- [ ] Unnecessary intents disabled

## 🎉 Success!

Your Discord bot is now properly configured and ready to serve your Ghost CMS content! 

**Next Steps:**
1. Configure your Ghost CMS settings
2. Test all bot commands
3. Set up auto-posting schedule
4. Monitor bot performance with `/admin status`

For additional help, check the main README.md or create an issue on GitHub.

---

**📞 Need Help?**
- 📧 **Issues**: [GitHub Issues](https://github.com/Krithiv-7/GhostCMS-Discord-Bot/issues)  
- 💬 **Discord**: [Join our community server](https://discord.krithiv.dev)
- 📖 **Documentation**: Main README.md

**Made with ❤️ for the Discord and Ghost communities**
