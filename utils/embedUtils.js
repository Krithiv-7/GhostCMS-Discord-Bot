const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

/**
 * Create a Discord embed for a Ghost post
 * @param {Object} post - Ghost post object
 * @returns {EmbedBuilder} Discord embed
 */
function createPostEmbed(post) {
  const embed = new EmbedBuilder()
    .setColor(config.bot.embedColor)
    .setTitle(post.title)
    .setURL(post.url)
    .setDescription(truncateText(post.excerpt || post.plaintext, config.bot.postPreviewLength))
    .setTimestamp(new Date(post.published_at));

  // Add featured image if available
  if (post.feature_image) {
    embed.setImage(post.feature_image);
  }

  // Add author information
  if (post.authors && post.authors.length > 0) {
    const author = post.authors[0];
    embed.setAuthor({
      name: author.name,
      iconURL: author.profile_image,
      url: author.url,
    });
  }

  // Add tags as footer
  if (post.tags && post.tags.length > 0) {
    const tagNames = post.tags.map(tag => tag.name).join(', ');
    embed.setFooter({ text: `Tags: ${tagNames}` });
  }

  return embed;
}

/**
 * Create a Discord embed for a Ghost page
 * @param {Object} page - Ghost page object
 * @returns {EmbedBuilder} Discord embed
 */
function createPageEmbed(page) {
  const embed = new EmbedBuilder()
    .setColor(config.bot.embedColor)
    .setTitle(page.title)
    .setURL(page.url)
    .setDescription(truncateText(page.excerpt || page.plaintext, config.bot.postPreviewLength))
    .setTimestamp(new Date(page.updated_at));

  // Add featured image if available
  if (page.feature_image) {
    embed.setImage(page.feature_image);
  }

  // Add author information
  if (page.authors && page.authors.length > 0) {
    const author = page.authors[0];
    embed.setAuthor({
      name: author.name,
      iconURL: author.profile_image,
      url: author.url,
    });
  }

  return embed;
}

/**
 * Create a Discord embed for author information
 * @param {Object} author - Ghost author object
 * @returns {EmbedBuilder} Discord embed
 */
function createAuthorEmbed(author) {
  const embed = new EmbedBuilder()
    .setColor(config.bot.embedColor)
    .setTitle(author.name)
    .setURL(author.url)
    .setDescription(author.bio || 'No bio available')
    .addFields({
      name: 'Posts',
      value: author.count?.posts?.toString() || '0',
      inline: true,
    });

  // Add profile image if available
  if (author.profile_image) {
    embed.setThumbnail(author.profile_image);
  }

  // Add cover image if available
  if (author.cover_image) {
    embed.setImage(author.cover_image);
  }

  // Add social links
  const socialLinks = [];
  if (author.website) socialLinks.push(`[Website](${author.website})`);
  if (author.twitter) socialLinks.push(`[Twitter](https://twitter.com/${author.twitter})`);
  if (author.facebook) socialLinks.push(`[Facebook](${author.facebook})`);

  if (socialLinks.length > 0) {
    embed.addFields({
      name: 'Links',
      value: socialLinks.join(' • '),
      inline: false,
    });
  }

  return embed;
}

/**
 * Create a Discord embed for displaying tags
 * @param {Array} tags - Array of Ghost tag objects
 * @returns {EmbedBuilder} Discord embed
 */
function createTagsEmbed(tags) {
  const embed = new EmbedBuilder()
    .setColor(config.bot.embedColor)
    .setTitle('📚 Available Tags')
    .setDescription('Here are all the available tags:');

  // Group tags by their first letter for better organization
  const tagsByLetter = {};
  tags.forEach(tag => {
    if (tag.visibility === 'public') {
      const firstLetter = tag.name.charAt(0).toUpperCase();
      if (!tagsByLetter[firstLetter]) {
        tagsByLetter[firstLetter] = [];
      }
      tagsByLetter[firstLetter].push(tag);
    }
  });

  // Add fields for each letter group (max 25 fields)
  let fieldCount = 0;
  for (const [letter, letterTags] of Object.entries(tagsByLetter)) {
    if (fieldCount >= 25) break;
    
    const tagList = letterTags
      .slice(0, 10) // Max 10 tags per field
      .map(tag => `**${tag.name}** (${tag.count?.posts || 0} posts)`)
      .join('\n');

    embed.addFields({
      name: `${letter}`,
      value: tagList || 'No tags',
      inline: true,
    });
    
    fieldCount++;
  }

  return embed;
}

/**
 * Create an error embed
 * @param {string} message - Error message
 * @returns {EmbedBuilder} Error embed
 */
function createErrorEmbed(message) {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('❌ Error')
    .setDescription(message)
    .setTimestamp();
}

/**
 * Create a success embed
 * @param {string} message - Success message
 * @returns {EmbedBuilder} Success embed
 */
function createSuccessEmbed(message) {
  return new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('✅ Success')
    .setDescription(message)
    .setTimestamp();
}

/**
 * Truncate text to a specific length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, length) {
  if (!text) return 'No content available';
  
  if (text.length <= length) {
    return text;
  }
  
  return text.substring(0, length).trim() + '...';
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Clean HTML content to plain text
 * @param {string} html - HTML content
 * @returns {string} Plain text
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  createPostEmbed,
  createPageEmbed,
  createAuthorEmbed,
  createTagsEmbed,
  createErrorEmbed,
  createSuccessEmbed,
  truncateText,
  formatDate,
  stripHtml,
  isValidUrl,
};
