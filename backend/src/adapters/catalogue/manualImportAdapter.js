import { BaseCatalogueAdapter } from './baseCatalogueAdapter.js';

/**
 * Manual Boutique & Artisan Garment Entry Adapter
 * Zero-cost direct manual product entry for independent boutiques and fashion designers.
 */
export class ManualImportAdapter extends BaseCatalogueAdapter {
  constructor() {
    super('manual', 'Manual Boutique Entry', 'manual_entry');
  }

  async getConnectionStatus() {
    return {
      configured: true,
      status: 'active',
      message: 'Direct manual boutique entry interface is active. Ready to catalog individual couture pieces and boutique designer apparel.',
      capabilities: ['manual_form_entry', 'multi_file_upload', 'supplier_mapping', 'custom_pricing'],
      requiresCredentials: []
    };
  }

  async testConnection() {
    return {
      success: true,
      status: 'active',
      message: 'Manual entry adapter is active and operational.'
    };
  }

  normalizeProduct(formData, options = {}) {
    const extId = formData.external_product_id || formData.sku || `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const title = formData.product_name || formData.name || 'Boutique Garment';
    const brand = formData.brand || options.supplierName || 'Independent Atelier';
    const desc = formData.description || title;

    const sellingPrice = Number(formData.selling_price || formData.price || 0);
    const origPrice = Number(formData.original_price || formData.mrp || sellingPrice);

    let images = [];
    if (Array.isArray(formData.image_urls)) {
      images = formData.image_urls.filter(Boolean);
    } else if (typeof formData.image_urls === 'string') {
      images = formData.image_urls.split(/[,|;]/).map((u) => u.trim()).filter(Boolean);
    } else if (formData.primary_image_url) {
      images.push(formData.primary_image_url);
    }

    const catMapping = this.mapCategory(formData.category || '', title, formData.garment_type || '');

    return {
      external_product_id: extId,
      source: 'manual',
      supplier_id: formData.supplier_id || options.supplierId || null,
      supplier_name: brand,
      source_product_url: formData.source_product_url || null,
      affiliate_url: null,
      brand,
      product_name: title,
      description: desc,
      selling_price: sellingPrice,
      original_price: origPrice,
      currency: formData.currency || 'INR',
      category: catMapping.categorySlug,
      category_id: catMapping.categoryId,
      subcategory: formData.subcategory || catMapping.categorySlug,
      gender: formData.gender ? formData.gender.toLowerCase() : 'women',
      garment_type: formData.garment_type || catMapping.garmentType,
      colour: formData.colour || formData.color || null,
      fabric: formData.fabric || formData.material || null,
      image_urls: images,
      image_usage_permission: formData.image_usage_permission || 'confirmed',
      stock_status: (formData.stock_status || 'in_stock').toLowerCase()
    };
  }
}
