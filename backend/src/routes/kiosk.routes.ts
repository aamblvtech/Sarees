import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { DEMO_KIOSKS } from '../db/seed.js';

const router = Router();

// GET /api/kiosks (List all showroom kiosks)
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT k.id, k.name, k.identifier, k.status, k.camera_config as "cameraConfig",
             k.ip_address as "ipAddress", k.last_heartbeat as "lastHeartbeat",
             s.name as "storeName", s.code as "storeCode"
      FROM kiosks k
      LEFT JOIN stores s ON s.id = k.store_id
      ORDER BY k.created_at ASC
    `);

    let kiosks = result.rows;
    if (kiosks.length === 0) {
      kiosks = DEMO_KIOSKS;
    }

    return res.json({ success: true, data: kiosks });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/kiosks/:id/status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const kioskId = req.params.id;
    const result = await query(
      `SELECT k.id, k.name, k.identifier, k.status, k.camera_config as "cameraConfig",
              k.last_heartbeat as "lastHeartbeat", s.name as "storeName"
       FROM kiosks k
       LEFT JOIN stores s ON s.id = k.store_id
       WHERE k.id = $1 OR k.identifier = $1`,
      [kioskId]
    );

    let kiosk = result.rows[0];
    if (!kiosk) {
      kiosk = DEMO_KIOSKS.find(k => k.id === kioskId || k.identifier === kioskId);
    }

    if (!kiosk) {
      return res.status(404).json({ success: false, error: 'Kiosk not found.' });
    }

    return res.json({
      success: true,
      data: {
        ...kiosk,
        isOnline: true,
        supportedModes: ['portrait_4k', 'touch_gesture', 'barcode_auto_detect'],
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/kiosks/:id/heartbeat
router.post('/:id/heartbeat', async (req: Request, res: Response) => {
  try {
    const kioskId = req.params.id;
    await query(`UPDATE kiosks SET last_heartbeat = CURRENT_TIMESTAMP WHERE id = $1 OR identifier = $1`, [kioskId]);
    return res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
