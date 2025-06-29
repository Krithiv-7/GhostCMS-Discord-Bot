const Fuse = require('fuse.js');
const GhostAPIService = require('./ghostApi');
const cache = require('./cache');

/**
 * Advanced search service with fuzzy matching and intelligent suggestions
 */
class SearchService {
  constructor() {
    this.ghostApi = new GhostAPIService();
    this.searchIndex = null;
    this.lastIndexUpdate = null;
    this.indexTTL = 600000; // 10 minutes
  }

  /**
   * Build search index from Ghost content
   */
  async buildSearchIndex() {
    try {
      console.log('Building search index...');
      
      // Check if we have a cached index
      const cachedIndex = cache.get('search_index', 'long');
      if (cachedIndex && this.isIndexValid()) {
        this.searchIndex = new Fuse(cachedIndex.data, this.getFuseOptions());
        this.lastIndexUpdate = cachedIndex.timestamp;
        console.log('Loaded search index from cache');
        return;
      }

      // Fetch all content for indexing
      const [posts, pages, tags, authors] = await Promise.all([
        this.ghostApi.getPosts({ limit: 'all' }),
        this.ghostApi.getPages({ limit: 'all' }),
        this.ghostApi.getTags(),
        this.ghostApi.getAuthors(),
      ]);

      // Prepare search data
      const searchData = [];

      // Index posts
      posts.posts?.forEach(post => {
        searchData.push({
          id: post.id,
          type: 'post',
          title: post.title,
          content: post.plaintext || post.excerpt || '',
          tags: post.tags?.map(tag => tag.name).join(' ') || '',
          authors: post.authors?.map(author => author.name).join(' ') || '',
          url: post.url,
          published_at: post.published_at,
          feature_image: post.feature_image,
          excerpt: post.excerpt,
          slug: post.slug,
        });
      });

      // Index pages
      pages.pages?.forEach(page => {
        searchData.push({
          id: page.id,
          type: 'page',
          title: page.title,
          content: page.plaintext || page.excerpt || '',
          authors: page.authors?.map(author => author.name).join(' ') || '',
          url: page.url,
          updated_at: page.updated_at,
          feature_image: page.feature_image,
          excerpt: page.excerpt,
          slug: page.slug,
        });
      });

      // Index tags
      tags.tags?.forEach(tag => {
        if (tag.visibility === 'public') {
          searchData.push({
            id: tag.id,
            type: 'tag',
            title: tag.name,
            content: tag.description || '',
            slug: tag.slug,
            count: tag.count?.posts || 0,
          });
        }
      });

      // Index authors
      authors.authors?.forEach(author => {
        searchData.push({
          id: author.id,
          type: 'author',
          title: author.name,
          content: author.bio || '',
          slug: author.slug,
          url: author.url,
          count: author.count?.posts || 0,
        });
      });

      // Create Fuse instance
      this.searchIndex = new Fuse(searchData, this.getFuseOptions());
      this.lastIndexUpdate = Date.now();

      // Cache the search data
      cache.set('search_index', {
        data: searchData,
        timestamp: this.lastIndexUpdate
      }, 1800, 'long'); // 30 minutes

      console.log(`Search index built with ${searchData.length} items`);
      
    } catch (error) {
      console.error('Error building search index:', error);
      throw error;
    }
  }

  /**
   * Get Fuse.js options for search configuration
   */
  getFuseOptions() {
    return {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'content', weight: 0.3 },
        { name: 'tags', weight: 0.2 },
        { name: 'authors', weight: 0.1 },
      ],
      threshold: 0.4, // Lower = more strict matching
      distance: 100,
      minMatchCharLength: 2,
      includeScore: true,
      includeMatches: true,
    };
  }

  /**
   * Check if search index is still valid
   */
  isIndexValid() {
    return this.lastIndexUpdate && 
           (Date.now() - this.lastIndexUpdate) < this.indexTTL;
  }

  /**
   * Perform advanced search
   */
  async search(query, options = {}) {
    try {
      // Ensure search index is available
      if (!this.searchIndex || !this.isIndexValid()) {
        await this.buildSearchIndex();
      }

      if (!this.searchIndex) {
        throw new Error('Search index not available');
      }

      // Perform search
      const results = this.searchIndex.search(query);
      
      // Filter by type if specified
      let filteredResults = results;
      if (options.type) {
        filteredResults = results.filter(result => 
          result.item.type === options.type
        );
      }

      // Limit results
      const limit = options.limit || 10;
      const limitedResults = filteredResults.slice(0, limit);

      // Format results
      const formattedResults = limitedResults.map(result => ({
        ...result.item,
        score: result.score,
        matches: result.matches,
      }));

      return {
        results: formattedResults,
        total: filteredResults.length,
        query: query,
        searchTime: Date.now(),
      };

    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Search operation failed');
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(partialQuery, limit = 5) {
    try {
      if (partialQuery.length < 2) {
        return [];
      }

      // Ensure search index is available
      if (!this.searchIndex || !this.isIndexValid()) {
        await this.buildSearchIndex();
      }

      // Search with lower threshold for suggestions
      const tempFuse = new Fuse(this.searchIndex._docs, {
        ...this.getFuseOptions(),
        threshold: 0.6, // More lenient for suggestions
      });

      const results = tempFuse.search(partialQuery);
      
      // Extract unique titles for suggestions
      const suggestions = [...new Set(
        results.slice(0, limit * 2)
          .map(result => result.item.title)
          .filter(title => title.toLowerCase().includes(partialQuery.toLowerCase()))
      )].slice(0, limit);

      return suggestions;

    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  }

  /**
   * Search specifically for posts
   */
  async searchPosts(query, limit = 10) {
    const results = await this.search(query, { type: 'post', limit });
    return results;
  }

  /**
   * Search specifically for pages
   */
  async searchPages(query, limit = 10) {
    const results = await this.search(query, { type: 'page', limit });
    return results;
  }

  /**
   * Search specifically for tags
   */
  async searchTags(query, limit = 10) {
    const results = await this.search(query, { type: 'tag', limit });
    return results;
  }

  /**
   * Search specifically for authors
   */
  async searchAuthors(query, limit = 10) {
    const results = await this.search(query, { type: 'author', limit });
    return results;
  }

  /**
   * Get popular search terms (placeholder for future analytics)
   */
  async getPopularSearches() {
    // This would typically come from usage analytics
    // For now, return common search terms
    return [
      'tutorial', 'guide', 'review', 'news', 'update',
      'javascript', 'python', 'web development', 'ai', 'tech'
    ];
  }

  /**
   * Clear search index and rebuild
   */
  async refreshIndex() {
    this.searchIndex = null;
    this.lastIndexUpdate = null;
    cache.del('search_index', 'long');
    await this.buildSearchIndex();
    console.log('Search index refreshed');
  }

  /**
   * Get search statistics
   */
  getStats() {
    return {
      indexExists: !!this.searchIndex,
      lastUpdate: this.lastIndexUpdate,
      isValid: this.isIndexValid(),
      itemCount: this.searchIndex?._docs?.length || 0,
    };
  }
}

module.exports = SearchService;
