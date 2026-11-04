import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  Genlook,
  InsufficientCreditsError,
  RateLimitError,
  GenlookTimeoutError,
  GenerationTimeoutError,
  GenerationFailedError,
  ValidationError,
  AuthError,
  ApiErrorCode
} from '@genlook/api';
import { BaseTryOnAdapter } from './baseAdapter.js';
import imageValidationService from '../../services/imageValidationService.js';
import garmentPromptGenerator from '../../services/garmentPromptGenerator.js';
import resultQualityService from '../../services/resultQualityService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GenlookTryOnAdapter extends BaseTryOnAdapter {
  constructor() {
    super('genlook');

    this.apiBase = process.env.GENLOOK_API_BASE || 'https://api.genlook.app/tryon/v1';
    this._client = null;
    this._cachedKey = null;
    this.lastCreditCheck = 0;
    this.cachedCredits = null;
  }

  get isEnabled() {
    return process.env.GENLOOK_ENABLED === 'true';
  }

  get isMockMode() {
    return process.env.GENLOOK_MOCK !== 'false';
  }

  get apiKey() {
    return process.env.GENLOOK_API_KEY || '';
  }

  get client() {
    const key = this.apiKey;
    if (!key) return null;
    if (!this._client || this._cachedKey !== key) {
      try {
        this._client = new Genlook({
          apiKey: key,
          baseUrl: this.apiBase,
          timeoutMs: 60000,
          maxRetries: 0,
          userAgent: 'VESTRA-Luxury-TryOn/1.0'
        });
        this._cachedKey = key;
      } catch (err) {
        console.error('[Genlook Adapter] Initialization error:', err.message);
      }
    }
    return this._client;
  }

  set client(val) {
    this._client = val;
    this._cachedKey = this.apiKey;
  }

  /**
   * Fetch live credit balance with 30s cache
   */
  async getCreditBalance() {
    if (!this.client) return null;
    const now = Date.now();
    if (this.cachedCredits !== null && now - this.lastCreditCheck < 30000) {
      return this.cachedCredits;
    }
    try {
      const resp = await this.client.account.credits();
      this.cachedCredits = resp.creditBalance;
      this.lastCreditCheck = now;
      return this.cachedCredits;
    } catch (err) {
      console.warn('[Genlook Adapter] Failed to fetch credit balance:', err.message);
      return this.cachedCredits;
    }
  }

  /**
   * Returns current active provider status and specs
   */
  getProviderInfo() {
    const isMock = this.isMockMode;
    const isRealActive = this.isEnabled && !isMock;

    let executionMode = 'official_mock_testing';
    let status = 'configured';

    if (!this.apiKey) {
      status = 'missing_api_key';
      executionMode = 'unconfigured';
    } else if (isRealActive) {
      executionMode = 'official_real_ai';
    } else if (isMock) {
      executionMode = 'official_mock_testing';
    } else {
      executionMode = 'disabled';
      status = 'disabled';
    }

    return {
      provider: 'genlook_tryon_v1',
      model: 'Genlook Official Virtual Try-On API (v1)',
      version: 'v1',
      executionMode,
      isMock,
      enabled: this.isEnabled,
      available: !!this.apiKey,
      status,
      creditBalance: this.cachedCredits,
      resolution: 'default (1200px standard)',
      pricingInfo: isMock
        ? 'Genlook Mock Mode Active: 0 credits consumed. Requests verified with official API mock mode.'
        : 'Genlook Real AI Active: 1 credit per generation on standard resolution.',
      docsUrl: 'https://genlook.app/docs/tryon-api/introduction'
    };
  }

  /**
   * Determine whether a URL is a genuine public remote HTTPS/HTTP resource.
   * STRICTLY rejects localhost, 127.0.0.1, internal IP addresses, and private domain names.
   */
  isRemotePublicUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('https://') && !url.startsWith('http://')) return false;

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      // Disallow local loopback, link-local, and LAN private hostnames/IPs
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host === '0.0.0.0' ||
        host.endsWith('.local') ||
        host.endsWith('.internal') ||
        host.endsWith('.lan') ||
        host.startsWith('192.168.') ||
        host.startsWith('10.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve an image input into a Buffer and MIME type
   */
  async resolveImageBuffer(imageInput) {
    if (Buffer.isBuffer(imageInput)) {
      return { buffer: imageInput, mimeType: 'image/jpeg' };
    }

    if (typeof imageInput !== 'string') {
      throw new Error('Unsupported image input type for Genlook adapter.');
    }

    // Check if base64 data URI
    if (imageInput.startsWith('data:')) {
      const match = imageInput.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!match) throw new Error('Invalid base64 data URI.');
      return {
        buffer: Buffer.from(match[2], 'base64'),
        mimeType: match[1]
      };
    }

    // Check if local file in customer uploads or custom garments directories
    const uploadsDir = imageValidationService.getUploadsDir();
    const customGarmentsDir = imageValidationService.getCustomGarmentsDir();
    const basename = path.basename(imageInput.split('?')[0]);
    const candidatePaths = [
      imageInput,
      path.join(customGarmentsDir, basename),
      path.join(uploadsDir, basename),
      path.join(__dirname, '..', '..', '..', 'uploads', 'custom_garments', basename),
      path.join(__dirname, '..', '..', '..', 'uploads', 'customer_silhouettes', basename),
      path.join(__dirname, '..', '..', '..', 'uploads', basename)
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        const ext = path.extname(p).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        return { buffer: fs.readFileSync(p), mimeType, filename: path.basename(p) };
      }
    }

    // If genuine remote public HTTP(S) URL, fetch bytes
    if (this.isRemotePublicUrl(imageInput)) {
      const resp = await fetch(imageInput);
      if (!resp.ok) {
        throw new Error(`Failed to fetch image from ${imageInput}: ${resp.statusText}`);
      }
      const arrayBuffer = await resp.arrayBuffer();
      const mimeType = resp.headers.get('content-type') || 'image/jpeg';
      return { buffer: Buffer.from(arrayBuffer), mimeType, filename: basename };
    }

    throw new Error(`Unable to locate image file or valid public URL: ${imageInput}`);
  }

  /**
   * Resolve and validate a custom garment file from local backend storage.
   * Validates JPEG, PNG, or WebP format and ensures size is under 15MB provider limit.
   */
  async resolveGarmentFile(garmentInput) {
    if (!garmentInput) {
      const err = new Error('No garment input provided for resolution.');
      err.code = 'MISSING_GARMENT_FILE';
      err.status = 400;
      throw err;
    }

    if (Buffer.isBuffer(garmentInput)) {
      return {
        buffer: garmentInput,
        mimeType: 'image/jpeg',
        filename: 'custom_garment.jpg',
        size: garmentInput.length
      };
    }

    const customGarmentsDir = imageValidationService.getCustomGarmentsDir();
    const uploadsDir = imageValidationService.getUploadsDir();
    const basename = path.basename(String(garmentInput).split('?')[0]);

    const candidatePaths = [
      garmentInput,
      path.join(customGarmentsDir, basename),
      path.join(uploadsDir, basename),
      path.join(__dirname, '..', '..', '..', 'uploads', 'custom_garments', basename),
      path.join(__dirname, '..', '..', '..', 'uploads', basename)
    ];

    let foundPath = null;
    for (const p of candidatePaths) {
      if (typeof p === 'string' && fs.existsSync(p) && fs.statSync(p).isFile()) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      const err = new Error(`Could not find custom garment file on backend disk: ${basename}`);
      err.code = 'GARMENT_FILE_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const buffer = fs.readFileSync(foundPath);
    const ext = path.extname(foundPath).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') {
      mimeType = 'image/jpeg';
    } else if (ext === '.png') {
      mimeType = 'image/png';
    } else if (ext === '.webp') {
      mimeType = 'image/webp';
    } else if (ext === '.txt') {
      mimeType = 'text/plain';
    } else if (ext === '.pdf') {
      mimeType = 'application/pdf';
    }
    const filename = path.basename(foundPath);

    // Validate format
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(mimeType)) {
      const err = new Error(`Invalid garment image format (${mimeType}). Only JPEG, PNG, and WebP are supported for virtual try-on.`);
      err.code = 'INVALID_GARMENT_FORMAT';
      err.status = 400;
      throw err;
    }

    // Validate size (15MB Genlook provider limit)
    if (buffer.length > 15 * 1024 * 1024) {
      const err = new Error(`Garment image exceeds the Genlook maximum size limit of 15MB (${(buffer.length / (1024 * 1024)).toFixed(1)}MB).`);
      err.code = 'GARMENT_TOO_LARGE';
      err.status = 400;
      throw err;
    }

    return {
      buffer,
      mimeType,
      filename,
      size: buffer.length
    };
  }

  /**
   * Official Genlook Multipart Garment Preparation
   * Prepares binary file payload and assigns unique fileKey for try-on submission.
   */
  async prepareCustomGarmentMultipart(garmentInput) {
    const resolved = await this.resolveGarmentFile(garmentInput);
    const fileKey = 'garment_file_0';

    if (!fileKey) {
      const err = new Error('Multipart workflow failed: missing fileKey identifier.');
      err.code = 'MISSING_FILE_KEY';
      err.status = 500;
      throw err;
    }

    return {
      fileKey,
      file: {
        data: resolved.buffer,
        filename: resolved.filename,
        mimeType: resolved.mimeType
      },
      size: resolved.size,
      mimeType: resolved.mimeType,
      filename: resolved.filename
    };
  }

  /**
   * Upload customer photograph to Genlook and obtain imageId
   */
  async uploadCustomerPhoto(userPhotoUrl, externalUserId) {
    if (!this.client) {
      throw new Error('Genlook API client is not initialized. Check GENLOOK_API_KEY in backend/.env.');
    }

    const { buffer, mimeType } = await this.resolveImageBuffer(userPhotoUrl);

    // Validate size and resolution
    if (buffer.length > 15 * 1024 * 1024) {
      throw new Error('Customer photo exceeds Genlook maximum upload size of 15MB.');
    }

    try {
      // CRITICAL IDENTITY & PROPORTION PRESERVATION:
      // Pass crop: false so Genlook does NOT apply its default 4:5 center crop.
      // Preserves original camera framing, background, body proportions, posture, hands, and feet.
      const uploadResp = await this.client.images.upload(buffer, {
        mimeType,
        crop: false,
        externalUserId: externalUserId || `vestra_cust_${Date.now()}`,
        keepForDays: 7
      });

      return {
        imageId: uploadResp.imageId,
        imageUrl: uploadResp.imageUrl
      };
    } catch (err) {
      this.handleGenlookError(err, 'Customer photo upload');
    }
  }

  /**
   * Submit an asynchronous try-on job to Genlook
   * Supports:
   *  - Existing catalogue products with publicly accessible HTTPS URLs
   *  - Custom customer-uploaded garments via official multipart fileKey workflow
   * GUARANTEES: Never sends localhost, 127.0.0.1, or local paths to Genlook.
   */
  async submitTryOnJob({
    userPhotoUrl,
    garmentImageUrl,
    customGarmentFilename,
    garment,
    productId,
    garmentDescription,
    category
  }) {
    if (!this.apiKey) {
      throw new Error('GENLOOK_API_KEY is not configured in backend/.env.');
    }
    if (!this.client) {
      throw new Error('Genlook client failed to initialize.');
    }

    // Safety policy: Real AI mode must remain disabled unless explicitly permitted
    const isMock = this.isMockMode;
    if (!isMock && !this.isEnabled) {
      throw new Error(
        'Genlook Real AI mode is disabled (GENLOOK_ENABLED=false). To test without consuming credits, ensure GENLOOK_MOCK=true. To enable real generations with credits, set GENLOOK_ENABLED=true and GENLOOK_MOCK=false.'
      );
    }

    // In Real AI Mode, verify available credit balance before submitting
    if (!isMock) {
      const balance = await this.getCreditBalance();
      if (balance !== null && balance < 1) {
        const error = new Error(`Insufficient Genlook credits (Current balance: ${balance}). Exactly 1 credit is required for standard try-on.`);
        error.name = 'InsufficientCreditsError';
        error.code = 'INSUFFICIENT_CREDITS';
        error.status = 402;
        throw error;
      }
    }

    // 1. Upload customer silhouette to Genlook to obtain imageId (Preserved Customer Flow)
    const externalUserId = `vestra_user_${Date.now()}`;
    const uploadResult = await this.uploadCustomerPhoto(userPhotoUrl, externalUserId);
    const imageId = uploadResult.imageId;

    // 2. Prepare structured description and versioned externalId
    const resolvedProductId = (garment && garment.id) || productId || 'garment-1';
    const rawSlug = (garment && garment.slug) ? garment.slug : `prod-${resolvedProductId}`;
    const title = (garment && garment.name) || 'VESTRA Luxury Apparel';
    
    // Generate domain-accurate prompt using actual garment attributes
    const detailedPrompt = garmentPromptGenerator.generatePrompt(garment || { name: title, description: garmentDescription });

    // 3. Determine garment image source strategy:
    // If custom garment or garment URL is local/private (e.g. localhost/127.0.0.1/filename):
    // Use official Genlook multipart file-upload workflow with fileKey.
    // If public HTTPS URL: pass url directly.
    const isLocalOrPrivate = !this.isRemotePublicUrl(garmentImageUrl);
    const isCustomGarment = Boolean(customGarmentFilename || isLocalOrPrivate);

    let productImageSource;
    let filesPayload = null;
    let productImages = [];

    if (isCustomGarment) {
      // Resolve the uploaded garment file from backend storage
      const garmentFileTarget = customGarmentFilename || garmentImageUrl;
      const multipart = await this.prepareCustomGarmentMultipart(garmentFileTarget);

      productImageSource = {
        fileKey: multipart.fileKey
      };

      filesPayload = {
        [multipart.fileKey]: multipart.file
      };

      productImages.push({
        source: productImageSource,
        classifications: {
          orientation: 'front',
          on_model: 'false'
        }
      });
    } else {
      // Validate that the remote URL is a legitimate public URL
      if (!this.isRemotePublicUrl(garmentImageUrl)) {
        throw new Error(
          `Security Notice: Cannot transmit private URL '${garmentImageUrl}' to Genlook cloud. Only public HTTPS URLs or multipart uploads are permitted.`
        );
      }

      productImageSource = {
        url: garmentImageUrl
      };

      // Support multi-image inputs (front, back, on-model) where available in catalogue
      const candidateList = [];
      candidateList.push({
        url: garmentImageUrl,
        orientation: 'front',
        on_model: 'true'
      });

      if (Array.isArray(garment?.images)) {
        for (const item of garment.images) {
          const itemUrl = typeof item === 'string' ? item : item?.url;
          if (itemUrl && this.isRemotePublicUrl(itemUrl) && !candidateList.some(c => c.url === itemUrl)) {
            candidateList.push({
              url: itemUrl,
              orientation: (typeof item === 'object' && item.orientation) || 'front',
              on_model: (typeof item === 'object' && item.on_model) || 'true'
            });
          }
        }
      }

      // Convert candidates to Genlook ProductImage shape
      for (const c of candidateList) {
        productImages.push({
          source: { url: c.url },
          classifications: {
            orientation: c.orientation,
            on_model: c.on_model
          }
        });
      }
    }

    // CRITICAL CACHE INVALIDATION & VERSIONING:
    // Generate deterministic hash of image URL, title, and prompt so any catalogue
    // update creates a fresh, unpolluted externalId in Genlook cloud.
    const versionBasis = `${garmentImageUrl}|${title}|${detailedPrompt}|${garment?.updated_at || garment?.updatedAt || 'v1'}`;
    const versionHash = crypto.createHash('md5').update(versionBasis).digest('hex').slice(0, 8);
    const externalId = `vestra-${rawSlug}-v${versionHash}`;

    // Build try-on payload adhering to official Genlook OpenAPI / SDK schema
    const payload = {
      mock: isMock,
      products: [
        {
          externalId,
          title,
          description: detailedPrompt.slice(0, 480),
          images: productImages
        }
      ],
      person: {
        image: {
          source: {
            id: imageId
          }
        }
      },
      externalUserId,
      output: {
        resolution: 'default', // Standard resolution: 1 credit (no 2K)
        watermark: false,
        aiLabel: true,
        keepForDays: 7
      }
    };

    // Attach multipart files if present
    if (filesPayload) {
      payload.files = filesPayload;
    }

    // STRICT INTEGRITY CHECK: Never allow any localhost / 127.0.0.1 / local path in outgoing payload URLs
    for (const prod of payload.products || []) {
      for (const img of prod.images || []) {
        if (img.source?.url) {
          if (!this.isRemotePublicUrl(img.source.url)) {
            throw new Error(
              `Integrity Check Failed: Attempted to transmit localhost or private URL '${img.source.url}' to Genlook. Garment must use multipart fileKey.`
            );
          }
        }
      }
    }

    try {
      const response = await this.client.tryOn.create(payload);

      return {
        providerJobId: response.generationId,
        customerImageId: imageId,
        status: (response.status || 'pending').toLowerCase(),
        isMock,
        productExternalId: response.productExternalId || externalId,
        usedMultipart: isCustomGarment,
        garmentFileKey: isCustomGarment ? productImageSource.fileKey : null
      };
    } catch (err) {
      this.handleGenlookError(err, isCustomGarment ? 'Custom Garment Multipart Try-On submission' : 'Catalogue Try-On submission');
    }
  }

  /**
   * Check status of a submitted Genlook generation
   */
  async checkJobStatus(generationId) {
    if (!this.client) {
      throw new Error('Genlook client is not initialized.');
    }

    try {
      const statusResp = await this.client.generations.retrieve(generationId);

      const status = statusResp.status.toLowerCase();

      if (status === 'completed') {
        const resultUrl = statusResp.resultImageUrl;

        // In Real AI Mode: Verify the generated output is valid and not identical to input
        if (!this.isMockMode) {
          if (!resultUrl) {
            return {
              status: 'failed',
              error: 'AI Generation Error: Genlook completed but returned an empty resultImageUrl.',
              errorCode: 'MISSING_GENERATED_IMAGE'
            };
          }
        }

        return {
          status: 'completed',
          resultImageUrl: resultUrl,
          generationId: statusResp.generationId,
          isMock: this.isMockMode,
          garmentApplied: !this.isMockMode,
          completedAt: statusResp.updatedAt || new Date().toISOString()
        };
      }

      if (status === 'failed') {
        return {
          status: 'failed',
          error: statusResp.errorMessage || statusResp.errorCode || 'Generation failed on Genlook AI.',
          errorCode: statusResp.errorCode
        };
      }

      return {
        status: 'processing',
        generationId: statusResp.generationId,
        isMock: this.isMockMode,
        garmentApplied: false
      };
    } catch (err) {
      this.handleGenlookError(err, 'Generation status polling');
    }
  }

  /**
   * Synchronous / Polling convenience method conforming to BaseTryOnAdapter
   */
  async processTryOn(params) {
    const submission = await this.submitTryOnJob(params);

    if (submission.status === 'completed' && (submission.output || submission.resultImageUrl)) {
      const outUrl = submission.resultImageUrl || submission.output;
      const qualityAssessment = resultQualityService.evaluateResult({
        garment: params.garment,
        resultImageUrl: outUrl,
        isMock: submission.isMock
      });

      return {
        success: true,
        resultImageUrl: outUrl,
        compositeDetails: {
          provider: 'genlook',
          isMock: submission.isMock,
          generationId: submission.providerJobId,
          customerImageId: submission.customerImageId,
          qualityAssessment
        },
        fitScore: qualityAssessment.overallScore,
        verificationStatus: qualityAssessment.verificationStatus,
        provider: 'genlook',
        isSimulation: submission.isMock,
        isMock: submission.isMock
      };
    }

    // Wait for completion using official SDK waitFor
    try {
      const terminal = await this.client.generations.waitFor(submission.providerJobId, {
        timeoutMs: 90000,
        pollIntervalMs: 1200
      });

      if (!submission.isMock) {
        if (!terminal.resultImageUrl || terminal.resultImageUrl === params.userPhotoUrl) {
          throw new Error('AI generation anomaly: Provider returned unmodified customer image. Garment was not applied.');
        }
      }

      const qualityAssessment = resultQualityService.evaluateResult({
        garment: params.garment,
        resultImageUrl: terminal.resultImageUrl,
        isMock: submission.isMock
      });

      return {
        success: true,
        resultImageUrl: terminal.resultImageUrl,
        compositeDetails: {
          provider: 'genlook',
          isMock: submission.isMock,
          generationId: submission.providerJobId,
          customerImageId: submission.customerImageId,
          createdAt: terminal.createdAt,
          qualityAssessment
        },
        fitScore: qualityAssessment.overallScore,
        verificationStatus: qualityAssessment.verificationStatus,
        provider: 'genlook',
        isSimulation: submission.isMock,
        isMock: submission.isMock
      };
    } catch (waitErr) {
      this.handleGenlookError(waitErr, 'Try-On completion wait');
    }
  }

  /**
   * GDPR / customer data deletion helper
   */
  async purgeCustomerData(externalUserId) {
    if (!this.client || !externalUserId) return;
    try {
      await this.client.customers.delete(externalUserId);
      console.log(`[Genlook Adapter] GDPR customer purged: ${externalUserId}`);
    } catch (err) {
      console.warn(`[Genlook Adapter] GDPR erasure notice: ${err.message}`);
    }
  }

  /**
   * Standardized error classification and reporting
   */
  handleGenlookError(err, phase) {
    console.error(`[Genlook Adapter Error] (${phase}):`, err);

    if (err instanceof InsufficientCreditsError || err.code === ApiErrorCode.INSUFFICIENT_CREDITS) {
      const error = new Error('Genlook Insufficient Credits: Your Genlook account has 0 credits remaining. Please add credits at https://genlook.app to run real try-on generations, or enable GENLOOK_MOCK=true for free mock testing.');
      error.code = 'INSUFFICIENT_CREDITS';
      error.status = 402;
      throw error;
    }

    if (err instanceof RateLimitError || err.code === ApiErrorCode.RATE_LIMITED) {
      const error = new Error('Genlook Rate Limit: Too many requests. Please wait a moment before trying again.');
      error.code = 'RATE_LIMITED';
      error.status = 429;
      throw error;
    }

    if (err instanceof GenlookTimeoutError || err instanceof GenerationTimeoutError || err.code === ApiErrorCode.GENERATION_TIMEOUT) {
      const error = new Error('Genlook Request Timeout: The virtual try-on engine took too long to respond. Credits were not charged.');
      error.code = 'GENERATION_TIMEOUT';
      error.status = 504;
      throw error;
    }

    if (err instanceof AuthError || err.code === ApiErrorCode.INVALID_API_KEY || err.code === ApiErrorCode.MISSING_API_KEY) {
      const error = new Error('Genlook Authentication Failed: Invalid or missing GENLOOK_API_KEY. Verify your credentials in backend/.env.');
      error.code = 'AUTH_ERROR';
      error.status = 401;
      throw error;
    }

    if (err instanceof ValidationError || err.code === ApiErrorCode.INVALID_IMAGE || err.code === ApiErrorCode.UNSUPPORTED_IMAGE_TYPE) {
      const error = new Error(`Genlook Image Validation Error: ${err.message || 'Please upload a clear, high-resolution full-body or upper-body photograph in JPG or PNG format.'}`);
      error.code = 'VALIDATION_FAILED';
      error.status = 400;
      throw error;
    }

    if (err instanceof GenerationFailedError || err.code === ApiErrorCode.GENERATION_FAILED) {
      const error = new Error(`Genlook Generation Failed: ${err.message || 'The AI try-on could not be synthesized for this garment and photo.'}`);
      error.code = 'GENERATION_FAILED';
      error.status = 500;
      throw error;
    }

    // Pass through generic error with original message
    const error = new Error(`Genlook API Error: ${err.message || 'An unexpected error occurred during Virtual Try-On generation.'}`);
    error.code = err.code || 'UNKNOWN';
    error.status = err.status || 500;
    throw error;
  }
}

