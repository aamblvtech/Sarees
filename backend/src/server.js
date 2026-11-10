import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import healthRoutes from './routes/health.routes.js';
import productRoutes from './routes/products.routes.js';
import tryonRoutes from './routes/tryon.routes.js';
import adminRoutes from './routes/admin.routes.js';
import catalogueSourcesRoutes from './routes/catalogueSources.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import { initializeDatabase, testConnection, query } from './config/db.js';
import { runSeed } from './db/seed.js';
import qrSessionService from './services/qrSessionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env first
dotenv.config();

// Also load root .env with override so changes in either file immediately take effect
const rootEnvPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads directory and subdirectories
const uploadsDir = path.join(__dirname, '..', 'uploads');
const customerUploadsDir = path.join(uploadsDir, 'customer_silhouettes');
const customGarmentsDir = path.join(uploadsDir, 'custom_garments');
[uploadsDir, customerUploadsDir, customGarmentsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
app.use('/uploads', express.static(uploadsDir));

// Mount REST API routes
app.use('/api', healthRoutes);
app.use('/api', productRoutes);
app.use('/api/tryon', tryonRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/catalogue-sources', catalogueSourcesRoutes);
app.use('/api/supplier', supplierRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    brand: 'VESTRA',
    tagline: 'Experience Fashion Before You Wear It',
    description: 'VESTRA AI Virtual Try-On REST API',
    endpoints: {
      health: '/api/health',
      categories: '/api/categories',
      products: '/api/products',
      productDetails: '/api/products/:id',
      adminLogin: 'POST /api/admin/login',
      adminStats: 'GET /api/admin/stats',
      adminProducts: '/api/admin/products',
      adminUpload: 'POST /api/admin/upload',
      tryonSilhouettes: '/api/tryon/sample-silhouettes',
      tryonUpload: 'POST /api/tryon/upload',
      tryonJobs: 'POST /api/tryon/jobs'
    }
  });
});

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server & Connect to Database
app.listen(PORT, '0.0.0.0', async () => {
  console.log('========================================================');
  console.log(`  VESTRA Virtual Try-On Backend Service`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================================');

  // Initialize and verify database connection
  await initializeDatabase();

  // Always seed/synchronize database with latest verified luxury collection & taxonomy
  try {
    console.log('[DB] Synchronizing catalogue and admin in PostgreSQL...');
    await runSeed();
  } catch (err) {
    console.error('[DB Startup Seed Error]:', err.message);
  }

  // Periodic cleanup for expired QR mobile upload sessions (every 5 minutes)
  setInterval(() => {
    qrSessionService.purgeExpiredSessions().catch(() => {});
  }, 5 * 60 * 1000);

  const conn = await testConnection();
  console.log(`[DB Status] Engine: ${conn.engine} | Connected: ${conn.connected}`);
});

export default app;
