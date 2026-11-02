import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('SAJEE Backend API Suite', () => {
  it('GET /health - returns healthy status and SAJEE brand', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.brand).toBe('SAJEE');
    expect(res.body.tagline).toBe('Drape Your Elegance');
  });

  it('GET /api/products - returns saree catalog list', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/products/sku/SAJEE-KANJ-001 - instant barcode lookup works', async () => {
    const res = await request(app).get('/api/products/sku/SAJEE-KANJ-001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sku).toBe('SAJEE-KANJ-001');
    expect(res.body.data.name).toContain('Kanjeevaram');
  });

  it('GET /api/products/sku/INVALID-SKU-999 - returns 404 with clear message', async () => {
    const res = await request(app).get('/api/products/sku/INVALID-SKU-999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('No saree found matching SKU');
  });

  it('POST /api/tryon - strictly requires consent', async () => {
    const res = await request(app)
      .post('/api/tryon')
      .field('productId', 'd0000000-0000-0000-0000-000000000001')
      .field('consentGiven', 'false');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CONSENT_REQUIRED');
  });

  it('POST /api/tryon - with consent creates job', async () => {
    const res = await request(app)
      .post('/api/tryon')
      .field('productId', 'd0000000-0000-0000-0000-000000000001')
      .field('consentGiven', 'true')
      .field('drapeStyle', 'nivi')
      .field('preferredProvider', 'mock');

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.jobId).toBeDefined();
    expect(res.body.status).toBe('processing');
    expect(res.body.provider).toBe('mock');

    // Poll the created job
    const pollRes = await request(app).get(`/api/tryon/${res.body.jobId}`);
    expect(pollRes.status).toBe(200);
    expect(pollRes.body.success).toBe(true);
    expect(pollRes.body.data.jobId).toBe(res.body.jobId);
    expect(['processing', 'completed']).toContain(pollRes.body.data.status);
    expect(pollRes.body.data.product.name).toBeDefined();
  });

  it('POST /api/tryon - supports replicate cloud provider selection', async () => {
    const res = await request(app)
      .post('/api/tryon')
      .field('productId', 'd0000000-0000-0000-0000-000000000001')
      .field('consentGiven', 'true')
      .field('drapeStyle', 'bengali')
      .field('preferredProvider', 'replicate');

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe('replicate');
  });

  it('POST /api/tryon - supports fal.ai cloud provider selection and honest status handling', async () => {
    const res = await request(app)
      .post('/api/tryon')
      .field('productId', 'd0000000-0000-0000-0000-000000000001')
      .field('consentGiven', 'true')
      .field('drapeStyle', 'gujarati')
      .field('preferredProvider', 'fal');

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe('fal');

    // Poll the created job
    const pollRes = await request(app).get(`/api/tryon/${res.body.jobId}`);
    expect(pollRes.status).toBe(200);
    expect(pollRes.body.data.provider).toBe('fal');
    if (pollRes.body.data.status === 'failed') {
      expect(pollRes.body.data.isSimulation).toBe(false);
      expect(pollRes.body.data.errorMessage).toBeDefined();
    }
  });

  it('POST /api/tryon - supports ArtCraft AI provider selection and honest status handling', async () => {
    const res = await request(app)
      .post('/api/tryon')
      .field('productId', 'd0000000-0000-0000-0000-000000000001')
      .field('consentGiven', 'true')
      .field('drapeStyle', 'nivi')
      .field('preferredProvider', 'artcraft');

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe('artcraft');

    // Poll the created job
    const pollRes = await request(app).get(`/api/tryon/${res.body.jobId}`);
    expect(pollRes.status).toBe(200);
    expect(pollRes.body.data.provider).toBe('artcraft');
    if (pollRes.body.data.status === 'failed') {
      expect(pollRes.body.data.isSimulation).toBe(false);
      expect(pollRes.body.data.errorMessage).toBeDefined();
    }
  });
});
