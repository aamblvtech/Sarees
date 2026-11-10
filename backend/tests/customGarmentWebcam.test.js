import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
process.env.GENLOOK_MOCK = 'true';

import imageValidationService from '../src/services/imageValidationService.js';
import { GenlookTryOnAdapter } from '../src/adapters/tryon/genlookAdapter.js';

// Helper to create synthetic PNG buffer with exact dimensions
function createSyntheticPngBuffer(width, height) {
  const buf = Buffer.alloc(24);
  buf[0] = 0x89; buf[1] = 0x50; buf[2] = 0x4E; buf[3] = 0x47;
  buf[4] = 0x0D; buf[5] = 0x0A; buf[6] = 0x1A; buf[7] = 0x0A;
  buf.writeUInt32BE(13, 8);
  buf.write('IHDR', 12, 4, 'ascii');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

test('Webcam Custom Outfit Capture and Try-On Integration Suite', async (t) => {

  // 1. Image Dimension Parser & Quality Guardrails
  await t.test('1. Dimension parsing and minimum resolution eligibility gate', () => {
    // Standard high-res webcam frame (1080x1440)
    const validBuf = createSyntheticPngBuffer(1080, 1440);
    const parsedValid = imageValidationService.parseImageDimensions(validBuf);
    assert.ok(parsedValid, 'Should successfully parse PNG dimensions');
    assert.equal(parsedValid.width, 1080);
    assert.equal(parsedValid.height, 1440);
    assert.ok(parsedValid.width >= 250 && parsedValid.height >= 250, 'Meets technical eligibility gate');

    // Undersized 180x200 frame (below 250x250 minimum)
    const smallBuf = createSyntheticPngBuffer(180, 200);
    const parsedSmall = imageValidationService.parseImageDimensions(smallBuf);
    assert.ok(parsedSmall);
    assert.equal(parsedSmall.width, 180);
    assert.equal(parsedSmall.height, 200);
    assert.ok(parsedSmall.width < 250 || parsedSmall.height < 250, 'Properly flagged as undersized');
  });

  // 2. Base64 Webcam Data URI Validation
  await t.test('2. Base64 Data URI decoding and MIME enforcement', () => {
    const validBuf = createSyntheticPngBuffer(800, 1000);
    const validDataUri = `data:image/png;base64,${validBuf.toString('base64')}`;
    const base64Res = imageValidationService.validateBase64DataUri(validDataUri);
    assert.equal(base64Res.valid, true);
    assert.equal(base64Res.mime, 'image/png');
    assert.ok(base64Res.buffer instanceof Buffer);
    assert.equal(base64Res.buffer.length, 24);

    // Corrupt or non-image string
    const invalidRes = imageValidationService.validateBase64DataUri('not-a-data-uri');
    assert.equal(invalidRes.valid, false);
    assert.ok(invalidRes.error.includes('Expected a base64 JPEG, PNG, or WebP'));

    // Missing string
    const emptyRes = imageValidationService.validateBase64DataUri(null);
    assert.equal(emptyRes.valid, false);
  });

  // 3. Storage and file system isolation for custom garments
  await t.test('3. Captured garment storage directory isolation', () => {
    const customDir = imageValidationService.getCustomGarmentsDir();
    assert.ok(fs.existsSync(customDir), 'custom_garments directory must exist');
    assert.ok(customDir.endsWith('custom_garments'), 'Path must target custom_garments upload directory');

    // Test writing and reading synthetic captured garment
    const testFilename = `test_cam_garment_${Date.now()}.png`;
    const testPath = path.join(customDir, testFilename);
    const pngBuf = createSyntheticPngBuffer(1024, 1280);
    fs.writeFileSync(testPath, pngBuf);

    assert.ok(fs.existsSync(testPath));
    const readBuf = fs.readFileSync(testPath);
    const dims = imageValidationService.parseImageDimensions(readBuf);
    assert.equal(dims.width, 1024);
    assert.equal(dims.height, 1280);

    // Clean up
    fs.unlinkSync(testPath);
  });

  // 4. Custom Garment Multipart fileKey Try-On Workflow
  await t.test('4. Genlook Adapter executes try-on with custom garment using multipart fileKey', async () => {
    const adapter = new GenlookTryOnAdapter();

    // Create a temporary mock captured garment file
    const customDir = imageValidationService.getCustomGarmentsDir();
    const mockGarmentFilename = `test_garment_${Date.now()}.png`;
    const mockGarmentPath = path.join(customDir, mockGarmentFilename);
    fs.writeFileSync(mockGarmentPath, createSyntheticPngBuffer(1024, 1280));

    try {
      const result = await adapter.processTryOn({
        userPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        userPhotoFilename: 'test_user.jpg',
        customGarmentUrl: `http://localhost:5000/uploads/custom_garments/${mockGarmentFilename}`,
        customGarmentFilename: mockGarmentFilename,
        customGarmentName: 'Webcam Velvet Blazer',
        category: 'upper_body',
        selectedSize: 'M',
        fitPreference: 'tailored'
      });

      assert.ok(result, 'Try-on result must be returned');
      assert.equal(result.success, true);
      assert.ok(result.resultImageUrl, 'Result must include resultImageUrl');
      assert.equal(result.compositeDetails.isMock, true, 'Mock adapter should be safely used');
      assert.ok(result.fitScore >= 0, 'Fit score must be computed');
    } finally {
      try { fs.unlinkSync(mockGarmentPath); } catch {}
    }
  });

  // 5. Customer photo and garment image separation
  await t.test('5. Customer photo and garment image remain strictly separated', () => {
    const customerUploadsDir = imageValidationService.getUploadsDir();
    const customGarmentsDir = imageValidationService.getCustomGarmentsDir();

    assert.notEqual(customerUploadsDir, customGarmentsDir, 'Customer photos and garments must have distinct storage directories');
    assert.ok(customerUploadsDir.includes('customer_silhouettes'));
    assert.ok(customGarmentsDir.includes('custom_garments'));
  });
});
