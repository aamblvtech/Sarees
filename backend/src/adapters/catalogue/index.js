import { FlipkartAdapter } from './flipkartAdapter.js';
import { MyntraAdapter } from './myntraAdapter.js';
import { AmazonAdapter } from './amazonAdapter.js';
import { SupplierCsvAdapter } from './supplierCsvAdapter.js';
import { ManualImportAdapter } from './manualImportAdapter.js';
import { query } from '../../config/db.js';
import imageValidationService from '../../services/imageValidationService.js';

export const catalogueAdapters = {
  flipkart: new FlipkartAdapter(),
  myntra: new MyntraAdapter(),
  amazon: new AmazonAdapter(),
  supplier_csv: new SupplierCsvAdapter(),
  manual: new ManualImportAdapter()
};

export function getCatalogueAdapter(slug) {
  const adapter = catalogueAdapters[slug];
  if (!adapter) {
    throw new Error(`Catalogue source adapter '${slug}' not found.`);
  }
  return adapter;
}

/**
 * Returns connection and sync status across all sources
 */
export async function getCatalogueSourcesOverview() {
  const dbSourcesRes = await query('SELECT * FROM catalogue_sources ORDER BY id');
  const dbSources = dbSourcesRes.rows;

  const overview = [];
  for (const src of dbSources) {
    const adapter = catalogueAdapters[src.slug];
    let liveStatus = { configured: false, status: src.status, message: src.last_sync_message || '' };

    if (adapter) {
      try {
        liveStatus = await adapter.getConnectionStatus();
      } catch (err) {
        liveStatus = { configured: false, status: 'error', message: err.message };
      }
    }

    // Get count of products in database associated with this source
    const countRes = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE approval_status = 'AI_READY' OR approval_status = 'APPROVED') as approved,
         COUNT(*) FILTER (WHERE approval_status = 'PENDING' OR needs_admin_review = TRUE) as awaiting_review,
         COUNT(*) FILTER (WHERE tryon_compatibility = 'needs_image_replacement' OR image_status = 'IMAGE_LOW_RESOLUTION') as rejected
       FROM products
       WHERE source = $1`,
      [src.slug]
    );

    const counts = countRes.rows[0] || {};

    overview.push({
      slug: src.slug,
      name: src.name,
      sourceType: src.source_type,
      authType: src.auth_type,
      isEnabled: src.is_enabled,
      status: liveStatus.status || src.status,
      configured: liveStatus.configured,
      message: liveStatus.message,
      capabilities: liveStatus.capabilities || [],
      requiresCredentials: liveStatus.requiresCredentials || [],
      productsImported: Number(counts.total || 0),
      productsApproved: Number(counts.approved || 0),
      productsAwaitingReview: Number(counts.awaiting_review || 0),
      productsRejected: Number(counts.rejected || 0),
      lastSyncAt: src.last_sync_at,
      lastSyncStatus: src.last_sync_status
    });
  }

  return overview;
}

/**
 * Ingest and validate a normalized product into PostgreSQL
 * Enforces:
 * - Duplicate prevention via (source, external_product_id)
 * - Minimum 250x250px image technical eligibility
 * - Never marks AI_READY automatically
 * - Retains original source image URLs and dual tracking
 */
export async function ingestNormalizedProduct(normalized, options = {}) {
  const {
    source,
    external_product_id,
    source_product_url,
    affiliate_url,
    brand,
    product_name,
    description,
    selling_price,
    original_price,
    currency,
    category_id,
    subcategory,
    gender,
    garment_type,
    colour,
    fabric,
    image_urls,
    image_usage_permission,
    stock_status,
    supplier_id
  } = normalized;

  if (!source || !external_product_id) {
    throw new Error('source and external_product_id are mandatory for catalogue mapping.');
  }

  const primaryImage = (image_urls && image_urls.length > 0) ? image_urls[0] : null;

  // 1. Initial Image Validation & Technical Gate
  let imageStatus = 'IMAGE_VALID';
  let qualityStatus = 'supported';
  let tryonCompat = 'supported';
  let dimW = null;
  let dimH = null;

  if (!primaryImage) {
    imageStatus = 'IMAGE_MISSING';
    qualityStatus = 'missing';
    tryonCompat = 'needs_image_replacement';
  } else if (primaryImage.startsWith('/uploads/') || primaryImage.startsWith('uploads/')) {
    // Local image verification
    const dims = imageValidationService.getImageDimensions(primaryImage);
    if (dims) {
      dimW = dims.width;
      dimH = dims.height;
      if (dimW < 250 || dimH < 250) {
        imageStatus = 'IMAGE_LOW_RESOLUTION';
        qualityStatus = 'too_small';
        tryonCompat = 'needs_image_replacement';
      }
    }
  }

  // 2. Strict AI Readiness Guardrail: Imported items MUST await admin review
  const initialApprovalStatus = (imageStatus === 'IMAGE_VALID' && image_usage_permission === 'confirmed')
    ? 'PENDING'
    : 'NEEDS_IMAGE';

  const sku = `EXT-${source.toUpperCase().slice(0, 4)}-${external_product_id.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
  const slug = `${brand}-${product_name}-${external_product_id}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 120);

  // 3. Check for existing mapping in external_product_mappings
  const existingMap = await query(
    'SELECT product_id FROM external_product_mappings WHERE source = $1 AND external_product_id = $2',
    [source, external_product_id]
  );

  let targetProductId = null;

  if (existingMap.rows.length > 0) {
    // Update existing product
    targetProductId = existingMap.rows[0].product_id;
    await query(
      `UPDATE products
       SET name = $1,
           brand = $2,
           price = $3,
           original_price = $4,
           description = $5,
           category_id = $6,
           subcategory = $7,
           garment_type = $8,
           gender = $9,
           color = $10,
           material = $11,
           primary_image_url = COALESCE($12, primary_image_url),
           stock_status = $13,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14`,
      [
        product_name, brand, selling_price, original_price, description,
        category_id, subcategory, garment_type, gender, colour, fabric,
        primaryImage, stock_status || 'in_stock', targetProductId
      ]
    );

    // Update mapping record
    await query(
      `UPDATE external_product_mappings
       SET source_product_url = $1,
           affiliate_url = $2,
           last_synced_at = CURRENT_TIMESTAMP
       WHERE source = $3 AND external_product_id = $4`,
      [source_product_url, affiliate_url, source, external_product_id]
    );
  } else {
    // Insert new product
    const insertRes = await query(
      `INSERT INTO products (
         sku, name, slug, brand, category_id, subcategory, gender, garment_type,
         tryon_compatibility, stock_status, price, original_price, currency,
         description, material, primary_image_url, color, needs_admin_review,
         approval_status, permission_status, image_status,
         image_width, image_height, source, external_product_id, supplier_id,
         source_url, affiliate_url, image_usage_permission, is_active
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8,
         $9, $10, $11, $12, $13,
         $14, $15, $16, $17, TRUE,
         $18, $19, $20,
         $21, $22, $23, $24, $25,
         $26, $27, $28, FALSE
       ) RETURNING id`,
      [
        sku, product_name, slug, brand, category_id, subcategory, gender, garment_type,
        tryonCompat, stock_status || 'in_stock', selling_price, original_price, currency || 'INR',
        description, fabric, primaryImage, colour,
        initialApprovalStatus, image_usage_permission || 'needs_review', imageStatus,
        dimW, dimH, source, external_product_id, supplier_id,
        source_product_url, affiliate_url, image_usage_permission || 'needs_review'
      ]
    );

    targetProductId = insertRes.rows[0].id;

    // Create mapping record
    await query(
      `INSERT INTO external_product_mappings (
         product_id, source, external_product_id, source_product_url, affiliate_url,
         source_sku, supplier_account_id, raw_payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (source, external_product_id) DO UPDATE
       SET last_synced_at = CURRENT_TIMESTAMP`,
      [
        targetProductId, source, external_product_id, source_product_url, affiliate_url,
        sku, supplier_id, JSON.stringify(normalized)
      ]
    );
  }

  // 4. Record multi-image assets
  if (Array.isArray(image_urls)) {
    for (let idx = 0; idx < image_urls.length; idx++) {
      const url = image_urls[idx];
      if (!url) continue;
      const isPrimary = idx === 0;
      await query(
        `INSERT INTO product_image_assets (
           product_id, image_url, image_type, is_primary, image_status, usage_permission
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          targetProductId,
          url,
          isPrimary ? 'primary' : 'gallery',
          isPrimary,
          imageStatus,
          image_usage_permission || 'needs_review'
        ]
      );
    }
  }

  return {
    productId: targetProductId,
    sku,
    name: product_name,
    source,
    externalProductId: external_product_id,
    imageStatus,
    approvalStatus: initialApprovalStatus,
    isAiReady: false
  };
}
