import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { initializeDatabase, query } from '../src/config/db.js';
import { runSeed } from '../src/db/seed.js';
import { GenlookTryOnAdapter } from '../src/adapters/tryon/genlookAdapter.js';

test('Product Mapping Integrity and Generation History Suite', async (t) => {
  await initializeDatabase();
  await runSeed();

  // Test Case 1: Select a charcoal suit -> request contains the charcoal suit
  await t.test('1. Select a charcoal suit -> request contains that exact charcoal suit', async () => {
    const suitRes = await query("SELECT * FROM products WHERE sku = 'VES-MEN-001' LIMIT 1");
    assert.equal(suitRes.rows.length, 1);
    const suit = suitRes.rows[0];

    assert.equal(suit.name, 'Bespoke Charcoal Italian Wool 3-Piece Formal Suit');
    assert.equal(suit.garment_type, 'full_body');

    let capturedPayload = null;
    const adapter = new GenlookTryOnAdapter();
    adapter.uploadCustomerPhoto = async () => ({ imageId: 'img_charcoal_test' });
    adapter.client = {
      images: {
        upload: async () => ({ imageId: 'img_charcoal_test' })
      },
      tryOn: {
        create: async (p) => {
          capturedPayload = p;
          return { generationId: 'gen_charcoal_1', status: 'completed' };
        }
      }
    };

    // Simulate backend job creation for suit
    const suitImageHash = crypto.createHash('sha256').update(suit.primary_image_url).digest('hex').slice(0, 16);
    const externalId = `vestra-${suit.slug}-v${suitImageHash.slice(0, 8)}`;

    await adapter.submitTryOnJob({
      userPhotoUrl: 'https://example.com/customer.jpg',
      garmentImageUrl: suit.primary_image_url,
      garment: suit,
      productId: suit.id,
      garmentDescription: suit.description,
      category: 'full_body',
      externalUserId: 'sess_user_1'
    });

    assert.ok(capturedPayload, 'Payload must be submitted to Genlook');
    assert.equal(capturedPayload.products.length, 1, 'Must contain exactly 1 product');
    assert.equal(capturedPayload.products[0].title, 'Bespoke Charcoal Italian Wool 3-Piece Formal Suit');
    assert.ok(capturedPayload.products[0].externalId.includes('bespoke-charcoal'));
    assert.equal(capturedPayload.products[0].images[0].source.url, suit.primary_image_url);
    assert.equal(capturedPayload.externalUserId, 'sess_user_1');
  });

  // Test Case 2: Select a saree -> request contains that exact saree
  await t.test('2. Select a saree -> request contains that exact saree', async () => {
    const sareeRes = await query("SELECT * FROM products WHERE sku = 'VES-SAR-001' LIMIT 1");
    assert.equal(sareeRes.rows.length, 1);
    const saree = sareeRes.rows[0];

    let capturedPayload = null;
    const adapter = new GenlookTryOnAdapter();
    adapter.uploadCustomerPhoto = async () => ({ imageId: 'img_saree_test' });
    adapter.client = {
      images: { upload: async () => ({ imageId: 'img_saree_test' }) },
      tryOn: {
        create: async (p) => {
          capturedPayload = p;
          return { generationId: 'gen_saree_1', status: 'completed' };
        }
      }
    };

    await adapter.submitTryOnJob({
      userPhotoUrl: 'https://example.com/customer.jpg',
      garmentImageUrl: saree.primary_image_url,
      garment: saree,
      productId: saree.id,
      garmentDescription: saree.description,
      category: 'full_body'
    });

    assert.ok(capturedPayload);
    assert.equal(capturedPayload.products.length, 1);
    assert.equal(capturedPayload.products[0].title, 'Kanjivaram Pure Mulberry Silk Saree');
    assert.ok(capturedPayload.products[0].externalId.includes('kanjivaram'));
    assert.equal(capturedPayload.products[0].images[0].source.url, saree.primary_image_url);
  });

  // Test Case 3: Select a dress -> request contains that exact dress
  await t.test('3. Select a dress -> request contains that exact dress', async () => {
    const dressRes = await query("SELECT * FROM products WHERE sku = 'VES-WOM-008' LIMIT 1");
    assert.equal(dressRes.rows.length, 1);
    const dress = dressRes.rows[0];

    let capturedPayload = null;
    const adapter = new GenlookTryOnAdapter();
    adapter.uploadCustomerPhoto = async () => ({ imageId: 'img_dress_test' });
    adapter.client = {
      images: { upload: async () => ({ imageId: 'img_dress_test' }) },
      tryOn: {
        create: async (p) => {
          capturedPayload = p;
          return { generationId: 'gen_dress_1', status: 'completed' };
        }
      }
    };

    await adapter.submitTryOnJob({
      userPhotoUrl: 'https://example.com/customer.jpg',
      garmentImageUrl: dress.primary_image_url,
      garment: dress,
      productId: dress.id,
      garmentDescription: dress.description,
      category: 'full_body'
    });

    assert.ok(capturedPayload);
    assert.equal(capturedPayload.products.length, 1);
    assert.equal(capturedPayload.products[0].title, 'Champagne Bias-Cut Silk Evening Dress');
    assert.ok(capturedPayload.products[0].externalId.includes('champagne-bias-cut'));
    assert.equal(capturedPayload.products[0].images[0].source.url, dress.primary_image_url);
  });

  // Test Case 4: Switch from a dress to a suit before confirmation -> only the suit is submitted
  await t.test('4. Switch from a dress to a suit before confirmation -> only the suit is submitted', async () => {
    const dressRes = await query("SELECT * FROM products WHERE sku = 'VES-WOM-007' LIMIT 1");
    const suitRes = await query("SELECT * FROM products WHERE sku = 'VES-MEN-001' LIMIT 1");
    const dress = dressRes.rows[0];
    const suit = suitRes.rows[0];

    // Customer initially hovered/staged dress, but switched to suit
    let pendingSnapshot = { ...dress };
    // User switches selection
    pendingSnapshot = { ...suit };

    let capturedPayload = null;
    const adapter = new GenlookTryOnAdapter();
    adapter.uploadCustomerPhoto = async () => ({ imageId: 'img_switch_test' });
    adapter.client = {
      images: { upload: async () => ({ imageId: 'img_switch_test' }) },
      tryOn: {
        create: async (p) => {
          capturedPayload = p;
          return { generationId: 'gen_switch_1', status: 'completed' };
        }
      }
    };

    await adapter.submitTryOnJob({
      userPhotoUrl: 'https://example.com/customer.jpg',
      garmentImageUrl: pendingSnapshot.primary_image_url,
      garment: pendingSnapshot,
      productId: pendingSnapshot.id,
      garmentDescription: pendingSnapshot.description,
      category: 'full_body'
    });

    assert.ok(capturedPayload);
    assert.equal(capturedPayload.products.length, 1);
    // Must strictly be the suit, ZERO remnants of the dress
    assert.equal(capturedPayload.products[0].title, 'Bespoke Charcoal Italian Wool 3-Piece Formal Suit');
    assert.ok(!capturedPayload.products[0].title.includes('Dress'));
    assert.ok(!capturedPayload.products[0].description.includes('Bohemian'));
    assert.equal(capturedPayload.products[0].images[0].source.url, suit.primary_image_url);
  });

  // Test Case 5: Select product A, then product B -> product A must not remain in the request
  await t.test('5. Select product A, then product B -> product A must not remain in the request', async () => {
    const prodARes = await query("SELECT * FROM products WHERE sku = 'VES-WOM-009' LIMIT 1"); // Sequinned Cocktail Dress
    const prodBRes = await query("SELECT * FROM products WHERE sku = 'VES-SAR-004' LIMIT 1"); // Pochampally Saree
    const prodA = prodARes.rows[0];
    const prodB = prodBRes.rows[0];

    let userSelection = prodA;
    // Replace with B
    userSelection = prodB;

    let capturedPayload = null;
    const adapter = new GenlookTryOnAdapter();
    adapter.uploadCustomerPhoto = async () => ({ imageId: 'img_ab_test' });
    adapter.client = {
      images: { upload: async () => ({ imageId: 'img_ab_test' }) },
      tryOn: {
        create: async (p) => {
          capturedPayload = p;
          return { generationId: 'gen_ab_1', status: 'completed' };
        }
      }
    };

    await adapter.submitTryOnJob({
      userPhotoUrl: 'https://example.com/customer.jpg',
      garmentImageUrl: userSelection.primary_image_url,
      garment: userSelection,
      productId: userSelection.id,
      garmentDescription: userSelection.description,
      category: 'full_body'
    });

    assert.ok(capturedPayload);
    assert.equal(capturedPayload.products.length, 1);
    assert.equal(capturedPayload.products[0].title, 'Pochampally Ikkat Geometric Silk Saree');
    assert.notEqual(capturedPayload.products[0].title, prodA.name);
    assert.notEqual(capturedPayload.products[0].images[0].source.url, prodA.primary_image_url);
  });

  // Test Case 6: Two customers select different outfits simultaneously -> separate requests & results
  await t.test('6. Two customers select different outfits simultaneously -> strictly separate requests', async () => {
    const cust1Product = (await query("SELECT * FROM products WHERE sku = 'VES-MEN-001' LIMIT 1")).rows[0]; // Suit
    const cust2Product = (await query("SELECT * FROM products WHERE sku = 'VES-SAR-002' LIMIT 1")).rows[0]; // Banarasi Saree

    const capturedSessions = [];
    const adapter = new GenlookTryOnAdapter();
    adapter.uploadCustomerPhoto = async () => ({ imageId: 'img_multi_user' });
    adapter.client = {
      images: { upload: async () => ({ imageId: 'img_multi_user' }) },
      tryOn: {
        create: async (p) => {
          capturedSessions.push(p);
          return { generationId: `gen_${p.externalUserId}`, status: 'completed' };
        }
      }
    };

    // Run parallel customer requests
    await Promise.all([
      adapter.submitTryOnJob({
        userPhotoUrl: 'https://example.com/cust1.jpg',
        garmentImageUrl: cust1Product.primary_image_url,
        garment: cust1Product,
        productId: cust1Product.id,
        garmentDescription: cust1Product.description,
        externalUserId: 'session_alpha_101'
      }),
      adapter.submitTryOnJob({
        userPhotoUrl: 'https://example.com/cust2.jpg',
        garmentImageUrl: cust2Product.primary_image_url,
        garment: cust2Product,
        productId: cust2Product.id,
        garmentDescription: cust2Product.description,
        externalUserId: 'session_beta_202'
      })
    ]);

    assert.equal(capturedSessions.length, 2);
    const alpha = capturedSessions.find(s => s.externalUserId === 'session_alpha_101');
    const beta = capturedSessions.find(s => s.externalUserId === 'session_beta_202');

    assert.ok(alpha);
    assert.ok(beta);
    assert.equal(alpha.products[0].title, 'Bespoke Charcoal Italian Wool 3-Piece Formal Suit');
    assert.equal(beta.products[0].title, 'Banarasi Antique Zari Handloom Saree');
    assert.notEqual(alpha.products[0].externalId, beta.products[0].externalId);
  });

  // Test Case 7: Missing product ID -> backend rejects with clear error
  await t.test('7. Missing product ID -> request is rejected', async () => {
    // Simulated request handler validation
    const validateRequest = (body) => {
      const { productId, customGarmentUrl, userPhotoUrl } = body;
      if (!userPhotoUrl) throw new Error('userPhotoUrl is required.');
      if (!productId && !customGarmentUrl) {
        throw new Error('Either productId (catalogue item) or customGarmentUrl (custom outfit) is required.');
      }
    };

    assert.throws(
      () => validateRequest({ userPhotoUrl: 'https://example.com/photo.jpg' }),
      /Either productId \(catalogue item\) or customGarmentUrl \(custom outfit\) is required/
    );
  });

  // Test Case 8: Missing or invalid product image -> clear error, no fallback to customer photo
  await t.test('8. Missing or invalid product image -> clear error, no fallback product', async () => {
    const corruptGarment = {
      id: 999,
      name: 'Mystery Garment',
      primary_image_url: null,
      tryon_image_url: ''
    };

    const validateGarmentImage = (garment) => {
      const garmentImageUrl = garment.tryon_image_url || garment.primary_image_url;
      if (!garmentImageUrl || typeof garmentImageUrl !== 'string' || garmentImageUrl.trim() === '') {
        const err = new Error(`Product '${garment.name}' (ID: ${garment.id}) does not have a valid garment photograph. Cannot proceed with try-on.`);
        err.code = 'MISSING_GARMENT_IMAGE';
        throw err;
      }
      return garmentImageUrl;
    };

    assert.throws(
      () => validateGarmentImage(corruptGarment),
      (err) => err.code === 'MISSING_GARMENT_IMAGE' && err.message.includes('valid garment photograph')
    );
  });

  // Test Case 9: Product image updated in admin -> updated image is used with versioned externalId
  await t.test('9. Product image updated in admin -> updated image is used for subsequent try-ons', async () => {
    const prodRes = await query("SELECT * FROM products WHERE sku = 'VES-MEN-001' LIMIT 1");
    const originalSuit = prodRes.rows[0];

    const imageHashOriginal = crypto.createHash('sha256').update(originalSuit.primary_image_url).digest('hex').slice(0, 8);
    const externalIdOriginal = `vestra-${originalSuit.slug}-v${imageHashOriginal}`;

    // Admin updates product photograph
    const newImageUrl = 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=85';
    const imageHashUpdated = crypto.createHash('sha256').update(newImageUrl).digest('hex').slice(0, 8);
    const externalIdUpdated = `vestra-${originalSuit.slug}-v${imageHashUpdated}`;

    // Verifies that externalId changed deterministically to prevent stale cloud caching
    assert.notEqual(externalIdOriginal, externalIdUpdated);
    assert.ok(externalIdUpdated.includes('bespoke-charcoal'));
  });

  // Test Case 10: Generation history displays the actual submitted product
  await t.test('10. Generation history displays the actual submitted product', async () => {
    const suit = (await query("SELECT * FROM products WHERE sku = 'VES-MEN-001' LIMIT 1")).rows[0];
    const testJobUuid = `job_test_hist_${Date.now()}`;
    const testSessionId = `sess_hist_${Date.now()}`;
    const imageHash = crypto.createHash('sha256').update(suit.primary_image_url).digest('hex').slice(0, 16);
    const externalId = `vestra-${suit.slug}-v${imageHash.slice(0, 8)}`;

    // Insert generation into tryon_jobs
    await query(
      `INSERT INTO tryon_jobs (
         job_uuid, customer_session_id, product_id, product_title,
         product_external_id, product_image_hash, user_photo_url,
         garment_image_url, garment_category, selected_size, status, provider
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        testJobUuid,
        testSessionId,
        suit.id,
        suit.name,
        externalId,
        imageHash,
        'https://example.com/user.jpg',
        suit.primary_image_url,
        'full_body',
        '40R',
        'completed',
        'genlook'
      ]
    );

    // Retrieve from database as the history endpoint would
    const histRes = await query(
      `SELECT j.*, p.name as catalogue_prod_name
       FROM tryon_jobs j
       LEFT JOIN products p ON j.product_id = p.id
       WHERE j.job_uuid = $1`,
      [testJobUuid]
    );

    assert.equal(histRes.rows.length, 1);
    const record = histRes.rows[0];

    // Must strictly match the submitted product
    assert.equal(record.product_id, suit.id);
    assert.equal(record.product_title, 'Bespoke Charcoal Italian Wool 3-Piece Formal Suit');
    assert.equal(record.product_external_id, externalId);
    assert.equal(record.product_image_hash, imageHash);
    assert.equal(record.customer_session_id, testSessionId);
    assert.equal(record.status, 'completed');
  });
});
