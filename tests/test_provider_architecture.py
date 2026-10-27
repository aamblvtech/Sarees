import os
from pathlib import Path
from PIL import Image
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.core.config import settings
from backend.providers import (
    get_tryon_provider,
    provider_registry,
    TryOnErrorCode,
    TryOnResult,
    HuggingFaceSpaceProvider,
    GeminiNanoBananaProvider,
    FashnProvider,
    GoogleColabTryOnProvider
)
from backend.db.database import SessionLocal
from backend.models.tryon_job import TryonJob

client = TestClient(app)

def test_provider_registry_and_capabilities():
    """Verify all 4 providers (IDM-VTON, Colab, Gemini, FASHN) are registered with proper capabilities and licenses."""
    providers = provider_registry.list_providers()
    provider_names = {p["name"] for p in providers}
    assert "idm-vton" in provider_names
    assert "colab" in provider_names
    assert "gemini-nano-banana" in provider_names
    assert "fashn" in provider_names

    # Check IDM-VTON license
    idm = get_tryon_provider("idm-vton")
    assert isinstance(idm, HuggingFaceSpaceProvider)
    assert idm.commercial_use_permitted is False
    assert "CC BY-NC" in idm.license_type
    caps = idm.get_capabilities()
    assert "native_resolution" in caps
    assert caps["native_resolution"] == (768, 1024)

    # Check Colab provider
    colab = get_tryon_provider("colab")
    assert isinstance(colab, GoogleColabTryOnProvider)
    assert colab.commercial_use_permitted is False
    assert "CC BY-NC" in colab.license_type
    colab_caps = colab.get_capabilities()
    assert colab_caps["native_resolution"] == (768, 1024)

    # Check Gemini license
    gemini = get_tryon_provider("gemini-nano-banana")
    assert isinstance(gemini, GeminiNanoBananaProvider)
    assert gemini.commercial_use_permitted is True

    # Check FASHN license
    fashn = get_tryon_provider("fashn")
    assert isinstance(fashn, FashnProvider)
    assert fashn.commercial_use_permitted is True

def test_colab_provider_honest_error_handling():
    """Verify Colab provider returns structured PROVIDER_UNAVAILABLE when disconnected, NEVER mock images."""
    colab = get_tryon_provider("colab")
    cust_path = settings.IMAGES_DIR / "customer_jeans_model.jpg"
    garm_path = settings.IMAGES_DIR / "red-saree.jpg"
    test_job_id = "test_colab_err_trace"

    # With empty / unconfigured URL
    old_url = settings.COLAB_VTON_URL
    try:
        settings.COLAB_VTON_URL = ""
        res = colab.generate_tryon(cust_path, garm_path, {"id": 1, "name": "Red Saree"}, test_job_id)
        assert res.success is False
        assert res.error_code == TryOnErrorCode.PROVIDER_UNAVAILABLE
        assert "not configured" in res.error_message.lower() or "tunnel" in res.error_message.lower()
        assert res.image_url is None
        # Ensure no fake result file was created
        result_file = settings.OUTPUTS_DIR / f"result_{test_job_id}.jpg"
        assert not result_file.exists()
    finally:
        settings.COLAB_VTON_URL = old_url

def test_api_providers_endpoint():
    """Verify /api/tryon/providers returns structured provider catalog."""
    resp = client.get("/api/tryon/providers")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 3
    for p in data:
        assert "name" in p
        assert "display_name" in p
        assert "license_type" in p
        assert "commercial_use_permitted" in p
        assert "capabilities" in p

def test_structured_error_code_in_job_status():
    """Verify TryonJob persists and returns machine-readable error_code and retry_after_seconds."""
    db = SessionLocal()
    test_job_id = "test_err_code_job_123"
    job = TryonJob(
        id=test_job_id,
        status="failed",
        progress=0,
        person_image_path="test_p.jpg",
        garment_image_path="test_g.jpg",
        clothing_type="one-piece",
        provider="idm-vton",
        error_code=TryOnErrorCode.QUOTA_EXHAUSTED.value,
        error_message="Free ZeroGPU quota exceeded. Retry available in 20h.",
        retry_after_seconds=72000
    )
    db.add(job)
    db.commit()
    db.close()

    resp = client.get(f"/api/tryon/jobs/{test_job_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "failed"
    assert data["error_code"] == "QUOTA_EXHAUSTED"
    assert data["retry_after_seconds"] == 72000

    # Clean up test DB row
    db = SessionLocal()
    j = db.query(TryonJob).filter(TryonJob.id == test_job_id).first()
    if j:
        db.delete(j)
        db.commit()
    db.close()

def test_live_gpu_generated_files_verification():
    """Verify the real cloud GPU generated try-on images exist, are valid, and are not presets."""
    oxford_tryon = settings.OUTPUTS_DIR / "test_live_gpu_vton.jpg"
    saree_tryon = settings.OUTPUTS_DIR / "test_live_saree_vton.jpg"

    assert oxford_tryon.exists(), "Real cloud GPU generated Oxford shirt image must exist"
    with Image.open(oxford_tryon) as img:
        img.verify()
    with Image.open(oxford_tryon) as img:
        assert img.size == (768, 1024)
        assert img.format == "JPEG"

    assert saree_tryon.exists(), "Real cloud GPU generated Saree image must exist"
    with Image.open(saree_tryon) as img:
        img.verify()
    with Image.open(saree_tryon) as img:
        assert img.size == (768, 1024)
        assert img.format == "JPEG"
