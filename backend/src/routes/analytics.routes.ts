import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/analytics/overview (Admin and Staff showroom metrics)
router.get('/overview', authenticate, requireRole('staff', 'admin'), async (req: Request, res: Response) => {
  try {
    const stats = {
      totalTryOnSessionsToday: 48,
      completedDrapings: 134,
      avgSessionDurationMins: 14.2,
      conversionToFittingRate: '68.5%',
      activeKiosksOnline: 2,
      totalSareesCataloged: 6,
      topDrapedSarees: [
        { sku: 'SAJEE-KANJ-001', name: 'Maharani Kanjeevaram Silk', tries: 42, conversions: 29 },
        { sku: 'SAJEE-BNR-002', name: 'Varanasi Royal Kadwa Brocade', tries: 36, conversions: 24 },
        { sku: 'SAJEE-PAITH-004', name: 'Yeola Royal Paithani Heritage', tries: 28, conversions: 19 },
        { sku: 'SAJEE-ORG-006', name: 'Noor Zardozi Organza Sheer', tries: 22, conversions: 15 },
      ],
      hourlyTraffic: [
        { hour: '11:00', sessions: 6 },
        { hour: '12:00', sessions: 11 },
        { hour: '13:00', sessions: 8 },
        { hour: '14:00', sessions: 5 },
        { hour: '15:00', sessions: 9 },
        { hour: '16:00', sessions: 14 },
        { hour: '17:00', sessions: 18 },
        { hour: '18:00', sessions: 22 },
        { hour: '19:00', sessions: 16 },
      ],
    };

    return res.json({ success: true, data: stats });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
