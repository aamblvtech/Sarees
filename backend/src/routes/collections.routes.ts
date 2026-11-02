import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/collections/:id/items (Add saree to collection by productId or SKU)
router.post('/:id/items', authenticate, requireRole('staff', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const collectionId = req.params.id;
    const { productId, sku } = req.body;

    let targetProductId = productId;

    if (!targetProductId && sku) {
      const prodRes = await query('SELECT id FROM saree_products WHERE sku = $1', [sku.toUpperCase()]);
      if (prodRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: `Saree with SKU '${sku}' not found.` });
      }
      targetProductId = prodRes.rows[0].id;
    }

    if (!targetProductId) {
      return res.status(400).json({ success: false, error: 'Product ID or SKU is required.' });
    }

    await query(
      `INSERT INTO collection_items (collection_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (collection_id, product_id) DO NOTHING`,
      [collectionId, targetProductId]
    );

    return res.status(201).json({
      success: true,
      message: 'Saree successfully added to customer collection.',
      productId: targetProductId,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/collections/:id/items/:productId
router.delete('/:id/items/:productId', authenticate, requireRole('staff', 'admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: collectionId, productId } = req.params;

    await query(
      `DELETE FROM collection_items WHERE collection_id = $1 AND product_id = $2`,
      [collectionId, productId]
    );

    return res.json({ success: true, message: 'Item removed from collection.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
