import cv2
import numpy as np
import mediapipe as mp
from scipy.spatial import Delaunay
from pathlib import Path

BASE_DIR = Path("d:/AAMBLV/saree/SAREES")
IMAGES_DIR = BASE_DIR / "images"
DIAG_DIR = BASE_DIR / "outputs" / "diagnostics"
DIAG_DIR.mkdir(parents=True, exist_ok=True)

cust_path = IMAGES_DIR / "customer_jeans_model.jpg"
cust = cv2.imread(str(cust_path))
H, W = cust.shape[:2]

from main import get_segmenter, get_pose_detector, generate_saree_inpainting_mask

seg = get_segmenter()
pose_det = get_pose_detector()

mp_cust = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(cust, cv2.COLOR_BGR2RGB))
seg_res = seg.segment(mp_cust)
cat_mask = cv2.resize(np.squeeze(seg_res.category_mask.numpy_view()), (W, H), interpolation=cv2.INTER_NEAREST)

cust_cloth = (cat_mask == 4).astype(np.uint8) * 255
cust_skin = (cat_mask == 2).astype(np.uint8) * 255
full_mask = generate_saree_inpainting_mask(str(cust_path), dilation_px=8)

cv2.imwrite(str(DIAG_DIR / "step0_cust_input.jpg"), cust)
cv2.imwrite(str(DIAG_DIR / "step0_full_drape_mask.png"), full_mask)

for sid in [4, 5]:
    fname = "purple-saree.jpg" if sid == 4 else "pink-saree.jpg"
    saree_path = IMAGES_DIR / fname
    saree = cv2.imread(str(saree_path))
    sh, sw = saree.shape[:2]

    # MediaPipe saree segmentation
    mp_saree = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(saree, cv2.COLOR_BGR2RGB))
    saree_seg_res = seg.segment(mp_saree)
    saree_cat = cv2.resize(np.squeeze(saree_seg_res.category_mask.numpy_view()), (sw, sh), interpolation=cv2.INTER_NEAREST)
    saree_cloth = (saree_cat == 4).astype(np.uint8) * 255
    saree_cloth[:int(sh * 0.165), :] = 0

    clean_saree = cv2.bitwise_and(saree, saree, mask=saree_cloth)

    cv2.imwrite(str(DIAG_DIR / f"saree{sid}_1_original.jpg"), saree)
    cv2.imwrite(str(DIAG_DIR / f"saree{sid}_2_saree_cloth_mask.png"), saree_cloth)
    cv2.imwrite(str(DIAG_DIR / f"saree{sid}_3_clean_saree.png"), clean_saree)

    s_ys, s_xs = np.where(saree_cloth > 100)
    c_ys, c_xs = np.where(full_mask > 100)

    s_top_y, s_bot_y = int(s_ys.min()), int(s_ys.max())
    c_top_y, c_bot_y = int(c_ys.min()), int(c_ys.max())

    num_rows = 16
    num_cols = 7

    src_pts = []
    dst_pts = []

    for r in range(num_rows):
        frac = r / (num_rows - 1)
        sy = int(s_top_y + (s_bot_y - s_top_y) * frac)
        cy = int(c_top_y + (c_bot_y - c_top_y) * frac)

        s_row = np.where(saree_cloth[sy, :] > 100)[0]
        if len(s_row) > 0:
            s_left = int(s_row.min())
            s_right = int(s_row.max())
        else:
            s_left = int(sw * 0.35)
            s_right = int(sw * 0.70)

        c_row = np.where(full_mask[cy, :] > 100)[0]
        if len(c_row) > 0:
            c_left = int(c_row.min())
            c_right = int(c_row.max())
        else:
            c_left = int(W * 0.35)
            c_right = int(W * 0.70)

        print(f"Saree {sid} Row {r:2d} (frac={frac:.2f}): sy={sy:3d} [s_left={s_left:3d}, s_right={s_right:3d}, width={s_right-s_left:3d}] | cy={cy:4d} [c_left={c_left:3d}, c_right={c_right:3d}, width={c_right-c_left:3d}]")

        for c in range(num_cols):
            col_frac = c / (num_cols - 1)
            sx = s_left + (s_right - s_left) * col_frac
            cx = c_left + (c_right - c_left) * col_frac
            src_pts.append([sx, sy])
            dst_pts.append([cx, cy])

    src_pts = np.array(src_pts, dtype=np.float32)
    dst_pts = np.array(dst_pts, dtype=np.float32)

    # Wireframe visualization
    wire_dst = cust.copy()
    tri = Delaunay(dst_pts)
    for simplex in tri.simplices:
        pts = dst_pts[simplex].astype(np.int32)
        cv2.polylines(wire_dst, [pts], isClosed=True, color=(0, 255, 255), thickness=1)
    for p in dst_pts:
        cv2.circle(wire_dst, (int(p[0]), int(p[1])), 2, (0, 0, 255), -1)
    cv2.imwrite(str(DIAG_DIR / f"saree{sid}_4_mesh_wireframe.jpg"), wire_dst)

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
        src_mask_patch = saree_cloth[r_src[1]:r_src[1] + r_src[3], r_src[0]:r_src[0] + r_src[2]]
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

    cv2.imwrite(str(DIAG_DIR / f"saree{sid}_5_warped_saree_raw.png"), warped_saree)
    cv2.imwrite(str(DIAG_DIR / f"saree{sid}_6_warped_mask.png"), warped_mask)

    target_mask = full_mask.copy()
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

    # Arms protection
    arms_skin = np.zeros((H, W), dtype=np.uint8)
    arms_skin[int(H * 0.35):int(H * 0.55), :] = cust_skin[int(H * 0.35):int(H * 0.55), :]
    arms_protect = cv2.dilate(arms_skin, np.ones((5, 5), np.uint8))
    cv2.imwrite(str(DIAG_DIR / f"saree{sid}_7_arms_protect.png"), arms_protect)

    if np.sum(arms_protect > 0) > 100:
        alpha_arms = (cv2.GaussianBlur(arms_protect, (7, 7), 0).astype(np.float32) / 255.0)[:, :, np.newaxis]
        final_comp = (final_comp.astype(np.float32) * (1.0 - alpha_arms) + cust.astype(np.float32) * alpha_arms).clip(0, 255).astype(np.uint8)

    cv2.imwrite(str(DIAG_DIR / f"saree{sid}_8_final_comp.jpg"), final_comp)

print("\nAll pipeline step diagnostics generated in:", DIAG_DIR)
