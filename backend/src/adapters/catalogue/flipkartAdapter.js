import { BaseCatalogueAdapter } from './baseCatalogueAdapter.js';

/**
 * Flipkart Official Affiliate API Adapter
 * Documentation: https://affiliate.flipkart.com/api-docs
 * Endpoints: https://affiliate-api.flipkart.net/affiliate/1.0/
 */
export class FlipkartAdapter extends BaseCatalogueAdapter {
  constructor() {
    super('flipkart', 'Flipkart Affiliate API', 'affiliate_api');
    this.apiBase = process.env.FLIPKART_API_BASE || 'https://affiliate-api.flipkart.net/affiliate/1.0';
  }

  get affiliateId() {
    return process.env.FLIPKART_AFFILIATE_ID || '';
  }

  get affiliateToken() {
    return process.env.FLIPKART_AFFILIATE_TOKEN || '';
  }

  get isConfigured() {
    return Boolean(this.affiliateId && this.affiliateToken);
  }

  async getConnectionStatus() {
    if (!this.isConfigured) {
      return {
        configured: false,
        status: 'unconfigured',
        message: 'Flipkart Affiliate API requires FLIPKART_AFFILIATE_ID and FLIPKART_AFFILIATE_TOKEN in backend/.env. Scraping is strictly disabled per zero-cost policy.',
        capabilities: ['search', 'category_feed', 'product_details', 'affiliate_links'],
        requiresCredentials: ['FLIPKART_AFFILIATE_ID', 'FLIPKART_AFFILIATE_TOKEN']
      };
    }

    return {
      configured: true,
      status: 'configured',
      message: 'Flipkart Affiliate API credentials configured and ready.',
      capabilities: ['search', 'category_feed', 'product_details', 'affiliate_links'],
      requiresCredentials: []
    };
  }

  async testConnection() {
    if (!this.isConfigured) {
      return {
        success: false,
        status: 'unconfigured',
        message: 'Flipkart credentials not configured. Please supply official affiliate credentials or use supplier CSV import.'
      };
    }

    try {
      const response = await fetch(`${this.apiBase}/feeds/${this.affiliateId}.json`, {
        headers: {
          'Fk-Affiliate-Id': this.affiliateId,
          'Fk-Affiliate-Token': this.affiliateToken
        }
      });

      if (response.ok) {
        return {
          success: true,
          status: 'connected',
          message: 'Successfully connected to Flipkart Affiliate API feed endpoint.'
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          status: 'auth_failed',
          message: 'Flipkart Affiliate authentication failed. Check your Affiliate ID and Token.'
        };
      }

      return {
        success: false,
        status: `http_${response.status}`,
        message: `Flipkart API returned status ${response.status}: ${response.statusText}`
      };
    } catch (err) {
      return {
        success: false,
        status: 'network_error',
        message: `Flipkart connection error: ${err.message}`
      };
    }
  }

  async searchProducts(query = '', options = {}) {
    const limit = Math.min(options.limit || 10, 50);

    // If unconfigured, return clear structured status rather than scraping
    if (!this.isConfigured) {
      if (process.env.CATALOGUE_MOCK === 'true' || process.env.NODE_ENV === 'test') {
        return this.getMockSearchResults(query, limit);
      }
      throw new Error('Flipkart Affiliate API credentials missing. Please configure FLIPKART_AFFILIATE_ID and FLIPKART_AFFILIATE_TOKEN.');
    }

    const searchUrl = `${this.apiBase}/search.json?query=${encodeURIComponent(query)}&resultCount=${limit}`;

    const response = await fetch(searchUrl, {
      headers: {
        'Fk-Affiliate-Id': this.affiliateId,
        'Fk-Affiliate-Token': this.affiliateToken
      }
    });

    if (response.status === 429) {
      throw new Error('Flipkart Affiliate API rate limit exceeded. Please back off request frequency.');
    }

    if (!response.ok) {
      throw new Error(`Flipkart Search failed with HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const products = (data.products || []).map((item) => this.normalizeProduct(item));

    return {
      source: 'flipkart',
      totalCount: data.totalProductsCount || products.length,
      nextUrl: data.nextUrl || null,
      products
    };
  }

  normalizeProduct(rawItem) {
    const baseInfo = rawItem.productBaseInfoV1 || rawItem.baseInfo || rawItem;
    const shippingInfo = rawItem.productShippingInfoV1 || {};
    const extId = String(baseInfo.productId || baseInfo.id || '');

    // Extract best available images (prefer highest resolution)
    const imgUrls = [];
    if (baseInfo.imageUrls && typeof baseInfo.imageUrls === 'object') {
      const keys = ['800x800', '400x400', '200x200', 'unknown'];
      for (const k of keys) {
        if (baseInfo.imageUrls[k]) {
          imgUrls.push(baseInfo.imageUrls[k]);
        }
      }
    } else if (Array.isArray(baseInfo.images)) {
      for (const img of baseInfo.images) {
        if (typeof img === 'string') imgUrls.push(img);
        else if (img?.url) imgUrls.push(img.url);
      }
    } else if (baseInfo.imageUrl) {
      imgUrls.push(baseInfo.imageUrl);
    }

    const title = baseInfo.title || baseInfo.productName || 'Flipkart Garment';
    const desc = baseInfo.productDescription || baseInfo.description || '';
    const rawCat = baseInfo.categoryPath || baseInfo.category || '';
    const catMapping = this.mapCategory(rawCat, title);

    const sellingPrice = Number(baseInfo.flipkartSellingPrice?.amount || baseInfo.sellingPrice || baseInfo.price || 0);
    const origPrice = Number(baseInfo.maximumRetailPrice?.amount || baseInfo.originalPrice || sellingPrice);

    return {
      external_product_id: extId,
      source: 'flipkart',
      source_product_url: baseInfo.productUrl || `https://www.flipkart.com/product/p/itme?pid=${extId}`,
      affiliate_url: baseInfo.productUrl || null,
      brand: baseInfo.productBrand || baseInfo.brand || 'Flipkart Partner',
      product_name: title,
      description: desc,
      selling_price: sellingPrice,
      original_price: origPrice,
      currency: baseInfo.flipkartSellingPrice?.currency || 'INR',
      category: catMapping.categorySlug,
      category_id: catMapping.categoryId,
      subcategory: baseInfo.subCategory || catMapping.categorySlug,
      gender: (title + desc).toLowerCase().includes('men') ? 'men' : 'women',
      garment_type: catMapping.garmentType,
      colour: baseInfo.attributes?.color || baseInfo.color || null,
      fabric: baseInfo.attributes?.fabric || baseInfo.fabric || null,
      image_urls: imgUrls,
      image_usage_permission: 'needs_review',
      stock_status: baseInfo.inStock !== false ? 'in_stock' : 'out_of_stock'
    };
  }

  getMockSearchResults(query = '', limit = 10) {
    const mockItems = [
      {
        productBaseInfoV1: {
          productId: 'FK-SAREE-901',
          title: 'Mysore Traditional Pure Silk Saree with Zari Border',
          productBrand: 'KASIKA',
          productDescription: 'Artisanal handloom Mysore pure silk saree with contrast zari border and floral pallu.',
          flipkartSellingPrice: { amount: 3499, currency: 'INR' },
          maximumRetailPrice: { amount: 6999, currency: 'INR' },
          productUrl: 'https://www.flipkart.com/kasika-printed-mysore-silk-saree/p/itm123',
          inStock: true,
          categoryPath: 'Apparel > Ethnic Wear > Sarees',
          imageUrls: {
            '800x800': 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85',
            '400x400': 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80'
          },
          attributes: { color: 'Crimson Red', fabric: 'Pure Silk' }
        }
      },
      {
        productBaseInfoV1: {
          productId: 'FK-SHIRT-902',
          title: 'Men Tailored Fit Solid Formal Poplin Shirt',
          productBrand: 'PETER ENGLAND',
          productDescription: 'Premium pure cotton poplin spread collar formal button-down shirt.',
          flipkartSellingPrice: { amount: 1499, currency: 'INR' },
          maximumRetailPrice: { amount: 2499, currency: 'INR' },
          productUrl: 'https://www.flipkart.com/peter-england-men-formal-shirt/p/itm456',
          inStock: true,
          categoryPath: 'Apparel > Men Formal > Shirts',
          imageUrls: {
            '800x800': 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1200&q=85'
          },
          attributes: { color: 'White', fabric: '100% Cotton' }
        }
      }
    ];

    return {
      source: 'flipkart',
      totalCount: mockItems.length,
      nextUrl: null,
      products: mockItems.slice(0, limit).map((m) => this.normalizeProduct(m))
    };
  }
}

