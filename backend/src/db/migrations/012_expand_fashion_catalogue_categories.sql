-- ==============================================================================
-- Migration 012: VESTRA Expand Catalogue to All Fashion Categories & Outfit Types
-- Adds:
--  - Core fashion department categories:
--      * Women's Traditional Wear (womens-traditional)
--      * Women's Western Wear (womens-western)
--      * Men's Traditional Wear (mens-traditional)
--      * Men's Western Wear (mens-western)
--      * Accessories (accessories)
--  - Expands products across all requested outfit subcategories
--  - Preserves all existing sarees and clothing products
-- ==============================================================================

-- 1. Ensure Categories 4, 9, 10, 11, 12 Exist
INSERT INTO categories (id, name, slug, description, image_url)
VALUES
  (4, 'Accessories', 'accessories', 'Luxury silk ties, pocket squares, dupattas, shawls, and fashion accents.', 'https://images.unsplash.com/photo-1589756823695-278bc923f962?auto=format&fit=crop&w=1200&q=85'),
  (9, 'Women''s Traditional Wear', 'womens-traditional', 'Curated Indian heritage sarees, lehengas, anarkalis, and ethnic wear.', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85'),
  (10, 'Women''s Western Wear', 'womens-western', 'Modern silhouettes: sculptural dresses, tailored blazers, trousers, and denim.', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1200&q=85'),
  (11, 'Men''s Traditional Wear', 'mens-traditional', 'Royal sherwanis, silk kurta pyjamas, bandhgalas, and Nehru jackets.', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85'),
  (12, 'Men''s Western Wear', 'mens-western', 'Bespoke tailoring, Italian wool suits, selvedge denim, and luxury shirts.', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=85')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Expanded Fashion Products (IDs 93 to 109)
-- 93: Paithani Saree (Women's Traditional)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(93, 'VES-SAR-093', 'Royal Yeola Paithani Pure Silk Saree with Peacock Pallu', 'royal-yeola-paithani-pure-silk-saree', 'VESTRA Heritage', 9, 'paithani_sarees', 'women', 'saree',
   'supported', 'in_stock', 2200.00, 2600.00, 'INR',
   'Hand-woven in Yeola with pure silk threads, featuring the signature kaleidoscopic peacock and parrot motifs on an opulent gold zari pallu with oblique square borders.',
   '100% Grade-A Pure Mulberry Silk & Fine Gold Zari', 'Classic 6-yard unstitched handloom drape with 0.8m matching blouse piece',
   'Specialist dry clean only. Wrap in pristine unbleached cotton muslin.', '["Free Size (6 Yards)"]'::jsonb,
   'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=85',
   true, true, true, 'Royal Magenta & Gold', 15.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 94: Cotton Saree (Women's Traditional)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(94, 'VES-SAR-094', 'Chanderi Handloom Cotton-Silk Saree with Antique Zari', 'chanderi-handloom-cotton-silk-saree', 'VESTRA Heritage', 9, 'cotton_sarees', 'women', 'saree',
   'supported', 'in_stock', 950.00, 1150.00, 'INR',
   'Lightweight, sheer gossamer Chanderi drape combining mercerized cotton with pure silk yarns, accentuated by intricate gold zari buti motifs and hand-woven borders.',
   '70% Pure Cotton, 30% Fine Silk Blend', 'Flowing, featherlight 6-yard silhouette with unstitched blouse piece',
   'Dry clean or gentle hand wash in cold water with mild detergent.', '["Free Size (6 Yards)"]'::jsonb,
   'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1200&q=85',
   true, false, true, 'Sage Green & Silver', 17.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 95: Ethnic Gown (Women's Traditional)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(95, 'VES-ETH-095', 'Mughal Jaal Embroidered Raw Silk Floor-Length Ethnic Gown', 'mughal-jaal-embroidered-ethnic-gown', 'VESTRA Atelier', 9, 'ethnic_gowns', 'women', 'full_body',
   'supported', 'in_stock', 1750.00, 2100.00, 'INR',
   'A regal floor-sweeping gown sculpted from pure raw silk, adorned with elaborate Mughal floral vine embroidery, sequin embellishments, and a flared circular hem.',
   '100% Pure Raw Silk with Antique Gold Zardozi', 'Flared floor-length silhouette with structured corset bodice',
   'Specialist dry clean only.', '["XS", "S", "M", "L", "XL"]'::jsonb,
   'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
   true, true, true, 'Deep Wine Red', 16.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 96: Dupatta (Women's Traditional)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(96, 'VES-ACC-096', 'Banarasi Katan Silk Gold Zari Woven Bridal Dupatta', 'banarasi-katan-silk-bridal-dupatta', 'VESTRA Heritage', 9, 'dupattas', 'women', 'accessory',
   'unsupported', 'in_stock', 620.00, 750.00, 'INR',
   'Hand-woven Banarasi Katan silk dupatta enriched with dense floral jaal weaving and wide scalloped borders with heavy antique gold zari accents.',
   '100% Pure Katan Silk & Antique Zari', '2.5 metres length with hand-knotted silk tassels',
   'Dry clean only.', '["Free Size (2.5m)"]'::jsonb,
   'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85',
   false, false, true, 'Crimson & Antique Gold', 17.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 97: Mini Dress (Women's Western)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(97, 'VES-WES-097', 'Emerald Duchesse Satin Fluted Hem Cocktail Mini Dress', 'emerald-satin-fluted-cocktail-mini-dress', 'VESTRA Modern', 10, 'mini_dresses', 'women', 'full_body',
   'supported', 'in_stock', 890.00, 1050.00, 'INR',
   'Architectural mini dress crafted from heavyweight silk-blend duchesse satin, featuring a square neckline, sculpted darting, and a dramatic fluted flounce hem.',
   '75% Silk, 25% Polyester Duchesse Satin', 'Tailored mini length with body-contouring seams',
   'Dry clean only.', '["XS", "S", "M", "L"]'::jsonb,
   'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1200&q=85',
   true, true, true, 'Emerald Green', 15.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 98: Skirt (Women's Western)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(98, 'VES-WES-098', 'Sculptural Knife-Pleated Sunray Georgette Midi Skirt', 'sculptural-knife-pleated-midi-skirt', 'VESTRA Modern', 10, 'skirts', 'women', 'lower_body',
   'supported', 'in_stock', 480.00, 580.00, 'INR',
   'Fluid accordion knife pleats radiate from a high-rise grosgrain waistband, offering mesmerizing kinetic movement in lightweight Japanese chiffon-georgette.',
   '100% Fine Japanese Chiffon-Georgette', 'High-waisted A-line midi silhouette',
   'Gentle dry clean.', '["XS", "S", "M", "L", "XL"]'::jsonb,
   'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=1200&q=85',
   true, false, true, 'Champagne Pearl', 17.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 99: Cropped Jacket (Women's Western)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(99, 'VES-WES-099', 'Textured Bouclé Wool Double-Breasted Cropped Jacket', 'boucle-wool-double-breasted-cropped-jacket', 'VESTRA Sartorial', 10, 'jackets', 'women', 'upper_body',
   'supported', 'in_stock', 1150.00, 1380.00, 'INR',
   'Bespoke cropped jacket tailored from tactile heritage bouclé wool, distinguished by embossed gold buttons, raw fringe-trimmed lapels, and cupro lining.',
   '80% Virgin Wool, 20% Silk Bouclé with 100% Cupro Lining', 'Cropped tailored boxy silhouette',
   'Specialist dry clean only.', '["XS", "S", "M", "L"]'::jsonb,
   'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1200&q=85',
   true, true, true, 'Ivory & Jet Black', 16.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 100: T-shirt (Women's Western)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(100, 'VES-WES-100', 'Peruvian Pima Cotton Minimalist Crewneck T-Shirt', 'pima-cotton-minimalist-crewneck-tshirt', 'VESTRA Essentials', 10, 't_shirts', 'women', 'upper_body',
   'supported', 'in_stock', 180.00, 220.00, 'INR',
   'Spun from long-staple Peruvian pima cotton for a silky hand-feel and natural drape. Features a ribbed collar, blind-stitched hems, and clean dropped shoulder seams.',
   '100% Long-Staple Peruvian Pima Cotton', 'Relaxed refined modern fit',
   'Machine wash cold gentle cycle. Lay flat to dry.', '["XS", "S", "M", "L", "XL"]'::jsonb,
   'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
   false, false, true, 'Optic White', 18.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 101: Men's Kurta (Men's Traditional)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(101, 'VES-MEN-101', 'Handloom Tussar Silk Mandarin Embroidered Kurta', 'handloom-tussar-silk-mandarin-kurta', 'VESTRA Heritage', 11, 'mens_kurtas', 'men', 'upper_body',
   'supported', 'in_stock', 640.00, 780.00, 'INR',
   'Pure raw tussar silk kurta tailored with a refined mandarin collar, hidden horn button placket, and subtle tone-on-tone kantha embroidery along the chest.',
   '100% Handloom Tussar Silk', 'Relaxed knee-length traditional straight fit',
   'Dry clean recommended.', '["S", "M", "L", "XL", "XXL"]'::jsonb,
   'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=85',
   true, true, true, 'Oatmeal Natural Silk', 18.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 102: Nehru Jacket (Men's Traditional)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(102, 'VES-MEN-102', 'Pure Handspun Matka Silk Mandarin Collar Nehru Jacket', 'handspun-matka-silk-nehru-jacket', 'VESTRA Heritage', 11, 'nehru_jackets', 'men', 'upper_body',
   'supported', 'in_stock', 780.00, 950.00, 'INR',
   'Artisanal structured Nehru waistcoat crafted from textural handspun Matka silk. Features signature five-button front, welt chest pocket, and mother-of-pearl buttons.',
   '100% Pure Indian Matka Silk', 'Tailored sleeveless slim fit',
   'Specialist dry clean only.', '["38", "40", "42", "44"]'::jsonb,
   'https://images.unsplash.com/photo-1506634572416-48cdfe530110?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1506634572416-48cdfe530110?auto=format&fit=crop&w=1200&q=85',
   true, true, true, 'Midnight Navy', 17.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 103: Traditional Waistcoat (Men's Traditional)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(103, 'VES-MEN-103', 'Bespoke Banarasi Brocade Traditional Waistcoat', 'banarasi-brocade-traditional-waistcoat', 'VESTRA Heritage', 11, 'traditional_waistcoats', 'men', 'upper_body',
   'supported', 'in_stock', 820.00, 990.00, 'INR',
   'Luxurious ceremonial waistcoat woven in Varanasi with antique gold zari and rich silk threads. Impeccably lined with breathable silk habotai.',
   'Pure Silk Banarasi Brocade with Gold Zari', 'Structured sleeveless ceremonial fit',
   'Dry clean only.', '["38", "40", "42", "44"]'::jsonb,
   'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&w=1200&q=85',
   false, false, true, 'Royal Gold & Ruby', 17.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 104: Polo T-shirt (Men's Western)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(104, 'VES-MEN-104', 'Fine Gauge Sea Island Knit Cotton Polo Shirt', 'sea-island-knit-cotton-polo-shirt', 'VESTRA Modern', 12, 'polo_t_shirts', 'men', 'upper_body',
   'supported', 'in_stock', 320.00, 390.00, 'INR',
   'Crafted from rare 18-gauge Sea Island cotton knit with a mother-of-pearl three-button placket, ribbed collar, and fine ribbed cuffs.',
   '100% Sea Island Long-Staple Cotton', 'Contemporary tailored polo fit',
   'Hand wash or gentle machine wash inside out in cold water.', '["S", "M", "L", "XL"]'::jsonb,
   'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1200&q=85',
   true, false, true, 'Classic Navy Blue', 18.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 105: Shorts (Men's Western)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(105, 'VES-MEN-105', 'Double-Pleated Linen-Cotton Sartorial Resort Shorts', 'pleated-linen-cotton-resort-shorts', 'VESTRA Sartorial', 12, 'shorts', 'men', 'lower_body',
   'supported', 'in_stock', 260.00, 310.00, 'INR',
   'Tailored Bermuda shorts with forward double pleats, side adjusters, and cuffed hems in a breathable Italian linen-cotton herringbone weave.',
   '55% French Linen, 45% Italian Cotton', 'Relaxed tailored above-knee fit (7-inch inseam)',
   'Machine wash cold gentle cycle. Warm iron.', '["30", "32", "34", "36"]'::jsonb,
   'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=1200&q=85',
   false, false, true, 'Sand Beige', 16.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 106: Hoodie (Men's Western)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(106, 'VES-MEN-106', 'Heavyweight French Terry Tailored Luxury Hoodie', 'heavyweight-french-terry-luxury-hoodie', 'VESTRA Essentials', 12, 'hoodies', 'men', 'upper_body',
   'supported', 'in_stock', 420.00, 490.00, 'INR',
   '500gsm custom-knit loopback French terry hoodie engineered with double-layered hood, flatlock stitching, and ergonomic raglan sleeves.',
   '100% Combed Organic Cotton (500 GSM)', 'Clean boxy contemporary fit',
   'Machine wash cold with like colors. Hang dry.', '["S", "M", "L", "XL"]'::jsonb,
   'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
   true, false, true, 'Heather Ash Grey', 14.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 107: Suede Jacket (Men's Western)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(107, 'VES-MEN-107', 'Cognac Lambskin Suede Minimalist Bomber Jacket', 'cognac-lambskin-suede-bomber-jacket', 'VESTRA Sartorial', 12, 'jackets', 'men', 'upper_body',
   'supported', 'in_stock', 1650.00, 1950.00, 'INR',
   'Buttery Italian lambskin suede with matte antique brass 2-way zipper, ribbed cashmere collar, cuffs, and hem. Fully lined in cupro.',
   '100% Genuine Italian Lambskin Suede, Cashmere Trim', 'Sleek bomber jacket silhouette',
   'Specialist leather and suede cleaning only.', '["38", "40", "42", "44"]'::jsonb,
   'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=1200&q=85',
   true, true, true, 'Cognac Tan Suede', 15.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 108: Necktie (Accessories)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(108, 'VES-ACC-108', 'Hand-Finished 7-Fold Italian Silk Jacquard Necktie', 'hand-finished-7-fold-italian-silk-tie', 'VESTRA Sartorial', 4, 'ties', 'men', 'accessory',
   'unsupported', 'in_stock', 240.00, 290.00, 'INR',
   'Crafted by artisans in Como, Italy using the time-honored unlined 7-fold construction method. Woven from high-density pure silk jacquard.',
   '100% Pure Italian Silk Jacquard', '3.25 inches (8.5 cm) classic width',
   'Dry clean only.', '["One Size"]'::jsonb,
   'https://images.unsplash.com/photo-1589756823695-278bc923f962?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1589756823695-278bc923f962?auto=format&fit=crop&w=1200&q=85',
   false, false, true, 'Midnight Navy & Silver Dot', 17.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;

-- 109: Pocket Square (Accessories)
INSERT INTO products (
  id, sku, name, slug, brand, category_id, subcategory, gender, garment_type,
  tryon_compatibility, stock_status, price, original_price, currency,
  description, material, fit, care_instructions, sizes, primary_image_url,
  tryon_image_url, is_sample, is_featured, is_active, color, discount_percent,
  approval_status, image_width, image_height, source
) VALUES 
(109, 'VES-ACC-109', 'Artisanal Mulberry Silk Hand-Rolled Pocket Square', 'mulberry-silk-hand-rolled-pocket-square', 'VESTRA Sartorial', 4, 'fashion_accessories', 'unisex', 'accessory',
   'unsupported', 'in_stock', 150.00, 180.00, 'INR',
   'Hand-printed on pure mulberry silk twill with meticulously hand-rolled and hand-sewn edges. Features an archival botanical medallion motif.',
   '100% Pure Mulberry Silk Twill (16 Momme)', '17 x 17 inches (43 x 43 cm)',
   'Dry clean only.', '["One Size"]'::jsonb,
   'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=1200&q=85',
   'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=1200&q=85',
   false, false, true, 'Burgundy & Gold Medallion', 16.00, 'APPROVED', 1200, 1600, 'atelier')
ON CONFLICT (id) DO NOTHING;
