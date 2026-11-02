"""
SAJEE Virtual Try-On - Replicate Hosted IDM-VTON Provider
Enables real cloud-based AI saree virtual try-on via yisol/IDM-VTON hosted on A100 GPU clusters.
"""
import os
import time
import base64
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from .base import BaseTryOnProvider, TryOnRequest, TryOnResult

# Ensure root or local .env is loaded
_env_path = os.path.join(os.path.dirname(__file__), "../../.env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv()

class ReplicateTryOnProvider(BaseTryOnProvider):
    def __init__(self, api_token: Optional[str] = None):
        self._explicit_token = api_token
        self.version_id = "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985"
        self.model_endpoint = "https://api.replicate.com/v1/predictions"

    @property
    def api_token(self) -> Optional[str]:
        if self._explicit_token is not None:
            return self._explicit_token
        tok = os.getenv("REPLICATE_API_TOKEN") or os.getenv("REPLICATE_API_KEY")
        if not tok:
            if os.path.exists(_env_path):
                load_dotenv(_env_path, override=True)
            tok = os.getenv("REPLICATE_API_TOKEN") or os.getenv("REPLICATE_API_KEY")
        return tok

    @property
    def provider_name(self) -> str:
        return "replicate_idm_vton"

    def is_available(self) -> bool:
        tok = self.api_token
        return bool(tok and tok.strip() and not tok.startswith("r8_your_replicate"))

    def get_health_status(self) -> Dict[str, Any]:
        has_token = self.is_available()
        return {
            "provider": "ReplicateTryOnProvider",
            "model": "cuuupid/idm-vton",
            "available": has_token,
            "token_configured": has_token,
            "execution_mode": "cloud_serverless_gpu (NVIDIA A100)",
            "message": "Ready for real AI virtual draping" if has_token else "REPLICATE_API_TOKEN is not configured in environment or .env file."
        }

    def _file_to_data_uri(self, file_path: str) -> Optional[str]:
        """Convert a local image file to a base64 Data URI for Replicate input."""
        if not os.path.exists(file_path):
            return None
        try:
            with open(file_path, "rb") as f:
                content = f.read()
            encoded = base64.b64encode(content).decode("utf-8")
            if content.startswith(b"\x89PNG"):
                mime = "png"
            elif content.startswith(b"RIFF") and len(content) > 12 and content[8:12] == b"WEBP":
                mime = "webp"
            else:
                mime = "jpeg"
            return f"data:image/{mime};base64,{encoded}"
        except Exception as e:
            print(f"[Replicate Adapter] Error encoding {file_path}: {e}")
            return None

    def process_tryon(self, request: TryOnRequest) -> TryOnResult:
        start_time = time.time()

        if not self.is_available():
            return TryOnResult(
                job_id=request.job_id,
                status="model_unavailable",
                is_simulation=False,
                provider_name=self.provider_name,
                processing_time_ms=int((time.time() - start_time) * 1000),
                error_message="REPLICATE_API_TOKEN is not set. Add your Replicate token to .env to execute real AI diffusion inference.",
                metadata={
                    "action_required": "Set REPLICATE_API_TOKEN in .env file",
                    "model": "cuuupid/idm-vton"
                }
            )

        try:
            # 1. Prepare Person Image (Data URI or URL)
            human_img = request.person_image_path
            if os.path.exists(human_img):
                human_data_uri = self._file_to_data_uri(human_img)
                if human_data_uri:
                    human_img = human_data_uri

            # 2. Prepare Garment Image
            garm_img = request.garment_image_path
            if os.path.exists(garm_img):
                garm_data_uri = self._file_to_data_uri(garm_img)
                if garm_data_uri:
                    garm_img = garm_data_uri

            # 3. Garment Description for Saree Prompts
            meta = request.garment_metadata or {}
            garment_des = meta.get("description") or f"{meta.get('name', 'Indian Silk Saree')}, {meta.get('fabric', 'Silk')} with border and pallu"

            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json",
                "Prefer": "wait=60"  # Request server to wait up to 60s for synchronous return
            }

            payload = {
                "version": self.version_id,
                "input": {
                    "human_img": human_img,
                    "garm_img": garm_img,
                    "garment_des": garment_des,
                    "category": "dresses",  # IDM-VTON uses 'dresses' for full-length garments/sarees
                    "crop": False,
                    "steps": 30
                }
            }

            print(f"[Replicate Adapter] Submitting real IDM-VTON try-on job {request.job_id}...")
            response = requests.post(self.model_endpoint, json=payload, headers=headers, timeout=120)

            if response.status_code not in [200, 201]:
                if response.status_code == 402:
                    error_msg = "Replicate account requires compute credits ($0 balance). Please add credit at https://replicate.com/account/billing#billing to run real AI IDM-VTON on A100 GPU."
                else:
                    try:
                        err_json = response.json()
                        error_msg = f"Replicate API error ({response.status_code}): {err_json.get('detail', response.text)}"
                    except Exception:
                        error_msg = f"Replicate API error ({response.status_code}): {response.text}"

                return TryOnResult(
                    job_id=request.job_id,
                    status="failed",
                    is_simulation=False,
                    provider_name=self.provider_name,
                    processing_time_ms=int((time.time() - start_time) * 1000),
                    error_message=error_msg,
                    metadata={"http_status": response.status_code}
                )

            data = response.json()
            prediction_id = data.get("id")
            status = data.get("status")
            output_url = data.get("output")

            # 4. If not yet succeeded (async polling)
            poll_attempts = 0
            poll_headers = {"Authorization": f"Bearer {self.api_token}"}
            get_url = data.get("urls", {}).get("get") or f"https://api.replicate.com/v1/predictions/{prediction_id}"

            while status in ["starting", "processing"] and poll_attempts < 40:
                time.sleep(2.0)
                poll_attempts += 1
                poll_res = requests.get(get_url, headers=poll_headers, timeout=30)
                if poll_res.ok:
                    poll_data = poll_res.json()
                    status = poll_data.get("status")
                    if status == "succeeded":
                        output_url = poll_data.get("output")
                        break
                    elif status in ["failed", "canceled"]:
                        return TryOnResult(
                            job_id=request.job_id,
                            status="failed",
                            is_simulation=False,
                            provider_name=self.provider_name,
                            processing_time_ms=int((time.time() - start_time) * 1000),
                            error_message=f"Inference failed on Replicate GPU: {poll_data.get('error')}",
                            metadata={"prediction_id": prediction_id}
                        )

            if status == "succeeded" and output_url:
                # Replicate output is either a URL string or array of URLs
                final_image_url = output_url[0] if isinstance(output_url, list) else output_url
                duration_ms = int((time.time() - start_time) * 1000)
                print(f"[Replicate Adapter] Job {request.job_id} succeeded in {duration_ms}ms! URL: {final_image_url}")

                return TryOnResult(
                    job_id=request.job_id,
                    status="completed",
                    result_image_url=final_image_url,
                    is_simulation=False,
                    provider_name=self.provider_name,
                    processing_time_ms=duration_ms,
                    metadata={
                        "model": "cuuupid/idm-vton",
                        "hosted_on": "Replicate A100 GPU",
                        "prediction_id": prediction_id,
                        "real_ai": True
                    }
                )

            return TryOnResult(
                job_id=request.job_id,
                status="failed",
                is_simulation=False,
                provider_name=self.provider_name,
                processing_time_ms=int((time.time() - start_time) * 1000),
                error_message=f"Replicate inference timed out after {poll_attempts * 2}s (status: {status}).",
                metadata={"prediction_id": prediction_id}
            )

        except Exception as e:
            print(f"[Replicate Adapter Exception] {e}")
            return TryOnResult(
                job_id=request.job_id,
                status="failed",
                is_simulation=False,
                provider_name=self.provider_name,
                processing_time_ms=int((time.time() - start_time) * 1000),
                error_message=str(e),
                metadata={"exception_type": type(e).__name__}
            )
