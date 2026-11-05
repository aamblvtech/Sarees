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
    const allowed = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are supported.'));
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
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt"
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
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
    isActive = true,
    color,
    needsAdminReview = false,
    discountPercent
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
         primary_image_url, tryon_image_url, is_featured, is_active, is_sample,
         color, needs_admin_review, discount_percent
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
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
        false,
        color ? color.trim() : null,
        needsAdminReview === true || needsAdminReview === 'true',
        discountPercent ? parseFloat(discountPercent) : null
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
    isActive,
    color,
    needsAdminReview,
    discountPercent
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
           color = COALESCE($20, color),
           needs_admin_review = COALESCE($21, needs_admin_review),
           discount_percent = COALESCE($22, discount_percent),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $23
       RETURNING *`,
      [
        name ? name.trim() : null,
        description ? description.trim() : null,
        price ? parseFloat(price) : null,
        originalPrice !== undefined ? (originalPrice ? parseFloat(originalPrice) : null) : null,
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
        color !== undefined ? (color ? color.trim() : null) : null,
        needsAdminReview !== undefined ? (needsAdminReview === true || needsAdminReview === 'true') : null,
        discountPercent !== undefined ? (discountPercent ? parseFloat(discountPercent) : null) : null,
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

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.status(201).json({
    success: true,
    message: 'Product image uploaded successfully.',
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size
  });
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

export default router;

