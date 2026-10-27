import os
import cv2
from PIL import Image, ImageOps
from gradio_client import Client, handle_file

def run_test():
    print("Preparing images...")
    # Resize customer image to 768x1024 for optimal IDM-VTON aspect ratio and speed
    cust = Image.open("images/customer_jeans_model.jpg")
    cust = ImageOps.exif_transpose(cust)
    cust_resized = cust.resize((768, 1024), Image.Resampling.LANCZOS)
    cust_resized.save("outputs/test_cust_768x1024.jpg", quality=95)

    saree = Image.open("images/red-saree.jpg")
    saree_resized = saree.resize((768, 1024), Image.Resampling.LANCZOS)
    saree_resized.save("outputs/test_saree_768x1024.jpg", quality=95)

    print("Connecting to IDM-VTON...")
    client = Client("yisol/IDM-VTON")

    prompt = "Traditional Crimson Red Banarasi Silk Saree with elaborate golden zari embroidery and matching red silk blouse"

    print("Submitting to IDM-VTON...")
    result = client.predict(
        dict={"background": handle_file("outputs/test_cust_768x1024.jpg"), "layers": [], "composite": None},
        garm_img=handle_file("outputs/test_saree_768x1024.jpg"),
        garment_des=prompt,
        is_checked=True, # Auto segmentation
        is_checked_crop=False,
        denoise_steps=30,
        seed=42,
        api_name="/tryon"
    )

    print("Result received:", result)
    if result and len(result) > 0:
        import shutil
        shutil.copy(result[0], "outputs/test_idm_result.jpg")
        print("Copied result to outputs/test_idm_result.jpg")

if __name__ == '__main__':
    run_test()
