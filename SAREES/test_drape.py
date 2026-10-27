import cv2
import numpy as np
from scipy.spatial import Delaunay
import mediapipe as mp
from main import get_segmenter, get_pose_detector, extract_saree_keypoints

def test_full_drape(cust_path, saree_path, out_path):
    cust = cv2.imread(cust_path)
    saree = cv2.imread(saree_path)
    H, W = cust.shape[:2]
    sh, sw = saree.shape[:2]

    seg = get_segmenter()
    pose_det = get_pose_detector()

    # Segment customer
    mp_cust = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(cust, cv2.COLOR_BGR2RGB))
    seg_res = seg.segment(mp_cust)
    cat_mask = cv2.resize(np.squeeze(seg_res.category_mask.numpy_view()), (W, H), interpolation=cv2.INTER_NEAREST)

    cust_cloth = (cat_mask == 4).astype(np.uint8) * 255
    cust_skin = (cat_mask == 2).astype(np.uint8) * 255
    cust_face = (cat_mask == 3).astype(np.uint8) * 255
    cust_hair = (cat_mask == 1).astype(np.uint8) * 255

    # Segment saree
    mp_saree = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(saree, cv2.COLOR_BGR2RGB))
    saree_seg_res = seg.segment(mp_saree)
    saree_cat = cv2.resize(np.squeeze(saree_seg_res.category_mask.numpy_view()), (sw, sh), interpolation=cv2.INTER_NEAREST)
    saree_cloth = (saree_cat == 4).astype(np.uint8) * 255
    # Remove mannequin neck from top
    saree_cloth[:int(sh * 0.15), :] = 0

    # Get bounds
    s_ys, s_xs = np.where(saree_cloth > 100)
    c_ys, c_xs = np.where(cust_cloth > 100)

    s_top_y, s_bot_y = int(s_ys.min()), int(s_ys.max())
    c_top_y, c_bot_y = int(c_ys.min()), int(c_ys.max())

    print(f"Customer clothing Y: {c_top_y} to {c_bot_y}")
    print(f"Saree clothing Y: {s_top_y} to {s_bot_y}")

    # Build anatomical slice grid
    # Slices from top to bottom
    num_rows = 12
    num_cols = 5 # 5 points per horizontal slice (left, 25%, center, 75%, right)

    src_pts = []
    dst_pts = []

    for r in range(num_rows):
        frac = r / (num_rows - 1)
        # Saree slice
        sy = int(s_top_y + (s_bot_y - s_top_y) * frac)
        s_row = np.where(saree_cloth[sy, :] > 100)[0]
        if len(s_row) == 0:
            s_left = int(sw * 0.35)
            s_right = int(sw * 0.70)
        else:
            s_left = int(s_row.min())
            s_right = int(s_row.max())

        # Customer slice
        cy = int(c_top_y + (c_bot_y - c_top_y) * frac)
        c_row = np.where(cust_cloth[cy, :] > 100)[0]
        if len(c_row) == 0:
            c_left = int(W * 0.35)
            c_right = int(W * 0.70)
        else:
            c_left = int(c_row.min())
            c_right = int(c_row.max())

        for c in range(num_cols):
            col_frac = c / (num_cols - 1)
            sx = s_left + (s_right - s_left) * col_frac
            cx = c_left + (c_right - c_left) * col_frac

            src_pts.append([sx, sy])
            dst_pts.append([cx, cy])

    src_pts = np.array(src_pts, dtype=np.float32)
    dst_pts = np.array(dst_pts, dtype=np.float32)

    print(f"Generated {len(src_pts)} control points.")

    # Piecewise affine warp using Delaunay
    tri = Delaunay(dst_pts)
    warped_saree = np.zeros((H, W, 3), dtype=np.uint8)
    warped_mask = np.zeros((H, W), dtype=np.uint8)

    clean_saree = cv2.bitwise_and(saree, saree, mask=saree_cloth)

    for simplex in tri.simplices:
        t_dst = dst_pts[simplex]
        t_src = src_pts[simplex]

        r_dst = cv2.boundingRect(np.float32([t_dst]))
        r_src = cv2.boundingRect(np.float32([t_src]))
        if r_dst[2] <= 0 or r_dst[3] <= 0 or r_src[2] <= 0 or r_src[3] <= 0:
            continue

        t_dst_rect = [(p[0] - r_dst[0], p[1] - r_dst[1]) for p in t_dst]
        t_src_rect = [(p[0] - r_src[0], p[1] - r_src[1]) for p in t_src]

        warp_mat = cv2.getAffineTransform(np.float32(t_src_rect), np.float32(t_dst_rect))

        src_patch = clean_saree[r_src[1]:r_src[1] + r_src[3], r_src[0]:r_src[0] + r_src[2]]
        src_mask_patch = saree_cloth[r_src[1]:r_src[1] + r_src[3], r_src[0]:r_src[0] + r_src[2]]
        if src_patch.shape[0] == 0 or src_patch.shape[1] == 0:
            continue

        dst_patch = cv2.warpAffine(src_patch, warp_mat, (r_dst[2], r_dst[3]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
        dst_mask_patch = cv2.warpAffine(src_mask_patch, warp_mat, (r_dst[2], r_dst[3]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

        tri_mask = np.zeros((r_dst[3], r_dst[2]), dtype=np.uint8)
        cv2.fillConvexPoly(tri_mask, np.int32(t_dst_rect), 255)

        x, y, w, h = r_dst
        x2, y2 = min(W, x + w), min(H, y + h)
        w_act, h_act = x2 - x, y2 - y
        if w_act <= 0 or h_act <= 0:
            continue

        mask_crop = (tri_mask[:h_act, :w_act] > 0)
        warped_saree[y:y2, x:x2][mask_crop] = dst_patch[:h_act, :w_act][mask_crop]
        warped_mask[y:y2, x:x2][mask_crop] = dst_mask_patch[:h_act, :w_act][mask_crop]

    # Target mask: everywhere customer has clothes, strictly protected against face, hair, and bare skin
    target_cloth = cust_cloth.copy()
    protect_skin = cv2.dilate((cust_skin > 100).astype(np.uint8) * 255, np.ones((7, 7), np.uint8))
    protect_head = cv2.dilate(((cust_face > 100) | (cust_hair > 100)).astype(np.uint8) * 255, np.ones((11, 11), np.uint8))
    target_cloth[protect_skin > 0] = 0
    target_cloth[protect_head > 0] = 0

    # Combine warped mask with target cloth
    combined_mask = cv2.bitwise_and(warped_mask, target_cloth)
    # Fill any interior gaps within the target cloth using the warped saree texture
    combined_mask[target_cloth > 0] = 255

    # Realistic lighting and folds: modulate using customer's natural ambient shadow and fabric folds
    cust_gray = cv2.cvtColor(cust, cv2.COLOR_BGR2GRAY).astype(np.float32)
    smooth_cust = cv2.bilateralFilter(cust_gray, 9, 75, 75)
    cloth_brightness = np.median(smooth_cust[target_cloth > 0]) if np.sum(target_cloth > 0) > 0 else 128.0
    norm_shading = np.clip(smooth_cust / max(1.0, cloth_brightness), 0.70, 1.30)[:, :, np.newaxis]

    saree_shaded = (warped_saree.astype(np.float32) * norm_shading).clip(0, 255).astype(np.uint8)

    # Feather edges
    alpha = (cv2.GaussianBlur(combined_mask, (15, 15), 0).astype(np.float32) / 255.0)[:, :, np.newaxis]
    final_comp = (cust.astype(np.float32) * (1.0 - alpha) + saree_shaded.astype(np.float32) * alpha).clip(0, 255).astype(np.uint8)

    cv2.imwrite(out_path, final_comp)
    print(f"Saved to {out_path} successfully!")

if __name__ == '__main__':
    test_full_drape('images/customer_jeans_model.jpg', 'images/red-saree.jpg', 'outputs/test_grid_red.jpg')
