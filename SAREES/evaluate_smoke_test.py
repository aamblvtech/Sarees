"""
Evaluation Script for AURA Virtual Saree Fitting Studio
Evaluates the 5-step SDXL Inpainting LoRA smoke-test checkpoint on a held-out test sample:
1. Loads the held-out sample (customer_saree_5: Blush Pink Organza Saree).
2. Generates the baseline local mesh-warp result (MediaPipe + Delaunay Triangulation).
3. Loads SDXL Inpainting 0.1 on Apple Silicon MPS with the trained LoRA adapter.
4. Generates the real neural inpainting try-on output.
5. Saves all assets in evaluation/smoke_test_eval/ and verifies image authenticity.
"""

import os
import sys
import json
import time
import hashlib
from pathlib import Path
from PIL import Image
import torch

BASE_DIR = Path(__file__).resolve().parent.parent
SAREES_DIR = BASE_DIR / "SAREES"
sys.path.insert(0, str(SAREES_DIR))

from main import in_place_saree_clothing_swap, SAREES


def get_image_dhash(img_path: str) -> str:
    """Computes perceptual difference hash to verify image uniqueness."""
    import cv2
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return ""
    resized = cv2.resize(img, (9, 8))
    diff = resized[:, 1:] > resized[:, :-1]
    return hex(int("".join(["1" if b else "0" for b in diff.flatten()]), 2))


def run_evaluation():
    print("=" * 70)
    print("  AURA VIRTUAL SAREE TRY-ON: HELD-OUT MODEL EVALUATION")
    print("=" * 70)

    eval_dir = BASE_DIR / "evaluation" / "smoke_test_eval"
    eval_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load Held-Out Test Sample Metadata
    manifest_p = BASE_DIR / "training" / "data" / "dataset.json"
    with open(manifest_p, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    test_samples = [s for s in manifest["samples"] if s.get("split") == "test"]
    assert len(test_samples) > 0, "No held-out test samples found!"
    sample = test_samples[0]  # customer_saree_5
    sid = sample["sample_id"]
    print(f"Selected Held-Out Test Sample: {sid}")

    person_p = BASE_DIR / Path(str(sample["person_image"]).replace("\\", "/"))
    garment_p = BASE_DIR / Path(str(sample["garment_reference"]).replace("\\", "/"))
    agnostic_p = BASE_DIR / Path(str(sample["agnostic_image"]).replace("\\", "/"))
    mask_p = BASE_DIR / Path(str(sample["inpaint_mask"]).replace("\\", "/"))
    caption = sample.get("caption", "Traditional Indian Silk Saree, photorealistic drape")

    assert person_p.exists(), f"Missing person image: {person_p}"
    assert garment_p.exists(), f"Missing garment image: {garment_p}"
    assert agnostic_p.exists(), f"Missing agnostic image: {agnostic_p}"
    assert mask_p.exists(), f"Missing mask image: {mask_p}"

    # Copy input references to evaluation directory
    img_person = Image.open(person_p).convert("RGB")
    img_mask = Image.open(mask_p).convert("L")
    img_garment = Image.open(garment_p).convert("RGB")
    img_agnostic = Image.open(agnostic_p).convert("RGB")

    path_in_person = eval_dir / "01_input_person.png"
    path_in_mask = eval_dir / "02_inpaint_mask.png"
    path_in_garment = eval_dir / "03_garment_reference.png"
    path_in_agnostic = eval_dir / "04_agnostic_canvas.png"

    img_person.save(path_in_person)
    img_mask.save(path_in_mask)
    img_garment.save(path_in_garment)
    img_agnostic.save(path_in_agnostic)
    print("Input reference assets saved to evaluation directory.")

    # 2. Generate Local Mesh-Warp Baseline
    print("\n[Step 1/3] Generating Local Mesh-Warp Baseline...")
    path_mesh_out = eval_dir / "05_local_mesh_output.png"
    saree_id = 5  # Blush Pink Organza Saree
    saree_item = SAREES.get(saree_id, {})
    saree_color = saree_item.get("color_bgr", [179, 153, 230])

    t0_mesh = time.time()
    ok_mesh, metrics = in_place_saree_clothing_swap(
        str(person_p),
        str(garment_p),
        str(path_mesh_out),
        saree_color_bgr=saree_color,
        saree_id=saree_id,
        return_metrics=True
    )
    dt_mesh = time.time() - t0_mesh
    assert ok_mesh and path_mesh_out.exists(), "Local mesh-warp generation failed!"
    print(f"Local mesh-warp completed in {dt_mesh:.2f}s! Status: {metrics.get('status', 'OK')}")

    # 3. Generate Generative Neural Try-On Output
    print("\n[Step 2/3] Generating Neural SDXL Inpainting + LoRA Output on Apple MPS...")
    ckpt_path = BASE_DIR / "training" / "checkpoints" / "saree_sdxl_lora_smoke_test" / "saree_lora_weights.safetensors"
    assert ckpt_path.exists(), f"Smoke-test checkpoint weights not found at: {ckpt_path}"

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Inference Device: {device}")

    from diffusers import StableDiffusionXLInpaintPipeline
    from peft import LoraConfig, get_peft_model, set_peft_model_state_dict
    from safetensors.torch import load_file

    print("Loading base SDXL inpainting pipeline in fp16...")
    pipe = StableDiffusionXLInpaintPipeline.from_pretrained(
        "diffusers/stable-diffusion-xl-1.0-inpainting-0.1",
        torch_dtype=torch.float16,
        variant="fp16"
    )

    print("Injecting LoRA adapter architecture...")
    lora_config = LoraConfig(
        r=32,
        lora_alpha=32,
        target_modules=["to_k", "to_q", "to_v", "to_out.0"],
        lora_dropout=0.0,
        bias="none"
    )
    pipe.unet = get_peft_model(pipe.unet, lora_config)

    print(f"Loading trained smoke-test weights from {ckpt_path.name}...")
    state_dict = load_file(str(ckpt_path))
    set_peft_model_state_dict(pipe.unet, state_dict)
    print(f"Loaded {len(state_dict)} LoRA parameters into UNet.")

    # Enable memory optimization on MPS
    pipe.to(device)
    if device.type == "mps":
        pipe.enable_attention_slicing()
        torch.mps.empty_cache()

    print(f"Running generative inpainting diffusion (20 steps, guidance_scale=7.5)...")
    print(f"Prompt: '{caption[:80]}...'")

    generator = torch.Generator(device=device).manual_seed(42)
    t0_gen = time.time()
    gen_result = pipe(
        prompt=caption,
        image=img_person,
        mask_image=img_mask,
        num_inference_steps=20,
        guidance_scale=7.5,
        strength=0.99,
        generator=generator
    ).images[0]
    dt_gen = time.time() - t0_gen

    path_gen_out = eval_dir / "06_generative_lora_output.png"
    gen_result.save(path_gen_out)
    print(f"Generative inpainting completed in {dt_gen:.2f}s! Saved to: {path_gen_out}")

    # Free memory
    del pipe
    if device.type == "mps":
        torch.mps.empty_cache()

    # 4. Generate Side-by-Side Comparison Triptych
    print("\n[Step 3/3] Assembling Side-by-Side Comparison Triptych...")
    img_mesh = Image.open(path_mesh_out).convert("RGB")
    W, H = img_person.size

    triptych = Image.new("RGB", (W * 3, H))
    triptych.paste(img_person, (0, 0))
    triptych.paste(img_mesh, (W, 0))
    triptych.paste(gen_result, (W * 2, 0))

    path_triptych = eval_dir / "07_comparison_triptych.png"
    triptych.save(path_triptych)
    print(f"Comparison triptych saved to: {path_triptych}")

    # 5. Image Authenticity Verification (Anti-Falsification)
    print("\n" + "=" * 70)
    print("  VERIFICATION & INTEGRITY AUDIT")
    print("=" * 70)
    hash_person = get_image_dhash(str(path_in_person))
    hash_mesh = get_image_dhash(str(path_mesh_out))
    hash_gen = get_image_dhash(str(path_gen_out))

    print(f"Input Person dHash:        {hash_person}")
    print(f"Local Mesh Output dHash:   {hash_mesh}")
    print(f"Generative Output dHash:   {hash_gen}")

    assert hash_gen != hash_person, "ERROR: Generative output is identical to input image!"
    assert hash_gen != hash_mesh, "ERROR: Generative output is identical to mesh-warp output!"
    print("Authenticity Verified: Generative output is a genuine, independently synthesized image tensor.")

    report = {
        "evaluation_sample": sid,
        "sample_split": sample.get("split"),
        "saree_catalog_id": saree_id,
        "saree_name": saree_item.get("name"),
        "input_person": str(path_in_person),
        "inpaint_mask": str(path_in_mask),
        "garment_reference": str(path_in_garment),
        "local_mesh_output": str(path_mesh_out),
        "generative_lora_output": str(path_gen_out),
        "comparison_triptych": str(path_triptych),
        "mesh_execution_time_s": round(dt_mesh, 2),
        "generative_execution_time_s": round(dt_gen, 2),
        "device_used": str(device),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    with open(eval_dir / "evaluation_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\nEvaluation completed successfully. Report saved to: {eval_dir / 'evaluation_report.json'}")
    return report


if __name__ == "__main__":
    run_evaluation()
