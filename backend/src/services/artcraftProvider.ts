import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

export interface ArtcraftTryOnOptions {
  jobId: string;
  personPhotoPath?: string;
  garmentImagePath?: string;
  product?: {
    name?: string;
    fabric?: string;
    color?: string;
    borderType?: string;
    sku?: string;
  };
  drapeStyle?: string;
}

export interface ArtcraftTryOnResult {
  success: boolean;
  status: 'completed' | 'failed' | 'model_unavailable';
  resultImageUrl?: string;
  errorMessage?: string;
  isSimulation: boolean;
  provider: 'artcraft';
  disclaimer?: string;
  processingTimeMs?: number;
}

/**
 * Retrieves the configured ARTCRAFT_API_KEY, with dynamic .env reload if updated while server is running.
 */
export function getArtcraftApiKey(): string | undefined {
  if (process.env.ARTCRAFT_API_KEY && process.env.ARTCRAFT_API_KEY.trim().length > 0 && process.env.ARTCRAFT_API_KEY !== 'artcraft_api_your_key_here') {
    return process.env.ARTCRAFT_API_KEY.trim();
  }

  // Dynamic reload from root .env
  const rootEnvPath = path.resolve(__dirname, '../../../.env');
  if (fs.existsSync(rootEnvPath)) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(rootEnvPath, 'utf8'));
      if (parsed.ARTCRAFT_API_KEY && parsed.ARTCRAFT_API_KEY.trim().length > 0 && parsed.ARTCRAFT_API_KEY !== 'artcraft_api_your_key_here') {
        process.env.ARTCRAFT_API_KEY = parsed.ARTCRAFT_API_KEY.trim();
        return process.env.ARTCRAFT_API_KEY;
      }
    } catch {}
  }

  return undefined;
}

/**
 * Checks if ArtCraft is configured with a valid API key.
 */
export function isArtcraftConfigured(): boolean {
  return Boolean(getArtcraftApiKey());
}

/**
 * Retrieves the base URL for the ArtCraft Omni API (default: https://api.storyteller.ai).
 */
export function getArtcraftBaseUrl(): string {
  const url = process.env.ARTCRAFT_BASE_URL || 'https://api.storyteller.ai';
  return url.replace(/\/+$/, '');
}

/**
 * Executes image generation / virtual saree drape via the ArtCraft Omni API.
 * Endpoint: POST /v1/omni_api/generate/image
 * Polling: GET /v1/omni_api/job_status/job/{token}
 */
export async function executeArtcraftTryOn(options: ArtcraftTryOnOptions): Promise<ArtcraftTryOnResult> {
  const startTime = Date.now();
  const { jobId, product, drapeStyle = 'nivi', garmentImagePath } = options;
  const apiKey = getArtcraftApiKey();

  if (!apiKey) {
    return {
      success: false,
      status: 'model_unavailable',
      errorMessage: 'ARTCRAFT_API_KEY is not configured in .env. Please add ARTCRAFT_API_KEY="artcraft_api_..." to enable ArtCraft AI generation.',
      isSimulation: false,
      provider: 'artcraft',
    };
  }

  const baseUrl = getArtcraftBaseUrl();
  let model = process.env.ARTCRAFT_MODEL || 'flux_1_schnell';
  if (model === 'gpt-image-2.5-sunburst') {
    model = 'gpt_image_2p5_sunburst';
  }

  // Construct high-fashion photorealistic luxury saree prompt
  const sareeName = product?.name || 'Heritage Silk Saree';
  const fabric = product?.fabric || 'Pure Silk';
  const color = product?.color || 'Royal Maroon';
  const border = product?.borderType || 'Zari Brocade';

  const prompt = `High-end editorial fashion lookbook photograph of an Indian woman elegantly draped in a luxurious ${color} ${fabric} ${sareeName} with intricate ${border} pallu and border, traditional ${drapeStyle} drape style, rich textile texture, metallic gold zari threadwork, photorealistic studio lighting, 8k resolution, cinematic composition.`;

  try {
    const referenceUrls: string[] = [];
    if (garmentImagePath && (garmentImagePath.startsWith('http://') || garmentImagePath.startsWith('https://'))) {
      referenceUrls.push(garmentImagePath);
    }

    const payload: Record<string, any> = {
      model,
      prompt,
      idempotency_token: crypto.randomUUID(),
    };

    if (referenceUrls.length > 0) {
      payload.reference_image_urls = referenceUrls;
    }

    console.log(`[ArtCraft:${jobId}] Submitting image generation job (model: ${model}) to ${baseUrl}/v1/omni_api/generate/image...`);

    const submitRes = await fetch(`${baseUrl}/v1/omni_api/generate/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      let cleanErr = `ArtCraft API error (${submitRes.status}): ${submitRes.statusText}`;
      if (submitRes.status === 401 || submitRes.status === 403) {
        cleanErr = 'ArtCraft authentication failed. Please verify your ARTCRAFT_API_KEY in .env.';
      } else if (submitRes.status === 402) {
        cleanErr = 'ArtCraft account requires credits/balance. Please check your account at https://app.getartcraft.com.';
      } else {
        try {
          const parsed = JSON.parse(errText);
          cleanErr = parsed.message || parsed.error || parsed.detail || errText || cleanErr;
        } catch {
          cleanErr = errText || cleanErr;
        }
      }

      console.error(`[ArtCraft:${jobId}] Request rejected:`, cleanErr);
      return {
        success: false,
        status: 'failed',
        errorMessage: cleanErr,
        isSimulation: false,
        provider: 'artcraft',
        processingTimeMs: Date.now() - startTime,
      };
    }

    const submitData: any = await submitRes.json();
    const jobToken = submitData.inference_job_token || submitData.job_token || submitData.token || submitData.id;

    if (!jobToken) {
      // Immediate image result if returned synchronously
      const directUrl = submitData.cdn_url || submitData.media_url || submitData.image_url || submitData?.data?.[0]?.url;
      if (directUrl) {
        return {
          success: true,
          status: 'completed',
          resultImageUrl: directUrl,
          isSimulation: false,
          provider: 'artcraft',
          disclaimer: 'Virtual drape synthesized via ArtCraft AI Omni Generation (app.getartcraft.com).',
          processingTimeMs: Date.now() - startTime,
        };
      }

      return {
        success: false,
        status: 'failed',
        errorMessage: 'ArtCraft API response did not contain an inference_job_token or direct image URL.',
        isSimulation: false,
        provider: 'artcraft',
        processingTimeMs: Date.now() - startTime,
      };
    }

    console.log(`[ArtCraft:${jobId}] Job accepted (token: ${jobToken}). Polling status...`);

    // Poll status endpoint
    const pollUrl = `${baseUrl}/v1/omni_api/job_status/job/${jobToken}`;
    let attempts = 0;
    const maxAttempts = 30; // 30 * 2.5s = 75 seconds max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2500));
      attempts++;

      try {
        const pollRes = await fetch(pollUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        if (!pollRes.ok) {
          console.warn(`[ArtCraft:${jobId}] Poll attempt ${attempts} returned ${pollRes.status}`);
          continue;
        }

        const pollData: any = await pollRes.json();
        const rawStatus = pollData.state?.status;
        const status = (typeof rawStatus === 'string' ? rawStatus : rawStatus?.status || pollData.status || '').toLowerCase();

        console.log(`[ArtCraft:${jobId}] Poll status attempt ${attempts}: ${status}`);

        if (status === 'complete_success' || status === 'completed' || status === 'succeeded' || status === 'success') {
          const cdnUrl =
            pollData.state?.maybe_result?.media_links?.cdn_url ||
            pollData.state?.maybe_result?.cdn_url ||
            pollData.media_links?.cdn_url ||
            pollData.result?.cdn_url ||
            pollData.cdn_url ||
            pollData.output_url;

          if (cdnUrl) {
            console.log(`[ArtCraft:${jobId}] Image generation succeeded in ${Date.now() - startTime}ms. CDN: ${cdnUrl}`);
            return {
              success: true,
              status: 'completed',
              resultImageUrl: cdnUrl,
              isSimulation: false,
              provider: 'artcraft',
              disclaimer: 'Virtual drape synthesized via ArtCraft AI Omni Generation (app.getartcraft.com).',
              processingTimeMs: Date.now() - startTime,
            };
          }
        } else if (status === 'failed' || status === 'error' || status === 'canceled') {
          const failReason = pollData.state?.error_message || pollData.error || 'ArtCraft job execution failed.';
          return {
            success: false,
            status: 'failed',
            errorMessage: `ArtCraft generation failed: ${failReason}`,
            isSimulation: false,
            provider: 'artcraft',
            processingTimeMs: Date.now() - startTime,
          };
        }
      } catch (pollErr: any) {
        console.warn(`[ArtCraft:${jobId}] Poll network error on attempt ${attempts}:`, pollErr.message);
      }
    }

    return {
      success: false,
      status: 'failed',
      errorMessage: 'ArtCraft image generation timed out after 75 seconds. Please retry.',
      isSimulation: false,
      provider: 'artcraft',
      processingTimeMs: Date.now() - startTime,
    };
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[ArtCraft:${jobId}] Unhandled exception:`, err);
    return {
      success: false,
      status: 'failed',
      errorMessage: `ArtCraft request error: ${err.message}`,
      isSimulation: false,
      provider: 'artcraft',
      processingTimeMs: elapsed,
    };
  }
}
