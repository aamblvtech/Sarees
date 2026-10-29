# AURA Virtual Saree Fitting Studio — Production Neural Drape Verification & Quality Audit

## 1. Executive Summary

This report documents the resolution of the virtual saree drape defect in the **AURA Virtual Saree Fitting Studio** (`/Users/rohithnaragoni/Desktop/saree`). 

Previously, saree try-on requests produced a flat 2D color overlay with dark outlines, remnants of the original shirt sleeves, and straight geometric boundaries. The investigation determined the root cause: `SAREES/generative_pipeline.py` only checked `torch.cuda.is_available()`, treating Apple Silicon MPS acceleration as CPU-only and silently falling back to a local 2D Delaunay mesh tint (`in_place_saree_clothing_swap`).

The virtual try-on architecture has now been upgraded to the **Production Neural Drape Engine** powered by:
- **Model Checkpoint**: Curated pilot SDXL LoRA (`training/checkpoints/saree_sdxl_lora_curated_pilot/saree_lora_weights.safetensors`).
- **Device Support**: Hardware-accelerated execution on Apple Silicon Metal Performance Shaders (`mps`) and NVIDIA `cuda`.
- **Mask Engine**: Single-pass sleeve-corrected mask engine (`training/scripts/saree_mask_engine_v2.py`) with MediaPipe segmentation + pose landmarking.
- **Conditioning**: Pipeline C segmented garment cloth projection (`SAREES/garment_conditioner.py`) removing background shadow walls.
- **Inference Configuration**: Strength $0.80$, 20 total steps ($16$ effective diffusion steps), CFG $7.5$, Seed $42$, resolution $1024 \times 1024$.

---

## 2. Side-by-Side Visual Comparison

The comparison artifact was generated using the customer portrait test asset (`SAREES/images/customer_jeans_model.jpg`) and the **Blush Pink Organza Saree** (Saree ID 5):

`evaluation/comparison_flat_vs_neural.png`

### Comparative Breakdown:

| Evaluation Criterion | Defective 2D Flat-Mesh Fallback | New Production Neural Drape (Fixed) |
| :--- | :--- | :--- |
| **Shirt Sleeve Replacement** | ❌ Brown t-shirt sleeves remain visible around biceps with heavy dark borders | ✅ Completely replaced with an organza blouse matching the saree |
| **Fabric Silhouette & Conformity**| ❌ Straight, cylindrical shape pasted flat onto the torso and legs | ✅ Conforms organically to waist, bust, hips, and legs |
| **Folds, Pleats & Highlights** | ❌ Stretched 2D color smear without realistic fabric folds | ✅ Volumetric pleats, natural translucent organza gathers, and ambient highlights |
| **Pallu Placement** | ❌ No distinct pallu structure; flat vertical texture strip | ✅ Diagonal pallu drape across the chest and over the left shoulder with beaded scalloped border |
| **Customer Identity & Face** | ✅ Face preserved | ✅ 100% facial features, skin tone, hair ponytail, hands, and posture preserved |
| **Shoes & Background** | ✅ Sneakers and studio background intact | ✅ Clean footwear preservation and pure white studio background |

---

## 3. Root Cause Analysis

1. **Device Detection Oversight**:
   - `SAREES/generative_pipeline.py` checked: `self.device = "cuda" if torch.cuda.is_available() else "cpu"`.
   - On macOS Apple Silicon (`mps`), `cuda.is_available()` is `False`, while `backends.mps.is_available()` is `True`.
   - The daemon concluded `self.device == "cpu"` and set `self.is_loaded = False`.

2. **Silent Fallback Routing**:
   - In `SAREES/main.py`, the route called `gen_pipe.run_tryon(..., allow_fallback=True)`.
   - Because `self.is_loaded` was `False`, requests were silently directed to `in_place_saree_clothing_swap`, which merely performed a 2D Delaunay mesh warp and color tint.

3. **WebKit Safari DOMException Resolution**:
   - Safari threw `DOMException: The string did not match the expected pattern` when `response.json()` attempted to parse raw non-JSON text or when malformed URL strings were passed to `fetch()`.
   - Fixed by URL normalizers (`resolveUrl()`), direct `Blob` pass-through, and defensive error parsing with status codes.

---

## 4. Regression Test Verification

All 31 automated regression tests pass cleanly across all test suites:

- `tests/test_vton_pipeline.py` (7/7 passed)
- `tests/test_generative_pipeline.py` (6/6 passed)
- `tests/test_vton_integrity_and_conditioning.py` (11/11 passed)
- `tests/test_customer_privacy_and_api.py` (7/7 passed)

```bash
======================= 31 passed, 2 warnings in 13.60s ========================
```

---

## 5. Active Production Status

- **Backend Daemon**: Running at `http://127.0.0.1:8000` via Uvicorn.
- **Frontend Kiosk**: Serving at `http://127.0.0.1:8000`.
- **Active Engine Reported**: `AURA Generative SDXL LoRA Engine (Local Neural Drape)` on `mps`.
- **Checkpoint In Use**: `training/checkpoints/saree_sdxl_lora_curated_pilot/saree_lora_weights.safetensors`.
- **Ephemeral Privacy**: Customer uploads are stored in isolated sessions under `SAREES/temp_sessions/<session_id>/` and deleted upon session acceptance or reset.

