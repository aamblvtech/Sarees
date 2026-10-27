import asyncio
import logging
import os
import re
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple, Any

from PIL import Image, ImageOps

from backend.core.config import settings, BASE_DIR
from backend.db.database import SessionLocal
from backend.models.tryon_job import TryonJob
from backend.models.catalog import CatalogItem
from backend.providers import (
    TryOnProvider,
    TryOnResult,
    TryOnErrorCode,
    get_tryon_provider,
    provider_registry
)

logger = logging.getLogger("ai-vton-service")

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
MIN_IMAGE_DIMENSION = 256

def validate_image_bytes(image_bytes: bytes, filename: str = "upload.jpg") -> Tuple[bool, str, Optional[Image.Image]]:
    """Validate uploaded photo size, format, dimension, and integrity."""
    if not image_bytes or len(image_bytes) == 0:
        return False, "The uploaded file is empty. Please select a valid photo.", None

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(image_bytes) > max_bytes:
        return False, f"Image file size ({len(image_bytes) // (1024*1024)}MB) exceeds the maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB.", None

    try:
        from io import BytesIO
        img = Image.open(BytesIO(image_bytes))
        img = ImageOps.exif_transpose(img)
        img.verify()
        # Re-open after verify() to get usable image object
        img = Image.open(BytesIO(image_bytes))
        img = ImageOps.exif_transpose(img)

        width, height = img.size
        if width < MIN_IMAGE_DIMENSION or height < MIN_IMAGE_DIMENSION:
            return False, f"Image dimensions ({width}x{height}px) are too small. For best AI try-on, use a portrait at least 512px tall.", None

        return True, "Valid", img
    except Exception as e:
        logger.warning(f"Image validation error for {filename}: {e}")
        return False, "Could not decode image. Please upload a clear JPG, PNG, or WebP photo.", None

def build_garment_prompt(garment: CatalogItem) -> str:
    """Build high-fidelity descriptive prompt for virtual try-on models."""
    category = (garment.category or "").lower()
    name = garment.name or "outfit"
    fabric = garment.fabric or "luxury textile"
    color = garment.color or "vibrant"
    desc = garment.description or ""

    if "saree" in category:
        return f"Traditional Indian {color} {fabric} Saree, authentic pleats, elaborate zari border, matching blouse, elegant drape, high fashion studio portrait. {desc}"
    elif "kurti" in category:
        return f"Indian {color} {fabric} Anarkali Kurti suit with intricate neckline embroidery, graceful silhouette, traditional ethnic wear. {desc}"
    elif "lehenga" in category:
        return f"Luxury Indian {color} bridal lehenga choli with ornate zardozi embroidery, flared skirt, matching dupatta, festive couture. {desc}"
    elif "sherwani" in category:
        return f"Regal Indian {color} {fabric} Sherwani with Mandarin collar and ornate metallic buttons, tailored royal ethnic menswear. {desc}"
    elif "dress" in category:
        return f"Contemporary {color} {fabric} midi dress with elegant drape and flattering cut, modern womenswear. {desc}"
    elif "shirt" in category:
        return f"Crisp {color} {fabric} tailored long-sleeve button-down Oxford shirt, smart-casual fit. {desc}"
    elif "t-shirt" in category or "tee" in category:
        return f"Premium {color} {fabric} crewneck t-shirt with clean relaxed silhouette. {desc}"
    elif "jacket" in category:
        return f"Classic {color} {fabric} jacket with metallic zippers and tailored collar, luxury outerwear. {desc}"
    else:
        return f"High quality {color} {fabric} {name}, authentic drape and texture, photorealistic fit. {desc}"

class AITryonService:
    """Service facade coordinating virtual try-on inference across modular providers."""

    def get_hf_client(self):
        """Returns the Gradio client for Hugging Face IDM-VTON."""
        provider = get_tryon_provider("idm-vton")
        return getattr(provider, "_get_client", lambda space: None)("yisol/IDM-VTON", use_token=bool(settings.HF_TOKEN))

    def reset_client(self):
        """Reset cached provider connections."""
        pass

    def run_idm_vton_sync(
        self,
        customer_path: Path,
        garment_path: Path,
        prompt: str,
        job_id: str,
        garment_id: Optional[int] = None,
        session_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Delegates directly to HuggingFaceSpaceProvider."""
        provider = get_tryon_provider("idm-vton")
        info = {"prompt": prompt, "name": prompt, "id": garment_id}
        res: TryOnResult = provider.generate_tryon(customer_path, garment_path, info, job_id, session_id)
        return res.success, res.image_url, res.error_message

    def run_gemini_nano_banana_sync(
        self,
        customer_path: Path,
        garment_path: Path,
        prompt: str,
        job_id: str,
        garment_id: Optional[int] = None,
        session_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Delegates directly to GeminiNanoBananaProvider."""
        provider = get_tryon_provider("gemini-nano-banana")
        info = {"prompt": prompt, "name": prompt, "id": garment_id}
        res: TryOnResult = provider.generate_tryon(customer_path, garment_path, info, job_id, session_id)
        return res.success, res.image_url, res.error_message

    def run_fashn_sync(
        self,
        customer_path: Path,
        garment_path: Path,
        clothing_type: str,
        job_id: str,
        session_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Delegates directly to FashnProvider."""
        provider = get_tryon_provider("fashn")
        info = {"clothing_type": clothing_type}
        res: TryOnResult = provider.generate_tryon(customer_path, garment_path, info, job_id, session_id)
        return res.success, res.image_url, res.error_message

    def run_colab_sync(
        self,
        customer_path: Path,
        garment_path: Path,
        prompt: str,
        job_id: str,
        garment_id: Optional[int] = None,
        session_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Delegates directly to GoogleColabTryOnProvider."""
        provider = get_tryon_provider("colab")
        info = {"prompt": prompt, "name": prompt, "id": garment_id}
        res: TryOnResult = provider.generate_tryon(customer_path, garment_path, info, job_id, session_id)
        return res.success, res.image_url, res.error_message

# Singleton service instance
ai_tryon_service = AITryonService()

async def process_tryon_job(job_id: str):
    """
    Background asynchronous worker executing virtual try-on jobs.
    Uses the configured TryOnProvider (IDM-VTON on ZeroGPU, Gemini Nano Banana, or FASHN).
    Updates job status in database with honest machine-readable error codes and reset times.
    """
    db = SessionLocal()
    try:
        job = db.query(TryonJob).filter(TryonJob.id == job_id).first()
        if not job:
            logger.error(f"Tryon job {job_id} not found in database.")
            return

        # 1. Update status to processing
        job.status = "processing"
        job.progress = 25
        db.commit()

        person_path = Path(job.person_image_path)
        garment_path = Path(job.garment_image_path)

        if not person_path.exists():
            job.status = "failed"
            job.progress = 0
            job.error_code = TryOnErrorCode.INVALID_IMAGE.value
            job.error_message = "Customer photograph not found on server."
            db.commit()
            return

        if not garment_path.exists():
            job.status = "failed"
            job.progress = 0
            job.error_code = TryOnErrorCode.INVALID_IMAGE.value
            job.error_message = "Selected catalog garment image not found on server."
            db.commit()
            return

        # Extract session ID from person_image_path if present
        session_id = None
        if "cust_session_" in job.person_image_path:
            m = re.search(r"cust_session_([a-zA-Z0-9_\-]+)\.jpg", job.person_image_path)
            if m:
                session_id = m.group(1)

        # 2. Select modular try-on provider
        provider_name = (job.provider or settings.AI_TRYON_PROVIDER or "idm-vton").strip().lower()
        provider: TryOnProvider = get_tryon_provider(provider_name)

        garment_info = {
            "id": job.garment_id,
            "name": job.garment_name,
            "clothing_type": job.clothing_type,
            "prompt": job.prompt or "Traditional high quality fashion virtual try-on"
        }

        request_id = uuid.uuid4().hex[:8]
        logger.info(
            f"[Req {request_id}] [Job {job_id}] Processing virtual try-on with provider '{provider.name}' ({provider.display_name}). "
            f"CommercialPermitted={provider.commercial_use_permitted}, CustomerSessionID={session_id or 'none'}, "
            f"ProductID={job.garment_id}, GarmentName='{job.garment_name}', "
            f"CustomerPath='{person_path.name}', GarmentPath='{garment_path.name}'"
        )

        job.progress = 50
        db.commit()

        # 3. Execute inference in threadpool without blocking event loop
        loop = asyncio.get_event_loop()
        result: TryOnResult = await loop.run_in_executor(
            None,
            provider.generate_tryon,
            person_path,
            garment_path,
            garment_info,
            job.id,
            session_id
        )

        # 4. Commit honest result (NEVER substitute fake or preset images)
        if result.success and result.image_url:
            job.status = "completed"
            job.progress = 100
            job.result_url = result.image_url
            job.completed_at = datetime.utcnow()
            job.error_code = None
            job.error_message = None
            job.retry_after_seconds = None
            logger.info(
                f"[Req {request_id}] [Job {job_id}] Try-on Job successfully COMPLETED: "
                f"ProductID={job.garment_id}, CustomerSessionID={session_id or 'none'}, "
                f"ModelStatus=COMPLETED, OutputPath={result.image_url} ({result.duration_seconds:.2f}s)"
            )
        else:
            job.status = "failed"
            job.progress = 0
            job.error_code = result.error_code.value if result.error_code else TryOnErrorCode.UNKNOWN_ERROR.value
            job.error_message = result.error_message or "AI Virtual Try-On failed to generate a result."
            job.retry_after_seconds = result.retry_after_seconds
            logger.warning(
                f"[Req {request_id}] [Job {job_id}] Try-on Job FAILED: "
                f"ProductID={job.garment_id}, CustomerSessionID={session_id or 'none'}, "
                f"ModelStatus=FAILED, ErrorCode={job.error_code}, "
                f"RetryAfter={job.retry_after_seconds}s, Error='{job.error_message}'"
            )

        db.commit()

    except Exception as e:
        logger.error(f"[Job {job_id}] Unexpected error in process_tryon_job: {e}")
        try:
            job = db.query(TryonJob).filter(TryonJob.id == job_id).first()
            if job:
                job.status = "failed"
                job.progress = 0
                job.error_code = TryOnErrorCode.UNKNOWN_ERROR.value
                job.error_message = f"Internal processing error: {str(e)}"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
