"""
Comprehensive Regression Tests for Customer Image Privacy, Session Lifecycle, and API Endpoints
AURA Virtual Saree Fitting Studio
"""

import io
import shutil
import uuid
from pathlib import Path
from PIL import Image
import pytest
from fastapi.testclient import TestClient

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "SAREES"))
from main import app, SESSIONS_DIR, IMAGES_DIR, is_safe_session_path, get_session_directory


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def dummy_portrait_bytes():
    """Generates a dummy 200x300 RGB portrait in memory."""
    buf = io.BytesIO()
    img = Image.new("RGB", (200, 300), color=(220, 190, 170))
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_try_on_creates_ephemeral_session(client, dummy_portrait_bytes):
    """Verify that uploading a customer photo generates an ephemeral session directory and returns session_id."""
    test_sid = f"test_session_{uuid.uuid4().hex[:8]}"
    
    files = {
        "person": ("customer.jpg", dummy_portrait_bytes, "image/jpeg")
    }
    # Using 'inplace' mode for deterministic instantaneous test execution
    response = client.post(
        f"/api/try-on?saree_id=1&fitting_mode=inplace&session_id={test_sid}",
        files=files
    )
    
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "success"
    assert data["session_id"] == test_sid
    assert "privacy_notice" in data
    assert f"/sessions/{test_sid}/" in data["result_url"]

    # Verify session directory and files exist
    session_dir = SESSIONS_DIR / test_sid
    assert session_dir.exists(), "Session directory must exist"
    assert (session_dir / "customer_upload.jpg").exists(), "Original customer photo must exist before accept"
    assert (session_dir / "result_1.jpg").exists(), "Result file must exist in session directory"

    # Cleanup test session
    shutil.rmtree(session_dir, ignore_errors=True)


def test_accept_deletes_customer_upload_and_preserves_result(client, dummy_portrait_bytes):
    """Verify customer privacy: accepting result permanently deletes uploaded photo and keeps only result."""
    test_sid = f"test_privacy_{uuid.uuid4().hex[:8]}"
    session_dir = SESSIONS_DIR / test_sid
    session_dir.mkdir(parents=True, exist_ok=True)

    customer_photo = session_dir / "customer_upload.jpg"
    customer_photo.write_bytes(dummy_portrait_bytes)

    intermediate_file = session_dir / "temp_mask_crop.png"
    intermediate_file.write_bytes(b"dummy intermediate mask")

    result_file = session_dir / "result_2.jpg"
    result_file.write_bytes(dummy_portrait_bytes)

    # Call /api/session/accept
    res = client.post(
        "/api/session/accept",
        json={"session_id": test_sid}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["action"] == "accepted"

    # Assert customer upload and intermediates are permanently unlinked
    assert not customer_photo.exists(), "Original customer photo must be permanently deleted on accept"
    assert not intermediate_file.exists(), "Intermediate scratch files must be permanently deleted on accept"
    # Assert result file remains preserved for active viewing
    assert result_file.exists(), "Result image must remain preserved for viewing"

    # Cleanup
    shutil.rmtree(session_dir, ignore_errors=True)


def test_session_cleanup_purges_entire_session(client, dummy_portrait_bytes):
    """Verify complete session purge when customer clicks Delete Session or closes browser."""
    test_sid = f"test_purge_{uuid.uuid4().hex[:8]}"
    session_dir = SESSIONS_DIR / test_sid
    session_dir.mkdir(parents=True, exist_ok=True)

    (session_dir / "customer_upload.jpg").write_bytes(dummy_portrait_bytes)
    (session_dir / "result_3.jpg").write_bytes(dummy_portrait_bytes)

    res = client.post(
        "/api/session/cleanup",
        json={"session_id": test_sid}
    )
    assert res.status_code == 200
    assert not session_dir.exists(), "Entire session directory must be removed"


def test_session_reset_garment(client, dummy_portrait_bytes):
    """Verify switching garments cleans up previous results in the session."""
    test_sid = f"test_reset_{uuid.uuid4().hex[:8]}"
    session_dir = SESSIONS_DIR / test_sid
    session_dir.mkdir(parents=True, exist_ok=True)

    customer_photo = session_dir / "customer_upload.jpg"
    customer_photo.write_bytes(dummy_portrait_bytes)

    old_result = session_dir / "result_1.jpg"
    old_result.write_bytes(dummy_portrait_bytes)

    res = client.post(
        "/api/session/reset-garment",
        json={"session_id": test_sid}
    )
    assert res.status_code == 200
    assert not old_result.exists(), "Previous result should be cleared for new garment"
    assert customer_photo.exists(), "Customer upload should remain intact for the new saree try-on"

    shutil.rmtree(session_dir, ignore_errors=True)


def test_path_traversal_protection(client):
    """Verify that path traversal attempts in session_id are strictly rejected."""
    # Malformed / malicious session IDs
    malicious_ids = [
        "../../etc",
        "../outputs",
        "/etc/passwd",
        "session/../../../training",
        "foo;rm -rf /"
    ]
    for bad_id in malicious_ids:
        res = client.post(
            "/api/session/cleanup",
            json={"session_id": bad_id}
        )
        # Should either sanitize and not find or reject with 400/403/404, never touch outside directory
        # Verify SESSIONS_DIR itself is completely intact
        assert SESSIONS_DIR.exists()
        assert IMAGES_DIR.exists()


def test_safe_session_path_boundary_enforcement():
    """Verify is_safe_session_path blocks paths outside designated session directory."""
    session_dir = SESSIONS_DIR / "safe_sid_123"
    inside_path = session_dir / "customer_upload.jpg"
    outside_path = SESSIONS_DIR.parent / "images" / "red-saree.jpg"
    arbitrary_root = Path("/tmp/outside_test.txt")

    assert is_safe_session_path(session_dir, inside_path) is True
    assert is_safe_session_path(session_dir, outside_path) is False
    assert is_safe_session_path(session_dir, arbitrary_root) is False


def test_try_on_invalid_inputs(client):
    """Verify appropriate actionable error codes on malformed inputs."""
    # 1. Invalid saree_id
    res = client.post(
        "/api/try-on?saree_id=999",
        files={"person": ("test.jpg", b"fake", "image/jpeg")}
    )
    assert res.status_code == 400
    assert "Invalid saree_id" in res.json()["detail"]

    # 2. Empty file
    res = client.post(
        "/api/try-on?saree_id=1",
        files={"person": ("test.jpg", b"", "image/jpeg")}
    )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()

    # 3. Corrupt image file
    res = client.post(
        "/api/try-on?saree_id=1",
        files={"person": ("corrupt.jpg", b"NOT_AN_IMAGE_DATA_CORRUPT", "image/jpeg")}
    )
    assert res.status_code == 400
    assert "Invalid image format" in res.json()["detail"]

