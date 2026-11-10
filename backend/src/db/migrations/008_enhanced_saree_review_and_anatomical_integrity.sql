-- ===================================================================
-- VESTRA AI Virtual Try-On Platform - Database Migration 008
-- Purpose: 
--   1. Support Option B local image enhancement for low-resolution sarees (IDs 46, 48-64).
--   2. Store original and enhanced image versions separately with dimensions and method.
--   3. Support anatomical defect reporting, feedback, and pose risk tracking in tryon_history.
--   4. Strictly gate AI_READY status behind admin approval.
-- ===================================================================

-- 1. Extend products table for dual-version image tracking
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS enhanced_image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS enhanced_width INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS enhanced_height INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS enhancement_method VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS anatomical_defect_risk VARCHAR(50) DEFAULT 'LOW';

-- 2. Extend tryon_jobs and tryon_results for anatomical defect reporting and quality verification
ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS anatomical_plausibility VARCHAR(50) DEFAULT 'PLAUSIBLE';
ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS anatomical_defect_risk VARCHAR(50) DEFAULT 'LOW';
ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS has_anatomical_defect BOOLEAN DEFAULT FALSE;
ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS user_feedback VARCHAR(100);
ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS feedback_notes TEXT;

ALTER TABLE tryon_results ADD COLUMN IF NOT EXISTS anatomical_plausibility VARCHAR(50) DEFAULT 'PLAUSIBLE';
ALTER TABLE tryon_results ADD COLUMN IF NOT EXISTS has_anatomical_defect BOOLEAN DEFAULT FALSE;
ALTER TABLE tryon_results ADD COLUMN IF NOT EXISTS user_feedback VARCHAR(100);

-- 3. Populate original_image_url and Option A metadata for studio sarees 41-45 and 47
UPDATE products SET original_image_url = '/uploads/catalogue_sarees/saree_41_sangria_printed_silk.jpg', enhancement_method = 'original_studio_photography' WHERE id = 41;
UPDATE products SET original_image_url = '/uploads/catalogue_sarees/saree_42_nevash_art_silk_blue.jpg', enhancement_method = 'original_studio_photography' WHERE id = 42;
UPDATE products SET original_image_url = '/uploads/catalogue_sarees/saree_43_anouk_rustic_chanderi.jpg', enhancement_method = 'original_studio_photography' WHERE id = 43;
UPDATE products SET original_image_url = '/uploads/catalogue_sarees/saree_44_kasee_beads_stones.jpg', enhancement_method = 'original_studio_photography' WHERE id = 44;
UPDATE products SET original_image_url = '/uploads/catalogue_sarees/saree_45_kalini_maheshwari.jpg', enhancement_method = 'original_studio_photography' WHERE id = 45;
UPDATE products SET original_image_url = '/uploads/catalogue_sarees/saree_47_anouk_organza_pink.jpg', enhancement_method = 'original_studio_photography' WHERE id = 47;

-- 4. Populate Option B enhanced image paths and dimensions for all 18 sarees (IDs 46, 48-64)
-- Preserves original crops as original_image_url, sets enhanced_image_url separately.
-- Strictly marked as ENHANCED_REVIEW_REQUIRED and is_active = FALSE until admin approves.
UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_46_kasee_silk_blend.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_46_kasee_silk_blend_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 708,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 46;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_48_nevash_copper_art_silk.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_48_nevash_copper_art_silk_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 701,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 48;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_49_mitera_georgette_bandhani.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_49_mitera_georgette_bandhani_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 708,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 49;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_50_saree_mall_sequinned_georgette.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_50_saree_mall_sequinned_georgette_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 708,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 50;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_51_anouk_embellished_net.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_51_anouk_embellished_net_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 708,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 51;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_52_nevash_peach_art_silk.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_52_nevash_peach_art_silk_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 701,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 52;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_53_saree_mall_patola.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_53_saree_mall_patola_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 708,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 53;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_54_all_about_you_kanjeevaram.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_54_all_about_you_kanjeevaram_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 708,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 54;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_55_sangria_black_sequinned.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_55_sangria_black_sequinned_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 661,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 55;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_56_saree_mall_purple_georgette.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_56_saree_mall_purple_georgette_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 661,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 56;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_57_all_about_you_red_chiffon.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_57_all_about_you_red_chiffon_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 661,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 57;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_58_vsoka_banarasi_satin.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_58_vsoka_banarasi_satin_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 661,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 58;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_59_kalini_black_cream_printed.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_59_kalini_black_cream_printed_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 669,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 59;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_60_house_of_pataudi_silver.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_60_house_of_pataudi_silver_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 667,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 60;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_61_darpan_yellow_chevron.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_61_darpan_yellow_chevron_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 611,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 61;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_62_anouk_ready_to_wear_beige.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_62_anouk_ready_to_wear_beige_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 667,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 62;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_63_anouk_navy_tissue.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_63_anouk_navy_tissue_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 667,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 63;

UPDATE products SET
  original_image_url = '/uploads/catalogue_sarees/saree_64_sangria_mauve_net.jpg',
  enhanced_image_url = '/uploads/catalogue_sarees/saree_64_sangria_mauve_net_enhanced.jpg',
  enhanced_width = 600, enhanced_height = 667,
  enhancement_method = 'local_bicubic_conservative_sharpening',
  image_status = 'ENHANCED_REVIEW_REQUIRED',
  approval_status = 'ENHANCED_REVIEW_REQUIRED',
  permission_status = 'needs_review',
  tryon_compatibility = 'needs_image_replacement',
  is_active = FALSE, needs_admin_review = TRUE
WHERE id = 64;
