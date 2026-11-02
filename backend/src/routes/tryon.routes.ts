import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { query, withTransaction } from '../db/pool.js';
import { upload } from '../middleware/upload.js';
import { config } from '../config/index.js';
import { DEMO_PRODUCTS } from '../db/seed.js';
import { executeFalTryOn } from '../services/falProvider.js';
import { executeArtcraftTryOn } from '../services/artcraftProvider.js';

const router = Router();

// POST /api/tryon (Submit customer photo & garment for virtual try-on)
router.post('/', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const { sessionId, productId, drapeStyle = 'nivi', consentGiven, preferredProvider } = req.body;

    if (!consentGiven || consentGiven === 'false') {
      return res.status(400).json({
        success: false,
        error: 'Customer consent is strictly required prior to capturing or processing photos.',
        code: 'CONSENT_REQUIRED',
      });
    }

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required.' });
    }

    // Determine photo path: either uploaded file or body reference
    let photoPath = req.file?.path;
    let photoMime = req.file?.mimetype || 'image/jpeg';
    let photoSize = req.file?.size || 0;

    if (!photoPath && req.body.existingPhotoPath) {
      photoPath = req.body.existingPhotoPath;
    }

    // Create a fallback sample photo if testing via simulated capture
    if (!photoPath) {
      const placeholderName = `sample_person_${Date.now()}.jpg`;
      photoPath = path.join(config.uploadDir, placeholderName);
      if (!fs.existsSync(photoPath)) {
        fs.writeFileSync(photoPath, 'SAMPLE_PERSON_PHOTO_DATA');
      }
      photoSize = 1024;
      photoMime = 'image/jpeg';
    }

    // Lookup product
    const prodRes = await query('SELECT * FROM saree_products WHERE id = $1', [productId]);
    let product = prodRes.rows[0];
    if (!product) {
      product = DEMO_PRODUCTS.find(p => p.id === productId) || DEMO_PRODUCTS[0];
    }

    // Fetch annotations if any
    const annotRes = await query('SELECT * FROM saree_component_annotations WHERE product_id = $1 LIMIT 1', [product.id]);
    const annotations = annotRes.rows[0] || (product as any).annotations || {};

    const job = await withTransaction(async ({ query }) => {
      // 1. Record photo upload
      const photoRes = await query(
        `INSERT INTO uploaded_photos (session_id, storage_path, file_size, mime_type, consent_recorded)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [sessionId || '00000000-0000-0000-0000-000000000000', photoPath, photoSize, photoMime]
      );
      const photoId = photoRes.rows[0]?.id;

      // 2. Create try-on job
      const defaultProvider = process.env.SAJEE_AI_PROVIDER || 'mock';
      const provider = preferredProvider || defaultProvider;
      const jobRes = await query(
        `INSERT INTO try_on_jobs (session_id, product_id, customer_photo_id, status, provider)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, status, provider, created_at as "createdAt"`,
        [sessionId || '00000000-0000-0000-0000-000000000000', product.id, photoId, 'processing', provider]
      );

      return jobRes.rows[0];
    });

    // Dispatch asynchronously or synchronously to AI service
    dispatchTryOnJob(job.id, photoPath, product, annotations, drapeStyle, job.provider);

    return res.status(202).json({
      success: true,
      message: 'Try-on job submitted successfully.',
      jobId: job.id,
      status: 'processing',
      provider: job.provider,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        fabric: product.fabric,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tryon/:jobId (Poll status & retrieve result)
router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId;

    const jobRes = await query(
      `SELECT j.id, j.status, j.provider, j.error_message as "errorMessage",
              j.started_at as "startedAt", j.completed_at as "completedAt",
              r.result_image_url as "resultImageUrl", r.is_simulation as "isSimulation",
              r.is_favorite as "isFavorite",
              p.id as "productId", p.name as "productName", p.sku, p.fabric, p.color, p.price
       FROM try_on_jobs j
       LEFT JOIN try_on_results r ON r.job_id = j.id
       LEFT JOIN saree_products p ON p.id = j.product_id
       WHERE j.id = $1`,
      [jobId]
    );

    const job = jobRes.rows[0];
    if (!job) {
      return res.status(404).json({ success: false, error: 'Try-on job not found.' });
    }

    return res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        provider: job.provider,
        resultImageUrl: job.result_image_url || job.resultImageUrl,
        isSimulation: Boolean(job.is_simulation ?? job.isSimulation),
        disclaimer: (job.is_simulation ?? job.isSimulation)
          ? 'SAJEE SIMULATION PREVIEW: This visual preview is generated for UI exploration. Actual fabric weight, pallu drape, and zari luster require showroom drape.'
          : job.provider === 'fal'
          ? 'REAL AI CLOUD DRAPE: Visual drape synthesized via Fal.ai Virtual Try-On (fal-ai/image-apps-v2/virtual-try-on).'
          : job.provider === 'artcraft'
          ? 'REAL AI CLOUD DRAPE: Visual drape synthesized via ArtCraft AI Omni Generation (app.getartcraft.com).'
          : 'REAL AI CLOUD DRAPE: Synthesized via generative diffusion on NVIDIA A100 GPU cluster (cuuupid/idm-vton).',
        errorMessage: job.error_message || job.errorMessage,
        product: {
          id: job.productId || job.product_id,
          name: job.productName || job.name,
          sku: job.sku,
          fabric: job.fabric,
          color: job.color,
          price: job.price,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tryon/:jobId/retry
router.post('/:jobId/retry', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId;

    await query(
      `UPDATE try_on_jobs SET status = 'processing', error_message = NULL, retry_count = retry_count + 1 WHERE id = $1`,
      [jobId]
    );

    // Re-dispatch
    const jobRes = await query(
      `SELECT j.*, p.sku, p.name FROM try_on_jobs j JOIN saree_products p ON p.id = j.product_id WHERE j.id = $1`,
      [jobId]
    );
    const job = jobRes.rows[0];

    if (job) {
      let photoPath = 'sample_photo.jpg';
      if (job.customer_photo_id) {
        const photoRes = await query(`SELECT storage_path FROM uploaded_photos WHERE id = $1`, [job.customer_photo_id]);
        if (photoRes.rows[0]?.storage_path) {
          photoPath = photoRes.rows[0].storage_path;
        }
      }
      dispatchTryOnJob(job.id, photoPath, job, {}, 'nivi', job.provider);
    }

    return res.json({ success: true, message: 'Try-on job restarted.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Worker / Dispatcher helper to call Fal.ai or Python FastAPI microservice
 */
async function dispatchTryOnJob(
  jobId: string,
  personPhotoPath: string,
  product: any,
  annotations: any,
  drapeStyle: string,
  provider: string
) {
  try {
    // 1. Direct Fal.ai Provider execution via @fal-ai/client
    if (provider === 'fal') {
      const falRes = await executeFalTryOn({
        jobId,
        personPhotoPath,
        garmentImagePath: product.primaryImage || 'demo_garment.jpg',
        drapeStyle,
      });

      if (falRes.status === 'completed' && falRes.resultImageUrl) {
        await query(
          `INSERT INTO try_on_results (job_id, result_image_url, is_simulation)
           VALUES ($1, $2, $3)`,
          [jobId, falRes.resultImageUrl, false]
        );
        await query(
          `UPDATE try_on_jobs SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [jobId]
        );
      } else {
        await query(
          `UPDATE try_on_jobs SET status = 'failed', error_message = $1 WHERE id = $2`,
          [falRes.errorMessage || 'Fal.ai virtual try-on failed', jobId]
        );
      }
      return;
    }

    // 2. Direct ArtCraft Omni API execution (app.getartcraft.com)
    if (provider === 'artcraft') {
      const artcraftRes = await executeArtcraftTryOn({
        jobId,
        personPhotoPath,
        garmentImagePath: product.primaryImage || 'demo_garment.jpg',
        product,
        drapeStyle,
      });

      if (artcraftRes.status === 'completed' && artcraftRes.resultImageUrl) {
        await query(
          `INSERT INTO try_on_results (job_id, result_image_url, is_simulation)
           VALUES ($1, $2, $3)`,
          [jobId, artcraftRes.resultImageUrl, false]
        );
        await query(
          `UPDATE try_on_jobs SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [jobId]
        );
      } else {
        await query(
          `UPDATE try_on_jobs SET status = 'failed', error_message = $1 WHERE id = $2`,
          [artcraftRes.errorMessage || 'ArtCraft virtual try-on failed', jobId]
        );
      }
      return;
    }

    // 3. FastAPI microservice inference (Replicate, IDM-VTON, Mock)
    const endpoint = `${config.aiServiceUrl}/inference/tryon`;
    const payload = {
      job_id: jobId,
      person_image_path: personPhotoPath,
      garment_image_path: product.primaryImage || 'demo_garment.jpg',
      garment_metadata: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        fabric: product.fabric,
        color: product.color,
      },
      annotations: {
        body_bbox: annotations.body_bbox || null,
        pallu_bbox: annotations.pallu_bbox || null,
        main_border_bbox: annotations.main_border_bbox || null,
      },
      drape_style: drapeStyle,
      preferred_provider: provider,
    };

    let resultData: any = null;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        resultData = await response.json();
      } else {
        const errorText = await response.text();
        console.error('[AI Service Error]', `Endpoint ${endpoint} returned ${response.status}: ${errorText}`);
        let parsedErr: any = {};
        try { parsedErr = JSON.parse(errorText); } catch {}
        resultData = {
          job_id: jobId,
          status: 'failed',
          error_message: parsedErr.detail || `AI service error (${response.status}): ${response.statusText}`,
          is_simulation: false,
          provider_name: provider,
          processing_time_ms: 0,
        };
      }
    } catch (fetchErr: any) {
      console.warn('[AI Service Connection]', 'FastAPI service not reachable at ' + endpoint + ':', fetchErr?.message);
      if (provider === 'mock') {
        resultData = {
          job_id: jobId,
          status: 'completed',
          result_image_url: product.primaryImage || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85',
          is_simulation: true,
          provider_name: 'mock',
          processing_time_ms: 1450,
        };
      } else {
        resultData = {
          job_id: jobId,
          status: 'failed',
          error_message: `AI service microservice unreachable at ${endpoint}. Please ensure Python FastAPI service is running.`,
          is_simulation: false,
          provider_name: provider,
          processing_time_ms: 0,
        };
      }
    }

    if (!resultData) {
      resultData = {
        job_id: jobId,
        status: 'failed',
        error_message: 'Unknown inference error',
        is_simulation: false,
        provider_name: provider,
        processing_time_ms: 0,
      };
    }

    // Persist result
    if (resultData.status === 'completed') {
      await query(
        `INSERT INTO try_on_results (job_id, result_image_url, is_simulation)
         VALUES ($1, $2, $3)`,
        [jobId, resultData.result_image_url, resultData.is_simulation]
      );

      await query(
        `UPDATE try_on_jobs SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [jobId]
      );
    } else {
      await query(
        `UPDATE try_on_jobs SET status = 'failed', error_message = $1 WHERE id = $2`,
        [resultData.error_message || 'Inference error', jobId]
      );
    }
  } catch (err: any) {
    console.error('[Try-On Worker Error]', err);
    await query(
      `UPDATE try_on_jobs SET status = 'failed', error_message = $1 WHERE id = $2`,
      [err.message, jobId]
    );
  }
}

export default router;
