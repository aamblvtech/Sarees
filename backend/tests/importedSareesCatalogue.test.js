import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeDatabase, query } from '../src/config/db.js';
import { runSeed } from '../src/db/seed.js';
import { executeSingleTryOnJob } from '../src/routes/tryon.routes.js';

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

  await t.test('1. Retained imported sarees are verified high-res AI Ready, and low-res crops removed', async () => {
    const res = await query('SELECT * FROM products WHERE sku LIKE $1 ORDER BY id ASC', ['VES-SAR-04%']);
    assert.equal(res.rows.length, 6, 'Only 6 verified high-resolution imported sarees must remain');

    const expectedSkus = ['VES-SAR-041', 'VES-SAR-042', 'VES-SAR-043', 'VES-SAR-044', 'VES-SAR-045', 'VES-SAR-047'];
    const actualSkus = res.rows.map(r => r.sku);
    assert.deepEqual(actualSkus, expectedSkus);

    for (const row of res.rows) {
      assert.equal(row.category_id, 1, `Product ${row.id} must belong to Sarees category (id: 1)`);
      assert.equal(row.garment_type, 'saree', `Product ${row.id} garment_type must be saree`);
      assert.equal(row.gender, 'women', `Product ${row.id} gender must be women`);
      assert.equal(row.tryon_compatibility, 'supported', `Product ${row.id} must be supported (AI Ready) with verified high-res image`);
      assert.equal(row.image_width, 1200);
      assert.equal(row.image_height, 1600);
      assert.equal(row.currency, 'INR', `Product ${row.id} currency must be INR`);
      assert.ok(row.price > 0, `Product ${row.id} price must be positive INR`);
      assert.ok(row.color && row.color.length > 0, `Product ${row.id} must have a valid color`);
    }

    const badCrops = await query("SELECT count(*) as cnt FROM products WHERE tryon_compatibility = 'needs_image_replacement'");
    assert.equal(parseInt(badCrops.rows[0].cnt, 10), 0, 'All 18 low-res crop items must be removed');
  });

  await t.test('2. High-resolution image files for retained sarees exist cleanly on disk in uploads directory', async () => {
    const res = await query('SELECT id, primary_image_url FROM products WHERE sku LIKE $1', ['VES-SAR-04%']);
    const uploadsBase = path.join(__dirname, '..');

    for (const row of res.rows) {
      const imgPath = path.join(uploadsBase, row.primary_image_url);
      assert.ok(fs.existsSync(imgPath), `Image file missing on disk: ${imgPath} for product ${row.id}`);
      const stats = fs.statSync(imgPath);
      assert.ok(stats.size > 50000, `High-res image file too small: ${imgPath} (${stats.size} bytes)`);
    }
  });

  await t.test('3. Truncated titles in imported batch are flagged for admin review', async () => {
    const res = await query('SELECT id, sku, name, brand, needs_admin_review, original_price, discount_percent FROM products WHERE sku LIKE $1 ORDER BY id ASC', ['VES-SAR-04%']);

    const flaggedSkus = res.rows.filter(r => r.needs_admin_review).map(r => r.sku);
    const verifiedSkus = res.rows.filter(r => !r.needs_admin_review).map(r => r.sku);

    // Products 41, 43, 45 have truncated titles from screenshot source
    assert.deepEqual(flaggedSkus, ['VES-SAR-041', 'VES-SAR-043', 'VES-SAR-045'], 'Expected sarees 41, 43, 45 flagged for review');
    assert.deepEqual(verifiedSkus, ['VES-SAR-042', 'VES-SAR-044', 'VES-SAR-047'], 'Expected sarees 42, 44, 47 verified complete');
  });

  await t.test('4. Admin can update saree details and resolve review flag', async () => {
    // Simulate admin reviewing and completing product 41 title
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
    // Insert a temporary low-res product to verify the technical dimension guardrail
    const insertRes = await query(`
      INSERT INTO products (sku, name, slug, brand, category_id, subcategory, gender, garment_type, tryon_compatibility, price, description, primary_image_url, image_width, image_height)
      VALUES ('VES-TEST-LOWRES', 'Test Low Res Saree', 'test-low-res-saree', 'TestBrand', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 999, 'Test low resolution saree', '/uploads/catalogue_sarees/saree_46_kasee_silk_blend.jpg', 161, 190)
      RETURNING id, name, tryon_compatibility
    `);
    const lowResSaree = insertRes.rows[0];
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

    // Clean up temporary test product
    await query('DELETE FROM products WHERE id = $1', [lowResSaree.id]);
  });

  await t.test('7. Replacing image with verified high-res file updates database and makes product AI Ready', async () => {
    // Admin replaces product 41 image with high-res file
    await query(
      `UPDATE products
       SET primary_image_url = '/uploads/catalogue_sarees/saree_41_sangria_printed_silk_hires.jpg',
           tryon_image_url = '/uploads/catalogue_sarees/saree_41_sangria_printed_silk_hires.jpg',
           tryon_compatibility = 'supported',
           image_width = 1200,
           image_height = 1600,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 41`
    );

    const check = await query('SELECT id, tryon_compatibility, image_width, image_height FROM products WHERE id = 41');
    assert.equal(check.rows[0].tryon_compatibility, 'supported');
    assert.equal(check.rows[0].image_width, 1200);
    assert.equal(check.rows[0].image_height, 1600);
  });
});
