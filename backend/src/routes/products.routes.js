import express from 'express';
import { query } from '../config/db.js';
import imageValidationService from '../services/imageValidationService.js';

const router = express.Router();

/**
 * Official fashion catalogue category taxonomy with semantic mappings
 */
const FASHION_CATEGORIES = [
  { id: 0, slug: 'all', name: 'All Garments', key: 'all', description: 'Complete luxury fashion archive calibrated for virtual try-on' },
  { id: 1, slug: 'sarees', name: 'Sarees', key: 'sarees', description: 'Curated heritage sarees and handloom weaves' },
  { id: 5, slug: 'shirts', name: 'Shirts & Tops', key: 'shirts', description: 'Tailored shirts, silk blouses, and luxury tops' },
  { id: 6, slug: 'jeans', name: 'Jeans & Denim', key: 'jeans', description: 'Selvedge denim, wide-leg, and contemporary jeans' },
  { id: 21, slug: 'dresses', name: 'Dresses & Gowns', key: 'dresses', description: 'Evening gowns, maxi dresses, and cocktail wear' },
  { id: 22, slug: 'kurtis', name: 'Kurtis & Ethnic Wear', key: 'kurtis', description: 'Hand-embroidered kurtis and ethnic ensembles' },
  { id: 23, slug: 'salwar', name: 'Salwar Suits', key: 'salwar', description: 'Anarkalis, salwar kameez, and churidar sets' },
  { id: 31, slug: 'mens-traditional', name: "Men's Traditional Wear", key: 'mensTraditional', description: 'Sherwanis, kurta pyjamas, and Indo-Western attire' },
  { id: 8, slug: 'blazers', name: 'Blazers & Jackets', key: 'blazers', description: 'Italian wool blazers, tuxedos, and tailored jackets' },
  { id: 7, slug: 'trousers', name: 'Trousers', key: 'trousers', description: 'Pleated trousers, tailored pants, and chinos' }
];

/**
 * GET /api/categories
 * Retrieve all 10 fashion categories with dynamic product counts from PostgreSQL
 */
router.get('/categories', async (req, res) => {
  try {
    const countSql = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN category_id = 1 OR garment_type = 'saree' OR subcategory ILIKE '%saree%' THEN 1 END)::int AS sarees,
        COUNT(CASE WHEN category_id = 5 OR subcategory ILIKE '%shirt%' OR subcategory ILIKE '%blouse%' OR name ILIKE '%shirt%' OR name ILIKE '%blouse%' THEN 1 END)::int AS shirts,
        COUNT(CASE WHEN category_id = 6 OR subcategory ILIKE '%jean%' OR subcategory ILIKE '%denim%' THEN 1 END)::int AS jeans,
        COUNT(CASE WHEN subcategory IN ('gowns', 'maxi_dresses', 'evening_dresses', 'party_wear_dresses', 'casual_dresses') OR garment_type = 'dress' OR subcategory ILIKE '%dress%' OR subcategory ILIKE '%gown%' OR name ILIKE '%gown%' OR name ILIKE '%dress%' THEN 1 END)::int AS dresses,
        COUNT(CASE WHEN subcategory IN ('kurti_pant_sets') OR subcategory ILIKE '%kurti%' OR name ILIKE '%kurti%' THEN 1 END)::int AS kurtis,
        COUNT(CASE WHEN subcategory IN ('anarkali_suits', 'salwar_kameez', 'churidar_sets', 'lehenga_choli') OR subcategory ILIKE '%salwar%' OR subcategory ILIKE '%anarkali%' OR subcategory ILIKE '%churidar%' OR subcategory ILIKE '%lehenga%' THEN 1 END)::int AS salwar,
        COUNT(CASE WHEN subcategory IN ('sherwani_outfits', 'kurta_pyjama_sets', 'indo_western', 'traditional_outfits') OR name ILIKE '%sherwani%' OR name ILIKE '%kurta%' OR name ILIKE '%bandhgala%' THEN 1 END)::int AS "mensTraditional",
        COUNT(CASE WHEN category_id = 8 OR subcategory IN ('formal_suits', 'blazer_trouser_sets', 'tuxedos', 'three_piece_suits', 'smoking_jackets', 'dinner_jackets', 'power_suits', 'womens_tuxedos', 'western_coord_sets') OR name ILIKE '%blazer%' OR name ILIKE '%suit%' OR name ILIKE '%tuxedo%' OR name ILIKE '%jacket%' THEN 1 END)::int AS blazers,
        COUNT(CASE WHEN category_id = 7 OR subcategory IN ('pleated_trousers', 'baggy_chinos', 'palazzo_pants', 'cargo_pants', 'balloon_trousers', 'shirt_trouser_combinations') OR name ILIKE '%trouser%' OR name ILIKE '%pant%' OR name ILIKE '%chino%' THEN 1 END)::int AS trousers
      FROM products
      WHERE is_active = true AND COALESCE(approval_status, 'APPROVED') IN ('APPROVED', 'AI_READY')
    `;

    const countRes = await query(countSql);
    const counts = countRes.rows[0] || {};

    const enrichedCategories = FASHION_CATEGORIES.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      productCount: cat.key === 'all' ? (counts.total || 0) : (counts[cat.key] || 0)
    }));

    return res.json({
      success: true,
      source: 'postgresql',
      count: enrichedCategories.length,
      data: enrichedCategories
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
  const {
    category, subcategory, gender, garmentType, tryonCompatibility,
    stockStatus, search, featured, brand, source, minPrice, maxPrice, aiReady, sort
  } = req.query;

  try {
    const whereClauses = [
      'p.is_active = true',
      "COALESCE(p.approval_status, 'APPROVED') IN ('APPROVED', 'AI_READY')"
    ];
    const sqlParams = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      const catKey = category.toLowerCase().trim();
      if (catKey === 'sarees') {
        whereClauses.push("(p.category_id = 1 OR p.garment_type = 'saree' OR p.subcategory ILIKE '%saree%')");
      } else if (catKey === 'shirts' || catKey === 'shirts & tops' || catKey === 'shirts-and-tops') {
        whereClauses.push("(p.category_id = 5 OR p.subcategory ILIKE '%shirt%' OR p.subcategory ILIKE '%blouse%' OR p.name ILIKE '%shirt%' OR p.name ILIKE '%blouse%')");
      } else if (catKey === 'jeans' || catKey === 'jeans & denim' || catKey === 'jeans-and-denim') {
        whereClauses.push("(p.category_id = 6 OR p.subcategory ILIKE '%jean%' OR p.subcategory ILIKE '%denim%')");
      } else if (catKey === 'dresses' || catKey === 'dresses & gowns' || catKey === 'dresses-and-gowns') {
        whereClauses.push("(p.subcategory IN ('gowns', 'maxi_dresses', 'evening_dresses', 'party_wear_dresses', 'casual_dresses') OR p.garment_type = 'dress' OR p.subcategory ILIKE '%dress%' OR p.subcategory ILIKE '%gown%' OR p.name ILIKE '%gown%' OR p.name ILIKE '%dress%')");
      } else if (catKey === 'kurtis' || catKey === 'kurtis & ethnic wear' || catKey === 'kurtis-and-ethnic-wear') {
        whereClauses.push("(p.subcategory IN ('kurti_pant_sets') OR p.subcategory ILIKE '%kurti%' OR p.name ILIKE '%kurti%')");
      } else if (catKey === 'salwar' || catKey === 'salwar suits' || catKey === 'salwar-suits') {
        whereClauses.push("(p.subcategory IN ('anarkali_suits', 'salwar_kameez', 'churidar_sets', 'lehenga_choli') OR p.subcategory ILIKE '%salwar%' OR p.subcategory ILIKE '%anarkali%' OR p.subcategory ILIKE '%churidar%' OR p.subcategory ILIKE '%lehenga%')");
      } else if (catKey === 'mens-traditional' || catKey === "men's traditional wear" || catKey === 'mens-traditional-wear') {
        whereClauses.push("(p.subcategory IN ('sherwani_outfits', 'kurta_pyjama_sets', 'indo_western', 'traditional_outfits') OR p.name ILIKE '%sherwani%' OR p.name ILIKE '%kurta%' OR p.name ILIKE '%bandhgala%')");
      } else if (catKey === 'blazers' || catKey === 'blazers & jackets' || catKey === 'blazers-and-jackets') {
        whereClauses.push("(p.category_id = 8 OR p.subcategory IN ('formal_suits', 'blazer_trouser_sets', 'tuxedos', 'three_piece_suits', 'smoking_jackets', 'dinner_jackets', 'power_suits', 'womens_tuxedos', 'western_coord_sets') OR p.name ILIKE '%blazer%' OR p.name ILIKE '%suit%' OR p.name ILIKE '%tuxedo%' OR p.name ILIKE '%jacket%')");
      } else if (catKey === 'trousers' || catKey === 'pants') {
        whereClauses.push("(p.category_id = 7 OR p.subcategory IN ('pleated_trousers', 'baggy_chinos', 'palazzo_pants', 'cargo_pants', 'balloon_trousers', 'shirt_trouser_combinations') OR p.name ILIKE '%trouser%' OR p.name ILIKE '%pant%' OR p.name ILIKE '%chino%')");
      } else {
        whereClauses.push(`(p.subcategory = $${paramIndex} OR p.garment_type = $${paramIndex})`);
        sqlParams.push(catKey);
        paramIndex++;
      }
    }

    if (subcategory && subcategory !== 'all') {
      whereClauses.push(`LOWER(p.subcategory) = LOWER($${paramIndex})`);
      sqlParams.push(subcategory);
      paramIndex++;
    }

    if (gender && gender !== 'all') {
      whereClauses.push(`(LOWER(p.gender) = LOWER($${paramIndex}) OR LOWER(p.gender) = 'unisex')`);
      sqlParams.push(gender);
      paramIndex++;
    }

    if (garmentType && garmentType !== 'all') {
      whereClauses.push(`LOWER(p.garment_type) = LOWER($${paramIndex})`);
      sqlParams.push(garmentType);
      paramIndex++;
    }

    if (tryonCompatibility && tryonCompatibility !== 'all') {
      whereClauses.push(`LOWER(p.tryon_compatibility) = LOWER($${paramIndex})`);
      sqlParams.push(tryonCompatibility);
      paramIndex++;
    }

    if (stockStatus && stockStatus !== 'all') {
      whereClauses.push(`LOWER(p.stock_status) = LOWER($${paramIndex})`);
      sqlParams.push(stockStatus);
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex} OR p.subcategory ILIKE $${paramIndex})`);
      sqlParams.push(`%${search}%`);
      paramIndex++;
    }

    if (brand && brand !== 'all') {
      whereClauses.push(`LOWER(p.brand) = LOWER($${paramIndex})`);
      sqlParams.push(brand);
      paramIndex++;
    }

    if (source && source !== 'all') {
      whereClauses.push(`LOWER(p.source) = LOWER($${paramIndex})`);
      sqlParams.push(source);
      paramIndex++;
    }

    if (minPrice && !isNaN(Number(minPrice))) {
      whereClauses.push(`p.price >= $${paramIndex}`);
      sqlParams.push(Number(minPrice));
      paramIndex++;
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      whereClauses.push(`p.price <= $${paramIndex}`);
      sqlParams.push(Number(maxPrice));
      paramIndex++;
    }

    if (aiReady === 'true') {
      whereClauses.push(`(p.tryon_compatibility = 'supported' OR p.approval_status = 'AI_READY')`);
    }

    if (featured === 'true') {
      whereClauses.push(`p.is_featured = true`);
    }

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
        p.color,
        p.needs_admin_review AS "needsAdminReview",
        p.discount_percent AS "discountPercent",
        p.image_width AS "imageWidth",
        p.image_height AS "imageHeight",
        p.approval_status AS "approvalStatus",
        p.myntra_url AS "myntraUrl",
        p.source AS "source",
        p.source_url AS "sourceUrl",
        p.affiliate_url AS "affiliateUrl",
        p.external_product_id AS "externalProductId",
        p.supplier_id AS "supplierId",
        sa.company_name AS "supplierName",
        c.name AS "categoryName",
        c.slug AS "categorySlug"
      FROM (
        SELECT * FROM products p
        WHERE ${whereClauses.join(' AND ')}
      ) p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN supplier_accounts sa ON p.supplier_id = sa.id
    `;

    const result = await query(sql, sqlParams);

    // Ensure sizes is parsed if stored as JSON string and enrich with image metadata
    const sanitizedRows = result.rows.map((row) => {
      let sizes = row.sizes;
      if (typeof sizes === 'string') {
        try {
          sizes = JSON.parse(sizes);
        } catch (e) {
          sizes = ['XS', 'S', 'M', 'L', 'XL'];
        }
      }

      const imgMeta = imageValidationService.getGarmentMetadata(row.primaryImage);
      const width = row.imageWidth || imgMeta.width || (row.primaryImage?.startsWith('http') ? 1200 : null);
      const height = row.imageHeight || imgMeta.height || (row.primaryImage?.startsWith('http') ? 1600 : null);
      const isTooSmall = (width && height && (width < 250 || height < 250)) || row.tryonCompatibility === 'needs_image_replacement';
      const isAiReady = !isTooSmall && row.tryonCompatibility === 'supported';
      const dimensionLabel = width && height ? `${width} × ${height} px` : (imgMeta.dimensionLabel || 'Standard');
      const qualityStatus = isTooSmall ? 'too_small' : (width >= 1024 && height >= 1024 ? 'high_resolution' : 'standard');

      return {
        ...row,
        sizes,
        imageWidth: width,
        imageHeight: height,
        dimensionLabel,
        qualityStatus,
        isAiReady,
        images: [row.primaryImage].filter(Boolean)
      };
    });

    // Flexible multi-engine sorting
    if (sort === 'price-low') {
      sanitizedRows.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === 'price-high') {
      sanitizedRows.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === 'name') {
      sanitizedRows.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'newest') {
      sanitizedRows.sort((a, b) => b.id - a.id);
    } else {
      // featured / default
      sanitizedRows.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || b.id - a.id);
    }

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
        p.color,
        p.needs_admin_review AS "needsAdminReview",
        p.discount_percent AS "discountPercent",
        p.image_width AS "imageWidth",
        p.image_height AS "imageHeight",
        p.approval_status AS "approvalStatus",
        p.myntra_url AS "myntraUrl",
        p.supplier_id AS "supplierId",
        sa.company_name AS "supplierName",
        c.name AS "categoryName",
        c.slug AS "categorySlug"
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN supplier_accounts sa ON p.supplier_id = sa.id
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

    const imgMeta = imageValidationService.getGarmentMetadata(product.primaryImage);
    const width = product.imageWidth || imgMeta.width || (product.primaryImage?.startsWith('http') ? 1200 : null);
    const height = product.imageHeight || imgMeta.height || (product.primaryImage?.startsWith('http') ? 1600 : null);
    const isTooSmall = (width && height && (width < 250 || height < 250)) || product.tryonCompatibility === 'needs_image_replacement';
    product.imageWidth = width;
    product.imageHeight = height;
    product.dimensionLabel = width && height ? `${width} × ${height} px` : (imgMeta.dimensionLabel || 'Standard');
    product.qualityStatus = isTooSmall ? 'too_small' : (width >= 1024 && height >= 1024 ? 'high_resolution' : 'standard');
    product.isAiReady = !isTooSmall && product.tryonCompatibility === 'supported';

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
