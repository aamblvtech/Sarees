"""
Saree Dataset Generation & Pipeline Builder (Phase 3)
Builds canonical training/val/test dataset for Saree-Specific Virtual Try-On:
- Generates paired (person, garment, agnostic, mask, pose) representations.
- Extracts detailed fabric, drape, and opacity metadata.
- Prepares train/val/test split with strict test set isolation (zero data leakage).
- Writes manifest to training/data/dataset.json.
"""

import os
import sys
import json
import logging
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR / "training" / "scripts"))

from saree_mask_engine import generate_saree_training_pair

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("saree-dataset-builder")


def build_dataset():
    sarees_dir = BASE_DIR / "SAREES"
    images_dir = sarees_dir / "images"
    proc_dir = BASE_DIR / "training" / "data" / "processed"
    proc_dir.mkdir(parents=True, exist_ok=True)

    catalog_sarees = {
        1: {
            "name": "Traditional Crimson Silk Saree",
            "file": "red-saree.jpg",
            "fabric": "banarasi_silk",
            "opacity": "opaque",
            "caption": "Photorealistic full-body portrait of a woman draped in an authentic Traditional Crimson Banarasi Silk Saree, intricate golden floral zari embroidery along borders and pallu, matching red blouse, pleated full-length lower saree down to ankles",
            "split": "train"
        },
        2: {
            "name": "Peacock Royal Blue Saree",
            "file": "blue-saree.jpg",
            "fabric": "chiffon_georgette",
            "opacity": "opaque",
            "caption": "Photorealistic full-body portrait of a woman draped in a Peacock Royal Blue chiffon georgette saree with ornate silver zari border, royal blue blouse, pleated full-length lower drape, graceful pallu across shoulder",
            "split": "train"
        },
        3: {
            "name": "Heritage Emerald Silk Saree",
            "file": "green-saree.jpg",
            "fabric": "kanchipuram_silk",
            "opacity": "opaque",
            "caption": "Photorealistic full-body portrait of a woman draped in a Heritage Emerald Green Kanchipuram Silk Saree, golden temple zari motifs, rich pallu, green silk blouse, full-length lower drape to ankles",
            "split": "train"
        },
        4: {
            "name": "Royal Purple Banarasi Saree",
            "file": "purple-saree.jpg",
            "fabric": "banarasi_silk",
            "opacity": "opaque",
            "caption": "Photorealistic full-body portrait of a woman draped in an opulent Royal Purple Banarasi Silk Saree, shimmering silver floral bootas, heritage zari border, matching purple blouse, floor-length pleated drape",
            "split": "val"  # Validation set
        },
        5: {
            "name": "Blush Pink Organza Saree",
            "file": "pink-saree.jpg",
            "fabric": "sheer_organza",
            "opacity": "sheer",
            "caption": "Photorealistic full-body portrait of a woman draped in an ethereal Blush Pink Organza Saree, delicate scalloped pearl and silver beaded border, sheer organza texture, matching blouse, full-length translucent drape",
            "split": "test"  # Held-out Test set
        }
    }

    # Available authorized studio person models
    models = [
        {"id": "customer", "file": "customer_jeans_model.jpg", "desc": "Customer Portrait Studio Model"},
        {"id": "model_priya", "file": "drape_model1_saree1.jpg", "desc": "Studio Model Priya"},
        {"id": "model_ananya", "file": "drape_model2_saree1.jpg", "desc": "Studio Model Ananya"}
    ]

    samples = []
    logger.info("Building Saree Virtual Try-On Dataset...")

    for m in models:
        person_path = images_dir / m["file"]
        if not person_path.exists():
            logger.warning(f"Skipping model {m['id']} (file not found: {person_path})")
            continue

        for sid, sdata in catalog_sarees.items():
            garm_path = images_dir / sdata["file"]
            if not garm_path.exists():
                logger.warning(f"Garment {sdata['file']} not found")
                continue

            sample_id = f"{m['id']}_saree_{sid}"
            logger.info(f"Generating training sample: {sample_id} ({sdata['name']})")

            is_sheer = (sdata["opacity"] == "sheer")
            try:
                sample_meta = generate_saree_training_pair(
                    person_img_path=str(person_path),
                    garment_img_path=str(garm_path),
                    output_dir=str(proc_dir),
                    sample_id=sample_id,
                    fabric_type=sdata["fabric"],
                    is_sheer=is_sheer
                )
                sample_meta["saree_id"] = sid
                sample_meta["saree_name"] = sdata["name"]
                sample_meta["caption"] = sdata["caption"]
                sample_meta["split"] = sdata["split"]
                sample_meta["model_desc"] = m["desc"]
                samples.append(sample_meta)
            except Exception as e:
                logger.error(f"Error processing {sample_id}: {e}")

    # Dataset Manifest
    manifest = {
        "dataset_name": "Saree-VTON-Curated",
        "version": "1.0.0",
        "total_samples": len(samples),
        "split_summary": {
            "train": len([s for s in samples if s["split"] == "train"]),
            "val": len([s for s in samples if s["split"] == "val"]),
            "test": len([s for s in samples if s["split"] == "test"])
        },
        "supported_fabrics": ["banarasi_silk", "chiffon_georgette", "kanchipuram_silk", "sheer_organza"],
        "resolution": [1024, 1024],
        "samples": samples
    }

    manifest_path = BASE_DIR / "training" / "data" / "dataset.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    logger.info(f"Dataset manifest written successfully to: {manifest_path}")
    logger.info(f"Summary: {manifest['split_summary']}")
    return manifest


if __name__ == "__main__":
    build_dataset()
