const NodeCache = require('node-cache');

/**
 * Cache service for storing frequently accessed data
 */
class CacheService {
  constructor() {
    // Main cache with 10 minute TTL
    this.cache = new NodeCache({ 
      stdTTL: 600, // 10 minutes
      checkperiod: 60, // Check for expired keys every minute
      useClones: false // Better performance
    });
    
    // Short-term cache for API responses (2 minutes)
    this.shortCache = new NodeCache({ 
      stdTTL: 120, // 2 minutes
      checkperiod: 30
    });
    
    // Long-term cache for settings and tags (30 minutes)
    this.longCache = new NodeCache({ 
      stdTTL: 1800, // 30 minutes
      checkperiod: 300
    });
    
    console.log('Cache service initialized');
  }

  /**
   * Get cached data
   */
  get(key, cacheType = 'main') {
    const cache = this.getCache(cacheType);
    return cache.get(key);
  }

  /**
   * Set cached data
   */
  set(key, value, ttl = null, cacheType = 'main') {
    const cache = this.getCache(cacheType);
    if (ttl) {
      return cache.set(key, value, ttl);
    }
    return cache.set(key, value);
  }

  /**
   * Delete cached data
   */
  del(key, cacheType = 'main') {
    const cache = this.getCache(cacheType);
    return cache.del(key);
  }

  /**
   * Check if key exists in cache
   */
  has(key, cacheType = 'main') {
    const cache = this.getCache(cacheType);
    return cache.has(key);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      main: this.cache.getStats(),
      short: this.shortCache.getStats(),
      long: this.longCache.getStats(),
    };
  }

  /**
   * Clear all caches
   */
  flushAll() {
    this.cache.flushAll();
    this.shortCache.flushAll();
    this.longCache.flushAll();
    console.log('All caches cleared');
  }

  /**
   * Clear specific cache type
   */
  flush(cacheType = 'main') {
    const cache = this.getCache(cacheType);
    cache.flushAll();
    console.log(`${cacheType} cache cleared`);
  }

  /**
   * Get cache instance by type
   */
  getCache(type) {
    switch (type) {
      case 'short':
        return this.shortCache;
      case 'long':
        return this.longCache;
      case 'main':
      default:
        return this.cache;
    }
  }

  /**
   * Generate cache key for posts
   */
  static generatePostsKey(options = {}) {
    const params = new URLSearchParams();
    Object.keys(options).sort().forEach(key => {
      if (options[key] !== undefined) {
        params.append(key, options[key]);
      }
    });
    return `posts:${params.toString()}`;
  }

  /**
   * Generate cache key for single post
   */
  static generatePostKey(slug) {
    return `post:${slug}`;
  }

  /**
   * Generate cache key for pages
   */
  static generatePagesKey(options = {}) {
    const params = new URLSearchParams();
    Object.keys(options).sort().forEach(key => {
      if (options[key] !== undefined) {
        params.append(key, options[key]);
      }
    });
    return `pages:${params.toString()}`;
  }

  /**
   * Generate cache key for tags
   */
  static generateTagsKey() {
    return 'tags:all';
  }

  /**
   * Generate cache key for authors
   */
  static generateAuthorsKey() {
    return 'authors:all';
  }

  /**
   * Generate cache key for settings
   */
  static generateSettingsKey() {
    return 'settings:site';
  }
}

// Export singleton instance
module.exports = new CacheService();
