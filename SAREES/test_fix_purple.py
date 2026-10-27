import cv2
import numpy as np
import mediapipe as mp
from scipy.spatial import Delaunay
from pathlib import Path

BASE_DIR = Path("d:/AAMBLV/saree/SAREES")
IMAGES_DIR = BASE_DIR / "images"
DIAG_DIR = BASE_DIR / "outputs" / "diagnostics"

cust_path = IMAGES_DIR / "customer_jeans_model.jpg"
saree_path = IMAGES_DIR / "purple-saree.jpg"

cust = cv2.imread(str(cust_path))
saree = cv2.imread(str(saree_path))
H, W = cust.shape[:2]
sh, sw = saree.shape[:2]

from main import get_segmenter, generate_saree_inpainting_mask

seg = get_segmenter()
mp_saree = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(saree, cv2.COLOR_BGR2RGB))
saree_seg_res = seg.segment(mp_saree)
saree_cat = cv2.resize(np.squeeze(saree_seg_res.category_mask.numpy_view()), (sw, sh), interpolation=cv2.INTER_NEAREST)

# 1. Base saree cloth mask
saree_cloth = (saree_cat == 4).astype(np.uint8) * 255
# Remove head/necklace in top 16.5%
saree_cloth[:int(sh * 0.165), :] = 0

# 2. Fill internal holes (hands, arms, jewelry, skin) within the saree envelope
# Find external contours of saree cloth
contours, _ = cv2.findContours(saree_cloth, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
filled_envelope = np.zeros_like(saree_cloth)
cv2.drawContours(filled_envelope, contours, -1, 255, -1)

# Morphological closing to bridge arm gaps & hand occlusions
kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35))
closed_envelope = cv2.morphologyEx(filled_envelope, cv2.MORPH_CLOSE, kernel_close)

# Holes inside fabric region:
internal_holes = cv2.bitwise_and(closed_envelope, cv2.bitwise_not(saree_cloth))
print(f"Internal holes in saree: {np.sum(internal_holes > 0)} pixels")

# Inpaint internal holes so no black pixels exist inside the fabric envelope
inpainted_saree = saree.copy()
if np.sum(internal_holes > 0) > 0:
    inpainted_saree = cv2.inpaint(inpainted_saree, internal_holes, 9, cv2.INPAINT_TELEA)

# Extend fabric color outward by 25 pixels around the envelope
dilated_envelope = cv2.dilate(closed_envelope, np.ones((25, 25), np.uint8))
margin_holes = cv2.bitwise_and(dilated_envelope, cv2.bitwise_not(closed_envelope))
extended_saree = cv2.inpaint(inpainted_saree, margin_holes, 11, cv2.INPAINT_TELEA)

# Clean saree uses extended_saree masked by dilated_envelope
clean_saree = cv2.bitwise_and(extended_saree, extended_saree, mask=dilated_envelope)
cv2.imwrite(str(DIAG_DIR / "test_fixed_clean_purple_saree.png"), clean_saree)

# 3. Target drape mask on customer
full_mask = generate_saree_inpainting_mask(str(cust_path), dilation_px=8)

s_ys, s_xs = np.where(closed_envelope > 100)
c_ys, c_xs = np.where(full_mask > 100)
s_top_y, s_bot_y = int(s_ys.min()), int(s_ys.max())
c_top_y, c_bot_y = int(c_ys.min()), int(c_ys.max())

num_rows = 16
num_cols = 7

# Compute raw row bounds from closed_envelope
raw_s_left = []
raw_s_right = []
for r in range(num_rows):
    frac = r / (num_rows - 1)
    sy = int(s_top_y + (s_bot_y - s_top_y) * frac)
    row_pix = np.where(closed_envelope[sy, :] > 100)[0]
    if len(row_pix) > 0:
        raw_s_left.append(int(row_pix.min()))
        raw_s_right.append(int(row_pix.max()))
    else:
        raw_s_left.append(int(sw * 0.35))
        raw_s_right.append(int(sw * 0.70))

# Enforce minimum width at neckline (row 0) to avoid degenerate collapse
min_neck_width = int(sw * 0.22)
if raw_s_right[0] - raw_s_left[0] < min_neck_width:
    mid = (raw_s_right[0] + raw_s_left[0]) // 2
    raw_s_left[0] = max(0, mid - min_neck_width // 2)
    raw_s_right[0] = min(sw - 1, mid + min_neck_width // 2)

# Smooth s_left and s_right across rows using a 3-tap moving average
smooth_s_left = np.convolve(raw_s_left, [0.2, 0.6, 0.2], mode='same')
smooth_s_right = np.convolve(raw_s_right, [0.2, 0.6, 0.2], mode='same')
smooth_s_left[0], smooth_s_right[0] = raw_s_left[0], raw_s_right[0]
smooth_s_left[-1], smooth_s_right[-1] = raw_s_left[-1], raw_s_right[-1]

src_pts = []
dst_pts = []

for r in range(num_rows):
    frac = r / (num_rows - 1)
    sy = int(s_top_y + (s_bot_y - s_top_y) * frac)
    cy = int(c_top_y + (c_bot_y - c_top_y) * frac)

    s_left = smooth_s_left[r]
    s_right = smooth_s_right[r]

    c_row = np.where(full_mask[cy, :] > 100)[0]
    if len(c_row) > 0:
        c_left = int(c_row.min())
        c_right = int(c_row.max())
    else:
        c_left = int(W * 0.35)
        c_right = int(W * 0.70)

    for c in range(num_cols):
        col_frac = c / (num_cols - 1)
        sx = s_left + (s_right - s_left) * col_frac
        cx = c_left + (c_right - c_left) * col_frac
        src_pts.append([sx, sy])
        dst_pts.append([cx, cy])

src_pts = np.array(src_pts, dtype=np.float32)
dst_pts = np.array(dst_pts, dtype=np.float32)

tri = Delaunay(dst_pts)
warped_saree = np.zeros((H, W, 3), dtype=np.uint8)
warped_mask = np.zeros((H, W), dtype=np.uint8)

for simplex in tri.simplices:
    t_dst = dst_pts[simplex]
    t_src = src_pts[simplex]

    r_dst = cv2.boundingRect(np.float32([t_dst]))
    r_src = cv2.boundingRect(np.float32([t_src]))
    if r_dst[2] <= 0 or r_dst[3] <= 0 or r_src[2] <= 0 or r_src[3] <= 0:
        continue

    t_dst_rect = [(p[0] - r_dst[0], p[1] - r_dst[1]) for p in t_dst]
    t_src_rect = [(p[0] - r_src[0], p[1] - r_src[1]) for p in t_src]

    try:
        warp_mat = cv2.getAffineTransform(np.float32(t_src_rect), np.float32(t_dst_rect))
    except Exception:
        continue

    src_patch = clean_saree[r_src[1]:r_src[1] + r_src[3], r_src[0]:r_src[0] + r_src[2]]
    src_mask_patch = dilated_envelope[r_src[1]:r_src[1] + r_src[3], r_src[0]:r_src[0] + r_src[2]]
    if src_patch.shape[0] == 0 or src_patch.shape[1] == 0:
        continue

    try:
        dst_patch = cv2.warpAffine(src_patch, warp_mat, (r_dst[2], r_dst[3]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
        dst_mask_patch = cv2.warpAffine(src_mask_patch, warp_mat, (r_dst[2], r_dst[3]), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT)
    except Exception:
        continue

    tri_mask = np.zeros((r_dst[3], r_dst[2]), dtype=np.uint8)
    cv2.fillConvexPoly(tri_mask, np.int32(t_dst_rect), 255)

    x, y, w, h = r_dst
    x2, y2 = min(W, x + w), min(H, y + h)
    w_act, h_act = x2 - x, y2 - y
    if w_act <= 0 or h_act <= 0:
        continue

    mask_crop = (tri_mask[:h_act, :w_act] > 0)
    warped_saree[y:y2, x:x2][mask_crop] = dst_patch[:h_act, :w_act][mask_crop]
    warped_mask[y:y2, x:x2][mask_crop] = 255

# Check black pixels inside target mask
target_mask = full_mask.copy()
is_black = (target_mask > 0) & (warped_saree[:, :, 0] < 15) & (warped_saree[:, :, 1] < 15) & (warped_saree[:, :, 2] < 15)
num_black_fixed = np.sum(is_black)
print(f"Black pixels in target mask after fix: {num_black_fixed} (was 22,881)")

# If any residual black pixels remain, inpaint them:
if num_black_fixed > 0:
    warped_saree = cv2.inpaint(warped_saree, is_black.astype(np.uint8) * 255, 7, cv2.INPAINT_TELEA)

final_drape_mask = cv2.bitwise_and(warped_mask, target_mask)

# Shading
cust_lab = cv2.cvtColor(cust, cv2.COLOR_BGR2LAB)
cust_l = cust_lab[:, :, 0].astype(np.float32)
smooth_l = cv2.bilateralFilter(cust_l, 9, 75, 75)
c_l_vals = smooth_l[final_drape_mask > 0]
med_l = np.median(c_l_vals) if len(c_l_vals) > 0 else 128.0
l_factor = np.clip(smooth_l / max(1.0, med_l), 0.70, 1.30)[:, :, np.newaxis]
shaded_saree = (warped_saree.astype(np.float32) * l_factor).clip(0, 255).astype(np.uint8)

alpha = (cv2.GaussianBlur(final_drape_mask, (7, 7), 0).astype(np.float32) / 255.0)[:, :, np.newaxis]
final_comp = (cust.astype(np.float32) * (1.0 - alpha) + shaded_saree.astype(np.float32) * alpha).clip(0, 255).astype(np.uint8)

# Careful arms skin protection: only protect actual arms skin above waist
mp_cust = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(cust, cv2.COLOR_BGR2RGB))
cust_res = seg.segment(mp_cust)
cust_cat = cv2.resize(np.squeeze(cust_res.category_mask.numpy_view()), (W, H), interpolation=cv2.INTER_NEAREST)
cust_skin = (cust_cat == 2).astype(np.uint8) * 255

# Only forearms: between y=0.35H and y=0.43H (strictly above waist belt)
arms_skin = np.zeros((H, W), dtype=np.uint8)
arms_skin[int(H * 0.35):int(H * 0.43), :] = cust_skin[int(H * 0.35):int(H * 0.43), :]
arms_protect = cv2.dilate(arms_skin, np.ones((5, 5), np.uint8))
if np.sum(arms_protect > 0) > 100:
    alpha_arms = (cv2.GaussianBlur(arms_protect, (7, 7), 0).astype(np.float32) / 255.0)[:, :, np.newaxis]
    final_comp = (final_comp.astype(np.float32) * (1.0 - alpha_arms) + cust.astype(np.float32) * alpha_arms).clip(0, 255).astype(np.uint8)

cv2.imwrite(str(DIAG_DIR / "test_fixed_purple_saree_result.jpg"), final_comp)
print("Saved test_fixed_purple_saree_result.jpg successfully!")
