"""
SAJEE Virtual Try-On - AI Inference Provider Base Interface
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class GarmentAnnotations(BaseModel):
    body_bbox: Optional[Dict[str, Any]] = None
    pallu_bbox: Optional[Dict[str, Any]] = None
    main_border_bbox: Optional[Dict[str, Any]] = None
    secondary_border_bbox: Optional[Dict[str, Any]] = None
    motifs_bbox: Optional[Dict[str, Any]] = None
    blouse_piece_bbox: Optional[Dict[str, Any]] = None

class TryOnRequest(BaseModel):
    job_id: str
    person_image_path: str
    garment_image_path: str
    garment_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    annotations: Optional[GarmentAnnotations] = None
    garment_type: str = "saree"
    drape_style: str = "nivi"  # nivi, bengali, gujarati, nauvari
    preferred_provider: Optional[str] = None

class TryOnResult(BaseModel):
    job_id: str
    status: str  # "completed" | "failed" | "model_unavailable"
    result_image_url: Optional[str] = None
    result_image_base64: Optional[str] = None
    is_simulation: bool
    provider_name: str
    processing_time_ms: int
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class BaseTryOnProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if hardware, model checkpoints, and dependencies are available."""
        pass

    @abstractmethod
    def get_health_status(self) -> Dict[str, Any]:
        """Return diagnostic health info including CUDA availability and memory."""
        pass

    @abstractmethod
    def process_tryon(self, request: TryOnRequest) -> TryOnResult:
        """Run inference or simulation. Returns TryOnResult."""
        pass
