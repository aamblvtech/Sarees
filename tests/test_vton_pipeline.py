import os
import sys
import pytest
import numpy as np
import cv2
from pathlib import Path

# Add SAREES directory to sys.path
sarees_dir = Path(__file__).resolve().parent.parent / "SAREES"
if str(sarees_dir) not in sys.path:
    sys.path.insert(0, str(sarees_dir))

from main import (
    get_segmenter,
    get_pose_detector,
    generate_saree_inpainting_mask,
    in_place_saree_clothing_swap,
    get_hardware_status,
    SAREES
)

@pytest.fixture
def customer_image_path():
    p = sarees_dir / "images" / "customer_jeans_model.jpg"
    assert p.exists(), f"Customer image not found: {p}"
    return str(p)

def test_customer_asset_existence_and_dimensions(customer_image_path):
    img = cv2.imread(customer_image_path)
    assert img is not None, "Failed to read customer portrait."
    assert img.shape == (1440, 960, 3), f"Unexpected customer dimensions: {img.shape}"
    assert img.dtype == np.uint8, f"Unexpected dtype: {img.dtype}"

def test_catalog_assets_integrity():
    for sid in range(1, 6):
        item = SAREES[sid]
        saree_path = sarees_dir / "images" / item["filename"]
        assert saree_path.exists(), f"Missing catalog image: {saree_path}"
        simg = cv2.imread(str(saree_path))
        assert simg is not None, f"Could not read saree image: {saree_path}"
        assert len(simg.shape) == 3 and simg.shape[2] == 3

def test_mediapipe_models_initialization():
    seg = get_segmenter()
    assert seg is not None, "MediaPipe ImageSegmenter failed to initialize."
    pose = get_pose_detector()
    assert pose is not None, "MediaPipe PoseLandmarker failed to initialize."

def test_saree_inpainting_mask_validity(customer_image_path):
    mask = generate_saree_inpainting_mask(customer_image_path, dilation_px=8)
    assert mask is not None
    assert mask.shape == (1440, 960), f"Mask shape mismatch: {mask.shape}"
    assert mask.dtype == np.uint8, f"Mask dtype mismatch: {mask.dtype}"
    assert set(np.unique(mask)).issubset({0, 255}), "Mask must be strictly binary (0 and 255)."

    mask_area = np.sum(mask > 0)
    assert 50000 < mask_area < 500000, f"Plausible mask area check failed: {mask_area} pixels"

    # Verify head and chin area are 100% protected (y < 250 in center)
    head_region = mask[:250, 400:560]
    assert np.sum(head_region > 0) == 0, "Head or face region accidentally included in mask."

    # Verify feet level protection (sneakers intact below ankle)
    feet_region = mask[1380:1440, 300:650]
    assert np.sum(feet_region > 0) == 0, "Shoes or ground plane accidentally included in mask."

def test_jeans_replacement_and_shoes_preservation(customer_image_path):
    saree_path = str(sarees_dir / "images" / "red-saree.jpg")
    out_path = str(sarees_dir / "outputs" / "test_pytest_red.jpg")

    success = in_place_saree_clothing_swap(customer_image_path, saree_path, out_path)
    assert success is True, "in_place_saree_clothing_swap failed."
    assert os.path.exists(out_path), "Output image was not created."

    drape = cv2.imread(out_path)
    cust = cv2.imread(customer_image_path)
    assert drape.shape == cust.shape

    # Check jeans region: y: 800-1250, x: 350-600
    crop_cust = cust[800:1250, 350:600]
    crop_drape = drape[800:1250, 350:600]
    cust_jeans = (crop_cust[:, :, 0].astype(int) > crop_cust[:, :, 2].astype(int) + 25) & (crop_cust[:, :, 0] > 100) & (crop_cust[:, :, 0] < 240)
    diff = np.abs(crop_cust.astype(int) - crop_drape.astype(int))
    matching_denim = np.sum(cust_jeans & np.all(diff < 10, axis=-1))
    assert matching_denim == 0, f"Visible jeans detected: {matching_denim} matching pixels remain."

    # Check sneakers preservation: y: 1300-1420, x: 300-600
    shoes_cust = cust[1300:1420, 300:600]
    shoes_drape = drape[1300:1420, 300:600]
    shoes_diff = np.mean(np.abs(shoes_cust.astype(float) - shoes_drape.astype(float)))
    assert shoes_diff < 0.05, f"Sneakers were altered: mean diff = {shoes_diff}"

    if os.path.exists(out_path):
        os.remove(out_path)

def test_hardware_status_honest_reporting():
    status = get_hardware_status()
    assert "active_engine" in status
    assert "hardware" in status
    # When HF_TOKEN is empty, it must NOT report IDM-VTON diffusion
    if not status.get("hf_configured"):
        assert "IDM-VTON Cloud" not in status["active_engine"], "Falsely claiming IDM-VTON when HF token is missing."
        assert "Delaunay" in status["active_engine"] or "Local" in status["active_engine"]

def test_privacy_clean_slate():
    deleted_assets = [
        "customer_garden_dress.jpg",
        "customer_portrait.jpg",
        "customer_white_saree.jpg",
        "mobile_aura_hhsvxh1_9b8c76.jpg"
    ]
    for root, dirs, files in os.walk(str(sarees_dir)):
        for f in files:
            assert f not in deleted_assets, f"Privacy violation: deleted asset '{f}' still exists in {root}"
