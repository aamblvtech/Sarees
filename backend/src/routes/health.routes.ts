import { Router, Request, Response } from 'express';
import { checkDbConnection } from '../db/pool.js';
import { config } from '../config/index.js';

const router = Router();

// GET /health
router.get('/', async (req: Request, res: Response) => {
  const dbStatus = await checkDbConnection();
  const uptime = process.uptime();

  return res.json({
    status: 'healthy',
    brand: 'SAJEE',
    tagline: 'Drape Your Elegance',
    service: 'sajee-backend-api',
    uptimeSeconds: Math.floor(uptime),
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

// GET /api/health/ai (Health proxy to AI microservice)
router.get('/ai', async (req: Request, res: Response) => {
  try {
    const aiUrl = `${config.aiServiceUrl}/health`;
    const response = await fetch(aiUrl, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      return res.status(503).json({
        status: 'degraded',
        message: `AI service returned status ${response.status}`,
        targetUrl: aiUrl,
      });
    }
    const data = await response.json();
    return res.json({
      status: 'healthy',
      aiService: data,
    });
  } catch (err: any) {
    return res.json({
      status: 'offline_or_not_started',
      message: 'FastAPI AI microservice is not currently reachable.',
      targetUrl: config.aiServiceUrl,
      error: err.message,
      providerFallback: 'MockTryOnProvider active within Node.js fallback for development',
    });
  }
});

export default router;
