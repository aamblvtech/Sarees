import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { requireAdminAuth } from '../middleware/auth.middleware.js';
import imageValidationService from '../services/imageValidationService.js';
import myntraImportService from '../services/myntraImportService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vestra_luxury_jwt_secret_atelier_key_2026';

// Upload configuration for product images
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const unique = `prod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|csv|text\/csv/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WebP, and CSV files are supported.'));
    }
  }
});

/**
 * Helper to slugify string
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/**
 * POST /api/admin/login
 * Authenticates admin via bcrypt password verification and returns JWT
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide both email and password.'
    });
  }

  try {
    // 1. Fetch admin record from PostgreSQL using parameterized query
    const result = await query(
      'SELECT id, email, password_hash, name, role FROM admins WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email.trim()]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please verify your email and password.'
      });
    }

    const admin = result.rows[0];

    // 2. Compare bcrypt password hash
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please verify your email and password.'
      });
    }

    // 3. Update last login timestamp in PostgreSQL
    await query(
      'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );

    // 4. Sign JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        name: admin.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Admin authentication successful.',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('[Admin Login Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed due to a database error.'
    });
  }
});

/**
 * GET /api/admin/me
 * Protected: Retrieves profile of authenticated admin
 */
router.get('/me', requireAdminAuth, (req, res) => {
  res.json({
    success: true,
    admin: req.admin
  });
});

/**
 * GET /api/admin/stats
 * Protected: Overview metrics for the Admin Dashboard
 */
router.get('/stats', requireAdminAuth, async (req, res) => {
  try {
    const totalProdResult = await query('SELECT COUNT(*) as count FROM products');
    const activeProdResult = await query('SELECT COUNT(*) as count FROM products WHERE is_active = true');
    const totalCatsResult = await query('SELECT COUNT(*) as count FROM categories');
    const tryonReadyResult = await query('SELECT COUNT(*) as count FROM products WHERE tryon_image_url IS NOT NULL AND is_active = true');

    res.json({
      success: true,
      data: {
        totalProducts: parseInt(totalProdResult.rows[0]?.count || 0, 10),
        activeProducts: parseInt(activeProdResult.rows[0]?.count || 0, 10),
        totalCategories: parseInt(totalCatsResult.rows[0]?.count || 0, 10),
        tryonReadyProducts: parseInt(tryonReadyResult.rows[0]?.count || 0, 10)
      }
    });
  } catch (err) {
    console.error('[Admin Stats Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/products
 * Protected: Retrieve all products (including inactive) with category info
 */
router.get('/products', requireAdminAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.slug,
        p.brand,
        p.category_id AS "categoryId",
        c.name AS "categoryName",
        p.subcategory,
        p.gender,
        p.garment_type AS "garmentType",
        p.tryon_compatibility AS "tryonCompatibility",
        p.stock_status AS "stockStatus",
        p.price,
        p.original_price AS "originalPrice",
        p.currency,
        p.description,
        p.material,
        p.fit,
        p.care_instructions AS "careInstructions",
        p.sizes,
        p.primary_image_url AS "primaryImage",
        p.tryon_image_url AS "tryonImage",
        p.is_featured AS "isFeatured",
        p.is_active AS "isActive",
        p.color,
        p.needs_admin_review AS "needsAdminReview",
        p.discount_percent AS "discountPercent",
        p.image_width AS "imageWidth",
        p.image_height AS "imageHeight",
        p.myntra_url AS "myntraUrl",
        p.approval_status AS "approvalStatus",
        p.permission_status AS "permissionStatus",
        p.permission_notes AS "permissionNotes",
        p.front_image_url AS "frontImageUrl",
        p.back_image_url AS "backImageUrl",
        p.side_image_url AS "sideImageUrl",
        p.image_status AS "imageStatus",
        p.model_image_url AS "modelImageUrl",
        p.import_source AS "importSource",
        p.import_batch_id AS "importBatchId",
        p.source AS "source",
        p.external_product_id AS "externalProductId",
        p.source_url AS "sourceUrl",
        p.affiliate_url AS "affiliateUrl",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt"
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);

    const enriched = result.rows.map((p) => {
      const width = p.imageWidth;
      const height = p.imageHeight;
      const imageStatus = p.imageStatus || (width && height && width >= 250 && height >= 250 ? 'IMAGE_VALID' : 'IMAGE_LOW_RESOLUTION');
      const isAiReady = Boolean(
        imageStatus === 'IMAGE_VALID' &&
        width && height && width >= 250 && height >= 250 &&
        (p.permissionStatus === 'authorized' || p.permissionStatus === 'commercial_license' || p.permissionStatus === 'brand_partner' || !p.permissionStatus)
      );
      let qualityStatus = 'standard';
      if (!isAiReady || (width && width < 250) || (height && height < 250)) {
        qualityStatus = 'too_small';
      } else if (width >= 1024 && height >= 1024) {
        qualityStatus = 'high_resolution';
      }

      return {
        ...p,
        imageStatus,
        isAiReady,
        qualityStatus,
        dimensionLabel: width && height ? `${width} × ${height} px` : 'Unresolved'
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    console.error('[Admin Get Products Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/products
 * Protected: Create a new garment in PostgreSQL
 */
router.post('/products', requireAdminAuth, async (req, res) => {
  const {
    name,
    description,
    price,
    originalPrice,
    categoryId,
    subcategory = 'sarees',
    gender = 'women',
    garmentType = 'upper_body',
    tryonCompatibility = 'supported',
    stockStatus = 'in_stock',
    brand = 'VESTRA',
    sizes = ['XS', 'S', 'M', 'L', 'XL'],
    material = 'Luxury Fabric Blend',
    fit = 'Tailored fit',
    careInstructions = 'Specialist dry clean only',
    primaryImageUrl,
    tryonImageUrl,
    isFeatured = false,
    isActive = true
  } = req.body;

  if (!name || !price || !description) {
    return res.status(400).json({
      success: false,
      error: 'Product name, price, and description are required.'
    });
  }

  try {
    const slugBase = slugify(name);
    const uniqueSlug = `${slugBase}-${Date.now().toString().slice(-4)}`;
    const sku = `VES-${brand.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`;

    const insertResult = await query(
      `INSERT INTO products (
         sku, name, slug, brand, category_id, subcategory, gender, garment_type,
         tryon_compatibility, stock_status, price, original_price, currency,
         description, material, fit, care_instructions, sizes,
         primary_image_url, tryon_image_url, is_featured, is_active, is_sample
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
       RETURNING *`,
      [
        sku,
        name.trim(),
        uniqueSlug,
        brand.trim(),
        categoryId ? parseInt(categoryId, 10) : null,
        subcategory ? subcategory.trim().toLowerCase() : 'sarees',
        gender ? gender.trim().toLowerCase() : 'women',
        garmentType ? garmentType.trim().toLowerCase() : 'upper_body',
        tryonCompatibility ? tryonCompatibility.trim().toLowerCase() : 'supported',
        stockStatus ? stockStatus.trim().toLowerCase() : 'in_stock',
        parseFloat(price),
        originalPrice ? parseFloat(originalPrice) : null,
        'USD',
        description.trim(),
        material.trim(),
        fit.trim(),
        careInstructions.trim(),
        JSON.stringify(sizes),
        primaryImageUrl || null,
        tryonImageUrl || primaryImageUrl || null,
        isFeatured === true || isFeatured === 'true',
        isActive === true || isActive === 'true',
        false
      ]
    );

    const newProduct = insertResult.rows[0];

    // Also insert into product_images if primary image was provided
    if (primaryImageUrl) {
      await query(
        `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [newProduct.id, primaryImageUrl, `${name} Main View`, true, 0]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully in PostgreSQL.',
      data: newProduct
    });
  } catch (err) {
    console.error('[Admin Create Product Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/products/:id
 * Protected: Update an existing garment in PostgreSQL
 */
router.put('/products/:id', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    originalPrice,
    categoryId,
    subcategory,
    gender,
    garmentType,
    tryonCompatibility,
    stockStatus,
    brand,
    sizes,
    material,
    fit,
    careInstructions,
    primaryImageUrl,
    tryonImageUrl,
    isFeatured,
    isActive
  } = req.body;

  try {
    // 1. Check if product exists
    const checkResult = await query('SELECT id FROM products WHERE id = $1', [parseInt(id, 10)]);
    if (!checkResult.rows || checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    // 2. Perform parameterized update
    const updateResult = await query(
      `UPDATE products
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           original_price = $4,
           category_id = $5,
           subcategory = COALESCE($6, subcategory),
           gender = COALESCE($7, gender),
           garment_type = COALESCE($8, garment_type),
           tryon_compatibility = COALESCE($9, tryon_compatibility),
           stock_status = COALESCE($10, stock_status),
           brand = COALESCE($11, brand),
           sizes = COALESCE($12, sizes),
           material = COALESCE($13, material),
           fit = COALESCE($14, fit),
           care_instructions = COALESCE($15, care_instructions),
           primary_image_url = COALESCE($16, primary_image_url),
           tryon_image_url = COALESCE($17, tryon_image_url),
           is_featured = COALESCE($18, is_featured),
           is_active = COALESCE($19, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $20
       RETURNING *`,
      [
        name ? name.trim() : null,
        description ? description.trim() : null,
        price ? parseFloat(price) : null,
        originalPrice ? parseFloat(originalPrice) : null,
        categoryId ? parseInt(categoryId, 10) : null,
        subcategory ? subcategory.trim().toLowerCase() : null,
        gender ? gender.trim().toLowerCase() : null,
        garmentType ? garmentType.trim().toLowerCase() : null,
        tryonCompatibility ? tryonCompatibility.trim().toLowerCase() : null,
        stockStatus ? stockStatus.trim().toLowerCase() : null,
        brand ? brand.trim() : null,
        sizes ? JSON.stringify(sizes) : null,
        material ? material.trim() : null,
        fit ? fit.trim() : null,
        careInstructions ? careInstructions.trim() : null,
        primaryImageUrl || null,
        tryonImageUrl || null,
        isFeatured !== undefined ? (isFeatured === true || isFeatured === 'true') : null,
        isActive !== undefined ? (isActive === true || isActive === 'true') : null,
        parseInt(id, 10)
      ]
    );

    res.json({
      success: true,
      message: 'Product updated successfully in PostgreSQL.',
      data: updateResult.rows[0]
    });
  } catch (err) {
    console.error('[Admin Update Product Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/products/:id
 * Protected: Delete product from PostgreSQL
 */
router.delete('/products/:id', requireAdminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      'DELETE FROM products WHERE id = $1 RETURNING id, name',
      [parseInt(id, 10)]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    res.json({
      success: true,
      message: `Product '${result.rows[0].name}' deleted successfully from database.`,
      deletedId: result.rows[0].id
    });
  } catch (err) {
    console.error('[Admin Delete Product Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/upload
 * Protected: Upload product image or try-on garment image to server
 */
router.post('/upload', requireAdminAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No image file uploaded.'
    });
  }

  const filePath = path.join(uploadsDir, req.file.filename);
  let dims = null;
  try {
    const buf = fs.readFileSync(filePath);
    dims = imageValidationService.parseImageDimensions(buf);
  } catch (e) {
    // ignore
  }

  const width = dims?.width || null;
  const height = dims?.height || null;
  const isAiReady = width && height ? (width >= 250 && height >= 250) : false;
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.status(201).json({
    success: true,
    message: isAiReady
      ? 'Product image uploaded and verified (AI Ready).'
      : 'Product image uploaded (Notice: image dimensions are below 250x250px minimum required for try-on).',
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size,
    width,
    height,
    isAiReady,
    dimensionLabel: width && height ? `${width} × ${height} px` : 'Uploaded',
    qualityStatus: isAiReady ? (width >= 1024 && height >= 1024 ? 'high_resolution' : 'standard') : 'too_small'
  });
});

/**
 * POST /api/admin/products/:id/replace-image
 * Protected: Replace a product image with high-resolution image file or URL
 */
router.post('/products/:id/replace-image', requireAdminAuth, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const parsedId = parseInt(id, 10);

  if (isNaN(parsedId)) {
    return res.status(400).json({ success: false, error: 'Invalid product ID.' });
  }

  try {
    const existing = await query('SELECT * FROM products WHERE id = $1', [parsedId]);
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Product ID ${parsedId} not found.` });
    }

    let imageUrl = req.body.imageUrl;
    let width = null;
    let height = null;

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      const buf = fs.readFileSync(path.join(uploadsDir, req.file.filename));
      const dims = imageValidationService.parseImageDimensions(buf);
      width = dims?.width || null;
      height = dims?.height || null;
    } else if (imageUrl) {
      const meta = imageValidationService.getGarmentMetadata(imageUrl);
      width = meta.width;
      height = meta.height;
    } else {
      return res.status(400).json({ success: false, error: 'Either an image file or imageUrl must be provided.' });
    }

    const isAiReady = Boolean(width && height && width >= 250 && height >= 250);
    const imageStatus = isAiReady ? 'IMAGE_VALID' : 'IMAGE_LOW_RESOLUTION';
    const newCompatibility = isAiReady ? 'supported' : 'needs_image_replacement';
    const newApprovalStatus = isAiReady ? 'AI_READY' : 'NEEDS_IMAGE';

    await query(
      `UPDATE products
       SET primary_image_url = $1,
           tryon_image_url = $1,
           tryon_compatibility = $2,
           image_width = $3,
           image_height = $4,
           image_status = $5,
           approval_status = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [imageUrl, newCompatibility, width, height, imageStatus, newApprovalStatus, parsedId]
    );

    res.json({
      success: true,
      message: isAiReady
        ? `Product image updated successfully (${width}x${height}px). Product is now AI Ready.`
        : `Product image updated (${width}x${height}px). Note: Image is under 250x250px minimum, marked as needing image replacement.`,
      productId: parsedId,
      imageUrl,
      width,
      height,
      imageStatus,
      approvalStatus: newApprovalStatus,
      tryonCompatibility: newCompatibility,
      isAiReady,
      qualityStatus: isAiReady ? (width >= 1024 && height >= 1024 ? 'high_resolution' : 'standard') : 'too_small'
    });
  } catch (err) {
    console.error('[Replace Image Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/categories
 * Protected: List all categories
 */
router.get('/categories', requireAdminAuth, async (req, res) => {
  try {
    const result = await query('SELECT id, name, slug, description, image_url AS "imageUrl" FROM categories ORDER BY id ASC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/categories
 * Protected: Create new category in PostgreSQL
 */
router.post('/categories', requireAdminAuth, async (req, res) => {
  const { name, description, imageUrl } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Category name is required.' });
  }

  try {
    const slug = slugify(name);
    const result = await query(
      `INSERT INTO categories (name, slug, description, image_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url
       RETURNING id, name, slug, description, image_url AS "imageUrl"`,
      [name.trim(), slug, description || '', imageUrl || '']
    );

    res.status(201).json({
      success: true,
      message: 'Category saved successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/import/myntra/single
 * Protected: Manually import a single fashion garment referenced from Myntra
 */
router.post(
  '/import/myntra/single',
  requireAdminAuth,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
    { name: 'sideImage', maxCount: 1 },
    { name: 'modelImage', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const files = req.files || {};
      const primaryFile = files['image']?.[0] || files['frontImage']?.[0];
      const frontFile = files['frontImage']?.[0];
      const backFile = files['backImage']?.[0];
      const sideFile = files['sideImage']?.[0];
      const modelFile = files['modelImage']?.[0];

      const productData = {
        brand: req.body.brand,
        productTitle: req.body.productTitle || req.body.name,
        myntraUrl: req.body.myntraUrl,
        sellingPrice: req.body.sellingPrice || req.body.price,
        originalPrice: req.body.originalPrice,
        categoryId: req.body.categoryId,
        subcategory: req.body.subcategory,
        gender: req.body.gender,
        garmentType: req.body.garmentType,
        colour: req.body.colour || req.body.color,
        fabric: req.body.fabric || req.body.material,
        primaryImageUrl: primaryFile ? `/uploads/${primaryFile.filename}` : req.body.primaryImageUrl,
        frontImageUrl: frontFile ? `/uploads/${frontFile.filename}` : req.body.frontImageUrl,
        backImageUrl: backFile ? `/uploads/${backFile.filename}` : req.body.backImageUrl,
        sideImageUrl: sideFile ? `/uploads/${sideFile.filename}` : req.body.sideImageUrl,
        modelImageUrl: modelFile ? `/uploads/${modelFile.filename}` : req.body.modelImageUrl,
        permissionStatus: req.body.permissionStatus || 'authorized',
        permissionNotes: req.body.permissionNotes || ''
      };

      const newProduct = await myntraImportService.createSingleReferenceProduct(
        productData,
        req.admin?.name || 'admin'
      );

      return res.status(201).json({
        success: true,
        message: `Product "${newProduct.name}" saved as draft for review.`,
        data: newProduct
      });
    } catch (err) {
      console.error('[Admin Single Myntra Import Error]:', err.message);
      const status = err.statusCode || 400;
      return res.status(status).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/admin/import/myntra/csv-preview
 * Protected: Parse and validate CSV rows without committing to database
 */
router.post('/import/myntra/csv-preview', requireAdminAuth, upload.single('csvFile'), async (req, res) => {
  try {
    let csvText = req.body.csvText;
    if (req.file) {
      csvText = fs.readFileSync(path.join(uploadsDir, req.file.filename), 'utf8');
      try { fs.unlinkSync(path.join(uploadsDir, req.file.filename)); } catch {}
    }

    if (!csvText || typeof csvText !== 'string' || csvText.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'CSV file or csvText is required.' });
    }

    const previewResult = await myntraImportService.previewCsv(csvText);
    return res.json(previewResult);
  } catch (err) {
    console.error('[CSV Preview Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/import/myntra/csv-commit
 * Protected: Commit validated CSV rows into PostgreSQL
 */
router.post('/import/myntra/csv-commit', requireAdminAuth, async (req, res) => {
  try {
    const { validatedRows } = req.body;
    if (!validatedRows || !Array.isArray(validatedRows) || validatedRows.length === 0) {
      return res.status(400).json({ success: false, error: 'Validated rows array is required to commit import.' });
    }

    const commitResult = await myntraImportService.commitImport(validatedRows, req.admin?.name || 'admin');
    return res.json(commitResult);
  } catch (err) {
    console.error('[CSV Commit Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/products/:id/approval-status
 * Protected: Update product approval status (DRAFT, NEEDS_IMAGE, NEEDS_PERMISSION_REVIEW, NEEDS_ADMIN_REVIEW, APPROVED, AI_READY)
 */
router.put('/products/:id/approval-status', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: 'Approval status is required.' });
  }

  try {
    const updated = await myntraImportService.updateApprovalStatus(
      parseInt(id, 10),
      status.trim().toUpperCase(),
      notes || ''
    );

    return res.json({
      success: true,
      message: `Product #${id} status updated to ${status}.`,
      data: updated
    });
  } catch (err) {
    console.error('[Update Approval Status Error]:', err.message);
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/import/template
 * Protected: Download standard 12-column CSV template for Myntra bulk import
 */
router.get('/import/template', requireAdminAuth, (req, res) => {
  const csvHeaders = 'Brand,Product name,Myntra product URL,Selling price,Original price,Category,Subcategory,Gender,Colour,Fabric,Image filename,Image usage permission status\n';
  const sampleRow1 = 'Sangria,"Sangria Women Printed Pure Silk Saree","https://www.myntra.com/sarees/sangria/sangria-women-printed-pure-silk-saree/12345/buy",1320,1749,Sarees,Sarees,women,"Red & Gold","Pure Silk",saree_41_sangria_printed_silk_hires.jpg,authorized\n';
  const sampleRow2 = 'nevash fashion,"nevash fashion Art Silk Saree","https://www.myntra.com/sarees/nevash-fashion/nevash-art-silk-saree/12346/buy",1399,1849,Sarees,Sarees,women,Blue,"Art Silk",saree_42_nevash_art_silk_blue_hires.jpg,authorized\n';
  const sampleRow3 = 'Anouk Rustic,"Anouk Rustic Women Chanderi Cotton Saree","https://www.myntra.com/sarees/anouk-rustic/anouk-rustic-chanderi/12347/buy",981,3999,Sarees,Sarees,women,White,"Chanderi Cotton",saree_43_anouk_rustic_chanderi_hires.jpg,commercial_license\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="myntra_import_template.csv"');
  return res.send(csvHeaders + sampleRow1 + sampleRow2 + sampleRow3);
});

/**
 * DELETE /api/admin/products/all
 * Protected: Remove all products from catalogue with safety confirmation query ?confirm=true
 */
router.delete('/products/all', requireAdminAuth, async (req, res) => {
  const { confirm } = req.query;
  if (confirm !== 'true') {
    return res.status(400).json({
      success: false,
      error: 'Confirmation required. Pass query parameter ?confirm=true to delete all products.'
    });
  }

  try {
    const countRes = await query('SELECT count(*) FROM products');
    const totalCount = countRes.rows[0]?.count || 0;

    await query('DELETE FROM tryon_job_items');
    await query('DELETE FROM tryon_jobs');
    await query('DELETE FROM product_images');
    await query('DELETE FROM products');

    return res.json({
      success: true,
      message: `All ${totalCount} products removed from catalogue.`,
      deletedCount: parseInt(totalCount, 10)
    });
  } catch (err) {
    console.error('[Delete All Products Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/products/bulk
 * Protected: Delete multiple products by IDs array
 */
router.delete('/products/bulk', requireAdminAuth, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: 'Product IDs array is required.' });
  }

  try {
    const intIds = ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    if (intIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid numeric product IDs provided.' });
    }

    await query('DELETE FROM tryon_job_items WHERE product_id = ANY($1)', [intIds]);
    await query('DELETE FROM product_images WHERE product_id = ANY($1)', [intIds]);
    const delRes = await query('DELETE FROM products WHERE id = ANY($1) RETURNING id', [intIds]);

    return res.json({
      success: true,
      message: `${delRes.rows.length} products deleted successfully.`,
      deletedIds: delRes.rows.map((r) => r.id)
    });
  } catch (err) {
    console.error('[Bulk Delete Products Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/catalogue/reset-seed
 * Protected: Reseed catalogue with default luxury collection
 */
router.post('/catalogue/reset-seed', requireAdminAuth, async (req, res) => {
  try {
    const { runSeed } = await import('../db/seed.js');
    await runSeed();
    return res.json({
      success: true,
      message: 'Catalogue reset and reseeded with default luxury collection successfully.'
    });
  } catch (err) {
    console.error('[Reset Seed Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/suppliers
 * Protected: List all registered suppliers with profiles and product metrics
 */
router.get('/suppliers', requireAdminAuth, async (req, res) => {
  try {
    const suppliersRes = await query(
      `SELECT id, supplier_code, company_name, contact_person, email, phone, supplier_type, 
              city, country, default_currency, image_usage_terms_agreed, status, created_at, updated_at
       FROM supplier_accounts
       ORDER BY id DESC`
    );

    const profilesRes = await query(
      `SELECT supplier_account_id, brand_name, warehouse_address, contact_phone, tax_id, 
              business_registration_number, website_url
       FROM supplier_profiles`
    );
    const profileMap = {};
    (profilesRes.rows || []).forEach(p => {
      profileMap[p.supplier_account_id] = p;
    });

    const usersRes = await query(
      `SELECT id, supplier_account_id, email, full_name, role, status, last_login_at, created_at
       FROM supplier_users`
    );
    const userMap = {};
    (usersRes.rows || []).forEach(u => {
      if (!userMap[u.supplier_account_id]) userMap[u.supplier_account_id] = [];
      userMap[u.supplier_account_id].push(u);
    });

    // Aggregate product counts per supplier safely
    const countRes = await query(
      `SELECT supplier_id,
              COUNT(*) AS total_count,
              COUNT(CASE WHEN approval_status = 'APPROVED' THEN 1 END) AS approved_count,
              COUNT(CASE WHEN approval_status = 'PENDING' THEN 1 END) AS pending_count,
              COUNT(CASE WHEN approval_status = 'REJECTED' THEN 1 END) AS rejected_count,
              COUNT(CASE WHEN approval_status = 'NEEDS_IMAGE_REPLACEMENT' THEN 1 END) AS needs_image_count,
              COUNT(CASE WHEN is_ai_ready = TRUE THEN 1 END) AS ai_ready_count
       FROM products
       WHERE supplier_id IS NOT NULL
       GROUP BY supplier_id`
    );
    const countMap = {};
    (countRes.rows || []).forEach(c => {
      countMap[c.supplier_id] = {
        total: parseInt(c.total_count, 10) || 0,
        approved: parseInt(c.approved_count, 10) || 0,
        pending: parseInt(c.pending_count, 10) || 0,
        rejected: parseInt(c.rejected_count, 10) || 0,
        needs_image: parseInt(c.needs_image_count, 10) || 0,
        ai_ready: parseInt(c.ai_ready_count, 10) || 0
      };
    });

    const suppliers = (suppliersRes.rows || []).map(sa => {
      const counts = countMap[sa.id] || { total: 0, approved: 0, pending: 0, rejected: 0, needs_image: 0, ai_ready: 0 };
      const users = userMap[sa.id] || [];
      const profile = profileMap[sa.id] || {};
      return {
        ...sa,
        profile,
        users,
        productMetrics: counts
      };
    });

    return res.json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (err) {
    console.error('[Admin List Suppliers Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/suppliers/:id/status
 * Protected: Approve, reject, or suspend a supplier account and activate/deactivate their user logins
 */
router.put('/suppliers/:id/status', requireAdminAuth, async (req, res) => {
  const supplierId = parseInt(req.params.id, 10);
  const { status, reason } = req.body;

  const validStatuses = ['active', 'pending', 'rejected', 'suspended'];
  if (!status || !validStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  const normalizedStatus = status.toLowerCase();

  try {
    const accCheck = await query('SELECT * FROM supplier_accounts WHERE id = $1', [supplierId]);
    if (!accCheck.rows || accCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Supplier account not found.' });
    }

    // Update supplier_accounts
    const updatedAcc = await query(
      `UPDATE supplier_accounts
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [normalizedStatus, supplierId]
    );

    // Synchronize status in supplier_users
    await query(
      `UPDATE supplier_users
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE supplier_account_id = $2`,
      [normalizedStatus, supplierId]
    );

    // Log admin activity
    try {
      await query(
        `INSERT INTO supplier_activity_logs (supplier_account_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          supplierId,
          'ADMIN_STATUS_CHANGE',
          'supplier_account',
          String(supplierId),
          JSON.stringify({ new_status: normalizedStatus, admin: req.admin?.email || 'admin', reason: reason || '' })
        ]
      );
    } catch (logErr) {
      console.warn('[Admin Activity Log Warning]:', logErr.message);
    }

    return res.json({
      success: true,
      message: `Supplier "${updatedAcc.rows[0].company_name}" status set to ${normalizedStatus}.`,
      data: updatedAcc.rows[0]
    });
  } catch (err) {
    console.error('[Admin Update Supplier Status Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/suppliers/:id/products
 * Protected: Retrieve all products submitted by a specific supplier
 */
router.get('/suppliers/:id/products', requireAdminAuth, async (req, res) => {
  const supplierId = parseInt(req.params.id, 10);
  try {
    const supplierCheck = await query('SELECT id, company_name FROM supplier_accounts WHERE id = $1', [supplierId]);
    if (!supplierCheck.rows || supplierCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Supplier account not found.' });
    }

    const productsRes = await query(
      `SELECT p.id, p.name, p.brand, p.category, p.sub_category, p.gender, p.price, p.original_price,
              p.colour, p.fabric, p.stock_status, p.image_url, p.approval_status, p.is_active,
              p.is_ai_ready, p.image_usage_permission, p.created_at, p.updated_at,
              sps.submission_batch, sps.admin_feedback, sps.submitted_at
       FROM products p
       LEFT JOIN supplier_product_submissions sps ON sps.product_id = p.id
       WHERE p.supplier_id = $1
       ORDER BY p.id DESC`,
      [supplierId]
    );

    return res.json({
      success: true,
      supplier: supplierCheck.rows[0],
      count: productsRes.rows.length,
      data: productsRes.rows
    });
  } catch (err) {
    console.error('[Admin Supplier Products Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

