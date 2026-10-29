"""
Saree Mask Engine V2 — Corrected Saree Inpainting Mask Generator
Fixes:
1. Upper-arm T-shirt sleeve leakage: masks casual t-shirt sleeves down to mid-bicep.
2. Forearm & hand protection: protects hands, wrists, and exposed forearm skin from pose landmarks.
3. Strict protection of face, neck, hair, and footwear.
4. Seamless drape envelope: bridges torso and lower skirt without horizontal blackout bands.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Tuple, Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent / "SAREES"
SEGMENTER_MODEL_FILE = BASE_DIR / "selfie_multiclass_256x256.tflite"
POSE_MODEL_FILE = BASE_DIR / "pose_landmarker_lite.task"


def get_segmenter():
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision

    base_options = python.BaseOptions(model_asset_path=str(SEGMENTER_MODEL_FILE))
    options = vision.ImageSegmenterOptions(
        base_options=base_options,
        output_category_mask=True,
        running_mode=vision.RunningMode.IMAGE
    )
    return vision.ImageSegmenter.create_from_options(options)


def get_pose_detector():
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision

    if not POSE_MODEL_FILE.exists():
        return None
    base_options = python.BaseOptions(model_asset_path=str(POSE_MODEL_FILE))
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
        num_poses=1
    )
    return vision.PoseLandmarker.create_from_options(options)


def generate_corrected_saree_mask(
    image_bgr: np.ndarray,
    segmenter=None,
    pose_detector=None
) -> Tuple[np.ndarray, np.ndarray, Dict]:
    """
    Generates a precision saree inpainting mask:
    - Inpaint Zone (255): Upper garment / blouse, sleeves, and lower saree skirt.
    - Preserved Zone (0): Face, hair, exposed skin (neck, hands, forearms), shoes, background.
    Returns:
        mask (H, W) uint8 (0 or 255)
        agnostic (H, W, 3) uint8 with gray 128 in inpaint zone
        debug_info Dict
    """
    if segmenter is None:
        segmenter = get_segmenter()
    if pose_detector is None:
        pose_detector = get_pose_detector()

    H, W = image_bgr.shape[:2]
    import mediapipe as mp
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB))

    # 1. Multiclass segmentation
    seg_res = segmenter.segment(mp_img)
    cat = cv2.resize(np.squeeze(seg_res.category_mask.numpy_view()), (W, H), interpolation=cv2.INTER_NEAREST)

    bg_mask = (cat == 0).astype(np.uint8) * 255
    hair_mask = (cat == 1).astype(np.uint8) * 255
    body_skin_mask = (cat == 2).astype(np.uint8) * 255
    face_skin_mask = (cat == 3).astype(np.uint8) * 255
    cloth_mask = (cat == 4).astype(np.uint8) * 255

    # 2. Pose Landmarks
    pose_res = pose_detector.detect(mp_img) if pose_detector else None
    lm_dict = {}
    if pose_res and pose_res.pose_landmarks and len(pose_res.pose_landmarks) > 0:
        for idx, l in enumerate(pose_res.pose_landmarks[0]):
            lm_dict[idx] = (int(l.x * W), int(l.y * H), float(l.visibility))

    # Default anchors
    neck_y = int(H * 0.22)
    feet_y = int(H * 0.90)
    waist_y = int(H * 0.45)
    elbow_y = int(H * 0.40)

    # Refine from pose
    if 11 in lm_dict and 12 in lm_dict:
        neck_y = max(int(min(lm_dict[11][1], lm_dict[12][1]) - 15), 0)
    if 13 in lm_dict and 14 in lm_dict:
        elbow_y = int(min(lm_dict[13][1], lm_dict[14][1]))
    if 27 in lm_dict and 28 in lm_dict:
        feet_y = int(min(lm_dict[27][1], lm_dict[28][1]))

    # Mid-bicep threshold: halfway between shoulder and elbow
    mid_bicep_y = int((neck_y + elbow_y) / 2) + 20

    # Navel / waist line for saree waistband (y ~ 0.44 * H)
    saree_waist_y = int(H * 0.44)
    if 23 in lm_dict and 24 in lm_dict:
        saree_waist_y = int(min(lm_dict[23][1], lm_dict[24][1]) - 40)

    # Clamp all y coordinates strictly to [0, H - 1]
    neck_y = int(np.clip(neck_y, 0, H - 1))
    feet_y = int(np.clip(feet_y, 0, H - 1))
    elbow_y = int(np.clip(elbow_y, 0, H - 1))
    mid_bicep_y = int(np.clip(mid_bicep_y, 0, H - 1))
    saree_waist_y = int(np.clip(saree_waist_y, 0, H - 1))

    # 3. Construct Drape Silhouette
    person_silhouette = (bg_mask == 0).astype(np.uint8) * 255
    drape_mask = np.zeros((H, W), dtype=np.uint8)

    # Lower body: Bridge leg gap for continuous floor-length saree silhouette
    for y in range(saree_waist_y, feet_y):
        row = cloth_mask[y, :]
        nz = np.where(row > 0)[0]
        if len(nz) > 0:
            drape_mask[y, nz.min():nz.max() + 1] = 255

    # Upper body: Include clothing zone from neck_y to saree_waist_y
    for y in range(neck_y, saree_waist_y):
        row_cloth = cloth_mask[y, :]
        nz_cloth = np.where(row_cloth > 0)[0]
        if len(nz_cloth) > 0:
            drape_mask[y, nz_cloth.min():nz_cloth.max() + 1] = 255

    # Sleeve correction: Ensure all genuine upper arm sleeve cloth (neck_y to mid_bicep_y) is covered
    for y in range(neck_y, mid_bicep_y):
        row_sil = person_silhouette[y, :]
        nz_sil = np.where(row_sil > 0)[0]
        if len(nz_sil) > 0:
            drape_mask[y, nz_sil.min():nz_sil.max() + 1] = 255

    # Ensure every detected cloth pixel between neck_y and feet_y is included in drape mask
    drape_mask[(cloth_mask > 0) & (np.arange(H)[:, None] >= neck_y) & (np.arange(H)[:, None] < feet_y)] = 255

    # 4. Strict Preservations
    # A. Face and Head Hair (100% preserve above neck_y and face skin)
    drape_mask[:neck_y, :] = 0  # Hard cutoff above neck line
    drape_mask[face_skin_mask > 0] = 0

    # B. Neck preservation: preserve exposed neck skin between shoulders using pose landmarks
    if 11 in lm_dict and 12 in lm_dict:
        neck_x_min = min(lm_dict[11][0], lm_dict[12][0]) - 25
        neck_x_max = max(lm_dict[11][0], lm_dict[12][0]) + 25
        shoulder_mid_y = int((lm_dict[11][1] + lm_dict[12][1]) / 2) + 25
        neck_skin = (
            (body_skin_mask > 0)
            & (np.arange(H)[:, None] >= neck_y)
            & (np.arange(H)[:, None] <= shoulder_mid_y)
            & (np.arange(W)[None, :] >= neck_x_min)
            & (np.arange(W)[None, :] <= neck_x_max)
        )
        drape_mask[neck_skin] = 0

    # C. Hair protection below neck_y (preserve visible ponytail without eroding upper-arm sleeve cloth)
    # Genuine visible hair strands below neck_y (strictly exclude clothing pixels from being protected as hair)
    hair_below_neck = (hair_mask > 0) & (cloth_mask == 0)
    # Minimal 3x3 close to solidify hair strands without expanding into the sleeve cloth
    hair_protect_below = cv2.morphologyEx(hair_below_neck.astype(np.uint8) * 255, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    # Hair protection must NEVER mask or overwrite cloth_mask
    drape_mask[(hair_protect_below > 0) & (cloth_mask == 0)] = 0

    # D. Forearms, Wrists & Hands (100% preserve genuine exposed skin)
    # Protect exposed skin below mid_bicep_y and above feet_y
    skin_protect = np.zeros((H, W), dtype=np.uint8)
    skin_protect[mid_bicep_y:feet_y, :] = body_skin_mask[mid_bicep_y:feet_y, :]
    # Mild dilation of skin protection to protect fine hand/finger boundaries
    skin_protect = cv2.dilate(skin_protect, np.ones((5, 5), np.uint8))
    # Crucial: skin protection must never wipe out sleeve clothing
    skin_protect[cloth_mask > 0] = 0
    drape_mask[skin_protect > 0] = 0

    # E. Footwear & Feet (100% preserve below feet_y)
    drape_mask[feet_y:, :] = 0

    # F. Background (100% preserve outside outer silhouette and above waist)
    # Above waist, protect all background pixels
    drape_mask[:saree_waist_y, :][bg_mask[:saree_waist_y, :] > 0] = 0
    # Below waist, protect background outside outer silhouette bounds
    for y in range(saree_waist_y, feet_y):
        row = drape_mask[y, :]
        nz = np.where(row > 0)[0]
        if len(nz) > 0:
            drape_mask[y, :nz.min()] = 0
            drape_mask[y, nz.max() + 1:] = 0

    # Morphological clean-up
    drape_mask = cv2.morphologyEx(drape_mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    drape_mask = (drape_mask > 128).astype(np.uint8) * 255

    # Generate Agnostic Canvas
    agnostic = image_bgr.copy()
    agnostic[drape_mask > 0] = [128, 128, 128]

    debug_info = {
        "neck_y": neck_y,
        "waist_y": waist_y,
        "elbow_y": elbow_y,
        "feet_y": feet_y,
        "mid_bicep_y": mid_bicep_y,
        "mask_area_pct": float((drape_mask > 0).mean() * 100)
    }
    return drape_mask, agnostic, debug_info
