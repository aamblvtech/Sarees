import os
import sys
import time
import platform
import numpy as np
import cv2
from pathlib import Path

from main import (
    get_segmenter,
    get_pose_detector,
    generate_saree_inpainting_mask,
    in_place_saree_clothing_swap,
    SAREES
)

def benchmark_stages(cust_path: str, saree_path: str, runs: int = 5):
    # Ensure models are loaded (warm-up)
    seg = get_segmenter()
    pose = get_pose_detector()
    
    # Warm-up run
    warm_out = "outputs/benchmark_warmup.jpg"
    in_place_saree_clothing_swap(cust_path, saree_path, warm_out)
    if os.path.exists(warm_out):
        os.remove(warm_out)

    stage_timings = {
        "load": [],
        "segment_pose": [],
        "mask_construct": [],
        "garment_extract": [],
        "mesh_warp": [],
        "composite": [],
        "write": [],
        "total_e2e": []
    }

    import mediapipe as mp
    from scipy.spatial import Delaunay

    for run_idx in range(runs):
        t0 = time.perf_counter()

        # 1. Load images
        t_load_start = time.perf_counter()
        cust = cv2.imread(cust_path)
        saree = cv2.imread(saree_path)
        t_load = time.perf_counter() - t_load_start

        H, W = cust.shape[:2]
        sh, sw = saree.shape[:2]

        # 2. Segmentation & pose detection
        t_seg_start = time.perf_counter()
        mp_cust = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(cust, cv2.COLOR_BGR2RGB))
        seg_res = seg.segment(mp_cust)
        cat_mask = cv2.resize(np.squeeze(seg_res.category_mask.numpy_view()), (W, H), interpolation=cv2.INTER_NEAREST)
        pose_res = pose.detect(mp_cust) if pose else None
        t_seg = time.perf_counter() - t_seg_start

        # 3. Mask construction
        t_mask_start = time.perf_counter()
        full_mask = generate_saree_inpainting_mask(cust_path, dilation_px=8)
        t_mask = time.perf_counter() - t_mask_start

        # 4. Reference garment extraction
        t_garm_start = time.perf_counter()
        mp_saree = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(saree, cv2.COLOR_BGR2RGB))
        saree_seg_res = seg.segment(mp_saree)
        saree_cat = cv2.resize(np.squeeze(saree_seg_res.category_mask.numpy_view()), (sw, sh), interpolation=cv2.INTER_NEAREST)
        saree_cloth = (saree_cat == 4).astype(np.uint8) * 255
        saree_cloth[:int(sh * 0.165), :] = 0
        clean_saree = cv2.bitwise_and(saree, saree, mask=saree_cloth)
        t_garm = time.perf_counter() - t_garm_start

        # 5. Mesh generation and warping
        t_warp_start = time.perf_counter()
        s_ys, s_xs = np.where(saree_cloth > 100)
        c_ys, c_xs = np.where(full_mask > 100)
        s_top_y, s_bot_y = int(s_ys.min()), int(s_ys.max())
        c_top_y, c_bot_y = int(c_ys.min()), int(c_ys.max())

        num_rows, num_cols = 16, 7
        src_pts, dst_pts = [], []
        for r in range(num_rows):
            frac = r / (num_rows - 1)
            sy = int(s_top_y + (s_bot_y - s_top_y) * frac)
            cy = int(c_top_y + (c_bot_y - c_top_y) * frac)

            s_row = np.where(saree_cloth[sy, :] > 100)[0]
            s_left = int(s_row.min()) if len(s_row) > 0 else int(sw * 0.35)
            s_right = int(s_row.max()) if len(s_row) > 0 else int(sw * 0.70)

            c_row = np.where(full_mask[cy, :] > 100)[0]
            c_left = int(c_row.min()) if len(c_row) > 0 else int(W * 0.35)
            c_right = int(c_row.max()) if len(c_row) > 0 else int(W * 0.70)

            for c in range(num_cols):
                col_frac = c / (num_cols - 1)
                src_pts.append([s_left + (s_right - s_left) * col_frac, sy])
                dst_pts.append([c_left + (c_right - c_left) * col_frac, cy])

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
            if src_patch.shape[0] == 0 or src_patch.shape[1] == 0:
                continue

            dst_patch = cv2.warpAffine(src_patch, warp_mat, (r_dst[2], r_dst[3]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
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

        t_warp = time.perf_counter() - t_warp_start

        # 6. Compositing & lighting
        t_comp_start = time.perf_counter()
        target_mask = full_mask.copy()
        missing_pixels = cv2.bitwise_and(target_mask, cv2.bitwise_not(warped_mask))
        if np.sum(missing_pixels > 0) > 0:
            warped_saree = cv2.inpaint(warped_saree, missing_pixels, 5, cv2.INPAINT_TELEA)

        final_drape_mask = cv2.bitwise_and(warped_mask, target_mask)

        cust_lab = cv2.cvtColor(cust, cv2.COLOR_BGR2LAB)
        cust_l = cust_lab[:, :, 0].astype(np.float32)
        smooth_l = cv2.bilateralFilter(cust_l, 9, 75, 75)
        c_l_vals = smooth_l[final_drape_mask > 0]
        med_l = np.median(c_l_vals) if len(c_l_vals) > 0 else 128.0
        l_factor = np.clip(smooth_l / max(1.0, med_l), 0.70, 1.30)[:, :, np.newaxis]
        shaded_saree = (warped_saree.astype(np.float32) * l_factor).clip(0, 255).astype(np.uint8)

        alpha = (cv2.GaussianBlur(final_drape_mask, (7, 7), 0).astype(np.float32) / 255.0)[:, :, np.newaxis]
        final_comp = (cust.astype(np.float32) * (1.0 - alpha) + shaded_saree.astype(np.float32) * alpha).clip(0, 255).astype(np.uint8)

        cust_skin = (cat_mask == 2).astype(np.uint8) * 255
        arms_skin = np.zeros((H, W), dtype=np.uint8)
        arms_skin[int(H * 0.35):int(H * 0.58), :] = cust_skin[int(H * 0.35):int(H * 0.58), :]
        arms_protect = cv2.dilate(arms_skin, np.ones((5, 5), np.uint8))
        if np.sum(arms_protect > 0) > 100:
            alpha_arms = (cv2.GaussianBlur(arms_protect, (7, 7), 0).astype(np.float32) / 255.0)[:, :, np.newaxis]
            final_comp = (final_comp.astype(np.float32) * (1.0 - alpha_arms) + cust.astype(np.float32) * alpha_arms).clip(0, 255).astype(np.uint8)

        t_comp = time.perf_counter() - t_comp_start

        # 7. File write
        t_write_start = time.perf_counter()
        test_out = f"outputs/bench_run_{run_idx}.jpg"
        cv2.imwrite(test_out, final_comp)
        t_write = time.perf_counter() - t_write_start
        if os.path.exists(test_out):
            os.remove(test_out)

        t_e2e = time.perf_counter() - t0

        stage_timings["load"].append(t_load)
        stage_timings["segment_pose"].append(t_seg)
        stage_timings["mask_construct"].append(t_mask)
        stage_timings["garment_extract"].append(t_garm)
        stage_timings["mesh_warp"].append(t_warp)
        stage_timings["composite"].append(t_comp)
        stage_timings["write"].append(t_write)
        stage_timings["total_e2e"].append(t_e2e)

    return stage_timings

if __name__ == "__main__":
    cust_path = "images/customer_jeans_model.jpg"
    saree_path = "images/red-saree.jpg"
    print("Running Monotonic Performance Benchmark (5 runs)...")
    res = benchmark_stages(cust_path, saree_path, runs=5)

    print("\n=== DETAILED STAGE TIMINGS (in seconds) ===")
    for stage, times in res.items():
        arr = np.array(times)
        print(f"  {stage:<16}: Median = {np.median(arr):.4f}s | Mean = {np.mean(arr):.4f}s | Min = {np.min(arr):.4f}s | Max = {np.max(arr):.4f}s")
