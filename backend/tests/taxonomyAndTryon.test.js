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

  await t.test('2. Validates saree collection taxonomy, weaves, and compatibility', () => {
    const sarees = sampleProducts.filter((p) => p.garmentType === 'saree');
    assert.strictEqual(sarees.length, 12, 'Must have exactly 12 curated sarees');
    
    const expectedSubcategories = [
      'kanjivaram', 'banarasi', 'chanderi', 'pochampally', 'gadwal',
      'uppada', 'paithani', 'organza', 'cotton', 'bridal',
      'designer_party', 'traditional_handloom'
    ];
    const actualSubcategories = new Set(sarees.map((s) => s.subcategory));

    for (const expected of expectedSubcategories) {
      assert.ok(actualSubcategories.has(expected), `Must contain ${expected} saree`);
    }

    for (const saree of sarees) {
      assert.strictEqual(saree.gender, 'women', 'Sarees should target women');
      assert.strictEqual(saree.tryonCompatibility, 'awaiting_saree_engine', 'Sarees must be flagged as awaiting_saree_engine');
      assert.ok(saree.primaryImage && saree.primaryImage.startsWith('https://'), 'Must have valid HTTPS image URL');
      assert.ok(saree.tryonOverlayImage && saree.tryonOverlayImage.startsWith('https://'), 'Must have valid try-on input image URL');
    }
  });

  await t.test('3. Validates complete women\'s wearable outfits and AI Ready status', () => {
    const womens = sampleProducts.filter((p) => p.categoryId === 2);
    assert.strictEqual(womens.length, 12, 'Must have exactly 12 complete women outfits');
    const subcategories = new Set(womens.map((p) => p.subcategory));
    
    const requiredWomenOutfits = [
      'anarkali_suits', 'salwar_kameez', 'churidar_sets', 'kurti_pant_sets',
      'lehenga_choli', 'gowns', 'maxi_dresses', 'evening_dresses',
      'party_wear_dresses', 'casual_dresses', 'western_coord_sets', 'jumpsuits'
    ];

    for (const req of requiredWomenOutfits) {
      assert.ok(subcategories.has(req), `Must contain ${req} outfit`);
    }

    for (const p of womens) {
      assert.strictEqual(p.gender, 'women');
      assert.strictEqual(p.garmentType, 'full_body', 'Women outfits should be complete full_body garments');
      assert.strictEqual(p.tryonCompatibility, 'supported', 'Complete wearable outfits must be AI Ready (supported)');
      assert.ok(p.primaryImage && p.primaryImage.startsWith('https://'));
    }
  });

  await t.test('4. Validates complete men\'s wearable outfits and AI Ready status', () => {
    const mens = sampleProducts.filter((p) => p.categoryId === 3);
    assert.strictEqual(mens.length, 8, 'Must have exactly 8 complete men outfits');
    const subcategories = new Set(mens.map((p) => p.subcategory));
    
    const requiredMenOutfits = [
      'formal_suits', 'blazer_trouser_sets', 'kurta_pyjama_sets',
      'sherwani_outfits', 'indo_western', 'shirt_trouser_combinations',
      'casual_coords', 'traditional_outfits'
    ];

    for (const req of requiredMenOutfits) {
      assert.ok(subcategories.has(req), `Must contain ${req} outfit`);
    }

    for (const p of mens) {
      assert.strictEqual(p.gender, 'men');
      assert.ok(['full_body', 'upper_body'].includes(p.garmentType));
      assert.strictEqual(p.tryonCompatibility, 'supported', 'Complete men outfits must be AI Ready (supported)');
      assert.ok(p.primaryImage && p.primaryImage.startsWith('https://'));
    }
  });

  await t.test('5. Validates accessories taxonomy and non-try-on status', () => {
    const accessories = sampleProducts.filter((p) => p.categoryId === 4);
    assert.strictEqual(accessories.length, 2, 'Must have 2 archival accessories');
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
