"""
PyTorch Saree VTON Dataset & DataLoader (Phase 4)
Loads canonical training/validation batches for diffusion-based saree try-on:
- Supports SDXL Inpainting (1024x1024 resolution).
- Prepares person latents, agnostic latents, mask tensors, and garment reference conditioning.
- Includes deterministic split filtering (train, val, test).
"""

import os
import json
import torch
from pathlib import Path
from typing import Dict, List, Optional
from torch.utils.data import Dataset
from PIL import Image
import torchvision.transforms as T

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class SareeTryOnDataset(Dataset):
    def __init__(
        self,
        manifest_path: str = None,
        split: str = "train",
        resolution: int = 1024,
        tokenizer = None,
        tokenizer_2 = None
    ):
        super().__init__()
        if manifest_path is None:
            manifest_path = str(BASE_DIR / "training" / "data" / "dataset.json")

        self.resolution = resolution
        self.split = split
        self.tokenizer = tokenizer
        self.tokenizer_2 = tokenizer_2

        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        all_samples = data.get("samples", [])
        if split == "all":
            self.samples = all_samples
        else:
            self.samples = [s for s in all_samples if s.get("split") == split]

        # Standard image normalization [-1, 1] for SDXL UNet
        self.image_transforms = T.Compose([
            T.Resize((resolution, resolution), interpolation=T.InterpolationMode.LANCZOS),
            T.ToTensor(),
            T.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
        ])

        # Mask transforms [0, 1] where 1 = inpaint region, 0 = protect
        self.mask_transforms = T.Compose([
            T.Resize((resolution, resolution), interpolation=T.InterpolationMode.NEAREST),
            T.ToTensor()
        ])

        # Garment transforms for CLIP/IP-Adapter conditioning [0, 1] normalized
        self.garment_transforms = T.Compose([
            T.Resize((resolution, resolution), interpolation=T.InterpolationMode.LANCZOS),
            T.ToTensor(),
            T.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
        ])

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        sample = self.samples[idx]

        person_p = BASE_DIR / Path(str(sample["person_image"]).replace("\\", "/"))
        garment_p = BASE_DIR / Path(str(sample["garment_reference"]).replace("\\", "/"))
        agnostic_p = BASE_DIR / Path(str(sample["agnostic_image"]).replace("\\", "/"))
        mask_p = BASE_DIR / Path(str(sample["inpaint_mask"]).replace("\\", "/"))

        person_img = Image.open(person_p).convert("RGB")
        garment_img = Image.open(garment_p).convert("RGB")
        agnostic_img = Image.open(agnostic_p).convert("RGB")
        mask_img = Image.open(mask_p).convert("L")

        person_tensor = self.image_transforms(person_img)
        garment_tensor = self.garment_transforms(garment_img)
        agnostic_tensor = self.image_transforms(agnostic_img)
        mask_tensor = self.mask_transforms(mask_img)

        # Threshold mask to strictly 0.0 or 1.0
        mask_tensor = (mask_tensor > 0.5).float()

        caption = sample.get("caption", "Traditional Indian Silk Saree, photorealistic drape")
        fabric_type = sample.get("fabric_type", "silk")

        item = {
            "sample_id": sample["sample_id"],
            "person_values": person_tensor,          # Target image (Ground Truth)
            "garment_values": garment_tensor,        # Reference garment
            "agnostic_values": agnostic_tensor,      # Agnostic inpaint input
            "mask_values": mask_tensor,              # Inpaint mask (1=saree, 0=preserve)
            "caption": caption,
            "fabric_type": fabric_type,
            "is_sheer": sample.get("is_sheer", False),
            "split": self.split
        }

        # Tokenize if tokenizers provided
        if self.tokenizer and self.tokenizer_2:
            prompt_ids_1 = self.tokenizer(
                caption,
                padding="max_length",
                max_length=self.tokenizer.model_max_length,
                truncation=True,
                return_tensors="pt"
            ).input_ids[0]

            prompt_ids_2 = self.tokenizer_2(
                caption,
                padding="max_length",
                max_length=self.tokenizer_2.model_max_length,
                truncation=True,
                return_tensors="pt"
            ).input_ids[0]

            item["input_ids_1"] = prompt_ids_1
            item["input_ids_2"] = prompt_ids_2

        return item
