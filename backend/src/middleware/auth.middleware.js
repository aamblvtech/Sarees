import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vestra_luxury_jwt_secret_atelier_key_2026';

/**
 * Admin Authentication Middleware
 * Protects admin endpoints using JWT Bearer token
 */
export async function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing or malformed Bearer token.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Token is missing.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token. Please log in again.'
      });
    }

    // Verify admin still exists in PostgreSQL database using parameterized query
    const result = await query(
      'SELECT id, email, name, role FROM admins WHERE id = $1 LIMIT 1',
      [decoded.id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Admin user not found or access revoked.'
      });
    }

    req.admin = result.rows[0];
    next();
  } catch (err) {
    console.error('[Auth Middleware Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Authentication verification failure.'
    });
  }
}

