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

  await t.test('1. All 24 imported sarees (IDs 41 to 64) are seeded in PostgreSQL', async () => {
    const res = await query('SELECT * FROM products WHERE id >= 41 AND id <= 64 ORDER BY id ASC');
    assert.equal(res.rows.length, 24, 'Must seed exactly 24 imported saree products');

    const expectedBrands = new Set([
      'Sangria', 'nevash fashion', 'Anouk Rustic', 'kasee', 'KALINI',
      'Anouk', 'Mitera', 'Saree mall', 'all about you', 'VSOKA',
      'House of Pataudi', 'DARPAN TEXTILE'
    ]);

    for (const row of res.rows) {
      assert.ok(row.id >= 41 && row.id <= 64, `Invalid ID: ${row.id}`);
      assert.equal(row.category_id, 1, `Product ${row.id} must belong to Sarees category (id: 1)`);
      assert.equal(row.garment_type, 'saree', `Product ${row.id} garment_type must be saree`);
      assert.equal(row.gender, 'women', `Product ${row.id} gender must be women`);
      assert.equal(row.tryon_compatibility, 'supported', `Product ${row.id} must be supported (AI Ready)`);
      assert.equal(row.currency, 'INR', `Product ${row.id} currency must be INR`);
      assert.ok(row.price > 0, `Product ${row.id} price must be positive INR`);
      assert.ok(expectedBrands.has(row.brand), `Unexpected brand: ${row.brand} on product ${row.id}`);
      assert.ok(row.color && row.color.length > 0, `Product ${row.id} must have a valid color`);
    }
  });

  await t.test('2. Image files for all 24 sarees exist cleanly on disk in uploads directory', async () => {
    const res = await query('SELECT id, primary_image_url FROM products WHERE id >= 41 AND id <= 64');
    const uploadsBase = path.join(__dirname, '..');

    for (const row of res.rows) {
      const imgPath = path.join(uploadsBase, row.primary_image_url);
      assert.ok(fs.existsSync(imgPath), `Image file missing on disk: ${imgPath} for product ${row.id}`);
      const stats = fs.statSync(imgPath);
      assert.ok(stats.size > 1000, `Image file too small: ${imgPath} (${stats.size} bytes)`);
    }
  });

  await t.test('3. Truncated titles and missing price items are flagged for admin review', async () => {
    const res = await query('SELECT id, name, brand, needs_admin_review, original_price, discount_percent FROM products WHERE id >= 41 AND id <= 64 ORDER BY id ASC');

    const flaggedIds = res.rows.filter(r => r.needs_admin_review).map(r => r.id);
    const verifiedIds = res.rows.filter(r => !r.needs_admin_review).map(r => r.id);

    // Exactly 9 sarees flagged for admin review due to truncated titles or missing original prices
    assert.equal(flaggedIds.length, 9, 'Expected exactly 9 sarees flagged for review');
    assert.equal(verifiedIds.length, 15, 'Expected exactly 15 sarees verified complete');

    // Expected review IDs: 41, 43, 45, 49, 50, 54, 58, 61, 64
    assert.deepEqual(flaggedIds, [41, 43, 45, 49, 50, 54, 58, 61, 64]);

    // Product 58 (VSOKA) has missing original price and discount
    const vsoka = res.rows.find(r => r.id === 58);
    assert.ok(vsoka);
    assert.equal(vsoka.original_price, null, 'VSOKA must have null original_price');
    assert.equal(vsoka.discount_percent, null, 'VSOKA must have null discount_percent');
    assert.equal(vsoka.needs_admin_review, true, 'VSOKA must require admin review');
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
});
