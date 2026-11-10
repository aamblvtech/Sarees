import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  catalogueAdapters,
  getCatalogueAdapter,
  getCatalogueSourcesOverview,
  ingestNormalizedProduct
} from '../adapters/catalogue/index.js';
import { query } from '../config/db.js';
import imageValidationService from '../services/imageValidationService.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload destination for supplier CSV/Excel documents
const supplierDocsDir = path.join(__dirname, '..', '..', 'uploads', 'supplier_docs');
if (!fs.existsSync(supplierDocsDir)) {
  fs.mkdirSync(supplierDocsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, supplierDocsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.csv';
    cb(null, `supplier_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * GET /api/catalogue-sources
 * Returns overview of all catalogue sources with credential & sync stats
 */
router.get('/', async (req, res) => {
  try {
    const overview = await getCatalogueSourcesOverview();
    res.json({ success: true, data: overview });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/catalogue-sources/:slug/test
 * Tests live connection or credential readiness for a given source
 */
router.post('/:slug/test', async (req, res) => {
  try {
    const { slug } = req.params;
    const adapter = getCatalogueAdapter(slug);
    const result = await adapter.testConnection();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/catalogue-sources/:slug/search
 * Searches products through source adapter (with rate-limiting & pagination)
 */
router.get('/:slug/search', async (req, res) => {
  try {
    const { slug } = req.params;
    const { q, limit, page } = req.query;
    const adapter = getCatalogueAdapter(slug);
    const results = await adapter.searchProducts(q || '', {
      limit: Number(limit) || 10,
      page: Number(page) || 1
    });
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/catalogue-sources/import-single
 * Imports a single normalized product item into PostgreSQL
 */
router.post('/import-single', async (req, res) => {
  try {
    const { product, supplierId } = req.body;
    if (!product) {
      return res.status(400).json({ success: false, error: 'Product payload is required.' });
    }

    const adapter = getCatalogueAdapter(product.source || 'manual');
    const normalized = adapter.normalizeProduct(product, { supplierId });
    const result = await ingestNormalizedProduct(normalized, { supplierId });

    res.json({
      success: true,
      message: `Product '${result.name}' successfully imported (Pending admin review).`,
      data: result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/catalogue-sources/import-csv
 * Ingests a supplier CSV string or file in batch
 */
router.post('/import-csv', upload.single('csvFile'), async (req, res) => {
  try {
    let csvContent = req.body.csvText;

    if (req.file && fs.existsSync(req.file.path)) {
      csvContent = fs.readFileSync(req.file.path, 'utf-8');
    }

    if (!csvContent) {
      return res.status(400).json({ success: false, error: 'CSV file or csvText is required.' });
    }

    const supplierId = req.body.supplierId ? Number(req.body.supplierId) : null;
    const defaultPermission = req.body.imageUsagePermission || (supplierId ? 'confirmed' : 'needs_review');

    // Fetch supplier info if provided
    let supplierName = '';
    if (supplierId) {
      const supRes = await query('SELECT company_name, default_currency FROM supplier_accounts WHERE id = $1', [supplierId]);
      if (supRes.rows.length > 0) {
        supplierName = supRes.rows[0].company_name;
      }
    }

    const adapter = getCatalogueAdapter('supplier_csv');
    const parsed = adapter.parseCsv(csvContent, {
      supplierId,
      supplierName,
      defaultCurrency: req.body.defaultCurrency || 'INR',
      defaultPermission
    });

    const batchId = `BATCH-${Date.now()}`;
    const importedResults = [];
    const importErrors = [...parsed.errors];

    for (const item of parsed.products) {
      try {
        const ingResult = await ingestNormalizedProduct(item, { supplierId });
        importedResults.push(ingResult);
      } catch (ingErr) {
        importErrors.push(`Product '${item.product_name}': ${ingErr.message}`);
      }
    }

    // Record batch sync log in database
    await query(
      `INSERT INTO catalogue_sync_logs (
         source, batch_id, sync_type, status, items_total, items_imported,
         items_rejected, items_pending_review, error_summary, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'supplier_csv',
        batchId,
        'csv_upload',
        importErrors.length > 0 ? 'partial' : 'completed',
        parsed.products.length,
        importedResults.length,
        importErrors.length,
        importedResults.filter((r) => r.approvalStatus === 'PENDING').length,
        importErrors.slice(0, 5).join('; '),
        JSON.stringify({ supplierId, supplierName })
      ]
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
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/catalogue-sources/suppliers
 * Lists registered fashion suppliers, manufacturers & wholesalers
 */
router.get('/suppliers', async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, 
              COUNT(p.id) as products_count
       FROM supplier_accounts s
       LEFT JOIN products p ON p.supplier_id = s.id
       GROUP BY s.id
       ORDER BY s.company_name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/catalogue-sources/suppliers
 * Registers a new manufacturer, wholesaler, or boutique supplier account
 */
router.post('/suppliers', async (req, res) => {
  try {
    const {
      companyName,
      contactPerson,
      email,
      phone,
      supplierType,
      city,
      country,
      defaultCurrency,
      notes
    } = req.body;

    if (!companyName) {
      return res.status(400).json({ success: false, error: 'Company name is required.' });
    }

    const supplierCode = `SUP-${(companyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) || 'VSTR').toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const insertRes = await query(
      `INSERT INTO supplier_accounts (
         supplier_code, company_name, contact_person, email, phone,
         supplier_type, city, country, default_currency, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        supplierCode, companyName, contactPerson || '', email || '', phone || '',
        supplierType || 'wholesaler', city || '', country || 'India', defaultCurrency || 'INR', notes || ''
      ]
    );

    res.json({ success: true, data: insertRes.rows[0] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
