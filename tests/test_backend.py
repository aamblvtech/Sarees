import os
import uuid
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app
from backend.db.database import SessionLocal, Base, engine
from backend.services.catalog_service import init_catalog_seeds
from backend.services.ai_vton_service import validate_image_bytes, build_garment_prompt
from backend.models.catalog import CatalogItem
from backend.core.config import settings

# Ensure database tables and catalog seeds are initialized for testing
Base.metadata.create_all(bind=engine)
_db = SessionLocal()
try:
    init_catalog_seeds(_db)
finally:
    _db.close()

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "provider" in data

def test_catalog_retrieval():
    response = client.get("/api/catalog")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 10
    # Ensure both Indian and Western items exist
    departments = {item["department"] for item in items}
    assert "Indian" in departments
    assert "Western" in departments

def test_catalog_category_filtering():
    response = client.get("/api/catalog?category=sarees")
    assert response.status_code == 200
    items = response.json()
    assert all(item["category"] == "sarees" for item in items)

    response = client.get("/api/catalog?department=Western")
    assert response.status_code == 200
    western_items = response.json()
    assert len(western_items) >= 4
    assert all(item["department"] == "Western" for item in western_items)

def test_qr_code_generation():
    response = client.get("/api/qr?session_id=test_session_abc")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert len(response.content) > 100

def test_qr_info():
    response = client.get("/api/qr/info?session_id=kiosk_sess_99")
    assert response.status_code == 200
    data = response.json()
    assert "mobile_upload_url" in data
    assert "kiosk_sess_99" in data["mobile_upload_url"]
    assert "mobile-upload" in data["mobile_upload_url"]
    assert "lan_ip" in data

def test_mobile_upload_page_serving():
    resp1 = client.get("/mobile-upload?session=test_sess_1")
    assert resp1.status_code == 200
    assert "text/html" in resp1.headers["content-type"]
    assert "AURA ATELIER" in resp1.text

    resp2 = client.get("/upload")
    assert resp2.status_code == 200
    assert "text/html" in resp2.headers["content-type"]

def test_qr_mobile_upload_sync_workflow():
    session_id = f"test_sync_{uuid.uuid4().hex[:8]}"
    sample_person = settings.IMAGES_DIR / "customer_jeans_model.jpg"
    if not sample_person.exists():
        sample_person = settings.IMAGES_DIR / "drape_model1_saree1.jpg"

    with open(sample_person, "rb") as f:
        file_bytes = f.read()

    # 1. Device A checks initial status -> waiting
    init_status = client.get(f"/api/tryon/session-status?session_id={session_id}")
    assert init_status.status_code == 200
    assert init_status.json()["status"] == "waiting"

    # 2. Device B (Phone) uploads photo with session_id
    phone_upload = client.post(
        "/api/tryon/session-photo",
        files={"person": ("phone_cam.jpg", file_bytes, "image/jpeg")},
        data={"session_id": session_id, "user_consent": "true"}
    )
    assert phone_upload.status_code == 200
    upload_data = phone_upload.json()
    assert upload_data["status"] == "ready"
    assert upload_data["session_id"] == session_id
    assert "image_url" in upload_data

    # 3. Device A polls session status -> immediately receives photo
    synced_status = client.get(f"/api/tryon/session-status?session_id={session_id}")
    assert synced_status.status_code == 200
    status_data = synced_status.json()
    assert status_data["status"] == "ready"
    assert status_data["image_url"] == upload_data["image_url"]

    # 4. Device A automatically creates try-on job using the synced session photo
    tryon_res = client.post("/api/tryon/jobs", data={"session_id": session_id, "garment_id": 1})
    assert tryon_res.status_code == 200
    assert tryon_res.json()["session_id"] == session_id


def test_image_validation_rejection():
    # Empty bytes
    valid, msg, _ = validate_image_bytes(b"", "empty.jpg")
    assert not valid

    # Tiny corrupt bytes
    valid, msg, _ = validate_image_bytes(b"not an image", "corrupt.jpg")
    assert not valid

def test_admin_authorization():
    # Without token
    response = client.get("/api/admin/catalog")
    assert response.status_code == 401

    # Login
    login_resp = client.post("/api/admin/login", json={
        "username": settings.ADMIN_USERNAME,
        "password": settings.ADMIN_PASSWORD
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Authorized request
    cat_resp = client.get("/api/admin/catalog", headers={"Authorization": f"Bearer {token}"})
    assert cat_resp.status_code == 200
    assert len(cat_resp.json()) >= 10

def test_tryon_job_creation_and_validation():
    # Customer portrait path
    sample_person = settings.IMAGES_DIR / "customer_jeans_model.jpg"
    if not sample_person.exists():
        # Fallback to drape_model1_saree1.jpg
        sample_person = settings.IMAGES_DIR / "drape_model1_saree1.jpg"

    with open(sample_person, "rb") as f:
        file_bytes = f.read()

    # Valid submission
    resp = client.post(
        "/api/tryon/jobs",
        files={"person": ("customer.jpg", file_bytes, "image/jpeg")},
        data={"garment_id": 1, "user_consent": True}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "job_id" in data
    assert data["status"] == "queued"

    job_id = data["job_id"]
    status_resp = client.get(f"/api/tryon/jobs/{job_id}")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["job_id"] == job_id
    assert status_data["status"] in ["queued", "processing", "completed", "failed"]

    # Purge
    purge_resp = client.post(f"/api/tryon/jobs/{job_id}/purge")
    assert purge_resp.status_code == 200

def test_session_photo_and_automatic_tryon():
    # 1. Initialize customer session with portrait once
    res = client.post("/api/tryon/session-photo", data={"use_demo": "true"})
    assert res.status_code == 200
    data = res.json()
    assert "session_id" in data
    assert "image_url" in data
    session_id = data["session_id"]

    # 2. Automatic try-on for garment 1 using session_id without re-uploading photo
    res2 = client.post("/api/tryon/jobs", data={"session_id": session_id, "garment_id": 2})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["job_id"] is not None
    assert data2["status"] == "queued"
    assert data2["session_id"] == session_id

    # 3. Automatic try-on for garment 2 (Western dress) using same session_id
    res3 = client.post("/api/tryon/jobs", data={"session_id": session_id, "garment_id": 7})
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["job_id"] is not None
    assert data3["session_id"] == session_id

def test_admin_config_update():
    login_resp = client.post("/api/admin/login", json={
        "username": settings.ADMIN_USERNAME,
        "password": settings.ADMIN_PASSWORD
    })
    token = login_resp.json()["access_token"]

    cfg_resp = client.post(
        "/api/admin/config",
        headers={"Authorization": f"Bearer {token}"},
        json={"provider": "colab", "colab_vton_url": "https://test-colab.gradio.live", "hf_token": "hf_test_token_sample"}
    )
    assert cfg_resp.status_code == 200
    data = cfg_resp.json()
    assert data["status"] == "success"
    assert data["provider"] == "colab"
    assert data["colab_configured"] is True
    assert data["hf_configured"] is True

    # Reset back to idm-vton
    client.post(
        "/api/admin/config",
        headers={"Authorization": f"Bearer {token}"},
        json={"provider": "idm-vton", "colab_vton_url": ""}
    )

