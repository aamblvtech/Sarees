import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { query } from '../config/db.js';
import imageValidationService from './imageValidationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsBase = path.join(__dirname, '..', '..', 'uploads');

// Helper to generate URL slug
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export const myntraImportService = {
  /**
   * Parse CSV string into an array of object rows.
   * Handles commas inside quotes, CRLF/LF line endings, and trimmed fields.
   */
  parseCsv(csvText) {
    if (!csvText || typeof csvText !== 'string') {
      return [];
    }

    const lines = [];
    let currentLine = [];
    let currentField = '';
    let inQuotes = false;

    // Normalize newlines
    const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' && !inQuotes) {
        currentLine.push(currentField.trim());
        if (currentLine.some((f) => f.length > 0)) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentLine.length > 0) {
      currentLine.push(currentField.trim());
      if (currentLine.some((f) => f.length > 0)) {
        lines.push(currentLine);
      }
    }

    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, '_'));
    const rows = [];

    for (let r = 1; r < lines.length; r++) {
      const rawCols = lines[r];
      const rowObj = {};
      headers.forEach((header, idx) => {
        rowObj[header] = rawCols[idx] !== undefined ? rawCols[idx].trim() : '';
      });
      rows.push({
        _rowIndex: r + 1,
        _raw: rowObj
      });
    }

    return rows;
  },

  /**
   * Normalize flexible column names for the 12 required Myntra fields
   */
  normalizeRow(raw) {
    const getVal = (...keys) => {
      for (const k of keys) {
        if (raw[k] !== undefined && raw[k] !== '') {
          return raw[k];
        }
      }
      return '';
    };

    return {
      brand: getVal('brand', 'brand_name'),
      productName: getVal('product_name', 'product_title', 'name', 'title'),
      myntraUrl: getVal('myntra_product_url', 'myntra_url', 'product_url', 'url'),
      sellingPrice: getVal('selling_price', 'price', 'discounted_price'),
      originalPrice: getVal('original_price', 'mrp', 'regular_price'),
      category: getVal('category', 'category_name'),
      subcategory: getVal('subcategory', 'sub_category'),
      gender: getVal('gender', 'target_audience'),
      colour: getVal('colour', 'color'),
      fabric: getVal('fabric', 'material'),
      imageFilename: getVal('image_filename', 'image_file', 'filename', 'image'),
      permissionStatus: getVal('image_usage_permission_status', 'permission_status', 'permission', 'usage_permission')
    };
  },

  /**
   * Validate a single normalized row against business rules, database duplicates, and disk images
   */
  async validateSingleRow(normalized, rowIndex, existingUrlsSet) {
    const errors = [];
    const warnings = [];

    // 1. Mandatory Fields
    if (!normalized.brand) errors.push('Brand is required.');
    if (!normalized.productName) errors.push('Product name is required.');
    if (!normalized.sellingPrice) errors.push('Selling price is required.');
    if (!normalized.category) errors.push('Category is required.');

    // 2. Numerical Prices
    const sellingPrice = parseFloat(normalized.sellingPrice);
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      errors.push(`Selling price must be a valid positive number (got "${normalized.sellingPrice}").`);
    }

    let originalPrice = null;
    if (normalized.originalPrice) {
      originalPrice = parseFloat(normalized.originalPrice);
      if (isNaN(originalPrice) || originalPrice < 0) {
        errors.push(`Original price must be a valid number (got "${normalized.originalPrice}").`);
      } else if (originalPrice < sellingPrice) {
        warnings.push(`Original price (${originalPrice}) is lower than selling price (${sellingPrice}).`);
      }
    }

    // 3. Myntra URL & Duplicate Prevention
    let isDuplicate = false;
    const cleanUrl = normalized.myntraUrl ? normalized.myntraUrl.split('?')[0].trim() : '';

    if (cleanUrl) {
      if (!/^https?:\/\//i.test(cleanUrl)) {
        errors.push('Myntra product URL must be a valid HTTP/HTTPS link.');
      } else {
        if (existingUrlsSet.has(cleanUrl)) {
          isDuplicate = true;
          errors.push(`Duplicate URL: Product reference already exists in database or CSV (${cleanUrl}).`);
        }
      }
    } else {
      warnings.push('No Myntra product URL provided. Product will have no external reference link.');
    }

    // 4. Image Validation on Disk
    let imageMetadata = null;
    let resolvedImagePath = null;
    let imageFileExists = false;

    if (normalized.imageFilename) {
      const candidatePaths = [
        path.join(uploadsBase, normalized.imageFilename),
        path.join(uploadsBase, 'catalogue_sarees', normalized.imageFilename),
        path.join(uploadsBase, 'custom_garments', normalized.imageFilename)
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          resolvedImagePath = p;
          imageFileExists = true;
          break;
        }
      }

      if (!imageFileExists) {
        warnings.push(`Image file "${normalized.imageFilename}" not found in uploads directory.`);
      } else {
        try {
          const buf = fs.readFileSync(resolvedImagePath);
          const techValidation = imageValidationService.validateTechnicalDimensions(buf);
          const visualQuality = imageValidationService.assessVisualQuality(buf);

          imageMetadata = {
            width: techValidation.width,
            height: techValidation.height,
            format: techValidation.format,
            sizeKb: visualQuality.sizeKb,
            isAiReady: techValidation.valid,
            isHighRes: visualQuality.isPreferredResolution,
            clarity: visualQuality.clarity,
            qualityScore: visualQuality.qualityScore,
            aspectRatio: visualQuality.aspectRatioLabel
          };

          if (!techValidation.valid) {
            warnings.push(`Image dimensions (${techValidation.width}x${techValidation.height}px) are below 250x250px minimum required for try-on.`);
          }
        } catch (e) {
          warnings.push(`Failed to parse image file: ${e.message}`);
        }
      }
    }

    // 5. Permission Status Validation
    const permStatusRaw = (normalized.permissionStatus || '').toLowerCase().trim();
    let permissionStatus = 'pending_review';
    let isPermissionAuthorized = false;

    if (/unauthori[zs]ed|no_permission|infringing/i.test(permStatusRaw)) {
      permissionStatus = 'unauthorized';
      errors.push('Image usage permission is marked as UNAUTHORIZED. Cannot import without usage rights.');
    } else if (/\bauthori[zs]ed\b|direct_partner|brand_partner|official/i.test(permStatusRaw)) {
      permissionStatus = 'authorized';
      isPermissionAuthorized = true;
    } else if (/commercial_license|licensed|license|shutterstock|getty/i.test(permStatusRaw)) {
      permissionStatus = 'commercial_license';
      isPermissionAuthorized = true;
    } else {
      permissionStatus = 'pending_review';
      warnings.push('Image usage permission is pending review. Requires documented authorization before approval.');
    }

    // 6. Multi-Stage Initial Approval Status
    // Status hierarchy: DRAFT, NEEDS_IMAGE, NEEDS_PERMISSION_REVIEW, NEEDS_ADMIN_REVIEW, APPROVED, AI_READY
    let initialApprovalStatus = 'DRAFT';
    if (!imageFileExists || !imageMetadata || !imageMetadata.isAiReady) {
      initialApprovalStatus = 'NEEDS_IMAGE';
    } else if (!isPermissionAuthorized) {
      initialApprovalStatus = 'NEEDS_PERMISSION_REVIEW';
    } else {
      initialApprovalStatus = 'NEEDS_ADMIN_REVIEW';
    }

    const isValid = errors.length === 0;

    return {
      rowIndex,
      isValid,
      isDuplicate,
      errors,
      warnings,
      normalized: {
        ...normalized,
        sellingPrice,
        originalPrice,
        myntraUrl: cleanUrl,
        permissionStatus,
        initialApprovalStatus,
        imageMetadata,
        resolvedImageFilename: imageFileExists ? path.basename(resolvedImagePath) : null
      }
    };
  },

  /**
   * Preview a CSV file without committing to PostgreSQL
   */
  async previewCsv(csvText) {
    const rawRows = this.parseCsv(csvText);
    if (rawRows.length === 0) {
      return {
        success: false,
        error: 'The CSV file is empty or missing headers.',
        totalRows: 0,
        validCount: 0,
        invalidCount: 0,
        duplicateCount: 0,
        rows: []
      };
    }

    // Load existing URLs from DB for duplicate detection
    const existingDbUrls = await query(
      'SELECT myntra_url FROM products WHERE myntra_url IS NOT NULL'
    );
    const existingUrlsSet = new Set(
      existingDbUrls.rows.map((r) => r.myntra_url.split('?')[0].trim()).filter(Boolean)
    );

    const validatedRows = [];
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    for (const row of rawRows) {
      const normalized = this.normalizeRow(row._raw);
      const valResult = await this.validateSingleRow(normalized, row._rowIndex, existingUrlsSet);

      if (valResult.isDuplicate) {
        duplicateCount++;
      }

      if (valResult.isValid) {
        validCount++;
        // Also add valid URL to the in-memory set to prevent duplicate URLs within the same CSV
        if (valResult.normalized.myntraUrl) {
          existingUrlsSet.add(valResult.normalized.myntraUrl);
        }
      } else {
        invalidCount++;
      }

      validatedRows.push(valResult);
    }

    return {
      success: true,
      totalRows: rawRows.length,
      validCount,
      invalidCount,
      duplicateCount,
      rows: validatedRows
    };
  },

  /**
   * Commit pre-validated rows into PostgreSQL
   */
  async commitImport(validatedRows, adminUser = 'admin') {
    const validRowsToImport = validatedRows.filter((r) => r.isValid);
    if (validRowsToImport.length === 0) {
      return {
        success: false,
        error: 'No valid rows available to import.',
        importedCount: 0,
        importedProducts: []
      };
    }

    const batchId = `myntra_batch_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const importedProducts = [];

    // Map categories
    const catResult = await query('SELECT id, slug, name FROM categories');
    const catMap = new Map();
    for (const c of catResult.rows) {
      catMap.set(c.slug.toLowerCase(), c.id);
      catMap.set(c.name.toLowerCase(), c.id);
    }

    for (const item of validRowsToImport) {
      const p = item.normalized;
      const slugBase = slugify(`${p.brand}-${p.productName}`);
      const uniqueSlug = `${slugBase}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`;
      const sku = `MYN-${p.brand.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 10)}`;

      // Resolve category ID
      const catKey = (p.category || 'sarees').toLowerCase();
      let categoryId = catMap.get(catKey) || 1; // default to 1 (sarees)

      const garmentType = (p.subcategory || '').toLowerCase().includes('saree') || catKey.includes('saree')
        ? 'saree'
        : 'full_body';

      const primaryImageUrl = p.resolvedImageFilename ? `/uploads/${p.resolvedImageFilename}` : null;
      const width = p.imageMetadata?.width || null;
      const height = p.imageMetadata?.height || null;
      const isAiReady = Boolean(width && height && width >= 250 && height >= 250);

      const tryonCompatibility = isAiReady ? 'supported' : 'needs_image_replacement';

      const insertResult = await query(
        `INSERT INTO products (
           sku, name, slug, brand, category_id, subcategory, gender, garment_type,
           tryon_compatibility, stock_status, price, original_price, currency,
           description, material, fit, care_instructions, sizes,
           primary_image_url, tryon_image_url, is_sample, is_featured, is_active,
           color, needs_admin_review, discount_percent, image_width, image_height,
           myntra_url, approval_status, permission_status, permission_notes,
           import_source, import_batch_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)
         RETURNING id, sku, name, brand, price, primary_image_url, approval_status, tryon_compatibility, myntra_url`,
        [
          sku,
          p.productName.trim(),
          uniqueSlug,
          p.brand.trim(),
          categoryId,
          p.subcategory ? p.subcategory.trim().toLowerCase() : 'sarees',
          p.gender ? p.gender.trim().toLowerCase() : 'women',
          garmentType,
          tryonCompatibility,
          'in_stock',
          p.sellingPrice,
          p.originalPrice || null,
          'INR',
          `Authorised luxury fashion reference: ${p.productName} by ${p.brand}. Imported from Myntra reference catalogue.`,
          p.fabric || 'Luxury Weave',
          'Tailored fit',
          'Specialist dry clean only',
          JSON.stringify(['XS', 'S', 'M', 'L', 'XL']),
          primaryImageUrl,
          primaryImageUrl,
          false,
          false,
          false, // Keep imported products inactive/draft until admin approval
          p.colour || 'Multicolour',
          true,
          p.originalPrice && p.originalPrice > p.sellingPrice
            ? Math.round(((p.originalPrice - p.sellingPrice) / p.originalPrice) * 100)
            : null,
          width,
          height,
          p.myntraUrl || null,
          p.initialApprovalStatus,
          p.permissionStatus,
          `Batch import by ${adminUser} at ${new Date().toISOString()}`,
          'myntra_csv',
          batchId
        ]
      );

      importedProducts.push(insertResult.rows[0]);
    }

    return {
      success: true,
      batchId,
      importedCount: importedProducts.length,
      importedProducts
    };
  },

  /**
   * Create a single Myntra reference product manually
   */
  async createSingleReferenceProduct(productData, adminUser = 'admin') {
    const {
      brand,
      productTitle,
      myntraUrl,
      sellingPrice,
      originalPrice,
      categoryId,
      subcategory,
      gender,
      garmentType,
      colour,
      fabric,
      primaryImageUrl,
      frontImageUrl,
      backImageUrl,
      sideImageUrl,
      modelImageUrl,
      permissionStatus = 'authorized',
      permissionNotes = ''
    } = productData;

    // 1. Mandatory Fields
    if (!brand || !productTitle || !sellingPrice) {
      throw new Error('Brand, product title, and selling price are required.');
    }

    const price = parseFloat(sellingPrice);
    if (isNaN(price) || price <= 0) {
      throw new Error('Selling price must be a valid positive number.');
    }

    // 2. Prevent Duplicate Myntra URL
    const cleanUrl = myntraUrl ? myntraUrl.split('?')[0].trim() : null;
    if (cleanUrl) {
      const existing = await query('SELECT id, name FROM products WHERE myntra_url = $1 LIMIT 1', [cleanUrl]);
      if (existing.rows && existing.rows.length > 0) {
        const err = new Error(`A product with this Myntra URL already exists in VESTRA (Product #${existing.rows[0].id}: "${existing.rows[0].name}").`);
        err.statusCode = 409;
        throw err;
      }
    }

    // 3. Inspect image resolution and quality
    let width = null;
    let height = null;
    let isAiReady = false;

    const mainImage = primaryImageUrl || frontImageUrl;
    if (mainImage) {
      const meta = imageValidationService.getGarmentMetadata(mainImage);
      width = meta.width;
      height = meta.height;
      isAiReady = meta.isAiReady;
    }

    // 4. Initial Approval Status
    let initialApprovalStatus = 'DRAFT';
    if (!mainImage || !isAiReady) {
      initialApprovalStatus = 'NEEDS_IMAGE';
    } else if (permissionStatus !== 'authorized' && permissionStatus !== 'commercial_license') {
      initialApprovalStatus = 'NEEDS_PERMISSION_REVIEW';
    } else {
      initialApprovalStatus = 'NEEDS_ADMIN_REVIEW';
    }

    const slugBase = slugify(`${brand}-${productTitle}`);
    const uniqueSlug = `${slugBase}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`;
    const sku = `MYN-${brand.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 10)}`;

    const insertResult = await query(
      `INSERT INTO products (
         sku, name, slug, brand, category_id, subcategory, gender, garment_type,
         tryon_compatibility, stock_status, price, original_price, currency,
         description, material, fit, care_instructions, sizes,
         primary_image_url, tryon_image_url, is_sample, is_featured, is_active,
         color, needs_admin_review, discount_percent, image_width, image_height,
         myntra_url, approval_status, permission_status, permission_notes,
         front_image_url, back_image_url, side_image_url, model_image_url,
         import_source, import_batch_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38)
       RETURNING *`,
      [
        sku,
        productTitle.trim(),
        uniqueSlug,
        brand.trim(),
        categoryId ? parseInt(categoryId, 10) : 1,
        subcategory ? subcategory.trim().toLowerCase() : 'sarees',
        gender ? gender.trim().toLowerCase() : 'women',
        garmentType ? garmentType.trim().toLowerCase() : 'saree',
        isAiReady ? 'supported' : 'needs_image_replacement',
        'in_stock',
        price,
        originalPrice ? parseFloat(originalPrice) : null,
        'INR',
        `Authorised luxury fashion reference: ${productTitle} by ${brand}. Referenced from Myntra catalogue.`,
        fabric ? fabric.trim() : 'Luxury Silk Weave',
        'Tailored architectural drape',
        'Specialist dry clean only',
        JSON.stringify(['XS', 'S', 'M', 'L', 'XL']),
        mainImage || null,
        mainImage || null,
        false,
        false,
        false, // Keep as draft (not active) until approved
        colour ? colour.trim() : 'Multicolour',
        true,
        originalPrice && parseFloat(originalPrice) > price
          ? Math.round(((parseFloat(originalPrice) - price) / parseFloat(originalPrice)) * 100)
          : null,
        width,
        height,
        cleanUrl,
        initialApprovalStatus,
        permissionStatus,
        permissionNotes || `Manual import by ${adminUser}`,
        frontImageUrl || mainImage || null,
        backImageUrl || null,
        sideImageUrl || null,
        modelImageUrl || null,
        'myntra_manual',
        `manual_${Date.now()}`
      ]
    );

    return insertResult.rows[0];
  },

  /**
   * Update product approval status with strict AI Ready gate rules
   */
  async updateApprovalStatus(productId, newStatus, adminNotes = '') {
    const validStatuses = [
      'DRAFT',
      'NEEDS_IMAGE',
      'NEEDS_PERMISSION_REVIEW',
      'NEEDS_ADMIN_REVIEW',
      'APPROVED',
      'AI_READY'
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status "${newStatus}". Must be one of: ${validStatuses.join(', ')}`);
    }

    const prodResult = await query('SELECT * FROM products WHERE id = $1', [productId]);
    if (!prodResult.rows || prodResult.rows.length === 0) {
      const err = new Error(`Product #${productId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    const product = prodResult.rows[0];

    // Gate rules for AI_READY
    if (newStatus === 'AI_READY') {
      // 1. Must have valid image
      const imagePath = product.primary_image_url || product.tryon_image_url;
      if (!imagePath) {
        throw new Error('Cannot set status to AI_READY: Product has no primary image.');
      }

      const meta = imageValidationService.getGarmentMetadata(imagePath);
      if (!meta.isAiReady) {
        throw new Error(
          `Cannot set status to AI_READY: Garment image dimensions (${meta.width || 0}x${meta.height || 0}px) are below the 250x250px minimum required for try-on.`
        );
      }

      // 2. Must have documented permission
      const perm = (product.permission_status || product.image_usage_permission || '').toLowerCase();
      const validPermissions = ['authorized', 'commercial_license', 'brand_partner', 'supplier_granted', 'confirmed', 'full_commercial_rights'];
      if (!validPermissions.includes(perm)) {
        throw new Error(
          `Cannot set status to AI_READY: Documented usage permission is required (current: "${product.permission_status || product.image_usage_permission}"). Must be authorized or commercially licensed.`
        );
      }
    }

    // Determine tryon_compatibility, image_status and is_active based on status
    let tryonCompatibility = product.tryon_compatibility;
    let isActive = product.is_active;
    let imageStatus = product.image_status || 'IMAGE_VALID';

    if (newStatus === 'AI_READY') {
      tryonCompatibility = 'supported';
      isActive = true;
      imageStatus = 'IMAGE_VALID';
    } else if (newStatus === 'APPROVED') {
      isActive = true;
      const meta = imageValidationService.getGarmentMetadata(product.primary_image_url);
      tryonCompatibility = meta.isAiReady ? 'supported' : 'needs_image_replacement';
      imageStatus = meta.isAiReady ? 'IMAGE_VALID' : 'IMAGE_LOW_RESOLUTION';
    } else if (newStatus === 'NEEDS_IMAGE') {
      isActive = false;
      tryonCompatibility = 'needs_image_replacement';
      imageStatus = 'IMAGE_LOW_RESOLUTION';
    } else if (newStatus === 'NEEDS_PERMISSION_REVIEW') {
      isActive = false;
      imageStatus = 'NEEDS_PERMISSION_REVIEW';
    } else {
      // DRAFT, NEEDS_ADMIN_REVIEW
      isActive = false;
      tryonCompatibility = 'needs_image_replacement';
    }

    const updated = await query(
      `UPDATE products
       SET approval_status = $1,
           tryon_compatibility = $2,
           is_active = $3,
           needs_admin_review = $4,
           image_status = $5,
           permission_notes = COALESCE($6, permission_notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        newStatus,
        tryonCompatibility,
        isActive,
        newStatus === 'NEEDS_ADMIN_REVIEW' || newStatus === 'NEEDS_PERMISSION_REVIEW',
        imageStatus,
        adminNotes ? `${product.permission_notes ? product.permission_notes + ' | ' : ''}${adminNotes}` : null,
        productId
      ]
    );

    return updated.rows[0];
  }
};

export default myntraImportService;
