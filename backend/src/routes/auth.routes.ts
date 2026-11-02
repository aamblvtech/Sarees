import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { authenticate, generateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/errorHandler.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2),
  role: z.enum(['customer', 'staff']).default('customer'),
  phone: z.string().optional(),
  consentDataSaving: z.boolean().default(false),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await query('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, consent_data_saving)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name as "fullName", role, phone, consent_data_saving as "consentDataSaving", created_at`,
      [data.email.toLowerCase(), passwordHash, data.fullName, data.role, data.phone || null, data.consentDataSaving]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.cookie('sajee_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      user,
      token,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map(e => e.message).join(', ') });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const result = await query(
      `SELECT id, email, password_hash, full_name as "fullName", role, phone, consent_data_saving as "consentDataSaving"
       FROM users WHERE email = $1`,
      [data.email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const userRecord = result.rows[0];
    const match = await bcrypt.compare(data.password, userRecord.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const user = {
      id: userRecord.id,
      email: userRecord.email,
      fullName: userRecord.fullName,
      role: userRecord.role,
      phone: userRecord.phone,
      consentDataSaving: userRecord.consentDataSaving,
    };

    const token = generateToken(user);

    res.cookie('sajee_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      user,
      token,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors.map(e => e.message).join(', ') });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('sajee_token');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, full_name as "fullName", role, phone, consent_data_saving as "consentDataSaving", created_at as "createdAt"
       FROM users WHERE id = $1`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/auth/account (Customer privacy right to erasure)
router.delete('/account', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await logAudit(req, 'CUSTOMER_ACCOUNT_DELETED', 'user', userId);
    await query('DELETE FROM users WHERE id = $1', [userId]);
    res.clearCookie('sajee_token');
    return res.json({ success: true, message: 'Your account and personal data have been permanently erased.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
