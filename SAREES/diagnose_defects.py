import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from pathlib import Path

BASE_DIR = Path("d:/AAMBLV/saree/SAREES")
IMAGES_DIR = BASE_DIR / "images"
OUTPUTS_DIR = BASE_DIR / "outputs"
DIAG_DIR = OUTPUTS_DIR / "diagnostics"
DIAG_DIR.mkdir(parents=True, exist_ok=True)

base_options = python.BaseOptions(model_asset_path=str(BASE_DIR / "selfie_multiclass_256x256.tflite"))
options = vision.ImageSegmenterOptions(base_options=base_options, output_category_mask=True)
segmenter = vision.ImageSegmenter.create_from_options(options)

print("="*60)
print("1. INSPECTING CATALOG SAREES AND MEDIAPIPE SEGMENTATION")
print("="*60)

sarees = {
    1: "red-saree.jpg",
    2: "blue-saree.jpg",
    3: "green-saree.jpg",
    4: "purple-saree.jpg",
    5: "pink-saree.jpg"
}

for sid, fname in sarees.items():
    img_path = IMAGES_DIR / fname
    img = cv2.imread(str(img_path))
    if img is None:
        print(f"FAILED to load {fname}")
        continue
    h, w = img.shape[:2]
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    res = segmenter.segment(mp_img)
    cat_mask = cv2.resize(np.squeeze(res.category_mask.numpy_view()), (w, h), interpolation=cv2.INTER_NEAREST)

    print(f"\n--- Saree {sid}: {fname} ({w}x{h}) ---")
    cat_counts = {c: int(np.sum(cat_mask == c)) for c in range(6)}
    for c, cnt in cat_counts.items():
        pct = (cnt / (w * h)) * 100
        name = ["Background", "Hair", "Body Skin", "Face Skin", "Clothes", "Others"][c]
        print(f"  Cat {c} ({name:12s}): {cnt:8d} ({pct:5.2f}%)")

    # Check saree_cloth = (cat_mask == 4)
    cloth = (cat_mask == 4).astype(np.uint8) * 255
    cloth[:int(h * 0.165), :] = 0
    ys, xs = np.where(cloth > 100)
    if len(ys) > 0:
        print(f"  Cloth Y range: [{ys.min()}, {ys.max()}], X range: [{xs.min()}, {xs.max()}]")
    else:
        print(f"  CRITICAL: Cloth mask is EMPTY!")

    # Save diagnostic category visualization
    # Color map for categories
    colors = np.array([
        [0, 0, 0],       # 0: bg
        [128, 0, 0],     # 1: hair (blue)
        [0, 255, 0],     # 2: skin (green)
        [0, 255, 255],   # 3: face (yellow)
        [0, 0, 255],     # 4: clothes (red)
        [255, 0, 255]    # 5: others (magenta)
    ], dtype=np.uint8)
    cat_vis = colors[cat_mask]
    cv2.imwrite(str(DIAG_DIR / f"diag_saree_{sid}_cat_mask.png"), cat_vis)
    cv2.imwrite(str(DIAG_DIR / f"diag_saree_{sid}_cloth_extracted.png"), cv2.bitwise_and(img, img, mask=cloth))

print("\nDiagnostics saved to:", DIAG_DIR)
