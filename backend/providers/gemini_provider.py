import logging
import time
from pathlib import Path
from typing import Dict, Any, Optional
from PIL import Image, ImageOps

from backend.core.config import settings
from backend.providers.base import TryOnProvider, TryOnResult, TryOnErrorCode

logger = logging.getLogger("gemini-provider")

class GeminiNanoBananaProvider(TryOnProvider):
    """
    Google Gemini Multimodal Virtual Try-On Provider.
    Models: gemini-2.5-flash-image, gemini-3.1-flash-image, gemini-nano-banana-2.1, nano-banana-pro-preview.
    License: Google AI Studio / Google Cloud Paid Terms of Service.
    Commercial Use: Permitted with Pay-As-You-Go billing linked in Google Cloud.
    """

    @property
    def name(self) -> str:
        return "gemini-nano-banana"

    @property
    def display_name(self) -> str:
        return "Google Gemini Nano Banana (Multimodal Image Gen)"

    @property
    def license_type(self) -> str:
        return "Google Cloud / AI Studio Commercial API Terms"

    @property
    def commercial_use_permitted(self) -> bool:
        return True # Commercial use allowed with billed Google Cloud project

    def is_configured(self) -> bool:
        key = (settings.GEMINI_API_KEY or "").strip()
        return bool(key and len(key) > 15 and not key.startswith("your_"))

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "supported_garment_types": ["all", "sarees", "kurtis", "lehengas", "sherwanis", "dresses", "shirts", "t-shirts", "jackets", "trousers"],
            "native_resolution": (1024, 1024),
            "free_gpu_tier": "Google AI Studio Free Tier (Note: Image models have limit: 0 on unbilled tier)",
            "limitations": [
                "Requires Pay-As-You-Go billing linked in Google AI Studio to unlock quota > 0.",
                "Generative image synthesis may occasionally hallucinate background nuances or alter complex ethnic draping."
            ]
        }

    def generate_tryon(
        self,
        customer_image_path: Path,
        garment_image_path: Path,
        garment_info: Dict[str, Any],
        job_id: str,
        session_id: Optional[str] = None
    ) -> TryOnResult:
        start_time = time.time()
        api_key = (settings.GEMINI_API_KEY or "").strip()
        out_file = settings.OUTPUTS_DIR / f"result_{job_id}.jpg"

        logger.info(
            f"[Job {job_id}] Gemini VTON: Session={session_id or 'none'}, "
            f"KeyConfigured={bool(api_key and len(api_key) > 15)}, "
            f"Customer={customer_image_path.name}, Garment={garment_image_path.name}"
        )

        if not self.is_configured():
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.AUTHENTICATION_FAILED,
                error_message="Google Gemini API key is not configured. Please set GEMINI_API_KEY in .env or via Admin Settings.",
                provider_name=self.name,
                model_name="Gemini Nano Banana",
                duration_seconds=time.time() - start_time
            )

        if not customer_image_path.exists():
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.INVALID_IMAGE,
                error_message="Customer photograph not found on server.",
                provider_name=self.name,
                model_name="Gemini Nano Banana",
                duration_seconds=time.time() - start_time
            )

        if not garment_image_path.exists():
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.INVALID_IMAGE,
                error_message="Selected garment reference image not found on server.",
                provider_name=self.name,
                model_name="Gemini Nano Banana",
                duration_seconds=time.time() - start_time
            )

        try:
            cust_img = Image.open(customer_image_path)
            cust_img = ImageOps.exif_transpose(cust_img).convert("RGB")

            garm_img = Image.open(garment_image_path)
            garm_img = ImageOps.exif_transpose(garm_img).convert("RGB")

            base_prompt = (
                "Edit the first input photograph of the real customer. Use the second input photograph as the exact reference for the selected garment. "
                "Generate a new photorealistic image showing the SAME customer wearing that garment. "
                "Preserve the customer's facial identity, skin tone, hairstyle, body proportions, pose, and recognizable features. "
                "Reproduce the garment's actual color, pattern, embroidery, border, fabric appearance, neckline, sleeves, and design as closely as possible. "
                "For an Indian saree, render a naturally draped saree with a realistic pallu and pleats. "
                "For kurtis, lehengas, sherwanis, dresses, shirts, and jackets, preserve the selected item's specific cut and design. "
                "Keep the original background, camera angle, and lighting where practical. "
                "Replace the clothing, not the person. Do not use the person from the garment catalog photo as the customer. "
                "Do not return either original input unchanged. Output one realistic edited photograph, not a collage, split screen, product advertisement, or textual explanation."
            )
            specifics = garment_info.get("prompt") or garment_info.get("name") or ""
            full_prompt = f"{base_prompt}\n\nSelected Garment Specifications: {specifics}" if specifics else base_prompt

            models_to_try = [
                "gemini-2.5-flash-image",
                "gemini-3.1-flash-image",
                "gemini-nano-banana-2.1",
                "nano-banana-pro-preview",
                "gemini-3.1-flash-lite-image"
            ]

            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            last_error_code = TryOnErrorCode.UNKNOWN_ERROR
            last_error_msg = "Gemini virtual try-on failed."

            for model_id in models_to_try:
                try:
                    logger.info(f"[Job {job_id}] Calling Gemini model: {model_id}...")
                    config = types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"])
                    response = client.models.generate_content(
                        model=model_id,
                        contents=[cust_img, garm_img, full_prompt],
                        config=config
                    )

                    image_bytes = None
                    text_parts = []

                    # Check candidates and parts
                    for cand in getattr(response, "candidates", []) or []:
                        content = getattr(cand, "content", None)
                        if content and getattr(content, "parts", None):
                            for part in content.parts:
                                inline_data = getattr(part, "inline_data", None)
                                if inline_data and getattr(inline_data, "data", None):
                                    image_bytes = inline_data.data
                                    break
                                text_val = getattr(part, "text", None)
                                if text_val:
                                    text_parts.append(text_val.strip())
                        if image_bytes:
                            break

                    if not image_bytes and getattr(response, "parts", None):
                        for part in response.parts:
                            inline_data = getattr(part, "inline_data", None)
                            if inline_data and getattr(inline_data, "data", None):
                                image_bytes = inline_data.data
                                break
                            text_val = getattr(part, "text", None)
                            if text_val:
                                text_parts.append(text_val.strip())

                    if image_bytes and len(image_bytes) > 512:
                        out_file.write_bytes(image_bytes)
                        with Image.open(out_file) as validated:
                            validated.verify()

                        duration = time.time() - start_time
                        logger.info(f"[Job {job_id}] GEMINI VTON GENERATED: Model={model_id}, File={out_file.name}, Duration={duration:.2f}s")
                        return TryOnResult(
                            success=True,
                            image_path=out_file,
                            image_url=f"/outputs/{out_file.name}",
                            provider_name=self.name,
                            model_name=model_id,
                            duration_seconds=duration
                        )
                    elif text_parts:
                        last_error_code = TryOnErrorCode.NO_IMAGE_RETURNED
                        last_error_msg = f"Gemini returned textual explanation instead of image: {' '.join(text_parts)[:150]}"
                    else:
                        last_error_code = TryOnErrorCode.NO_IMAGE_RETURNED
                        last_error_msg = "Gemini returned empty response without image data."

                except Exception as model_err:
                    err_str = str(model_err)
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                        last_error_code = TryOnErrorCode.QUOTA_EXHAUSTED
                        last_error_msg = (
                            "Gemini API Quota Exceeded (429 RESOURCE_EXHAUSTED): Google AI Studio image generation "
                            "has a limit of 0 on free tier and requires Pay-As-You-Go billing linked in Google AI Studio / Google Cloud. "
                            "Please link billing at https://aistudio.google.com to enable live Gemini image generation."
                        )
                    elif "400" in err_str or "INVALID_ARGUMENT" in err_str:
                        last_error_code = TryOnErrorCode.INVALID_IMAGE
                        last_error_msg = f"Gemini API invalid argument: {err_str[:150]}"
                    elif "403" in err_str or "PERMISSION_DENIED" in err_str:
                        last_error_code = TryOnErrorCode.AUTHENTICATION_FAILED
                        last_error_msg = "Gemini API key is invalid or unauthorized."
                        break
                    elif "SAFETY" in err_str.upper() or "BLOCK" in err_str.upper():
                        last_error_code = TryOnErrorCode.UNSUPPORTED_GARMENT
                        last_error_msg = "Generation stopped by Gemini safety guardrails."
                    else:
                        last_error_code = TryOnErrorCode.PROVIDER_UNAVAILABLE
                        last_error_msg = f"Gemini API error ({type(model_err).__name__}): {err_str[:150]}"

            return TryOnResult(
                success=False,
                error_code=last_error_code,
                error_message=last_error_msg,
                provider_name=self.name,
                model_name="Gemini Nano Banana",
                duration_seconds=time.time() - start_time
            )

        except Exception as e:
            logger.error(f"[Job {job_id}] Gemini unexpected exception: {e}")
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.UNKNOWN_ERROR,
                error_message=f"Gemini processing error: {str(e)}",
                provider_name=self.name,
                model_name="Gemini Nano Banana",
                duration_seconds=time.time() - start_time
            )
