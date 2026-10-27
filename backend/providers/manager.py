import logging
from typing import Dict, List, Optional
from backend.core.config import settings
from backend.providers.base import TryOnProvider
from backend.providers.hf_space_provider import HuggingFaceSpaceProvider
from backend.providers.gemini_provider import GeminiNanoBananaProvider
from backend.providers.fashn_provider import FashnProvider
from backend.providers.colab_provider import GoogleColabTryOnProvider

logger = logging.getLogger("provider-manager")

class ProviderRegistry:
    def __init__(self):
        self._providers: Dict[str, TryOnProvider] = {}
        self._register_default_providers()

    def _register_default_providers(self):
        # 1. Hugging Face ZeroGPU IDM-VTON
        hf_provider = HuggingFaceSpaceProvider()
        self._providers["idm-vton"] = hf_provider
        self._providers["hf-idm-vton"] = hf_provider
        self._providers["huggingface"] = hf_provider

        # 2. Google Colab GPU (IDM-VTON Dedicated T4 Tunnel)
        colab_provider = GoogleColabTryOnProvider()
        self._providers["colab"] = colab_provider
        self._providers["google-colab"] = colab_provider
        self._providers["colab-idm-vton"] = colab_provider

        # 3. Google Gemini Nano Banana
        gemini_provider = GeminiNanoBananaProvider()
        self._providers["gemini-nano-banana"] = gemini_provider
        self._providers["gemini"] = gemini_provider
        self._providers["nano-banana"] = gemini_provider

        # 4. FASHN.ai Commercial API
        fashn_provider = FashnProvider()
        self._providers["fashn"] = fashn_provider

    def get_provider(self, name: Optional[str] = None) -> TryOnProvider:
        target_name = (name or settings.AI_TRYON_PROVIDER or "idm-vton").strip().lower()
        if target_name in self._providers:
            return self._providers[target_name]
        logger.warning(f"Unknown try-on provider '{target_name}', falling back to 'idm-vton'.")
        return self._providers["idm-vton"]

    def list_providers(self) -> List[Dict]:
        seen = set()
        result = []
        for p in self._providers.values():
            if p.name not in seen:
                seen.add(p.name)
                result.append({
                    "name": p.name,
                    "display_name": p.display_name,
                    "license_type": p.license_type,
                    "commercial_use_permitted": p.commercial_use_permitted,
                    "is_configured": p.is_configured(),
                    "capabilities": p.get_capabilities()
                })
        return result

# Singleton manager instance
provider_registry = ProviderRegistry()

def get_tryon_provider(name: Optional[str] = None) -> TryOnProvider:
    return provider_registry.get_provider(name)
