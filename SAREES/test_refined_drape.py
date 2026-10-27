import cv2
import numpy as np
from scipy.spatial import Delaunay
import mediapipe as mp
from main import get_segmenter, get_pose_detector

def drape_saree_full(cust_path, saree_path, out_path):
    cust = cv2.imread(cust_path)
    saree = cv2.imread(saree_path)
    if cust is None or saree is None:
        print("Failed to read image")
        return False

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

    # Pose landmarks
    pose_res = pose_det.detect(mp_cust)
    lm = pose_res.pose_landmarks[0] if (pose_res and pose_res.pose_landmarks) else None

    # Segment saree
    mp_saree = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(saree, cv2.COLOR_BGR2RGB))
    saree_seg_res = seg.segment(mp_saree)
    saree_cat = cv2.resize(np.squeeze(saree_seg_res.category_mask.numpy_view()), (sw, sh), interpolation=cv2.INTER_NEAREST)
    saree_cloth = (saree_cat == 4).astype(np.uint8) * 255
    # Remove mannequin neck
    saree_cloth[:int(sh * 0.16), :] = 0

    s_ys, s_xs = np.where(saree_cloth > 100)
    c_ys, c_xs = np.where(cust_cloth > 100)

    s_top_y, s_bot_y = int(s_ys.min()), int(s_ys.max())
    c_top_y, c_bot_y = int(c_ys.min()), int(c_ys.max())

    # Build dense 16x7 grid (112 control points) along actual garment contours
    num_rows = 16
    num_cols = 7

    src_pts = []
    dst_pts = []

    for r in range(num_rows):
        frac = r / (num_rows - 1)
        sy = int(s_top_y + (s_bot_y - s_top_y) * frac)
        cy = int(c_top_y + (c_bot_y - c_top_y) * frac)

        # Saree slice bounds
        s_row = np.where(saree_cloth[sy, :] > 100)[0]
        if len(s_row) > 0:
            s_left = int(s_row.min())
            s_right = int(s_row.max())
        else:
            s_left = int(sw * 0.35)
            s_right = int(sw * 0.70)

        # Expand top saree row to full shoulder width
        if r < 3:
            s_mid = (s_left + s_right) / 2.0
            s_w = max(s_right - s_left, int(sw * 0.38))
            s_left = max(0, int(s_mid - s_w * 0.55))
            s_right = min(sw - 1, int(s_mid + s_w * 0.55))

        # Customer slice bounds
        c_row = np.where(cust_cloth[cy, :] > 100)[0]
        if len(c_row) > 0:
            c_left = int(c_row.min())
            c_right = int(c_row.max())
        else:
            c_left = int(W * 0.35)
            c_right = int(W * 0.70)

        # Expand slightly by 10px so warped saree completely encloses clothing edge
        c_left = max(0, c_left - 10)
        c_right = min(W - 1, c_right + 10)

        for c in range(num_cols):
            col_frac = c / (num_cols - 1)
            sx = s_left + (s_right - s_left) * col_frac
            cx = c_left + (c_right - c_left) * col_frac

            src_pts.append([sx, sy])
            dst_pts.append([cx, cy])

    src_pts = np.array(src_pts, dtype=np.float32)
    dst_pts = np.array(dst_pts, dtype=np.float32)

    # Piecewise affine warp
    tri = Delaunay(dst_pts)
    warped_saree = np.zeros((H, W, 3), dtype=np.uint8)
    warped_mask = np.zeros((H, W), dtype=np.uint8)

    # Use clean saree without background
    clean_saree = saree.copy()

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
        warped_mask[y:y2, x:x2][mask_crop] = 255

    # Strictly protect face, neck skin, arms, hands
    protect_skin = cv2.dilate((cust_skin > 100).astype(np.uint8) * 255, np.ones((5, 5), np.uint8))
    protect_head = cv2.dilate(((cust_face > 100) | (cust_hair > 100)).astype(np.uint8) * 255, np.ones((9, 9), np.uint8))

    # Target clothing region: customer clothing excluding protected skin and head
    target_mask = cust_cloth.copy()
    target_mask[protect_skin > 0] = 0
    target_mask[protect_head > 0] = 0

    # Ensure warped saree covers all target clothing
    missing_pixels = cv2.bitwise_and(target_mask, cv2.bitwise_not(warped_mask))
    if np.sum(missing_pixels > 0) > 0:
        warped_saree = cv2.inpaint(warped_saree, missing_pixels, 5, cv2.INPAINT_TELEA)

    # Zero out warped saree outside target mask to protect background and skin 100%
    final_drape_mask = cv2.bitwise_and(warped_mask, target_mask)

    # Realistic Shading Transfer:
    # Transfer the 3D natural shadow and folds of the customer's clothing into the saree!
    cust_lab = cv2.cvtColor(cust, cv2.COLOR_BGR2LAB)
    cust_l = cust_lab[:, :, 0].astype(np.float32)
    smooth_l = cv2.bilateralFilter(cust_l, 9, 75, 75)
    
    # Clothing median luminance
    c_l_vals = smooth_l[final_drape_mask > 0]
    med_l = np.median(c_l_vals) if len(c_l_vals) > 0 else 128.0
    l_factor = np.clip(smooth_l / max(1.0, med_l), 0.65, 1.35)[:, :, np.newaxis]

    shaded_saree = (warped_saree.astype(np.float32) * l_factor).clip(0, 255).astype(np.uint8)

    # Alpha composite
    alpha = (cv2.GaussianBlur(final_drape_mask, (9, 9), 0).astype(np.float32) / 255.0)[:, :, np.newaxis]
    comp = (cust.astype(np.float32) * (1.0 - alpha) + shaded_saree.astype(np.float32) * alpha).clip(0, 255).astype(np.uint8)

    cv2.imwrite(out_path, comp)
    print("Refined drape saved to:", out_path)
    return True

if __name__ == '__main__':
    drape_saree_full('images/customer_jeans_model.jpg', 'images/red-saree.jpg', 'outputs/refined_red_drape.jpg')
    drape_saree_full('images/customer_jeans_model.jpg', 'images/blue-saree.jpg', 'outputs/refined_blue_drape.jpg')
    drape_saree_full('images/customer_jeans_model.jpg', 'images/green-saree.jpg', 'outputs/refined_green_drape.jpg')
