import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

/**
 * GET /api/categories
 * Retrieve all categories directly from PostgreSQL
 */
router.get('/categories', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, slug, description, image_url AS "imageUrl" FROM categories ORDER BY id ASC'
    );
    return res.json({
      success: true,
      source: 'postgresql',
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('[Products Route] Failed to fetch categories from PostgreSQL:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Database query failed: ' + err.message
    });
  }
});

/**
 * GET /api/products
 * Retrieve all active products directly from PostgreSQL with optional filtering
 */
router.get('/products', async (req, res) => {
  const { category, subcategory, gender, garmentType, tryonCompatibility, stockStatus, search, featured, brand } = req.query;

  try {
    let sql = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.slug,
        p.brand,
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
        p.is_sample AS "isSample",
        p.is_featured AS "isFeatured",
        p.is_active AS "isActive",
        c.name AS "categoryName",
        c.slug AS "categorySlug"
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;

    const sqlParams = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      sql += ` AND (c.slug = $${paramIndex} OR LOWER(c.name) = LOWER($${paramIndex}))`;
      sqlParams.push(category);
      paramIndex++;
    }

    if (subcategory && subcategory !== 'all') {
      sql += ` AND LOWER(p.subcategory) = LOWER($${paramIndex})`;
      sqlParams.push(subcategory);
      paramIndex++;
    }

    if (gender && gender !== 'all') {
      sql += ` AND (LOWER(p.gender) = LOWER($${paramIndex}) OR LOWER(p.gender) = 'unisex')`;
      sqlParams.push(gender);
      paramIndex++;
    }

    if (garmentType && garmentType !== 'all') {
      sql += ` AND LOWER(p.garment_type) = LOWER($${paramIndex})`;
      sqlParams.push(garmentType);
      paramIndex++;
    }

    if (tryonCompatibility && tryonCompatibility !== 'all') {
      sql += ` AND LOWER(p.tryon_compatibility) = LOWER($${paramIndex})`;
      sqlParams.push(tryonCompatibility);
      paramIndex++;
    }

    if (stockStatus && stockStatus !== 'all') {
      sql += ` AND LOWER(p.stock_status) = LOWER($${paramIndex})`;
      sqlParams.push(stockStatus);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex} OR p.subcategory ILIKE $${paramIndex})`;
      sqlParams.push(`%${search}%`);
      paramIndex++;
    }

    if (brand) {
      sql += ` AND LOWER(p.brand) = LOWER($${paramIndex})`;
      sqlParams.push(brand);
      paramIndex++;
    }

    if (featured === 'true') {
      sql += ` AND p.is_featured = true`;
    }

    sql += ` ORDER BY p.is_featured DESC, p.id DESC`;

    const result = await query(sql, sqlParams);

    // Ensure sizes is parsed if stored as JSON string
    const sanitizedRows = result.rows.map((row) => {
      let sizes = row.sizes;
      if (typeof sizes === 'string') {
        try {
          sizes = JSON.parse(sizes);
        } catch (e) {
          sizes = ['XS', 'S', 'M', 'L', 'XL'];
        }
      }
      return {
        ...row,
        sizes,
        images: [row.primaryImage].filter(Boolean)
      };
    });

    return res.json({
      success: true,
      source: 'postgresql',
      count: sanitizedRows.length,
      data: sanitizedRows
    });
  } catch (err) {
    console.error('[Products Route] Failed to fetch products from PostgreSQL:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Database query failed: ' + err.message
    });
  }
});

/**
 * GET /api/products/:id
 * Retrieve single product details by ID or slug directly from PostgreSQL
 */
router.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const isNumeric = /^\d+$/.test(id);

  try {
    const sql = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.slug,
        p.brand,
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
        p.is_sample AS "isSample",
        p.is_featured AS "isFeatured",
        p.is_active AS "isActive",
        c.name AS "categoryName",
        c.slug AS "categorySlug"
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${isNumeric ? 'p.id = $1' : 'p.slug = $1'}
      LIMIT 1
    `;

    const result = await query(sql, [isNumeric ? parseInt(id, 10) : id]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found in database.',
        requestedId: id
      });
    }

    const product = result.rows[0];

    // Fetch associated product images
    const imagesResult = await query(
      `SELECT image_url AS "imageUrl", alt_text AS "altText", is_primary AS "isPrimary"
       FROM product_images
       WHERE product_id = $1
       ORDER BY sort_order ASC`,
      [product.id]
    );

    const imageList = imagesResult.rows.map((r) => r.imageUrl);
    product.images = imageList.length > 0 ? imageList : [product.primaryImage].filter(Boolean);

    if (typeof product.sizes === 'string') {
      try {
        product.sizes = JSON.parse(product.sizes);
      } catch (e) {
        product.sizes = ['XS', 'S', 'M', 'L', 'XL'];
      }
    }

    return res.json({
      success: true,
      source: 'postgresql',
      data: product
    });
  } catch (err) {
    console.error('[Products Route] Failed to fetch product details from PostgreSQL:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Database query failed: ' + err.message
    });
  }
});

export default router;
