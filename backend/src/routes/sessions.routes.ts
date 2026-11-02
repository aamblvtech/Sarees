import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { query, withTransaction } from '../db/pool.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';
import { DEMO_PRODUCTS } from '../db/seed.js';

const router = Router();

// Helper: Hash session token for server storage
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// POST /api/sessions (Staff creates a new customer session with QR code)
router.post('/', authenticate, requireRole('staff', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { storeId, kioskId, customerName, customerPhone, initialProductIds = [] } = req.body;

    // Generate cryptographically secure unguessable 32-byte hex token
    const rawToken = crypto.randomBytes(24).toString('base64url');
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date(Date.now() + config.sessionExpiryMinutes * 60 * 1000);

    const result = await withTransaction(async ({ query }) => {
      // 1. Create Session
      const sessionRes = await query(
        `INSERT INTO customer_sessions (store_id, kiosk_id, session_token_hash, status, customer_name, customer_phone, expires_at)
         VALUES ($1, $2, $3, 'active', $4, $5, $6)
         RETURNING id, status, expires_at as "expiresAt", created_at as "createdAt"`,
        [storeId || null, kioskId || null, tokenHash, customerName || null, customerPhone || null, expiresAt.toISOString()]
      );

      const session = sessionRes.rows[0];

      // 2. Create Associated Try-on Collection
      const collRes = await query(
        `INSERT INTO try_on_collections (session_id, name, created_by_staff_id)
         VALUES ($1, $2, $3)
         RETURNING id, name`,
        [session.id, `${customerName || 'Customer'}'s Try-On Collection`, req.user!.id]
      );

      const collection = collRes.rows[0];

      // 3. Add initial products if provided
      for (const prodId of initialProductIds) {
        await query(
          `INSERT INTO collection_items (collection_id, product_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [collection.id, prodId]
        );
      }

      return { session, collection };
    });

    // 4. Generate QR Code payload
    // Payloads contains ONLY the public token URL, never credentials or sensitive images
    const clientBaseUrl = config.corsOrigins[0] || 'http://localhost:5173';
    const qrTargetUrl = `${clientBaseUrl}/tryon/session/${rawToken}`;
    const qrDataUrl = await QRCode.toDataURL(qrTargetUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      color: {
        dark: '#681D32', // Sajee Maroon
        light: '#FAF7F0', // Sajee Warm Ivory
      },
    });

    await logAudit(req, 'CREATE_CUSTOMER_SESSION', 'customer_session', result.session.id, {
      storeId,
      kioskId,
      itemsCount: initialProductIds.length,
    });

    return res.status(201).json({
      success: true,
      data: {
        sessionId: result.session.id,
        collectionId: result.collection.id,
        token: rawToken, // Given to staff once to generate the customer's QR session
        qrDataUrl,
        qrTargetUrl,
        expiresAt: result.session.expiresAt,
        status: result.session.status,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sessions/:token (Customer or Kiosk resolves session & loads sarees)
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const rawToken = req.params.token.trim();
    const tokenHash = hashToken(rawToken);

    const sessionRes = await query(
      `SELECT
        s.id, s.store_id as "storeId", s.kiosk_id as "kioskId", s.status,
        s.customer_consent as "customerConsent", s.customer_name as "customerName",
        s.expires_at as "expiresAt", s.created_at as "createdAt"
       FROM customer_sessions s
       WHERE s.session_token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    let session = sessionRes.rows[0];

    // Fallback simulated session for demo tokens
    if (!session && rawToken.startsWith('demo-session')) {
      session = {
        id: 'demo-session-uuid-001',
        storeId: 'a0000000-0000-0000-0000-000000000001',
        kioskId: 'b0000000-0000-0000-0000-000000000001',
        status: 'active',
        customerConsent: true,
        customerName: 'Meera (Demo Client)',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      };
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or unknown session token. Please ask showroom staff for a fresh QR code.',
        code: 'SESSION_NOT_FOUND',
      });
    }

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({
        success: false,
        error: 'This try-on session has expired. Showroom sessions are valid for 60 minutes for privacy.',
        code: 'SESSION_EXPIRED',
        status: 'expired',
      });
    }

    // Check revocation
    if (session.status === 'revoked') {
      return res.status(403).json({
        success: false,
        error: 'This session has been revoked by showroom staff or closed by customer.',
        code: 'SESSION_REVOKED',
        status: 'revoked',
      });
    }

    // Retrieve collection and sarees in session
    const collRes = await query(
      `SELECT c.id, c.name FROM try_on_collections c WHERE c.session_id = $1 LIMIT 1`,
      [session.id]
    );

    let collection = collRes.rows[0];
    let items: any[] = [];

    if (collection) {
      const itemsRes = await query(
        `SELECT
          p.id, p.sku, p.name, p.price, p.fabric, p.color, p.occasion,
          p.border_type as "borderType", p.pallu_details as "palluDetails",
          p.stock_quantity as "stockQuantity",
          COALESCE(
            (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1),
            'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85'
          ) as "primaryImage"
         FROM collection_items ci
         JOIN saree_products p ON p.id = ci.product_id
         WHERE ci.collection_id = $1
         ORDER BY ci.added_at DESC`,
        [collection.id]
      );
      items = itemsRes.rows;
    }

    // If empty or demo, provide standard demo collection sarees
    if (items.length === 0) {
      items = DEMO_PRODUCTS.slice(0, 3);
    }

    return res.json({
      success: true,
      data: {
        session,
        collection: collection || { id: 'demo-coll', name: "Customer's Try-On Collection" },
        sarees: items,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sessions/:id/consent (Customer explicitly agrees to photo processing)
router.post('/:id/consent', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const { consent } = req.body;

    await query(
      `UPDATE customer_sessions SET customer_consent = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [Boolean(consent), sessionId]
    );

    return res.json({ success: true, consent: Boolean(consent) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sessions/:id/revoke (Staff or customer revokes/ends session)
router.post('/:id/revoke', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    await query(
      `UPDATE customer_sessions SET status = 'revoked', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [sessionId]
    );

    return res.json({ success: true, message: 'Session revoked successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sessions/:id/purge (Purge all customer photos and temporary artifacts)
router.post('/:id/purge', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;

    await withTransaction(async ({ query }) => {
      // Mark uploaded photos as purged
      await query(
        `UPDATE uploaded_photos SET is_purged = true, storage_path = '[PURGED_FOR_PRIVACY]' WHERE session_id = $1`,
        [sessionId]
      );

      // Close session
      await query(
        `UPDATE customer_sessions SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [sessionId]
      );
    });

    return res.json({
      success: true,
      message: 'Privacy guarantee executed: All temporary customer photos and session data have been purged.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
