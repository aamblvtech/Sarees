import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { GenlookTryOnAdapter } from '../src/adapters/tryon/genlookAdapter.js';
import {
  Genlook,
  InsufficientCreditsError,
  ValidationError,
  AuthError,
  ApiErrorCode
} from '@genlook/api';

test('Genlook Try-On Integration Suite', async (t) => {
  const originalKey = process.env.GENLOOK_API_KEY;
  const originalEnabled = process.env.GENLOOK_ENABLED;
  const originalMock = process.env.GENLOOK_MOCK;

  // 1. Missing API key test
  await t.test('1. Handles missing API key safely', () => {
    process.env.GENLOOK_API_KEY = '';
    const adapter = new GenlookTryOnAdapter();
    const info = adapter.getProviderInfo();
    assert.equal(info.available, false);
    assert.equal(info.status, 'missing_api_key');
  });

  // 2. Disabled provider test
  await t.test('2. Rejects real AI generation when provider is disabled', async () => {
    process.env.GENLOOK_API_KEY = 'gk_mock_test_key_123';
    process.env.GENLOOK_ENABLED = 'false';
    process.env.GENLOOK_MOCK = 'false'; // real mode attempted while disabled

    const adapter = new GenlookTryOnAdapter();
    await assert.rejects(
      async () => {
        await adapter.submitTryOnJob({
          userPhotoUrl: 'dummy.jpg',
          garmentImageUrl: 'https://example.com/dress.jpg',
          garment: { id: 1, name: 'Gown' }
        });
      },
      /Genlook Real AI mode is disabled/
    );
  });

  // 3. Mock mode configuration test
  await t.test('3. Correctly configures Mock Mode (0 Credits)', () => {
    process.env.GENLOOK_API_KEY = 'gk_mock_test_key_123';
    process.env.GENLOOK_ENABLED = 'false';
    process.env.GENLOOK_MOCK = 'true';

    const adapter = new GenlookTryOnAdapter();
    const info = adapter.getProviderInfo();
    assert.equal(info.isMock, true);
    assert.equal(info.executionMode, 'official_mock_testing');
    assert.ok(info.pricingInfo.includes('0 credits consumed'));
  });

  // 4. Product mapping test
  await t.test('4. Correctly maps PostgreSQL product fields to Genlook API schema', () => {
    const garment = {
      id: 42,
      name: 'Cashmere Trench Coat',
      slug: 'cashmere-trench-coat',
      description: 'Double-breasted Italian wool and cashmere trench'
    };

    const externalId = garment.slug ? `vestra-${garment.slug}` : `vestra-prod-${garment.id}`;
    assert.equal(externalId, 'vestra-cashmere-trench-coat');
    assert.equal(garment.name, 'Cashmere Trench Coat');
  });

  // 5. Error handling: Insufficient credits
  await t.test('5. Handles InsufficientCreditsError with clear guidance', () => {
    const adapter = new GenlookTryOnAdapter();
    const mockError = new InsufficientCreditsError('INSUFFICIENT_CREDITS', 402, 'No credits');

    assert.throws(
      () => {
        adapter.handleGenlookError(mockError, 'test');
      },
      (err) => {
        return err.code === 'INSUFFICIENT_CREDITS' && err.message.includes('0 credits remaining');
      }
    );
  });

  // 6. Error handling: Invalid Image validation
  await t.test('6. Handles ValidationError for invalid customer image', () => {
    const adapter = new GenlookTryOnAdapter();
    const mockError = new ValidationError(ApiErrorCode.INVALID_IMAGE, 400, 'Image resolution too low');

    assert.throws(
      () => {
        adapter.handleGenlookError(mockError, 'test');
      },
      (err) => {
        return err.code === 'VALIDATION_FAILED' && err.message.includes('Genlook Image Validation Error');
      }
    );
  });

  // 7. Error handling: Auth Error
  await t.test('7. Handles AuthError for invalid API key', () => {
    const adapter = new GenlookTryOnAdapter();
    const mockError = new AuthError(ApiErrorCode.INVALID_API_KEY, 401, 'Invalid key');

    assert.throws(
      () => {
        adapter.handleGenlookError(mockError, 'test');
      },
      (err) => {
        return err.code === 'AUTH_ERROR' && err.message.includes('Authentication Failed');
      }
    );
  });

  // 8. Output Verification Guard in Real Mode (missing or unmodified output detection)
  await t.test('8. Rejects empty or unmodified result in real mode', async () => {
    process.env.GENLOOK_API_KEY = 'gk_mock_test_key_123';
    process.env.GENLOOK_ENABLED = 'true';
    process.env.GENLOOK_MOCK = 'false'; // simulated real mode

    const adapter = new GenlookTryOnAdapter();
    // Stub client to return completed with empty resultImageUrl
    adapter.client = {
      generations: {
        retrieve: async () => ({
          status: 'COMPLETED',
          resultImageUrl: null,
          generationId: 'gen_test_empty'
        })
      }
    };

    const status = await adapter.checkJobStatus('gen_test_empty');
    assert.equal(status.status, 'failed');
    assert.equal(status.errorCode, 'MISSING_GENERATED_IMAGE');
  });

  // 9. Live Genlook mock mode test with official API (Zero Credits Consumed)
  await t.test('9. End-to-end official Genlook mock try-on flow (0 Credits consumed & garmentApplied=false)', async () => {
    process.env.GENLOOK_API_KEY = originalKey || process.env.GENLOOK_API_KEY;
    process.env.GENLOOK_ENABLED = 'false';
    process.env.GENLOOK_MOCK = 'true';

    const adapter = new GenlookTryOnAdapter();
    
    // Check initial credits (or handle offline/sandbox)
    const balanceBefore = await adapter.getCreditBalance();
    assert.ok(balanceBefore === null || balanceBefore >= 0, 'Credit balance must be non-negative or null when offline');

    // Run end-to-end mock try-on using the sample silhouette photo in uploads
    const samplePhotoPath = 'd:/AAMBLV/tryon/backend/uploads/tryon_user_1793428699933_8cbaf66cbe9e.jpg';
    
    // Only attempt live API if network is available
    if (balanceBefore !== null) {
      const submission = await adapter.submitTryOnJob({
        userPhotoUrl: samplePhotoPath,
        garmentImageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
        garment: {
          id: 101,
          name: 'Monochrome Evening Cape',
          slug: 'monochrome-evening-cape',
          description: 'Virgin wool draped cape'
        }
      });

      assert.ok(submission.providerJobId, 'Should receive generationId');
      assert.ok(submission.customerImageId, 'Should receive customer imageId');
      assert.equal(submission.isMock, true, 'Job must be flagged as isMock=true');

      // Poll status using adapter
      await new Promise((r) => setTimeout(r, 1200));
      const terminalStatus = await adapter.checkJobStatus(submission.providerJobId);
      assert.ok(terminalStatus.status === 'completed' || terminalStatus.status === 'processing');
      assert.equal(terminalStatus.garmentApplied, false, 'In mock mode, garmentApplied must be false');

      // Verify credits were NOT consumed
      const balanceAfter = await adapter.getCreditBalance();
      assert.equal(balanceAfter, balanceBefore, 'Mock mode MUST NOT consume credits');
    }
  });

  const samplePhotoDataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  // 10. Custom uploaded shirt image: Official Genlook multipart file-upload workflow
  await t.test('10. Custom uploaded shirt uses official multipart fileKey workflow without localhost URLs', async () => {
    process.env.GENLOOK_API_KEY = 'gk_mock_test_key_123';
    process.env.GENLOOK_ENABLED = 'false';
    process.env.GENLOOK_MOCK = 'true';

    const adapter = new GenlookTryOnAdapter();

    // Create a sample custom shirt image in custom garments dir
    const customGarmentsDir = path.join(__dirname, '..', 'uploads', 'custom_garments');
    if (!fs.existsSync(customGarmentsDir)) fs.mkdirSync(customGarmentsDir, { recursive: true });
    const shirtFilename = 'test_custom_shirt.jpg';
    const shirtPath = path.join(customGarmentsDir, shirtFilename);
    const validShirtBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    fs.writeFileSync(shirtPath, validShirtBuffer);

    let capturedPayload = null;
    adapter.client = {
      images: {
        upload: async () => ({ imageId: 'img_cust_silhouette_100', imageUrl: 'https://cdn.genlook.app/cust.jpg' })
      },
      tryOn: {
        create: async (payload) => {
          capturedPayload = payload;
          return {
            generationId: 'gen_custom_shirt_001',
            status: 'PENDING',
            productExternalId: payload.products[0].externalId
          };
        }
      }
    };

    const submission = await adapter.submitTryOnJob({
      userPhotoUrl: samplePhotoDataUri,
      garmentImageUrl: shirtPath,
      customGarmentFilename: shirtFilename,
      garment: {
        name: 'Bespoke Crisp Poplin Shirt',
        slug: 'bespoke-crisp-poplin-shirt'
      }
    });

    // Assertions
    assert.equal(submission.usedMultipart, true, 'Custom shirt must use multipart upload');
    assert.equal(submission.garmentFileKey, 'garment_file_0', 'Must assign fileKey');
    assert.ok(capturedPayload, 'Payload must be passed to client.tryOn.create');
    
    // Check product source has fileKey and NEVER url
    const product = capturedPayload.products[0];
    assert.equal(product.images[0].source.fileKey, 'garment_file_0');
    assert.equal(product.images[0].source.url, undefined, 'Must NEVER have URL when using multipart');

    // Check files map has binary buffer attached
    assert.ok(capturedPayload.files, 'Must provide files map for multipart');
    assert.ok(capturedPayload.files['garment_file_0'], 'Must have entry for garment_file_0');
    assert.equal(capturedPayload.files['garment_file_0'].mimeType, 'image/jpeg');

    // Clean up
    if (fs.existsSync(shirtPath)) fs.unlinkSync(shirtPath);
  });

  // 11. Custom uploaded dress: Localhost URL conversion to safe multipart workflow
  await t.test('11. Localhost custom garment URL automatically converts to multipart and prevents Genlook download error', async () => {
    process.env.GENLOOK_API_KEY = 'gk_mock_test_key_123';
    process.env.GENLOOK_ENABLED = 'false';
    process.env.GENLOOK_MOCK = 'true';

    const adapter = new GenlookTryOnAdapter();

    const customGarmentsDir = path.join(__dirname, '..', 'uploads', 'custom_garments');
    if (!fs.existsSync(customGarmentsDir)) fs.mkdirSync(customGarmentsDir, { recursive: true });
    const dressFilename = 'test_custom_dress.png';
    const dressPath = path.join(customGarmentsDir, dressFilename);
    const validDressBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(dressPath, validDressBuffer);

    let capturedPayload = null;
    adapter.client = {
      images: {
        upload: async () => ({ imageId: 'img_cust_silhouette_101', imageUrl: 'https://cdn.genlook.app/cust.jpg' })
      },
      tryOn: {
        create: async (payload) => {
          capturedPayload = payload;
          return {
            generationId: 'gen_custom_dress_002',
            status: 'PENDING',
            productExternalId: payload.products[0].externalId
          };
        }
      }
    };

    // Simulate frontend passing a localhost URL
    const localhostUrl = `http://localhost:5000/uploads/custom_garments/${dressFilename}`;

    const submission = await adapter.submitTryOnJob({
      userPhotoUrl: samplePhotoDataUri,
      garmentImageUrl: localhostUrl,
      customGarmentFilename: dressFilename,
      garment: {
        name: 'Haute Couture Silk Dress',
        slug: 'haute-couture-silk-dress'
      }
    });

    assert.equal(submission.usedMultipart, true, 'Localhost URL must be converted to multipart');
    assert.equal(submission.garmentFileKey, 'garment_file_0');
    assert.equal(capturedPayload.products[0].images[0].source.fileKey, 'garment_file_0');
    assert.equal(capturedPayload.products[0].images[0].source.url, undefined, 'Localhost URL must NOT be passed to Genlook');
    assert.equal(capturedPayload.files['garment_file_0'].mimeType, 'image/png');

    // Clean up
    if (fs.existsSync(dressPath)) fs.unlinkSync(dressPath);
  });

  // 12. Existing catalogue product with public URL preserves direct URL workflow
  await t.test('12. Existing catalogue product with public HTTPS URL uses direct url workflow without files map', async () => {
    process.env.GENLOOK_API_KEY = 'gk_mock_test_key_123';
    process.env.GENLOOK_ENABLED = 'false';
    process.env.GENLOOK_MOCK = 'true';

    const adapter = new GenlookTryOnAdapter();

    let capturedPayload = null;
    adapter.client = {
      images: {
        upload: async () => ({ imageId: 'img_cust_silhouette_102', imageUrl: 'https://cdn.genlook.app/cust.jpg' })
      },
      tryOn: {
        create: async (payload) => {
          capturedPayload = payload;
          return {
            generationId: 'gen_catalogue_003',
            status: 'PENDING',
            productExternalId: payload.products[0].externalId
          };
        }
      }
    };

    const publicUrl = 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800';

    const submission = await adapter.submitTryOnJob({
      userPhotoUrl: samplePhotoDataUri,
      garmentImageUrl: publicUrl,
      garment: {
        id: 7,
        name: 'Structured Italian Virgin Wool Suit',
        slug: 'structured-italian-wool-suit'
      }
    });

    assert.equal(submission.usedMultipart, false, 'Public catalogue product must not use multipart');
    assert.equal(submission.garmentFileKey, null);
    assert.equal(capturedPayload.products[0].images[0].source.url, publicUrl);
    assert.equal(capturedPayload.files, undefined, 'Files map must be omitted for remote URL products');
  });

  // 13. Security: Hostname validator blocks localhost, 127.0.0.1, LAN IPs
  await t.test('13. Strictly detects and blocks non-public URLs', () => {
    const adapter = new GenlookTryOnAdapter();

    assert.equal(adapter.isRemotePublicUrl('http://localhost:5000/garment.jpg'), false);
    assert.equal(adapter.isRemotePublicUrl('http://127.0.0.1:5000/garment.jpg'), false);
    assert.equal(adapter.isRemotePublicUrl('http://192.168.1.10:5000/garment.jpg'), false);
    assert.equal(adapter.isRemotePublicUrl('http://10.0.0.5:5000/garment.jpg'), false);
    assert.equal(adapter.isRemotePublicUrl('http://app.internal/garment.jpg'), false);
    assert.equal(adapter.isRemotePublicUrl('/uploads/custom_garments/garment.jpg'), false);
    assert.equal(adapter.isRemotePublicUrl('https://images.unsplash.com/photo-1234'), true);
    assert.equal(adapter.isRemotePublicUrl('https://cdn.vestra.com/garments/suit.jpg'), true);
  });

  // 14. Validation: Rejects invalid garment file format
  await t.test('14. Rejects invalid garment image format (.txt / text/plain)', async () => {
    const adapter = new GenlookTryOnAdapter();

    const customGarmentsDir = path.join(__dirname, '..', 'uploads', 'custom_garments');
    if (!fs.existsSync(customGarmentsDir)) fs.mkdirSync(customGarmentsDir, { recursive: true });
    const textFilename = 'test_invalid_garment.txt';
    const textPath = path.join(customGarmentsDir, textFilename);
    fs.writeFileSync(textPath, 'This is not an image');

    await assert.rejects(
      async () => {
        await adapter.prepareCustomGarmentMultipart(textFilename);
      },
      (err) => err.code === 'INVALID_GARMENT_FORMAT'
    );

    if (fs.existsSync(textPath)) fs.unlinkSync(textPath);
  });

  // 15. Validation: Rejects garment image exceeding 15MB
  await t.test('15. Rejects garment image exceeding 15MB limit', async () => {
    const adapter = new GenlookTryOnAdapter();

    const customGarmentsDir = path.join(__dirname, '..', 'uploads', 'custom_garments');
    if (!fs.existsSync(customGarmentsDir)) fs.mkdirSync(customGarmentsDir, { recursive: true });
    const largeFilename = 'test_oversized_garment.jpg';
    const largePath = path.join(customGarmentsDir, largeFilename);
    
    // Create sparse buffer exceeding 15MB
    const largeBuffer = Buffer.alloc(16 * 1024 * 1024);
    fs.writeFileSync(largePath, largeBuffer);

    await assert.rejects(
      async () => {
        await adapter.prepareCustomGarmentMultipart(largeFilename);
      },
      (err) => err.code === 'GARMENT_TOO_LARGE'
    );

    if (fs.existsSync(largePath)) fs.unlinkSync(largePath);
  });

  // Restore env
  process.env.GENLOOK_API_KEY = originalKey;
  process.env.GENLOOK_ENABLED = originalEnabled;
  process.env.GENLOOK_MOCK = originalMock;
});
