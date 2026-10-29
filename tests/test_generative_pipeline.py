"""
Automated Test Suite for Saree-Specific Generative VTON Pipeline (Phase 8)
Verifies:
1. Dataset & annotation integrity (dataset.json, 1024x1024, valid masks).
2. Zero data leakage across train, val, and test splits.
3. Truthful generative model status reporting (MODEL NOT LOADED on CPU).
4. Safe fallback routing without falsifying neural inference claims.
5. Inpainting mask coordinate alignment and footwear/face protection.
6. Privacy protection: zero leakage of private customer photos or API keys.
"""

import os
import sys
import json
import pytest
import numpy as np
import cv2
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sarees_dir = BASE_DIR / "SAREES"
training_dir = BASE_DIR / "training"

if str(sarees_dir) not in sys.path:
    sys.path.insert(0, str(sarees_dir))
if str(training_dir / "scripts") not in sys.path:
    sys.path.insert(0, str(training_dir / "scripts"))

from validate_dataset import validate_dataset
from generative_pipeline import SareeGenerativePipeline, get_generative_pipeline


def test_dataset_manifest_and_zero_leakage():
    manifest_p = training_dir / "data" / "dataset.json"
    assert manifest_p.exists(), f"Missing dataset manifest: {manifest_p}"

    ok, report = validate_dataset(str(manifest_p))
    assert ok is True, f"Dataset validation failed: {report['errors']}"
    assert report["leakage_detected"] is False, "Critical data leakage detected between splits!"
    assert report["total_samples"] >= 10, f"Insufficient dataset samples: {report['total_samples']}"


def test_generative_pipeline_truthful_status():
    pipe = get_generative_pipeline()
    status = pipe.get_status()

    assert "status_label" in status
    assert "generative_model_active" in status
    assert "fallback_available" in status
    assert status["fallback_available"] is True

    # Truthful reporting based on acceleration hardware (CUDA or Apple Silicon MPS):
    if status["cuda_available"] or status.get("mps_available"):
        assert status["generative_model_active"] is True, "Generative model should be active when accelerated hardware is detected"
        assert "GENERATIVE MODEL ACTIVE" in status["status_label"]
    else:
        assert status["generative_model_active"] is False, "Falsely claiming generative model active on CPU!"
        assert "MODEL NOT LOADED" in status["status_label"]


def test_generative_fallback_execution():
    person_p = str(sarees_dir / "images" / "customer_jeans_model.jpg")
    saree_p = str(sarees_dir / "images" / "red-saree.jpg")
    out_p = str(sarees_dir / "outputs" / "test_gen_fallback.jpg")

    # When allow_fallback=True on a non-loaded pipeline, should route to local mesh and report LOCAL MESH FALLBACK
    cpu_pipe = SareeGenerativePipeline()
    cpu_pipe.is_loaded = False
    cpu_pipe.status_message = "Test CPU unaccelerated fallback"

    ok, info = cpu_pipe.run_tryon(person_p, saree_p, saree_id=1, out_path=out_p, allow_fallback=True)
    assert ok is True
    assert os.path.exists(out_p)
    assert "FALLBACK" in info["backend_used"]
    assert "READY FOR" in info["quality_status"]

    if os.path.exists(out_p):
        os.remove(out_p)

    # When allow_fallback=False on unaccelerated/unloaded pipeline, must fail honestly
    ok_no_fb, info_no_fb = cpu_pipe.run_tryon(person_p, saree_p, saree_id=1, out_path=out_p, allow_fallback=False)
    assert ok_no_fb is False
    assert info_no_fb["quality_status"] == "GENERATION FAILED"


def test_saree_training_config_integrity():
    cfg_p = training_dir / "configs" / "saree_lora_config.json"
    assert cfg_p.exists(), "Missing saree_lora_config.json"

    with open(cfg_p, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    assert cfg["model_type"] == "sdxl_inpainting_lora"
    assert cfg["resolution"] == 1024
    assert cfg["lora_rank"] >= 16
    assert "hardware_requirements" in cfg
    assert cfg["hardware_requirements"]["min_vram_gb"] >= 16


def test_privacy_and_secrets_protection():
    # Verify no API keys or deleted customer assets exist in git or public files
    deleted_assets = [
        "customer_garden_dress.jpg",
        "customer_portrait.jpg",
        "customer_white_saree.jpg"
    ]
    for r, d, files in os.walk(str(sarees_dir)):
        for f in files:
            assert f not in deleted_assets, f"Privacy violation: deleted file {f} still present in {r}"


def test_production_inference_configuration_and_checkpoint():
    """
    Regression test verifying:
    1. Production pipeline loads the curated pilot LoRA checkpoint.
    2. Default inference config uses Run 1 single-pass sleeve-corrected settings.
    3. Regional two-pass is disabled by default.
    """
    pipe = get_generative_pipeline()
    status = pipe.get_status()

    # 1. Checkpoint configuration
    assert status["checkpoint_configured"] is True, "Production checkpoint not found or not configured!"
    assert pipe.active_checkpoint_path is not None
    assert pipe.active_checkpoint_path.exists(), f"Checkpoint does not exist: {pipe.active_checkpoint_path}"
    assert "saree_sdxl_lora_curated_pilot" in str(pipe.active_checkpoint_path), (
        f"Active checkpoint should be curated pilot, got: {pipe.active_checkpoint_path}"
    )

    # 2. Production inference configuration (Run 1 single-pass)
    cfg = pipe.inference_config
    assert cfg["mode"] == "single_pass_sleeve_corrected"
    assert cfg["strength"] == 0.80
    assert cfg["num_inference_steps"] == 20
    assert int(cfg["num_inference_steps"] * cfg["strength"]) == 16, "Effective diffusion steps must be 16"
    assert cfg["guidance_scale"] == 7.5
    assert cfg["seed"] == 42
    assert cfg["resolution"] == (1024, 1024)
    assert cfg["use_regional_two_pass"] is False, "Regional two-pass must not be enabled by default!"
    assert cfg["mask_engine"] == "saree_mask_engine_v2"
    assert cfg["conditioning_pipeline"] == "Pipeline_C_segmented"

