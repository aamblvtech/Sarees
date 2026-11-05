import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure test environment variables are safely configured
process.env.NODE_ENV = 'test';
process.env.GENLOOK_API_KEY = process.env.GENLOOK_API_KEY || 'gk_mock_test_key_multi_tryon';
process.env.GENLOOK_MOCK = 'true';
process.env.GENLOOK_ENABLED = 'false';

import { initializeDatabase, query } from '../src/config/db.js';
import { runSeed } from '../src/db/seed.js';
import { executeSingleTryOnJob } from '../src/routes/tryon.routes.js';

test('Multi-Outfit Selection and Side-by-Side Try-On Comparison Suite', async (t) => {
  await initializeDatabase();
  await runSeed();

  const customerPhotoUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80';
  const customerPhotoFilename = 'customer_silhouette_portrait.jpg';

  // =========================================================================
  // Test Scenario 1: Select two outfits and verify two separate requests
  // =========================================================================
  await t.test('1. Select two outfits and verify two separate requests', async () => {
    const sessionToken = `sess_test_two_${Date.now()}`;
    const prods = await query(
      "SELECT id, name, sku, primary_image_url FROM products WHERE is_active = true AND tryon_compatibility = 'supported' LIMIT 2"
    );
    assert.equal(prods.rows.length, 2, 'Must have at least 2 active products');

    const [prod1, prod2] = prods.rows;
    assert.notEqual(prod1.id, prod2.id, 'Selected products must be distinct');

    // Simulate batch try-on submission
    const res1 = await executeSingleTryOnJob({
      productId: prod1.id,
      userPhotoUrl: customerPhotoUrl,
      userPhotoFilename: customerPhotoFilename,
      sessionId: sessionToken
    });

    const res2 = await executeSingleTryOnJob({
      productId: prod2.id,
      userPhotoUrl: customerPhotoUrl,
      userPhotoFilename: customerPhotoFilename,
      sessionId: sessionToken
    });

    assert.equal(res1.body.success, true);
    assert.equal(res2.body.success, true);

    // Verify two separate job UUIDs
    assert.ok(res1.body.jobId, 'Job 1 must have a jobId');
    assert.ok(res2.body.jobId, 'Job 2 must have a jobId');
    assert.notEqual(res1.body.jobId, res2.body.jobId, 'Each outfit must generate an independent job UUID');

    // Verify two separate database records in PostgreSQL
    const dbJobs = await query(
      'SELECT id, job_uuid, product_id, product_title FROM tryon_jobs WHERE customer_session_id = $1 ORDER BY id ASC',
      [sessionToken]
    );
    assert.equal(dbJobs.rows.length, 2, 'Exactly two separate jobs must be recorded in PostgreSQL');
    assert.equal(dbJobs.rows[0].product_id, prod1.id);
    assert.equal(dbJobs.rows[1].product_id, prod2.id);
    assert.equal(dbJobs.rows[0].product_title, prod1.name);
    assert.equal(dbJobs.rows[1].product_title, prod2.name);
  });

  // =========================================================================
  // Test Scenario 2: Select five outfits and verify five correctly mapped requests
  // =========================================================================
  await t.test('2. Select five outfits and verify five correctly mapped requests', async () => {
    const sessionToken = `sess_test_five_${Date.now()}`;
    const prods = await query(
      "SELECT id, name, sku, primary_image_url FROM products WHERE is_active = true AND tryon_compatibility = 'supported' LIMIT 5"
    );
    assert.equal(prods.rows.length, 5, 'Must have at least 5 active products');

    const jobIds = [];
    for (const prod of prods.rows) {
      const outcome = await executeSingleTryOnJob({
        productId: prod.id,
        userPhotoUrl: customerPhotoUrl,
        userPhotoFilename: customerPhotoFilename,
        sessionId: sessionToken
      });
      assert.equal(outcome.body.success, true);
      assert.equal(outcome.body.productId, prod.id);
      jobIds.push(outcome.body.jobId);
    }

    // Verify all 5 job IDs are unique
    const uniqueIds = new Set(jobIds);
    assert.equal(uniqueIds.size, 5, 'All five requests must have unique job IDs');

    // Verify database has 5 strictly distinct entries
    const dbJobs = await query(
      'SELECT id, product_id, product_external_id FROM tryon_jobs WHERE customer_session_id = $1',
      [sessionToken]
    );
    assert.equal(dbJobs.rows.length, 5, 'Database must have exactly 5 jobs for this customer session');
    const dbProductIds = dbJobs.rows.map(r => r.product_id);
    for (const prod of prods.rows) {
      assert.ok(dbProductIds.includes(prod.id), `Product ${prod.id} must be in recorded jobs`);
    }
  });

  // =========================================================================
  // Test Scenario 3: Remove one selected outfit before generation
  // =========================================================================
  await t.test('3. Remove one selected outfit before generation', async () => {
    const sessionToken = `sess_test_remove_${Date.now()}`;
    const prods = await query(
      "SELECT id, name FROM products WHERE is_active = true AND tryon_compatibility = 'supported' LIMIT 5"
    );

    // Customer originally selected 5 outfits, then removed index 2 before triggering generation
    const selectedOutfitIds = prods.rows.map(p => p.id);
    const removedOutfitId = selectedOutfitIds[2];
    const finalOutfitsToGenerate = selectedOutfitIds.filter(id => id !== removedOutfitId);

    assert.equal(finalOutfitsToGenerate.length, 4, '4 outfits remaining after removal');

    // Generate try-on for remaining 4
    for (const pid of finalOutfitsToGenerate) {
      await executeSingleTryOnJob({
        productId: pid,
        userPhotoUrl: customerPhotoUrl,
        sessionId: sessionToken
      });
    }

    // Verify only the 4 were generated; the removed one was NEVER submitted
    const dbJobs = await query(
      'SELECT product_id FROM tryon_jobs WHERE customer_session_id = $1',
      [sessionToken]
    );
    assert.equal(dbJobs.rows.length, 4, 'Exactly 4 jobs submitted to backend');
    const submittedIds = dbJobs.rows.map(r => r.product_id);
    assert.ok(!submittedIds.includes(removedOutfitId), 'Removed outfit must not exist in generated jobs');
  });

  // =========================================================================
  // Test Scenario 4: Verify every result uses the same customer photo
  // =========================================================================
  await t.test('4. Verify every result uses the same customer photo', async () => {
    const sessionToken = `sess_test_photo_reuse_${Date.now()}`;
    const prods = await query(
      "SELECT id FROM products WHERE is_active = true AND tryon_compatibility = 'supported' LIMIT 3"
    );

    for (const prod of prods.rows) {
      await executeSingleTryOnJob({
        productId: prod.id,
        userPhotoUrl: customerPhotoUrl,
        userPhotoFilename: customerPhotoFilename,
        sessionId: sessionToken
      });
    }

    const dbJobs = await query(
      'SELECT user_photo_url FROM tryon_jobs WHERE customer_session_id = $1',
      [sessionToken]
    );
    assert.equal(dbJobs.rows.length, 3);
    for (const job of dbJobs.rows) {
      assert.equal(
        job.user_photo_url,
        customerPhotoUrl,
        'Every single tried outfit must reuse the exact same customer portrait photo'
      );
    }
  });

  // =========================================================================
  // Test Scenario 5: Verify each result matches its selected catalogue product
  // =========================================================================
  await t.test('5. Verify each result matches its selected catalogue product', async () => {
    const sessionToken = `sess_test_matching_${Date.now()}`;
    const prods = await query(
      "SELECT id, name, sku, primary_image_url FROM products WHERE is_active = true AND tryon_compatibility = 'supported' LIMIT 3"
    );

    for (const prod of prods.rows) {
      const outcome = await executeSingleTryOnJob({
        productId: prod.id,
        productTitle: prod.name,
        userPhotoUrl: customerPhotoUrl,
        sessionId: sessionToken
      });

      assert.equal(outcome.body.productId, prod.id);
      assert.equal(outcome.body.productTitle, prod.name);
      assert.equal(outcome.body.garmentImageUrl, prod.primary_image_url);

      // Verify tryon_results row
      const resRow = await query(
        `SELECT r.result_image_url, j.product_id, j.product_title
         FROM tryon_results r
         JOIN tryon_jobs j ON r.job_id = j.id
         WHERE j.job_uuid = $1`,
        [outcome.body.jobId]
      );
      assert.equal(resRow.rows.length, 1);
      assert.equal(resRow.rows[0].product_id, prod.id);
      assert.equal(resRow.rows[0].product_title, prod.name);
      assert.ok(resRow.rows[0].result_image_url, 'Must have valid generated image URL');
    }
  });

  // =========================================================================
  // Test Scenario 6: Retry one failed generation without repeating successful generations
  // =========================================================================
  await t.test('6. Retry one failed generation without repeating successful generations', async () => {
    const sessionToken = `sess_test_retry_${Date.now()}`;
    const prods = await query(
      "SELECT id, name, primary_image_url FROM products WHERE is_active = true AND tryon_compatibility = 'supported' LIMIT 2"
    );
    const [successProd, failedProd] = prods.rows;

    // Job 1: Success
    const job1Outcome = await executeSingleTryOnJob({
      productId: successProd.id,
      userPhotoUrl: customerPhotoUrl,
      sessionId: sessionToken
    });
    assert.equal(job1Outcome.body.status, 'completed');

    // Job 2: Manually mark as failed in database to simulate provider transient timeout/failure
    const job2Outcome = await executeSingleTryOnJob({
      productId: failedProd.id,
      userPhotoUrl: customerPhotoUrl,
      sessionId: sessionToken
    });
    await query(
      "UPDATE tryon_jobs SET status = 'failed', error_message = 'Simulated timeout on worker' WHERE job_uuid = $1",
      [job2Outcome.body.jobId]
    );

    // Verify Job 1 is completed and Job 2 is failed
    const checkBefore = await query(
      'SELECT job_uuid, status FROM tryon_jobs WHERE customer_session_id = $1 ORDER BY id ASC',
      [sessionToken]
    );
    assert.equal(checkBefore.rows[0].status, 'completed');
    assert.equal(checkBefore.rows[1].status, 'failed');

    const job1OriginalCompletedAt = (await query('SELECT completed_at FROM tryon_jobs WHERE job_uuid = $1', [job1Outcome.body.jobId])).rows[0].completed_at;

    // Retry ONLY the failed job (Job 2)
    const retryOutcome = await executeSingleTryOnJob({
      jobUuidOverride: job2Outcome.body.jobId,
      existingJobId: (await query('SELECT id FROM tryon_jobs WHERE job_uuid = $1', [job2Outcome.body.jobId])).rows[0].id,
      productId: failedProd.id,
      userPhotoUrl: customerPhotoUrl,
      sessionId: sessionToken
    });

    assert.equal(retryOutcome.body.status, 'completed');

    // Verify Job 2 is now completed, and Job 1's completed_at was untouched
    const checkAfter = await query(
      'SELECT job_uuid, status, completed_at FROM tryon_jobs WHERE customer_session_id = $1 ORDER BY id ASC',
      [sessionToken]
    );
    assert.equal(checkAfter.rows[0].status, 'completed');
    assert.equal(checkAfter.rows[1].status, 'completed');
    assert.equal(
      checkAfter.rows[0].completed_at.toISOString(),
      job1OriginalCompletedAt.toISOString(),
      'Successful job was not re-executed or modified during retry of failed job'
    );
  });

  // =========================================================================
  // Test Scenario 7: Verify side-by-side display data structures
  // =========================================================================
  await t.test('7. Verify side-by-side display data structures on desktop and mobile', async () => {
    const sessionToken = `sess_test_gallery_struct_${Date.now()}`;
    const prods = await query(
      "SELECT id, name, primary_image_url FROM products WHERE is_active = true AND tryon_compatibility = 'supported' LIMIT 2"
    );

    for (const p of prods.rows) {
      await executeSingleTryOnJob({
        productId: p.id,
        userPhotoUrl: customerPhotoUrl,
        sessionId: sessionToken
      });
    }

    // Query history structure used by the "Your Tried Outfits" gallery
    const historyRes = await query(
      `SELECT 
        j.job_uuid AS "jobId",
        j.customer_session_id AS "sessionId",
        j.product_id AS "productId",
        j.product_title AS "productTitle",
        j.garment_image_url AS "garmentImageUrl",
        j.status,
        r.result_image_url AS "resultImageUrl",
        r.fit_score AS "fitScore",
        r.composite_details AS "compositeDetails"
      FROM tryon_jobs j
      LEFT JOIN tryon_results r ON j.id = r.job_id
      WHERE j.customer_session_id = $1
      ORDER BY j.created_at DESC`,
      [sessionToken]
    );

    assert.equal(historyRes.rows.length, 2);
    for (const card of historyRes.rows) {
      // 1. Generated try-on image
      assert.ok(card.resultImageUrl, 'Card must have resultImageUrl');
      // 2. Original catalogue product thumbnail
      assert.ok(card.garmentImageUrl, 'Card must have garmentImageUrl');
      // 3. Product name
      assert.ok(card.productTitle, 'Card must have productTitle');
      // 4. Generation status
      assert.equal(card.status, 'completed', 'Card must have generation status');
      // 5. Fit score
      assert.ok(card.fitScore !== null, 'Card must have fit score for quality verification');
    }
  });

  // =========================================================================
  // Test Scenario 8: Verify customer sessions do not share results
  // =========================================================================
  await t.test('8. Verify customer sessions do not share results', async () => {
    const sessionAlice = `sess_alice_${Date.now()}`;
    const sessionBob = `sess_bob_${Date.now()}`;

    const prods = await query(
      "SELECT id, name FROM products WHERE is_active = true AND tryon_compatibility = 'supported' LIMIT 2"
    );
    const [aliceProd, bobProd] = prods.rows;

    // Alice runs a try-on
    await executeSingleTryOnJob({
      productId: aliceProd.id,
      userPhotoUrl: 'https://images.unsplash.com/alice-photo.jpg',
      sessionId: sessionAlice
    });

    // Bob runs a try-on
    await executeSingleTryOnJob({
      productId: bobProd.id,
      userPhotoUrl: 'https://images.unsplash.com/bob-photo.jpg',
      sessionId: sessionBob
    });

    // Alice queries her history
    const aliceHistory = await query(
      'SELECT product_id, customer_session_id, user_photo_url FROM tryon_jobs WHERE customer_session_id = $1',
      [sessionAlice]
    );
    assert.equal(aliceHistory.rows.length, 1);
    assert.equal(aliceHistory.rows[0].product_id, aliceProd.id);
    assert.equal(aliceHistory.rows[0].user_photo_url, 'https://images.unsplash.com/alice-photo.jpg');

    // Bob queries his history
    const bobHistory = await query(
      'SELECT product_id, customer_session_id, user_photo_url FROM tryon_jobs WHERE customer_session_id = $1',
      [sessionBob]
    );
    assert.equal(bobHistory.rows.length, 1);
    assert.equal(bobHistory.rows[0].product_id, bobProd.id);
    assert.equal(bobHistory.rows[0].user_photo_url, 'https://images.unsplash.com/bob-photo.jpg');

    // Mutual exclusivity check
    assert.notEqual(aliceHistory.rows[0].product_id, bobHistory.rows[0].product_id);
    assert.notEqual(aliceHistory.rows[0].user_photo_url, bobHistory.rows[0].user_photo_url);
  });
});

