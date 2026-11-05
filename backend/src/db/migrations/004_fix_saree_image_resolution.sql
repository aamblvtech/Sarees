-- ===================================================================
-- VESTRA AI Virtual Try-On Platform - Database Migration 004
-- Purpose: Add image dimension fields and configure try-on compatibility
--          and high-resolution image paths for imported saree collection.
-- ===================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_width INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_height INT;

-- Update products with verified high-resolution images (1200x1600px >= 1024px minimum)
UPDATE products
SET primary_image_url = '/uploads/catalogue_sarees/saree_41_sangria_printed_silk_hires.jpg',
    tryon_image_url = '/uploads/catalogue_sarees/saree_41_sangria_printed_silk_hires.jpg',
    tryon_compatibility = 'supported',
    image_width = 1200,
    image_height = 1600
WHERE id = 41;

UPDATE products
SET primary_image_url = '/uploads/catalogue_sarees/saree_42_nevash_art_silk_blue_hires.jpg',
    tryon_image_url = '/uploads/catalogue_sarees/saree_42_nevash_art_silk_blue_hires.jpg',
    tryon_compatibility = 'supported',
    image_width = 1200,
    image_height = 1600
WHERE id = 42;

UPDATE products
SET primary_image_url = '/uploads/catalogue_sarees/saree_43_anouk_rustic_chanderi_hires.jpg',
    tryon_image_url = '/uploads/catalogue_sarees/saree_43_anouk_rustic_chanderi_hires.jpg',
    tryon_compatibility = 'supported',
    image_width = 1200,
    image_height = 1600
WHERE id = 43;

UPDATE products
SET primary_image_url = '/uploads/catalogue_sarees/saree_44_kasee_beads_stones_hires.jpg',
    tryon_image_url = '/uploads/catalogue_sarees/saree_44_kasee_beads_stones_hires.jpg',
    tryon_compatibility = 'supported',
    image_width = 1200,
    image_height = 1600
WHERE id = 44;

UPDATE products
SET primary_image_url = '/uploads/catalogue_sarees/saree_45_kalini_maheshwari_hires.jpg',
    tryon_image_url = '/uploads/catalogue_sarees/saree_45_kalini_maheshwari_hires.jpg',
    tryon_compatibility = 'supported',
    image_width = 1200,
    image_height = 1600
WHERE id = 45;

UPDATE products
SET primary_image_url = '/uploads/catalogue_sarees/saree_47_anouk_organza_pink_hires.jpg',
    tryon_image_url = '/uploads/catalogue_sarees/saree_47_anouk_organza_pink_hires.jpg',
    tryon_compatibility = 'supported',
    image_width = 1200,
    image_height = 1600
WHERE id = 47;

-- Set try-on compatibility to needs_image_replacement for remaining items with low-resolution thumbnail crops (<250x250px)
UPDATE products
SET tryon_compatibility = 'needs_image_replacement'
WHERE id IN (46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64);
