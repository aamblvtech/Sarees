# AURA ATELIER — IDM-VTON Google Colab Diagnostic & Setup Guide

This guide documents the root cause analysis, pipeline debugging, input verification contracts, and step-by-step resolution for running **IDM-VTON** on Google Colab with the AURA ATELIER virtual dressing room.

---

## 1. Root Cause Analysis: Why Was the Output Wrong?

When running IDM-VTON in Google Colab, developers often see a different person, a stock sample image, or dataset photo (`00001_00.jpg`). This occurs due to four distinct failure modes:

| Bug / Failure Mode | Mechanism | Result |
| :--- | :--- | :--- |
| **1. Gradio `gr.Examples` Fallback** | In `gradio_demo/app.py`, the official demo includes `gr.Examples` pre-loaded with VITON-HD dataset images. If the customer portrait input (`imgs`) is passed as a string or raw image instead of `dict={"background": ...}`, Gradio discards the input and uses Example 0 (`00001_00.jpg`). | UI displays the Asian female dataset model in gray top instead of the customer. |
| **2. Argument Order Inversion** | If `dict` (customer) and `garm_img` (garment) are swapped in the function call, the human parser attempts to parse flat fabric as a body. | Hallucinated distortion or inverted gray noise. |
| **3. `is_checked=False` with Empty Layers** | When auto-masking is disabled and no manual brush mask is provided, `dict["layers"]` is empty `[]`. | Blank mask inpainting causes the diffusion model to synthesize a random stranger or corrupt the body. |
| **4. `is_checked_crop=True` Posture Displacement** | Automatic face/body cropping detects bounding boxes and crops the canvas. For full-body or angled portraits, this displaces the neck and shoulders. | Customer's head looks pasted onto a misaligned neck/body. |
| **5. Stale Output Caching** | Notebook cells or servers saving to a static filename (e.g., `output.png`) fail silently during inference errors, leaving the old image on disk. | The UI or display cell shows previous run's image. |

---

## 2. Input Contract & Strict Verification (Steps 1 & 2)

IDM-VTON requires strict input formatting. Every inference request must pass both:

1. **Customer Photograph (Input 0)**:
   - Passed inside `dict={"background": <path_or_file>, "layers": [], "composite": None}`.
   - Pre-scaled to $768 \times 1024$ native resolution (3:4 portrait).
   - EXIF orientation transposed to prevent 90° smartphone rotation bugs.
2. **Garment Reference (Input 1)**:
   - Passed via `garm_img=<path_or_file>`.
   - Scaled to $768 \times 1024$ native resolution.
3. **Control Flags**:
   - `is_checked = True`: **Mandatory**. Activates CIHP human parsing to automatically isolate the upper body, torso, and arms.
   - `is_checked_crop = False`: **Mandatory**. Prevents destructive cropping and maintains original framing, posture, and background.
   - `denoise_steps = 30`: Recommended diffusion steps for clean textile detail.
   - `seed = 42`: Deterministic seed for reproducible testing.

---

## 3. Garment Category & Indian Ethnic Drape Handling (Step 6)

IDM-VTON was trained on **VITON-HD** (tops/shirts/jackets) and **DressCode** (tops, bottoms, dresses):
- **Western Stitched Garments** (Shirts, T-Shirts, Blouses, Jackets, Western Dresses):
  - **Native Compatibility**: Fully supported. Contours, sleeves, button plackets, and collars fit naturally around the customer's torso.
- **Traditional Indian Sarees & Lehengas**:
  - **Model Behavior**: A saree flat lay is an unstitched 6-yard fabric with pleats and pallu. IDM-VTON maps the silk motif, zari border, and color palette onto the customer's silhouette as a fitted ethnic ensemble.
  - **Honest Limitation**: IDM-VTON does **not** physically fold, pleat, or pin 6 meters of silk around the waist.

---

## 4. How to Run the Dedicated Colab Server

Follow these 3 steps to run virtual try-on on a free Google Colab T4 GPU:

### Step 1: Open Google Colab
1. Go to [colab.research.google.com](https://colab.research.google.com/).
2. Select **Runtime $\rightarrow$ Change runtime type** and select **T4 GPU**.

### Step 2: Install & Launch
Run the following commands in Colab:
```bash
# 1. Clone repository and install dependencies
!git clone https://github.com/yisol/IDM-VTON.git
%cd IDM-VTON
!pip install -q diffusers==0.27.2 transformers==4.39.3 accelerate==0.28.0 gradio==4.26.0 torchvision einops bitsandbytes gradio_client

# 2. Upload and execute run_colab_server.py
!python run_colab_server.py
```

The script will launch with a public tunnel and print:
```text
Running on public URL: https://xxxx.gradio.live
```

### Step 3: Connect to AURA ATELIER
1. Open your local AURA Atelier application at [http://127.0.0.1:8000/](http://127.0.0.1:8000/).
2. Click **Admin Studio** in the header.
3. In the **AI Try-On Provider** dropdown, select **Google Colab GPU (IDM-VTON Dedicated T4)**.
4. Paste your `https://xxxx.gradio.live` URL into the **Google Colab Tunnel URL** input and click **Save Configuration**.
5. Upload any customer photo and click any garment card — the live try-on will run on your Colab GPU without dataset fallbacks!
