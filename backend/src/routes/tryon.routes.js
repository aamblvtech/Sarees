import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { getTryOnAdapter, getActiveProviderInfo } from '../adapters/tryon/index.js';
import { sampleModelSilhouettes } from '../data/sampleProducts.js';
import { query } from '../config/db.js';
import imageValidationService from '../services/imageValidationService.js';
import qrSessionService from '../services/qrSessionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Dedicated private uploads directories
const customerUploadsDir = imageValidationService.getUploadsDir();
const customGarmentsDir = imageValidationService.getCustomGarmentsDir();

// Multer storage configuration for silhouettes
const silhouetteStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, customerUploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = `silhouette_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  }
});

const uploadSilhouette = multer({
  storage: silhouetteStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const validation = imageValidationService.validateUploadedFile(file);
    if (!validation.valid) {
      cb(new Error(validation.error));
    } else {
      cb(null, true);
    }
  }
});

// Multer storage configuration for custom outfit garments
const garmentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, customGarmentsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = `garment_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  }
});

const uploadGarment = multer({
  storage: garmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const validation = imageValidationService.validateUploadedFile(file);
    if (!validation.valid) {
      cb(new Error(validation.error));
    } else {
      cb(null, true);
    }
  }
});

/**
 * GET /api/tryon/provider-info
 * Returns metadata about the active AI try-on provider and current mode (Mock vs Real AI)
 */
router.get('/provider-info', async (req, res) => {
  try {
    const info = await getActiveProviderInfo();
    res.json({
      success: true,
      data: info
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/tryon/sample-silhouettes
 * Returns pre-calibrated luxury model silhouettes for instant try-on testing
 */
router.get('/sample-silhouettes', (req, res) => {
  res.json({
    success: true,
    data: sampleModelSilhouettes
  });
});

/**
 * POST /api/tryon/upload
 * Handles customer silhouette photo upload (file upload from computer)
 */
router.post('/upload', uploadSilhouette.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No photo file provided in request.'
    });
  }

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/customer_silhouettes/${req.file.filename}`;
  const filePath = path.join(customerUploadsDir, req.file.filename);
  let qualityAssessment = null;

  try {
    const fileBuffer = fs.readFileSync(filePath);
    qualityAssessment = imageValidationService.inspectCustomerPhoto(fileBuffer, req.file.filename);
  } catch (err) {
    console.warn('[Quality Inspector] Analysis notice:', err.message);
  }

  return res.json({
    success: true,
    message: 'Silhouette photo uploaded and validated successfully.',
    file: {
      filename: req.file.filename,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    },
    qualityAssessment
  });
});

/**
 * POST /api/tryon/upload-base64
 * Handles live webcam snapshots sent directly as base64 data URIs
 */
router.post('/upload-base64', (req, res) => {
  const { dataUri } = req.body;
  if (!dataUri) {
    return res.status(400).json({ success: false, error: 'No dataUri provided.' });
  }

  const validation = imageValidationService.validateBase64DataUri(dataUri);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const filename = `camera_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.jpg`;
  const filePath = path.join(customerUploadsDir, filename);

  try {
    fs.writeFileSync(filePath, validation.buffer);
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/customer_silhouettes/${filename}`;
    const qualityAssessment = imageValidationService.inspectCustomerPhoto(validation.buffer, filename);

    return res.json({
      success: true,
      message: 'Camera snapshot saved and validated.',
      file: {
        filename,
        url: fileUrl,
        size: validation.buffer.length,
        mimetype: validation.mime
      },
      qualityAssessment
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to save camera snapshot: ' + err.message });
  }
});

/**
 * POST /api/tryon/inspect-photo
 * Inspects a customer photo to evaluate full-body visibility, framing, and identity preservation potential
 */
router.post('/inspect-photo', async (req, res) => {
  const { photoUrl, filename } = req.body;
  if (!photoUrl && !filename) {
    return res.status(400).json({ success: false, error: 'photoUrl or filename is required.' });
  }

  try {
    const targetFile = filename || path.basename(photoUrl.split('?')[0]);
    const filePath = path.join(customerUploadsDir, targetFile);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Photograph file not found on server.' });
    }

    const buffer = fs.readFileSync(filePath);
    const qualityAssessment = imageValidationService.inspectCustomerPhoto(buffer, targetFile);

    res.json({
      success: true,
      data: qualityAssessment
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tryon/upload-garment
 * Handles custom outfit image upload (Module 2)
 */
router.post('/upload-garment', uploadGarment.single('garment'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No garment outfit image file provided in request.'
    });
  }

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/custom_garments/${req.file.filename}`;

  return res.json({
    success: true,
    message: 'Custom outfit garment uploaded successfully.',
    file: {
      filename: req.file.filename,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
});

/**
 * POST /api/tryon/qr-sessions
 * Creates a single-use 5-minute QR mobile upload session (Module 4)
 */
router.post('/qr-sessions', async (req, res) => {
  try {
    const session = await qrSessionService.createSession(req);
    res.status(201).json({
      success: true,
      session
    });
  } catch (err) {
    console.error('[QR Session Creation Error]:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR session: ' + err.message
    });
  }
});

/**
 * GET /api/tryon/qr-sessions/:token
 * Polls status of a mobile upload session (Module 4 & 5)
 */
router.get('/qr-sessions/:token', async (req, res) => {
  try {
    const session = await qrSessionService.getSession(req.params.token);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'QR upload session not found or expired.'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tryon/qr-sessions/:token/upload
 * Handles mobile photo upload from phone camera or gallery (Module 4)
 */
router.post('/qr-sessions/:token/upload', uploadSilhouette.single('photo'), async (req, res) => {
  try {
    const consent = req.body.consent === 'true' || req.body.consent === true;
    const result = await qrSessionService.handleMobileUpload(req.params.token, req.file, consent);
    res.status(200).json(result);
  } catch (err) {
    console.warn('[Mobile QR Upload Warning]:', err.message);
    res.status(err.status || 400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/tryon/qr-sessions/:token/consume
 * Marks QR session as consumed once imported onto kiosk (Module 5)
 */
router.post('/qr-sessions/:token/consume', async (req, res) => {
  try {
    await qrSessionService.consumeSession(req.params.token);
    res.json({ success: true, message: 'Session consumed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tryon/jobs
 * Creates and submits a virtual try-on job to the AI engine
 * Supports:
 *  - Existing catalogue product (via productId)
 *  - Custom customer-uploaded outfit (via customGarmentUrl)
 */
router.post('/jobs', async (req, res) => {
  const {
    productId,
    customGarmentUrl,
    customGarmentFilename,
    customGarmentName,
    userPhotoUrl,
    userPhotoFilename,
    selectedSize = 'M',
    fitPreference = 'tailored',
    category
  } = req.body;

  if (!userPhotoUrl) {
    return res.status(400).json({ success: false, error: 'userPhotoUrl is required.' });
  }

  if (!productId && !customGarmentUrl) {
    return res.status(400).json({
      success: false,
      error: 'Either productId (catalogue item) or customGarmentUrl (custom outfit) is required.'
    });
  }

  const jobUuid = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const adapter = getTryOnAdapter();

  try {
    let garment = null;
    let garmentImageUrl = null;
    let resolvedGarmentFilename = customGarmentFilename || null;
    let garmentDescription = '';
    let garmentCategory = category || 'upper_body';

    if (productId) {
      // 1. Fetch garment details from PostgreSQL database
      const prodResult = await query(
        `SELECT p.id, p.name, p.slug, p.description, p.category_id, p.subcategory,
                p.gender, p.garment_type AS garment_type, p.tryon_compatibility,
                p.primary_image_url, p.tryon_image_url,
                c.name AS category_name, c.slug AS category_slug
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = $1 LIMIT 1`,
        [parseInt(productId, 10)]
      );

      if (!prodResult.rows || prodResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Garment not found in database.' });
      }

      garment = prodResult.rows[0];

      // Check Try-On Compatibility: block only unsupported items (e.g. accessories)
      if (garment.tryon_compatibility === 'unsupported' || garment.garment_type === 'accessory') {
        return res.status(400).json({
          success: false,
          error: 'Accessories cannot be rendered with clothing diffusion try-on models. 3D AR mesh overlay is required for jewelry, belts, and accessories.',
          compatibilityStatus: 'unsupported'
        });
      }

      garmentImageUrl = garment.tryon_image_url || garment.primary_image_url || userPhotoUrl;
      garmentDescription = garment.name + (garment.description ? ` - ${garment.description.slice(0, 150)}` : '');
      garmentCategory = garment.garment_type || 'upper_body';

      if (garmentCategory === 'saree') {
        garmentCategory = 'full_body';
      }

      if (!['upper_body', 'lower_body', 'full_body'].includes(garmentCategory)) {
        if (['trousers', 'jeans', 'skirts', 'pants'].includes(garment.subcategory)) {
          garmentCategory = 'lower_body';
        } else if (['gowns', 'dresses', 'salwar_suits', 'sarees'].includes(garment.subcategory)) {
          garmentCategory = 'full_body';
        } else {
          garmentCategory = 'upper_body';
        }
      }
    } else {
      // 2. Custom Customer Garment Flow
      garmentImageUrl = customGarmentUrl;
      if (!resolvedGarmentFilename && customGarmentUrl) {
        resolvedGarmentFilename = path.basename(customGarmentUrl.split('?')[0]);
      }
      garmentDescription = customGarmentName || 'Customer Custom Garment';

      if (!['upper_body', 'lower_body', 'full_body'].includes(garmentCategory)) {
        if (garmentCategory === 'saree') {
          garmentCategory = 'full_body';
        } else if (garmentCategory === 'accessory') {
          return res.status(400).json({
            success: false,
            error: 'Accessories are unsupported by 2D garment diffusion try-on.',
            compatibilityStatus: 'unsupported'
          });
        } else {
          garmentCategory = 'upper_body';
        }
      }

      garment = {
        id: null,
        name: customGarmentName || 'Custom Outfit Garment',
        slug: 'custom-outfit',
        description: 'Customer uploaded custom outfit',
        garmentType: garmentCategory,
        tryonCompatibility: 'supported'
      };
    }

    // 3. Insert initial job record into PostgreSQL
    await query(
      `INSERT INTO tryon_jobs (
         job_uuid, product_id, custom_garment_url, custom_garment_name,
         user_photo_url, garment_image_url, garment_category,
         selected_size, status, provider, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      [
        jobUuid,
        garment.id || null,
        customGarmentUrl || null,
        customGarmentName || null,
        userPhotoUrl,
        garmentImageUrl,
        garmentCategory,
        selectedSize,
        'processing',
        adapter.name
      ]
    );

    // 4. Initiate job with provider
    try {
      if (typeof adapter.submitTryOnJob === 'function') {
        const submission = await adapter.submitTryOnJob({
          userPhotoUrl,
          userPhotoFilename,
          garmentImageUrl,
          customGarmentFilename: resolvedGarmentFilename,
          garment,
          productId: garment.id || 'custom-outfit',
          garmentDescription,
          category: garmentCategory,
          selectedSize,
          fitPreference
        });

        // Update provider_job_id & customer_image_id in PostgreSQL
        await query(
          `UPDATE tryon_jobs
           SET provider_job_id = $1, customer_image_id = $2, status = 'processing'
           WHERE job_uuid = $3`,
          [submission.providerJobId, submission.customerImageId || null, jobUuid]
        );

        // If completed immediately
        if (submission.status === 'succeeded' || submission.status === 'completed') {
          if (submission.output || submission.resultImageUrl) {
            const outUrl = submission.resultImageUrl || (Array.isArray(submission.output) ? submission.output[0] : submission.output);
            await saveCompletedResult(jobUuid, outUrl, adapter.name, !!submission.isMock, false);

            return res.status(201).json({
              success: true,
              jobId: jobUuid,
              status: 'completed',
              provider: adapter.name,
              result: {
                resultImageUrl: outUrl,
                provider: adapter.name,
                isMock: !!submission.isMock,
                isSimulation: false
              }
            });
          }
        }

        // Return processing job for client polling
        return res.status(202).json({
          success: true,
          jobId: jobUuid,
          providerJobId: submission.providerJobId,
          customerImageId: submission.customerImageId,
          status: 'processing',
          provider: adapter.name,
          isMock: !!submission.isMock,
          message: submission.isMock
            ? 'Genlook mock try-on job submitted (Zero credits consumed).'
            : 'Genlook AI try-on job submitted to cloud worker.'
        });
      } else {
        const result = await adapter.processTryOn({
          userPhotoUrl,
          garmentImageUrl,
          selectedSize,
          garmentDescription,
          category: garmentCategory,
          options: { fitPreference }
        });

        await saveCompletedResult(jobUuid, result.resultImageUrl, adapter.name, !!result.isMock, result.isSimulation);

        return res.status(201).json({
          success: true,
          jobId: jobUuid,
          status: 'completed',
          provider: adapter.name,
          result
        });
      }
    } catch (providerErr) {
      const errorCode = providerErr.code || 'PROVIDER_ERROR';
      await query(
        `UPDATE tryon_jobs
         SET status = 'failed', error_message = $1, error_code = $2, completed_at = CURRENT_TIMESTAMP
         WHERE job_uuid = $3`,
        [providerErr.message, errorCode, jobUuid]
      );

      console.error('[TryOn Job Failed]:', providerErr.message);

      const httpStatus = providerErr.status || 502;
      return res.status(httpStatus).json({
        success: false,
        jobId: jobUuid,
        status: 'failed',
        provider: adapter.name,
        error: providerErr.message,
        code: errorCode
      });
    }
  } catch (err) {
    console.error('[TryOn Job Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to process try-on job: ' + err.message
    });
  }
});

/**
 * Helper to persist completed result to PostgreSQL
 */
async function saveCompletedResult(jobUuid, resultImageUrl, provider, isMock = false, isSimulation = false) {
  const jobRow = await query('SELECT id FROM tryon_jobs WHERE job_uuid = $1', [jobUuid]);
  if (!jobRow.rows || jobRow.rows.length === 0) return;

  const jobId = jobRow.rows[0].id;

  await query(
    `UPDATE tryon_jobs
     SET status = 'completed', completed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [jobId]
  );

  await query(
    `INSERT INTO tryon_results (
       job_id, result_image_url, composite_details, fit_score, is_simulation, is_mock
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (job_id) DO UPDATE
     SET result_image_url = EXCLUDED.result_image_url,
         is_simulation = EXCLUDED.is_simulation,
         is_mock = EXCLUDED.is_mock,
         composite_details = EXCLUDED.composite_details`,
    [
      jobId,
      resultImageUrl,
      JSON.stringify({
        provider,
        engine: isMock
          ? 'Genlook Official Virtual Try-On API (v1 Mock Mode)'
          : isSimulation
          ? 'Prototype Simulation'
          : 'Genlook Official Virtual Try-On API (v1 Real AI)',
        isMock,
        savedAt: new Date().toISOString()
      }),
      0.98,
      isSimulation,
      isMock
    ]
  );
}

/**
 * GET /api/tryon/jobs/:id
 * Retrieve job status and generated result directly from PostgreSQL
 */
router.get('/jobs/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const jobResult = await query(
      `SELECT j.*, r.result_image_url, r.is_simulation, r.is_mock, r.composite_details, r.fit_score
       FROM tryon_jobs j
       LEFT JOIN tryon_results r ON j.id = r.job_id
       WHERE j.job_uuid = $1 OR j.id::text = $1
       LIMIT 1`,
      [id]
    );

    if (!jobResult.rows || jobResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Try-on job not found in database.',
        jobId: id
      });
    }

    const job = jobResult.rows[0];

    // If still processing and has a provider job ID, check provider status
    if (job.status === 'processing' && job.provider_job_id) {
      const adapter = getTryOnAdapter();
      if (typeof adapter.checkJobStatus === 'function') {
        try {
          const providerStatus = await adapter.checkJobStatus(job.provider_job_id);

          if (providerStatus.status === 'completed' && providerStatus.resultImageUrl) {
            // Guard: in Real AI mode, ensure output is not identical to input photo
            if (!providerStatus.isMock && providerStatus.resultImageUrl === job.user_photo_url) {
              await query(
                'UPDATE tryon_jobs SET status = $1, error_message = $2, error_code = $3 WHERE id = $4',
                ['failed', 'AI generation anomaly: Provider returned unmodified customer image. Garment was not applied.', 'UNMODIFIED_OUTPUT', job.id]
              );
              job.status = 'failed';
              job.error_message = 'AI generation anomaly: Provider returned unmodified customer image. Garment was not applied.';
              job.error_code = 'UNMODIFIED_OUTPUT';
            } else {
              await saveCompletedResult(job.job_uuid, providerStatus.resultImageUrl, adapter.name, !!providerStatus.isMock, false);
              job.status = 'completed';
              job.result_image_url = providerStatus.resultImageUrl;
              job.is_simulation = false;
              job.is_mock = !!providerStatus.isMock;
            }
          } else if (providerStatus.status === 'failed') {
            await query(
              'UPDATE tryon_jobs SET status = $1, error_message = $2, error_code = $3 WHERE id = $4',
              ['failed', providerStatus.error || 'AI generation failed.', providerStatus.errorCode || 'FAILED', job.id]
            );
            job.status = 'failed';
            job.error_message = providerStatus.error;
            job.error_code = providerStatus.errorCode;
          }
        } catch (pollErr) {
          console.warn('[TryOn Job Poll Warning]:', pollErr.message);
        }
      }
    }

    return res.json({
      success: true,
      jobId: job.job_uuid,
      providerJobId: job.provider_job_id,
      customerImageId: job.customer_image_id,
      status: job.status,
      provider: job.provider,
      error: job.error_message,
      errorCode: job.error_code,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      result: job.result_image_url
        ? {
            resultImageUrl: job.result_image_url,
            isMock: job.is_mock ?? false,
            isSimulation: job.is_simulation ?? false,
            fitScore: job.fit_score || 0.98,
            compositeDetails: job.composite_details
          }
        : null
    });
  } catch (err) {
    console.error('[Get TryOn Job Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/tryon/cleanup/:filename
 * Privacy requirement: securely purges temporary customer silhouette photo and triggers GDPR erasure
 */
router.delete('/cleanup/:filename', async (req, res) => {
  const { filename } = req.params;
  const { externalUserId } = req.query;

  // 1. Delete local file from backend storage
  const deleted = imageValidationService.deleteCustomerPhoto(filename);

  // 2. Trigger GDPR customer deletion on Genlook provider if requested
  const adapter = getTryOnAdapter();
  if (externalUserId && typeof adapter.purgeCustomerData === 'function') {
    await adapter.purgeCustomerData(externalUserId);
  }

  res.json({
    success: true,
    deleted,
    message: deleted
      ? `Silhouette '${filename}' permanently purged from server.`
      : `File '${filename}' was already removed or not found.`
  });
});

export default router;
