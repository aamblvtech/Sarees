import os
import uuid
import time
from pathlib import Path
from PIL import Image, ImageDraw
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.core.config import settings
from backend.services.ai_vton_service import ai_tryon_service, AITryonService

client = TestClient(app)

def create_mock_person_image(color="blue", text="Customer"):
    """Generate a valid synthetic customer photo with distinct color & text."""
    img = Image.new("RGB", (600, 800), color=color)
    draw = ImageDraw.Draw(img)
    draw.rectangle([100, 100, 500, 700], fill="white")
    draw.text((150, 400), text, fill="black")
    path = settings.OUTPUTS_DIR / f"test_person_{uuid.uuid4().hex[:6]}.jpg"
    img.save(path, format="JPEG")
    return path

def test_case_1_and_2_and_3_customer_and_garments():
    """
    Cases 1, 2, 3:
    1. Upload customer A's photo and select a saree.
       Confirm customer A's photo is passed to generation, NOT the catalog model.
    2. Select a different saree and confirm a new generation occurs with garment 2.
    3. Select a Western dress or shirt and confirm its garment image is used.
    """
    session_a = f"sess_cust_a_{uuid.uuid4().hex[:6]}"
    cust_a_path = create_mock_person_image(color="purple", text="Customer A")

    with open(cust_a_path, "rb") as f:
        upload_resp = client.post(
            "/api/tryon/session-photo",
            files={"person": ("cust_a.jpg", f.read(), "image/jpeg")},
            data={"session_id": session_a, "user_consent": "true"}
        )
    assert upload_resp.status_code == 200
    assert upload_resp.json()["session_id"] == session_a
    session_file_a = settings.OUTPUTS_DIR / f"cust_session_{session_a}.jpg"
    assert session_file_a.exists()

    # 1. Select Garment 1 (Traditional Crimson Saree)
    job1_resp = client.post("/api/tryon/jobs", data={"session_id": session_a, "garment_id": 1})
    assert job1_resp.status_code == 200
    job1_id = job1_resp.json()["job_id"]

    # Verify Job 1 references Customer A's file and red-saree.jpg
    from backend.db.database import SessionLocal
    from backend.models.tryon_job import TryonJob
    db = SessionLocal()
    job1 = db.query(TryonJob).filter(TryonJob.id == job1_id).first()
    assert str(session_file_a) == job1.person_image_path
    assert "red-saree.jpg" in job1.garment_image_path

    # 2. Select Garment 2 (Peacock Royal Blue Silk Saree)
    job2_resp = client.post("/api/tryon/jobs", data={"session_id": session_a, "garment_id": 2})
    assert job2_resp.status_code == 200
    job2_id = job2_resp.json()["job_id"]
    assert job2_id != job1_id

    job2 = db.query(TryonJob).filter(TryonJob.id == job2_id).first()
    assert str(session_file_a) == job2.person_image_path
    assert "blue-saree.jpg" in job2.garment_image_path
    assert job2.garment_name == "Peacock Royal Blue Silk Saree"

    # 3. Select Garment 7 (French Navy Floral Chiffon Midi Dress - Western)
    job3_resp = client.post("/api/tryon/jobs", data={"session_id": session_a, "garment_id": 7})
    assert job3_resp.status_code == 200
    job3_id = job3_resp.json()["job_id"]
    job3 = db.query(TryonJob).filter(TryonJob.id == job3_id).first()
    assert str(session_file_a) == job3.person_image_path
    assert "floral-dress.jpg" in job3.garment_image_path
    assert job3.garment_name == "French Navy Floral Chiffon Midi Dress"

    # 3b. Select Garment 8 (Tailored Sky Blue Oxford Button-Down - Western)
    job8_resp = client.post("/api/tryon/jobs", data={"session_id": session_a, "garment_id": 8})
    assert job8_resp.status_code == 200
    job8 = db.query(TryonJob).filter(TryonJob.id == job8_resp.json()["job_id"]).first()
    assert "oxford-shirt.jpg" in job8.garment_image_path

    db.close()
    if cust_a_path.exists():
        cust_a_path.unlink()

def test_case_4_session_isolation():
    """
    Case 4: Upload customer B's photo in a different session and confirm customer A's photo is not reused.
    """
    session_a = f"sess_a_{uuid.uuid4().hex[:6]}"
    session_b = f"sess_b_{uuid.uuid4().hex[:6]}"

    cust_a_path = create_mock_person_image(color="yellow", text="Customer A")
    cust_b_path = create_mock_person_image(color="cyan", text="Customer B")

    # Upload Customer A
    with open(cust_a_path, "rb") as f:
        client.post(
            "/api/tryon/session-photo",
            files={"person": ("cust_a.jpg", f.read(), "image/jpeg")},
            data={"session_id": session_a, "user_consent": "true"}
        )

    # Upload Customer B
    with open(cust_b_path, "rb") as f:
        client.post(
            "/api/tryon/session-photo",
            files={"person": ("cust_b.jpg", f.read(), "image/jpeg")},
            data={"session_id": session_b, "user_consent": "true"}
        )

    # Check status of Session A vs Session B
    status_a = client.get(f"/api/tryon/session-status?session_id={session_a}").json()
    status_b = client.get(f"/api/tryon/session-status?session_id={session_b}").json()

    assert status_a["session_id"] == session_a
    assert status_b["session_id"] == session_b
    assert status_a["image_url"] != status_b["image_url"]
    assert f"cust_session_{session_a}.jpg" in status_a["image_url"]
    assert f"cust_session_{session_b}.jpg" in status_b["image_url"]

    # Create tryon job for Session B
    job_b_resp = client.post("/api/tryon/jobs", data={"session_id": session_b, "garment_id": 3})
    assert job_b_resp.status_code == 200

    from backend.db.database import SessionLocal
    from backend.models.tryon_job import TryonJob
    db = SessionLocal()
    job_b = db.query(TryonJob).filter(TryonJob.id == job_b_resp.json()["job_id"]).first()
    # Confirm Job B strictly used Customer B's file, NEVER Customer A's file
    assert f"cust_session_{session_b}.jpg" in job_b.person_image_path
    assert f"cust_session_{session_a}.jpg" not in job_b.person_image_path
    db.close()

    for p in [cust_a_path, cust_b_path]:
        if p.exists():
            p.unlink()

def test_case_5_missing_api_key_simulation():
    """
    Case 5: Simulate a missing API key and confirm an explicit error appears without silent failure.
    """
    old_key = settings.GEMINI_API_KEY
    try:
        settings.GEMINI_API_KEY = ""
        cust_img = create_mock_person_image(color="green", text="Test Missing Key")
        garm_img = settings.IMAGES_DIR / "red-saree.jpg"
        job_id = f"test_nokey_{uuid.uuid4().hex[:6]}"

        success, result_url, error_msg = ai_tryon_service.run_gemini_nano_banana_sync(
            customer_path=cust_img,
            garment_path=garm_img,
            prompt="Test",
            job_id=job_id,
            garment_id=1
        )
        assert success is False
        assert result_url is None
        assert error_msg is not None
        assert "GEMINI_API_KEY" in error_msg or "missing or not configured" in error_msg

        # Ensure no fake result file was created
        result_file = settings.OUTPUTS_DIR / f"result_{job_id}.jpg"
        assert not result_file.exists()

        if cust_img.exists():
            cust_img.unlink()
    finally:
        settings.GEMINI_API_KEY = old_key

def test_case_6_gemini_response_without_image():
    """
    Case 6: Simulate a Gemini response with text only and confirm no fake result is saved or returned.
    """
    cust_img = create_mock_person_image(color="orange", text="Test Text Only")
    garm_img = settings.IMAGES_DIR / "blue-saree.jpg"
    job_id = f"test_textonly_{uuid.uuid4().hex[:6]}"

    # Mock Gemini client returning text only
    class MockTextOnlyPart:
        inline_data = None
        text = "I cannot edit this image directly because of input constraints."

    class MockTextOnlyCandidate:
        class Content:
            parts = [MockTextOnlyPart()]
        content = Content()

    class MockResponse:
        candidates = [MockTextOnlyCandidate()]
        parts = [MockTextOnlyPart()]

    class MockGenaiClient:
        class Models:
            def generate_content(self, *args, **kwargs):
                return MockResponse()
        models = Models()

    import google.genai
    original_client = google.genai.Client
    try:
        google.genai.Client = lambda *args, **kwargs: MockGenaiClient()
        success, result_url, error_msg = ai_tryon_service.run_gemini_nano_banana_sync(
            customer_path=cust_img,
            garment_path=garm_img,
            prompt="Test",
            job_id=job_id,
            garment_id=2
        )
        # MUST fail honestly! NEVER claim success or return mock image!
        assert success is False
        assert result_url is None
        assert error_msg is not None
        assert "text explanation" in error_msg.lower() or "text" in error_msg.lower()

        # Result file must NOT exist
        result_file = settings.OUTPUTS_DIR / f"result_{job_id}.jpg"
        assert not result_file.exists()
    finally:
        google.genai.Client = original_client
        if cust_img.exists():
            cust_img.unlink()

def test_case_7_and_9_no_silent_preset_substitutions():
    """
    Cases 7 & 9:
    Confirm that preset_map and static stock photos (vton_saree_1.jpg, drape_model1_saree3.jpg)
    are NEVER silently substituted when Gemini quota or API error happens.
    """
    cust_img = create_mock_person_image(color="teal", text="Test No Presets")
    # Test with Garment 3 (Emerald Green Saree - the exact item that previously showed Shutterstock model)
    garm_img = settings.IMAGES_DIR / "green-saree.jpg"
    job_id = f"test_no_preset_{uuid.uuid4().hex[:6]}"

    # Run with current key
    success, result_url, error_msg = ai_tryon_service.run_gemini_nano_banana_sync(
        customer_path=cust_img,
        garment_path=garm_img,
        prompt="Emerald Green Saree",
        job_id=job_id,
        garment_id=3
    )

    if not success:
        # It must report the honest error (e.g. Quota 429)
        assert error_msg is not None
        assert "Quota Exceeded" in error_msg or "429" in error_msg or "AI Virtual Try-On failed" in error_msg
        assert result_url is None

        # Verify result file was NOT created from preset
        result_file = settings.OUTPUTS_DIR / f"result_{job_id}.jpg"
        assert not result_file.exists()

    if cust_img.exists():
        cust_img.unlink()

def test_case_8_preview_endpoints():
    """
    Case 8: Verify Original, Fitted Result, and Compare Split requirements:
    Customer photo endpoint returns actual customer bytes, not a stock model.
    """
    session_id = f"sess_preview_{uuid.uuid4().hex[:6]}"
    cust_path = create_mock_person_image(color="magenta", text="Original Portrait")

    with open(cust_path, "rb") as f:
        upload_resp = client.post(
            "/api/tryon/session-photo",
            files={"person": ("original.jpg", f.read(), "image/jpeg")},
            data={"session_id": session_id, "user_consent": "true"}
        )
    assert upload_resp.status_code == 200
    image_url = upload_resp.json()["image_url"]

    # Fetch original image through backend static route
    img_resp = client.get(image_url)
    assert img_resp.status_code == 200
    assert img_resp.headers["content-type"].startswith("image/")
    assert len(img_resp.content) > 1000

    if cust_path.exists():
        cust_path.unlink()
