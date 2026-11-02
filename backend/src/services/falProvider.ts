import { fal } from '@fal-ai/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export interface FalTryOnOptions {
  jobId: string;
  personPhotoPath: string;
  garmentImagePath: string;
  drapeStyle?: string;
}

export interface FalTryOnResult {
  success: boolean;
  status: 'completed' | 'failed' | 'model_unavailable';
  resultImageUrl?: string;
  errorMessage?: string;
  isSimulation: boolean;
  provider: 'fal';
  disclaimer?: string;
  processingTimeMs?: number;
}

/**
 * Retrieves the configured FAL_KEY, with dynamic .env reload if updated while server is running.
 */
export function getFalKey(): string | undefined {
  if (process.env.FAL_KEY && process.env.FAL_KEY.trim().length > 0 && process.env.FAL_KEY !== 'your_fal_api_key_here') {
    return process.env.FAL_KEY.trim();
  }

  // Dynamic reload from root .env
  const rootEnvPath = path.resolve(__dirname, '../../../.env');
  if (fs.existsSync(rootEnvPath)) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(rootEnvPath, 'utf8'));
      if (parsed.FAL_KEY && parsed.FAL_KEY.trim().length > 0 && parsed.FAL_KEY !== 'your_fal_api_key_here') {
        process.env.FAL_KEY = parsed.FAL_KEY.trim();
        return process.env.FAL_KEY;
      }
    } catch {}
  }

  return undefined;
}

/**
 * Checks if Fal.ai is configured with a valid API key.
 */
export function isFalConfigured(): boolean {
  return Boolean(getFalKey());
}

/**
 * Helper to upload a local file to fal.storage and get a public URL.
 * If input is already an HTTP URL, returns as-is.
 */
async function resolveToPublicUrl(filePathOrUrl: string): Promise<string> {
  if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
    return filePathOrUrl;
  }

  if (!fs.existsSync(filePathOrUrl)) {
    throw new Error(`Local file not found for upload: ${filePathOrUrl}`);
  }

  const fileBuffer = fs.readFileSync(filePathOrUrl);
  const ext = path.extname(filePathOrUrl).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const blob = new Blob([fileBuffer], { type: mimeType });

  console.log(`[fal.ai] Uploading local asset (${blob.size} bytes, ${mimeType}) to fal.storage...`);
  const uploadedUrl = await fal.storage.upload(blob);
  console.log(`[fal.ai] Asset uploaded: ${uploadedUrl}`);
  return uploadedUrl;
}

/**
 * Executes Virtual Try-On inference using fal-ai/image-apps-v2/virtual-try-on.
 */
export async function executeFalTryOn(options: FalTryOnOptions): Promise<FalTryOnResult> {
  const startTime = Date.now();
  const { jobId, personPhotoPath, garmentImagePath } = options;

  if (!isFalConfigured()) {
    return {
      success: false,
      status: 'model_unavailable',
      errorMessage: 'FAL_KEY is not configured in .env. Please add FAL_KEY="your_api_key" to enable Fal.ai Virtual Try-On.',
      isSimulation: false,
      provider: 'fal',
    };
  }

  try {
    // Configure client credentials explicitly from environment
    fal.config({
      credentials: process.env.FAL_KEY,
    });

    console.log(`[fal.ai:${jobId}] Resolving inputs for fal-ai/image-apps-v2/virtual-try-on...`);
    const [personImageUrl, clothingImageUrl] = await Promise.all([
      resolveToPublicUrl(personPhotoPath),
      resolveToPublicUrl(garmentImagePath),
    ]);

    console.log(`[fal.ai:${jobId}] Subscribing to fal-ai/image-apps-v2/virtual-try-on queue...`);
    const result = await fal.subscribe('fal-ai/image-apps-v2/virtual-try-on', {
      input: {
        person_image_url: personImageUrl,
        clothing_image_url: clothingImageUrl,
        preserve_pose: true,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS' && update.logs) {
          update.logs
            .map((log: any) => log.message)
            .forEach((msg: string) => console.log(`[fal.ai:${jobId}] ${msg}`));
        }
      },
    });

    const data: any = result.data;
    const resultUrl = data?.images?.[0]?.url || data?.image?.url;

    if (!resultUrl) {
      console.error(`[fal.ai:${jobId}] Output structure missing image URL:`, JSON.stringify(data));
      return {
        success: false,
        status: 'failed',
        errorMessage: 'Fal.ai completed inference but did not return a valid result image URL.',
        isSimulation: false,
        provider: 'fal',
        processingTimeMs: Date.now() - startTime,
      };
    }

    console.log(`[fal.ai:${jobId}] Virtual try-on succeeded in ${Date.now() - startTime}ms. Result: ${resultUrl}`);

    return {
      success: true,
      status: 'completed',
      resultImageUrl: resultUrl,
      isSimulation: false,
      provider: 'fal',
      processingTimeMs: Date.now() - startTime,
      disclaimer: 'Visual drape synthesized via Fal.ai Virtual Try-On (fal-ai/image-apps-v2/virtual-try-on).',
    };
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    const rawMsg = err?.message || String(err);
    console.error(`[fal.ai:${jobId}] Inference error (${elapsed}ms):`, rawMsg);

    let cleanError = rawMsg;
    if (rawMsg.includes('401') || rawMsg.toLowerCase().includes('unauthorized')) {
      cleanError = 'Fal.ai authentication failed. Please verify that FAL_KEY in your .env is valid.';
    } else if (rawMsg.includes('402') || rawMsg.toLowerCase().includes('credit') || rawMsg.toLowerCase().includes('balance')) {
      cleanError = 'Fal.ai account requires compute credits. Please add balance in your Fal.ai billing dashboard (https://fal.ai/dashboard/billing).';
    } else if (rawMsg.includes('429')) {
      cleanError = 'Fal.ai rate limit reached. Please wait a moment and try again.';
    }

    return {
      success: false,
      status: 'failed',
      errorMessage: cleanError,
      isSimulation: false,
      provider: 'fal',
      processingTimeMs: elapsed,
    };
  }
}
