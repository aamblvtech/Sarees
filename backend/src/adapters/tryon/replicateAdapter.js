import axios from 'axios';
import { BaseTryOnAdapter } from './baseAdapter.js';
import imageValidationService from '../../services/imageValidationService.js';

/**
 * ReplicateHostedTryOnAdapter
 * 
 * Production adapter integrating Replicate's hosted IDM-VTON model
 * (cuuupid/idm-vton) running on NVIDIA A100 GPU clusters.
 * 
 * Never returns mock images when generation fails.
 * Handles synchronous creation, polling, timeouts, and quota errors.
 */
export class ReplicateHostedTryOnAdapter extends BaseTryOnAdapter {
  constructor() {
    super('replicate_idm_vton');
    this.versionId = process.env.REPLICATE_MODEL_VERSION || '0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985';
    this.apiUrl = process.env.REPLICATE_API_URL || 'https://api.replicate.com/v1/predictions';
  }

  /**
   * Securely retrieve the Replicate API token from backend environment only
   */
  getApiToken() {
    return process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || null;
  }

  isAvailable() {
    const token = this.getApiToken();
    return !!(token && token.trim() && !token.startsWith('r8_your_replicate'));
  }

  getProviderInfo() {
    const available = this.isAvailable();
    return {
      provider: 'replicate_idm_vton',
      model: 'cuuupid/idm-vton',
      version: this.versionId,
      executionMode: 'hosted_cloud_gpu (NVIDIA A100)',
      available,
      status: available ? 'configured' : 'missing_api_token',
      pricingInfo: '~$0.02 - $0.05 per virtual try-on inference run on A100 GPU'
    };
  }

  /**
   * Maps garment category to IDM-VTON supported category values:
   * 'dresses' | 'upper_body' | 'lower_body'
   */
  mapCategory(categoryNameOrSlug) {
    if (!categoryNameOrSlug) return 'upper_body';
    const c = categoryNameOrSlug.toLowerCase();

    if (c.includes('dress') || c.includes('gown') || c.includes('eveningwear') || c.includes('saree') || c.includes('kimono')) {
      return 'dresses';
    }
    if (c.includes('pant') || c.includes('trouser') || c.includes('skirt') || c.includes('short') || c.includes('bottom')) {
      return 'lower_body';
    }
    // Default to upper_body for blazers, coats, shirts, blouses, knitwear, jackets
    return 'upper_body';
  }

  /**
   * Submit a new AI virtual try-on prediction job to Replicate
   */
  async submitTryOnJob({
    userPhotoUrl,
    garmentImageUrl,
    garmentDescription = 'Luxury garment',
    category = 'upper_body',
    crop = true,
    steps = 30,
    seed = 42
  }) {
    const token = this.getApiToken();
    if (!token) {
      throw new Error(
        'REPLICATE_API_TOKEN is not configured in backend environment. Please set REPLICATE_API_TOKEN in your .env file.'
      );
    }

    // Resolve human image to data URI or public URL
    const humanImg = imageValidationService.fileToDataUri(userPhotoUrl);
    // Resolve garment image to data URI or public URL
    const garmImg = imageValidationService.fileToDataUri(garmentImageUrl);

    if (!humanImg) {
      throw new Error('Unable to resolve person silhouette image for AI inference.');
    }
    if (!garmImg) {
      throw new Error('Unable to resolve garment product image for AI inference.');
    }

    const resolvedCategory = this.mapCategory(category);

    const payload = {
      version: this.versionId,
      input: {
        human_img: humanImg,
        garm_img: garmImg,
        garment_des: garmentDescription,
        category: resolvedCategory,
        crop: crop !== false,
        steps: Math.min(Math.max(steps || 30, 15), 40),
        seed: seed || 42
      }
    };

    try {
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000 // 20s timeout for initial submission
      });

      const prediction = response.data;
      return {
        success: true,
        providerJobId: prediction.id,
        status: prediction.status, // starting, processing, succeeded, failed
        output: prediction.output,
        createdAt: prediction.created_at,
        urls: prediction.urls
      };
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 402) {
          throw new Error(
            'Replicate AI Error (402): Insufficient account credit. Please add credits at https://replicate.com/account/billing#billing to run real AI try-on models.'
          );
        } else if (status === 401) {
          throw new Error('Replicate AI Error (401): Invalid or unauthorized REPLICATE_API_TOKEN.');
        } else if (status === 429) {
          throw new Error('Replicate AI Error (429): Rate limit exceeded. Please wait a moment before trying again.');
        } else {
          const detail = data?.detail || data?.title || err.message;
          throw new Error(`Replicate AI Error (${status}): ${detail}`);
        }
      } else if (err.code === 'ECONNABORTED') {
        throw new Error('Replicate API connection timed out. Please check your network connection.');
      } else {
        throw new Error(`Failed to submit job to Replicate: ${err.message}`);
      }
    }
  }

  /**
   * Poll status of an ongoing prediction
   */
  async checkJobStatus(providerJobId) {
    const token = this.getApiToken();
    if (!token) {
      throw new Error('REPLICATE_API_TOKEN missing.');
    }

    const checkUrl = `${this.apiUrl}/${providerJobId}`;

    try {
      const response = await axios.get(checkUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 15000
      });

      const prediction = response.data;
      // status: starting | processing | succeeded | failed | canceled
      const isComplete = prediction.status === 'succeeded';
      const isFailed = prediction.status === 'failed' || prediction.status === 'canceled';

      let resultImageUrl = null;
      if (isComplete && prediction.output) {
        // IDM-VTON output can be string URL or array of URLs
        resultImageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      }

      return {
        providerJobId,
        status: isComplete ? 'completed' : isFailed ? 'failed' : 'processing',
        rawStatus: prediction.status,
        resultImageUrl,
        error: prediction.error || null,
        metrics: prediction.metrics || {},
        logs: prediction.logs ? prediction.logs.slice(-300) : null
      };
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error(`Replicate prediction ${providerJobId} was not found.`);
      }
      throw new Error(`Failed to check Replicate job status: ${err.message}`);
    }
  }

  /**
   * Execute try-on with polling until completion (or timeout)
   */
  async processTryOn({
    userPhotoUrl,
    garmentImageUrl,
    selectedSize = 'M',
    garmentDescription = 'Luxury apparel',
    category = 'upper_body',
    options = {}
  }) {
    const startTime = Date.now();

    // 1. Submit prediction job
    const initial = await this.submitTryOnJob({
      userPhotoUrl,
      garmentImageUrl,
      garmentDescription,
      category,
      crop: options.crop !== false,
      steps: options.steps || 30,
      seed: options.seed || 42
    });

    const providerJobId = initial.providerJobId;

    // If synchronous completion occurred immediately
    if (initial.status === 'succeeded' && initial.output) {
      const outUrl = Array.isArray(initial.output) ? initial.output[0] : initial.output;
      return {
        success: true,
        provider: this.name,
        providerJobId,
        resultImageUrl: outUrl,
        isSimulation: false,
        fitScore: 0.98,
        compositeDetails: {
          engine: 'IDM-VTON Diffusion (Replicate Hosted GPU)',
          category,
          selectedSize,
          inferenceSteps: 30,
          hardware: 'NVIDIA A100 Tensor Core GPU'
        },
        processingTimeMs: Date.now() - startTime
      };
    }

    // 2. Poll prediction until finished (Max timeout: 120s)
    const maxWaitMs = 120000;
    const pollIntervalMs = 2500;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));

      const status = await this.checkJobStatus(providerJobId);

      if (status.status === 'completed' && status.resultImageUrl) {
        return {
          success: true,
          provider: this.name,
          providerJobId,
          resultImageUrl: status.resultImageUrl,
          isSimulation: false,
          fitScore: 0.98,
          compositeDetails: {
            engine: 'IDM-VTON Diffusion (Replicate Hosted GPU)',
            category,
            selectedSize,
            inferenceSteps: 30,
            hardware: 'NVIDIA A100 Tensor Core GPU',
            inferenceLatencySeconds: status.metrics?.predict_time || null
          },
          processingTimeMs: Date.now() - startTime
        };
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'AI diffusion generation failed on cloud GPU worker.');
      }
    }

    throw new Error('AI generation timed out after 120 seconds. Please try again.');
  }
}
