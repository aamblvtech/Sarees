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
import resultQualityService from '../services/resultQualityService.js';

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
 * Helper: Execute a single try-on job independently
 * Ensures strict 1:1 product-to-job mapping, isolated database records, and separate error handling.
 */
export async function executeSingleTryOnJob({
  jobUuidOverride,
  existingJobId,
  productId,
  productTitle,
  productSku,
  productImageUrl,
  sessionId,
  customerSessionId,
  customGarmentUrl,
  customGarmentFilename,
  customGarmentName,
  userPhotoUrl,
  userPhotoFilename,
  customerImageId,
  selectedSize = 'M',
  fitPreference = 'tailored',
  category
}) {
  const activeSessionId = sessionId || customerSessionId || `sess_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  if (!userPhotoUrl) {
    return {
      httpStatus: 400,
      body: { success: false, error: 'userPhotoUrl is required.' }
    };
  }

  if (!productId && !customGarmentUrl) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: 'Either productId (catalogue item) or customGarmentUrl (custom outfit) is required.'
      }
    };
  }

  const jobUuid = jobUuidOverride || `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const adapter = getTryOnAdapter();

  try {
    let garment = null;
    let garmentImageUrl = null;
    let resolvedGarmentFilename = customGarmentFilename || null;
    let garmentDescription = '';
    let garmentCategory = category || 'upper_body';
    let imageHash = '';
    let externalId = '';

    if (productId) {
      // 1. Fetch garment details from PostgreSQL database
      const parsedId = parseInt(productId, 10);
      if (isNaN(parsedId)) {
        return {
          httpStatus: 400,
          body: {
            success: false,
            error: `Invalid product ID '${productId}'. Must be a valid integer.`,
            code: 'INVALID_PRODUCT_ID'
          }
        };
      }

      const prodResult = await query(
        `SELECT p.id, p.sku, p.name, p.slug, p.description, p.category_id, p.subcategory,
                p.gender, p.garment_type AS garment_type, p.tryon_compatibility,
                p.primary_image_url, p.tryon_image_url, p.material, p.fit, p.care_instructions,
                p.is_active, p.updated_at,
                c.name AS category_name, c.slug AS category_slug
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = $1 LIMIT 1`,
        [parsedId]
      );

      if (!prodResult.rows || prodResult.rows.length === 0) {
        return {
          httpStatus: 404,
          body: {
            success: false,
            error: `Product with ID ${parsedId} does not exist in the catalogue.`,
            code: 'PRODUCT_NOT_FOUND'
          }
        };
      }

      garment = prodResult.rows[0];

      // Check active availability
      if (garment.is_active === false) {
        return {
          httpStatus: 400,
          body: {
            success: false,
            error: `Product '${garment.name}' (ID: ${garment.id}) is archived and unavailable for virtual try-on.`,
            code: 'PRODUCT_INACTIVE'
          }
        };
      }

      // Title validation against database record
      if (productTitle && typeof productTitle === 'string') {
        const cleanSubmitted = productTitle.trim().toLowerCase();
        const cleanDbTitle = garment.name.trim().toLowerCase();
        if (cleanSubmitted !== cleanDbTitle && !cleanDbTitle.includes(cleanSubmitted) && !cleanSubmitted.includes(cleanDbTitle)) {
          return {
            httpStatus: 400,
            body: {
              success: false,
              error: `Product title mismatch: Submitted title '${productTitle}' does not match catalogue record '${garment.name}' for ID ${garment.id}.`,
              code: 'PRODUCT_TITLE_MISMATCH',
              expectedTitle: garment.name,
              receivedTitle: productTitle
            }
          };
        }
      }

      // Check Try-On Compatibility: block only unsupported items (e.g. accessories)
      if (garment.tryon_compatibility === 'unsupported' || garment.garment_type === 'accessory') {
        return {
          httpStatus: 400,
          body: {
            success: false,
            error: 'Accessories cannot be rendered with clothing diffusion try-on models. 3D AR mesh overlay is required for jewelry, belts, and accessories.',
            compatibilityStatus: 'unsupported'
          }
        };
      }

      // Garment image validation: MUST have valid image, never fallback to user photo
      garmentImageUrl = garment.tryon_image_url || garment.primary_image_url;
      if (!garmentImageUrl || typeof garmentImageUrl !== 'string' || garmentImageUrl.trim() === '') {
        return {
          httpStatus: 400,
          body: {
            success: false,
            error: `Product '${garment.name}' (ID: ${garment.id}) does not have a valid garment photograph. Cannot proceed with try-on.`,
            code: 'MISSING_GARMENT_IMAGE'
          }
        };
      }

      // Product Image URL validation against database record if submitted by frontend
      if (productImageUrl && typeof productImageUrl === 'string') {
        const cleanSubmittedImg = productImageUrl.split('?')[0];
        const cleanDbPrimary = (garment.primary_image_url || '').split('?')[0];
        const cleanDbTryon = (garment.tryon_image_url || '').split('?')[0];
        
        let matchesDbImage = (cleanSubmittedImg === cleanDbPrimary || cleanSubmittedImg === cleanDbTryon);

        if (!matchesDbImage) {
          const checkImages = await query(
            'SELECT image_url FROM product_images WHERE product_id = $1',
            [garment.id]
          );
          matchesDbImage = checkImages.rows.some(r => r.image_url?.split('?')[0] === cleanSubmittedImg);
        }

        if (!matchesDbImage) {
          return {
            httpStatus: 400,
            body: {
              success: false,
              error: `Product image mismatch: The submitted image URL does not belong to product '${garment.name}' (ID: ${garment.id}).`,
              code: 'PRODUCT_IMAGE_MISMATCH'
            }
          };
        }
      }

      // Fetch multiple views from product_images where available
      try {
        const imgRes = await query(
          `SELECT image_url, alt_text, is_primary, sort_order FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, sort_order ASC`,
          [garment.id]
        );
        if (imgRes.rows && imgRes.rows.length > 0) {
          garment.images = imgRes.rows.map(r => ({
            url: r.image_url,
            orientation: r.alt_text?.toLowerCase().includes('back') ? 'back' : 'front',
            on_model: 'true'
          }));
        } else if (garment.primary_image_url) {
          garment.images = [{ url: garment.primary_image_url, orientation: 'front', on_model: 'true' }];
        }
      } catch (imgErr) {
        if (garment.primary_image_url) {
          garment.images = [{ url: garment.primary_image_url, orientation: 'front', on_model: 'true' }];
        }
      }

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

      imageHash = crypto.createHash('sha256').update(garmentImageUrl).digest('hex').slice(0, 16);
      const rawSlug = garment.slug || `prod-${garment.id}`;
      externalId = `vestra-${rawSlug}-v${imageHash.slice(0, 8)}`;
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
          return {
            httpStatus: 400,
            body: {
              success: false,
              error: 'Accessories are unsupported by 2D garment diffusion try-on.',
              compatibilityStatus: 'unsupported'
            }
          };
        } else {
          garmentCategory = 'upper_body';
        }
      }

      imageHash = crypto.createHash('sha256').update(garmentImageUrl || resolvedGarmentFilename || 'custom').digest('hex').slice(0, 16);
      externalId = `vestra-custom-${imageHash.slice(0, 8)}`;

      garment = {
        id: null,
        name: customGarmentName || 'Custom Outfit Garment',
        slug: 'custom-outfit',
        description: 'Customer uploaded custom outfit',
        garmentType: garmentCategory,
        tryonCompatibility: 'supported'
      };
    }

    console.log(`[TryOn Pipeline: Stage 7 Validated] Product ID: ${garment.id} | External ID: ${externalId} | Title: "${garment.name}" | Image URL: ${garmentImageUrl} | Image Hash: ${imageHash} | Category: ${garmentCategory} | Session ID: ${activeSessionId} | Job UUID: ${jobUuid}`);

    // 3. Insert or update initial job record into PostgreSQL
    if (existingJobId) {
      await query(
        `UPDATE tryon_jobs
         SET status = 'processing', error_message = NULL, error_code = NULL,
             user_photo_url = $1, garment_image_url = $2, fit_preference = $3, selected_size = $4
         WHERE id = $5`,
        [userPhotoUrl, garmentImageUrl, fitPreference, selectedSize, existingJobId]
      );
    } else {
      await query(
        `INSERT INTO tryon_jobs (
           job_uuid, session_id, customer_session_id, product_id,
           product_title, product_external_id, product_image_hash,
           custom_garment_url, custom_garment_name,
           user_photo_url, garment_image_url, garment_category,
           selected_size, fit_preference, credits_used,
           status, provider, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)`,
        [
          jobUuid,
          null,
          activeSessionId,
          garment.id || null,
          garment.name,
          externalId,
          imageHash,
          customGarmentUrl || null,
          customGarmentName || null,
          userPhotoUrl,
          garmentImageUrl,
          garmentCategory,
          selectedSize,
          fitPreference,
          adapter.isMockMode ? 0 : 1,
          'processing',
          adapter.name
        ]
      );
    }

    // 4. Initiate job with provider
    try {
      if (typeof adapter.submitTryOnJob === 'function') {
        const submission = await adapter.submitTryOnJob({
          userPhotoUrl,
          userPhotoFilename,
          customerImageId,
          garmentImageUrl,
          customGarmentFilename: resolvedGarmentFilename,
          garment,
          productId: garment.id || 'custom-outfit',
          garmentDescription,
          category: garmentCategory,
          selectedSize,
          fitPreference,
          externalUserId: activeSessionId
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

            const savedRes = await query(
              'SELECT fit_score, composite_details FROM tryon_results WHERE job_id = (SELECT id FROM tryon_jobs WHERE job_uuid = $1)',
              [jobUuid]
            );
            const parsedSavedDetails = savedRes.rows[0]?.composite_details
              ? (typeof savedRes.rows[0].composite_details === 'string'
                  ? JSON.parse(savedRes.rows[0].composite_details)
                  : savedRes.rows[0].composite_details)
              : {};
            const qAssessment = parsedSavedDetails.qualityAssessment || null;
            const vStatus = qAssessment?.verificationStatus || 'VERIFIED';
            const fScore = savedRes.rows[0]?.fit_score || qAssessment?.overallScore || 0.95;

            return {
              httpStatus: 201,
              body: {
                success: true,
                jobId: jobUuid,
                status: 'completed',
                provider: adapter.name,
                customerImageId: submission.customerImageId || customerImageId || null,
                productId: garment.id || null,
                productTitle: garment.name,
                productExternalId: externalId,
                productImageHash: imageHash,
                garmentImageUrl,
                customerSessionId: activeSessionId,
                selectedSize,
                fitPreference,
                creditsUsed: submission.isMock ? 0 : 1,
                result: {
                  resultImageUrl: outUrl,
                  provider: adapter.name,
                  isMock: !!submission.isMock,
                  isSimulation: false,
                  fitScore: fScore,
                  verificationStatus: vStatus,
                  qualityAssessment: qAssessment,
                  compositeDetails: parsedSavedDetails,
                  productTitle: garment.name,
                  productId: garment.id || null,
                  garmentImageUrl
                }
              }
            };
          }
        }

        // Return processing job for client polling
        return {
          httpStatus: 202,
          body: {
            success: true,
            jobId: jobUuid,
            providerJobId: submission.providerJobId,
            customerImageId: submission.customerImageId,
            status: 'processing',
            provider: adapter.name,
            productId: garment.id || null,
            productTitle: garment.name,
            productExternalId: externalId,
            productImageHash: imageHash,
            garmentImageUrl,
            customerSessionId: activeSessionId,
            selectedSize,
            fitPreference,
            creditsUsed: submission.isMock ? 0 : 1,
            isMock: !!submission.isMock,
            message: submission.isMock
              ? 'Genlook mock try-on job submitted (Zero credits consumed).'
              : 'Genlook AI try-on job submitted to cloud worker.'
          }
        };
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

        return {
          httpStatus: 201,
          body: {
            success: true,
            jobId: jobUuid,
            status: 'completed',
            provider: adapter.name,
            productId: garment.id || null,
            productTitle: garment.name,
            productExternalId: externalId,
            productImageHash: imageHash,
            garmentImageUrl,
            customerSessionId: activeSessionId,
            creditsUsed: result.isMock ? 0 : 1,
            result: {
              ...result,
              productTitle: garment.name,
              productId: garment.id || null,
              garmentImageUrl
            }
          }
        };
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
      return {
        httpStatus,
        body: {
          success: false,
          jobId: jobUuid,
          status: 'failed',
          provider: adapter.name,
          error: providerErr.message,
          code: errorCode,
          productId: garment?.id || null,
          productTitle: garment?.name || null,
          garmentImageUrl
        }
      };
    }
  } catch (err) {
    console.error('[TryOn Job Error]:', err.message);
    return {
      httpStatus: 500,
      body: {
        success: false,
        error: 'Failed to process try-on job: ' + err.message
      }
    };
  }
}

/**
 * POST /api/tryon/jobs
 * Creates and submits a single virtual try-on job to the AI engine
 */
router.post('/jobs', async (req, res) => {
  try {
    const outcome = await executeSingleTryOnJob(req.body);
    return res.status(outcome.httpStatus).json(outcome.body);
  } catch (err) {
    console.error('[TryOn Route Error]:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to process try-on job: ' + err.message });
  }
});

/**
 * POST /api/tryon/batch-jobs
 * Creates and submits multiple independent virtual try-on jobs (one per selected outfit).
 * Reuses the same customer silhouette photo across all requests.
 * Each job gets its own job_uuid, product ID, and independent database record.
 */
router.post('/batch-jobs', async (req, res) => {
  try {
    const {
      productIds = [],
      products = [],
      userPhotoUrl,
      userPhotoFilename,
      sessionId,
      customerSessionId,
      selectedSize = 'M',
      fitPreference = 'tailored'
    } = req.body;

    const activeSessionId = sessionId || customerSessionId || `sess_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    if (!userPhotoUrl) {
      return res.status(400).json({ success: false, error: 'userPhotoUrl is required.' });
    }

    // Determine target product items: either array of IDs or array of product objects
    let targetIds = [];
    if (Array.isArray(productIds) && productIds.length > 0) {
      targetIds = productIds;
    } else if (Array.isArray(products) && products.length > 0) {
      targetIds = products.map(p => (typeof p === 'object' ? p.id : p));
    }

    if (targetIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one productId is required for batch try-on.' });
    }

    // Prevent duplicate product selections in the batch
    const uniqueIds = Array.from(new Set(targetIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id))));

    if (uniqueIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid numeric product IDs provided.' });
    }

    // Resolve customer image once before dispatching to eliminate redundant 1.4s upload delay
    const adapter = getTryOnAdapter();
    let sharedCustomerImageId = req.body.customerImageId || null;
    if (!sharedCustomerImageId && userPhotoUrl && typeof adapter.getOrUploadCustomerImage === 'function') {
      try {
        sharedCustomerImageId = await adapter.getOrUploadCustomerImage(userPhotoUrl, activeSessionId);
      } catch (uploadErr) {
        console.warn('[Batch TryOn] Customer image pre-upload warning:', uploadErr.message);
      }
    }

    // Process all outfits concurrently: each gets its own tryon_jobs row and Genlook request
    const outcomes = await Promise.all(
      uniqueIds.map(pid =>
        executeSingleTryOnJob({
          productId: pid,
          userPhotoUrl,
          userPhotoFilename,
          customerImageId: sharedCustomerImageId,
          sessionId: activeSessionId,
          selectedSize,
          fitPreference
        })
      )
    );

    const results = outcomes.map(outcome => ({
      ...outcome.body,
      httpStatus: outcome.httpStatus
    }));

    return res.status(201).json({
      success: true,
      count: results.length,
      sessionId: activeSessionId,
      customerImageId: sharedCustomerImageId,
      jobs: results
    });
  } catch (err) {
    console.error('[Batch TryOn Error]:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to process batch try-on: ' + err.message });
  }
});

/**
 * POST /api/tryon/jobs/:id/retry
 * Retries a failed try-on job without re-running successful jobs.
 */
router.post('/jobs/:id/retry', async (req, res) => {
  const { id } = req.params;

  try {
    const jobResult = await query(
      `SELECT j.*, r.result_image_url
       FROM tryon_jobs j
       LEFT JOIN tryon_results r ON j.id = r.job_id
       WHERE j.job_uuid = $1 OR j.id::text = $1
       LIMIT 1`,
      [id]
    );

    if (!jobResult.rows || jobResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Try-on job '${id}' not found in database.` });
    }

    const job = jobResult.rows[0];

    // If job was already completed successfully, return the result without deducting credits
    if (job.status === 'completed' && job.result_image_url) {
      return res.json({
        success: true,
        jobId: job.job_uuid,
        status: 'completed',
        message: 'Job was already completed successfully.',
        result: {
          resultImageUrl: job.result_image_url,
          productId: job.product_id,
          productTitle: job.product_title,
          garmentImageUrl: job.garment_image_url
        }
      });
    }

    // Re-execute generation for this single job
    const outcome = await executeSingleTryOnJob({
      jobUuidOverride: job.job_uuid,
      existingJobId: job.id,
      productId: job.product_id,
      productTitle: job.product_title,
      userPhotoUrl: job.user_photo_url,
      customerImageId: job.customer_image_id || req.body?.customerImageId,
      customGarmentUrl: job.custom_garment_url,
      customGarmentName: job.custom_garment_name,
      sessionId: job.customer_session_id,
      selectedSize: job.selected_size,
      fitPreference: job.fit_preference,
      category: job.garment_category
    });

    return res.status(outcome.httpStatus).json(outcome.body);
  } catch (err) {
    console.error('[Retry TryOn Job Error]:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to retry try-on job: ' + err.message });
  }
});

/**
 * Helper to persist completed result to PostgreSQL
 */
async function saveCompletedResult(jobUuid, resultImageUrl, provider, isMock = false, isSimulation = false) {
  const jobRow = await query(
    `SELECT j.*, p.name AS prod_name, p.description AS prod_desc, p.garment_type, p.subcategory, p.material, p.fit, p.primary_image_url
     FROM tryon_jobs j
     LEFT JOIN products p ON j.product_id = p.id
     WHERE j.job_uuid = $1`,
    [jobUuid]
  );
  if (!jobRow.rows || jobRow.rows.length === 0) return;

  const jobData = jobRow.rows[0];
  const jobId = jobData.id;

  // Resolve customer photo buffer if available on disk for genuine inspection
  let customerPhotoBuffer = null;
  if (jobData.user_photo_url) {
    try {
      const photoName = path.basename(jobData.user_photo_url.split('?')[0]);
      const photoPath = path.join(customerUploadsDir, photoName);
      if (fs.existsSync(photoPath)) {
        customerPhotoBuffer = fs.readFileSync(photoPath);
      }
    } catch (e) {
      // remote URL
    }
  }

  // Fetch product images for multi-view assessment
  let multiImages = [];
  if (jobData.product_id) {
    try {
      const pImgs = await query('SELECT image_url, alt_text FROM product_images WHERE product_id = $1', [jobData.product_id]);
      multiImages = pImgs.rows || [];
    } catch (e) {}
  }

  // Run comprehensive result quality & fidelity verification
  const qualityAssessment = resultQualityService.evaluateResult({
    customerPhotoBuffer,
    customerPhotoUrl: jobData.user_photo_url,
    garment: {
      id: jobData.product_id,
      name: jobData.product_title || jobData.prod_name || jobData.custom_garment_name || 'Garment',
      description: jobData.prod_desc || '',
      garment_type: jobData.garment_type || jobData.garment_category,
      subcategory: jobData.subcategory || '',
      material: jobData.material || '',
      fit: jobData.fit || '',
      primary_image_url: jobData.garment_image_url || jobData.primary_image_url,
      images: multiImages
    },
    resultImageUrl,
    isMock
  });

  await query(
    `INSERT INTO tryon_results (
       job_id, result_image_url, composite_details, fit_score, is_mock, is_simulation, created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
     ON CONFLICT (job_id) DO UPDATE
     SET result_image_url = EXCLUDED.result_image_url, composite_details = EXCLUDED.composite_details, fit_score = EXCLUDED.fit_score`,
    [
      jobId,
      resultImageUrl,
      JSON.stringify({ qualityAssessment }),
      qualityAssessment.overallScore,
      isMock,
      isSimulation
    ]
  );

  await query(
    `UPDATE tryon_jobs
     SET status = 'completed', completed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [jobId]
  );
}

/**
 * GET /api/tryon/history
 * Retrieve generation history with guaranteed product-mapping integrity
 */
router.get('/history', async (req, res) => {
  const { sessionId, productId, limit = 20 } = req.query;

  try {
    let sql = `
      SELECT 
        j.id,
        j.job_uuid AS "jobId",
        j.customer_session_id AS "sessionId",
        j.product_id AS "productId",
        COALESCE(j.product_title, p.name, j.custom_garment_name, 'Bespoke Garment') AS "productTitle",
        j.product_external_id AS "productExternalId",
        j.product_image_hash AS "productImageHash",
        j.garment_image_url AS "garmentImageUrl",
        j.garment_category AS "garmentCategory",
        j.selected_size AS "selectedSize",
        j.fit_preference AS "fitPreference",
        j.credits_used AS "creditsUsed",
        j.status,
        j.provider,
        j.provider_job_id AS "providerJobId",
        j.error_message AS "errorMessage",
        j.created_at AS "createdAt",
        j.completed_at AS "completedAt",
        r.result_image_url AS "resultImageUrl",
        r.fit_score AS "fitScore",
        r.composite_details AS "compositeDetails"
      FROM tryon_jobs j
      LEFT JOIN products p ON j.product_id = p.id
      LEFT JOIN tryon_results r ON j.id = r.job_id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (sessionId) {
      sql += ` AND j.customer_session_id = $${paramIndex}`;
      params.push(sessionId);
      paramIndex++;
    }

    if (productId) {
      sql += ` AND j.product_id = $${paramIndex}`;
      params.push(parseInt(productId, 10));
      paramIndex++;
    }

    sql += ` ORDER BY j.created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit, 10));

    const result = await query(sql, params);

    const history = result.rows.map(row => {
      let parsedComposite = null;
      if (typeof row.compositeDetails === 'string') {
        try { parsedComposite = JSON.parse(row.compositeDetails); } catch (_) {}
      } else if (row.compositeDetails) {
        parsedComposite = row.compositeDetails;
      }

      return {
        ...row,
        verificationStatus: parsedComposite?.qualityAssessment?.verificationStatus || (row.status === 'completed' ? 'VERIFIED' : row.status.toUpperCase()),
        compositeDetails: parsedComposite
      };
    });

    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (err) {
    console.error('[Get TryOn History Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/tryon/jobs/:id
 * Retrieve job status and generated result directly from PostgreSQL with full product dossier
 */
router.get('/jobs/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const jobResult = await query(
      `SELECT j.*, r.result_image_url, r.is_simulation, r.is_mock, r.composite_details, r.fit_score,
              p.name AS live_prod_name, p.primary_image_url AS live_prod_img
       FROM tryon_jobs j
       LEFT JOIN products p ON j.product_id = p.id
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

    const parsedDetails = typeof job.composite_details === 'string'
      ? JSON.parse(job.composite_details)
      : (job.composite_details || {});

    return res.json({
      success: true,
      jobId: job.job_uuid,
      providerJobId: job.provider_job_id,
      customerImageId: job.customer_image_id,
      productId: job.product_id,
      productTitle: job.product_title || job.live_prod_name || job.custom_garment_name,
      productExternalId: job.product_external_id,
      productImageHash: job.product_image_hash,
      garmentImageUrl: job.garment_image_url,
      customerSessionId: job.customer_session_id,
      selectedSize: job.selected_size,
      fitPreference: job.fit_preference,
      creditsUsed: job.credits_used || 0,
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
            fitScore: job.fit_score || parsedDetails.qualityAssessment?.overallScore || 0.88,
            verificationStatus: parsedDetails.verificationStatus || parsedDetails.qualityAssessment?.verificationStatus || 'VERIFIED',
            qualityAssessment: parsedDetails.qualityAssessment || null,
            compositeDetails: parsedDetails,
            productTitle: job.product_title || job.live_prod_name || job.custom_garment_name,
            productId: job.product_id,
            garmentImageUrl: job.garment_image_url
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
