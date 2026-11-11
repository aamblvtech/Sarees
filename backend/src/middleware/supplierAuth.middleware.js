import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vestra_luxury_jwt_secret_atelier_key_2026';

/**
 * Supplier Authentication Middleware
 * Enforces JWT verification, supplier role checking, and account activation checks.
 */
export async function requireSupplierAuth(req, res, next) {
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

    if (decoded.role !== 'supplier') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Supplier credentials required.'
      });
    }

    // Verify supplier user and account in database
    const userRes = await query(
      `SELECT u.id as user_id, u.email, u.full_name, u.role, u.status as user_status,
              s.id as supplier_account_id, s.supplier_code, s.company_name, s.status as account_status,
              s.default_currency, s.image_usage_terms_agreed
       FROM supplier_users u
       JOIN supplier_accounts s ON s.id = u.supplier_account_id
       WHERE u.id = $1
       LIMIT 1`,
      [decoded.id]
    );

    if (!userRes.rows || userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Supplier user account not found or deactivated.'
      });
    }

    const record = userRes.rows[0];

    // Account activation check
    if (record.user_status !== 'active' || record.account_status !== 'active') {
      const reason = record.user_status === 'pending' || record.account_status === 'pending'
        ? 'Your supplier account is pending administrator approval. Please contact VESTRA partner support.'
        : 'Your supplier account has been suspended or rejected. Please contact VESTRA partner support.';
      
      return res.status(403).json({
        success: false,
        error: reason,
        status: record.user_status
      });
    }

    req.supplier = {
      userId: record.user_id,
      email: record.email,
      fullName: record.full_name,
      role: record.role,
      supplierAccountId: record.supplier_account_id,
      supplierCode: record.supplier_code,
      companyName: record.company_name,
      defaultCurrency: record.default_currency,
      imageUsageTermsAgreed: record.image_usage_terms_agreed
    };

    next();
  } catch (err) {
    console.error('[Supplier Auth Middleware Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Supplier authentication verification failure.'
    });
  }
}

