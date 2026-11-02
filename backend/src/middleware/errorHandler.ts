import { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { AuthenticatedRequest } from './auth.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[Unhandled Server Error]', {
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error occurred.',
    code: err.code || 'SERVER_ERROR',
  });
}

export async function logAudit(
  req: AuthenticatedRequest,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, any>
) {
  try {
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entityType, entityId || null, ipAddress, JSON.stringify(metadata || {})]
    );
  } catch (e) {
    console.warn('[Audit Log Warning] Failed to persist audit log:', e);
  }
}
