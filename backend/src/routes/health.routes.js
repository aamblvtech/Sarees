import express from 'express';
import { getDbStatus, query } from '../config/db.js';

const router = express.Router();

let isServerReadyState = false;

export function setServerReady(state = true) {
  isServerReadyState = state;
}

export function isServerReady() {
  return isServerReadyState;
}

/**
 * GET /api/health
 * Returns service status, version, uptime, and database connection state
 */
router.get('/health', async (req, res) => {
  let dbHealthy = false;
  let dbLatencyMs = null;
  let dbError = null;

  try {
    const start = Date.now();
    await query('SELECT 1');
    dbLatencyMs = Date.now() - start;
    dbHealthy = true;
  } catch (err) {
    dbHealthy = false;
    dbError = err.message;
  }

  const dbInfo = getDbStatus();
  const overallHealthy = dbHealthy && isServerReadyState;

  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? 'healthy' : 'initializing',
    service: 'VESTRA Virtual Try-On API',
    brand: 'VESTRA',
    tagline: 'Experience Fashion Before You Wear It',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbHealthy ? 'connected' : 'disconnected',
      engine: dbInfo.engine,
      driver: dbInfo.driver,
      latencyMs: dbLatencyMs,
      error: dbError
    },
    tryonEngine: {
      provider: process.env.TRYON_PROVIDER || 'mock',
      mode: 'prototype_simulation'
    }
  });
});

export default router;
