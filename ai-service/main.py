"""
SAJEE Virtual Try-On - FastAPI Microservice
Provides dedicated inference & simulation endpoints for Indian Saree Virtual Try-On.
"""
import os
from typing import Optional
import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from adapters import (
    MockTryOnProvider,
    IDMVTONProvider,
    ReplicateTryOnProvider,
    TryOnRequest,
    TryOnResult
)

app = FastAPI(
    title="SAJEE AI Saree Virtual Try-On Service",
    description="Dedicated microservice for garment draping inference and UI simulation.",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Provider initialization
ACTIVE_PROVIDER_NAME = os.getenv("SAJEE_AI_PROVIDER", "mock").lower()
mock_provider = MockTryOnProvider()
idm_vton_provider = IDMVTONProvider()
replicate_provider = ReplicateTryOnProvider()

def get_provider(preferred: str = None):
    chosen = (preferred or ACTIVE_PROVIDER_NAME).lower()
    if chosen in ["replicate", "replicate_idm_vton", "cloud"]:
        return replicate_provider
    elif chosen == "idm_vton":
        return idm_vton_provider
    return mock_provider

@app.get("/")
def root():
    return {
        "service": "SAJEE AI Saree Virtual Try-On Service",
        "tagline": "Drape Your Elegance",
        "active_default_provider": ACTIVE_PROVIDER_NAME,
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    mock_health = mock_provider.get_health_status()
    idm_health = idm_vton_provider.get_health_status()
    replicate_health = replicate_provider.get_health_status()
    return {
        "status": "healthy",
        "service": "sajee-ai-service",
        "default_provider": ACTIVE_PROVIDER_NAME,
        "providers": {
            "mock": mock_health,
            "idm_vton_local": idm_health,
            "replicate_idm_vton_cloud": replicate_health
        }
    }

@app.get("/api/health/ai")
def api_health():
    """Conforms to the backend proxy health route specification."""
    return health_check()

@app.get("/status")
def status_endpoint():
    active = get_provider()
    return {
        "active_provider": active.provider_name,
        "is_available": active.is_available(),
        "health": active.get_health_status()
    }

@app.post("/inference/tryon", response_model=TryOnResult)
def run_tryon(request: TryOnRequest, provider: Optional[str] = None):
    chosen = provider or request.preferred_provider
    active_provider = get_provider(chosen)
    result = active_provider.process_tryon(request)
    return result

@app.post("/inference/simulate", response_model=TryOnResult)
def run_simulate(request: TryOnRequest):
    """Directly triggers the simulation provider for deterministic development/testing."""
    return mock_provider.process_tryon(request)

@app.get("/api/hardware-status")
def hardware_status():
    return {
        "status": "active",
        "cuda_available": idm_vton_provider.is_available(),
        "active_provider": get_provider().provider_name,
        "providers": {
            "replicate": replicate_provider.is_available(),
            "mock": True
        }
    }

if __name__ == "__main__":
    port = int(os.getenv("AI_SERVICE_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
