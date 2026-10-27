import cv2
import numpy as np
from pathlib import Path

BASE_DIR = Path("d:/AAMBLV/saree/SAREES")
DIAG_DIR = BASE_DIR / "outputs" / "diagnostics"

# 1. PURPLE SAREE CLEANUP
purple = cv2.imread(str(BASE_DIR / "images" / "purple-saree.jpg"))
ph, pw = purple.shape[:2]

# Hand 1 (upper hand): y: 360-450, x: 130-205 -> patch from x: 215-290
h1_w = 205 - 130
src_h1 = purple[360:450, 215:215+h1_w]
mask_h1 = np.ones((450-360, h1_w), dtype=np.uint8) * 255
center_h1 = (130 + h1_w // 2, 360 + (450-360) // 2)
p_clean = cv2.seamlessClone(src_h1, purple, mask_h1, center_h1, cv2.NORMAL_CLONE)

# Hand 2 (lower hand): y: 450-540, x: 140-200 -> patch from x: 200-260
h2_w = 200 - 140
src_h2 = p_clean[450:540, 205:205+h2_w]
mask_h2 = np.ones((540-450, h2_w), dtype=np.uint8) * 255
center_h2 = (140 + h2_w // 2, 450 + (540-450) // 2)
p_clean = cv2.seamlessClone(src_h2, p_clean, mask_h2, center_h2, cv2.NORMAL_CLONE)

cv2.imwrite(str(DIAG_DIR / "purple_saree_no_hands.jpg"), p_clean)
print("Saved purple_saree_no_hands.jpg!")

# 2. PINK SAREE CLEANUP
pink = cv2.imread(str(BASE_DIR / "images" / "pink-saree.jpg"))
kh, kw = pink.shape[:2]

# Midriff & hands in pink saree: y: 270-350, x: 175-260
# In pink saree, the lower pleats on the left (y: 350-480, x: 170-240) are rich blush pink pleats!
# The upper pallu (y: 200-270, x: 190-270) is sheer organza.
# If we seamlessly inpaint the midriff/hands using the blush pink pleats:
mid_w = 255 - 175
mid_h = 350 - 270
src_pink = pink[360:360+mid_h, 175:255]
mask_mid = np.ones((mid_h, mid_w), dtype=np.uint8) * 255
center_mid = (175 + mid_w // 2, 270 + mid_h // 2)
k_clean = cv2.seamlessClone(src_pink, pink, mask_mid, center_mid, cv2.NORMAL_CLONE)

# Now check right hanging arm: y: 240-350, x: 145-180 (model's right arm)
# Background wall is to the left, pallu is to the right
arm_w = 180 - 145
arm_h = 350 - 240
src_arm = k_clean[240:350, 185:185+arm_w]
mask_arm = np.ones((arm_h, arm_w), dtype=np.uint8) * 255
center_arm = (145 + arm_w // 2, 240 + arm_h // 2)
k_clean = cv2.seamlessClone(src_arm, k_clean, mask_arm, center_arm, cv2.NORMAL_CLONE)

cv2.imwrite(str(DIAG_DIR / "pink_saree_no_hands.jpg"), k_clean)
print("Saved pink_saree_no_hands.jpg!")
