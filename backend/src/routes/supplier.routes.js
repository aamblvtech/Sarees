import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query } from '../config/db.js';
import { requireSupplierAuth } from '../middleware/supplierAuth.middleware.js';
import { authLimiter, uploadLimiter } from '../middleware/rateLimiter.middleware.js';
import imageValidationService from '../services/imageValidationService.js';
import { getCatalogueAdapter, ingestNormalizedProduct } from '../adapters/catalogue/index.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vestra_luxury_jwt_secret_atelier_key_2026';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const supplierUploadsDir = path.join(uploadsDir, 'custom_garments');
const supplierDocsDir = path.join(uploadsDir, 'supplier_docs');
[supplierUploadsDir, supplierDocsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer for garment images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, supplierUploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB Genlook provider maximum
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype.toLowerCase();
    if (allowed.test(ext) && (mime.includes('image/') || allowed.test(mime))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// Multer for CSV batch feeds
const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, supplierDocsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.csv';
    cb(null, `feed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const uploadCsv = multer({
  storage: csvStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Helper to log supplier activity
async function logSupplierActivity(supplierAccountId, supplierUserId, action, entityType, entityId, details, req) {
  try {
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || '127.0.0.1';
    await query(
      `INSERT INTO supplier_activity_logs (
         supplier_account_id, supplier_user_id, action, entity_type, entity_id, details, ip_address
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        supplierAccountId,
        supplierUserId || null,
        action,
        entityType || null,
        entityId ? String(entityId) : null,
        JSON.stringify(details || {}),
        ip
      ]
    );
  } catch (err) {
    console.warn('[Activity Log Warning]:', err.message);
  }
}

// ==============================================================================
// 1. SUPPLIER AUTHENTICATION
// ==============================================================================

/**
 * POST /api/supplier/register
 * Self-registration for new clothing manufacturers, wholesalers, and boutiques.
 * Account starts in 'pending' status requiring administrator approval.
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const {
      companyName,
      fullName,
      email,
      password,
      phone,
      city,
      country = 'India',
      supplierType = 'manufacturer',
      taxId,
      warehouseAddress,
      brandName,
      websiteUrl,
      imageUsageTermsAgreed
    } = req.body;

    if (!companyName || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: 'Company name, contact name, email, and password are required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.'
      });
    }

    if (!imageUsageTermsAgreed) {
      return res.status(400).json({
        success: false,
        error: 'You must agree to the image usage and try-on license terms.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user email already exists
    const existingUser = await query('SELECT id FROM supplier_users WHERE email = $1', [cleanEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address is already registered.'
      });
    }

    // Generate unique supplier code
    const codePrefix = companyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'VSTR';
    const supplierCode = `SUP-${codePrefix}-${Date.now().toString().slice(-4)}`;

    // 1. Create supplier_accounts record with pending status
    const accRes = await query(
      `INSERT INTO supplier_accounts (
         supplier_code, company_name, contact_person, email, phone,
         supplier_type, city, country, default_currency, image_usage_terms_agreed,
         status, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
       RETURNING id, supplier_code, company_name, status`,
      [
        supplierCode, companyName.trim(), fullName.trim(), cleanEmail, phone || '',
        supplierType, city || '', country, 'INR', true,
        `Self-registered via Supplier Portal on ${new Date().toISOString()}`
      ]
    );

    const supplierAccount = accRes.rows[0];

    // 2. Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create supplier_users record with pending status
    const userRes = await query(
      `INSERT INTO supplier_users (
         supplier_account_id, email, password_hash, full_name, role, status
       ) VALUES ($1, $2, $3, $4, 'supplier', 'pending')
       RETURNING id, email, full_name, role, status`,
      [supplierAccount.id, cleanEmail, passwordHash, fullName.trim()]
    );

    const user = userRes.rows[0];

    // 4. Create supplier_profiles record
    await query(
      `INSERT INTO supplier_profiles (
         supplier_account_id, tax_id, warehouse_address, contact_phone, brand_name, website_url
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        supplierAccount.id,
        taxId || '',
        warehouseAddress || '',
        phone || '',
        brandName || companyName.trim(),
        websiteUrl || ''
      ]
    );

    // Log activity
    await logSupplierActivity(
      supplierAccount.id,
      user.id,
      'REGISTER',
      'supplier_account',
      supplierAccount.id,
      { companyName, email: cleanEmail, supplierCode },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Supplier registration submitted successfully. Your account is pending administrator review and activation.',
      data: {
        supplierCode: supplierAccount.supplier_code,
        companyName: supplierAccount.company_name,
        email: user.email,
        status: 'pending'
      }
    });
  } catch (err) {
    console.error('[Supplier Register Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Registration failed' });
  }
});

/**
 * POST /api/supplier/login
 * Authenticates supplier user, enforces account activation check, issues JWT.
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user joined with supplier account
    const userRes = await query(
      `SELECT u.id, u.supplier_account_id, u.email, u.password_hash, u.full_name,
              u.role, u.status as user_status,
              s.supplier_code, s.company_name, s.status as account_status,
              s.default_currency, s.image_usage_terms_agreed
       FROM supplier_users u
       JOIN supplier_accounts s ON s.id = u.supplier_account_id
       WHERE u.email = $1
       LIMIT 1`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.'
      });
    }

    const user = userRes.rows[0];

    // Verify password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.'
      });
    }

    // Enforce account activation guardrail
    if (user.user_status !== 'active' || user.account_status !== 'active') {
      const isPending = user.user_status === 'pending' || user.account_status === 'pending';
      return res.status(403).json({
        success: false,
        status: isPending ? 'pending' : user.user_status,
        error: isPending
          ? 'Your supplier account is pending administrator approval. An onboarding email will be sent once reviewed.'
          : 'Your supplier account is not active. Please contact VESTRA partner support.'
      });
    }

    // Update last login
    await query('UPDATE supplier_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Issue JWT
    const token = jwt.sign(
      {
        id: user.id,
        supplierAccountId: user.supplier_account_id,
        role: 'supplier',
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Fetch profile
    const profileRes = await query(
      'SELECT brand_name, warehouse_address, contact_phone, website_url FROM supplier_profiles WHERE supplier_account_id = $1',
      [user.supplier_account_id]
    );

    await logSupplierActivity(
      user.supplier_account_id,
      user.id,
      'LOGIN',
      'supplier_user',
      user.id,
      { email: user.email },
      req
    );

    res.json({
      success: true,
      message: 'Supplier authenticated successfully.',
      token,
      supplier: {
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        supplierAccountId: user.supplier_account_id,
        supplierCode: user.supplier_code,
        companyName: user.company_name,
        defaultCurrency: user.default_currency,
        profile: profileRes.rows[0] || {}
      }
    });
  } catch (err) {
    console.error('[Supplier Login Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

/**
 * GET /api/supplier/me
 * Returns current authenticated supplier session information.
 */
router.get('/me', requireSupplierAuth, async (req, res) => {
  try {
    const profileRes = await query(
      'SELECT * FROM supplier_profiles WHERE supplier_account_id = $1',
      [req.supplier.supplierAccountId]
    );

    res.json({
      success: true,
      supplier: {
        ...req.supplier,
        profile: profileRes.rows[0] || {}
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 2. SUPPLIER DASHBOARD METRICS
// ==============================================================================

/**
 * GET /api/supplier/dashboard
 * Aggregates live product statistics, submission status, and recent activity.
 */
router.get('/dashboard', requireSupplierAuth, async (req, res) => {
  try {
    const supplierId = req.supplier.supplierAccountId;

    // Metrics strictly isolated to this supplier
    const statsRes = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN approval_status = 'APPROVED' OR approval_status = 'AI_READY' THEN 1 END) as approved,
         COUNT(CASE WHEN approval_status = 'AI_READY' THEN 1 END) as ai_ready,
         COUNT(CASE WHEN approval_status = 'PENDING' THEN 1 END) as pending,
         COUNT(CASE WHEN approval_status = 'REJECTED' THEN 1 END) as rejected,
         COUNT(CASE WHEN approval_status = 'NEEDS_IMAGE' OR image_status = 'IMAGE_LOW_RESOLUTION' THEN 1 END) as needs_image,
         COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_catalogue
       FROM products
       WHERE supplier_id = $1`,
      [supplierId]
    );

    const counts = statsRes.rows[0] || {};

    // Recent submissions
    const recentSubmissionsRes = await query(
      `SELECT s.id, s.product_id, s.status, s.admin_feedback, s.submitted_at, s.reviewed_at,
              p.name, p.sku, p.price, p.primary_image_url
       FROM supplier_product_submissions s
       JOIN products p ON p.id = s.product_id
       WHERE s.supplier_account_id = $1
       ORDER BY s.submitted_at DESC
       LIMIT 5`,
      [supplierId]
    );

    // Recent activity logs
    const logsRes = await query(
      `SELECT action, entity_type, entity_id, details, created_at
       FROM supplier_activity_logs
       WHERE supplier_account_id = $1
       ORDER BY created_at DESC
       LIMIT 8`,
      [supplierId]
    );

    res.json({
      success: true,
      data: {
        supplier: req.supplier,
        metrics: {
          totalProducts: Number(counts.total || 0),
          approvedProducts: Number(counts.approved || 0),
          aiReadyProducts: Number(counts.ai_ready || 0),
          pendingProducts: Number(counts.pending || 0),
          rejectedProducts: Number(counts.rejected || 0),
          needsImageProducts: Number(counts.needs_image || 0),
          activeInCatalogue: Number(counts.active_catalogue || 0)
        },
        recentSubmissions: recentSubmissionsRes.rows,
        recentActivity: logsRes.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 3. PRODUCT MANAGEMENT (STRICT TENANT ISOLATION)
// ==============================================================================

/**
 * GET /api/supplier/products
 * Lists only products belonging to the authenticated supplier.
 */
router.get('/products', requireSupplierAuth, async (req, res) => {
  try {
    const supplierId = req.supplier.supplierAccountId;
    const {
      search,
      category,
      gender,
      approvalStatus,
      imageStatus,
      limit = 50,
      page = 1
    } = req.query;

    const conditions = ['p.supplier_id = $1'];
    const params = [supplierId];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(p.name) LIKE $${params.length} OR LOWER(p.sku) LIKE $${params.length} OR LOWER(p.brand) LIKE $${params.length})`);
    }

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`(p.category_id::text = $${params.length} OR LOWER(p.subcategory) = LOWER($${params.length}))`);
    }

    if (gender && gender !== 'all') {
      params.push(gender.toLowerCase());
      conditions.push(`LOWER(p.gender) = $${params.length}`);
    }

    if (approvalStatus && approvalStatus !== 'all') {
      params.push(approvalStatus.toUpperCase());
      conditions.push(`UPPER(p.approval_status) = $${params.length}`);
    }

    if (imageStatus && imageStatus !== 'all') {
      params.push(imageStatus.toUpperCase());
      conditions.push(`UPPER(p.image_status) = $${params.length}`);
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    params.push(parseInt(limit, 10));
    params.push(offset);

    const prodsQuery = `
      SELECT p.id, p.sku, p.name, p.brand, p.category_id as "categoryId", c.name as "categoryName",
             p.subcategory, p.gender, p.garment_type as "garmentType", p.tryon_compatibility as "tryonCompatibility",
             p.stock_status as "stockStatus", p.price, p.original_price as "originalPrice",
             p.currency, p.description, p.material, p.primary_image_url as "primaryImage",
             p.color, p.sizes, p.approval_status as "approvalStatus", p.image_status as "imageStatus",
             p.image_width as "imageWidth", p.image_height as "imageHeight",
             p.is_active as "isActive", p.needs_admin_review as "needsAdminReview",
             p.image_usage_permission as "imageUsagePermission", p.created_at as "createdAt"
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      WHERE ${conditions.join(' AND ')}
    `;

    const [prodsRes, countRes] = await Promise.all([
      query(prodsQuery, params),
      query(countQuery, params.slice(0, -2))
    ]);

    res.json({
      success: true,
      count: prodsRes.rows.length,
      total: Number(countRes.rows[0]?.total || 0),
      data: prodsRes.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/supplier/products/:id
 * Details of a single product with strict ownership verification.
 */
router.get('/products/:id', requireSupplierAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const supplierId = req.supplier.supplierAccountId;

    const prodRes = await query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1 AND p.supplier_id = $2`,
      [id, supplierId]
    );

    if (prodRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or access denied. You may only view products registered to your supplier account.'
      });
    }

    const product = prodRes.rows[0];

    // Submissions history for this product
    const subRes = await query(
      `SELECT * FROM supplier_product_submissions WHERE product_id = $1 ORDER BY submitted_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...product,
        submissions: subRes.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/supplier/products
 * Registers a new physical garment. Validates image resolution (>=250x250) and tags with supplier ID.
 */
router.post('/products', requireSupplierAuth, async (req, res) => {
  try {
    const supplierId = req.supplier.supplierAccountId;
    const {
      name,
      brand = req.supplier.companyName,
      categoryId = 1,
      subcategory = 'sarees',
      gender = 'women',
      garmentType = 'saree',
      price,
      originalPrice,
      description = '',
      material = '',
      color = '',
      sizes = ['Free Size'],
      stockStatus = 'in_stock',
      primaryImage,
      frontImage,
      backImage,
      sideImage,
      modelImage,
      imageUsagePermission = 'supplier_granted'
    } = req.body;

    if (!name || !price || !primaryImage) {
      return res.status(400).json({
        success: false,
        error: 'Garment title, price, and primary image are required.'
      });
    }

    // Technical image validation gate
    const techValidation = imageValidationService.validateTechnicalDimensions(primaryImage);
    if (!techValidation.valid) {
      return res.status(400).json({
        success: false,
        error: `Garment image rejected: ${techValidation.error || 'Minimum resolution of 250×250px required.'}`
      });
    }

    const dimW = techValidation.width || null;
    const dimH = techValidation.height || null;
    const imageStatus = (dimW && dimH && (dimW < 250 || dimH < 250)) ? 'IMAGE_LOW_RESOLUTION' : 'IMAGE_VALID';

    // Generate SKU and slug
    const cleanPrefix = req.supplier.supplierCode.replace(/[^a-zA-Z0-9]/g, '').slice(-4);
    const sku = `SUP-${cleanPrefix}-${Date.now().toString().slice(-6)}`;
    const slug = `${brand}-${name}-${sku}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 120);

    const sizesArr = Array.isArray(sizes) ? sizes : [sizes].filter(Boolean);

    // Insert into products: holds in PENDING review
    const insertRes = await query(
      `INSERT INTO products (
         sku, name, slug, brand, category_id, subcategory, gender, garment_type,
         tryon_compatibility, stock_status, price, original_price, currency,
         description, material, primary_image_url, front_image_url, back_image_url,
         side_image_url, model_image_url, color, sizes, needs_admin_review,
         approval_status, permission_status, image_status, image_width, image_height,
         source, external_product_id, supplier_id, image_usage_permission, is_active
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8,
         'supported', $9, $10, $11, $12,
         $13, $14, $15, $16, $17,
         $18, $19, $20, $21, TRUE,
         'PENDING', $22, $23, $24, $25,
         'supplier_csv', $1, $26, $22, FALSE
       ) RETURNING *`,
      [
        sku, name.trim(), slug, brand.trim(), parseInt(categoryId, 10), subcategory, gender, garmentType,
        stockStatus, parseFloat(price), originalPrice ? parseFloat(originalPrice) : parseFloat(price),
        req.supplier.defaultCurrency || 'INR',
        description.trim(), material.trim(), primaryImage, frontImage || null, backImage || null,
        sideImage || null, modelImage || null, color.trim(), JSON.stringify(sizesArr),
        imageUsagePermission, imageStatus, dimW, dimH, supplierId
      ]
    );

    const product = insertRes.rows[0];

    // Record submission
    const batchId = `SUBM-${Date.now()}`;
    await query(
      `INSERT INTO supplier_product_submissions (
         supplier_account_id, product_id, submission_batch, status
       ) VALUES ($1, $2, $3, 'PENDING')`,
      [supplierId, product.id, batchId]
    );

    // Activity log
    await logSupplierActivity(
      supplierId,
      req.supplier.userId,
      'PRODUCT_CREATE',
      'product',
      product.id,
      { name: product.name, sku: product.sku, price: product.price },
      req
    );

    res.status(201).json({
      success: true,
      message: 'Garment submitted successfully. Held in PENDING review for quality verification.',
      data: product
    });
  } catch (err) {
    console.error('[Supplier Product Create Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/supplier/products/:id
 * Updates product details with strict supplier ownership verification.
 */
router.put('/products/:id', requireSupplierAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const supplierId = req.supplier.supplierAccountId;

    // Verify ownership
    const checkRes = await query('SELECT * FROM products WHERE id = $1 AND supplier_id = $2', [id, supplierId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or access denied.'
      });
    }

    const existing = checkRes.rows[0];
    const {
      name,
      price,
      originalPrice,
      stockStatus,
      description,
      material,
      color,
      sizes,
      primaryImage
    } = req.body;

    let imageStatus = existing.image_status;
    let dimW = existing.image_width;
    let dimH = existing.image_height;
    let resetApproval = false;

    // If image changed, re-validate dimensions
    if (primaryImage && primaryImage !== existing.primary_image_url) {
      const tech = imageValidationService.validateTechnicalDimensions(primaryImage);
      if (!tech.valid) {
        return res.status(400).json({
          success: false,
          error: `Updated image rejected: ${tech.error || 'Minimum resolution 250×250px required.'}`
        });
      }
      dimW = tech.width || null;
      dimH = tech.height || null;
      imageStatus = (dimW && dimH && (dimW < 250 || dimH < 250)) ? 'IMAGE_LOW_RESOLUTION' : 'IMAGE_VALID';
      resetApproval = true;
    }

    const sizesArr = sizes ? (Array.isArray(sizes) ? sizes : [sizes]) : null;

    const updateRes = await query(
      `UPDATE products
       SET name = COALESCE($1, name),
           price = COALESCE($2, price),
           original_price = COALESCE($3, original_price),
           stock_status = COALESCE($4, stock_status),
           description = COALESCE($5, description),
           material = COALESCE($6, material),
           color = COALESCE($7, color),
           sizes = COALESCE($8, sizes),
           primary_image_url = COALESCE($9, primary_image_url),
           image_width = COALESCE($10, image_width),
           image_height = COALESCE($11, image_height),
           image_status = $12,
           approval_status = CASE WHEN $13 THEN 'PENDING' ELSE approval_status END,
           is_active = CASE WHEN $13 THEN FALSE ELSE is_active END,
           needs_admin_review = CASE WHEN $13 THEN TRUE ELSE needs_admin_review END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14 AND supplier_id = $15
       RETURNING *`,
      [
        name ? name.trim() : null,
        price ? parseFloat(price) : null,
        originalPrice ? parseFloat(originalPrice) : null,
        stockStatus || null,
        description ? description.trim() : null,
        material ? material.trim() : null,
        color ? color.trim() : null,
        sizesArr ? JSON.stringify(sizesArr) : null,
        primaryImage || null,
        dimW,
        dimH,
        imageStatus,
        resetApproval,
        id,
        supplierId
      ]
    );

    await logSupplierActivity(
      supplierId,
      req.supplier.userId,
      'PRODUCT_UPDATE',
      'product',
      id,
      { resetApproval, updatedFields: Object.keys(req.body) },
      req
    );

    res.json({
      success: true,
      message: resetApproval
        ? 'Product updated with new image. Resubmitted for administrator quality review.'
        : 'Product details updated successfully.',
      data: updateRes.rows[0]
    });
  } catch (err) {
    console.error('[Supplier Product Update Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/supplier/products/:id
 * Deletes a product owned by this supplier.
 */
router.delete('/products/:id', requireSupplierAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const supplierId = req.supplier.supplierAccountId;

    const delRes = await query(
      'DELETE FROM products WHERE id = $1 AND supplier_id = $2 RETURNING id, name',
      [id, supplierId]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or access denied.'
      });
    }

    await logSupplierActivity(
      supplierId,
      req.supplier.userId,
      'PRODUCT_DELETE',
      'product',
      id,
      { name: delRes.rows[0].name },
      req
    );

    res.json({
      success: true,
      message: `Product '${delRes.rows[0].name}' deleted successfully.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 4. IMAGE UPLOAD & VALIDATION
// ==============================================================================

/**
 * POST /api/supplier/upload-images
 * Uploads physical garment photographs with >=250x250 dimension checking.
 */
router.post('/upload-images', requireSupplierAuth, uploadLimiter, uploadImage.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No image files provided.' });
    }

    const validatedImages = [];
    const rejectedFiles = [];

    for (const file of req.files) {
      const publicPath = `/uploads/custom_garments/${file.filename}`;
      const tech = imageValidationService.validateTechnicalDimensions(publicPath);

      if (!tech.valid) {
        // Remove ineligible small file
        try { fs.unlinkSync(file.path); } catch {}
        rejectedFiles.push({
          filename: file.originalname,
          error: tech.error || 'Below minimum 250×250px requirement.'
        });
      } else {
        validatedImages.push({
          url: publicPath,
          width: tech.width,
          height: tech.height,
          longerSide: Math.max(tech.width, tech.height),
          format: tech.format,
          isHighRes: Math.max(tech.width, tech.height) >= 1024
        });
      }
    }

    if (validatedImages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'All uploaded images were rejected for failing dimension standards (minimum 250×250px required).',
        rejected: rejectedFiles
      });
    }

    res.json({
      success: true,
      data: validatedImages,
      rejected: rejectedFiles
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 5. SUPPLIER CSV BATCH INGESTION
// ==============================================================================

/**
 * POST /api/supplier/import-csv
 * Ingests a batch CSV catalogue from this supplier, enforcing tenant isolation.
 */
router.post('/import-csv', requireSupplierAuth, uploadCsv.single('csvFile'), async (req, res) => {
  try {
    const supplierId = req.supplier.supplierAccountId;
    let csvContent = '';

    if (req.file) {
      csvContent = fs.readFileSync(req.file.path, 'utf8');
    } else if (req.body.csvText) {
      csvContent = req.body.csvText;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide CSV catalogue data either as a file upload or text.'
      });
    }

    const adapter = getCatalogueAdapter('supplier_csv');
    const parsed = adapter.parseCsv(csvContent, {
      supplierId,
      supplierName: req.supplier.companyName,
      defaultCurrency: req.supplier.defaultCurrency || 'INR',
      defaultPermission: 'supplier_granted'
    });

    const batchId = `BATCH-SUP-${supplierId}-${Date.now()}`;
    const importedResults = [];
    const importErrors = [...parsed.errors];

    for (const item of parsed.products) {
      try {
        const ingResult = await ingestNormalizedProduct(item, { supplierId });
        importedResults.push(ingResult);

        // Record submission entry
        if (ingResult.productId) {
          await query(
            `INSERT INTO supplier_product_submissions (
               supplier_account_id, product_id, submission_batch, status
             ) VALUES ($1, $2, $3, 'PENDING')`,
            [supplierId, ingResult.productId, batchId]
          );
        }
      } catch (ingErr) {
        importErrors.push(`Product '${item.product_name}': ${ingErr.message}`);
      }
    }

    await logSupplierActivity(
      supplierId,
      req.supplier.userId,
      'CSV_IMPORT',
      'batch_submission',
      batchId,
      { total: parsed.products.length, imported: importedResults.length, errors: importErrors.length },
      req
    );

    res.json({
      success: true,
      batchId,
      totalRows: parsed.products.length,
      importedCount: importedResults.length,
      rejectedCount: importErrors.length,
      importedItems: importedResults,
      errors: importErrors
    });
  } catch (err) {
    console.error('[Supplier CSV Import Error]:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 6. PROFILE MANAGEMENT
// ==============================================================================

/**
 * GET /api/supplier/profile
 * Returns profile for the authenticated supplier.
 */
router.get('/profile', requireSupplierAuth, async (req, res) => {
  try {
    const supplierId = req.supplier.supplierAccountId;
    const profRes = await query(
      `SELECT p.*, s.supplier_code, s.company_name, s.email, s.phone, s.city, s.country, s.status, s.default_currency
       FROM supplier_profiles p
       JOIN supplier_accounts s ON s.id = p.supplier_account_id
       WHERE p.supplier_account_id = $1`,
      [supplierId]
    );

    res.json({
      success: true,
      data: profRes.rows[0] || {}
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/supplier/profile
 * Updates warehouse address, contact phone, brand name, and website.
 */
router.put('/profile', requireSupplierAuth, async (req, res) => {
  try {
    const supplierId = req.supplier.supplierAccountId;
    const {
      warehouseAddress,
      contactPhone,
      brandName,
      websiteUrl,
      taxId,
      businessRegistrationNumber
    } = req.body;

    const updateRes = await query(
      `UPDATE supplier_profiles
       SET warehouse_address = COALESCE($1, warehouse_address),
           contact_phone = COALESCE($2, contact_phone),
           brand_name = COALESCE($3, brand_name),
           website_url = COALESCE($4, website_url),
           tax_id = COALESCE($5, tax_id),
           business_registration_number = COALESCE($6, business_registration_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE supplier_account_id = $7
       RETURNING *`,
      [
        warehouseAddress || null,
        contactPhone || null,
        brandName ? brandName.trim() : null,
        websiteUrl || null,
        taxId || null,
        businessRegistrationNumber || null,
        supplierId
      ]
    );

    res.json({
      success: true,
      message: 'Supplier profile updated successfully.',
      data: updateRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
