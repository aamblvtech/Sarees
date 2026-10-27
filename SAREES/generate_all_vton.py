import os
import sys
from pathlib import Path
import cv2

from main import in_place_saree_clothing_swap, SAREES

def main():
    cust_path = "images/customer_jeans_model.jpg"
    if not os.path.exists(cust_path):
        print(f"Error: Customer image not found at {cust_path}")
        sys.exit(1)

    print(f"Generating full-body virtual saree drapes for customer: {cust_path}...")
    success_count = 0

    for sid in range(1, 6):
        sitem = SAREES[sid]
        fname = sitem["filename"]
        saree_path = os.path.join("images", fname)
        out_path = f"outputs/vton_cache_1aeba190155bd0f78f87a4fbf4bf63a0_{sid}.jpg"

        print(f"\n--- Processing Saree {sid}: {sitem['name']} ---")
        ok = in_place_saree_clothing_swap(cust_path, saree_path, out_path)
        if ok and os.path.exists(out_path):
            size_kb = os.path.getsize(out_path) / 1024.0
            print(f"[SUCCESS] Saree {sid} saved to {out_path} ({size_kb:.1f} KB)")
            success_count += 1
        else:
            print(f"[FAILED] Could not drape Saree {sid}")

    print(f"\nCompleted {success_count}/5 virtual saree drapes successfully.")

if __name__ == "__main__":
    main()
