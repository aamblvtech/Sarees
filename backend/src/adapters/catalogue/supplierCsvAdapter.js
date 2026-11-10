import { BaseCatalogueAdapter } from './baseCatalogueAdapter.js';

/**
 * Supplier Batch CSV / Excel / Structured Data Adapter
 * Zero-cost, subscription-free supplier catalogue importer.
 * Supports clothing manufacturers, local wholesalers, and independent fashion boutiques.
 */
export class SupplierCsvAdapter extends BaseCatalogueAdapter {
  constructor() {
    super('supplier_csv', 'Supplier Batch Import (CSV/Excel)', 'supplier_import');
  }

  async getConnectionStatus() {
    return {
      configured: true,
      status: 'active',
      message: 'Supplier batch import engine is active. Ready to ingest CSV or tabular catalogue files from fashion manufacturers, local wholesalers, and boutiques.',
      capabilities: ['csv_upload', 'tsv_upload', 'multi_image_parsing', 'supplier_tagging', 'bulk_sku_mapping'],
      requiresCredentials: []
    };
  }

  async testConnection() {
    return {
      success: true,
      status: 'active',
      message: 'Local supplier batch parser is ready with zero API costs.'
    };
  }

  /**
   * Parse CSV content into structured normalized product rows
   * @param {string} csvText - Raw CSV or TSV string
   * @param {Object} options - { supplierId, supplierName, defaultCurrency, defaultPermission }
   */
  parseCsv(csvText, options = {}) {
    if (!csvText || typeof csvText !== 'string') {
      throw new Error('CSV content is empty or invalid.');
    }

    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      throw new Error('CSV must contain a header row and at least one product data row.');
    }

    // Determine delimiter (comma, semicolon, or tab)
    const headerLine = lines[0];
    const delimiter = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ',';

    const headers = this.parseCsvLine(headerLine, delimiter).map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, '_'));

    const items = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCsvLine(lines[i], delimiter);
        if (values.length === 0 || values.every((v) => !v.trim())) continue;

        const row = {};
        headers.forEach((h, idx) => {
          row[h] = (values[idx] !== undefined ? values[idx].trim() : '');
        });

        const normalized = this.normalizeProduct(row, options);
        if (!normalized.product_name) {
          errors.push(`Row ${i + 1}: Skipped due to missing product name.`);
          continue;
        }

        items.push(normalized);
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return {
      source: 'supplier_csv',
      totalParsed: items.length,
      errors,
      products: items
    };
  }

  normalizeProduct(row, options = {}) {
    const extId = row.external_product_id || row.product_id || row.sku || row.item_code || `SUP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const title = row.product_name || row.title || row.name || '';
    const brand = row.brand || row.manufacturer || options.supplierName || 'Artisan Supplier';
    const desc = row.description || row.details || row.product_description || title;

    const sellingPrice = Number(row.selling_price || row.price || row.wholesale_price || 0);
    const origPrice = Number(row.original_price || row.mrp || row.retail_price || sellingPrice);

    // Multi-image parsing (split by comma, semicolon, or pipe)
    const rawImages = row.image_urls || row.images || row.image_url || row.image || '';
    let imgUrls = [];
    if (rawImages) {
      imgUrls = rawImages.split(/[,|;]/).map((u) => u.trim()).filter((u) => u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/uploads/'));
    }

    // Also check explicit front/back/model columns
    if (row.front_image_url && !imgUrls.includes(row.front_image_url)) imgUrls.push(row.front_image_url);
    if (row.model_image_url && !imgUrls.includes(row.model_image_url)) imgUrls.push(row.model_image_url);
    if (row.back_image_url && !imgUrls.includes(row.back_image_url)) imgUrls.push(row.back_image_url);

    const catMapping = this.mapCategory(row.category || row.category_name || '', title, row.garment_type || '');

    // Permission rights confirmed by supplier contract / checkbox
    const permission = row.image_usage_permission || options.defaultPermission || (options.supplierId ? 'confirmed' : 'needs_review');

    return {
      external_product_id: extId,
      source: 'supplier_csv',
      supplier_id: options.supplierId || null,
      supplier_name: brand,
      source_product_url: row.source_product_url || row.url || null,
      affiliate_url: null,
      brand,
      product_name: title,
      description: desc,
      selling_price: sellingPrice,
      original_price: origPrice,
      currency: row.currency || options.defaultCurrency || 'INR',
      category: catMapping.categorySlug,
      category_id: catMapping.categoryId,
      subcategory: row.subcategory || catMapping.categorySlug,
      gender: row.gender ? row.gender.toLowerCase() : (title.toLowerCase().includes('men') ? 'men' : 'women'),
      garment_type: row.garment_type || catMapping.garmentType,
      colour: row.colour || row.color || null,
      fabric: row.fabric || row.material || null,
      image_urls: imgUrls,
      image_usage_permission: permission,
      stock_status: (row.stock_status || 'in_stock').toLowerCase()
    };
  }

  /**
   * Safe CSV line splitter supporting quoted strings
   */
  parseCsvLine(text, delimiter = ',') {
    const result = [];
    let cur = '';
    let inQuote = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuote && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === delimiter && !inQuote) {
        result.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  }
}
