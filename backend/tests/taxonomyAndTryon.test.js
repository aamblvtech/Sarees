import test from 'node:test';
import assert from 'node:assert';
import { sampleCategories, sampleProducts } from '../src/data/sampleProducts.js';

test('Taxonomy & Garment Categories Suite', async (t) => {
  await t.test('1. Validates all required categories exist', () => {
    const slugs = sampleCategories.map((c) => c.slug);
    assert.ok(slugs.includes('sarees'), 'Must contain sarees category');
    assert.ok(slugs.includes('womens-clothing'), "Must contain women's clothing category");
    assert.ok(slugs.includes('mens-clothing'), "Must contain men's clothing category");
    assert.ok(slugs.includes('accessories'), 'Must contain accessories category');
  });

  await t.test('2. Validates saree products taxonomy and compatibility', () => {
    const sarees = sampleProducts.filter((p) => p.garmentType === 'saree');
    assert.ok(sarees.length >= 3, 'Must have at least 3 curated sarees');
    for (const saree of sarees) {
      assert.strictEqual(saree.gender, 'women', 'Sarees should target women');
      assert.strictEqual(saree.tryonCompatibility, 'awaiting_saree_engine', 'Sarees must be flagged as awaiting_saree_engine');
      assert.strictEqual(saree.subcategory, 'sarees');
    }
  });

  await t.test('3. Validates women\'s clothing subcategories and garment types', () => {
    const womens = sampleProducts.filter((p) => p.categoryId === 2);
    const subcategories = new Set(womens.map((p) => p.subcategory));
    
    assert.ok(subcategories.has('gowns'), 'Must contain gowns');
    assert.ok(subcategories.has('dresses'), 'Must contain dresses');
    assert.ok(subcategories.has('kurtis'), 'Must contain kurtis');
    assert.ok(subcategories.has('salwar_suits'), 'Must contain salwar suits');
    assert.ok(subcategories.has('blazers'), 'Must contain blazers');
    assert.ok(subcategories.has('trousers'), 'Must contain trousers');
    assert.ok(subcategories.has('jeans'), 'Must contain jeans');
    assert.ok(subcategories.has('jackets'), 'Must contain jackets');

    // Check garment types
    for (const p of womens) {
      assert.ok(
        ['upper_body', 'lower_body', 'full_body'].includes(p.garmentType),
        `Women product ${p.name} should have valid garmentType`
      );
      assert.strictEqual(p.tryonCompatibility, 'supported', 'Stitched apparel must be supported');
    }
  });

  await t.test('4. Validates men\'s clothing subcategories and garment types', () => {
    const mens = sampleProducts.filter((p) => p.categoryId === 3);
    const subcategories = new Set(mens.map((p) => p.subcategory));
    
    assert.ok(subcategories.has('blazers'), 'Must contain blazers');
    assert.ok(subcategories.has('shirts'), 'Must contain shirts');
    assert.ok(subcategories.has('t-shirts'), 'Must contain t-shirts');
    assert.ok(subcategories.has('kurtas'), 'Must contain kurtas');
    assert.ok(subcategories.has('trousers'), 'Must contain trousers');
    assert.ok(subcategories.has('jeans'), 'Must contain jeans');
    assert.ok(subcategories.has('jackets'), 'Must contain jackets');

    for (const p of mens) {
      assert.strictEqual(p.gender, 'men');
      assert.ok(['upper_body', 'lower_body'].includes(p.garmentType));
      assert.strictEqual(p.tryonCompatibility, 'supported');
    }
  });

  await t.test('5. Validates accessories taxonomy and non-try-on status', () => {
    const accessories = sampleProducts.filter((p) => p.categoryId === 4);
    assert.ok(accessories.length >= 2, 'Must have accessories');
    for (const acc of accessories) {
      assert.strictEqual(acc.garmentType, 'accessory');
      assert.strictEqual(acc.tryonCompatibility, 'unsupported', 'Accessories must be marked as unsupported for 2D VTON');
    }
  });

  await t.test('6. Verifies saree drape geometry and specifications', () => {
    const kanjivaram = sampleProducts.find((p) => p.sku === 'VES-SAR-001');
    assert.ok(kanjivaram);
    assert.ok(kanjivaram.description.includes('Kanchipuram'));
    assert.ok(kanjivaram.material.includes('Mulberry Silk'));
    assert.ok(kanjivaram.sizes.includes('Free Size (6 Yards)'));
  });
});

