from typing import Optional
from pydantic import BaseModel

class TryonJobCreateResponse(BaseModel):
    job_id: str
    session_id: Optional[str] = None
    status: str
    message: str

class SessionPhotoResponse(BaseModel):
    session_id: str
    image_url: str
    status: str
    message: str

class TryonJobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    garment_id: Optional[int] = None
    garment_name: Optional[str] = None
    provider: str
    result_url: Optional[str] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    retry_after_seconds: Optional[int] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

class ProviderHealthResponse(BaseModel):
    active_provider: str
    idm_vton_ready: bool
    fashn_configured: bool
    hardware_status: str
    message: str
