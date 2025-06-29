const cron = require('node-cron');
const GhostAPIService = require('../services/ghostApi');
const DatabaseService = require('../services/database');
const { createPostEmbed } = require('../utils/embedUtils');
const config = require('../config/config');

class AutoPoster {
  constructor(client) {
    this.client = client;
    this.ghostApi = new GhostAPIService();
    this.db = new DatabaseService();
    this.isRunning = false;
    this.cronJob = null;
  }

  /**
   * Initialize the auto-poster
   */
  async initialize() {
    if (!config.autoPost.enabled) {
      console.log('Auto-posting is disabled in configuration');
      return;
    }

    if (!config.autoPost.channelId) {
      console.log('Auto-posting channel ID not configured');
      return;
    }

    try {
      await this.db.initialize();
      this.startScheduler();
      console.log('Auto-poster initialized successfully');
    } catch (error) {
      console.error('Failed to initialize auto-poster:', error);
    }
  }

  /**
   * Start the scheduler
   */
  startScheduler() {
    if (this.cronJob) {
      this.cronJob.stop();
    }

    // Create cron expression for the configured interval
    const intervalMinutes = config.autoPost.checkIntervalMinutes;
    const cronExpression = `*/${intervalMinutes} * * * *`; // Every X minutes

    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.checkForNewPosts();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    console.log(`Auto-poster scheduled to run every ${intervalMinutes} minutes`);
  }

  /**
   * Stop the scheduler
   */
  stopScheduler() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('Auto-poster scheduler stopped');
    }
  }

  /**
   * Check for new posts and post them to Discord
   */
  async checkForNewPosts() {
    if (this.isRunning) {
      console.log('Auto-poster check already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('Checking for new posts...');

      // Check if auto-posting is enabled in database (can be toggled via admin command)
      const autopostEnabled = await this.db.getBotSetting('autopost_enabled');
      if (autopostEnabled === 'false') {
        console.log('Auto-posting disabled via admin command');
        return;
      }

      // Get the latest posts
      const postsData = await this.ghostApi.getLatestPosts(5);
      
      if (!postsData.posts || postsData.posts.length === 0) {
        console.log('No posts found');
        return;
      }

      // Get the last posted article from database
      const lastPosted = await this.db.getLastPostedArticle();
      
      // Find new posts
      const newPosts = [];
      for (const post of postsData.posts) {
        if (!lastPosted || new Date(post.published_at) > new Date(lastPosted.published_at)) {
          newPosts.push(post);
        } else {
          break; // Posts are ordered by publish date DESC, so we can break here
        }
      }

      if (newPosts.length === 0) {
        console.log('No new posts found');
        return;
      }

      console.log(`Found ${newPosts.length} new post(s)`);

      // Post new articles to Discord (in chronological order)
      const channel = this.client.channels.cache.get(config.autoPost.channelId);
      if (!channel) {
        console.error(`Discord channel ${config.autoPost.channelId} not found`);
        return;
      }

      // Reverse to post in chronological order (oldest first)
      newPosts.reverse();

      for (const post of newPosts) {
        try {
          await this.postToDiscord(channel, post);
          await this.db.saveLastPostedArticle(post);
          
          // Add delay between posts to avoid rate limiting
          if (newPosts.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`Failed to post article "${post.title}":`, error);
        }
      }

    } catch (error) {
      console.error('Error in auto-poster check:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Post a single article to Discord
   */
  async postToDiscord(channel, post) {
    try {
      const embed = createPostEmbed(post);
      
      // Add auto-post indicator
      embed.setFooter({ 
        text: `🤖 Auto-posted • ${embed.data.footer?.text || ''}`.trim() 
      });

      const message = {
        content: '📢 **New Blog Post Published!**',
        embeds: [embed]
      };

      await channel.send(message);
      console.log(`Posted article: "${post.title}"`);
      
    } catch (error) {
      console.error(`Failed to send message to Discord:`, error);
      throw error;
    }
  }

  /**
   * Manually trigger a check (for testing)
   */
  async manualCheck() {
    console.log('Manual auto-poster check triggered');
    await this.checkForNewPosts();
  }

  /**
   * Get auto-poster status
   */
  getStatus() {
    return {
      enabled: config.autoPost.enabled,
      channelId: config.autoPost.channelId,
      interval: config.autoPost.checkIntervalMinutes,
      isRunning: this.isRunning,
      isScheduled: this.cronJob !== null,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    this.stopScheduler();
    if (this.db) {
      await this.db.close();
    }
  }
}

module.exports = AutoPoster;
