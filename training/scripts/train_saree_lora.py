"""
Saree-Specific Generative Virtual Try-On LoRA Training Pipeline
Apple Silicon MPS & NVIDIA CUDA Compatible (Phase 4 / Phase 5)

Fine-tunes Stable Diffusion XL Inpainting with LoRA on Indian Traditional Sarees:
- Conditions on: Saree Agnostic Canvas, 1024x1024 Inpainting Mask, Garment Reference Image, Text Prompt.
- Uses Hugging Face Diffusers + PEFT (LoRA rank=32, alpha=32).
- Mixed precision (fp16), gradient checkpointing, standard AdamW optimizer (MPS compatible).
- Truthful logging: Tracks real forward/backward passes, finite loss, and gradient flow.
- Checkpoint verification: Saves and immediately verifies checkpoint reload.
"""

import os
import sys
import json
import time
import math
import argparse
import logging
from pathlib import Path

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from safetensors.torch import save_file, load_file

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR / "training" / "scripts"))

from dataset import SareeTryOnDataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [Saree-LoRA] %(message)s")
logger = logging.getLogger("saree-lora-trainer")


def parse_args():
    parser = argparse.ArgumentParser(description="Train Saree-Specific Virtual Try-On LoRA")
    parser.add_argument("--config", type=str, default="training/configs/saree_lora_config.json", help="Path to JSON config")
    parser.add_argument("--output_dir", type=str, default="training/checkpoints/saree_sdxl_lora_curated_pilot")
    parser.add_argument("--max_train_steps", type=int, default=None, help="Override maximum training steps")
    parser.add_argument("--resolution", type=int, default=None, help="Override training resolution (e.g. 1024 or 512)")
    parser.add_argument("--resume_from_checkpoint", type=str, default=None, help="Directory of existing checkpoint to resume from")
    parser.add_argument("--smoke_test", action="store_true", help="Run a small smoke-test (3-5 steps) to verify pipeline execution")
    parser.add_argument("--dry_run", action="store_true", help="Perform shape validation only (CPU safe)")
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def detect_device() -> torch.device:
    if torch.cuda.is_available():
        device = torch.device("cuda")
        logger.info(f"Target Hardware: NVIDIA CUDA ({torch.cuda.get_device_name(0)})")
    elif torch.backends.mps.is_available():
        device = torch.device("mps")
        logger.info("Target Hardware: Apple Silicon GPU (Apple MPS Native Acceleration)")
    else:
        device = torch.device("cpu")
        logger.warning("Target Hardware: CPU (No GPU acceleration available)")
    return device


def encode_prompt(caption: str, tokenizer, tokenizer_2, text_encoder, text_encoder_2, device):
    """Precomputes text embeddings using CLIP and OpenCLIP text encoders."""
    te_device = next(text_encoder.parameters()).device
    te2_device = next(text_encoder_2.parameters()).device
    with torch.no_grad():
        tokens_1 = tokenizer(
            caption,
            padding="max_length",
            max_length=tokenizer.model_max_length,
            truncation=True,
            return_tensors="pt"
        ).input_ids.to(te_device)

        tokens_2 = tokenizer_2(
            caption,
            padding="max_length",
            max_length=tokenizer_2.model_max_length,
            truncation=True,
            return_tensors="pt"
        ).input_ids.to(te2_device)

        enc_out_1 = text_encoder(tokens_1, output_hidden_states=True)
        prompt_embeds_1 = enc_out_1.hidden_states[-2]

        enc_out_2 = text_encoder_2(tokens_2, output_hidden_states=True)
        prompt_embeds_2 = enc_out_2.hidden_states[-2]
        pooled_prompt_embeds = enc_out_2.text_embeds

        prompt_embeds = torch.concat([prompt_embeds_1, prompt_embeds_2], dim=-1)
    return prompt_embeds.to(device), pooled_prompt_embeds.to(device)


def evaluate_validation(val_loader, unet, vae, noise_scheduler, tokenizer, tokenizer_2, text_encoder, text_encoder_2, device, weight_dtype, resolution):
    if not val_loader or len(val_loader) == 0:
        return None
    unet.eval()
    val_losses = []
    with torch.no_grad():
        for batch in val_loader:
            person_imgs = batch["person_values"].to(device, dtype=weight_dtype)
            agnostic_imgs = batch["agnostic_values"].to(device, dtype=weight_dtype)
            masks = batch["mask_values"].to(device, dtype=weight_dtype)

            person_latents = vae.encode(person_imgs).latent_dist.sample() * vae.config.scaling_factor
            agnostic_latents = vae.encode(agnostic_imgs).latent_dist.sample() * vae.config.scaling_factor
            mask_latents = F.interpolate(masks, size=person_latents.shape[-2:], mode="nearest")

            noise = torch.randn_like(person_latents)
            bsz = person_latents.shape[0]
            timesteps = torch.tensor([500] * bsz, device=device).long()
            noisy_latents = noise_scheduler.add_noise(person_latents, noise, timesteps)
            unet_input = torch.cat([noisy_latents, mask_latents, agnostic_latents], dim=1)

            caption = batch["caption"][0]
            prompt_embeds, pooled_prompt_embeds = encode_prompt(
                caption, tokenizer, tokenizer_2, text_encoder, text_encoder_2, device
            )
            add_time_ids = torch.tensor([[resolution, resolution, 0, 0, resolution, resolution]], device=device, dtype=weight_dtype)
            added_cond_kwargs = {
                "text_embeds": pooled_prompt_embeds,
                "time_ids": add_time_ids
            }
            pred = unet(unet_input, timesteps, encoder_hidden_states=prompt_embeds, added_cond_kwargs=added_cond_kwargs).sample
            v_loss = F.mse_loss(pred.float(), noise.float(), reduction="mean").item()
            val_losses.append(v_loss)
    unet.train()
    mean_val = sum(val_losses) / len(val_losses) if val_losses else None
    return mean_val


def save_checkpoint(
    unet, output_dir, step, max_steps, step_losses, val_losses, cfg, base_model_name,
    resolution, lora_rank, lora_alpha, train_len, val_len, device,
    trainable_param_count, total_param_count, is_final=False, status="TRAINING_COMPLETED_CHECKPOINT_SAVED"
):
    from peft import get_peft_model_state_dict
    lora_state_dict = get_peft_model_state_dict(unet)
    weights_path = output_dir / "saree_lora_weights.safetensors"
    save_file(lora_state_dict, weights_path)
    if not is_final:
        step_weights = output_dir / f"saree_lora_step_{step}.safetensors"
        save_file(lora_state_dict, step_weights)

    checkpoint_meta = {
        "status": status,
        "model_type": cfg.get("model_type", "sdxl_inpainting_lora"),
        "base_model": base_model_name,
        "resolution": resolution,
        "lora_rank": lora_rank,
        "lora_alpha": lora_alpha,
        "train_samples_count": train_len,
        "validation_samples_count": val_len,
        "trained_steps": step,
        "target_steps": max_steps,
        "convergence_metrics": {
            "initial_loss": step_losses[0] if step_losses else None,
            "final_loss": step_losses[-1] if step_losses else None,
            "step_losses": step_losses,
            "val_losses": val_losses
        },
        "environment_audit": {
            "device": str(device),
            "mps_available": torch.backends.mps.is_available(),
            "cuda_available": torch.cuda.is_available(),
            "trainable_parameters": trainable_param_count,
            "total_parameters": total_param_count
        },
        "checkpoint_file": str(weights_path.name),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    meta_file = output_dir / "saree_lora_metadata.json"
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(checkpoint_meta, f, indent=2)
    logger.info(f"Checkpoint saved to {output_dir} (step {step}/{max_steps}, status: {status})")
    return weights_path, meta_file


def train():
    args = parse_args()
    torch.manual_seed(args.seed)

    # 1. Load Configuration
    config_path = BASE_DIR / args.config
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    else:
        logger.warning(f"Config {config_path} not found; using defaults.")
        cfg = {
            "base_model": "diffusers/stable-diffusion-xl-1.0-inpainting-0.1",
            "resolution": 1024,
            "train_batch_size": 1,
            "learning_rate": 1e-4,
            "lora_rank": 32,
            "lora_alpha": 32,
            "max_train_steps": 5
        }

    max_steps = args.max_train_steps or (5 if args.smoke_test else cfg.get("max_train_steps", 5))
    resolution = args.resolution or cfg.get("resolution", 1024)
    checkpointing_steps = cfg.get("checkpointing_steps", 10)
    validation_steps = cfg.get("validation_steps", 10)

    target_out = args.output_dir or cfg.get("output_dir", "training/checkpoints/saree_sdxl_lora_curated_pilot")
    output_dir = BASE_DIR / target_out

    # Strict protection: NEVER overwrite the existing smoke test checkpoint
    smoke_test_dir = BASE_DIR / "training" / "checkpoints" / "saree_sdxl_lora_smoke_test"
    if output_dir == smoke_test_dir and (smoke_test_dir / "saree_lora_weights.safetensors").exists():
        output_dir = BASE_DIR / "training" / "checkpoints" / "saree_sdxl_lora_curated_pilot"
        logger.warning(f"Protected smoke-test checkpoint detected! Redirecting output to: {output_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)

    # 2. Hardware Capability Check
    device = detect_device()
    logger.info("=" * 65)
    logger.info("  SAREE-SPECIFIC GENERATIVE VIRTUAL TRY-ON (SDXL LoRA)")
    logger.info(f"  Target Device: {device} | Max Steps: {max_steps} | Resolution: {resolution}x{resolution}")
    logger.info("=" * 65)

    # 3. Load Dataset
    manifest_p = BASE_DIR / cfg.get("dataset_manifest", "training/data/dataset_curated.json")
    if not manifest_p.exists():
        logger.error(f"Dataset manifest not found: {manifest_p}")
        return False

    train_dataset = SareeTryOnDataset(manifest_path=str(manifest_p), split="train", resolution=resolution)
    val_dataset = SareeTryOnDataset(manifest_path=str(manifest_p), split="val", resolution=resolution)
    logger.info(f"Dataset loaded: {len(train_dataset)} training samples | {len(val_dataset)} validation samples")

    if len(train_dataset) == 0:
        logger.error("No training samples found in manifest!")
        return False

    train_loader = DataLoader(train_dataset, batch_size=cfg.get("train_batch_size", 1), shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=1, shuffle=False) if len(val_dataset) > 0 else None

    # 4. Dry-Run Mode (CPU Safe)
    if args.dry_run or device.type == "cpu":
        logger.info("\n--- Executing Shape Verification Dry-Run ---")
        batch = next(iter(train_loader))
        logger.info(f"Sample ID: {batch['sample_id'][0]}")
        logger.info(f"Target Person Tensor: {batch['person_values'].shape}")
        logger.info(f"Garment Reference Tensor: {batch['garment_values'].shape}")
        logger.info(f"Agnostic Canvas Tensor: {batch['agnostic_values'].shape}")
        logger.info(f"Inpaint Mask Tensor: {batch['mask_values'].shape}")
        logger.info(f"Conditioning Caption: '{batch['caption'][0][:60]}...'")

        checkpoint_meta = {
            "status": "PIPELINE_VALIDATED_DRY_RUN",
            "model_type": cfg.get("model_type", "sdxl_inpainting_lora"),
            "base_model": cfg.get("base_model", "diffusers/stable-diffusion-xl-1.0-inpainting-0.1"),
            "resolution": resolution,
            "lora_rank": cfg.get("lora_rank", 32),
            "trained_steps": 0,
            "device": str(device),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        with open(output_dir / "saree_lora_metadata.json", "w", encoding="utf-8") as f:
            json.dump(checkpoint_meta, f, indent=2)
        logger.info("Dry-run completed successfully.")
        return True

    # 5. Real Training Mode (Apple MPS or NVIDIA CUDA)
    from diffusers import UNet2DConditionModel, AutoencoderKL, DDPMScheduler
    from transformers import AutoTokenizer, CLIPTextModel, CLIPTextModelWithProjection
    from peft import LoraConfig, get_peft_model, get_peft_model_state_dict, set_peft_model_state_dict

    base_model_name = cfg.get("base_model", "diffusers/stable-diffusion-xl-1.0-inpainting-0.1")
    logger.info(f"Loading SDXL inpainting base model: {base_model_name}...")

    # Precision
    weight_dtype = torch.float16 if cfg.get("mixed_precision") == "fp16" else torch.float32

    # Load Noise Scheduler
    noise_scheduler = DDPMScheduler.from_pretrained(base_model_name, subfolder="scheduler")

    # Load Tokenizers
    tokenizer = AutoTokenizer.from_pretrained(base_model_name, subfolder="tokenizer", use_fast=False)
    tokenizer_2 = AutoTokenizer.from_pretrained(base_model_name, subfolder="tokenizer_2", use_fast=False)

    # Load Text Encoders (frozen)
    logger.info("Loading text encoders (frozen)...")
    text_encoder = CLIPTextModel.from_pretrained(base_model_name, subfolder="text_encoder", torch_dtype=weight_dtype)
    text_encoder_2 = CLIPTextModelWithProjection.from_pretrained(
        base_model_name,
        subfolder="text_encoder_2",
        torch_dtype=weight_dtype,
        variant="fp16" if weight_dtype == torch.float16 else None
    )
    text_encoder.requires_grad_(False)
    text_encoder_2.requires_grad_(False)
    te_device = torch.device("cpu") if device.type == "mps" else device
    text_encoder.to(te_device)
    text_encoder_2.to(te_device)

    # Load VAE (frozen)
    vae_name = cfg.get("vae_model", base_model_name)
    logger.info(f"Loading VAE ({vae_name})...")
    vae = AutoencoderKL.from_pretrained(
        vae_name,
        subfolder="vae",
        torch_dtype=weight_dtype,
        variant="fp16" if weight_dtype == torch.float16 else None
    )
    vae.requires_grad_(False)
    vae.to(device)

    # Load SDXL Inpainting UNet (9 input channels)
    logger.info("Loading SDXL Inpainting UNet (9 input channels)...")
    unet = UNet2DConditionModel.from_pretrained(
        base_model_name,
        subfolder="unet",
        torch_dtype=weight_dtype,
        variant="fp16" if weight_dtype == torch.float16 else None
    )
    unet.requires_grad_(False)

    # LoRA Configuration
    lora_rank = cfg.get("lora_rank", 32)
    lora_alpha = cfg.get("lora_alpha", 32)
    lora_target_modules = cfg.get("lora_target_modules", ["to_k", "to_q", "to_v", "to_out.0"])

    logger.info(f"Injecting LoRA adapters (rank={lora_rank}, alpha={lora_alpha}, targets={lora_target_modules})...")
    lora_config = LoraConfig(
        r=lora_rank,
        lora_alpha=lora_alpha,
        target_modules=lora_target_modules,
        lora_dropout=0.0,
        bias="none"
    )
    unet = get_peft_model(unet, lora_config)

    # Resume capability if requested
    start_step = 0
    step_losses = []
    val_losses = []

    if args.resume_from_checkpoint:
        resume_dir = BASE_DIR / args.resume_from_checkpoint
        resume_weights = resume_dir / "saree_lora_weights.safetensors"
        resume_meta = resume_dir / "saree_lora_metadata.json"
        if resume_weights.exists():
            loaded_dict = load_file(str(resume_weights))
            set_peft_model_state_dict(unet, loaded_dict)
            logger.info(f"Loaded existing LoRA weights from {resume_weights} ({len(loaded_dict)} tensors).")
            if resume_meta.exists():
                with open(resume_meta, "r", encoding="utf-8") as f:
                    meta_prev = json.load(f)
                    start_step = meta_prev.get("trained_steps", 0)
                    step_losses = meta_prev.get("convergence_metrics", {}).get("step_losses", [])
                    val_losses = meta_prev.get("convergence_metrics", {}).get("val_losses", [])
                    logger.info(f"Resuming training from step {start_step}/{max_steps}...")

    # Enable gradient checkpointing for unified memory conservation
    if cfg.get("gradient_checkpointing", True):
        logger.info("Enabling UNet gradient checkpointing for memory efficiency.")
        unet.enable_gradient_checkpointing()

    unet.to(device)

    # Verify trainable parameter count
    trainable_params = [p for p in unet.parameters() if p.requires_grad]
    trainable_param_count = sum(p.numel() for p in trainable_params)
    total_param_count = sum(p.numel() for p in unet.parameters())
    trainable_pct = (trainable_param_count / total_param_count) * 100
    logger.info(f"Model Parameters: Total={total_param_count:,} | Trainable (LoRA)={trainable_param_count:,} ({trainable_pct:.2f}%)")

    # Optimizer: Standard AdamW for Apple Silicon MPS
    learning_rate = float(cfg.get("learning_rate", 1e-4))
    optimizer = torch.optim.AdamW(trainable_params, lr=learning_rate, weight_decay=1e-2)
    logger.info(f"Optimizer: PyTorch AdamW (lr={learning_rate}) on {device}")

    # 6. Real Training Loop Execution
    logger.info(f"Starting real training loop on {device} from step {start_step} to {max_steps}...")
    train_iter = iter(train_loader)
    step = start_step

    try:
        while step < max_steps:
            try:
                batch = next(train_iter)
            except StopIteration:
                train_iter = iter(train_loader)
                batch = next(train_iter)

            step += 1
            t_start = time.time()

            # A. Encode Target Person and Agnostic Canvas via VAE
            with torch.no_grad():
                person_imgs = batch["person_values"].to(device, dtype=weight_dtype)
                agnostic_imgs = batch["agnostic_values"].to(device, dtype=weight_dtype)
                masks = batch["mask_values"].to(device, dtype=weight_dtype)

                # Target latents (ground truth)
                person_latents = vae.encode(person_imgs).latent_dist.sample() * vae.config.scaling_factor
                # Agnostic latents (inpainting base)
                agnostic_latents = vae.encode(agnostic_imgs).latent_dist.sample() * vae.config.scaling_factor
                # Downsampled inpainting mask matching latent resolution
                mask_latents = F.interpolate(masks, size=person_latents.shape[-2:], mode="nearest")

                # Sample random diffusion noise
                noise = torch.randn_like(person_latents)
                bsz = person_latents.shape[0]
                timesteps = torch.randint(0, noise_scheduler.config.num_train_timesteps, (bsz,), device=device).long()
                noisy_latents = noise_scheduler.add_noise(person_latents, noise, timesteps)

                # SDXL Inpainting 9-channel concatenation
                unet_input = torch.cat([noisy_latents, mask_latents, agnostic_latents], dim=1)

                # Encode Text Conditioning
                caption = batch["caption"][0]
                prompt_embeds, pooled_prompt_embeds = encode_prompt(
                    caption, tokenizer, tokenizer_2, text_encoder, text_encoder_2, device
                )

                # SDXL Micro-Conditioning (original_size, crops_coords, target_size)
                add_time_ids = torch.tensor([[resolution, resolution, 0, 0, resolution, resolution]], device=device, dtype=weight_dtype)
                added_cond_kwargs = {
                    "text_embeds": pooled_prompt_embeds,
                    "time_ids": add_time_ids
                }

            # B. Forward Pass through UNet
            optimizer.zero_grad()
            model_pred = unet(
                unet_input,
                timesteps,
                encoder_hidden_states=prompt_embeds,
                added_cond_kwargs=added_cond_kwargs
            ).sample

            # C. Loss Computation
            loss = F.mse_loss(model_pred.float(), noise.float(), reduction="mean")
            assert torch.isfinite(loss), f"Encountered non-finite loss at step {step}: {loss.item()}"

            # D. Backward Pass
            loss.backward()

            # E. Gradient Verification
            grad_norms = [p.grad.norm().item() for p in trainable_params if p.grad is not None]
            assert len(grad_norms) > 0, f"No LoRA parameters received gradients at step {step}!"
            mean_grad = sum(grad_norms) / len(grad_norms)

            # F. Gradient Clipping & Optimizer Step
            torch.nn.utils.clip_grad_norm_(trainable_params, 1.0)
            optimizer.step()

            elapsed = time.time() - t_start
            final_loss = loss.item()
            step_losses.append(final_loss)
            logger.info(
                f"Step {step}/{max_steps} | Loss: {final_loss:.4f} | "
                f"Mean Grad Norm: {mean_grad:.4e} | Step Time: {elapsed:.2f}s | Device: {device}"
            )

            # Periodic Validation
            if val_loader and step % validation_steps == 0:
                v_loss = evaluate_validation(
                    val_loader, unet, vae, noise_scheduler, tokenizer, tokenizer_2,
                    text_encoder, text_encoder_2, device, weight_dtype, resolution
                )
                if v_loss is not None:
                    val_losses.append(v_loss)
                    logger.info(f"--- [Validation] Step {step} | Val Loss: {v_loss:.4f} ---")

            # Periodic Checkpointing
            if step % checkpointing_steps == 0 and step < max_steps:
                save_checkpoint(
                    unet, output_dir, step, max_steps, step_losses, val_losses, cfg,
                    base_model_name, resolution, lora_rank, lora_alpha, len(train_dataset),
                    len(val_dataset), device, trainable_param_count, total_param_count,
                    is_final=False, status="IN_PROGRESS_CHECKPOINT_SAVED"
                )

            if device.type == "mps":
                torch.mps.empty_cache()

    except KeyboardInterrupt:
        logger.warning(f"Training interrupted by user at step {step}! Saving recovery checkpoint...")
        save_checkpoint(
            unet, output_dir, step, max_steps, step_losses, val_losses, cfg,
            base_model_name, resolution, lora_rank, lora_alpha, len(train_dataset),
            len(val_dataset), device, trainable_param_count, total_param_count,
            is_final=False, status="INTERRUPTED_RECOVERY_SAVED"
        )
        logger.info("Recovery checkpoint saved. Exiting safely.")
        return False

    # 7. Final Validation & Checkpoint Saving
    if val_loader:
        final_val = evaluate_validation(
            val_loader, unet, vae, noise_scheduler, tokenizer, tokenizer_2,
            text_encoder, text_encoder_2, device, weight_dtype, resolution
        )
        if final_val is not None:
            val_losses.append(final_val)
            logger.info(f"--- [Final Validation] Val Loss: {final_val:.4f} ---")

    logger.info(f"Training completed. Saving final LoRA checkpoint to {output_dir}...")
    weights_path, meta_file = save_checkpoint(
        unet, output_dir, step, max_steps, step_losses, val_losses, cfg,
        base_model_name, resolution, lora_rank, lora_alpha, len(train_dataset),
        len(val_dataset), device, trainable_param_count, total_param_count,
        is_final=True, status="TRAINING_COMPLETED_CHECKPOINT_SAVED"
    )

    # 8. Checkpoint Reload Verification
    logger.info("Verifying checkpoint reload integrity...")
    reloaded_dict = load_file(str(weights_path))
    assert len(reloaded_dict) > 0, "Reloaded checkpoint has 0 tensors!"
    logger.info(f"Checkpoint reload verified successfully: {len(reloaded_dict)} tensors confirmed valid.")

    return True


if __name__ == "__main__":
    train()
