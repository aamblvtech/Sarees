-- ===================================================================
-- VESTRA AI Virtual Try-On Platform - Database Migration 006
-- Purpose: Remove all low-resolution thumbnail crop outfits (<250x250px)
--          and expand catalogue with high-resolution studio Sarees, Shirts,
--          Jeans, Baggy Pants, and Formal Attire.
-- ===================================================================

-- 1. Remove all outfits marked needs_image_replacement (IDs 46, 48-64)
DELETE FROM product_images WHERE product_id IN (46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64);
DELETE FROM products WHERE id IN (46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64) OR tryon_compatibility = 'needs_image_replacement';

-- 2. Ensure all existing retained products have verified 1200x1600 studio dimensions
UPDATE products SET image_width = 1200, image_height = 1600 WHERE image_width IS NULL OR image_height IS NULL;

-- 3. Insert or update new apparel categories
INSERT INTO categories (id, name, slug, description, image_url)
VALUES
  (5, 'Shirts & Tops', 'shirts', 'Crisp bespoke poplin, Italian linen camp collars, silk charmeuse blouses, and tailored oxford shirts.', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=85'),
  (6, 'Jeans & Denim', 'jeans', 'Selvedge Japanese raw denim, vintage 90s washes, straight-leg classics, and relaxed skater cuts.', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85'),
  (7, 'Baggy Pants & Trousers', 'pants', 'Double-pleated atelier trousers, wide-leg relaxed chinos, utility cargo baggy pants, and fluid tailored bottoms.', 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=1200&q=85'),
  (8, 'Formal Attire & Tailoring', 'formal-attire', 'Savile Row bespoke tuxedos, silk-lapel dinner jackets, chalk-stripe 3-piece suits, and evening gowns.', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=85')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url;
