/**
 * VESTRA Multi-Source Fashion Catalogue Integration
 * Base Catalogue Adapter (Interface & Normalizer for all external product sources)
 */

export class BaseCatalogueAdapter {
  constructor(sourceSlug, sourceName, sourceType) {
    this.sourceSlug = sourceSlug;
    this.sourceName = sourceName;
    this.sourceType = sourceType;
  }

  /**
   * Check connection & credential configuration status
   * @returns {Object} { configured, status, message, capabilities }
   */
  async getConnectionStatus() {
    throw new Error(`getConnectionStatus() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Test active connectivity to the source
   * @returns {Promise<{success: boolean, message: string, details?: any}>}
   */
  async testConnection() {
    throw new Error(`testConnection() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Search source products by keyword or category feed
   * @param {string} query
   * @param {Object} options - { page, limit, category, subcategory }
   */
  async searchProducts(query = '', options = {}) {
    throw new Error(`searchProducts() not implemented by ${this.constructor.name}`);
  }

  /**
   * Fetch single product by external source ID
   * @param {string} externalId
   */
  async fetchProduct(externalId) {
    throw new Error(`fetchProduct() not implemented by ${this.constructor.name}`);
  }

  /**
   * Normalizes raw source product data into standard VESTRA product schema.
   * STRICT: Do not invent missing product attributes.
   * @param {Object} rawItem - Raw item from API or file
   * @returns {Object} Normalized product
   */
  normalizeProduct(rawItem) {
    throw new Error(`normalizeProduct() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Utility: Map diverse external category labels into VESTRA's 8 registered apparel taxonomies
   */
  mapCategory(rawCategory = '', rawName = '', rawType = '') {
    const text = `${rawCategory} ${rawName} ${rawType}`.toLowerCase();

    if (text.includes('saree') || text.includes('sari') || text.includes('kanjivaram') || text.includes('banarasi')) {
      return { categoryId: 1, categorySlug: 'sarees', garmentType: 'saree' };
    }
    if (text.includes('shirt') || text.includes('blouse') || text.includes('top') || text.includes('t-shirt') || text.includes('tshirt') || text.includes('polo')) {
      return { categoryId: 5, categorySlug: 'shirts', garmentType: 'upper_body' };
    }
    if (text.includes('jean') || text.includes('denim')) {
      return { categoryId: 6, categorySlug: 'jeans', garmentType: 'lower_body' };
    }
    if (text.includes('pant') || text.includes('trouser') || text.includes('chino') || text.includes('cargo') || text.includes('palazzo')) {
      return { categoryId: 7, categorySlug: 'pants', garmentType: 'lower_body' };
    }
    if (text.includes('tuxedo') || text.includes('suit') || text.includes('blazer') || text.includes('formal') || text.includes('smoking jacket')) {
      return { categoryId: 8, categorySlug: 'formal-attire', garmentType: 'full_body' };
    }
    if (text.includes('anarkali') || text.includes('lehenga') || text.includes('kurti') || text.includes('gown') || text.includes('dress') || text.includes('salwar')) {
      return { categoryId: 2, categorySlug: 'womens-clothing', garmentType: 'full_body' };
    }
    if (text.includes('sherwani') || text.includes('kurta') || text.includes('bandhgala') || text.includes('mens')) {
      return { categoryId: 3, categorySlug: 'mens-clothing', garmentType: 'full_body' };
    }
    if (text.includes('belt') || text.includes('shawl') || text.includes('pashmina') || text.includes('accessory')) {
      return { categoryId: 4, categorySlug: 'accessories', garmentType: 'accessory' };
    }

    // Default fallback
    return { categoryId: 2, categorySlug: 'womens-clothing', garmentType: 'full_body' };
  }
}
