"""
Curated Saree Dataset Generator (Phase 1)
Builds canonical, authentic training/val/test dataset for Saree-Specific Virtual Try-On:
- Strictly excludes every mismatched person-image, target-image, and saree-caption pair.
- Excludes jeans-wearing customer images from the training ground truth.
- Pairs Priya and Ananya with their genuine drape photos (Red Saree 1, Blue Saree 2, Green Saree 3).
- Uses Saree Mask Engine V2 with sleeve correction and strict skin protection.
- Keeps held-out test samples (Saree 5: Blush Pink Organza) strictly isolated in the test split.
- Writes to training/data/dataset_curated.json without modifying dataset.json.
"""

import os
import sys
import json
import logging
from pathlib import Path
import cv2
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR / "training" / "scripts"))

from saree_mask_engine_v2 import generate_corrected_saree_mask, get_segmenter, get_pose_detector

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("saree-curated-dataset-builder")


def build_curated_dataset():
    sarees_dir = BASE_DIR / "SAREES"
    images_dir = sarees_dir / "images"
    proc_dir = BASE_DIR / "training" / "data" / "processed_curated"
    proc_dir.mkdir(parents=True, exist_ok=True)

    segmenter = get_segmenter()
    pose_detector = get_pose_detector()

    # Catalog definitions
    catalog_sarees = {
        1: {
            "name": "Traditional Crimson Silk Saree",
            "garment_file": "red-saree.jpg",
            "priya_drape": "drape_model1_saree1.jpg",
            "ananya_drape": "drape_model2_saree1.jpg",
            "fabric": "banarasi_silk",
            "opacity": "opaque",
            "caption": "Photorealistic full-body portrait of a woman draped in an authentic Traditional Crimson Banarasi Silk Saree, intricate golden floral zari embroidery along borders and pallu, matching red blouse, pleated full-length lower saree down to ankles",
            "split": "train"
        },
        2: {
            "name": "Peacock Royal Blue Saree",
            "garment_file": "blue-saree.jpg",
            "priya_drape": "drape_model1_saree2.jpg",
            "ananya_drape": "drape_model2_saree2.jpg",
            "fabric": "chiffon_georgette",
            "opacity": "opaque",
            "caption": "Photorealistic full-body portrait of a woman draped in a Peacock Royal Blue chiffon georgette saree with ornate silver zari border, royal blue blouse, pleated full-length lower drape, graceful pallu across shoulder",
            "split": "train"
        },
        3: {
            "name": "Heritage Emerald Silk Saree",
            "garment_file": "green-saree.jpg",
            "priya_drape": "drape_model1_saree3.jpg",
            "ananya_drape": "drape_model2_saree3.jpg",
            "fabric": "kanchipuram_silk",
            "opacity": "opaque",
            "caption": "Photorealistic full-body portrait of a woman draped in a Heritage Emerald Green Kanchipuram Silk Saree, golden temple zari motifs, rich pallu, green silk blouse, full-length lower drape to ankles",
            "split": "train"
        },
        5: {
            "name": "Blush Pink Organza Saree",
            "garment_file": "pink-saree.jpg",
            "customer_drape": "customer_jeans_model.jpg",
            "fabric": "sheer_organza",
            "opacity": "sheer",
            "caption": "Photorealistic full-body portrait of a woman draped in an ethereal Blush Pink Organza Saree, delicate scalloped pearl and silver beaded border, sheer organza texture, matching blouse, full-length translucent drape",
            "split": "test"  # HELD-OUT TEST SAMPLE
        }
    }

    samples = []
    split_counts = {"train": 0, "val": 0, "test": 0}

    # 1. Authentic Ground-Truth Pairs for Training & Validation
    # Priya: Train (Saree 1, 2, 3)
    # Ananya: Val (Saree 2, 3) & Train (Saree 1)
    drape_pairs = [
        {"model_id": "model_priya", "saree_id": 1, "split": "train"},
        {"model_id": "model_priya", "saree_id": 2, "split": "train"},
        {"model_id": "model_priya", "saree_id": 3, "split": "train"},
        {"model_id": "model_ananya", "saree_id": 1, "split": "train"},
        {"model_id": "model_ananya", "saree_id": 2, "split": "val"},
        {"model_id": "model_ananya", "saree_id": 3, "split": "val"},
    ]

    for item in drape_pairs:
        mid = item["model_id"]
        sid = item["saree_id"]
        split = item["split"]
        sdata = catalog_sarees[sid]

        drape_filename = sdata[f"{'priya' if 'priya' in mid else 'ananya'}_drape"]
        person_p = images_dir / drape_filename
        garment_p = images_dir / sdata["garment_file"]

        assert person_p.exists(), f"Missing drape file: {person_p}"
        assert garment_p.exists(), f"Missing garment file: {garment_p}"

        sample_id = f"{mid}_saree_{sid}"
        logger.info(f"Processing authentic pair: {sample_id} ({sdata['name']}) -> {split}")

        person_bgr = cv2.imread(str(person_p))
        garment_bgr = cv2.imread(str(garment_p))

        person_1024 = cv2.resize(person_bgr, (1024, 1024), interpolation=cv2.INTER_LANCZOS4)
        garment_1024 = cv2.resize(garment_bgr, (1024, 1024), interpolation=cv2.INTER_LANCZOS4)

        mask, agnostic, dbg = generate_corrected_saree_mask(person_1024, segmenter, pose_detector)

        path_person = proc_dir / f"{sample_id}_person.png"
        path_garment = proc_dir / f"{sample_id}_garment.png"
        path_agnostic = proc_dir / f"{sample_id}_agnostic.png"
        path_mask = proc_dir / f"{sample_id}_mask.png"

        cv2.imwrite(str(path_person), person_1024)
        cv2.imwrite(str(path_garment), garment_1024)
        cv2.imwrite(str(path_agnostic), agnostic)
        cv2.imwrite(str(path_mask), mask)

        samples.append({
            "sample_id": sample_id,
            "split": split,
            "person_image": str(path_person.relative_to(BASE_DIR)),
            "garment_reference": str(path_garment.relative_to(BASE_DIR)),
            "agnostic_image": str(path_agnostic.relative_to(BASE_DIR)),
            "inpaint_mask": str(path_mask.relative_to(BASE_DIR)),
            "caption": sdata["caption"],
            "resolution": [1024, 1024],
            "fabric_type": sdata["fabric"],
            "is_sheer": sdata["opacity"] == "sheer",
            "draping_style": "nivi_style_full_length",
            "mask_area_pct": dbg["mask_area_pct"]
        })
        split_counts[split] += 1

    # 2. Strictly Isolated Held-Out Test Split (Customer + Blush Pink Organza Saree)
    test_sid = 5
    test_sdata = catalog_sarees[test_sid]
    cust_p = images_dir / test_sdata["customer_drape"]
    garment_p = images_dir / test_sdata["garment_file"]

    cust_sample_id = f"customer_saree_{test_sid}"
    logger.info(f"Processing held-out test sample: {cust_sample_id} -> test")

    cust_bgr = cv2.imread(str(cust_p))
    cust_garment_bgr = cv2.imread(str(garment_p))
    cust_1024 = cv2.resize(cust_bgr, (1024, 1024), interpolation=cv2.INTER_LANCZOS4)
    cust_garment_1024 = cv2.resize(cust_garment_bgr, (1024, 1024), interpolation=cv2.INTER_LANCZOS4)

    mask_test, agnostic_test, dbg_test = generate_corrected_saree_mask(cust_1024, segmenter, pose_detector)

    path_person_test = proc_dir / f"{cust_sample_id}_person.png"
    path_garment_test = proc_dir / f"{cust_sample_id}_garment.png"
    path_agnostic_test = proc_dir / f"{cust_sample_id}_agnostic.png"
    path_mask_test = proc_dir / f"{cust_sample_id}_mask.png"

    cv2.imwrite(str(path_person_test), cust_1024)
    cv2.imwrite(str(path_garment_test), cust_garment_1024)
    cv2.imwrite(str(path_agnostic_test), agnostic_test)
    cv2.imwrite(str(path_mask_test), mask_test)

    samples.append({
        "sample_id": cust_sample_id,
        "split": "test",
        "person_image": str(path_person_test.relative_to(BASE_DIR)),
        "garment_reference": str(path_garment_test.relative_to(BASE_DIR)),
        "agnostic_image": str(path_agnostic_test.relative_to(BASE_DIR)),
        "inpaint_mask": str(path_mask_test.relative_to(BASE_DIR)),
        "caption": test_sdata["caption"],
        "resolution": [1024, 1024],
        "fabric_type": test_sdata["fabric"],
        "is_sheer": True,
        "draping_style": "nivi_style_full_length",
        "mask_area_pct": dbg_test["mask_area_pct"]
    })
    split_counts["test"] += 1

    manifest = {
        "dataset_name": "Saree-VTON-Curated-Clean",
        "version": "2.0.0",
        "total_samples": len(samples),
        "split_summary": split_counts,
        "description": "Curated Saree VTON dataset where every training and validation target image genuinely depicts the exact saree described in its metadata. Jeans-wearing customer photos are strictly isolated to test inference only.",
        "samples": samples
    }

    out_json = BASE_DIR / "training" / "data" / "dataset_curated.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    logger.info(f"Curated dataset successfully saved to: {out_json}")
    logger.info(f"Total samples: {len(samples)} | Train: {split_counts['train']} | Val: {split_counts['val']} | Test: {split_counts['test']}")
    return manifest


if __name__ == "__main__":
    build_curated_dataset()
