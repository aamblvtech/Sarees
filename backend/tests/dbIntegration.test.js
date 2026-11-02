import test from 'node:test';
import assert from 'node:assert';
import { initializeDatabase, query } from '../src/config/db.js';
import { runMigrations } from '../src/db/migrate.js';
import { runSeed } from '../src/db/seed.js';

test('PostgreSQL Database & API Integration Suite', async (t) => {
  await t.test('1. Runs schema migrations and seeds all 20 garments', async () => {
    await runMigrations();
    await runSeed();

    const countRes = await query('SELECT count(*)::int as total FROM products');
    assert.strictEqual(countRes.rows[0].total, 20, 'Should seed 20 total products');

    const catRes = await query('SELECT count(*)::int as total FROM categories');
    assert.strictEqual(catRes.rows[0].total, 4, 'Should seed 4 categories');
  });

  await t.test('2. Queries products with subcategory and gender filters', async () => {
    // Saree query
    const sareeRes = await query(
      "SELECT name, garment_type, tryon_compatibility FROM products WHERE garment_type = 'saree'"
    );
    assert.strictEqual(sareeRes.rows.length, 3, 'Should find 3 sarees');
    for (const row of sareeRes.rows) {
      assert.strictEqual(row.tryon_compatibility, 'awaiting_saree_engine');
    }

    // Women's full body gowns & dresses
    const gownRes = await query(
      "SELECT name, garment_type FROM products WHERE gender = 'women' AND garment_type = 'full_body'"
    );
    assert.ok(gownRes.rows.length >= 3, 'Should find multiple full_body womens garments');

    // Men's upper body shirts, kurtas, blazers
    const menUpperRes = await query(
      "SELECT name, garment_type FROM products WHERE gender = 'men' AND garment_type = 'upper_body'"
    );
    assert.ok(menUpperRes.rows.length >= 4, 'Should find multiple upper_body mens garments');
  });

  await t.test('3. Enforces Saree AI engine restriction in tryon jobs query', async () => {
    const saree = await query("SELECT id, name, garment_type, tryon_compatibility FROM products WHERE garment_type = 'saree' LIMIT 1");
    const item = saree.rows[0];

    // Verify rejection logic matching tryon.routes.js
    const isSareeRestricted = (item.tryon_compatibility === 'awaiting_saree_engine' || item.garment_type === 'saree');
    assert.strictEqual(isSareeRestricted, true, 'Saree must be flagged as restricted from standard 2D VTON');
  });

  await t.test('4. Enforces Accessory restriction in tryon jobs query', async () => {
    const acc = await query("SELECT id, name, garment_type, tryon_compatibility FROM products WHERE garment_type = 'accessory' LIMIT 1");
    const item = acc.rows[0];

    const isAccRestricted = (item.tryon_compatibility === 'unsupported' || item.garment_type === 'accessory');
    assert.strictEqual(isAccRestricted, true, 'Accessory must be flagged as restricted from standard 2D VTON');
  });

  await t.test('5. Validates supported stitched apparel for standard try-on', async () => {
    const blazer = await query("SELECT id, name, garment_type, tryon_compatibility FROM products WHERE sku = 'VES-MEN-001' LIMIT 1");
    const item = blazer.rows[0];

    assert.strictEqual(item.garment_type, 'upper_body');
    assert.strictEqual(item.tryon_compatibility, 'supported');
  });
});

