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
    assert.ok(sarees.length >= 18, 'Must have at least 18 curated sarees');
    
    const expectedSubcategories = [
      'kanjivaram', 'banarasi', 'chanderi', 'pochampally', 'gadwal',
      'uppada', 'paithani', 'organza', 'cotton', 'bridal',
      'designer_party', 'traditional_handloom',
      'patola', 'kalamkari', 'kota_doria', 'bandhani', 'mysore_silk', 'tussar'
    ];
    const actualSubcategories = new Set(sarees.map((s) => s.subcategory));

    for (const expected of expectedSubcategories) {
      assert.ok(actualSubcategories.has(expected), `Must contain ${expected} saree`);
    }

    const heritageSarees = sarees.filter((s) => expectedSubcategories.includes(s.subcategory));
    for (const saree of heritageSarees) {
      assert.strictEqual(saree.gender, 'women', 'Sarees should target women');
      assert.strictEqual(saree.tryonCompatibility, 'supported', 'Curated heritage sarees are enabled as AI Ready');
      assert.ok(saree.primaryImage && (saree.primaryImage.startsWith('https://') || saree.primaryImage.startsWith('/uploads/')), 'Must have valid image URL');
      assert.ok(saree.tryonOverlayImage && (saree.tryonOverlayImage.startsWith('https://') || saree.tryonOverlayImage.startsWith('/uploads/')), 'Must have valid try-on input image URL');
    }

    const lowResImported = sarees.filter((s) => s.tryonCompatibility === 'needs_image_replacement');
    assert.equal(lowResImported.length, 0, 'All low-resolution thumbnail crop outfits have been removed from active catalogue');
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

  await t.test('7. Validates Shirts & Tops category and high-resolution AI Ready status', () => {
    const shirts = sampleProducts.filter((p) => p.categoryId === 5);
    assert.strictEqual(shirts.length, 6, 'Must have 6 shirts and blouses');
    for (const s of shirts) {
      assert.strictEqual(s.garmentType, 'upper_body');
      assert.strictEqual(s.tryonCompatibility, 'supported');
      assert.strictEqual(s.imageWidth, 1200);
      assert.strictEqual(s.imageHeight, 1600);
      assert.ok(s.primaryImage.startsWith('https://'));
    }
  });

  await t.test('8. Validates Jeans & Denim category and high-resolution AI Ready status', () => {
    const jeans = sampleProducts.filter((p) => p.categoryId === 6);
    assert.strictEqual(jeans.length, 5, 'Must have 5 jeans and denim garments');
    for (const j of jeans) {
      assert.strictEqual(j.garmentType, 'lower_body');
      assert.strictEqual(j.tryonCompatibility, 'supported');
      assert.strictEqual(j.imageWidth, 1200);
      assert.strictEqual(j.imageHeight, 1600);
      assert.ok(j.primaryImage.startsWith('https://'));
    }
  });

  await t.test('9. Validates Baggy Pants & Trousers category and high-resolution AI Ready status', () => {
    const pants = sampleProducts.filter((p) => p.categoryId === 7);
    assert.strictEqual(pants.length, 5, 'Must have 5 baggy pants and trousers');
    for (const p of pants) {
      assert.strictEqual(p.garmentType, 'lower_body');
      assert.strictEqual(p.tryonCompatibility, 'supported');
      assert.strictEqual(p.imageWidth, 1200);
      assert.strictEqual(p.imageHeight, 1600);
      assert.ok(p.primaryImage.startsWith('https://'));
    }
  });

  await t.test('10. Validates Formal Attire & Tailoring category and high-resolution AI Ready status', () => {
    const formal = sampleProducts.filter((p) => p.categoryId === 8);
    assert.strictEqual(formal.length, 6, 'Must have 6 formal suits and tuxedos');
    for (const f of formal) {
      assert.strictEqual(f.garmentType, 'full_body');
      assert.strictEqual(f.tryonCompatibility, 'supported');
      assert.strictEqual(f.imageWidth, 1200);
      assert.strictEqual(f.imageHeight, 1600);
      assert.ok(f.primaryImage.startsWith('https://'));
    }
  });
});
