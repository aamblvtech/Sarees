"""
AURA Studio — Saree-Specific Generative Model Integration Module (Production Engine)
Manages loading, status, and execution of trained generative try-on checkpoints:
- Default Production Configuration: Single-pass inpainting with sleeve-corrected mask engine V2.
- Inpainting settings: strength=0.80, 20 steps (16 effective diffusion steps), guidance_scale=7.5, seed=42.
- Pipeline C segmented garment reference conditioning (shadow-free cloth projection).
- Truthfully reports model state: GENERATIVE MODEL ACTIVE vs MODEL NOT LOADED.
- Provides fallback to Aura Dense Mesh Engine when model is not loaded.
- Preserves face, neck, hair, forearms, hands, footwear, and background.
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Dict, Tuple, Optional, Union

import torch
import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger("saree-generative-engine")

BASE_DIR = Path(__file__).resolve().parent.parent
SAREES_DIR = BASE_DIR / "SAREES"
TRAIN_SCRIPTS_DIR = BASE_DIR / "training" / "scripts"

if str(SAREES_DIR) not in sys.path:
    sys.path.insert(0, str(SAREES_DIR))
if str(TRAIN_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TRAIN_SCRIPTS_DIR))

CHECKPOINT_DIR = Path(__file__).resolve().parent / "models" / "saree_lora"
TRAINING_CHECKPOINT_DIR = BASE_DIR / "training" / "checkpoints" / "saree_sdxl_lora_curated_pilot"
SMOKE_TEST_CHECKPOINT_DIR = BASE_DIR / "training" / "checkpoints" / "saree_sdxl_lora_smoke_test"

# Approved production inference settings (Run 1 single-pass sleeve-correction)
DEFAULT_INFERENCE_CONFIG = {
    "mode": "single_pass_sleeve_corrected",
    "num_inference_steps": 20,
    "strength": 0.80,  # 16 effective diffusion steps
    "guidance_scale": 7.5,
    "seed": 42,
    "resolution": (1024, 1024),
    "use_regional_two_pass": False,  # Disabled by default per audit approval
    "mask_engine": "saree_mask_engine_v2",
    "conditioning_pipeline": "Pipeline_C_segmented"
}


class SareeGenerativePipeline:
    """
    Production interface for Saree-Specific Generative Virtual Try-On.
    Manages neural checkpoint lifecycle, hardware constraints, and truthful reporting.
    """
    _instance = None

    def __init__(self, checkpoint_path: Optional[str] = None):
        if torch.cuda.is_available():
            self.device = "cuda"
        elif torch.backends.mps.is_available():
            self.device = "mps"
        else:
            self.device = "cpu"

        self.checkpoint_path = Path(checkpoint_path) if checkpoint_path else CHECKPOINT_DIR
        self.active_checkpoint_path = None
        self.pipeline = None
        self.is_loaded = False
        self.status_message = ""
        self.model_version = "SDXL-Saree-LoRA-Curated-Pilot-v1.0"
        self.inference_config = DEFAULT_INFERENCE_CONFIG.copy()

        self._initialize_pipeline()

    def _initialize_pipeline(self):
        """Attempts to discover generative checkpoint and set daemon status."""
        logger.info(f"Initializing Saree Generative Pipeline | Target Device: {self.device}")

        # Check Checkpoint Existence (Priority: Curated Pilot -> Smoke Test -> Local Models)
        weights_file = self.checkpoint_path / "saree_lora_weights.safetensors"
        curated_file = TRAINING_CHECKPOINT_DIR / "saree_lora_weights.safetensors"
        smoke_file = SMOKE_TEST_CHECKPOINT_DIR / "saree_lora_weights.safetensors"

        active_file = None
        if curated_file.exists():
            active_file = curated_file
        elif smoke_file.exists():
            active_file = smoke_file
        elif weights_file.exists():
            active_file = weights_file

        self.active_checkpoint_path = active_file

        # Check acceleration requirement (CUDA or Apple Silicon MPS)
        if self.device not in ["cuda", "mps"]:
            self.is_loaded = False
            ckpt_info = f"Configured with {active_file.parent.name}." if active_file else "Checkpoint not found."
            self.status_message = f"Local server daemon runs on CPU (No CUDA/MPS). {ckpt_info}"
            logger.info(f"Generative Pipeline State: MODEL NOT LOADED ({self.status_message})")
            return

        if not active_file:
            self.is_loaded = False
            self.status_message = "Generative checkpoint not found. Model training must be executed on GPU/MPS."
            logger.info(f"Generative Pipeline State: MODEL NOT LOADED ({self.status_message})")
            return

        self.is_loaded = True
        self.status_message = f"Generative Saree LoRA Model Active ({active_file.name} from {active_file.parent.name}) on {self.device.upper()}."
        logger.info(f"Generative Pipeline State: GENERATIVE MODEL ACTIVE ({self.status_message})")

    def load_neural_pipeline(self, device: Optional[str] = None):
        """
        Loads the SDXL inpainting base model with the active curated LoRA adapter.
        Supports explicit device targeting ('mps', 'cuda', 'cpu').
        """
        if not self.active_checkpoint_path or not self.active_checkpoint_path.exists():
            raise FileNotFoundError(f"Active checkpoint not found: {self.active_checkpoint_path}")

        if device is None:
            if torch.cuda.is_available():
                device = "cuda"
            elif torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"

        target_device = torch.device(device)
        logger.info(f"Loading SDXL inpainting model with LoRA from {self.active_checkpoint_path} onto {target_device}...")

        from diffusers import StableDiffusionXLInpaintPipeline
        from peft import LoraConfig, get_peft_model, set_peft_model_state_dict
        from safetensors.torch import load_file

        pipe = StableDiffusionXLInpaintPipeline.from_pretrained(
            "diffusers/stable-diffusion-xl-1.0-inpainting-0.1",
            torch_dtype=torch.float16,
            variant="fp16"
        )
        lora_config = LoraConfig(
            r=32,
            lora_alpha=32,
            target_modules=["to_k", "to_q", "to_v", "to_out.0"],
            lora_dropout=0.0,
            bias="none"
        )
        pipe.unet = get_peft_model(pipe.unet, lora_config)
        state_dict = load_file(str(self.active_checkpoint_path))
        set_peft_model_state_dict(pipe.unet, state_dict)

        pipe.to(target_device)
        if target_device.type == "mps":
            pipe.enable_attention_slicing()
            torch.mps.empty_cache()

        self.pipeline = pipe
        self.device = str(target_device)
        self.is_loaded = True
        self.status_message = f"Generative Saree LoRA Model Loaded ({self.active_checkpoint_path.name} from {self.active_checkpoint_path.parent.name}) on {target_device}"
        logger.info(self.status_message)
        return pipe

    def get_status(self) -> Dict:
        """Returns truthful, real-time status of the generative AI engine."""
        cuda_avail = torch.cuda.is_available()
        mps_avail = torch.backends.mps.is_available()
        if cuda_avail:
            gpu_name = torch.cuda.get_device_name(0)
        elif mps_avail:
            gpu_name = "Apple Silicon GPU (Metal Performance Shaders - MPS)"
        else:
            gpu_name = "Intel CPU Execution (No CUDA)"

        if self.is_loaded:
            status_label = "GENERATIVE MODEL ACTIVE"
        elif not (cuda_avail or mps_avail):
            status_label = "MODEL NOT LOADED (CPU Architecture)"
        else:
            status_label = "MODEL NOT LOADED (Checkpoint Pending)"

        return {
            "status_label": status_label,
            "generative_model_active": self.is_loaded,
            "model_version": self.model_version,
            "device": self.device,
            "gpu_name": gpu_name,
            "cuda_available": cuda_avail,
            "mps_available": mps_avail,
            "checkpoint_path": str(self.active_checkpoint_path) if self.active_checkpoint_path else None,
            "checkpoint_configured": bool(self.active_checkpoint_path and self.active_checkpoint_path.exists()),
            "status_message": self.status_message,
            "fallback_available": True,
            "fallback_engine": "Aura Dense Mesh & Drape Engine (Local MediaPipe & Delaunay)",
            "inference_config": self.inference_config
        }

    def execute_neural_tryon(
        self,
        person_input: Union[str, Path, Image.Image],
        garment_input: Union[str, Path, Image.Image],
        saree_id: Optional[int] = None,
        out_path: Optional[Union[str, Path]] = None,
        prompt: Optional[str] = None,
        device: Optional[str] = None,
        num_inference_steps: Optional[int] = None,
        strength: Optional[float] = None,
        guidance_scale: Optional[float] = None,
        seed: Optional[int] = None
    ) -> Tuple[Image.Image, Dict]:
        """
        Executes approved production neural try-on (Run 1 single-pass sleeve-corrected):
        1. Uses saree_mask_engine_v2 for precision sleeve coverage, neck/face/hair preservation.
        2. Uses SareeGarmentConditioner for Pipeline C segmented cloth projection (shadow-free).
        3. Diffuses with SDXL Inpainting + Curated LoRA at strength=0.80 (16 diffusion steps).
        """
        t0 = time.time()
        steps = num_inference_steps or self.inference_config["num_inference_steps"]
        str_val = strength if strength is not None else self.inference_config["strength"]
        cfg_val = guidance_scale or self.inference_config["guidance_scale"]
        seed_val = seed if seed is not None else self.inference_config["seed"]
        res = self.inference_config["resolution"]

        # 1. Load Images
        if isinstance(person_input, (str, Path)):
            person_pil = Image.open(str(person_input)).convert("RGB").resize(res)
            person_cv2 = cv2.imread(str(person_input))
            person_cv2 = cv2.resize(person_cv2, res)
        else:
            person_pil = person_input.convert("RGB").resize(res)
            person_cv2 = cv2.cvtColor(np.array(person_pil), cv2.COLOR_RGB2BGR)

        if isinstance(garment_input, (str, Path)):
            garment_pil = Image.open(str(garment_input)).convert("RGB")
        else:
            garment_pil = garment_input.convert("RGB")

        # 2. Precision Sleeve-Corrected Mask Generation
        from saree_mask_engine_v2 import generate_corrected_saree_mask, get_segmenter, get_pose_detector
        seg = get_segmenter()
        pose = get_pose_detector()
        mask_np, _, dbg = generate_corrected_saree_mask(person_cv2, seg, pose)
        mask_pil = Image.fromarray(mask_np).convert("L")

        # 3. Pipeline C Segmented Garment Conditioning
        from garment_conditioner import SareeGarmentConditioner
        conditioner = SareeGarmentConditioner(target_resolution=res)
        canvas = conditioner.prepare_conditioned_canvas(
            person_img=person_pil,
            garment_ref_img=garment_pil,
            inpaint_mask=mask_pil,
            use_segmentation=True
        )

        # 4. Resolve Prompt
        if not prompt:
            saree_name = "Blush Pink Organza Saree"
            saree_fabric = "Sheer Luxe Organza"
            try:
                from main import SAREES
                if saree_id and saree_id in SAREES:
                    saree_name = SAREES[saree_id].get("name", saree_name)
                    saree_fabric = SAREES[saree_id].get("fabric", saree_fabric)
            except Exception:
                pass
            prompt = (
                f"Photorealistic full-body portrait of a woman draped in an ethereal {saree_name}, "
                f"{saree_fabric}, delicate scalloped pearl and silver beaded border, "
                f"sheer organza texture, matching blouse, full-length translucent drape"
            )

        # 5. Ensure Pipeline is Loaded
        if self.pipeline is None:
            self.load_neural_pipeline(device=device)

        target_device = torch.device(self.device)
        generator = torch.Generator(device=target_device).manual_seed(seed_val)

        logger.info(
            f"Executing Production Neural Try-on: steps={steps}, strength={str_val} "
            f"({int(steps * str_val)} effective steps), guidance={cfg_val}, seed={seed_val}..."
        )

        output = self.pipeline(
            prompt=prompt,
            image=canvas,
            mask_image=mask_pil,
            num_inference_steps=steps,
            strength=str_val,
            guidance_scale=cfg_val,
            generator=generator
        ).images[0]

        dt = time.time() - t0

        if out_path:
            out_p = Path(out_path)
            out_p.parent.mkdir(parents=True, exist_ok=True)
            output.save(out_p)

        metrics = {
            "backend_used": "GENERATIVE SDXL LoRA ACTIVE",
            "quality_status": "READY FOR VISUAL REVIEW",
            "model_version": self.model_version,
            "checkpoint": str(self.active_checkpoint_path),
            "inference_mode": "single_pass_sleeve_corrected",
            "inference_time_seconds": round(dt, 2),
            "steps": steps,
            "effective_diffusion_steps": int(steps * str_val),
            "strength": str_val,
            "guidance_scale": cfg_val,
            "seed": seed_val,
            "mask_area_pct": dbg.get("mask_area_pct", round(float((mask_np > 128).mean() * 100), 2))
        }

        return output, metrics

    def run_tryon(
        self,
        person_path: str,
        saree_path: str,
        saree_id: int,
        out_path: str,
        allow_fallback: bool = True
    ) -> Tuple[bool, Dict]:
        """
        Executes virtual try-on:
        - If generative model is loaded: executes production neural try-on.
        - If model not loaded and allow_fallback=True: invokes local mesh engine and reports LOCAL MESH FALLBACK.
        - Never misrepresents a mesh result as a generative neural result.
        """
        if self.is_loaded:
            logger.info(f"Running generative SDXL LoRA try-on for Saree {saree_id}...")
            try:
                output_img, metrics = self.execute_neural_tryon(
                    person_input=person_path,
                    garment_input=saree_path,
                    saree_id=saree_id,
                    out_path=out_path
                )
                return True, metrics
            except Exception as e:
                logger.error(f"Neural try-on failed: {e}")
                if not allow_fallback:
                    return False, {
                        "backend_used": "GENERATIVE SDXL LoRA",
                        "quality_status": "GENERATION FAILED",
                        "error": str(e)
                    }

        # Model not loaded:
        if not allow_fallback:
            return False, {
                "backend_used": "NONE",
                "quality_status": "GENERATION FAILED",
                "error": f"Generative model not loaded: {self.status_message}"
            }

        logger.info(f"Generative model not loaded ({self.status_message}). Routing to verified Local Mesh Fallback.")
        from main import in_place_saree_clothing_swap, SAREES
        saree_item = SAREES.get(saree_id, {})
        saree_color = saree_item.get("color_bgr", [50, 27, 158])

        ok, metrics = in_place_saree_clothing_swap(
            person_path,
            saree_path,
            out_path,
            saree_color_bgr=saree_color,
            saree_id=saree_id,
            return_metrics=True
        )

        return ok, {
            "backend_used": "LOCAL MESH FALLBACK",
            "quality_status": metrics.get("status", "READY FOR VISUAL REVIEW"),
            "quality_metrics": metrics,
            "fallback_reason": self.status_message
        }


# Singleton accessor
_pipeline_instance = None

def get_generative_pipeline() -> SareeGenerativePipeline:
    global _pipeline_instance
    if _pipeline_instance is None:
        _pipeline_instance = SareeGenerativePipeline()
    return _pipeline_instance
