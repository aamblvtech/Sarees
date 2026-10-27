import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any

class TryOnErrorCode(str, Enum):
    QUOTA_EXHAUSTED = "QUOTA_EXHAUSTED"
    PROVIDER_BUSY = "PROVIDER_BUSY"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
    INVALID_IMAGE = "INVALID_IMAGE"
    GENERATION_TIMEOUT = "GENERATION_TIMEOUT"
    NO_IMAGE_RETURNED = "NO_IMAGE_RETURNED"
    UNSUPPORTED_GARMENT = "UNSUPPORTED_GARMENT"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

@dataclass
class TryOnResult:
    success: bool
    image_path: Optional[Path] = None
    image_url: Optional[str] = None
    error_code: Optional[TryOnErrorCode] = None
    error_message: Optional[str] = None
    retry_after_seconds: Optional[int] = None # Only populated if provider supplies reliable reset time
    provider_name: str = ""
    model_name: str = ""
    duration_seconds: float = 0.0

class TryOnProvider(ABC):
    """
    Abstract Base Class for AI Virtual Try-On Providers.
    Ensures a standardized interface across cloud GPU Gradio Spaces,
    Google Gemini multimodal image generation, and commercial APIs.
    """
    @property
    @abstractmethod
    def name(self) -> str:
        """Machine identifier of the provider (e.g. 'hf-idm-vton', 'gemini-nano-banana')."""
        pass

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable provider name."""
        pass

    @property
    @abstractmethod
    def license_type(self) -> str:
        """Open source or commercial license (e.g. 'CC BY-NC-SA 4.0', 'Commercial Proprietary')."""
        pass

    @property
    @abstractmethod
    def commercial_use_permitted(self) -> bool:
        """Whether the model/service license permits commercial store operation."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if required API credentials/tokens or endpoints are configured."""
        pass

    @abstractmethod
    def get_capabilities(self) -> Dict[str, Any]:
        """Return supported garment categories, maximum resolutions, and conditioning options."""
        pass

    @abstractmethod
    def generate_tryon(
        self,
        customer_image_path: Path,
        garment_image_path: Path,
        garment_info: Dict[str, Any],
        job_id: str,
        session_id: Optional[str] = None
    ) -> TryOnResult:
        """
        Execute virtual try-on inference.
        Returns a TryOnResult with either the saved output image or a structured error code.
        MUST NEVER return or substitute a static preset, stock photo, or fake composite.
        """
        pass
