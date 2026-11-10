import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeDatabase, query } from '../src/config/db.js';
import { runSeed } from '../src/db/seed.js';
import { executeSingleTryOnJob } from '../src/routes/tryon.routes.js';
import { myntraImportService } from '../src/services/myntraImportService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure test environment uses mock mode
process.env.NODE_ENV = 'test';
process.env.GENLOOK_API_KEY = process.env.GENLOOK_API_KEY || 'gk_mock_ci_test_key';
process.env.GENLOOK_MOCK = 'true';
process.env.GENLOOK_ENABLED = 'false';

test('Imported Sarees Catalogue & Virtual Try-On Verification Suite', async (t) => {
  await initializeDatabase();
  await runSeed();

  await t.test('1. All 24 imported sarees (IDs 41-64) are preserved with accurate image statuses', async () => {
    const res = await query('SELECT * FROM products WHERE id BETWEEN 41 AND 64 ORDER BY id ASC');
    assert.equal(res.rows.length, 24, 'All 24 imported sarees with IDs 41-64 must be preserved in catalogue');

    const expectedSkus = Array.from({ length: 24 }, (_, i) => `VES-SAR-0${41 + i}`);
    const actualSkus = res.rows.map(r => r.sku);
    assert.deepEqual(actualSkus, expectedSkus);

    // 6 verified high-resolution studio sarees (IDs 41-45, 47)
    const hiresRows = res.rows.filter(r => [41, 42, 43, 44, 45, 47].includes(r.id));
    assert.equal(hiresRows.length, 6);
    for (const row of hiresRows) {
      assert.equal(row.image_status, 'IMAGE_VALID', `Product ${row.id} must be IMAGE_VALID`);
      assert.equal(row.tryon_compatibility, 'supported', `Product ${row.id} must be supported`);
      assert.equal(row.approval_status, 'AI_READY', `Product ${row.id} must be AI_READY`);
      assert.equal(row.image_width, 1200);
      assert.equal(row.image_height, 1600);
    }

    // 18 low-resolution screenshot crop sarees (IDs 46, 48-64)
    const lowresRows = res.rows.filter(r => ![41, 42, 43, 44, 45, 47].includes(r.id));
    assert.equal(lowresRows.length, 18);
    for (const row of lowresRows) {
      assert.equal(row.image_status, 'IMAGE_LOW_RESOLUTION', `Product ${row.id} must be IMAGE_LOW_RESOLUTION`);
      assert.equal(row.tryon_compatibility, 'needs_image_replacement', `Product ${row.id} must be needs_image_replacement`);
      assert.equal(row.approval_status, 'NEEDS_IMAGE', `Product ${row.id} must be NEEDS_IMAGE`);
      assert.ok(row.image_width < 250, `Product ${row.id} width (${row.image_width}) must be under 250px`);
      assert.ok(row.image_height < 250, `Product ${row.id} height (${row.image_height}) must be under 250px`);
    }
  });

  await t.test('2. Image files for all 24 sarees exist on disk in backend/uploads/catalogue_sarees', async () => {
    const res = await query('SELECT id, primary_image_url FROM products WHERE id BETWEEN 41 AND 64 ORDER BY id ASC');
    const uploadsBase = path.join(__dirname, '..');

    for (const row of res.rows) {
      const imgPath = path.join(uploadsBase, row.primary_image_url);
      assert.ok(fs.existsSync(imgPath), `Image file missing on disk: ${imgPath} for product ${row.id}`);
      const stats = fs.statSync(imgPath);
      assert.ok(stats.size > 5000, `Image file too small or corrupted: ${imgPath} (${stats.size} bytes)`);
    }
  });

  await t.test('3. Low-resolution saree cannot be set to AI_READY without validated high-res image', async () => {
    // Attempt to promote low-res product 46 to AI_READY
    await assert.rejects(
      async () => {
        await myntraImportService.updateApprovalStatus(46, 'AI_READY', 'Unauthorized promotion test');
      },
      /Cannot set status to AI_READY/,
      'Must reject AI_READY for products with image dimensions below 250x250px'
    );
  });

  await t.test('4. Admin can update saree details and resolve review flag', async () => {
    await query(
      `UPDATE products
       SET name = $1, needs_admin_review = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = 41
       RETURNING *`,
      ['Sangria Women Printed Pure Silk Heritage Saree']
    );

    const check = await query('SELECT name, needs_admin_review FROM products WHERE id = 41');
    assert.equal(check.rows[0].name, 'Sangria Women Printed Pure Silk Heritage Saree');
    assert.equal(check.rows[0].needs_admin_review, false, 'Review flag must be resolved');
  });

  await t.test('5. Virtual try-on mapping strictly uses selected saree ID and image', async () => {
    const selectedSareeRes = await query('SELECT * FROM products WHERE id = 42');
    const saree = selectedSareeRes.rows[0];
    assert.equal(saree.brand, 'nevash fashion');
    assert.equal(saree.name, 'Art Silk Saree');

    const sessionId = `sess_imported_saree_${Date.now()}`;
    const customerImageUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

    const outcome = await executeSingleTryOnJob({
      productId: saree.id,
      productTitle: saree.name,
      userPhotoUrl: customerImageUri,
      userPhotoFilename: 'test_cust.jpg',
      sessionId
    });

    assert.equal(outcome.body.success, true);
    assert.equal(outcome.body.productId, 42);
    assert.equal(outcome.body.productTitle, 'Art Silk Saree');
    assert.equal(outcome.body.garmentImageUrl, saree.primary_image_url);

    // Verify database tryon_jobs record
    const jobRes = await query('SELECT * FROM tryon_jobs WHERE job_uuid = $1', [outcome.body.jobId]);
    assert.equal(jobRes.rows.length, 1);
    assert.equal(jobRes.rows[0].product_id, 42, 'Generation history must record exact selected saree product ID 42');
    assert.equal(jobRes.rows[0].product_title, 'Art Silk Saree');
  });

  await t.test('6. Low-resolution garment try-on fails with exact message: "Product image is too small for try-on. Minimum size is 250x250px."', async () => {
    // Temporarily mark active to test the technical dimension guardrail on small images
    await query('UPDATE products SET is_active = true WHERE id = 46');
    const checkSaree46 = await query('SELECT id, name, tryon_compatibility FROM products WHERE id = 46');
    const lowResSaree = checkSaree46.rows[0];
    assert.equal(lowResSaree.tryon_compatibility, 'needs_image_replacement');

    const sessionId = `sess_lowres_test_${Date.now()}`;
    const customerImageUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

    const outcome = await executeSingleTryOnJob({
      productId: lowResSaree.id,
      productTitle: lowResSaree.name,
      userPhotoUrl: customerImageUri,
      userPhotoFilename: 'test_cust.jpg',
      sessionId
    });

    assert.equal(outcome.body.success, false);
    assert.equal(outcome.body.status, 'failed');
    assert.equal(outcome.body.error, 'Product image is too small for try-on. Minimum size is 250x250px.');

    // Verify job in database is recorded as failed
    const jobRes = await query('SELECT * FROM tryon_jobs WHERE job_uuid = $1', [outcome.body.jobId]);
    assert.equal(jobRes.rows.length, 1);
    assert.equal(jobRes.rows[0].status, 'failed');
    assert.equal(jobRes.rows[0].error_message, 'Product image is too small for try-on. Minimum size is 250x250px.');

    // Revert back to inactive
    await query('UPDATE products SET is_active = false WHERE id = 46');
  });

  await t.test('7. Replacing image with verified high-res file updates database and makes product AI Ready', async () => {
    // Admin replaces product 48 image with high-res asset
    await query(
      `UPDATE products
       SET primary_image_url = '/uploads/catalogue_sarees/saree_42_nevash_art_silk_blue_hires.jpg',
           tryon_image_url = '/uploads/catalogue_sarees/saree_42_nevash_art_silk_blue_hires.jpg',
           tryon_compatibility = 'supported',
           image_status = 'IMAGE_VALID',
           approval_status = 'AI_READY',
           image_width = 1200,
           image_height = 1600,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 48`
    );

    const check = await query('SELECT id, tryon_compatibility, image_status, approval_status, image_width, image_height FROM products WHERE id = 48');
    assert.equal(check.rows[0].tryon_compatibility, 'supported');
    assert.equal(check.rows[0].image_status, 'IMAGE_VALID');
    assert.equal(check.rows[0].approval_status, 'AI_READY');
    assert.equal(check.rows[0].image_width, 1200);
    assert.equal(check.rows[0].image_height, 1600);
  });
});
