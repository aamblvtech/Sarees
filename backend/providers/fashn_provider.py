import base64
import logging
import time
from pathlib import Path
from typing import Dict, Any, Optional

import httpx
from PIL import Image

from backend.core.config import settings
from backend.providers.base import TryOnProvider, TryOnResult, TryOnErrorCode

logger = logging.getLogger("fashn-provider")

class FashnProvider(TryOnProvider):
    """
    FASHN.ai Commercial Virtual Try-On API Provider (Try-On Max).
    License: Commercial API Terms.
    Commercial Use: Permitted with paid FASHN credits.
    """

    @property
    def name(self) -> str:
        return "fashn"

    @property
    def display_name(self) -> str:
        return "FASHN.ai (Try-On Max API)"

    @property
    def license_type(self) -> str:
        return "Commercial SaaS API Terms"

    @property
    def commercial_use_permitted(self) -> bool:
        return True

    def is_configured(self) -> bool:
        key = (settings.FASHN_API_KEY or "").strip()
        return bool(key and len(key) > 8 and not key.startswith("your_") and not key.startswith("paste_"))

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "supported_garment_types": ["tops", "bottoms", "one-pieces", "dresses", "sarees", "jackets", "shirts"],
            "native_resolution": (1024, 1365),
            "free_gpu_tier": "FASHN Trial Credits (Requires FASHN_API_KEY)",
            "limitations": [
                "Requires an active API key and available credits from https://fashn.ai.",
                "Saree draping quality depends on garment flat lay / model extraction."
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
        api_key = (settings.FASHN_API_KEY or "").strip()
        out_file = settings.OUTPUTS_DIR / f"result_{job_id}.jpg"

        if not self.is_configured():
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.AUTHENTICATION_FAILED,
                error_message="FASHN API key is not configured. Please set FASHN_API_KEY in .env or via Admin Settings.",
                provider_name=self.name,
                model_name="FASHN Try-On Max",
                duration_seconds=time.time() - start_time
            )

        if not customer_image_path.exists() or not garment_image_path.exists():
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.INVALID_IMAGE,
                error_message="Customer photograph or garment reference file is missing.",
                provider_name=self.name,
                model_name="FASHN Try-On Max",
                duration_seconds=time.time() - start_time
            )

        try:
            with open(customer_image_path, "rb") as f:
                cust_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("utf-8")
            with open(garment_image_path, "rb") as f:
                garm_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("utf-8")

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model_name": "tryon-max",
                "inputs": {
                    "model_image": cust_b64,
                    "product_image": garm_b64,
                    "generation_mode": "quality"
                }
            }

            logger.info(f"[Job {job_id}] Dispatching REST request to FASHN.ai (tryon-max)...")
            with httpx.Client(timeout=90.0) as client:
                res = client.post("https://api.fashn.ai/v1/run", json=payload, headers=headers)

                if res.status_code in (401, 403):
                    return TryOnResult(
                        success=False,
                        error_code=TryOnErrorCode.AUTHENTICATION_FAILED,
                        error_message="FASHN API authentication failed. The configured FASHN_API_KEY is invalid or expired.",
                        provider_name=self.name,
                        model_name="FASHN Try-On Max",
                        duration_seconds=time.time() - start_time
                    )
                elif res.status_code == 429:
                    return TryOnResult(
                        success=False,
                        error_code=TryOnErrorCode.QUOTA_EXHAUSTED,
                        error_message="FASHN API credits exhausted or rate limit exceeded. Please top up credits at https://fashn.ai.",
                        provider_name=self.name,
                        model_name="FASHN Try-On Max",
                        duration_seconds=time.time() - start_time
                    )
                elif res.status_code != 200:
                    return TryOnResult(
                        success=False,
                        error_code=TryOnErrorCode.PROVIDER_UNAVAILABLE,
                        error_message=f"FASHN API error ({res.status_code}): {res.text[:180]}",
                        provider_name=self.name,
                        model_name="FASHN Try-On Max",
                        duration_seconds=time.time() - start_time
                    )

                data = res.json()
                pred_id = data.get("id")
                if not pred_id:
                    return TryOnResult(
                        success=False,
                        error_code=TryOnErrorCode.NO_IMAGE_RETURNED,
                        error_message=f"FASHN API error: {data.get('error') or 'No prediction ID'}",
                        provider_name=self.name,
                        model_name="FASHN Try-On Max",
                        duration_seconds=time.time() - start_time
                    )

                logger.info(f"[Job {job_id}] FASHN prediction queued: {pred_id}. Polling status...")
                for _ in range(45):
                    time.sleep(2)
                    st_res = client.get(f"https://api.fashn.ai/v1/status/{pred_id}", headers=headers)
                    if st_res.status_code == 200:
                        st_data = st_res.json()
                        current_status = st_data.get("status")

                        if current_status == "completed":
                            output_urls = st_data.get("output", [])
                            if output_urls and output_urls[0]:
                                img_resp = client.get(output_urls[0], timeout=40.0)
                                if img_resp.status_code == 200 and len(img_resp.content) > 1024:
                                    out_file.write_bytes(img_resp.content)
                                    with Image.open(out_file) as test_img:
                                        test_img.verify()
                                    duration = time.time() - start_time
                                    logger.info(f"[Job {job_id}] FASHN generation completed in {duration:.2f}s!")
                                    return TryOnResult(
                                        success=True,
                                        image_path=out_file,
                                        image_url=f"/outputs/{out_file.name}",
                                        provider_name=self.name,
                                        model_name="FASHN Try-On Max",
                                        duration_seconds=duration
                                    )
                                else:
                                    return TryOnResult(
                                        success=False,
                                        error_code=TryOnErrorCode.NO_IMAGE_RETURNED,
                                        error_message="Failed to download generated try-on image from FASHN CDN.",
                                        provider_name=self.name,
                                        model_name="FASHN Try-On Max",
                                        duration_seconds=time.time() - start_time
                                    )
                        elif current_status == "failed":
                            err_info = st_data.get("error")
                            err_msg = err_info.get("message") if isinstance(err_info, dict) else str(err_info or "Prediction failed.")
                            return TryOnResult(
                                success=False,
                                error_code=TryOnErrorCode.PROVIDER_UNAVAILABLE,
                                error_message=f"FASHN processing failed: {err_msg}",
                                provider_name=self.name,
                                model_name="FASHN Try-On Max",
                                duration_seconds=time.time() - start_time
                            )

            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.GENERATION_TIMEOUT,
                error_message="FASHN virtual try-on inference timed out after 90 seconds. Please try again.",
                provider_name=self.name,
                model_name="FASHN Try-On Max",
                duration_seconds=time.time() - start_time
            )

        except Exception as e:
            logger.error(f"[Job {job_id}] FASHN exception: {e}")
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.UNKNOWN_ERROR,
                error_message=f"FASHN processing error: {str(e)}",
                provider_name=self.name,
                model_name="FASHN Try-On Max",
                duration_seconds=time.time() - start_time
            )
