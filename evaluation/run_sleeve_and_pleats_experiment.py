"""
Controlled Sleeve & Pleat Experiment — evaluation/sleeve_and_pleats_v1/

Compares three inference configurations on the held-out customer + pink organza saree:
  Run 0 (Baseline):   Prior curated pilot output (old mask, single-pass strength=0.80)
  Run 1 (Sleeve Fix):  New sleeve-corrected mask, single-pass strength=0.80
  Run 2 (Regional):    New mask, two-pass regional inpainting
       Pass 1: full mask at strength=0.80
       Pass 2: lower-skirt mask only at strength=0.88, with structured pleat prompt

All runs: seed=42, guidance_scale=7.5, 20 steps, curated pilot adapter, Pipeline C segmented garment.
Outputs saved exclusively to evaluation/sleeve_and_pleats_v1/ — no existing data overwritten.
"""

import os, sys, json, time, shutil
from pathlib import Path
from PIL import Image
import torch, cv2, numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "SAREES"))
sys.path.insert(0, str(BASE_DIR / "training" / "scripts"))

from garment_conditioner import SareeGarmentConditioner
from saree_mask_engine_v2 import generate_corrected_saree_mask, get_segmenter, get_pose_detector
from diffusers import StableDiffusionXLInpaintPipeline
from peft import LoraConfig, get_peft_model, set_peft_model_state_dict
from safetensors.torch import load_file

EVAL_DIR = BASE_DIR / "evaluation" / "sleeve_and_pleats_v1"
EVAL_DIR.mkdir(parents=True, exist_ok=True)

PERSON_PATH = BASE_DIR / "SAREES" / "images" / "customer_jeans_model.jpg"
GARMENT_PATH = BASE_DIR / "SAREES" / "images" / "pink-saree.jpg"
PILOT_CKPT = BASE_DIR / "training" / "checkpoints" / "saree_sdxl_lora_curated_pilot" / "saree_lora_weights.safetensors"

CAPTION_BASE = (
    "Photorealistic full-body portrait of a woman draped in an ethereal Blush Pink "
    "Organza Saree, delicate scalloped pearl and silver beaded border, sheer organza "
    "texture, matching blouse, full-length translucent drape"
)
CAPTION_PLEAT = (
    "Photorealistic full-body portrait, lower saree skirt with crisp vertical Nivi-style "
    "accordion pleats falling from waist to feet, blush pink organza fabric, visible "
    "individual pleat folds, pearl scalloped border at hem"
)

SEED = 42
STEPS = 20
GUIDANCE = 7.5
STRENGTH_BASE = 0.80
STRENGTH_PLEAT = 0.88


def load_pipeline_with_adapter(device):
    """Loads SDXL inpainting pipeline + curated pilot LoRA adapter."""
    print(f"Loading SDXL Inpainting pipeline with curated pilot adapter...")
    pipe = StableDiffusionXLInpaintPipeline.from_pretrained(
        "diffusers/stable-diffusion-xl-1.0-inpainting-0.1",
        torch_dtype=torch.float16,
        variant="fp16"
    )
    lora_config = LoraConfig(
        r=32, lora_alpha=32,
        target_modules=["to_k", "to_q", "to_v", "to_out.0"],
        lora_dropout=0.0, bias="none"
    )
    pipe.unet = get_peft_model(pipe.unet, lora_config)
    state_dict = load_file(str(PILOT_CKPT))
    set_peft_model_state_dict(pipe.unet, state_dict)
    pipe.to(device)
    if device.type == "mps":
        pipe.enable_attention_slicing()
        torch.mps.empty_cache()
    return pipe


def run_single_pass(pipe, canvas, mask_img, caption, strength, device):
    """Single-pass inpainting."""
    gen = torch.Generator(device=device).manual_seed(SEED)
    output = pipe(
        prompt=caption,
        image=canvas,
        mask_image=mask_img,
        num_inference_steps=STEPS,
        strength=strength,
        guidance_scale=GUIDANCE,
        generator=gen
    ).images[0]
    return output


def run_regional_two_pass(pipe, canvas, full_mask, skirt_mask, device):
    """
    Pass 1: Full mask inpainting at base strength.
    Pass 2: Lower-skirt only at higher strength with pleat-targeted prompt.
    """
    # Pass 1 — full garment
    gen1 = torch.Generator(device=device).manual_seed(SEED)
    pass1 = pipe(
        prompt=CAPTION_BASE,
        image=canvas,
        mask_image=full_mask,
        num_inference_steps=STEPS,
        strength=STRENGTH_BASE,
        guidance_scale=GUIDANCE,
        generator=gen1
    ).images[0]

    if device.type == "mps":
        torch.mps.empty_cache()

    # Pass 2 — skirt region only with pleat prompt
    gen2 = torch.Generator(device=device).manual_seed(SEED)
    pass2 = pipe(
        prompt=CAPTION_PLEAT,
        image=pass1,
        mask_image=skirt_mask,
        num_inference_steps=STEPS,
        strength=STRENGTH_PLEAT,
        guidance_scale=GUIDANCE,
        generator=gen2
    ).images[0]

    return pass1, pass2


def get_dhash(img):
    g = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
    r = cv2.resize(g, (9, 8))
    d = r[:, 1:] > r[:, :-1]
    return hex(int("".join(["1" if b else "0" for b in d.flatten()]), 2))


def masked_mean_rgb(img, mask_img):
    m = np.array(mask_img.convert("L").resize(img.size)) > 128
    px = np.array(img)[m]
    if len(px) == 0:
        return [0, 0, 0]
    return [round(float(c), 2) for c in px.mean(axis=0)]


def main():
    print("=" * 75)
    print("  AURA VTON: SLEEVE & PLEAT CONTROLLED EXPERIMENT")
    print("=" * 75)

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Device: {device}")

    # --- Inputs ---
    img_person_pil = Image.open(PERSON_PATH).convert("RGB").resize((1024, 1024))
    img_garment_pil = Image.open(GARMENT_PATH).convert("RGB")

    # --- Generate new sleeve-corrected mask ---
    print("\n[1/6] Generating sleeve-corrected mask...")
    img_bgr = cv2.imread(str(PERSON_PATH))
    img_bgr_1024 = cv2.resize(img_bgr, (1024, 1024))
    seg = get_segmenter()
    pose = get_pose_detector()
    new_mask_np, _, dbg = generate_corrected_saree_mask(img_bgr_1024, seg, pose)
    new_mask_pil = Image.fromarray(new_mask_np).convert("L")
    new_mask_pil.save(EVAL_DIR / "06_new_sleeve_corrected_mask_1024.png")
    print(f"  Mask area: {dbg['mask_area_pct']:.2f}%, neck_y={dbg['neck_y']}, mid_bicep_y={dbg['mid_bicep_y']}")

    # --- Garment conditioned canvas with new mask ---
    print("[2/6] Preparing Pipeline C segmented garment canvas...")
    conditioner = SareeGarmentConditioner(target_resolution=(1024, 1024))
    canvas = conditioner.prepare_conditioned_canvas(
        person_img=img_person_pil,
        garment_ref_img=img_garment_pil,
        inpaint_mask=new_mask_pil,
        use_segmentation=True
    )
    canvas.save(EVAL_DIR / "07_conditioned_canvas_new_mask.png")

    # --- Regional masks ---
    print("[3/6] Creating regional masks for two-pass experiment...")
    waist_y = dbg.get("waist_y", int(1024 * 0.44))
    # Scale waist_y from original image coords to 1024
    orig_h = img_bgr.shape[0]
    waist_y_1024 = int(waist_y * 1024 / orig_h)
    upper_mask, skirt_mask = conditioner.create_regional_masks(new_mask_pil, waist_y=waist_y_1024)
    upper_mask.save(EVAL_DIR / "08_upper_torso_mask.png")
    skirt_mask.save(EVAL_DIR / "09_lower_skirt_mask.png")
    print(f"  Waist divider at y={waist_y_1024} (in 1024 space)")

    # --- Run 0: Baseline (reuse prior output) ---
    baseline_path = BASE_DIR / "evaluation" / "curated_pilot_eval" / "04_curated_pilot_output.png"
    assert baseline_path.exists(), f"Baseline output not found at {baseline_path}"
    baseline_img = Image.open(baseline_path).convert("RGB")
    shutil.copy(baseline_path, EVAL_DIR / "10_run0_baseline_old_mask.png")
    print("\n[4/6] Run 0 (Baseline): Reusing curated_pilot_eval/04_curated_pilot_output.png")

    # --- Load pipeline ---
    pipe = load_pipeline_with_adapter(device)

    # --- Run 1: Sleeve-corrected mask, single-pass ---
    print("\n[5/6] Run 1 (Sleeve Fix): Single-pass with new mask...")
    t0 = time.time()
    run1_out = run_single_pass(pipe, canvas, new_mask_pil, CAPTION_BASE, STRENGTH_BASE, device)
    dt1 = time.time() - t0
    run1_out.save(EVAL_DIR / "11_run1_sleeve_fix_single_pass.png")
    print(f"  Run 1 completed in {dt1:.1f}s")

    if device.type == "mps":
        torch.mps.empty_cache()

    # --- Run 2: Regional two-pass ---
    print("\n[6/6] Run 2 (Regional): Two-pass (upper=0.80, skirt=0.88)...")
    t0 = time.time()
    pass1_out, run2_out = run_regional_two_pass(pipe, canvas, new_mask_pil, skirt_mask, device)
    dt2 = time.time() - t0
    pass1_out.save(EVAL_DIR / "12_run2_pass1_global.png")
    run2_out.save(EVAL_DIR / "13_run2_pass2_regional_pleats.png")
    print(f"  Run 2 completed in {dt2:.1f}s")

    del pipe
    if device.type == "mps":
        torch.mps.empty_cache()

    # --- Comparison Quad ---
    print("\nAssembling comparison quad...")
    W, H = 1024, 1024
    quad = Image.new("RGB", (W * 4, H))
    quad.paste(img_person_pil, (0, 0))
    quad.paste(baseline_img, (W, 0))
    quad.paste(run1_out, (W * 2, 0))
    quad.paste(run2_out, (W * 3, 0))
    quad.save(EVAL_DIR / "14_comparison_quad.png")

    # --- Metrics ---
    old_mask_path = BASE_DIR / "evaluation" / "conditioner_v1_eval" / "03_corrected_mask.png"
    old_mask_pil = Image.open(old_mask_path).convert("L").resize((1024, 1024))

    report = {
        "experiment_name": "Sleeve Correction & Regional Pleat Experiment",
        "garment": "Blush Pink Organza Saree (held-out test)",
        "parameters": {
            "seed": SEED, "steps": STEPS,
            "guidance_scale": GUIDANCE, "resolution": [1024, 1024],
            "device": str(device)
        },
        "mask_correction": {
            "old_mask_area_pct": round(float((np.array(old_mask_pil) > 128).mean() * 100), 2),
            "new_mask_area_pct": round(dbg["mask_area_pct"], 2),
            "neck_y": dbg["neck_y"],
            "mid_bicep_y": dbg["mid_bicep_y"],
            "waist_y_1024": waist_y_1024
        },
        "run0_baseline": {
            "description": "Curated pilot adapter + old mask, single-pass strength=0.80",
            "output_path": "evaluation/sleeve_and_pleats_v1/10_run0_baseline_old_mask.png",
            "dhash": get_dhash(baseline_img),
            "masked_saree_mean_rgb": masked_mean_rgb(baseline_img, old_mask_pil)
        },
        "run1_sleeve_fix": {
            "description": "Curated pilot adapter + new sleeve-corrected mask, single-pass strength=0.80",
            "output_path": "evaluation/sleeve_and_pleats_v1/11_run1_sleeve_fix_single_pass.png",
            "dhash": get_dhash(run1_out),
            "masked_saree_mean_rgb": masked_mean_rgb(run1_out, new_mask_pil),
            "inference_time_seconds": round(dt1, 2)
        },
        "run2_regional_pleats": {
            "description": "Curated pilot adapter + new mask, Pass 1 full@0.80 then Pass 2 skirt@0.88 with pleat prompt",
            "output_path": "evaluation/sleeve_and_pleats_v1/13_run2_pass2_regional_pleats.png",
            "dhash": get_dhash(run2_out),
            "masked_saree_mean_rgb": masked_mean_rgb(run2_out, new_mask_pil),
            "inference_time_seconds": round(dt2, 2),
            "strengths": {"pass1_global": STRENGTH_BASE, "pass2_skirt": STRENGTH_PLEAT}
        },
        "comparison_quad_path": "evaluation/sleeve_and_pleats_v1/14_comparison_quad.png",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    report_path = EVAL_DIR / "sleeve_and_pleats_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nReport saved to {report_path}")
    print("Done!")


if __name__ == "__main__":
    main()

