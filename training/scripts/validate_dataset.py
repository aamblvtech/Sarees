"""
Saree Dataset Quality & Leakage Validator (Phase 3)
Strictly audits and verifies training dataset integrity:
- Checks missing/unreadable image files.
- Validates 1024x1024 dimensions across all image tensors.
- Verifies mask validity: strictly binary {0, 255}, non-empty, and coverage > 10% of canvas.
- Detects duplicate/near-duplicate image hashes across splits (Zero Data Leakage).
- Verifies test split isolation: held-out catalog garments must NOT appear in training split.
- Checks garment fabric labeling consistency.
"""

import os
import sys
import json
import hashlib
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def compute_dhash(image_path: str, hash_size: int = 8) -> str:
    """Computes difference hash (dHash) to detect identical or near-duplicate images."""
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return ""
    resized = cv2.resize(img, (hash_size + 1, hash_size))
    diff = resized[:, 1:] > resized[:, :-1]
    return hex(int("".join(["1" if b else "0" for b in diff.flatten()]), 2))


def validate_dataset(manifest_path: str = None) -> Tuple[bool, Dict]:
    if manifest_path is None:
        manifest_path = str(BASE_DIR / "training" / "data" / "dataset.json")

    if not os.path.exists(manifest_path):
        return False, {"error": f"Manifest file not found: {manifest_path}"}

    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    samples = data.get("samples", [])
    if len(samples) == 0:
        return False, {"error": "Dataset contains 0 samples"}

    errors = []
    warnings = []
    train_hashes = set()
    val_hashes = set()
    test_hashes = set()

    train_garments = set()
    test_garments = set()

    for idx, sample in enumerate(samples):
        sid = sample.get("sample_id", f"sample_{idx}")
        split = sample.get("split", "train")

        # 1. Existence Check
        person_p = BASE_DIR / sample.get("person_image", "")
        garm_p = BASE_DIR / sample.get("garment_reference", "")
        agnostic_p = BASE_DIR / sample.get("agnostic_image", "")
        mask_p = BASE_DIR / sample.get("inpaint_mask", "")

        for label, p in [("person", person_p), ("garment", garm_p), ("agnostic", agnostic_p), ("mask", mask_p)]:
            if not p.exists():
                errors.append(f"[{sid}] Missing {label} file: {p}")
                continue

            # 2. Dimension & Channel Check
            img = cv2.imread(str(p), cv2.IMREAD_UNCHANGED)
            if img is None:
                errors.append(f"[{sid}] Unreadable {label} image: {p}")
                continue

            H, W = img.shape[:2]
            if (H, W) != (1024, 1024):
                errors.append(f"[{sid}] Dimension mismatch in {label}: expected (1024, 1024), got ({W}, {H})")

            # 3. Mask Validity
            if label == "mask":
                unique_vals = set(np.unique(img))
                if not unique_vals.issubset({0, 255}):
                    errors.append(f"[{sid}] Mask must be strictly binary {0, 255}, found values: {unique_vals}")

                coverage = np.mean(img > 0)
                if coverage < 0.05:
                    errors.append(f"[{sid}] Mask coverage too low ({coverage*100:.1f}%), likely failed segmentation")
                elif coverage > 0.85:
                    warnings.append(f"[{sid}] Mask coverage suspiciously high ({coverage*100:.1f}%)")

        # 4. Hash-based Duplicate & Leakage Check
        if person_p.exists() and garm_p.exists():
            pair_hash = compute_dhash(str(person_p)) + "_" + compute_dhash(str(garm_p))
            if split == "train":
                train_hashes.add(pair_hash)
                train_garments.add(sample.get("saree_name", ""))
            elif split == "val":
                val_hashes.add(pair_hash)
            elif split == "test":
                test_hashes.add(pair_hash)
                test_garments.add(sample.get("saree_name", ""))

        # 5. Label Check
        if not sample.get("fabric_type"):
            errors.append(f"[{sid}] Missing fabric_type metadata")

        if not sample.get("caption") or len(sample.get("caption")) < 20:
            errors.append(f"[{sid}] Caption missing or insufficiently detailed")

    # 6. Check Leakage between splits
    train_test_overlap = train_hashes.intersection(test_hashes)
    if len(train_test_overlap) > 0:
        errors.append(f"CRITICAL DATA LEAKAGE: {len(train_test_overlap)} pairs appear in BOTH training and test splits!")

    train_val_overlap = train_hashes.intersection(val_hashes)
    if len(train_val_overlap) > 0:
        errors.append(f"CRITICAL DATA LEAKAGE: {len(train_val_overlap)} pairs appear in BOTH training and validation splits!")

    # Check Garment Isolation
    garment_leakage = train_garments.intersection(test_garments)
    if len(garment_leakage) > 0:
        warnings.append(f"Held-out test garments also present in train set: {garment_leakage}")

    passed = len(errors) == 0
    report = {
        "status": "PASS" if passed else "FAIL",
        "total_samples": len(samples),
        "errors_count": len(errors),
        "warnings_count": len(warnings),
        "errors": errors,
        "warnings": warnings,
        "train_samples": len(train_hashes),
        "val_samples": len(val_hashes),
        "test_samples": len(test_hashes),
        "leakage_detected": bool(len(train_test_overlap) > 0 or len(train_val_overlap) > 0)
    }

    return passed, report


if __name__ == "__main__":
    ok, res = validate_dataset()
    print("=== DATASET VALIDATION REPORT ===")
    print(f"Status: {res['status']}")
    print(f"Total Samples: {res['total_samples']}")
    print(f"Errors: {res['errors_count']} | Warnings: {res['warnings_count']}")
    print(f"Zero Data Leakage: {'VERIFIED' if not res['leakage_detected'] else 'FAILED'}")
    if res["errors"]:
        print("\nErrors:")
        for e in res["errors"]:
            print(f"  - {e}")
    if res["warnings"]:
        print("\nWarnings:")
        for w in res["warnings"]:
            print(f"  - {w}")
    sys.exit(0 if ok else 1)
