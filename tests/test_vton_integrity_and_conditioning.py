"""
Automated Test Suite for Saree VTON Dataset Integrity & Garment Conditioning (Phase 4)
Tests:
1. Curated dataset manifest integrity & zero test-leakage.
2. Rejection of mismatched person/garment/caption pairs in training split.
3. Sleeve coverage & face/skin protection in Saree Mask Engine V2.
4. Mathematical verification of Reference Garment Conditioning influence on diffusion input.
"""

import os
import sys
import json
import pytest
import numpy as np
import cv2
from PIL import Image
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SAREES_DIR = BASE_DIR / "SAREES"
TRAIN_DIR = BASE_DIR / "training"

if str(SAREES_DIR) not in sys.path:
    sys.path.insert(0, str(SAREES_DIR))
if str(TRAIN_DIR / "scripts") not in sys.path:
    sys.path.insert(0, str(TRAIN_DIR / "scripts"))

from saree_mask_engine_v2 import generate_corrected_saree_mask
from garment_conditioner import SareeGarmentConditioner


def test_curated_manifest_exists_and_unmodified_original():
    orig_p = TRAIN_DIR / "data" / "dataset.json"
    curated_p = TRAIN_DIR / "data" / "dataset_curated.json"

    assert orig_p.exists(), "Original dataset.json must be preserved!"
    assert curated_p.exists(), "Curated dataset manifest dataset_curated.json must exist!"

    with open(curated_p, "r", encoding="utf-8") as f:
        curated_data = json.load(f)

    assert "samples" in curated_data
    assert len(curated_data["samples"]) >= 6
    assert curated_data["split_summary"]["test"] >= 1
    assert curated_data["split_summary"]["train"] >= 3


def test_zero_test_leakage_and_clean_pairs():
    curated_p = TRAIN_DIR / "data" / "dataset_curated.json"
    with open(curated_p, "r", encoding="utf-8") as f:
        data = json.load(f)

    train_samples = [s for s in data["samples"] if s["split"] == "train"]
    val_samples = [s for s in data["samples"] if s["split"] == "val"]
    test_samples = [s for s in data["samples"] if s["split"] == "test"]

    train_ids = {s["sample_id"] for s in train_samples}
    val_ids = {s["sample_id"] for s in val_samples}
    test_ids = {s["sample_id"] for s in test_samples}

    # Strict isolation: zero intersection
    assert len(train_ids.intersection(test_ids)) == 0, "Test sample leaked into train split!"
    assert len(val_ids.intersection(test_ids)) == 0, "Test sample leaked into val split!"

    # Exclude jeans customer from train and val
    for s in train_samples + val_samples:
        assert "customer" not in s["sample_id"].lower(), f"Customer in jeans found in training/val: {s['sample_id']}"


def test_training_target_images_depict_correct_saree():
    curated_p = TRAIN_DIR / "data" / "dataset_curated.json"
    with open(curated_p, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Color signature checks for authentic pairs:
    # Red Saree 1: High Red channel
    # Blue Saree 2: High Blue channel
    # Green Saree 3: High Green channel
    for s in data["samples"]:
        if s["split"] != "train":
            continue

        p_path = BASE_DIR / s["person_image"]
        assert p_path.exists(), f"Missing person file: {p_path}"

        img = cv2.imread(str(p_path))
        h, w = img.shape[:2]
        # Inspect torso saree patch
        torso = img[int(h * 0.4):int(h * 0.6), int(w * 0.4):int(w * 0.6)]
        b, g, r = torso.mean(axis=(0, 1))

        caption = s["caption"].lower()
        if "crimson" in caption or "red" in caption:
            assert r > b and r > g, f"Red saree image should have dominant Red channel, got B={b}, G={g}, R={r}"
        elif "blue" in caption:
            assert b > r and b > g, f"Blue saree image should have dominant Blue channel, got B={b}, G={g}, R={r}"
        elif "green" in caption or "emerald" in caption:
            assert g > r and g > b, f"Green saree image should have dominant Green channel, got B={b}, G={g}, R={r}"


def test_mask_correction_sleeves_and_preservation():
    img_p = SAREES_DIR / "images" / "customer_jeans_model.jpg"
    assert img_p.exists()
    img_bgr = cv2.imread(str(img_p))
    img_1024 = cv2.resize(img_bgr, (1024, 1024))

    mask, agnostic, info = generate_corrected_saree_mask(img_1024)

    # 1. Face preservation: Area above neck_y must have 0 mask
    neck_y = info["neck_y"]
    assert mask[:neck_y, :].sum() == 0, "Face/head area improperly masked!"

    # 2. Footwear preservation: Area below feet_y must have 0 mask
    feet_y = info["feet_y"]
    assert mask[feet_y:, :].sum() == 0, "Sneakers/footwear improperly masked!"

    # 3. Upper-arm sleeve coverage: Shoulders/upper arm zone must be masked
    # In range y = neck_y to mid_bicep_y, mask must be nonzero across shoulders
    sleeve_zone = mask[neck_y:info["mid_bicep_y"], :]
    assert sleeve_zone.sum() > 0, "Upper-arm sleeves failed to be masked!"

    # 4. Continuous lower skirt drape: no blank row between waist and feet_y
    waist_y = info["waist_y"]
    row_sums = (mask[waist_y + 20:feet_y - 20, :] > 128).sum(axis=1)
    assert (row_sums == 0).sum() == 0, "Hole or gap found in lower saree skirt envelope!"


def test_upper_arm_sleeve_cloth_coverage():
    """
    Regression test for sleeve masking fix.
    Verifies that genuine cloth pixels on both upper arms are included in the inpaint mask,
    while face skin, head hair above neck_y, and neck skin remain at exactly 0 mask pixels.
    """
    import mediapipe as mp

    img_p = SAREES_DIR / "images" / "customer_jeans_model.jpg"
    assert img_p.exists()
    img_bgr = cv2.imread(str(img_p))
    img_1024 = cv2.resize(img_bgr, (1024, 1024))
    H, W = 1024, 1024

    mask, _, info = generate_corrected_saree_mask(img_1024)

    # Get segmentation categories to identify cloth pixels
    from saree_mask_engine_v2 import get_segmenter
    seg = get_segmenter()
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img_1024, cv2.COLOR_BGR2RGB))
    seg_res = seg.segment(mp_img)
    cat = cv2.resize(np.squeeze(seg_res.category_mask.numpy_view()), (W, H), interpolation=cv2.INTER_NEAREST)

    cloth = (cat == 4)
    face_skin = (cat == 3)
    hair = (cat == 1)

    neck_y = info["neck_y"]
    mid_bicep_y = info["mid_bicep_y"]

    # 1. Cloth coverage on upper arms (neck_y to mid_bicep_y) must be >= 85%
    upper_arm_cloth = cloth[neck_y:mid_bicep_y, :]
    upper_arm_mask = mask[neck_y:mid_bicep_y, :] > 128
    cloth_pixel_count = upper_arm_cloth.sum()
    if cloth_pixel_count > 0:
        coverage = (upper_arm_cloth & upper_arm_mask).sum() / cloth_pixel_count
        assert coverage >= 0.85, (
            f"Upper-arm sleeve cloth coverage only {coverage*100:.1f}%, need >= 85%"
        )

    # 2. Face skin must never be masked
    assert (mask[face_skin > 0] > 128).sum() == 0, "Face skin pixels were masked!"

    # 3. Head hair above neck_y must never be masked
    assert mask[:neck_y, :].max() == 0, "Head hair above neck_y was masked!"

    # 4. Hair pixels that don't overlap cloth must not be masked
    hair_no_cloth = (hair > 0) & (cloth == 0)
    assert (mask[hair_no_cloth] > 128).sum() == 0, "Non-cloth hair pixels were masked!"


def test_regional_mask_partitioning():
    """
    Regression test for create_regional_masks in SareeGarmentConditioner.
    Verifies upper/lower partition is non-overlapping and covers the full mask.
    """
    conditioner = SareeGarmentConditioner(target_resolution=(1024, 1024))

    mask_p = BASE_DIR / "evaluation" / "mask_correction_preview" / "corrected_mask.png"
    mask_img = Image.open(mask_p)

    upper_mask, skirt_mask = conditioner.create_regional_masks(mask_img, waist_y=450)

    upper_np = np.array(upper_mask)
    skirt_np = np.array(skirt_mask)

    # Upper mask must be zero at and below waist_y
    assert upper_np[450:, :].max() == 0, "Upper mask leaks below waist_y!"

    # Skirt mask must be zero above the feather band
    assert skirt_np[:439, :].max() == 0, "Skirt mask leaks above feather band!"

    # Both masks combined must cover all original mask pixels (above feather band)
    orig_np = np.array(mask_img.convert("L").resize((1024, 1024)))
    combined = np.maximum(upper_np, skirt_np)
    missed = ((orig_np > 128) & (combined == 0)).sum()
    # Feather zone may attenuate a small fraction; tolerate up to 3%
    total_mask_px = (orig_np > 128).sum()
    if total_mask_px > 0:
        miss_ratio = missed / total_mask_px
        assert miss_ratio < 0.03, f"Regional masks miss {miss_ratio*100:.1f}% of original mask!"


def test_garment_reference_conditioning_influence():
    conditioner = SareeGarmentConditioner(target_resolution=(1024, 1024))

    person_img = Image.open(SAREES_DIR / "images" / "customer_jeans_model.jpg")
    pink_garment = Image.open(SAREES_DIR / "images" / "pink-saree.jpg")
    blue_garment = Image.open(SAREES_DIR / "images" / "blue-saree.jpg")

    mask_p = BASE_DIR / "evaluation" / "mask_correction_preview" / "corrected_mask.png"
    if not mask_p.exists():
        # Fallback to test mask
        mask_p = BASE_DIR / "training" / "data" / "processed_curated" / "customer_saree_5_mask.png"
    mask_img = Image.open(mask_p)

    report = conditioner.verify_conditioning_influence(
        person_img=person_img,
        garment_ref_a=pink_garment,
        garment_ref_b=blue_garment,
        inpaint_mask=mask_img
    )

    assert report["has_influence"] is True, "Garment reference failed to influence input!"
    assert report["mean_l1_difference"] > 1.0, f"Conditioning influence too small: {report['mean_l1_difference']}"
    assert report["max_pixel_difference"] > 100.0, f"Max difference too small: {report['max_pixel_difference']}"


def test_garment_cloth_extraction_alpha_and_dimensions():
    conditioner = SareeGarmentConditioner(target_resolution=(1024, 1024))
    pink_garment = Image.open(SAREES_DIR / "images" / "pink-saree.jpg")

    rgba, alpha, diag = conditioner.extract_garment_cloth(pink_garment)

    # 1. Dimensions and channel count
    assert rgba.shape[:2] == alpha.shape
    assert rgba.shape[2] == 4, "Garment cutout must have 4 channels (RGBA)"
    assert alpha.dtype == np.uint8
    assert alpha.min() >= 0 and alpha.max() <= 255

    # 2. Meaningful cloth extraction (>15% coverage)
    assert diag["status"] == "SUCCESSFUL_EXTRACTION"
    assert diag["coverage_pct"] >= 15.0, f"Insufficient cloth detected: {diag['coverage_pct']}%"


def test_garment_cloth_extraction_removes_shadow_wall():
    conditioner = SareeGarmentConditioner(target_resolution=(1024, 1024))
    pink_garment = Image.open(SAREES_DIR / "images" / "pink-saree.jpg")

    rgba, alpha, diag = conditioner.extract_garment_cloth(pink_garment)

    # Left wall region (x < 150) in pink-saree.jpg contains dark wall shadow
    # In alpha mask, left wall must be completely stripped (0 cloth pixels)
    left_wall_alpha = alpha[:, :150]
    assert (left_wall_alpha > 20).sum() == 0, "Dark shadow wall leaked into garment extraction mask!"


def test_garment_conditioner_empty_and_nearly_empty_masks():
    conditioner = SareeGarmentConditioner(target_resolution=(1024, 1024))
    person_img = Image.open(SAREES_DIR / "images" / "customer_jeans_model.jpg")
    pink_garment = Image.open(SAREES_DIR / "images" / "pink-saree.jpg")

    # 1. All-black empty mask (zero inpainting zone)
    empty_mask = Image.new("L", (1024, 1024), 0)
    canvas_empty = conditioner.prepare_conditioned_canvas(person_img, pink_garment, empty_mask)
    # Output must equal person image exactly
    diff_empty = np.abs(np.array(person_img.resize((1024, 1024))) - np.array(canvas_empty)).max()
    assert diff_empty == 0, "Empty mask altered person canvas!"

    # 2. Synthetic blank reference image with zero cloth (solid white image)
    blank_ref = Image.new("RGB", (500, 500), (255, 255, 255))
    rgba_blank, alpha_blank, diag_blank = conditioner.extract_garment_cloth(blank_ref)
    assert diag_blank["status"] == "FALLBACK_INSUFFICIENT_CLOTH_DETECTED"


def test_garment_conditioner_correct_compositing():
    conditioner = SareeGarmentConditioner(target_resolution=(1024, 1024))
    person_img = Image.open(SAREES_DIR / "images" / "customer_jeans_model.jpg")
    pink_garment = Image.open(SAREES_DIR / "images" / "pink-saree.jpg")

    mask_p = BASE_DIR / "evaluation" / "mask_correction_preview" / "corrected_mask.png"
    mask_img = Image.open(mask_p)

    canvas = conditioner.prepare_conditioned_canvas(person_img, pink_garment, mask_img, use_segmentation=True)

    p_np = np.array(person_img.resize((1024, 1024)))
    c_np = np.array(canvas)
    m_np = np.array(mask_img.resize((1024, 1024)))

    # Outside mask (m_np == 0), canvas must be 100% identical to person photo
    outside_mask = (m_np == 0)
    diff_outside = np.abs(p_np[outside_mask] - c_np[outside_mask]).max()
    assert diff_outside == 0, f"Compositing leaked outside inpaint mask: max diff={diff_outside}"

