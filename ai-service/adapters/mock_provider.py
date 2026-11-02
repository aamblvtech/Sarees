"""
SAJEE Virtual Try-On - Mock Simulation Provider
Strictly used for development, UI workflows, and testing.
Always clearly flags output as a simulation and never claims to be real AI.
"""
import time
import os
import io
import base64
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
from .base import BaseTryOnProvider, TryOnRequest, TryOnResult

class MockTryOnProvider(BaseTryOnProvider):
    @property
    def provider_name(self) -> str:
        return "mock"

    def is_available(self) -> bool:
        return True

    def get_health_status(self) -> dict:
        return {
            "status": "healthy",
            "provider": "MockTryOnProvider",
            "mode": "simulation_only",
            "disclaimer": "This provider generates composited mock simulations for UI & workflow validation only."
        }

    def process_tryon(self, request: TryOnRequest) -> TryOnResult:
        start_time = time.time()
        
        # Simulate realistic inference delay between 1.2 to 2.0s
        time.sleep(1.2)

        try:
            # Load person photo or create fallback canvas
            person_img = None
            if os.path.exists(request.person_image_path):
                try:
                    person_img = Image.open(request.person_image_path).convert("RGBA")
                except Exception:
                    person_img = None
            
            if person_img is None:
                person_img = Image.new("RGBA", (768, 1024), color=(245, 240, 230, 255))

            # Resize to standardized portrait dimensions
            target_w, target_h = 768, 1024
            person_img = person_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

            # Create simulation overlay
            overlay = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)

            # Saree drape simulation tone tint
            tint_color = (104, 29, 50, 60)  # Sajee maroon tint with alpha
            garment_meta = request.garment_metadata or {}
            color_name = garment_meta.get("color", "Maroon").lower()
            if "gold" in color_name:
                tint_color = (185, 154, 91, 75)
            elif "green" in color_name:
                tint_color = (34, 80, 50, 75)
            elif "blue" in color_name:
                tint_color = (25, 45, 95, 75)

            # Draw a simulated saree pallu & pleats contour overlay on body region
            # Torso drape (shoulder to waist)
            draw.polygon([(180, 320), (320, 260), (460, 540), (280, 600)], fill=tint_color)
            # Waist pleats & lower drape
            draw.polygon([(260, 560), (510, 560), (540, 960), (230, 960)], fill=tint_color)
            # Pallu fall over back/shoulder
            draw.polygon([(170, 320), (230, 310), (160, 780), (110, 760)], fill=(tint_color[0], tint_color[1], tint_color[2], 110))

            # Composite overlay
            result_img = Image.alpha_composite(person_img, overlay)
            draw_final = ImageDraw.Draw(result_img)

            # Draw very clear, unmissable simulation warning banner at bottom
            banner_height = 85
            draw_final.rectangle([(0, target_h - banner_height), (target_w, target_h)], fill=(41, 37, 34, 230))
            
            # Gold accent border on banner
            draw_final.line([(0, target_h - banner_height), (target_w, target_h - banner_height)], fill=(185, 154, 91, 255), width=3)
            
            # Text warnings
            draw_final.text((25, target_h - 70), "SAJEE SIMULATION PREVIEW — NOT REAL AI DRAPING", fill=(250, 247, 240, 255))
            sku_label = f"Garment: {garment_meta.get('name', 'Saree')} ({garment_meta.get('sku', 'N/A')})"
            draw_final.text((25, target_h - 45), sku_label, fill=(185, 154, 91, 255))
            draw_final.text((25, target_h - 25), "Disclaimer: True fabric fall, pleat precision, and zari sheen require physical fitting.", fill=(200, 200, 200, 255))

            # Encode to base64
            buffered = io.BytesIO()
            result_img.convert("RGB").save(buffered, format="JPEG", quality=88)
            img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            data_url = f"data:image/jpeg;base64,{img_base64}"

            duration_ms = int((time.time() - start_time) * 1000)

            return TryOnResult(
                job_id=request.job_id,
                status="completed",
                result_image_url=data_url,
                result_image_base64=img_base64,
                is_simulation=True,
                provider_name="mock",
                processing_time_ms=duration_ms,
                error_message=None,
                metadata={
                    "mode": "simulation",
                    "disclaimer": "Simulated result for UI/development preview. Not an output of a generative diffusion model.",
                    "sku": garment_meta.get("sku"),
                    "drape_style": request.drape_style
                }
            )
        except Exception as e:
            return TryOnResult(
                job_id=request.job_id,
                status="failed",
                is_simulation=True,
                provider_name="mock",
                processing_time_ms=int((time.time() - start_time) * 1000),
                error_message=str(e),
                metadata={"error_detail": "Error during mock preview generation"}
            )
