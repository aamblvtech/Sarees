import crypto from 'crypto';
import os from 'os';
import QRCode from 'qrcode';
import { query } from '../config/db.js';
import imageValidationService from './imageValidationService.js';

/**
 * Resolves the primary local network IPv4 address for phone accessibility.
 * Avoids 127.0.0.1 / localhost so phones on the same Wi-Fi can open the mobile page.
 */
export function getLocalNetworkIp() {
  // If explicitly overridden via environment variable (e.g. in production / staging)
  if (process.env.MOBILE_UPLOAD_HOST) {
    return process.env.MOBILE_UPLOAD_HOST;
  }

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Look for external IPv4 address
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

export const qrSessionService = {
  /**
   * Create a secure 5-minute single-use QR upload session
   */
  async createSession(req) {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresInSeconds = 300; // 5 minutes
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const lanIp = getLocalNetworkIp();
    // Default frontend port is 5173
    const frontendPort = process.env.FRONTEND_PORT || '5173';
    
    // Support production host or LAN host
    let mobileBaseUrl = process.env.MOBILE_UPLOAD_BASE_URL;
    if (!mobileBaseUrl) {
      const protocol = req.protocol === 'https' ? 'https' : 'http';
      mobileBaseUrl = `${protocol}://${lanIp}:${frontendPort}`;
    }

    const mobileUrl = `${mobileBaseUrl}/mobile-upload/${token}`;

    // Generate high-contrast, elegant QR code data URL matching VESTRA aesthetic
    const qrCodeDataUrl = await QRCode.toDataURL(mobileUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#121212',
        light: '#FAF7F2'
      },
      errorCorrectionLevel: 'M'
    });

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    await query(
      `INSERT INTO qr_upload_sessions (
         token, status, expires_at, ip_address, created_at
       )
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [token, 'pending', expiresAt, clientIp]
    );

    return {
      token,
      mobileUrl,
      qrCodeDataUrl,
      lanIp,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds
    };
  },

  /**
   * Get session status by token (checks expiry)
   */
  async getSession(token) {
    if (!token || typeof token !== 'string') return null;

    const result = await query(
      `SELECT * FROM qr_upload_sessions WHERE token = $1 LIMIT 1`,
      [token]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];
    const now = new Date();

    // Check expiration
    if (session.status === 'pending' && new Date(session.expires_at) < now) {
      await query(
        `UPDATE qr_upload_sessions SET status = 'expired' WHERE id = $1`,
        [session.id]
      );
      session.status = 'expired';
    }

    return {
      token: session.token,
      status: session.status,
      photoUrl: session.photo_url,
      photoFilename: session.photo_filename,
      consentGiven: session.consent_given,
      expiresAt: session.expires_at,
      createdAt: session.created_at,
      uploadedAt: session.uploaded_at
    };
  },

  /**
   * Handle photo upload from mobile phone
   */
  async handleMobileUpload(token, file, consentGiven) {
    if (!token) {
      throw new Error('QR session token is required.');
    }

    const session = await this.getSession(token);
    if (!session) {
      const err = new Error('Invalid or non-existent QR upload session.');
      err.status = 404;
      throw err;
    }

    if (session.status === 'expired') {
      const err = new Error('This QR code session has expired. Please refresh the QR code on the kiosk screen.');
      err.status = 410;
      throw err;
    }

    if (session.status === 'uploaded' || session.status === 'consumed') {
      const err = new Error('This QR code session has already been used. Please generate a new QR session.');
      err.status = 409;
      throw err;
    }

    if (!consentGiven) {
      const err = new Error('Customer consent is required before submitting photos for AI virtual try-on.');
      err.status = 400;
      throw err;
    }

    if (!file) {
      const err = new Error('No image file provided for upload.');
      err.status = 400;
      throw err;
    }

    // Build URL for the photo
    const lanIp = getLocalNetworkIp();
    const port = process.env.PORT || 5000;
    const photoUrl = `http://${lanIp}:${port}/uploads/customer_silhouettes/${file.filename}`;

    await query(
      `UPDATE qr_upload_sessions
       SET status = 'uploaded',
           photo_url = $1,
           photo_filename = $2,
           consent_given = TRUE,
           uploaded_at = CURRENT_TIMESTAMP
       WHERE token = $3`,
      [photoUrl, file.filename, token]
    );

    return {
      success: true,
      token,
      photoUrl,
      photoFilename: file.filename,
      uploadedAt: new Date().toISOString()
    };
  },

  /**
   * Kiosk consumption of uploaded silhouette
   */
  async consumeSession(token) {
    await query(
      `UPDATE qr_upload_sessions
       SET status = 'consumed'
       WHERE token = $1 AND status = 'uploaded'`,
      [token]
    );
    return true;
  },

  /**
   * Periodic purge of expired sessions and orphan photos (Module 8 Privacy)
   */
  async purgeExpiredSessions() {
    try {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000);
      // Find expired unconsumed sessions older than 15 minutes
      const result = await query(
        `SELECT id, photo_filename FROM qr_upload_sessions
         WHERE status IN ('expired', 'pending')
           AND expires_at < $1`,
        [cutoff]
      );

      for (const row of result.rows || []) {
        if (row.photo_filename) {
          imageValidationService.deleteCustomerPhoto(row.photo_filename);
        }
      }

      await query(
        `DELETE FROM qr_upload_sessions
         WHERE expires_at < $1`,
        [cutoff]
      );
    } catch (err) {
      console.warn('[QR Session Purge Warning]:', err.message);
    }
  }
};

export default qrSessionService;

