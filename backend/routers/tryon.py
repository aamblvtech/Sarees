import uuid
import shutil
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.db.database import get_db
from backend.models.tryon_job import TryonJob
from backend.models.catalog import CatalogItem
from backend.schemas.tryon import (
    TryonJobCreateResponse,
    SessionPhotoResponse,
    TryonJobStatusResponse,
    ProviderHealthResponse
)
from backend.services.ai_vton_service import (
    validate_image_bytes,
    build_garment_prompt,
    process_tryon_job,
    ai_tryon_service
)
from backend.services.cleanup_service import purge_customer_session

logger = logging.getLogger("tryon-router")

# Active customer session cache for real-time kiosk synchronization
ACTIVE_CUSTOMER_SESSIONS: dict = {}

router = APIRouter(prefix="/api/tryon", tags=["Virtual Try-On"])

@router.post("/session-photo", response_model=SessionPhotoResponse)
async def upload_session_photo(
    session_id: Optional[str] = Form(None, description="Existing customer session ID from kiosk QR"),
    person: Optional[UploadFile] = File(None, description="Uploaded portrait file"),
    use_demo: bool = Form(False, description="Use high-quality store demo portrait"),
    user_consent: bool = Form(True, description="Customer consent for virtual try-on processing")
):
    """
    Stores customer photograph under a unique session ID.
    Enables instant automatic try-on for subsequent outfit clicks without re-uploading.
    Associates mobile uploads to the exact kiosk session via session_id.
    """
    if not user_consent:
        raise HTTPException(status_code=400, detail="Customer consent is required to process photographs.")

    active_session_id = session_id.strip() if (session_id and session_id.strip()) else uuid.uuid4().hex
    target_filename = f"cust_session_{active_session_id}.jpg"
    target_path = settings.OUTPUTS_DIR / target_filename

    if use_demo:
        # Use existing portrait from store images
        demo_src = settings.IMAGES_DIR / "customer_jeans_model.jpg"
        if not demo_src.exists():
            demo_src = settings.IMAGES_DIR / "drape_model1_saree1.jpg"
        if not demo_src.exists():
            raise HTTPException(status_code=404, detail="Demo portrait asset not found on server.")
        shutil.copy(demo_src, target_path)
    else:
        if not person:
            raise HTTPException(status_code=400, detail="Please upload a photo file or select the demo model.")
        person_bytes = await person.read()
        is_valid, validation_msg, pil_img = validate_image_bytes(person_bytes, filename=person.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=validation_msg)
        pil_img.save(target_path, format="JPEG", quality=95)

    rel_url = f"/outputs/{target_filename}"
    ACTIVE_CUSTOMER_SESSIONS[active_session_id] = {
        "status": "ready",
        "session_id": active_session_id,
        "image_url": rel_url,
        "updated_at": datetime.utcnow().isoformat(),
        "source": "demo" if use_demo else "upload"
    }
    logger.info(f"Initialized customer session {active_session_id} with portrait: {target_filename}")

    return SessionPhotoResponse(
        session_id=active_session_id,
        image_url=rel_url,
        status="ready",
        message="Portrait saved for customer session."
    )

@router.get("/session-status")
def get_session_status(session_id: str = Query(..., description="Customer dressing room session ID")):
    """
    Real-time status check for kiosk synchronization.
    Main kiosk polls this endpoint to detect when phone upload finishes.
    Verifies the customer's actual file exists on disk.
    """
    clean_id = session_id.strip()
    file_path = settings.OUTPUTS_DIR / f"cust_session_{clean_id}.jpg"

    if clean_id in ACTIVE_CUSTOMER_SESSIONS:
        if file_path.exists():
            return ACTIVE_CUSTOMER_SESSIONS[clean_id]
        else:
            ACTIVE_CUSTOMER_SESSIONS.pop(clean_id, None)

    # Fallback: check if the session portrait file exists on disk
    if file_path.exists():
        session_info = {
            "status": "ready",
            "session_id": clean_id,
            "image_url": f"/outputs/{file_path.name}",
            "updated_at": datetime.utcnow().isoformat(),
            "source": "disk"
        }
        ACTIVE_CUSTOMER_SESSIONS[clean_id] = session_info
        return session_info

    return {
        "status": "waiting",
        "session_id": clean_id,
        "message": "Waiting for customer to scan QR code and upload portrait."
    }


@router.post("/jobs", response_model=TryonJobCreateResponse)
async def create_tryon_job(
    background_tasks: BackgroundTasks,
    session_id: Optional[str] = Form(None, description="Existing customer session ID"),
    person: Optional[UploadFile] = File(None, description="Optional customer photograph"),
    garment_id: int = Form(..., description="Selected catalog garment ID"),
    user_consent: bool = Form(True, description="Customer consent"),
    db: Session = Depends(get_db)
):
    """
    Submits a new AI virtual try-on job asynchronously.
    Supports instant outfit changes using existing customer session.
    """
    if not user_consent:
        raise HTTPException(status_code=400, detail="Customer consent is required to process photographs.")

    # 1. Check garment existence
    garment = db.query(CatalogItem).filter(CatalogItem.id == garment_id, CatalogItem.is_active == True).first()
    if not garment:
        raise HTTPException(status_code=404, detail=f"Garment with ID {garment_id} not found in catalog.")

    garment_path = settings.IMAGES_DIR / garment.image_filename
    if not garment_path.exists():
        raise HTTPException(status_code=404, detail="Garment image file is missing from store repository.")

    # 2. Resolve customer portrait from session or new upload
    safe_person_path = None
    active_session_id = session_id

    if session_id:
        session_file = settings.OUTPUTS_DIR / f"cust_session_{session_id}.jpg"
        if session_file.exists():
            safe_person_path = session_file

    if not safe_person_path:
        if not person:
            raise HTTPException(status_code=400, detail="Customer photograph not found. Please upload a photo first.")
        person_bytes = await person.read()
        is_valid, validation_msg, pil_img = validate_image_bytes(person_bytes, filename=person.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=validation_msg)
        active_session_id = active_session_id or uuid.uuid4().hex
        safe_person_path = settings.OUTPUTS_DIR / f"cust_session_{active_session_id}.jpg"
        pil_img.save(safe_person_path, format="JPEG", quality=95)

    # 3. Create unique Job ID & prompt
    job_id = uuid.uuid4().hex
    prompt = build_garment_prompt(garment)

    # 4. Insert Job into DB
    job = TryonJob(
        id=job_id,
        status="queued",
        progress=10,
        person_image_path=str(safe_person_path),
        garment_id=garment.id,
        garment_image_path=str(garment_path),
        garment_name=garment.name,
        clothing_type=garment.clothing_type,
        prompt=prompt,
        provider=settings.AI_TRYON_PROVIDER
    )
    db.add(job)
    db.commit()

    # 5. Launch asynchronous background processing
    background_tasks.add_task(process_tryon_job, job_id)
    logger.info(f"Queued Try-On Job {job_id} (Session {active_session_id}) for garment: {garment.name}")

    return TryonJobCreateResponse(
        job_id=job_id,
        session_id=active_session_id,
        status="queued",
        message="Your try-on request has been received and is processing."
    )

@router.get("/jobs/{job_id}", response_model=TryonJobStatusResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Poll the status and progress of an ongoing try-on job."""
    job = db.query(TryonJob).filter(TryonJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")

    return TryonJobStatusResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        garment_id=job.garment_id,
        garment_name=job.garment_name,
        provider=job.provider,
        result_url=job.result_url,
        error_message=job.error_message,
        error_code=job.error_code,
        retry_after_seconds=job.retry_after_seconds,
        created_at=job.created_at.isoformat() if job.created_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None
    )

@router.post("/jobs/{job_id}/purge")
def purge_job_session(job_id: str, db: Session = Depends(get_db)):
    """Allows customer or store manager to explicitly delete temporary try-on data."""
    job = db.query(TryonJob).filter(TryonJob.id == job_id).first()
    if job:
        if job.person_image_path and Path(job.person_image_path).exists():
            try:
                Path(job.person_image_path).unlink()
            except Exception:
                pass
        db.delete(job)
        db.commit()

    purge_customer_session(job_id)
    return {"status": "purged", "job_id": job_id}

@router.get("/provider-health", response_model=ProviderHealthResponse)
def check_provider_health():
    """Diagnostic check of configured AI virtual try-on providers."""
    fashn_configured = bool(settings.FASHN_API_KEY)
    idm_vton_client = ai_tryon_service.get_hf_client()
    idm_vton_ready = idm_vton_client is not None

    active_provider = settings.AI_TRYON_PROVIDER
    status_msg = "Ready for live customer try-on requests."

    if active_provider in ["gemini-nano-banana", "nano-banana", "gemini"]:
        status_msg = "Google Gemini Nano Banana AI try-on engine active."
    elif active_provider == "idm-vton" and not idm_vton_ready:
        status_msg = "IDM-VTON Hugging Face Space is initializing or connecting."
    elif active_provider == "fashn" and not fashn_configured:
        status_msg = "FASHN provider selected but FASHN_API_KEY is not set."

    return ProviderHealthResponse(
        active_provider=active_provider,
        idm_vton_ready=idm_vton_ready,
        fashn_configured=fashn_configured,
        hardware_status="Cloud GPU / Serverless Acceleration Active",
        message=status_msg
    )

@router.get("/providers")
def get_available_providers():
    """List all registered AI virtual try-on providers, licensing, and capabilities."""
    from backend.providers.manager import provider_registry
    return provider_registry.list_providers()



@router.post("/stylist-consultation")
async def get_stylist_consultation(
    garment_id: int = Form(..., description="Garment ID from catalog"),
    session_id: Optional[str] = Form(None, description="Customer session ID"),
    db: Session = Depends(get_db)
):
    """
    Generates bespoke Haute Couture styling and drape consultation for the garment.
    Powered by Google Gemini intelligence with curated luxury fashion rules.
    """
    from backend.services.gemini_service import get_luxury_styling_advice_async

    garment = db.query(CatalogItem).filter(CatalogItem.id == garment_id).first()
    if not garment:
        raise HTTPException(status_code=404, detail="Garment not found.")

    advice = await get_luxury_styling_advice_async(
        garment_name=garment.name,
        category=garment.category,
        fabric=garment.fabric,
        color=garment.color
    )

    return {
        "status": "success",
        "garment_id": garment.id,
        "garment_name": garment.name,
        "advice": advice
    }


