import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeDatabase, query } from '../src/config/db.js';
import { runSeed } from '../src/db/seed.js';
import { GenlookTryOnAdapter } from '../src/adapters/tryon/genlookAdapter.js';
import { executeSingleTryOnJob } from '../src/routes/tryon.routes.js';

// Enforce mock environment for CI & automated test suites
process.env.GENLOOK_API_KEY = process.env.GENLOOK_API_KEY || 'gk_mock_test_key_123';
process.env.GENLOOK_MOCK = 'true';
process.env.GENLOOK_ENABLED = 'false';

test('Virtual Try-On Latency and Performance Optimization Suite', async (t) => {
  await initializeDatabase();
  await runSeed();

  const adapter = new GenlookTryOnAdapter();

  await t.test('1. Customer image caching eliminates duplicate image uploads', async () => {
    const testPhotoUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';
    const userId = 'sess_perf_test_user_1';

    // First resolution uploads image
    const imageId1 = await adapter.getOrUploadCustomerImage(testPhotoUrl, userId);
    assert.ok(imageId1, 'Should resolve an imageId');

    // Second resolution must reuse cache without re-uploading
    const imageId2 = await adapter.getOrUploadCustomerImage(testPhotoUrl, userId);
    assert.equal(imageId2, imageId1, 'Cached imageId must match first resolution exactly');
  });

  await t.test('2. Single try-on job accepts and persists customerImageId', async () => {
    const session = 'sess_perf_test_' + Date.now();
    const customerImageId = 'mock_cust_img_perf_123';

    const outcome = await executeSingleTryOnJob({
      productId: 17,
      userPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
      customerImageId,
      sessionId: session
    });

    assert.equal(outcome.httpStatus, 201);
    assert.ok(outcome.body.jobId);
    assert.equal(outcome.body.customerImageId, customerImageId);

    // Verify persisted in PostgreSQL
    const dbRecord = await query('SELECT customer_image_id FROM tryon_jobs WHERE job_uuid = $1', [outcome.body.jobId]);
    assert.equal(dbRecord.rows[0].customer_image_id, customerImageId);
  });

  await t.test('3. Multi-outfit batch execution uses shared customerImageId across jobs', async () => {
    const session = 'sess_batch_perf_' + Date.now();
    const sharedImageId = 'mock_shared_img_' + Date.now();

    // Submit two outfits concurrently with pre-resolved image ID
    const [res1, res2] = await Promise.all([
      executeSingleTryOnJob({
        productId: 17,
        userPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
        customerImageId: sharedImageId,
        sessionId: session
      }),
      executeSingleTryOnJob({
        productId: 28,
        userPhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
        customerImageId: sharedImageId,
        sessionId: session
      })
    ]);

    assert.equal(res1.body.customerImageId, sharedImageId);
    assert.equal(res2.body.customerImageId, sharedImageId);
    assert.notEqual(res1.body.jobId, res2.body.jobId, 'Each outfit gets its own unique job_uuid');
  });
});

