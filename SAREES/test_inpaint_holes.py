import cv2
import numpy as np
from pathlib import Path

# Let's inspect saree 4 cloth and holes
BASE_DIR = Path("d:/AAMBLV/saree/SAREES")
img4 = cv2.imread(str(BASE_DIR / "images" / "purple-saree.jpg"))
cloth4 = cv2.imread(str(BASE_DIR / "outputs" / "diagnostics" / "saree4_2_saree_cloth_mask.png"), cv2.IMREAD_GRAYSCALE)
sh, sw = img4.shape[:2]

# Inpaint internal holes in cloth4
# Find convex hull or closed contour of cloth4
contours, _ = cv2.findContours(cloth4, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
filled_cloth = np.zeros_like(cloth4)
cv2.drawContours(filled_cloth, contours, -1, 255, -1)

# Holes inside the garment envelope:
internal_holes = cv2.bitwise_and(filled_cloth, cv2.bitwise_not(cloth4))
print(f"Internal holes in purple saree cloth mask: {np.sum(internal_holes > 0)} pixels")

# If we inpaint the saree image across these internal holes:
inpainted_saree = cv2.inpaint(img4, internal_holes, 7, cv2.INPAINT_TELEA)

# And extend fabric outward by dilating the fabric color into background
extended_cloth = cv2.dilate(cloth4, np.ones((15, 15), np.uint8))
cloth_boundary_holes = cv2.bitwise_and(extended_cloth, cv2.bitwise_not(cloth4))
inpainted_saree_ext = cv2.inpaint(inpainted_saree, cloth_boundary_holes, 11, cv2.INPAINT_TELEA)

cv2.imwrite(str(BASE_DIR / "outputs" / "diagnostics" / "test_saree4_inpainted_clean.jpg"), inpainted_saree_ext)
print("Saved test_saree4_inpainted_clean.jpg")
