const DatabaseService = require('./database');

/**
 * Analytics service for tracking bot usage and content performance
 */
class AnalyticsService {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize analytics service
   */
  async initialize() {
    this.db = new DatabaseService();
    await this.db.initialize();
    await this.createAnalyticsTables();
    console.log('Analytics service initialized');
  }

  /**
   * Create analytics tables
   */
  async createAnalyticsTables() {
    return new Promise((resolve, reject) => {
      const createTablesSQL = `
        CREATE TABLE IF NOT EXISTS command_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          command_name TEXT NOT NULL,
          user_id TEXT NOT NULL,
          guild_id TEXT,
          channel_id TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          execution_time INTEGER,
          success BOOLEAN DEFAULT TRUE,
          error_message TEXT
        );

        CREATE TABLE IF NOT EXISTS content_interactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content_type TEXT NOT NULL, -- post, page, tag, author
          content_id TEXT NOT NULL,
          content_title TEXT,
          user_id TEXT NOT NULL,
          guild_id TEXT,
          interaction_type TEXT NOT NULL, -- view, click, share
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS search_queries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          query TEXT NOT NULL,
          user_id TEXT NOT NULL,
          guild_id TEXT,
          results_count INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bot_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          metric_name TEXT NOT NULL,
          metric_value REAL NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_command_usage_command ON command_usage(command_name);
        CREATE INDEX IF NOT EXISTS idx_command_usage_timestamp ON command_usage(timestamp);
        CREATE INDEX IF NOT EXISTS idx_content_interactions_type ON content_interactions(content_type);
        CREATE INDEX IF NOT EXISTS idx_content_interactions_timestamp ON content_interactions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_search_queries_timestamp ON search_queries(timestamp);
        CREATE INDEX IF NOT EXISTS idx_bot_metrics_name ON bot_metrics(metric_name);
      `;

      this.db.db.exec(createTablesSQL, (err) => {
        if (err) {
          console.error('Error creating analytics tables:', err.message);
          reject(err);
        } else {
          console.log('Analytics tables created successfully');
          resolve();
        }
      });
    });
  }

  /**
   * Track command usage
   */
  async trackCommand(commandName, userId, guildId, channelId, executionTime, success = true, errorMessage = null) {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO command_usage (command_name, user_id, guild_id, channel_id, execution_time, success, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.db.run(sql, [
        commandName,
        userId,
        guildId,
        channelId,
        executionTime,
        success,
        errorMessage
      ], function(err) {
        if (err) {
          console.error('Error tracking command usage:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Track content interaction
   */
  async trackContentInteraction(contentType, contentId, contentTitle, userId, guildId, interactionType = 'view') {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO content_interactions (content_type, content_id, content_title, user_id, guild_id, interaction_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      this.db.db.run(sql, [
        contentType,
        contentId,
        contentTitle,
        userId,
        guildId,
        interactionType
      ], function(err) {
        if (err) {
          console.error('Error tracking content interaction:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Track search query
   */
  async trackSearch(query, userId, guildId, resultsCount) {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO search_queries (query, user_id, guild_id, results_count)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.db.run(sql, [query, userId, guildId, resultsCount], function(err) {
        if (err) {
          console.error('Error tracking search query:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Track bot metric
   */
  async trackMetric(metricName, metricValue) {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO bot_metrics (metric_name, metric_value)
        VALUES (?, ?)
      `;
      
      this.db.db.run(sql, [metricName, metricValue], function(err) {
        if (err) {
          console.error('Error tracking metric:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Get command usage statistics
   */
  async getCommandStats(days = 7) {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          command_name,
          COUNT(*) as usage_count,
          AVG(execution_time) as avg_execution_time,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_executions,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_executions
        FROM command_usage 
        WHERE timestamp >= datetime('now', '-${days} days')
        GROUP BY command_name
        ORDER BY usage_count DESC
      `;
      
      this.db.db.all(sql, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get popular content
   */
  async getPopularContent(contentType = null, days = 7, limit = 10) {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          content_type,
          content_id,
          content_title,
          COUNT(*) as interaction_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM content_interactions 
        WHERE timestamp >= datetime('now', '-${days} days')
      `;
      
      const params = [];
      if (contentType) {
        sql += ' AND content_type = ?';
        params.push(contentType);
      }
      
      sql += `
        GROUP BY content_type, content_id, content_title
        ORDER BY interaction_count DESC
        LIMIT ?
      `;
      params.push(limit);
      
      this.db.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get search analytics
   */
  async getSearchStats(days = 7) {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          query,
          COUNT(*) as search_count,
          AVG(results_count) as avg_results,
          COUNT(DISTINCT user_id) as unique_users
        FROM search_queries 
        WHERE timestamp >= datetime('now', '-${days} days')
        GROUP BY query
        ORDER BY search_count DESC
        LIMIT 20
      `;
      
      this.db.db.all(sql, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get user activity stats
   */
  async getUserStats(days = 7) {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(*) as total_commands,
          AVG(commands_per_user) as avg_commands_per_user
        FROM (
          SELECT user_id, COUNT(*) as commands_per_user
          FROM command_usage 
          WHERE timestamp >= datetime('now', '-${days} days')
          GROUP BY user_id
        )
      `;
      
      this.db.db.get(sql, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get daily usage trends
   */
  async getDailyTrends(days = 30) {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as command_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM command_usage 
        WHERE timestamp >= datetime('now', '-${days} days')
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;
      
      this.db.db.all(sql, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get comprehensive analytics summary
   */
  async getAnalyticsSummary(days = 7) {
    try {
      const [commandStats, popularContent, searchStats, userStats, dailyTrends] = await Promise.all([
        this.getCommandStats(days),
        this.getPopularContent(null, days, 5),
        this.getSearchStats(days),
        this.getUserStats(days),
        this.getDailyTrends(Math.min(days, 14)) // Limit daily trends
      ]);

      return {
        period: `${days} days`,
        commands: commandStats,
        popularContent: popularContent,
        searches: searchStats,
        users: userStats,
        trends: dailyTrends,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error generating analytics summary:', error);
      throw error;
    }
  }

  /**
   * Clean old analytics data
   */
  async cleanOldData(daysToKeep = 90) {
    if (!this.db) return;

    const tables = ['command_usage', 'content_interactions', 'search_queries', 'bot_metrics'];
    
    for (const table of tables) {
      await new Promise((resolve, reject) => {
        const sql = `DELETE FROM ${table} WHERE timestamp < datetime('now', '-${daysToKeep} days')`;
        
        this.db.db.run(sql, function(err) {
          if (err) {
            console.error(`Error cleaning ${table}:`, err);
            reject(err);
          } else {
            console.log(`Cleaned ${this.changes} old records from ${table}`);
            resolve();
          }
        });
      });
    }
  }

  /**
   * Close analytics service
   */
  async close() {
    if (this.db) {
      await this.db.close();
    }
  }
}

module.exports = AnalyticsService;
