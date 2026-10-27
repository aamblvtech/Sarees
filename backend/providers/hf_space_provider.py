import logging
import os
import re
import time
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from PIL import Image, ImageOps

from backend.core.config import settings
from backend.providers.base import TryOnProvider, TryOnResult, TryOnErrorCode

logger = logging.getLogger("hf-space-provider")

class HuggingFaceSpaceProvider(TryOnProvider):
    """
    Genuine Open-Source Virtual Try-On Provider utilizing Hugging Face Spaces (ZeroGPU).
    Model: IDM-VTON (Improving Diffusion Models for Authentic Virtual Try-on in the Wild)
    Paper: Choi et al. (yisol/IDM-VTON)
    License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0).
    Commercial Use: Restricted to Non-Commercial / Evaluation only.
    """

    def __init__(self, space_name: str = "yisol/IDM-VTON", fallback_space: str = "Nymbo/Virtual-Try-On"):
        self._space_name = space_name
        self._fallback_space = fallback_space
        self._client = None
        self._client_with_token = None
        self._client_anonymous = None

    @property
    def name(self) -> str:
        return "idm-vton"

    @property
    def display_name(self) -> str:
        return "Hugging Face IDM-VTON (ZeroGPU Cloud)"

    @property
    def license_type(self) -> str:
        return "CC BY-NC-SA 4.0 (Non-Commercial Only)"

    @property
    def commercial_use_permitted(self) -> bool:
        return False # IDM-VTON has strict non-commercial restrictions

    def is_configured(self) -> bool:
        # IDM-VTON can run via public anonymous ZeroGPU queue or with user HF_TOKEN
        return True

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "supported_garment_types": ["upper_body", "lower_body", "one-piece", "dresses", "sarees", "kurtis", "shirts", "jackets"],
            "native_resolution": (768, 1024),
            "free_gpu_tier": "ZeroGPU (Nvidia A100 / H100 shared)",
            "limitations": [
                "Strict Non-Commercial license (CC BY-NC-SA 4.0). Not licensed for commercial retail deployment without author permission.",
                "Public ZeroGPU quota is shared and subject to daily allocation limits (approx. 60-90s GPU time per IP/account per day).",
                "Traditional Indian saree pleats and pallu are approximated onto the silhouette rather than generating physical multi-meter fabric wrapping."
            ]
        }

    def _get_client(self, space: str, use_token: bool = True):
        from gradio_client import Client
        token = settings.HF_TOKEN if (use_token and settings.HF_TOKEN and not settings.HF_TOKEN.startswith("paste_")) else None
        try:
            return Client(space, token=token)
        except Exception as e:
            logger.warning(f"Failed to connect to Gradio Space {space} (token={bool(token)}): {e}")
            return None

    def _parse_reset_seconds(self, err_text: str) -> Optional[int]:
        """Parse 'Try again in 20:34:35' or 'Try again in 2h' into integer seconds."""
        # Match HH:MM:SS
        hms = re.search(r"Try again in (\d+):(\d+):(\d+)", err_text)
        if hms:
            h, m, s = int(hms.group(1)), int(hms.group(2)), int(hms.group(3))
            return h * 3600 + m * 60 + s
        # Match Xh Ym
        h_m = re.search(r"Try again in (\d+)h\s*(\d*)m?", err_text)
        if h_m:
            h = int(h_m.group(1))
            m = int(h_m.group(2)) if h_m.group(2) else 0
            return h * 3600 + m * 60
        return None

    def generate_tryon(
        self,
        customer_image_path: Path,
        garment_image_path: Path,
        garment_info: Dict[str, Any],
        job_id: str,
        session_id: Optional[str] = None
    ) -> TryOnResult:
        start_time = time.time()
        temp_cust_768 = settings.OUTPUTS_DIR / f"temp_c768_{job_id}.jpg"
        temp_garm_768 = settings.OUTPUTS_DIR / f"temp_g768_{job_id}.jpg"
        out_file = settings.OUTPUTS_DIR / f"result_{job_id}.jpg"

        # Diagnostic log without secret leakage
        logger.info(
            f"[Job {job_id}] IDM-VTON Inference: Session={session_id or 'none'}, "
            f"Customer={customer_image_path.name}, Garment={garment_image_path.name}, "
            f"GarmentName='{garment_info.get('name')}'"
        )

        if not customer_image_path.exists():
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.INVALID_IMAGE,
                error_message="Customer photograph file not found on server.",
                provider_name=self.name,
                model_name="IDM-VTON",
                duration_seconds=time.time() - start_time
            )

        if not garment_image_path.exists():
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.INVALID_IMAGE,
                error_message="Selected catalog garment image not found on server.",
                provider_name=self.name,
                model_name="IDM-VTON",
                duration_seconds=time.time() - start_time
            )

        try:
            from gradio_client import handle_file

            # 1. Pre-scale customer image to IDM-VTON native 768x1024
            cust_img = Image.open(customer_image_path)
            cust_img = ImageOps.exif_transpose(cust_img).convert("RGB")
            orig_w, orig_h = cust_img.size

            cust_768 = cust_img.resize((768, 1024), Image.Resampling.LANCZOS)
            cust_768.save(temp_cust_768, quality=95)

            # 2. Pre-scale garment reference image to 768x1024
            garm_img = Image.open(garment_image_path)
            garm_img = ImageOps.exif_transpose(garm_img).convert("RGB")
            garm_768 = garm_img.resize((768, 1024), Image.Resampling.LANCZOS)
            garm_768.save(temp_garm_768, quality=95)

            garment_desc = garment_info.get("prompt") or garment_info.get("name") or "High quality garment"

            # 3. Strategy: Try primary space with user token, fallback space, and anonymous queue
            spaces_to_try = [
                (self._space_name, True),   # Primary space with configured token
                (self._space_name, False),  # Primary space anonymous queue
                (self._fallback_space, False) # Fallback space anonymous queue
            ]

            last_error_code = TryOnErrorCode.UNKNOWN_ERROR
            last_error_message = "Could not connect to IDM-VTON ZeroGPU Space."
            retry_seconds = None

            for space_id, use_token in spaces_to_try:
                try:
                    logger.info(f"[Job {job_id}] Connecting to space '{space_id}' (token={use_token})...")
                    client = self._get_client(space_id, use_token=use_token)
                    if client is None:
                        continue

                    logger.info(f"[Job {job_id}] Submitting inference request to {space_id}...")
                    result = client.predict(
                        dict={"background": handle_file(str(temp_cust_768)), "layers": [], "composite": None},
                        garm_img=handle_file(str(temp_garm_768)),
                        garment_des=garment_desc,
                        is_checked=True, # Auto segmentation mask
                        is_checked_crop=False,
                        denoise_steps=25,
                        seed=42,
                        api_name="/tryon"
                    )

                    if result and len(result) > 0 and result[0]:
                        raw_output_path = result[0]
                        # 4. Validate output image
                        res_img = Image.open(raw_output_path)
                        res_img.verify()
                        res_img = Image.open(raw_output_path)

                        # Resize back to original portrait aspect ratio
                        res_img = res_img.resize((orig_w, orig_h), Image.Resampling.LANCZOS)
                        res_img.save(out_file, format="JPEG", quality=95)

                        duration = time.time() - start_time
                        logger.info(
                            f"[Job {job_id}] REAL CLOUD GPU TRY-ON GENERATED: "
                            f"Space={space_id}, File={out_file.name}, Duration={duration:.2f}s"
                        )
                        return TryOnResult(
                            success=True,
                            image_path=out_file,
                            image_url=f"/outputs/{out_file.name}",
                            provider_name=self.name,
                            model_name=f"IDM-VTON ({space_id})",
                            duration_seconds=duration
                        )
                    else:
                        last_error_code = TryOnErrorCode.NO_IMAGE_RETURNED
                        last_error_message = f"IDM-VTON on {space_id} finished without returning an image."

                except Exception as space_err:
                    err_str = str(space_err)
                    logger.warning(f"[Job {job_id}] Error calling {space_id} (token={use_token}): {err_str[:200]}")

                    if "ZeroGPU quota" in err_str or "exceeded your" in err_str:
                        last_error_code = TryOnErrorCode.QUOTA_EXHAUSTED
                        retry_seconds = self._parse_reset_seconds(err_str)
                        last_error_message = (
                            f"Free ZeroGPU quota exceeded on Hugging Face Space ({space_id}). "
                            f"{f'Retry available in {retry_seconds // 3600}h {(retry_seconds % 3600) // 60}m. ' if retry_seconds else ''}"
                            "To enable unlimited high-speed try-on, upgrade your token at https://huggingface.co/subscribe/pro."
                        )
                        # If user token exceeded quota, continue loop to try anonymous public queue!
                        continue

                    elif "queue" in err_str.lower() and "full" in err_str.lower():
                        last_error_code = TryOnErrorCode.PROVIDER_BUSY
                        last_error_message = f"The public GPU queue on {space_id} is currently busy. Please retry in a few moments."

                    elif "401" in err_str or "Unauthorized" in err_str:
                        last_error_code = TryOnErrorCode.AUTHENTICATION_FAILED
                        last_error_message = "Hugging Face API token authentication failed. Please check HF_TOKEN."

                    elif "timeout" in err_str.lower():
                        last_error_code = TryOnErrorCode.GENERATION_TIMEOUT
                        last_error_message = f"Inference request timed out on {space_id}."

                    else:
                        last_error_code = TryOnErrorCode.PROVIDER_UNAVAILABLE
                        last_error_message = f"IDM-VTON Space error ({space_id}): {err_str[:150]}"

            # If all attempts failed, return honest structured error
            return TryOnResult(
                success=False,
                error_code=last_error_code,
                error_message=last_error_message,
                retry_after_seconds=retry_seconds,
                provider_name=self.name,
                model_name="IDM-VTON",
                duration_seconds=time.time() - start_time
            )

        except Exception as e:
            logger.error(f"[Job {job_id}] Unexpected IDM-VTON exception: {e}")
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.UNKNOWN_ERROR,
                error_message=f"Internal virtual try-on error: {str(e)}",
                provider_name=self.name,
                model_name="IDM-VTON",
                duration_seconds=time.time() - start_time
            )
        finally:
            for p in [temp_cust_768, temp_garm_768]:
                if p.exists():
                    try:
                        p.unlink()
                    except Exception:
                        pass
