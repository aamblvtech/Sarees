import logging
import re
import time
import uuid
from pathlib import Path
from typing import Dict, Any, Optional
from PIL import Image, ImageOps

from backend.core.config import settings
from backend.providers.base import TryOnProvider, TryOnResult, TryOnErrorCode

logger = logging.getLogger("colab-provider")

class GoogleColabTryOnProvider(TryOnProvider):
    """
    Google Colab GPU Virtual Try-On Provider.
    Connects to a Google Colab notebook running IDM-VTON or CatVTON on a dedicated T4 GPU (16GB VRAM).
    Supports public tunnels: Gradio share links (.gradio.live), ngrok (.ngrok-free.app), or trycloudflare (.trycloudflare.com).
    License: CC BY-NC-SA 4.0 (IDM-VTON Academic / Non-Commercial).
    """

    @property
    def name(self) -> str:
        return "colab"

    @property
    def display_name(self) -> str:
        return "Google Colab GPU (IDM-VTON Dedicated T4)"

    @property
    def license_type(self) -> str:
        return "CC BY-NC-SA 4.0 (Non-Commercial Research / Testing)"

    @property
    def commercial_use_permitted(self) -> bool:
        return False

    def is_configured(self) -> bool:
        url = (getattr(settings, "COLAB_VTON_URL", "") or "").strip()
        return bool(url and (url.startswith("http://") or url.startswith("https://")))

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "supported_garment_types": ["all", "sarees", "kurtis", "lehengas", "sherwanis", "dresses", "shirts", "t-shirts", "jackets"],
            "native_resolution": (768, 1024),
            "free_gpu_tier": "Google Colab Free Tier (NVIDIA Tesla T4 16GB VRAM)",
            "limitations": [
                "Colab sessions timeout after inactivity (~60-90m on free tier).",
                "Non-commercial CC BY-NC-SA 4.0 license.",
                "Requires launching the AURA ATELIER Colab notebook and pasting the public tunnel URL."
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
        request_id = uuid.uuid4().hex[:8]
        colab_url = (getattr(settings, "COLAB_VTON_URL", "") or "").strip()
        out_file = settings.OUTPUTS_DIR / f"result_{job_id}.jpg"
        temp_cust_768 = settings.OUTPUTS_DIR / f"temp_colab_c_{job_id}.jpg"
        temp_garm_768 = settings.OUTPUTS_DIR / f"temp_colab_g_{job_id}.jpg"

        garment_id = garment_info.get("id", "unknown")
        garment_name = garment_info.get("name", "Unknown Garment")
        garment_desc = garment_info.get("prompt") or garment_name or "High quality fashion garment"

        # Structured diagnostic log without secret leakage
        logger.info(
            f"[Req {request_id}] [Job {job_id}] Colab VTON Inference Request: "
            f"ColabConfigured={bool(colab_url)}, Session={session_id or 'none'}, "
            f"ProductID={garment_id}, Garment='{garment_name}', "
            f"CustomerFile={customer_image_path.name}, GarmentFile={garment_image_path.name}"
        )

        if not self.is_configured():
            logger.warning(
                f"[Req {request_id}] [Job {job_id}] Colab URL not set. "
                f"Please launch the Colab notebook and set COLAB_VTON_URL in .env."
            )
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.PROVIDER_UNAVAILABLE,
                error_message=(
                    "Google Colab GPU tunnel is not configured. Please open the AURA ATELIER Colab Notebook, "
                    "start the IDM-VTON T4 GPU runtime, and paste the generated public tunnel URL into COLAB_VTON_URL in .env."
                ),
                provider_name=self.name,
                model_name="IDM-VTON (Colab T4)",
                duration_seconds=time.time() - start_time
            )

        if not customer_image_path.exists():
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.INVALID_IMAGE,
                error_message="Customer photograph file not found on server.",
                provider_name=self.name,
                model_name="IDM-VTON (Colab T4)",
                duration_seconds=time.time() - start_time
            )

        if not garment_image_path.exists():
            return TryOnResult(
                success=False,
                error_code=TryOnErrorCode.INVALID_IMAGE,
                error_message="Selected catalog garment image not found on server.",
                provider_name=self.name,
                model_name="IDM-VTON (Colab T4)",
                duration_seconds=time.time() - start_time
            )

        try:
            # 1. Preprocessing: Scale customer portrait to IDM-VTON native 768x1024 resolution
            cust_img = Image.open(customer_image_path)
            cust_img = ImageOps.exif_transpose(cust_img).convert("RGB")
            orig_w, orig_h = cust_img.size

            cust_768 = cust_img.resize((768, 1024), Image.Resampling.LANCZOS)
            cust_768.save(temp_cust_768, quality=95)

            # 2. Preprocessing: Scale garment reference to 768x1024 resolution
            garm_img = Image.open(garment_image_path)
            garm_img = ImageOps.exif_transpose(garm_img).convert("RGB")
            garm_768 = garm_img.resize((768, 1024), Image.Resampling.LANCZOS)
            garm_768.save(temp_garm_768, quality=95)

            # 3. Connect to Colab endpoint (Supports Gradio Client .gradio.live or direct REST)
            raw_output_path = None

            if "gradio.live" in colab_url or "hf.space" in colab_url or ":7860" in colab_url:
                from gradio_client import Client, handle_file
                logger.info(f"[Req {request_id}] [Job {job_id}] Connecting to Colab Gradio endpoint: {colab_url}...")
                client = Client(colab_url, download_files=settings.OUTPUTS_DIR)

                logger.info(
                    f"[Req {request_id}] [Job {job_id}] Submitting inputs to Colab IDM-VTON: "
                    f"Background={temp_cust_768.name}, Garment={temp_garm_768.name}, Steps=30"
                )
                result = client.predict(
                    dict={"background": handle_file(str(temp_cust_768)), "layers": [], "composite": None},
                    garm_img=handle_file(str(temp_garm_768)),
                    garment_des=garment_desc,
                    is_checked=True,       # Auto-segmentation mask
                    is_checked_crop=False,  # Keep full body posture
                    denoise_steps=30,
                    seed=42,
                    api_name="/tryon"
                )

                if result and len(result) > 0 and result[0]:
                    raw_output_path = result[0]
            else:
                # Direct REST / FastHTTP endpoint in Colab
                import httpx
                logger.info(f"[Req {request_id}] [Job {job_id}] Posting to Colab REST endpoint: {colab_url}...")
                with open(temp_cust_768, "rb") as cf, open(temp_garm_768, "rb") as gf:
                    with httpx.Client(timeout=120.0) as http_client:
                        resp = http_client.post(
                            f"{colab_url.rstrip('/')}/tryon",
                            files={
                                "person": ("customer.jpg", cf.read(), "image/jpeg"),
                                "garment": ("garment.jpg", gf.read(), "image/jpeg")
                            },
                            data={"description": garment_desc}
                        )
                        if resp.status_code == 200:
                            raw_temp = settings.OUTPUTS_DIR / f"colab_raw_{job_id}.jpg"
                            raw_temp.write_bytes(resp.content)
                            raw_output_path = str(raw_temp)
                        else:
                            logger.error(f"[Req {request_id}] Colab REST error {resp.status_code}: {resp.text[:200]}")

            # 4. Validate output image
            if raw_output_path and Path(raw_output_path).exists():
                res_img = Image.open(raw_output_path)
                res_img.verify()
                res_img = Image.open(raw_output_path)

                # Resize back to customer's exact original portrait dimensions
                res_img = res_img.resize((orig_w, orig_h), Image.Resampling.LANCZOS)
                res_img.save(out_file, format="JPEG", quality=95)

                duration = time.time() - start_time
                logger.info(
                    f"[Req {request_id}] [Job {job_id}] COLAB VTON GENERATION SUCCESS: "
                    f"File={out_file.name}, Dimensions={orig_w}x{orig_h}, Duration={duration:.2f}s"
                )
                return TryOnResult(
                    success=True,
                    image_path=out_file,
                    image_url=f"/outputs/{out_file.name}",
                    provider_name=self.name,
                    model_name="IDM-VTON (Google Colab GPU)",
                    duration_seconds=duration
                )
            else:
                logger.warning(f"[Req {request_id}] [Job {job_id}] Colab returned empty or invalid output.")
                return TryOnResult(
                    success=False,
                    error_code=TryOnErrorCode.NO_IMAGE_RETURNED,
                    error_message="Google Colab model executed but returned an empty response. Verify GPU memory in Colab.",
                    provider_name=self.name,
                    model_name="IDM-VTON (Google Colab GPU)",
                    duration_seconds=time.time() - start_time
                )

        except Exception as e:
            err_str = str(e)
            logger.error(f"[Req {request_id}] [Job {job_id}] Colab inference error: {e}")

            if "connection" in err_str.lower() or "connect" in err_str.lower() or "502" in err_str or "503" in err_str:
                error_code = TryOnErrorCode.PROVIDER_UNAVAILABLE
                error_msg = (
                    "Could not connect to Google Colab runtime. The Colab session may have disconnected or timed out. "
                    "Please check your Colab notebook and ensure the public tunnel is running."
                )
            elif "timeout" in err_str.lower():
                error_code = TryOnErrorCode.GENERATION_TIMEOUT
                error_msg = "Google Colab GPU inference timed out after 120 seconds."
            else:
                error_code = TryOnErrorCode.PROVIDER_BUSY
                error_msg = f"Colab GPU processing error: {err_str[:160]}"

            return TryOnResult(
                success=False,
                error_code=error_code,
                error_message=error_msg,
                provider_name=self.name,
                model_name="IDM-VTON (Google Colab GPU)",
                duration_seconds=time.time() - start_time
            )

        finally:
            # Clean temporary 768x1024 scaled files
            for p in [temp_cust_768, temp_garm_768]:
                try:
                    if p.exists():
                        p.unlink()
                except Exception:
                    pass
