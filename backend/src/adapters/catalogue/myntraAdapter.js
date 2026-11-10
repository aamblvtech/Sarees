import { BaseCatalogueAdapter } from './baseCatalogueAdapter.js';

/**
 * Myntra Official Partner / Seller API Adapter
 * Documentation: https://partner.myntra.com
 * Handles catalog and listing integration for registered brand partners.
 */
export class MyntraAdapter extends BaseCatalogueAdapter {
  constructor() {
    super('myntra', 'Myntra Partner API', 'partner_api');
    this.apiBase = process.env.MYNTRA_API_BASE || 'https://api.partner.myntra.com/v1';
  }

  get partnerId() {
    return process.env.MYNTRA_PARTNER_ID || '';
  }

  get partnerSecret() {
    return process.env.MYNTRA_PARTNER_SECRET || '';
  }

  get isConfigured() {
    return Boolean(this.partnerId && this.partnerSecret);
  }

  async getConnectionStatus() {
    if (!this.isConfigured) {
      return {
        configured: false,
        status: 'pending_partner_approval',
        message: 'Myntra Partner connector is kept disabled until official seller/brand partner credentials (MYNTRA_PARTNER_ID, MYNTRA_PARTNER_SECRET) are provisioned. In accordance with zero-cost and anti-scraping policy, public web scraping is not permitted.',
        capabilities: ['seller_catalogue', 'listing_sync', 'inventory_status'],
        requiresCredentials: ['MYNTRA_PARTNER_ID', 'MYNTRA_PARTNER_SECRET']
      };
    }

    return {
      configured: true,
      status: 'configured',
      message: 'Myntra Authorised Partner credentials active.',
      capabilities: ['seller_catalogue', 'listing_sync', 'inventory_status'],
      requiresCredentials: []
    };
  }

  async testConnection() {
    if (!this.isConfigured) {
      return {
        success: false,
        status: 'pending_credentials',
        message: 'Myntra partner credentials are not configured. To import items without an enterprise seller account, use the Supplier CSV / Excel import.'
      };
    }

    try {
      const response = await fetch(`${this.apiBase}/auth/health`, {
        headers: {
          'X-Partner-Id': this.partnerId,
          'Authorization': `Bearer ${this.partnerSecret}`
        }
      });

      if (response.ok) {
        return {
          success: true,
          status: 'connected',
          message: 'Successfully authenticated against Myntra Partner Gateway.'
        };
      }

      return {
        success: false,
        status: `http_${response.status}`,
        message: `Myntra Partner API returned HTTP ${response.status}: ${response.statusText}`
      };
    } catch (err) {
      return {
        success: false,
        status: 'connection_error',
        message: `Myntra Partner API error: ${err.message}`
      };
    }
  }

  async searchProducts(query = '', options = {}) {
    if (!this.isConfigured) {
      if (process.env.CATALOGUE_MOCK === 'true' || process.env.NODE_ENV === 'test') {
        return this.getMockPartnerCatalogue(query, options.limit || 10);
      }
      throw new Error('Myntra Partner API is unconfigured. Marketplace-wide public search is not provided without authorized seller OAuth.');
    }

    const response = await fetch(`${this.apiBase}/catalogue/items?q=${encodeURIComponent(query)}`, {
      headers: {
        'X-Partner-Id': this.partnerId,
        'Authorization': `Bearer ${this.partnerSecret}`
      }
    });

    if (!response.ok) {
      throw new Error(`Myntra partner sync failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      source: 'myntra',
      totalCount: data.total || 0,
      products: (data.items || []).map((item) => this.normalizeProduct(item))
    };
  }

  normalizeProduct(rawItem) {
    const extId = String(rawItem.styleId || rawItem.id || rawItem.productId || '');
    const title = rawItem.productName || rawItem.name || 'Myntra Designer Garment';
    const brand = rawItem.brandName || rawItem.brand || 'Myntra Partner';
    const desc = rawItem.description || rawItem.productDetails || '';
    const catMapping = this.mapCategory(rawItem.articleType || rawItem.category || '', title);

    const images = [];
    if (Array.isArray(rawItem.images)) {
      for (const img of rawItem.images) {
        if (typeof img === 'string') images.push(img);
        else if (img?.src) images.push(img.src);
        else if (img?.url) images.push(img.url);
      }
    } else if (rawItem.imageUrl) {
      images.push(rawItem.imageUrl);
    }

    return {
      external_product_id: extId,
      source: 'myntra',
      source_product_url: rawItem.landingPageUrl || `https://www.myntra.com/${extId}`,
      affiliate_url: null,
      brand,
      product_name: title,
      description: desc,
      selling_price: Number(rawItem.discountedPrice || rawItem.price || 0),
      original_price: Number(rawItem.mrp || rawItem.originalPrice || rawItem.price || 0),
      currency: rawItem.currency || 'INR',
      category: catMapping.categorySlug,
      category_id: catMapping.categoryId,
      subcategory: rawItem.subCategory || catMapping.categorySlug,
      gender: rawItem.gender ? rawItem.gender.toLowerCase() : 'women',
      garment_type: catMapping.garmentType,
      colour: rawItem.baseColour || rawItem.color || null,
      fabric: rawItem.fabric || null,
      image_urls: images,
      image_usage_permission: 'needs_review',
      stock_status: rawItem.inventory > 0 ? 'in_stock' : 'out_of_stock'
    };
  }

  getMockPartnerCatalogue(query = '', limit = 10) {
    const sample = [
      {
        styleId: 'MYN-DES-801',
        productName: 'Anouk Hand-Embroidered Zari Chanderi Kurta Set',
        brandName: 'Anouk',
        description: 'Pastel pistachio green pure chanderi kurta with hand-embroidered neckline, flared trousers, and organza dupatta.',
        discountedPrice: 3899,
        mrp: 6499,
        landingPageUrl: 'https://www.myntra.com/kurta-sets/anouk/anouk-green-chanderi/801/buy',
        articleType: 'Kurta Sets',
        gender: 'Women',
        baseColour: 'Pistachio Green',
        fabric: 'Chanderi Silk',
        inventory: 15,
        images: [
          'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85'
        ]
      }
    ];

    return {
      source: 'myntra',
      totalCount: sample.length,
      products: sample.slice(0, limit).map((s) => this.normalizeProduct(s))
    };
  }
}
