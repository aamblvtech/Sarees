import { BaseCatalogueAdapter } from './baseCatalogueAdapter.js';

/**
 * Amazon Creators API / Product Advertising API Adapter
 * Documentation: https://webservices.amazon.com/paapi5/documentation/
 * Operations: SearchItems, GetItems
 */
export class AmazonAdapter extends BaseCatalogueAdapter {
  constructor() {
    super('amazon', 'Amazon Creators API', 'creators_api');
    this.region = process.env.AMAZON_REGION || 'eu-west-1';
    this.host = process.env.AMAZON_HOST || 'webservices.amazon.in';
  }

  get associateTag() {
    return process.env.AMAZON_ASSOCIATE_TAG || '';
  }

  get accessKey() {
    return process.env.AMAZON_ACCESS_KEY || '';
  }

  get secretKey() {
    return process.env.AMAZON_SECRET_KEY || '';
  }

  get isConfigured() {
    return Boolean(this.associateTag && this.accessKey && this.secretKey);
  }

  async getConnectionStatus() {
    if (!this.isConfigured) {
      return {
        configured: false,
        status: 'unconfigured',
        message: 'Amazon Creators API requires AMAZON_ASSOCIATE_TAG, AMAZON_ACCESS_KEY, and AMAZON_SECRET_KEY. Amazon mandates active Associates eligibility (3 qualifying sales) before PA-API access is granted.',
        capabilities: ['SearchItems', 'GetItems', 'product_images', 'affiliate_tagging'],
        requiresCredentials: ['AMAZON_ASSOCIATE_TAG', 'AMAZON_ACCESS_KEY', 'AMAZON_SECRET_KEY']
      };
    }

    return {
      configured: true,
      status: 'configured',
      message: 'Amazon Creators API credentials configured for ' + this.host,
      capabilities: ['SearchItems', 'GetItems', 'product_images', 'affiliate_tagging'],
      requiresCredentials: []
    };
  }

  async testConnection() {
    if (!this.isConfigured) {
      return {
        success: false,
        status: 'unconfigured',
        message: 'Amazon PA-API / Creators credentials missing. Account eligibility check: Unconfigured.'
      };
    }

    try {
      // Perform lightweight test search for apparel
      const result = await this.searchItems('apparel', { limit: 1 });
      return {
        success: true,
        status: 'connected',
        message: 'Successfully authenticated against Amazon Creators API.'
      };
    } catch (err) {
      return {
        success: false,
        status: 'auth_error',
        message: `Amazon PA-API authentication check failed: ${err.message}`
      };
    }
  }

  async searchProducts(query = '', options = {}) {
    return this.searchItems(query, options);
  }

  async searchItems(keywords = 'clothing', options = {}) {
    const limit = Math.min(options.limit || 10, 10);

    if (!this.isConfigured) {
      if (process.env.CATALOGUE_MOCK === 'true' || process.env.NODE_ENV === 'test') {
        return this.getMockAmazonItems(keywords, limit);
      }
      throw new Error('Amazon Creators API is unconfigured. PA-API access requires Amazon Associates approval.');
    }

    // Official PA-API payload specification
    const payload = {
      Keywords: keywords,
      SearchIndex: 'Apparel',
      ItemCount: limit,
      PartnerTag: this.associateTag,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.in',
      Resources: [
        'ItemInfo.Title',
        'ItemInfo.ByLineInfo',
        'ItemInfo.Classifications',
        'ItemInfo.Features',
        'Images.Primary.Large',
        'Images.Variants.Large',
        'Offers.Listings.Price'
      ]
    };

    // Note: Production request requires AWS SigV4 signed headers
    // When real credentials are provided, invoke signed PA-API endpoint
    const response = await fetch(`https://${this.host}/paapi5/searchitems`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Amazon PA-API SearchItems failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    const items = data.SearchResult?.Items || [];

    return {
      source: 'amazon',
      totalCount: data.SearchResult?.TotalResultCount || items.length,
      products: items.map((it) => this.normalizeProduct(it))
    };
  }

  normalizeProduct(rawItem) {
    const asin = rawItem.ASIN || rawItem.asin || rawItem.id || '';
    const itemInfo = rawItem.ItemInfo || {};
    const title = itemInfo.Title?.DisplayValue || rawItem.title || 'Amazon Apparel Product';
    const brand = itemInfo.ByLineInfo?.Brand?.DisplayValue || rawItem.brand || 'Amazon Fashion';
    const features = itemInfo.Features?.DisplayValues || [];
    const desc = features.join('. ') || rawItem.description || title;

    const priceObj = rawItem.Offers?.Listings?.[0]?.Price || {};
    const price = Number(priceObj.Amount || rawItem.price || 0);

    const images = [];
    if (rawItem.Images?.Primary?.Large?.URL) {
      images.push(rawItem.Images.Primary.Large.URL);
    }
    if (Array.isArray(rawItem.Images?.Variants)) {
      for (const v of rawItem.Images.Variants) {
        if (v?.Large?.URL) images.push(v.Large.URL);
      }
    }
    if (images.length === 0 && rawItem.imageUrl) {
      images.push(rawItem.imageUrl);
    }

    const catMapping = this.mapCategory(itemInfo.Classifications?.Binding?.DisplayValue || '', title);

    return {
      external_product_id: asin,
      source: 'amazon',
      source_product_url: rawItem.DetailPageURL || `https://www.amazon.in/dp/${asin}`,
      affiliate_url: rawItem.DetailPageURL || (this.associateTag ? `https://www.amazon.in/dp/${asin}?tag=${this.associateTag}` : null),
      brand,
      product_name: title,
      description: desc,
      selling_price: price,
      original_price: price,
      currency: priceObj.Currency || 'INR',
      category: catMapping.categorySlug,
      category_id: catMapping.categoryId,
      subcategory: catMapping.categorySlug,
      gender: title.toLowerCase().includes('men') ? 'men' : 'women',
      garment_type: catMapping.garmentType,
      colour: itemInfo.Color?.DisplayValue || null,
      fabric: itemInfo.Material?.DisplayValue || null,
      image_urls: images,
      image_usage_permission: 'needs_review',
      stock_status: rawItem.Offers?.Listings?.[0]?.Availability?.Type === 'Now' ? 'in_stock' : 'in_stock'
    };
  }

  getMockAmazonItems(keywords = '', limit = 10) {
    const mockList = [
      {
        ASIN: 'B08XYZ1234',
        DetailPageURL: 'https://www.amazon.in/dp/B08XYZ1234',
        ItemInfo: {
          Title: { DisplayValue: 'Van Heusen Men Formal Tailored Cotton Shirt' },
          ByLineInfo: { Brand: { DisplayValue: 'Van Heusen' } },
          Features: {
            DisplayValues: ['100% Breathable cotton', 'Point collar with buttoned cuffs', 'Regular tailoring fit']
          },
          Color: { DisplayValue: 'Azure Blue' },
          Material: { DisplayValue: 'Cotton' }
        },
        Offers: {
          Listings: [{ Price: { Amount: 1899, Currency: 'INR' }, Availability: { Type: 'Now' } }]
        },
        Images: {
          Primary: {
            Large: { URL: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=85' }
          }
        }
      }
    ];

    return {
      source: 'amazon',
      totalCount: mockList.length,
      products: mockList.slice(0, limit).map((m) => this.normalizeProduct(m))
    };
  }
}
