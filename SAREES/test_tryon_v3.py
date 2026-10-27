import cv2
import numpy as np
import mediapipe as mp
from scipy.spatial import Delaunay
from pathlib import Path

BASE_DIR = Path("d:/AAMBLV/saree/SAREES")
DIAG_DIR = BASE_DIR / "outputs" / "diagnostics"
OUTPUTS_DIR = BASE_DIR / "outputs"

cust = cv2.imread(str(BASE_DIR / "images" / "customer_jeans_model.jpg"))
H, W = cust.shape[:2]

from main import get_segmenter, get_pose_detector, SAREES

seg = get_segmenter()
pose_det = get_pose_detector()

mp_cust = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(cust, cv2.COLOR_BGR2RGB))
cust_res = seg.segment(mp_cust)
cust_cat = cv2.resize(np.squeeze(cust_res.category_mask.numpy_view()), (W, H), interpolation=cv2.INTER_NEAREST)

cust_cloth = (cust_cat == 4).astype(np.uint8) * 255
cust_skin = (cust_cat == 2).astype(np.uint8) * 255

p_res = pose_det.detect(mp_cust)
lm = p_res.pose_landmarks[0]
ankle_y = int(max(lm[27].y, lm[28].y) * H)
feet_y = min(H - 2, ankle_y + 10)
hip_y = int((lm[23].y + lm[24].y) / 2.0 * H)

# Solid continuous drape mask
cloth_mask = ((cust_cat == 4) | (cust_cat == 5)).astype(np.uint8) * 255
cloth_ys = np.where(cloth_mask > 100)[0]
cloth_top = cloth_ys.min()

torso_skin = np.zeros_like(cust_skin)
torso_skin[cloth_top:feet_y, :] = cust_skin[cloth_top:feet_y, :]

drape_mask = cv2.bitwise_or(cloth_mask, torso_skin)
for y in range(hip_y, feet_y + 1):
    r_xs = np.where(drape_mask[y, :] > 100)[0]
    if len(r_xs) > 1:
        drape_mask[y, r_xs.min():r_xs.max() + 1] = 255

for y in range(cloth_top + 10, hip_y):
    r_xs = np.where(drape_mask[y, :] > 100)[0]
    if len(r_xs) > 1:
        drape_mask[y, r_xs.min():r_xs.max() + 1] = 255

drape_mask = cv2.dilate(drape_mask, np.ones((8, 8), np.uint8))
drape_mask[feet_y + 2:, :] = 0
head = ((cust_cat == 3) | (cust_cat == 1)).astype(np.uint8) * 255
head_dil = cv2.dilate(head, np.ones((7, 7), np.uint8))
drape_mask[head_dil > 0] = 0

def test_tryon(sid, clean_fname):
    saree = cv2.imread(str(DIAG_DIR / clean_fname))
    sh, sw = saree.shape[:2]

    # Segmentation of clean saree
    mp_s = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(saree, cv2.COLOR_BGR2RGB))
    s_res = seg.segment(mp_s)
    s_cat = cv2.resize(np.squeeze(s_res.category_mask.numpy_view()), (sw, sh), interpolation=cv2.INTER_NEAREST)

    s_cloth = ((s_cat == 4) | (s_cat == 5)).astype(np.uint8) * 255
    s_cloth[:int(sh * 0.165), :] = 0

    contours, _ = cv2.findContours(s_cloth, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    envelope = np.zeros_like(s_cloth)
    cv2.drawContours(envelope, contours, -1, 255, -1)
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35))
    envelope = cv2.morphologyEx(envelope, cv2.MORPH_CLOSE, kernel_close)

    # Inpaint any minor internal gaps in envelope
    internal_holes = cv2.bitwise_and(envelope, cv2.bitwise_not(s_cloth))
    inpainted = saree.copy()
    if np.sum(internal_holes > 0) > 0:
        inpainted = cv2.inpaint(inpainted, internal_holes, 9, cv2.INPAINT_TELEA)

    if sid == 5:
        # Blush pink organza enhancement
        hsv_inp = cv2.cvtColor(inpainted, cv2.COLOR_BGR2HSV)
        pale_organza = (envelope > 0) & (hsv_inp[:, :, 1] < 45) & (hsv_inp[:, :, 2] > 140)
        blush_tint = np.full_like(inpainted, [182, 114, 244], dtype=np.uint8)
        inpainted[pale_organza] = cv2.addWeighted(inpainted, 0.65, blush_tint, 0.35, 0)[pale_organza]

    dilated_envelope = cv2.dilate(envelope, np.ones((25, 25), np.uint8))
    margin = cv2.bitwise_and(dilated_envelope, cv2.bitwise_not(envelope))
    clean_extended = cv2.inpaint(inpainted, margin, 11, cv2.INPAINT_TELEA)
    clean_extended = cv2.bitwise_and(clean_extended, clean_extended, mask=dilated_envelope)

    s_ys, s_xs = np.where(envelope > 100)
    c_ys, c_xs = np.where(drape_mask > 100)
    s_top_y, s_bot_y = int(s_ys.min()), int(s_ys.max())
    c_top_y, c_bot_y = int(c_ys.min()), int(c_ys.max())

    num_rows, num_cols = 16, 7
    raw_s_l, raw_s_r = [], []
    for r in range(num_rows):
        frac = r / (num_rows - 1)
        sy = int(s_top_y + (s_bot_y - s_top_y) * frac)
        pix = np.where(envelope[sy, :] > 100)[0]
        if len(pix) > 0:
            raw_s_l.append(int(pix.min()))
            raw_s_r.append(int(pix.max()))
        else:
            raw_s_l.append(int(sw * 0.35))
            raw_s_r.append(int(sw * 0.70))

    min_neck_w = int(sw * 0.22)
    if raw_s_r[0] - raw_s_l[0] < min_neck_w:
        m = (raw_s_r[0] + raw_s_l[0]) // 2
        raw_s_l[0] = max(0, m - min_neck_w // 2)
        raw_s_r[0] = min(sw - 1, m + min_neck_w // 2)

    smooth_s_l = np.convolve(raw_s_l, [0.2, 0.6, 0.2], mode='same')
    smooth_s_r = np.convolve(raw_s_r, [0.2, 0.6, 0.2], mode='same')
    smooth_s_l[0], smooth_s_r[0] = raw_s_l[0], raw_s_r[0]
    smooth_s_l[-1], smooth_s_r[-1] = raw_s_l[-1], raw_s_r[-1]

    raw_c_l, raw_c_r = [], []
    for r in range(num_rows):
        frac = r / (num_rows - 1)
        cy = int(c_top_y + (c_bot_y - c_top_y) * frac)
        pix = np.where(drape_mask[cy, :] > 100)[0]
        if len(pix) > 0:
            raw_c_l.append(int(pix.min()))
            raw_c_r.append(int(pix.max()))
        else:
            raw_c_l.append(int(W * 0.35))
            raw_c_r.append(int(W * 0.70))

    smooth_c_l = np.convolve(raw_c_l, [0.15, 0.7, 0.15], mode='same')
    smooth_c_r = np.convolve(raw_c_r, [0.15, 0.7, 0.15], mode='same')
    smooth_c_l[0], smooth_c_r[0] = raw_c_l[0], raw_c_r[0]
    smooth_c_l[-1], smooth_c_r[-1] = raw_c_l[-1], raw_c_r[-1]

    src_pts, dst_pts = [], []
    for r in range(num_rows):
        frac = r / (num_rows - 1)
        sy = int(s_top_y + (s_bot_y - s_top_y) * frac)
        cy = int(c_top_y + (c_bot_y - c_top_y) * frac)
        sl, sr = smooth_s_l[r], smooth_s_r[r]
        cl, cr = smooth_c_l[r], smooth_c_r[r]
        for c in range(num_cols):
            cf = c / (num_cols - 1)
            src_pts.append([sl + (sr - sl) * cf, sy])
            dst_pts.append([cl + (cr - cl) * cf, cy])

    src_pts = np.array(src_pts, dtype=np.float32)
    dst_pts = np.array(dst_pts, dtype=np.float32)

    tri = Delaunay(dst_pts)
    warped_saree = np.zeros((H, W, 3), dtype=np.uint8)
    warped_mask = np.zeros((H, W), dtype=np.uint8)

    for simplex in tri.simplices:
        t_dst, t_src = dst_pts[simplex], src_pts[simplex]
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

        src_patch = clean_extended[r_src[1]:r_src[1] + r_src[3], r_src[0]:r_src[0] + r_src[2]]
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
        valid_crop = mask_crop & (dst_mask_patch[:h_act, :w_act] > 0)
        warped_mask[y:y2, x:x2][valid_crop] = 255

    # Fill any tiny missing pixels
    target_mask = drape_mask.copy()
    is_missing = (target_mask > 0) & ((warped_mask == 0) | ((warped_saree[:, :, 0] < 12) & (warped_saree[:, :, 1] < 12) & (warped_saree[:, :, 2] < 12)))
    if np.sum(is_missing) > 0:
        warped_saree = cv2.inpaint(warped_saree, is_missing.astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA)
        warped_mask[is_missing] = 255

    final_drape_mask = cv2.bitwise_and(warped_mask, target_mask)

    # Lighting & Shading
    cust_lab = cv2.cvtColor(cust, cv2.COLOR_BGR2LAB)
    cust_l = cust_lab[:, :, 0].astype(np.float32)
    smooth_l = cv2.bilateralFilter(cust_l, 15, 90, 90)
    c_l_vals = smooth_l[final_drape_mask > 0]
    med_l = np.median(c_l_vals) if len(c_l_vals) > 0 else 128.0

    if sid == 5:
        l_factor = np.clip(smooth_l / max(1.0, med_l), 0.85, 1.15)[:, :, np.newaxis]
    else:
        l_factor = np.clip(smooth_l / max(1.0, med_l), 0.70, 1.30)[:, :, np.newaxis]

    shaded_saree = (warped_saree.astype(np.float32) * l_factor).clip(0, 255).astype(np.uint8)

    # Composite saree onto customer
    alpha = (cv2.GaussianBlur(final_drape_mask, (7, 7), 0).astype(np.float32) / 255.0)[:, :, np.newaxis]
    comp = (cust.astype(np.float32) * (1.0 - alpha) + shaded_saree.astype(np.float32) * alpha).clip(0, 255).astype(np.uint8)

    # Strict skin-only arms overlay (ZERO clothing overlay)
    pure_skin = cv2.bitwise_and(cust_skin, cv2.bitwise_not(cust_cloth))
    # Forearms zone: strictly between y=0.35H and y=0.43H
    forearms = np.zeros((H, W), dtype=np.uint8)
    forearms[int(H * 0.35):int(H * 0.43), :] = pure_skin[int(H * 0.35):int(H * 0.43), :]

    # Hand landmarks
    hands = np.zeros((H, W), dtype=np.uint8)
    for idx in [15, 16, 17, 18, 19, 20, 21, 22]:
        if lm[idx].visibility > 0.4:
            cx, cy = int(lm[idx].x * W), int(lm[idx].y * H)
            cv2.circle(hands, (cx, cy), 18, 255, -1)
    hands = cv2.bitwise_and(pure_skin, hands)
    arm_overlay = cv2.bitwise_or(forearms, hands)

    arm_alpha = (cv2.GaussianBlur(arm_overlay, (5, 5), 0).astype(np.float32) / 255.0)[:, :, np.newaxis]
    final = (comp.astype(np.float32) * (1.0 - arm_alpha) + cust.astype(np.float32) * arm_alpha).clip(0, 255).astype(np.uint8)

    out_p = DIAG_DIR / f"test_tryon_v3_saree_{sid}.jpg"
    cv2.imwrite(str(out_p), final)
    print(f"Saved {out_p.name} successfully!")

test_tryon(4, "purple_saree_no_hands.jpg")
test_tryon(5, "pink_saree_no_hands.jpg")
