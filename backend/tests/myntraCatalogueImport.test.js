import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeDatabase, query } from '../src/config/db.js';
import { runSeed } from '../src/db/seed.js';
import myntraImportService from '../src/services/myntraImportService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure test environment uses mock mode (zero Genlook credits)
process.env.NODE_ENV = 'test';
process.env.GENLOOK_API_KEY = process.env.GENLOOK_API_KEY || 'gk_mock_ci_test_key';
process.env.GENLOOK_MOCK = 'true';
process.env.GENLOOK_ENABLED = 'false';

test('Myntra Product Catalogue Import and Multi-Stage Approval Suite', async (t) => {
  await initializeDatabase();
  await runSeed();

  const testMyntraUrl1 = 'https://www.myntra.com/sarees/anouk/anouk-royal-chanderi-silk-saree/99101/buy';
  const testMyntraUrl2 = 'https://www.myntra.com/sarees/sangria/sangria-heritage-banarasi-saree/99102/buy';
  const testMyntraUrl3 = 'https://www.myntra.com/sarees/kalini/kalini-tussar-silk-saree/99103/buy';

  await t.test('1. Manual single product reference import with Myntra reference URL', async () => {
    const productData = {
      brand: 'Anouk Atelier',
      productTitle: 'Royal Chanderi Silk Saree',
      myntraUrl: testMyntraUrl1,
      sellingPrice: '1499',
      originalPrice: '3999',
      categoryId: 1,
      subcategory: 'sarees',
      gender: 'women',
      garmentType: 'saree',
      colour: 'Crimson & Gold',
      fabric: 'Chanderi Silk',
      permissionStatus: 'authorized',
      permissionNotes: 'Atelier brand collaboration agreement #AN-2026',
      primaryImageUrl: '/uploads/catalogue_sarees/saree_41_sangria_printed_silk_hires.jpg' // Valid 1200x1600 image
    };

    const created = await myntraImportService.createSingleReferenceProduct(productData, 'admin@vestra.com');
    assert.ok(created.id, 'Product must have generated an ID');
    assert.equal(created.name, 'Royal Chanderi Silk Saree');
    assert.equal(created.brand, 'Anouk Atelier');
    assert.equal(created.myntra_url, testMyntraUrl1);
    assert.equal(created.price, 1499);
    assert.equal(created.original_price, 3999);
    assert.equal(created.permission_status, 'authorized');
    assert.equal(created.is_active, false, 'Imported product must remain inactive draft until approved');
    assert.equal(created.approval_status, 'NEEDS_ADMIN_REVIEW', 'Valid image and authorized permission should queue for admin review');
  });

  await t.test('2. Duplicate prevention blocks importing identical Myntra URL', async () => {
    const duplicateData = {
      brand: 'Anouk Clone',
      productTitle: 'Duplicate Chanderi Saree',
      myntraUrl: testMyntraUrl1, // Same URL as test 1
      sellingPrice: '1200'
    };

    await assert.rejects(
      async () => {
        await myntraImportService.createSingleReferenceProduct(duplicateData, 'admin@vestra.com');
      },
      (err) => {
        assert.equal(err.statusCode, 409, 'Duplicate URL must throw 409 Conflict');
        assert.ok(err.message.includes('already exists in VESTRA'), 'Error message must cite existing product');
        return true;
      }
    );
  });

  await t.test('3. CSV bulk parser accurately normalizes and validates 12 standard columns', async () => {
    const csvContent = `Brand,Product name,Myntra product URL,Selling price,Original price,Category,Subcategory,Gender,Colour,Fabric,Image filename,Image usage permission status
Sangria Heritage,"Sangria Heritage Banarasi Saree","${testMyntraUrl2}",2199,4999,Sarees,sarees,women,Royal Blue,Pure Silk,saree_42_nevash_art_silk_blue_hires.jpg,authorized
KALINI Atelier,"KALINI Tussar Silk Saree","${testMyntraUrl3}",1850,3700,Sarees,sarees,women,Mustard Yellow,Tussar Silk,saree_45_kalini_maheshwari_hires.jpg,commercial_license
Broken Brand,"",https://www.myntra.com/sarees/broken/123/buy,-100,500,Sarees,sarees,women,Red,Silk,,unauthorized
Duplicate Row,"Duplicate Item","${testMyntraUrl2}",999,1999,Sarees,sarees,women,Blue,Silk,saree_41_sangria_printed_silk_hires.jpg,authorized`;

    const preview = await myntraImportService.previewCsv(csvContent);
    assert.equal(preview.success, true, 'Preview must succeed');
    assert.equal(preview.totalRows, 4, 'Total rows should equal 4');
    assert.equal(preview.validCount, 2, 'Exactly 2 rows should be valid');
    assert.equal(preview.invalidCount, 2, 'Exactly 2 rows should be invalid');
    assert.equal(preview.duplicateCount, 1, 'Duplicate row must be detected');

    // Row 1 checks
    const row1 = preview.rows[0];
    assert.equal(row1.isValid, true);
    assert.equal(row1.normalized.brand, 'Sangria Heritage');
    assert.equal(row1.normalized.sellingPrice, 2199);
    assert.ok(row1.normalized.imageMetadata.isAiReady, 'Image must be verified >=250px');
    assert.equal(row1.normalized.permissionStatus, 'authorized');

    // Row 3 checks (Missing name, negative price, unauthorized permission)
    const row3 = preview.rows[2];
    assert.equal(row3.isValid, false);
    assert.ok(row3.errors.some((e) => e.includes('Product name is required')));
    assert.ok(row3.errors.some((e) => e.includes('positive number')));
    assert.ok(row3.errors.some((e) => e.includes('UNAUTHORIZED')));

    // Row 4 checks (Duplicate URL)
    const row4 = preview.rows[3];
    assert.equal(row4.isValid, false);
    assert.equal(row4.isDuplicate, true);
    assert.ok(row4.errors.some((e) => e.includes('Duplicate URL')));
  });

  await t.test('4. Commit CSV import inserts valid rows as drafts into PostgreSQL', async () => {
    const csvContent = `Brand,Product name,Myntra product URL,Selling price,Original price,Category,Subcategory,Gender,Colour,Fabric,Image filename,Image usage permission status
Sangria Heritage,"Sangria Heritage Banarasi Saree","${testMyntraUrl2}",2199,4999,Sarees,sarees,women,Royal Blue,Pure Silk,saree_42_nevash_art_silk_blue_hires.jpg,authorized
KALINI Atelier,"KALINI Tussar Silk Saree","${testMyntraUrl3}",1850,3700,Sarees,sarees,women,Mustard Yellow,Tussar Silk,saree_45_kalini_maheshwari_hires.jpg,commercial_license`;

    const preview = await myntraImportService.previewCsv(csvContent);
    const commit = await myntraImportService.commitImport(preview.rows, 'admin@vestra.com');

    assert.equal(commit.success, true);
    assert.equal(commit.importedCount, 2, 'Must import 2 valid rows');
    assert.ok(commit.batchId.startsWith('myntra_batch_'));

    // Check DB persistence
    const res = await query('SELECT * FROM products WHERE myntra_url IN ($1, $2)', [testMyntraUrl2, testMyntraUrl3]);
    assert.equal(res.rows.length, 2);
    for (const row of res.rows) {
      assert.equal(row.is_active, false, 'Imported products must be inactive drafts');
      assert.equal(row.approval_status, 'NEEDS_ADMIN_REVIEW');
      assert.equal(row.tryon_compatibility, 'supported', 'Images >=250px mark compatibility supported');
      assert.ok(row.sku.startsWith('MYN-'));
    }
  });

  await t.test('5. Multi-stage approval status transitions and AI_READY quality gate', async () => {
    const res = await query('SELECT * FROM products WHERE myntra_url = $1 LIMIT 1', [testMyntraUrl2]);
    const prod = res.rows[0];

    // Transition 1: Set to DRAFT
    const draft = await myntraImportService.updateApprovalStatus(prod.id, 'DRAFT', 'Moved back to draft for pricing review');
    assert.equal(draft.approval_status, 'DRAFT');
    assert.equal(draft.is_active, false);

    // Transition 2: Set to APPROVED (Active in catalogue)
    const approved = await myntraImportService.updateApprovalStatus(prod.id, 'APPROVED', 'Pricing and photography approved');
    assert.equal(approved.approval_status, 'APPROVED');
    assert.equal(approved.is_active, true);

    // Transition 3: Set to AI_READY (Try-on enabled)
    const aiReady = await myntraImportService.updateApprovalStatus(prod.id, 'AI_READY', 'High-res studio photography verified');
    assert.equal(aiReady.approval_status, 'AI_READY');
    assert.equal(aiReady.tryon_compatibility, 'supported');
    assert.equal(aiReady.is_active, true);
  });

  await t.test('6. Rejection of AI_READY when image is sub-250px or permission is unauthorized', async () => {
    // Insert a product with sub-250px thumbnail crop
    const sub250Data = {
      brand: 'Thumbnail Only',
      productTitle: 'Sub 250 Saree',
      myntraUrl: 'https://www.myntra.com/sarees/sub250/1111/buy',
      sellingPrice: '999',
      primaryImageUrl: '/uploads/catalogue_sarees/saree_46_kasee_crop.jpg', // 176x227 crop
      permissionStatus: 'unauthorized'
    };

    const created = await myntraImportService.createSingleReferenceProduct(sub250Data, 'admin@vestra.com');
    assert.equal(created.approval_status, 'NEEDS_IMAGE');

    // Attempt to set to AI_READY -> MUST be rejected
    await assert.rejects(
      async () => {
        await myntraImportService.updateApprovalStatus(created.id, 'AI_READY', 'Attempting illegal bypass');
      },
      (err) => {
        assert.ok(err.message.includes('below the 250x250px minimum'), 'Must reject due to sub-250px image');
        return true;
      }
    );
  });

  await t.test('7. Public storefront isolates unapproved drafts and only shows approved items', async () => {
    // Query public products (simulating GET /api/products query)
    const publicQuery = await query(`
      SELECT id, name, approval_status, is_active
      FROM products
      WHERE is_active = true AND (approval_status IN ('APPROVED', 'AI_READY') OR approval_status IS NULL)
    `);

    // Ensure all returned products are active and approved
    for (const row of publicQuery.rows) {
      assert.equal(row.is_active, true);
      assert.ok(
        row.approval_status === 'APPROVED' || row.approval_status === 'AI_READY' || row.approval_status === null,
        `Unexpected unapproved status: ${row.approval_status}`
      );
    }

    // Confirm that our DRAFT product from test 6 is NOT in the public result
    const hasSub250 = publicQuery.rows.some((r) => r.name === 'Sub 250 Saree');
    assert.equal(hasSub250, false, 'Unapproved draft saree must not appear on public storefront');
  });

  await t.test('8. Bulk delete and clear catalogue safety controls', async () => {
    // Test bulk deletion of the 3 imported test products
    const importedIds = (
      await query('SELECT id FROM products WHERE myntra_url IN ($1, $2, $3)', [
        testMyntraUrl1,
        testMyntraUrl2,
        testMyntraUrl3
      ])
    ).rows.map((r) => parseInt(r.id, 10));

    assert.ok(importedIds.length >= 2, 'Should have imported IDs');

    await query(`DELETE FROM products WHERE id IN (${importedIds.join(',')})`);

    const check = await query(`SELECT count(*) FROM products WHERE id IN (${importedIds.join(',')})`);
    assert.equal(parseInt(check.rows[0].count, 10), 0, 'Bulk deleted products must be removed');
  });
});
