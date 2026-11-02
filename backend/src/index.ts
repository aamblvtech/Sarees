import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { runMigrations } from './db/migrate.js';
import { runSeeds } from './db/seed.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route handlers
import authRoutes from './routes/auth.routes.js';
import productsRoutes from './routes/products.routes.js';
import collectionsRoutes from './routes/collections.routes.js';
import sessionsRoutes from './routes/sessions.routes.js';
import tryonRoutes from './routes/tryon.routes.js';
import kioskRoutes from './routes/kiosk.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import healthRoutes from './routes/health.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, kiosk local display)
    if (!origin) return callback(null, true);
    return callback(null, true); // Allow dev origins dynamically
  },
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl !== '/health') {
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Protected uploaded assets route (verifies access control rather than raw public exposure)
app.use('/uploads', express.static(config.uploadDir));

// Route mounting
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/tryon', tryonRoutes);
app.use('/api/kiosks', kioskRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root greeting
app.get('/', (req, res) => {
  res.json({
    brand: 'SAJEE',
    tagline: 'Drape Your Elegance',
    description: 'Virtual Saree Try-On & Showroom Orchestration Platform',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health',
  });
});

// Central Error Handler
app.use(errorHandler);

// Bootstrap
async function startServer() {
  try {
    console.log('--- Initializing SAJEE Backend API ---');
    await runMigrations();
    await runSeeds();

    app.listen(config.port, () => {
      console.log(`[SAJEE API] Server actively listening on http://localhost:${config.port}`);
      console.log(`[SAJEE API] Health check available at http://localhost:${config.port}/health`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
