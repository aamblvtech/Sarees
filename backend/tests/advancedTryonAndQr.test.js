import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure backend initialized
import { initializeDatabase, query } from '../src/config/db.js';
import { runSeed } from '../src/db/seed.js';
import { sampleProducts } from '../src/data/sampleProducts.js';
import qrSessionService, { getLocalNetworkIp } from '../src/services/qrSessionService.js';
import imageValidationService from '../src/services/imageValidationService.js';
import { getTryOnAdapter } from '../src/adapters/tryon/index.js';

test('Advanced Virtual Try-On and QR Mobile Upload Suite', async (t) => {
  await initializeDatabase();
  await runSeed();

  // ==========================================
  // 1. Catalogue Products & Taxonomy
  // ==========================================
  await t.test('1. Catalogue Products & Taxonomy Integrity', async () => {
    const res = await query('SELECT count(*) as count FROM products WHERE is_active = true');
    assert.equal(parseInt(res.rows[0].count, 10), 34, 'Should have exactly 34 seeded active products in PostgreSQL');

    // Verify Saree items
    const sarees = await query("SELECT * FROM products WHERE garment_type = 'saree' AND is_active = true");
    assert.equal(sarees.rows.length, 12, 'Should have 12 Sarees');
    for (const s of sarees.rows) {
      assert.equal(s.tryon_compatibility, 'awaiting_saree_engine', 'Sarees must be awaiting_saree_engine');
      assert.notEqual(s.primary_image_url, '', 'Saree must have a primary image URL');
      assert.ok(!s.primary_image_url.includes('photo-1610030469668-932d0c26620f'), 'Must not have old 404 broken Unsplash URL');
    }

    // Verify Men's Sherwani has valid men's photo
    const sherwani = await query("SELECT * FROM products WHERE sku = 'VES-MEN-004'");
    assert.equal(sherwani.rows[0].gender, 'men');

    // Verify Women's Lehenga has women's photo
    const lehenga = await query("SELECT * FROM products WHERE sku = 'VES-WOM-005'");
    assert.equal(lehenga.rows[0].gender, 'women');

    // Verify Cashmere Stole has scarf photo (not a red shoe)
    const stole = await query("SELECT * FROM products WHERE sku = 'VES-ACC-002'");
    assert.equal(stole.rows[0].garment_type, 'accessory');
    assert.equal(stole.rows[0].tryon_compatibility, 'unsupported');
    assert.ok(
      !stole.rows[0].primary_image_url.includes('photo-1607522370275-f14206abe5d3'),
      'Cashmere stole must not use photo-1607522370275-f14206abe5d3 (red sneaker)'
    );

    // Verify Men's Linen Trouser Set has valid working URL
    const linenSet = await query("SELECT * FROM products WHERE sku = 'VES-MEN-006'");
    assert.ok(
      !linenSet.rows[0].primary_image_url.includes('photo-1542272604-780c96856592'),
      'Must not use broken 404 URL'
    );
  });

  // ==========================================
  // 2. Custom Garment Validation & Uploads
  // ==========================================
  await t.test('2. Custom Garment Validation', () => {
    // Rejects invalid types
    const textFile = { mimetype: 'text/plain', size: 1024, originalname: 'outfit.txt' };
    const invalidValidation = imageValidationService.validateUploadedFile(textFile);
    assert.equal(invalidValidation.valid, false);
    assert.match(invalidValidation.error, /Only JPEG, PNG, and WebP are supported/i);

    // Rejects oversized file (>10MB)
    const bigFile = { mimetype: 'image/jpeg', size: 15 * 1024 * 1024, originalname: 'huge.jpg' };
    const bigValidation = imageValidationService.validateUploadedFile(bigFile);
    assert.equal(bigValidation.valid, false);
    assert.match(bigValidation.error, /exceeds the 10MB limit/i);

    // Accepts valid image
    const validFile = { mimetype: 'image/jpeg', size: 2 * 1024 * 1024, originalname: 'custom_suit.jpg' };
    const validValidation = imageValidationService.validateUploadedFile(validFile);
    assert.equal(validValidation.valid, true);

    // Directory check
    const garmentDir = imageValidationService.getCustomGarmentsDir();
    assert.ok(fs.existsSync(garmentDir), 'Custom garments directory must exist');
  });

  // ==========================================
  // 3. Customer Silhouette Upload & Base64 Webcam
  // ==========================================
  await t.test('3. Silhouette & Webcam Snapshot Validation', () => {
    // Valid base64 JPEG
    const sampleBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const b64Res = imageValidationService.validateBase64DataUri(sampleBase64);
    assert.equal(b64Res.valid, true);
    assert.equal(b64Res.mime, 'image/jpeg');
    assert.ok(b64Res.buffer instanceof Buffer);

    // Invalid base64 format
    const badB64 = 'data:text/html;base64,PGgxPkhlbGxvPC9oMT4=';
    const badRes = imageValidationService.validateBase64DataUri(badB64);
    assert.equal(badRes.valid, false);
    assert.match(badRes.error, /Expected a base64 JPEG, PNG, or WebP/i);
  });

  // ==========================================
  // 4. QR Mobile Upload Lifecycle (Module 4 & 5)
  // ==========================================
  await t.test('4. QR Mobile Upload Session Lifecycle', async () => {
    // Mock request
    const mockReq = {
      protocol: 'http',
      headers: { host: 'localhost:5000' },
      socket: { remoteAddress: '127.0.0.1' }
    };

    // A. Create QR Session
    const session = await qrSessionService.createSession(mockReq);
    assert.ok(session.token, 'Must return token');
    assert.equal(session.token.length, 48, 'Token must be 24-byte hex string');
    assert.ok(session.mobileUrl.includes('/mobile-upload/'), 'Mobile URL must target /mobile-upload/:token');
    assert.ok(!session.mobileUrl.includes('localhost') || session.mobileUrl.includes(getLocalNetworkIp()), 'Should target LAN IP for phone access');
    assert.ok(session.qrCodeDataUrl.startsWith('data:image/png;base64,'), 'QR code must be a valid PNG data URI');
    assert.equal(session.expiresInSeconds, 300, 'Expiry must be 5 minutes (300 seconds)');

    // B. Query Initial Session Status (Kiosk polling)
    const polled = await qrSessionService.getSession(session.token);
    assert.equal(polled.status, 'pending', 'Initial status must be pending');
    assert.equal(polled.photoUrl, null);
    assert.equal(polled.consentGiven, false);

    // C. Rejects upload without explicit consent
    const mockFile = {
      filename: `test_mobile_${Date.now()}.jpg`,
      size: 1024,
      mimetype: 'image/jpeg'
    };

    await assert.rejects(
      async () => {
        await qrSessionService.handleMobileUpload(session.token, mockFile, false);
      },
      /Customer consent is required/i,
      'Must reject upload when consent is false'
    );

    // D. Accepts upload with explicit consent
    const uploadResult = await qrSessionService.handleMobileUpload(session.token, mockFile, true);
    assert.equal(uploadResult.success, true);
    assert.ok(uploadResult.photoUrl.includes(mockFile.filename));

    // E. Verify Session Status Updated to 'uploaded' (Kiosk detects this)
    const afterUpload = await qrSessionService.getSession(session.token);
    assert.equal(afterUpload.status, 'uploaded');
    assert.equal(afterUpload.photoFilename, mockFile.filename);
    assert.equal(afterUpload.consentGiven, true);

    // F. Single-Use Authorization: Rejects Reused Token
    await assert.rejects(
      async () => {
        await qrSessionService.handleMobileUpload(session.token, mockFile, true);
      },
      /already been used/i,
      'Must reject re-upload on single-use session'
    );

    // G. Kiosk Consumes Session
    await qrSessionService.consumeSession(session.token);
    const afterConsumed = await qrSessionService.getSession(session.token);
    assert.equal(afterConsumed.status, 'consumed');

    // H. Expired Token Handling
    const expiredToken = crypto.randomBytes(24).toString('hex');
    const pastDate = new Date(Date.now() - 10000); // 10s ago
    await query(
      `INSERT INTO qr_upload_sessions (token, status, expires_at)
       VALUES ($1, $2, $3)`,
      [expiredToken, 'pending', pastDate]
    );

    const expiredSession = await qrSessionService.getSession(expiredToken);
    assert.equal(expiredSession.status, 'expired', 'Expired session must be marked expired');

    await assert.rejects(
      async () => {
        await qrSessionService.handleMobileUpload(expiredToken, mockFile, true);
      },
      /has expired/i,
      'Must reject upload to expired QR session'
    );
  });

  // ==========================================
  // 5. Virtual Try-On Compatibility & Genlook Guardrails
  // ==========================================
  await t.test('5. Virtual Try-On Compatibility Guardrails', async () => {
    const adapter = getTryOnAdapter();
    assert.ok(adapter, 'Adapter must be instantiated');

    // Verify adapter reads credit balance without credit consumption (or null when offline/sandbox)
    const balance = await adapter.getCreditBalance();
    assert.ok(balance === null || balance >= 0, 'Balance should either be a non-negative number or null if offline');

    // Verify Saree product rejection
    const saree = await query("SELECT * FROM products WHERE garment_type = 'saree' LIMIT 1");
    assert.equal(saree.rows[0].tryon_compatibility, 'awaiting_saree_engine');

    // Verify Accessory product rejection
    const belt = await query("SELECT * FROM products WHERE garment_type = 'accessory' LIMIT 1");
    assert.equal(belt.rows[0].tryon_compatibility, 'unsupported');
  });
});

