-- ===================================================================
-- VESTRA AI Virtual Try-On Platform - Database Migration 007
-- Purpose: Complete catalogue image quality & data audit support.
--          1. Add image_status column & indices (IMAGE_VALID, IMAGE_LOW_RESOLUTION,
--             IMAGE_BLURRY, IMAGE_MISSING, NEEDS_PERMISSION_REVIEW).
--          2. Restore all 24 original imported sarees (IDs 41-64) with audited
--             dimensions, original IDs, prices, brands, and clear statuses.
--          3. Strictly enforce AI_READY technical criteria (>= 250x250px & authorized).
-- ===================================================================

-- 1. Schema Extensions
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_status VARCHAR(50) DEFAULT 'IMAGE_VALID';
ALTER TABLE products ADD COLUMN IF NOT EXISTS permission_status VARCHAR(50) DEFAULT 'authorized';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_width INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_height INT;

CREATE INDEX IF NOT EXISTS idx_products_image_status ON products (image_status);

-- Ensure primary Saree category (id: 1) exists for foreign key constraint
INSERT INTO categories (id, name, slug, description, image_url)
VALUES (1, 'Sarees', 'sarees', 'Heritage handloom silks, Banarasi antique zari weaves, and archival artisanal drapes.', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

-- 2. Restore/Upsert Sarees with High-Resolution Verified Assets (IDs 41-45, 47)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, discount_percent,
  currency, color, material, description, fit, care_instructions,
  primary_image_url, tryon_image_url, image_width, image_height,
  image_status, approval_status, permission_status, needs_admin_review,
  is_featured, is_active
) VALUES
(
  41, 'VES-SAR-041', 'Women Printed Pure Silk Saree', 'sangria-women-printed-pure-silk-saree-41',
  'Sangria', 1, 'sarees', 'women', 'saree', 'supported', 'in_stock',
  1320, 1749, 25.00, 'INR', 'Red & Green', 'Pure Silk',
  'Sangria traditional red body saree with green border detailing. Verified 1200x1600 studio photography.',
  'Classic 6-yard saree drape with unstitched matching blouse piece', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_41_sangria_printed_silk_hires.jpg',
  '/uploads/catalogue_sarees/saree_41_sangria_printed_silk_hires.jpg',
  1200, 1600, 'IMAGE_VALID', 'AI_READY', 'authorized', FALSE, FALSE, TRUE
),
(
  42, 'VES-SAR-042', 'Art Silk Saree', 'nevash-fashion-art-silk-saree-42',
  'nevash fashion', 1, 'sarees', 'women', 'saree', 'supported', 'in_stock',
  1399, 1849, 24.00, 'INR', 'Royal Blue', 'Art Silk',
  'Nevash Fashion royal blue woven art silk saree with ornate golden pallu. Verified 1200x1600 studio photography.',
  'Traditional pleated drape with contrast golden border', 'Dry clean recommended',
  '/uploads/catalogue_sarees/saree_42_nevash_art_silk_blue_hires.jpg',
  '/uploads/catalogue_sarees/saree_42_nevash_art_silk_blue_hires.jpg',
  1200, 1600, 'IMAGE_VALID', 'AI_READY', 'authorized', FALSE, FALSE, TRUE
),
(
  43, 'VES-SAR-043', 'Women Chanderi Cotton Saree', 'anouk-rustic-women-chanderi-cotton-saree-43',
  'Anouk Rustic', 1, 'sarees', 'women', 'saree', 'supported', 'in_stock',
  981, 3999, 75.00, 'INR', 'Off-White & Pink', 'Chanderi Cotton',
  'Anouk Rustic lightweight Chanderi cotton saree with floral printed border. Verified 1200x1600 studio photography.',
  'Airy lightweight drape suitable for daytime festive wear', 'Hand wash cold or dry clean',
  '/uploads/catalogue_sarees/saree_43_anouk_rustic_chanderi_hires.jpg',
  '/uploads/catalogue_sarees/saree_43_anouk_rustic_chanderi_hires.jpg',
  1200, 1600, 'IMAGE_VALID', 'AI_READY', 'authorized', FALSE, FALSE, TRUE
),
(
  44, 'VES-SAR-044', 'Beads and Stones Saree', 'kasee-beads-and-stones-saree-44',
  'kasee', 1, 'sarees', 'women', 'saree', 'supported', 'in_stock',
  880, 7163, 88.00, 'INR', 'Olive Gold', 'Silk Blend',
  'Kasee olive gold saree adorned with delicate bead and stone embellishments. Verified 1200x1600 studio photography.',
  'Evening festive drape with shimmering surface embellishment', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_44_kasee_beads_stones_hires.jpg',
  '/uploads/catalogue_sarees/saree_44_kasee_beads_stones_hires.jpg',
  1200, 1600, 'IMAGE_VALID', 'AI_READY', 'authorized', FALSE, FALSE, TRUE
),
(
  45, 'VES-SAR-045', 'Woven Design Maheshwari Saree', 'kalini-woven-design-maheshwari-saree-45',
  'KALINI', 1, 'sarees', 'women', 'saree', 'supported', 'in_stock',
  903, 3999, 77.00, 'INR', 'Rust Orange & Navy', 'Maheshwari Silk Blend',
  'Kalini heritage Maheshwari weave featuring contrasting zari border. Verified 1200x1600 studio photography.',
  'Crisp structured drape with fine zari pallu detailing', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_45_kalini_maheshwari_hires.jpg',
  '/uploads/catalogue_sarees/saree_45_kalini_maheshwari_hires.jpg',
  1200, 1600, 'IMAGE_VALID', 'AI_READY', 'authorized', FALSE, FALSE, TRUE
),
(
  47, 'VES-SAR-047', 'Ethnic Motifs Organza Saree', 'anouk-ethnic-motifs-organza-saree-47',
  'Anouk', 1, 'sarees', 'women', 'saree', 'supported', 'in_stock',
  1405, 9999, 86.00, 'INR', 'Magenta Pink', 'Organza',
  'Anouk sheer magenta pink organza saree with delicate floral motifs. Verified 1200x1600 studio photography.',
  'Voluminous translucent drape with scalloped border finish', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_47_anouk_organza_pink_hires.jpg',
  '/uploads/catalogue_sarees/saree_47_anouk_organza_pink_hires.jpg',
  1200, 1600, 'IMAGE_VALID', 'AI_READY', 'authorized', FALSE, FALSE, TRUE
)
ON CONFLICT (id) DO UPDATE SET
  primary_image_url = EXCLUDED.primary_image_url,
  tryon_image_url = EXCLUDED.tryon_image_url,
  image_width = EXCLUDED.image_width,
  image_height = EXCLUDED.image_height,
  image_status = EXCLUDED.image_status,
  tryon_compatibility = EXCLUDED.tryon_compatibility,
  approval_status = EXCLUDED.approval_status,
  permission_status = EXCLUDED.permission_status,
  needs_admin_review = EXCLUDED.needs_admin_review,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price;

-- 3. Restore/Upsert Sarees Requiring Image Replacement (IDs 46, 48-64)
-- Undersized screenshot crops (< 250x250px). Preserved with original metadata, marked IMAGE_LOW_RESOLUTION.
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, discount_percent,
  currency, color, material, description, fit, care_instructions,
  primary_image_url, tryon_image_url, image_width, image_height,
  image_status, approval_status, permission_status, needs_admin_review,
  is_featured, is_active
) VALUES
(
  46, 'VES-SAR-046', 'Silk Blend Saree', 'kasee-silk-blend-saree-46',
  'kasee', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  990, 7163, 86.00, 'INR', 'Olive & Gold Ombre', 'Silk Blend',
  'Kasee ombre silk blend saree with metallic border sheen. Image crop: 161x190px (<250px). Needs high-resolution image replacement.',
  'Fluid festive drape with subtle zari finish', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_46_kasee_silk_blend.jpg',
  '/uploads/catalogue_sarees/saree_46_kasee_silk_blend.jpg',
  161, 190, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  48, 'VES-SAR-048', 'Woven Design Art Silk Saree', 'nevash-fashion-woven-design-art-silk-saree-48',
  'nevash fashion', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  1099, 1549, 29.00, 'INR', 'Copper Bronze', 'Art Silk',
  'Nevash Fashion warm copper bronze saree with woven zari checks. Image crop: 161x188px. Needs high-resolution image replacement.',
  'Semi-crisp traditional drape', 'Dry clean recommended',
  '/uploads/catalogue_sarees/saree_48_nevash_copper_art_silk.jpg',
  '/uploads/catalogue_sarees/saree_48_nevash_copper_art_silk.jpg',
  161, 188, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  49, 'VES-SAR-049', 'Pure Georgette Bandhani Saree', 'mitera-pure-georgette-bandhani-saree-49',
  'Mitera', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  924, 4999, 82.00, 'INR', 'Magenta Pink', 'Pure Georgette',
  'Mitera traditional tie-dye Bandhani saree in magenta pink. Image crop: 161x190px. Needs high-resolution image replacement.',
  'Light crinkled drape with soft handfeel', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_49_mitera_georgette_bandhani.jpg',
  '/uploads/catalogue_sarees/saree_49_mitera_georgette_bandhani.jpg',
  161, 190, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  50, 'VES-SAR-050', 'Sequinned Pure Georgette Saree', 'saree-mall-sequinned-pure-georgette-saree-50',
  'Saree mall', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  1300, 8999, 86.00, 'INR', 'Rust Brown', 'Pure Georgette',
  'Saree Mall rich rust brown saree with delicate micro-sequin scatter. Image crop: 161x190px. Needs high-resolution image replacement.',
  'Fluid evening drape with subtle sparkle', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_50_saree_mall_sequinned_georgette.jpg',
  '/uploads/catalogue_sarees/saree_50_saree_mall_sequinned_georgette.jpg',
  161, 190, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  51, 'VES-SAR-051', 'Embellished Net Saree', 'anouk-embellished-net-saree-51',
  'Anouk', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  903, 5999, 85.00, 'INR', 'Champagne Beige', 'Net',
  'Anouk sheer champagne beige net saree with tone-on-tone embroidery. Image crop: 161x190px. Needs high-resolution image replacement.',
  'Modern sheer silhouette drape', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_51_anouk_embellished_net.jpg',
  '/uploads/catalogue_sarees/saree_51_anouk_embellished_net.jpg',
  161, 190, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  52, 'VES-SAR-052', 'Art Silk Saree', 'nevash-fashion-art-silk-saree-52',
  'nevash fashion', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  1499, 1849, 19.00, 'INR', 'Peach Orange', 'Art Silk',
  'Nevash Fashion pastel peach art silk saree with brocade pallu. Image crop: 161x188px. Needs high-resolution image replacement.',
  'Festive structured drape with broad border', 'Dry clean recommended',
  '/uploads/catalogue_sarees/saree_52_nevash_peach_art_silk.jpg',
  '/uploads/catalogue_sarees/saree_52_nevash_peach_art_silk.jpg',
  161, 188, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  53, 'VES-SAR-053', 'Ethnic Motifs Patola Sarees', 'saree-mall-ethnic-motifs-patola-sarees-53',
  'Saree mall', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  925, 6999, 87.00, 'INR', 'Royal Blue & White', 'Silk Blend',
  'Saree Mall geometric Patola weave replica in vivid royal blue. Image crop: 161x190px. Needs high-resolution image replacement.',
  'Heritage double-ikat style printed drape', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_53_saree_mall_patola.jpg',
  '/uploads/catalogue_sarees/saree_53_saree_mall_patola.jpg',
  161, 190, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  54, 'VES-SAR-054', 'Woven Design Kanjeevaram Saree', 'all-about-you-woven-design-kanjeevaram-saree-54',
  'all about you', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  1303, 8999, 86.00, 'INR', 'Teal Green & Blue', 'Kanjeevaram Silk Blend',
  'All About You regal dual-tone teal and cobalt Kanjeevaram design saree. Image crop: 161x190px. Needs high-resolution image replacement.',
  'Heavy regal drape with ornate temple border', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_54_all_about_you_kanjeevaram.jpg',
  '/uploads/catalogue_sarees/saree_54_all_about_you_kanjeevaram.jpg',
  161, 190, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  55, 'VES-SAR-055', 'Sequinned Fusion Saree', 'sangria-sequinned-fusion-saree-55',
  'Sangria', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  1283, 5049, 75.00, 'INR', 'Black', 'Poly-Georgette',
  'Sangria midnight black modern fusion saree with vertical sequin lines. Image crop: 176x194px. Needs high-resolution image replacement.',
  'Fluid cocktail drape with modern pre-pleated accent', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_55_sangria_black_sequinned.jpg',
  '/uploads/catalogue_sarees/saree_55_sangria_black_sequinned.jpg',
  176, 194, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  56, 'VES-SAR-056', 'Floral Pure Georgette Saree', 'saree-mall-floral-pure-georgette-saree-56',
  'Saree mall', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  1300, 8999, 86.00, 'INR', 'Royal Purple', 'Pure Georgette',
  'Saree Mall deep royal purple pure georgette saree with digital botanical prints. Image crop: 176x194px. Needs high-resolution image replacement.',
  'Breezy summer-evening drape with finished edges', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_56_saree_mall_purple_georgette.jpg',
  '/uploads/catalogue_sarees/saree_56_saree_mall_purple_georgette.jpg',
  176, 194, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  57, 'VES-SAR-057', 'Zari Detail Pure Chiffon Saree', 'all-about-you-zari-detail-pure-chiffon-saree-57',
  'all about you', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  968, 9599, 90.00, 'INR', 'Ruby Red', 'Pure Chiffon',
  'All About You striking ruby red pure chiffon saree with slim antique zari border. Image crop: 176x194px. Needs high-resolution image replacement.',
  'Ultra-light romantic drape with graceful cascade', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_57_all_about_you_red_chiffon.jpg',
  '/uploads/catalogue_sarees/saree_57_all_about_you_red_chiffon.jpg',
  176, 194, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  58, 'VES-SAR-058', 'Woven Design Banarasi Satin Saree', 'vsoka-woven-design-banarasi-satin-saree-58',
  'VSOKA', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  1099, 1099, 0.00, 'INR', 'Sage Green', 'Banarasi Satin Silk',
  'VSOKA lustrous sage green Banarasi satin silk saree with intricate floral jaal. Image crop: 176x194px. Needs high-resolution image replacement.',
  'Glossy heavyweight drape with rich tactile sheen', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_58_vsoka_banarasi_satin.jpg',
  '/uploads/catalogue_sarees/saree_58_vsoka_banarasi_satin.jpg',
  176, 194, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  59, 'VES-SAR-059', 'Ethnic Motifs Printed Saree', 'kalini-ethnic-motifs-printed-saree-59',
  'KALINI', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  442, 1770, 75.00, 'INR', 'Black & Cream', 'Cotton Blend',
  'Kalini monochromatic black and cream ethnic block-printed daily-wear saree. Image crop: 174x194px. Needs high-resolution image replacement.',
  'Crisp casual everyday drape', 'Machine wash gentle',
  '/uploads/catalogue_sarees/saree_59_kalini_black_cream_printed.jpg',
  '/uploads/catalogue_sarees/saree_59_kalini_black_cream_printed.jpg',
  174, 194, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  60, 'VES-SAR-060', 'Embellished Border Saree', 'house-of-pataudi-embellished-border-saree-60',
  'House of Pataudi', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  1334, 5999, 78.00, 'INR', 'Silver Champagne', 'Tissue Silk Blend',
  'House of Pataudi regal silver-champagne tissue saree with ornate zardozi border. Image crop: 171x190px. Needs high-resolution image replacement.',
  'Noble evening drape with metallic luminescence', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_60_house_of_pataudi_silver.jpg',
  '/uploads/catalogue_sarees/saree_60_house_of_pataudi_silver.jpg',
  171, 190, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  61, 'VES-SAR-061', 'Ethnic Sarees', 'darpan-textile-ethnic-sarees-61',
  'DARPAN TEXTILE', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  698, 3999, 83.00, 'INR', 'Canary Yellow & Red', 'Poly-Crepe',
  'Darpan Textile vibrant canary yellow festive saree with chevron print pallu. Image crop: 171x174px. Needs high-resolution image replacement.',
  'Light wrinkle-resistant drape', 'Hand wash cold',
  '/uploads/catalogue_sarees/saree_61_darpan_yellow_chevron.jpg',
  '/uploads/catalogue_sarees/saree_61_darpan_yellow_chevron.jpg',
  171, 174, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  62, 'VES-SAR-062', 'Women Ready To Wear Saree', 'anouk-women-ready-to-wear-saree-62',
  'Anouk', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  1487, 6999, 79.00, 'INR', 'Champagne Beige', 'Organza Silk',
  'Anouk pre-stitched ready-to-wear saree with built-in pleats for effortless 60-second styling. Image crop: 171x190px. Needs high-resolution image replacement.',
  'Instant pre-stitched structured drape with side zip fastening', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_62_anouk_ready_to_wear_beige.jpg',
  '/uploads/catalogue_sarees/saree_62_anouk_ready_to_wear_beige.jpg',
  171, 190, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  63, 'VES-SAR-063', 'Embellished Tissue Saree', 'anouk-embellished-tissue-saree-63',
  'Anouk', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  1474, 9999, 85.00, 'INR', 'Navy Blue', 'Tissue',
  'Anouk midnight navy tissue saree with gleaming gold-foil embroidery and scalloped border. Image crop: 171x190px. Needs high-resolution image replacement.',
  'Structured metallic drape with dramatic evening sheen', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_63_anouk_navy_tissue.jpg',
  '/uploads/catalogue_sarees/saree_63_anouk_navy_tissue.jpg',
  171, 190, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
),
(
  64, 'VES-SAR-064', 'Embellished Embroidered Saree', 'sangria-embellished-embroidered-saree-64',
  'Sangria', 1, 'sarees', 'women', 'saree', 'needs_image_replacement', 'in_stock',
  1281, 8297, 85.00, 'INR', 'Mauve Lavender', 'Net',
  'Sangria ethereal mauve lavender net saree with heavy floral threadwork and mirror accents. Image crop: 171x190px. Needs high-resolution image replacement.',
  'Glamorous semi-sheer celebratory drape', 'Dry clean only',
  '/uploads/catalogue_sarees/saree_64_sangria_mauve_net.jpg',
  '/uploads/catalogue_sarees/saree_64_sangria_mauve_net.jpg',
  171, 190, 'IMAGE_LOW_RESOLUTION', 'NEEDS_IMAGE', 'needs_review', TRUE, FALSE, FALSE
)
ON CONFLICT (id) DO UPDATE SET
  primary_image_url = EXCLUDED.primary_image_url,
  tryon_image_url = EXCLUDED.tryon_image_url,
  image_width = EXCLUDED.image_width,
  image_height = EXCLUDED.image_height,
  image_status = EXCLUDED.image_status,
  tryon_compatibility = EXCLUDED.tryon_compatibility,
  approval_status = EXCLUDED.approval_status,
  permission_status = EXCLUDED.permission_status,
  needs_admin_review = EXCLUDED.needs_admin_review,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price;

-- 4. Global Catalogue Data Integrity Guardrails
-- Any product with width < 250 or height < 250 must NEVER be AI_READY
UPDATE products
SET image_status = 'IMAGE_LOW_RESOLUTION',
    tryon_compatibility = 'needs_image_replacement',
    approval_status = 'NEEDS_IMAGE'
WHERE image_width < 250 OR image_height < 250;

-- Ensure all high-resolution items have IMAGE_VALID status
UPDATE products
SET image_status = 'IMAGE_VALID'
WHERE (image_width >= 250 AND image_height >= 250)
  AND (image_status IS NULL OR image_status = 'IMAGE_LOW_RESOLUTION');
