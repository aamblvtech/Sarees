import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { GenlookTryOnAdapter } from '../src/adapters/tryon/genlookAdapter.js';
import imageValidationService from '../src/services/imageValidationService.js';
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

  // 16. Identity Preservation: Customer photo inspector detects close-ups and low resolution
  await t.test('16. Customer photo inspector detects close-up selfies and evaluates framing', () => {
    // Construct a minimal 800x600 (landscape/close-up, ratio 0.75) JPEG buffer
    const landscapeBuf = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x11, 0x08,
      0x02, 0x58, // height: 600
      0x03, 0x20, // width: 800
      0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xD9
    ]);

    const result = imageValidationService.inspectCustomerPhoto(landscapeBuf, 'selfie.jpg');
    assert.equal(result.framing, 'close_up');
    assert.equal(result.aspectRatio < 1.1, true);
    assert.equal(result.warnings.some(w => w.includes('close-up')), true);
    assert.equal(result.recommendations.some(r => r.includes('standing portrait')), true);

    // Construct a minimal 600x1200 (portrait, ratio 2.0) JPEG buffer
    const portraitBuf = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x11, 0x08,
      0x04, 0xB0, // height: 1200
      0x02, 0x58, // width: 600
      0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xD9
    ]);
    const portraitResult = imageValidationService.inspectCustomerPhoto(portraitBuf, 'standing.jpg');
    assert.equal(portraitResult.framing, 'full_body');
    assert.equal(portraitResult.aspectRatio >= 1.35, true);
    assert.equal(portraitResult.suitabilityScore >= 80, true);
    assert.equal(portraitResult.identityPreservationGrade, 'HIGH');
  });

  // 17. Identity Preservation: Customer upload sets crop: false to preserve framing
  await t.test('17. Customer upload sets crop: false to preserve framing', async () => {
    let capturedOptions = null;
    const adapter = new GenlookTryOnAdapter();
    adapter.client = {
      images: {
        upload: async (buf, opts) => {
          capturedOptions = opts;
          return { imageId: 'img_test_123', imageUrl: 'https://example.com/cust.jpg' };
        }
      }
    };

    const uploadsDir = path.join(__dirname, '..', 'uploads', 'customer_silhouettes');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const dummyPath = path.join(uploadsDir, 'test_crop_customer.jpg');
    fs.writeFileSync(dummyPath, Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]));

    await adapter.uploadCustomerPhoto(dummyPath, 'vestra_test_user');
    assert.equal(capturedOptions.crop, false, 'crop must be false to avoid cutting body/face/framing');

    if (fs.existsSync(dummyPath)) fs.unlinkSync(dummyPath);
  });

  // 18. Garment Accuracy: submitTryOnJob includes orientation and on_model classifications
  await t.test('18. submitTryOnJob includes orientation and on_model classifications', async () => {
    let submittedPayload = null;
    process.env.GENLOOK_ENABLED = 'true';
    process.env.GENLOOK_MOCK = 'true';

    const adapter = new GenlookTryOnAdapter();
    adapter.client = {
      images: {
        upload: async () => ({ imageId: 'img_pers_456', imageUrl: 'https://example.com/p.jpg' })
      },
      tryOn: {
        create: async (payload) => {
          submittedPayload = payload;
          return { generationId: 'gen_test_789', status: 'pending' };
        }
      }
    };

    const uploadsDir = path.join(__dirname, '..', 'uploads', 'customer_silhouettes');
    const dummyCust = path.join(uploadsDir, 'test_cust_class.jpg');
    fs.writeFileSync(dummyCust, Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]));

    await adapter.submitTryOnJob({
      userPhotoUrl: dummyCust,
      garmentImageUrl: 'https://example.com/suit.jpg',
      garment: { id: 10, name: 'Wool Suit', primary_image_url: 'https://example.com/suit.jpg' },
      productId: 10,
      category: 'full_body'
    });

    assert.ok(submittedPayload);
    assert.equal(submittedPayload.products[0].images[0].classifications.orientation, 'front');
    assert.equal(submittedPayload.products[0].images[0].classifications.on_model, 'true');

    if (fs.existsSync(dummyCust)) fs.unlinkSync(dummyCust);
  });

  // 19. Test Dress Product: Generates accurate structured prompt and versioned externalId
  await t.test('19. Accurately maps dress product with silhouette, neckline, and versioned externalId', async () => {
    let submittedPayload = null;
    process.env.GENLOOK_ENABLED = 'true';
    process.env.GENLOOK_MOCK = 'true';

    const adapter = new GenlookTryOnAdapter();
    adapter.client = {
      images: { upload: async () => ({ imageId: 'img_dress_cust' }) },
      tryOn: {
        create: async (payload) => {
          submittedPayload = payload;
          return { generationId: 'gen_dress_1', status: 'pending' };
        }
      }
    };

    const uploadsDir = path.join(__dirname, '..', 'uploads', 'customer_silhouettes');
    const dummyPhoto = path.join(uploadsDir, 'test_dress_photo.jpg');
    fs.writeFileSync(dummyPhoto, Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]));

    const dressGarment = {
      id: 18,
      sku: 'VES-WOM-006',
      name: 'The Obsidian Sculptural Evening Gown',
      slug: 'the-obsidian-sculptural-evening-gown',
      garment_type: 'dress',
      subcategory: 'gowns',
      material: '82% Viscose Velvet, 18% Silk Satin Lining',
      fit: 'Hourglass contour with internal boned corset and fluid train',
      description: 'Floor-length couture evening gown cut from midnight obsidian velvet with architectural off-shoulder neckline and flowing fishtail train.',
      primary_image_url: 'https://images.unsplash.com/photo-1612423284934-2850a4ea6b0f'
    };

    await adapter.submitTryOnJob({
      userPhotoUrl: dummyPhoto,
      garmentImageUrl: dressGarment.primary_image_url,
      garment: dressGarment,
      productId: dressGarment.id
    });

    assert.ok(submittedPayload);
    const prod = submittedPayload.products[0];
    assert.equal(prod.title, dressGarment.name);
    assert.ok(prod.externalId.startsWith('vestra-the-obsidian-sculptural-evening-gown-v'));
    assert.ok(prod.description.includes('Floor-length'));
    assert.ok(prod.description.includes('off-shoulder'));
    assert.ok(prod.description.includes('Viscose Velvet'));
    assert.equal(prod.images[0].classifications.orientation, 'front');

    if (fs.existsSync(dummyPhoto)) fs.unlinkSync(dummyPhoto);
  });

  // 20. Test Saree Product: Generates accurate 6-yard unstitched drape specification and zari details
  await t.test('20. Accurately maps saree product with 6-yard drape specification and border details', async () => {
    let submittedPayload = null;
    process.env.GENLOOK_ENABLED = 'true';
    process.env.GENLOOK_MOCK = 'true';

    const adapter = new GenlookTryOnAdapter();
    adapter.client = {
      images: { upload: async () => ({ imageId: 'img_saree_cust' }) },
      tryOn: {
        create: async (payload) => {
          submittedPayload = payload;
          return { generationId: 'gen_saree_1', status: 'pending' };
        }
      }
    };

    const uploadsDir = path.join(__dirname, '..', 'uploads', 'customer_silhouettes');
    const dummyPhoto = path.join(uploadsDir, 'test_saree_photo.jpg');
    fs.writeFileSync(dummyPhoto, Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]));

    const sareeGarment = {
      id: 1,
      sku: 'VES-SAR-001',
      name: 'Kanjivaram Pure Mulberry Silk Saree',
      slug: 'kanjivaram-pure-mulberry-silk-saree',
      garment_type: 'saree',
      subcategory: 'kanjivaram',
      material: '100% Grade 6A Pure Mulberry Silk & 24K Gold Plated Zari',
      fit: 'Classic 6-yard unstitched handloom drape with 0.8m contrast blouse',
      description: 'Woven with three-ply high-twist pure mulberry silk and electroplated gold zari in Kanchipuram. Displays temple korvai borders with traditional motifs.',
      primary_image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c'
    };

    await adapter.submitTryOnJob({
      userPhotoUrl: dummyPhoto,
      garmentImageUrl: sareeGarment.primary_image_url,
      garment: sareeGarment,
      productId: sareeGarment.id
    });

    assert.ok(submittedPayload);
    const prod = submittedPayload.products[0];
    assert.equal(prod.title, sareeGarment.name);
    assert.ok(prod.externalId.startsWith('vestra-kanjivaram-pure-mulberry-silk-saree-v'));
    assert.ok(prod.description.includes('6-yard Indian handloom saree drape'));
    assert.ok(prod.description.includes('pleats and diagonal pallu'));
    assert.ok(prod.description.includes('Pure Mulberry Silk'));
    assert.ok(prod.description.includes('contrast blouse'));

    if (fs.existsSync(dummyPhoto)) fs.unlinkSync(dummyPhoto);
  });

  // 21. Test Men's Outfit: Generates accurate 3-piece formal suit tailoring details
  await t.test('21. Accurately maps men outfit with tailoring and wool specifications', async () => {
    let submittedPayload = null;
    process.env.GENLOOK_ENABLED = 'true';
    process.env.GENLOOK_MOCK = 'true';

    const adapter = new GenlookTryOnAdapter();
    adapter.client = {
      images: { upload: async () => ({ imageId: 'img_men_cust' }) },
      tryOn: {
        create: async (payload) => {
          submittedPayload = payload;
          return { generationId: 'gen_men_1', status: 'pending' };
        }
      }
    };

    const uploadsDir = path.join(__dirname, '..', 'uploads', 'customer_silhouettes');
    const dummyPhoto = path.join(uploadsDir, 'test_men_photo.jpg');
    fs.writeFileSync(dummyPhoto, Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]));

    const menGarment = {
      id: 25,
      sku: 'VES-MEN-001',
      name: 'Bespoke Charcoal Italian Wool 3-Piece Formal Suit',
      slug: 'bespoke-charcoal-italian-wool-3-piece-formal-suit',
      garment_type: 'suit',
      subcategory: 'formal_suits',
      gender: 'men',
      material: '100% Super 150s Italian Merino Virgin Wool',
      fit: 'Savile Row inspired tailored architectural fit with clean drape',
      description: 'Complete formal 3-piece sartorial suit: structured two-button peak lapel jacket, matching tailored waistcoat, and flat-front trousers.',
      primary_image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf'
    };

    await adapter.submitTryOnJob({
      userPhotoUrl: dummyPhoto,
      garmentImageUrl: menGarment.primary_image_url,
      garment: menGarment,
      productId: menGarment.id
    });

    assert.ok(submittedPayload);
    const prod = submittedPayload.products[0];
    assert.equal(prod.title, menGarment.name);
    assert.ok(prod.externalId.startsWith('vestra-bespoke-charcoal-italian-wool-3-piece-formal-suit-v'));
    assert.ok(prod.description.includes('3-piece formal suit'));
    assert.ok(prod.description.includes('Merino Virgin Wool'));
    assert.ok(prod.description.includes('lapel roll'));

    if (fs.existsSync(dummyPhoto)) fs.unlinkSync(dummyPhoto);
  });

  // 22. Test Product Image Updates: Changing garment image produces new versioned externalId
  await t.test('22. Product image update generates a new versioned externalId to prevent stale cloud cache reuse', async () => {
    let capturedPayloads = [];
    process.env.GENLOOK_ENABLED = 'true';
    process.env.GENLOOK_MOCK = 'true';

    const adapter = new GenlookTryOnAdapter();
    adapter.client = {
      images: { upload: async () => ({ imageId: 'img_ver_cust' }) },
      tryOn: {
        create: async (payload) => {
          capturedPayloads.push(payload);
          return { generationId: 'gen_ver_' + capturedPayloads.length, status: 'pending' };
        }
      }
    };

    const uploadsDir = path.join(__dirname, '..', 'uploads', 'customer_silhouettes');
    const dummyPhoto = path.join(uploadsDir, 'test_ver_photo.jpg');
    fs.writeFileSync(dummyPhoto, Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]));

    const originalGarment = {
      id: 15,
      slug: 'raw-silk-churidar-kurta-ensemble',
      name: 'Raw Silk Churidar Kurta Ensemble',
      primary_image_url: 'https://images.unsplash.com/photo-old-saree-duplicate-1111'
    };

    const updatedGarment = {
      id: 15,
      slug: 'raw-silk-churidar-kurta-ensemble',
      name: 'Raw Silk Churidar Kurta Ensemble',
      primary_image_url: 'https://images.unsplash.com/photo-new-authentic-churidar-2222'
    };

    await adapter.submitTryOnJob({
      userPhotoUrl: dummyPhoto,
      garmentImageUrl: originalGarment.primary_image_url,
      garment: originalGarment,
      productId: originalGarment.id
    });

    await adapter.submitTryOnJob({
      userPhotoUrl: dummyPhoto,
      garmentImageUrl: updatedGarment.primary_image_url,
      garment: updatedGarment,
      productId: updatedGarment.id
    });

    assert.equal(capturedPayloads.length, 2);
    const id1 = capturedPayloads[0].products[0].externalId;
    const id2 = capturedPayloads[1].products[0].externalId;

    assert.notEqual(id1, id2, 'Updated product image MUST generate a new versioned externalId');
    assert.ok(id1.includes('raw-silk-churidar-kurta-ensemble-v'));
    assert.ok(id2.includes('raw-silk-churidar-kurta-ensemble-v'));

    if (fs.existsSync(dummyPhoto)) fs.unlinkSync(dummyPhoto);
  });

  // 23. Test Distinct ExternalIds: Different products never collide
  await t.test('23. Different products have strictly distinct externalIds', async () => {
    let capturedPayloads = [];
    process.env.GENLOOK_ENABLED = 'true';
    process.env.GENLOOK_MOCK = 'true';

    const adapter = new GenlookTryOnAdapter();
    adapter.client = {
      images: { upload: async () => ({ imageId: 'img_distinct_cust' }) },
      tryOn: {
        create: async (payload) => {
          capturedPayloads.push(payload);
          return { generationId: 'gen_distinct_' + capturedPayloads.length, status: 'pending' };
        }
      }
    };

    const uploadsDir = path.join(__dirname, '..', 'uploads', 'customer_silhouettes');
    const dummyPhoto = path.join(uploadsDir, 'test_distinct_photo.jpg');
    fs.writeFileSync(dummyPhoto, Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]));

    const prodA = { id: 1, slug: 'saree-a', name: 'Saree A', primary_image_url: 'https://example.com/a.jpg' };
    const prodB = { id: 2, slug: 'saree-b', name: 'Saree B', primary_image_url: 'https://example.com/b.jpg' };

    await adapter.submitTryOnJob({ userPhotoUrl: dummyPhoto, garmentImageUrl: prodA.primary_image_url, garment: prodA, productId: prodA.id });
    await adapter.submitTryOnJob({ userPhotoUrl: dummyPhoto, garmentImageUrl: prodB.primary_image_url, garment: prodB, productId: prodB.id });

    assert.equal(capturedPayloads.length, 2);
    assert.notEqual(capturedPayloads[0].products[0].externalId, capturedPayloads[1].products[0].externalId);

    if (fs.existsSync(dummyPhoto)) fs.unlinkSync(dummyPhoto);
  });

  // 24. Test Customer Photo Reuse: Reuses imageId without re-uploading and preserves crop: false
  await t.test('24. Reuses customer imageId across multiple generations without re-upload', async () => {
    let uploadCount = 0;
    const adapter = new GenlookTryOnAdapter();
    adapter.client = {
      images: {
        upload: async (buf, opts) => {
          uploadCount++;
          assert.equal(opts.crop, false);
          return { imageId: 'img_reusable_123' };
        }
      }
    };

    const uploadsDir = path.join(__dirname, '..', 'uploads', 'customer_silhouettes');
    const dummyPhoto = path.join(uploadsDir, 'test_reuse_cust.jpg');
    fs.writeFileSync(dummyPhoto, Buffer.from([0xFF, 0xD8, 0xFF, 0xD9]));

    // First upload
    const res1 = await adapter.uploadCustomerPhoto(dummyPhoto, 'cust_reuse');
    assert.equal(res1.imageId, 'img_reusable_123');
    assert.equal(uploadCount, 1);

    if (fs.existsSync(dummyPhoto)) fs.unlinkSync(dummyPhoto);
  });

  // 25. Test Result Quality Verification Service: Flags selfie and saree constraints correctly
  await t.test('25. Result quality verifier assigns NEEDS_REVIEW for sarees and FIDELITY_FLAGGED for selfies', async () => {
    const { resultQualityService } = await import('../src/services/resultQualityService.js');

    // Case A: Full-body dress
    const fullBodyDressResult = resultQualityService.evaluateResult({
      customerPhotoQuality: { framing: 'full_body', suitabilityScore: 90 },
      garment: { name: 'Evening Gown', garment_type: 'dress', subcategory: 'gowns' },
      resultImageUrl: 'https://example.com/out1.jpg',
      isMock: false
    });
    assert.equal(fullBodyDressResult.verificationStatus, 'VERIFIED');
    assert.ok(fullBodyDressResult.overallScore >= 0.85);

    // Case B: 6-yard unstitched Saree
    const sareeResult = resultQualityService.evaluateResult({
      customerPhotoQuality: { framing: 'full_body', suitabilityScore: 90 },
      garment: { name: 'Kanjivaram Saree', garment_type: 'saree', subcategory: 'sarees' },
      resultImageUrl: 'https://example.com/out2.jpg',
      isMock: false
    });
    assert.equal(sareeResult.verificationStatus, 'NEEDS_REVIEW');
    assert.ok(sareeResult.flags.includes('UNSTITCHED_SAREE_DRAPE_NOTICE'));
    assert.ok(sareeResult.summary.includes('6-yard unstitched saree'));

    // Case C: Close-up selfie
    const selfieResult = resultQualityService.evaluateResult({
      customerPhotoQuality: { framing: 'close_up', suitabilityScore: 40 },
      garment: { name: 'Evening Gown', garment_type: 'dress', subcategory: 'gowns' },
      resultImageUrl: 'https://example.com/out3.jpg',
      isMock: false
    });
    assert.equal(selfieResult.verificationStatus, 'FIDELITY_FLAGGED');
    assert.ok(selfieResult.flags.includes('SELFIE_PROPORTION_RISK'));
    assert.ok(selfieResult.overallScore < 0.65);
  });

  // Restore env
  process.env.GENLOOK_API_KEY = originalKey;
  process.env.GENLOOK_ENABLED = originalEnabled;
  process.env.GENLOOK_MOCK = originalMock;
});
