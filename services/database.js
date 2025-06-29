const sqlite3 = require('sqlite3').verbose();
const config = require('../config/config');
const path = require('path');
const fs = require('fs');

class DatabaseService {
  constructor() {
    this.dbPath = config.database.path;
    this.ensureDataDirectory();
    this.db = null;
  }

  /**
   * Ensure the data directory exists
   */
  ensureDataDirectory() {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Initialize the database connection and create tables
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables()
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  /**
   * Create necessary tables
   */
  async createTables() {
    return new Promise((resolve, reject) => {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS last_posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id TEXT NOT NULL UNIQUE,
          post_title TEXT NOT NULL,
          post_url TEXT NOT NULL,
          published_at TEXT NOT NULL,
          posted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS bot_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `;

      this.db.exec(createTableSQL, (err) => {
        if (err) {
          console.error('Error creating tables:', err.message);
          reject(err);
        } else {
          console.log('Database tables created successfully');
          resolve();
        }
      });
    });
  }

  /**
   * Get the last posted article
   */
  async getLastPostedArticle() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM last_posts ORDER BY posted_at DESC LIMIT 1';
      
      this.db.get(sql, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Save the last posted article
   */
  async saveLastPostedArticle(post) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO last_posts (post_id, post_title, post_url, published_at)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        post.id,
        post.title,
        post.url,
        post.published_at
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Get a bot setting
   */
  async getBotSetting(key) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT value FROM bot_settings WHERE key = ?';
      
      this.db.get(sql, [key], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.value : null);
        }
      });
    });
  }

  /**
   * Set a bot setting
   */
  async setBotSetting(key, value) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO bot_settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(sql, [key, value], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Close the database connection
   */
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = DatabaseService;
