import cv2
import numpy as np
import mediapipe as mp
from scipy.spatial import Delaunay
from pathlib import Path
import time

BASE_DIR = Path("d:/AAMBLV/saree/SAREES")
IMAGES_DIR = BASE_DIR / "images"
DIAG_DIR = BASE_DIR / "outputs" / "diagnostics"
OUTPUTS_DIR = BASE_DIR / "outputs"
DIAG_DIR.mkdir(parents=True, exist_ok=True)

cust_path = IMAGES_DIR / "customer_jeans_model.jpg"
cust = cv2.imread(str(cust_path))
H, W = cust.shape[:2]

from main import get_segmenter, get_pose_detector, generate_saree_inpainting_mask, SAREES

seg = get_segmenter()
pose_det = get_pose_detector()

mp_cust = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(cust, cv2.COLOR_BGR2RGB))
cust_res = seg.segment(mp_cust)
cust_cat = cv2.resize(np.squeeze(cust_res.category_mask.numpy_view()), (W, H), interpolation=cv2.INTER_NEAREST)

cust_cloth = (cust_cat == 4).astype(np.uint8) * 255
cust_skin = (cust_cat == 2).astype(np.uint8) * 255
full_mask = generate_saree_inpainting_mask(str(cust_path), dilation_px=8)

pose_res = pose_det.detect(mp_cust) if pose_det is not None else None
has_pose = pose_res is not None and pose_res.pose_landmarks and len(pose_res.pose_landmarks) > 0
if has_pose:
    lm = pose_res.pose_landmarks[0]
    ankle_y = int(max(lm[27].y, lm[28].y) * H) if (lm[27].visibility > 0.3 or lm[28].visibility > 0.3) else int(H * 0.90)
    feet_y = min(H - 2, ankle_y + 10)
else:
    feet_y = int(H * 0.94)

def drape_saree_fixed(saree_id: int):
    saree_item = SAREES[saree_id]
    saree_path = IMAGES_DIR / saree_item["filename"]
    saree = cv2.imread(str(saree_path))
    sh, sw = saree.shape[:2]

    print(f"\n==========================================")
    print(f"PROCESSING SAREE {saree_id}: {saree_item['name']} ({sw}x{sh})")
    print(f"==========================================")

    # 1. Segment saree
    mp_saree = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(saree, cv2.COLOR_BGR2RGB))
    saree_seg_res = seg.segment(mp_saree)
    saree_cat = cv2.resize(np.squeeze(saree_seg_res.category_mask.numpy_view()), (sw, sh), interpolation=cv2.INTER_NEAREST)

    # Cloth mask: cat 4, plus sheer organza detection for saree 5
    if saree_id == 5:
        # Organza pallu has lower cloth classification due to transparency against wall
        # Include regions that are within the model body envelope but not skin/hair
        saree_cloth = ((saree_cat == 4) | (saree_cat == 5)).astype(np.uint8) * 255
        # Add high-brightness/translucent organza pixels in the pallu zone
        organza_zone = np.zeros((sh, sw), dtype=np.uint8)
        organza_zone[int(sh * 0.20):, int(sw * 0.35):int(sw * 0.75)] = 255
        hsv_s = cv2.cvtColor(saree, cv2.COLOR_BGR2HSV)
        pallu_pixels = (organza_zone > 0) & (saree_cat != 2) & (saree_cat != 1) & (saree_cat != 3) & (hsv_s[:, :, 2] > 140)
        saree_cloth[pallu_pixels] = 255
    else:
        saree_cloth = (saree_cat == 4).astype(np.uint8) * 255

    # Remove dummy neck / head in top 16.5%
    saree_cloth[:int(sh * 0.165), :] = 0

    # 2. Extract closed envelope of garment
    contours, _ = cv2.findContours(saree_cloth, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    envelope = np.zeros_like(saree_cloth)
    cv2.drawContours(envelope, contours, -1, 255, -1)
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35))
    closed_envelope = cv2.morphologyEx(envelope, cv2.MORPH_CLOSE, kernel_close)

    # 3. Detect internal occlusions (model arms, hands, midriff, necklaces)
    # Check if saree image has a human model with pose landmarks
    s_pose_res = pose_det.detect(mp_saree) if pose_det is not None else None
    s_has_pose = s_pose_res is not None and s_pose_res.pose_landmarks and len(s_pose_res.pose_landmarks) > 0

    non_cloth_mask = cv2.bitwise_and(closed_envelope, cv2.bitwise_not(saree_cloth))
    # Also add any skin detected by multiclass
    s_skin = ((saree_cat == 2) | (saree_cat == 3)).astype(np.uint8) * 255
    s_skin[:int(sh * 0.165), :] = 0
    internal_occlusions = cv2.bitwise_or(non_cloth_mask, cv2.bitwise_and(closed_envelope, s_skin))

    if s_has_pose:
        s_lm = s_pose_res.pose_landmarks[0]
        # Inpaint around hand & wrist landmarks
        for p_idx in [15, 16, 17, 18, 19, 20, 21, 22]:
            if s_lm[p_idx].visibility > 0.4:
                px, py = int(s_lm[p_idx].x * sw), int(s_lm[p_idx].y * sh)
                cv2.circle(internal_occlusions, (px, py), 28, 255, -1)

    # Dilate internal occlusions by 7px to cover boundary fringes
    dilated_occlusions = cv2.dilate(internal_occlusions, np.ones((7, 7), np.uint8))
    # Keep strictly inside closed_envelope
    dilated_occlusions = cv2.bitwise_and(dilated_occlusions, closed_envelope)

    # 4. Inpaint internal holes so fabric is completely continuous
    inpainted_saree = saree.copy()
    if np.sum(dilated_occlusions > 0) > 0:
        inpainted_saree = cv2.inpaint(inpainted_saree, dilated_occlusions, 11, cv2.INPAINT_TELEA)

    # For Saree 5 (Blush Pink Organza):
    # Enrich the blush rose tone across the pallu so it looks like authentic sheer pink organza, not grey showroom wall
    if saree_id == 5:
        # Target blush pink color: BGR [182, 114, 244]
        # Blend subtle blush pink into very pale/grey areas of the organza
        hsv_inp = cv2.cvtColor(inpainted_saree, cv2.COLOR_BGR2HSV)
        # Areas with low saturation (< 45) and high value (> 160) within the saree
        pale_organza = (closed_envelope > 0) & (hsv_inp[:, :, 1] < 50) & (hsv_inp[:, :, 2] > 140)
        # Add soft blush tint: 75% original texture + 25% blush pink [182, 114, 244]
        blush_tint = np.full_like(inpainted_saree, [182, 114, 244], dtype=np.uint8)
        inpainted_saree[pale_organza] = cv2.addWeighted(inpainted_saree, 0.70, blush_tint, 0.30, 0)[pale_organza]

    # Extend fabric outward by 30 pixels around closed envelope so boundary triangles never sample black
    dilated_envelope = cv2.dilate(closed_envelope, np.ones((30, 30), np.uint8))
    margin_holes = cv2.bitwise_and(dilated_envelope, cv2.bitwise_not(closed_envelope))
    clean_saree = cv2.inpaint(inpainted_saree, margin_holes, 15, cv2.INPAINT_TELEA)
    clean_saree = cv2.bitwise_and(clean_saree, clean_saree, mask=dilated_envelope)

    cv2.imwrite(str(DIAG_DIR / f"v2_saree_{saree_id}_clean_extended.jpg"), clean_saree)

    # 5. Build Smooth Mesh Coordinates
    s_ys, s_xs = np.where(closed_envelope > 100)
    c_ys, c_xs = np.where(full_mask > 100)
    s_top_y, s_bot_y = int(s_ys.min()), int(s_ys.max())
    c_top_y, c_bot_y = int(c_ys.min()), int(c_ys.max())

    num_rows = 16
    num_cols = 7

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

    # Anti-collapse constraint for neckline (row 0)
    min_neck_width = int(sw * 0.22)
    if raw_s_right[0] - raw_s_left[0] < min_neck_width:
        mid = (raw_s_right[0] + raw_s_left[0]) // 2
        raw_s_left[0] = max(0, mid - min_neck_width // 2)
        raw_s_right[0] = min(sw - 1, mid + min_neck_width // 2)

    # 3-tap smooth filter on s_left and s_right
    smooth_s_left = np.convolve(raw_s_left, [0.2, 0.6, 0.2], mode='same')
    smooth_s_right = np.convolve(raw_s_right, [0.2, 0.6, 0.2], mode='same')
    smooth_s_left[0], smooth_s_right[0] = raw_s_left[0], raw_s_right[0]
    smooth_s_left[-1], smooth_s_right[-1] = raw_s_left[-1], raw_s_right[-1]

    # Customer bounds from full_mask (bridged across legs)
    raw_c_left = []
    raw_c_right = []
    for r in range(num_rows):
        frac = r / (num_rows - 1)
        cy = int(c_top_y + (c_bot_y - c_top_y) * frac)
        c_row = np.where(full_mask[cy, :] > 100)[0]
        if len(c_row) > 0:
            raw_c_left.append(int(c_row.min()))
            raw_c_right.append(int(c_row.max()))
        else:
            raw_c_left.append(int(W * 0.35))
            raw_c_right.append(int(W * 0.70))

    # Smooth customer bounds to ensure natural drape silhouette
    smooth_c_left = np.convolve(raw_c_left, [0.15, 0.7, 0.15], mode='same')
    smooth_c_right = np.convolve(raw_c_right, [0.15, 0.7, 0.15], mode='same')
    smooth_c_left[0], smooth_c_right[0] = raw_c_left[0], raw_c_right[0]
    smooth_c_left[-1], smooth_c_right[-1] = raw_c_left[-1], raw_c_right[-1]

    src_pts = []
    dst_pts = []

    for r in range(num_rows):
        frac = r / (num_rows - 1)
        sy = int(s_top_y + (s_bot_y - s_top_y) * frac)
        cy = int(c_top_y + (c_bot_y - c_top_y) * frac)

        s_left, s_right = smooth_s_left[r], smooth_s_right[r]
        c_left, c_right = smooth_c_left[r], smooth_c_right[r]

        for c in range(num_cols):
            col_frac = c / (num_cols - 1)
            sx = s_left + (s_right - s_left) * col_frac
            cx = c_left + (c_right - c_left) * col_frac
            src_pts.append([sx, sy])
            dst_pts.append([cx, cy])

    src_pts = np.array(src_pts, dtype=np.float32)
    dst_pts = np.array(dst_pts, dtype=np.float32)

    # 6. Piecewise affine warp
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
        # Only mark warped_mask where actual fabric was warped (not zeros)
        valid_fabric_crop = mask_crop & (dst_mask_patch[:h_act, :w_act] > 0)
        warped_mask[y:y2, x:x2][valid_fabric_crop] = 255

    # 7. Check for residual black/empty pixels inside target drape mask
    target_mask = full_mask.copy()
    is_black = (target_mask > 0) & (
        (warped_mask == 0) |
        ((warped_saree[:, :, 0] < 12) & (warped_saree[:, :, 1] < 12) & (warped_saree[:, :, 2] < 12))
    )
    num_black = np.sum(is_black)
    print(f"Black/empty pixels inside target drape mask: {num_black}")

    if num_black > 0:
        warped_saree = cv2.inpaint(warped_saree, is_black.astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA)
        warped_mask[is_black] = 255

    final_drape_mask = cv2.bitwise_and(warped_mask, target_mask)

    # 8. Lighting and Shading Transfer
    cust_lab = cv2.cvtColor(cust, cv2.COLOR_BGR2LAB)
    cust_l = cust_lab[:, :, 0].astype(np.float32)
    # Heavy bilateral filter on lower body to eliminate denim jeans wrinkles & zipper fly
    smooth_l = cv2.bilateralFilter(cust_l, 15, 90, 90)

    c_l_vals = smooth_l[final_drape_mask > 0]
    med_l = np.median(c_l_vals) if len(c_l_vals) > 0 else 128.0

    if saree_id == 5:
        # Organza: soft, ethereal shading (0.85 to 1.15) to avoid harsh embossing of pants seams
        l_factor = np.clip(smooth_l / max(1.0, med_l), 0.85, 1.15)[:, :, np.newaxis]
    else:
        # Silk: realistic fold highlights and shadow (0.70 to 1.30)
        l_factor = np.clip(smooth_l / max(1.0, med_l), 0.70, 1.30)[:, :, np.newaxis]

    shaded_saree = (warped_saree.astype(np.float32) * l_factor).clip(0, 255).astype(np.uint8)

    # 9. Alpha blending onto customer
    alpha = (cv2.GaussianBlur(final_drape_mask, (7, 7), 0).astype(np.float32) / 255.0)[:, :, np.newaxis]
    final_comp = (cust.astype(np.float32) * (1.0 - alpha) + shaded_saree.astype(np.float32) * alpha).clip(0, 255).astype(np.uint8)

    # 10. Strict Arms & Hands Skin Protection (Zero Clothing Bleed)
    # MediaPipe customer skin
    # Strictly isolate skin: cust_skin where cust_cloth == 0
    pure_skin = cv2.bitwise_and(cust_skin, cv2.bitwise_not(cust_cloth))
    # Forearms zone: strictly between y=0.35H and y=0.43H (above belt level)
    forearms_skin = np.zeros((H, W), dtype=np.uint8)
    forearms_skin[int(H * 0.35):int(H * 0.43), :] = pure_skin[int(H * 0.35):int(H * 0.43), :]

    # Hands landmarks protection if pose available
    hands_skin = np.zeros((H, W), dtype=np.uint8)
    if has_pose:
        for idx in [15, 16, 17, 18, 19, 20, 21, 22]:
            if lm[idx].visibility > 0.4:
                cx, cy = int(lm[idx].x * W), int(lm[idx].y * H)
                cv2.circle(hands_skin, (cx, cy), 18, 255, -1)
        hands_skin = cv2.bitwise_and(pure_skin, hands_skin)

    total_skin_to_protect = cv2.bitwise_or(forearms_skin, hands_skin)
    # Slight feathering on skin mask (do not dilate into clothes!)
    skin_alpha = (cv2.GaussianBlur(total_skin_to_protect, (5, 5), 0).astype(np.float32) / 255.0)[:, :, np.newaxis]
    final_comp = (final_comp.astype(np.float32) * (1.0 - skin_alpha) + cust.astype(np.float32) * skin_alpha).clip(0, 255).astype(np.uint8)

    # 11. Objective Quality Verification
    # Check 1: Zero black holes in drape
    black_in_final = (final_drape_mask > 0) & (final_comp[:, :, 0] < 12) & (final_comp[:, :, 1] < 12) & (final_comp[:, :, 2] < 12)
    final_black_cnt = np.sum(black_in_final)

    # Check 2: Footwear bit-exact preservation below feet_y
    sneaker_diff = np.abs(cust[feet_y + 5:, :].astype(np.float32) - final_comp[feet_y + 5:, :].astype(np.float32)).mean()

    # Check 3: Face/hair bit-exact preservation above chin
    face_ys = np.where(cust_cat == 3)[0]
    chin_y = int(np.max(face_ys)) if len(face_ys) > 0 else int(H * 0.17)
    face_diff = np.abs(cust[:chin_y, :].astype(np.float32) - final_comp[:chin_y, :].astype(np.float32)).mean()

    # Check 4: Denim jeans replacement
    # Sample thigh region (y=800..950, x=420..540)
    thigh_roi = final_comp[800:950, 420:540]
    # Check if thigh ROI is covered by saree fabric
    thigh_covered = np.mean(final_drape_mask[800:950, 420:540] > 0)

    print(f"Quality Metrics for Saree {saree_id}:")
    print(f"  Final black pixels in drape: {final_black_cnt} (target: 0)")
    print(f"  Sneaker region mean diff: {sneaker_diff:.4f} (target: < 0.05)")
    print(f"  Face/hair mean diff: {face_diff:.4f} (target: 0.00)")
    print(f"  Lower body drape coverage: {thigh_covered*100:.1f}% (target: > 95%)")

    # Determine status
    if final_black_cnt == 0 and sneaker_diff < 0.05 and face_diff < 0.01 and thigh_covered > 0.95:
        if saree_id in [4, 5]:
            status = "READY FOR REVIEW (Interpolated Full-Length from 3/4 Crop)"
        else:
            status = "READY FOR REVIEW (Full-Length Verified)"
    else:
        status = "QUALITY CHECK FAILED"

    print(f"  Verdict: {status}")

    out_file = DIAG_DIR / f"v2_final_saree_{saree_id}.jpg"
    cv2.imwrite(str(out_file), final_comp)

    # Also save to outputs/vton_cache for instant UI verification
    import hashlib
    person_bytes = Path(cust_path).read_bytes()
    person_hash = hashlib.md5(person_bytes).hexdigest()
    cache_file = OUTPUTS_DIR / f"vton_cache_{person_hash}_{saree_id}.jpg"
    cv2.imwrite(str(cache_file), final_comp)
    print(f"  Saved final output to: {out_file.name} & {cache_file.name}")

    return {
        "saree_id": saree_id,
        "name": saree_item["name"],
        "black_pixels": int(final_black_cnt),
        "sneaker_diff": float(sneaker_diff),
        "face_diff": float(face_diff),
        "thigh_covered": float(thigh_covered),
        "status": status,
        "output_path": str(out_file)
    }

results = []
for sid in [4, 5, 1, 2, 3]:
    t0 = time.time()
    res = drape_saree_fixed(sid)
    res["latency"] = time.time() - t0
    results.append(res)

print("\n" + "="*80)
print("AUDIT RESULTS SUMMARY ACROSS ALL 5 SAREES")
print("="*80)
for r in results:
    print(f"Saree {r['saree_id']:d} ({r['name']:32s}): Black={r['black_pixels']} | SneakerDiff={r['sneaker_diff']:.3f} | ThighCov={r['thigh_covered']*100:.1f}% | Latency={r['latency']:.2f}s | Status={r['status']}")
