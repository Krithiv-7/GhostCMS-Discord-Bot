const axios = require('axios');
const config = require('../config/config');

class GhostAPIService {
  constructor() {
    this.baseURL = config.ghost.apiUrl;
    this.apiKey = config.ghost.contentApiKey;
    
    if (!this.baseURL || !this.apiKey) {
      throw new Error('Ghost API URL and Content API Key are required');
    }
    
    this.client = axios.create({
      baseURL: `${this.baseURL}/ghost/api/content`,
      params: {
        key: this.apiKey,
      },
    });
  }

  /**
   * Get posts from Ghost CMS
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Posts data
   */
  async getPosts(options = {}) {
    try {
      const params = {
        include: 'tags,authors',
        formats: 'html,plaintext',
        limit: options.limit || 5,
        ...options,
      };

      const response = await this.client.get('/posts/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching posts:', error.message);
      throw new Error('Failed to fetch posts from Ghost CMS');
    }
  }

  /**
   * Get latest posts
   * @param {number} limit - Number of posts to fetch
   * @returns {Promise<Object>} Latest posts
   */
  async getLatestPosts(limit = 5) {
    return this.getPosts({
      limit,
      order: 'published_at DESC',
    });
  }

  /**
   * Get posts by tag
   * @param {string} tagSlug - Tag slug to filter by
   * @param {number} limit - Number of posts to fetch
   * @returns {Promise<Object>} Posts filtered by tag
   */
  async getPostsByTag(tagSlug, limit = 5) {
    return this.getPosts({
      filter: `tag:${tagSlug}`,
      limit,
      order: 'published_at DESC',
    });
  }

  /**
   * Get a single post by slug
   * @param {string} slug - Post slug
   * @returns {Promise<Object>} Post data
   */
  async getPostBySlug(slug) {
    try {
      const response = await this.client.get(`/posts/slug/${slug}/`, {
        params: {
          include: 'tags,authors',
          formats: 'html,plaintext',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching post by slug:', error.message);
      throw new Error('Failed to fetch post from Ghost CMS');
    }
  }

  /**
   * Get pages from Ghost CMS
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Pages data
   */
  async getPages(options = {}) {
    try {
      const params = {
        include: 'authors',
        formats: 'html,plaintext',
        ...options,
      };

      const response = await this.client.get('/pages/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching pages:', error.message);
      throw new Error('Failed to fetch pages from Ghost CMS');
    }
  }

  /**
   * Get a page by slug
   * @param {string} slug - Page slug
   * @returns {Promise<Object>} Page data
   */
  async getPageBySlug(slug) {
    try {
      const response = await this.client.get(`/pages/slug/${slug}/`, {
        params: {
          include: 'authors',
          formats: 'html,plaintext',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching page by slug:', error.message);
      throw new Error('Failed to fetch page from Ghost CMS');
    }
  }

  /**
   * Get all tags
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Tags data
   */
  async getTags(options = {}) {
    try {
      const params = {
        include: 'count.posts',
        limit: 'all',
        ...options,
      };

      const response = await this.client.get('/tags/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching tags:', error.message);
      throw new Error('Failed to fetch tags from Ghost CMS');
    }
  }

  /**
   * Get authors
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Authors data
   */
  async getAuthors(options = {}) {
    try {
      const params = {
        include: 'count.posts',
        limit: 'all',
        ...options,
      };

      const response = await this.client.get('/authors/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching authors:', error.message);
      throw new Error('Failed to fetch authors from Ghost CMS');
    }
  }

  /**
   * Get author by slug
   * @param {string} slug - Author slug
   * @returns {Promise<Object>} Author data
   */
  async getAuthorBySlug(slug) {
    try {
      const response = await this.client.get(`/authors/slug/${slug}/`, {
        params: {
          include: 'count.posts',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching author by slug:', error.message);
      throw new Error('Failed to fetch author from Ghost CMS');
    }
  }

  /**
   * Get site settings
   * @returns {Promise<Object>} Site settings
   */
  async getSettings() {
    try {
      const response = await this.client.get('/settings/');
      return response.data;
    } catch (error) {
      console.error('Error fetching settings:', error.message);
      throw new Error('Failed to fetch site settings from Ghost CMS');
    }
  }
}

module.exports = GhostAPIService;
