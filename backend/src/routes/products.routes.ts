import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/errorHandler.js';
import { DEMO_PRODUCTS } from '../db/seed.js';

const router = Router();

const createProductSchema = z.object({
  sku: z.string().min(3).toUpperCase(),
  name: z.string().min(3),
  description: z.string().optional(),
  price: z.number().positive(),
  fabric: z.string().min(2),
  color: z.string().min(2),
  occasion: z.string().min(2),
  borderType: z.string().optional(),
  palluDetails: z.string().optional(),
  blousePiece: z.boolean().default(true),
  blouseDetails: z.string().optional(),
  stockQuantity: z.number().int().min(0).default(1),
  primaryImageUrl: z.string().url().optional(),
});

// GET /api/products (Public Catalog with Filters)
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search,
      fabric,
      occasion,
      color,
      minPrice,
      maxPrice,
      sort = 'featured',
      page = '1',
      limit = '12',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(p.name ILIKE $${paramIdx} OR p.sku ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx} OR p.fabric ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (fabric && fabric !== 'all') {
      conditions.push(`p.fabric ILIKE $${paramIdx}`);
      params.push(`%${fabric}%`);
      paramIdx++;
    }

    if (occasion && occasion !== 'all') {
      conditions.push(`p.occasion ILIKE $${paramIdx}`);
      params.push(`%${occasion}%`);
      paramIdx++;
    }

    if (color && color !== 'all') {
      conditions.push(`p.color ILIKE $${paramIdx}`);
      params.push(`%${color}%`);
      paramIdx++;
    }

    if (minPrice) {
      conditions.push(`p.price >= $${paramIdx}`);
      params.push(parseFloat(minPrice));
      paramIdx++;
    }

    if (maxPrice) {
      conditions.push(`p.price <= $${paramIdx}`);
      params.push(parseFloat(maxPrice));
      paramIdx++;
    }

    let orderBy = 'p.created_at DESC';
    if (sort === 'price-asc') orderBy = 'p.price ASC';
    if (sort === 'price-desc') orderBy = 'p.price DESC';
    if (sort === 'name-asc') orderBy = 'p.name ASC';

    const whereClause = conditions.join(' AND ');

    // Query products
    const productsQuery = `
      SELECT
        p.id, p.sku, p.name, p.description, p.price, p.fabric, p.color,
        p.occasion, p.border_type as "borderType", p.pallu_details as "palluDetails",
        p.blouse_piece as "blousePiece", p.blouse_details as "blouseDetails",
        p.stock_quantity as "stockQuantity", p.status, p.created_at as "createdAt",
        COALESCE(
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1),
          'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85'
        ) as "primaryImage"
      FROM saree_products p
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM saree_products p
      WHERE ${whereClause}
    `;

    const [productsResult, countResult] = await Promise.all([
      query(productsQuery, params),
      query(countQuery, params),
    ]);

    let products = productsResult.rows;
    let total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Fallback to seed demo list if database table returns empty in local preview mode
    if (products.length === 0 && !search && (!fabric || fabric === 'all') && (!occasion || occasion === 'all')) {
      products = DEMO_PRODUCTS;
      total = DEMO_PRODUCTS.length;
    }

    return res.json({
      success: true,
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/products/sku/:sku (Instant Barcode Scanner Lookup)
router.get('/sku/:sku', async (req: Request, res: Response) => {
  try {
    const skuParam = req.params.sku.trim().toUpperCase();

    const sql = `
      SELECT
        p.id, p.sku, p.name, p.description, p.price, p.fabric, p.color,
        p.occasion, p.border_type as "borderType", p.pallu_details as "palluDetails",
        p.blouse_piece as "blousePiece", p.blouse_details as "blouseDetails",
        p.stock_quantity as "stockQuantity", p.status,
        COALESCE(
          (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1),
          'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85'
        ) as "primaryImage"
      FROM saree_products p
      WHERE p.sku = $1
      LIMIT 1
    `;

    const result = await query(sql, [skuParam]);
    let product = result.rows[0];

    if (!product) {
      // Check in DEMO_PRODUCTS
      product = DEMO_PRODUCTS.find(p => p.sku.toUpperCase() === skuParam);
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: `No saree found matching SKU '${skuParam}'. Please verify barcode or enter manually.`,
      });
    }

    return res.json({ success: true, data: product });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/products/:id (Full Product Details + Images + Annotations)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;

    const productQuery = `
      SELECT
        p.id, p.sku, p.name, p.description, p.price, p.fabric, p.color,
        p.occasion, p.border_type as "borderType", p.pallu_details as "palluDetails",
        p.blouse_piece as "blousePiece", p.blouse_details as "blouseDetails",
        p.stock_quantity as "stockQuantity", p.status, p.created_at as "createdAt"
      FROM saree_products p
      WHERE p.id = $1
    `;

    const imagesQuery = `
      SELECT id, image_url as "imageUrl", image_type as "imageType", is_primary as "isPrimary"
      FROM product_images
      WHERE product_id = $1
    `;

    const annotationQuery = `
      SELECT
        id, body_bbox as "bodyBbox", pallu_bbox as "palluBbox",
        main_border_bbox as "mainBorderBbox", secondary_border_bbox as "secondaryBorderBbox",
        motifs_bbox as "motifsBbox", blouse_piece_bbox as "blousePieceBbox",
        detection_method as "detectionMethod", is_verified as "isVerified", notes
      FROM saree_component_annotations
      WHERE product_id = $1
      LIMIT 1
    `;

    const [prodRes, imgRes, annotRes] = await Promise.all([
      query(productQuery, [productId]),
      query(imagesQuery, [productId]),
      query(annotationQuery, [productId]),
    ]);

    let product = prodRes.rows[0];
    let images = imgRes.rows;
    let annotations = annotRes.rows[0] || null;

    if (!product) {
      // Check demo fallback
      const demo = DEMO_PRODUCTS.find(p => p.id === productId);
      if (demo) {
        product = demo;
        images = [{ imageUrl: demo.primaryImage, imageType: 'folded', isPrimary: true }];
        annotations = demo.annotations || null;
      }
    }

    if (!product) {
      return res.status(404).json({ success: false, error: 'Saree product not found.' });
    }

    // Related products (same fabric or occasion)
    const related = DEMO_PRODUCTS.filter(p => p.id !== product.id).slice(0, 3);

    return res.json({
      success: true,
      data: {
        ...product,
        images,
        annotations,
        related,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/products (Staff / Admin creates a new saree item)
router.post('/', authenticate, requireRole('staff', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createProductSchema.parse(req.body);

    const existing = await query('SELECT id FROM saree_products WHERE sku = $1', [data.sku]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: `Product with SKU '${data.sku}' already exists.` });
    }

    const result = await withTransaction(async ({ query }) => {
      const prodRes = await query(
        `INSERT INTO saree_products (sku, name, description, price, fabric, color, occasion, border_type, pallu_details, blouse_piece, blouse_details, stock_quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, sku, name, price, fabric, color, occasion, stock_quantity as "stockQuantity"`,
        [
          data.sku,
          data.name,
          data.description || null,
          data.price,
          data.fabric,
          data.color,
          data.occasion,
          data.borderType || null,
          data.palluDetails || null,
          data.blousePiece,
          data.blouseDetails || null,
          data.stockQuantity,
        ]
      );

      const newProduct = prodRes.rows[0];

      if (data.primaryImageUrl) {
        await query(
          `INSERT INTO product_images (product_id, image_url, image_type, is_primary)
           VALUES ($1, $2, 'folded', true)`,
          [newProduct.id, data.primaryImageUrl]
        );
      }

      return newProduct;
    });

    await logAudit(req, 'CREATE_PRODUCT', 'saree_product', result.id, { sku: data.sku, name: data.name });

    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map(e => e.message).join(', ') });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/products/:id/annotate (Save Component Labeling for folded saree)
router.post('/:id/annotate', authenticate, requireRole('staff', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = req.params.id;
    const {
      bodyBbox,
      palluBbox,
      mainBorderBbox,
      secondaryBorderBbox,
      motifsBbox,
      blousePieceBbox,
      detectionMethod = 'manual',
      notes,
    } = req.body;

    const result = await query(
      `INSERT INTO saree_component_annotations
        (product_id, body_bbox, pallu_bbox, main_border_bbox, secondary_border_bbox, motifs_bbox, blouse_piece_bbox, detection_method, is_verified, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
       RETURNING id, product_id, is_verified, detection_method`,
      [
        productId,
        JSON.stringify(bodyBbox || null),
        JSON.stringify(palluBbox || null),
        JSON.stringify(mainBorderBbox || null),
        JSON.stringify(secondaryBorderBbox || null),
        JSON.stringify(motifsBbox || null),
        JSON.stringify(blousePieceBbox || null),
        detectionMethod,
        notes || null,
      ]
    );

    await logAudit(req, 'SAVE_COMPONENT_ANNOTATIONS', 'saree_component_annotations', result.rows[0]?.id, { productId });

    return res.json({
      success: true,
      message: 'Saree component labels saved and verified successfully.',
      data: result.rows[0],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
