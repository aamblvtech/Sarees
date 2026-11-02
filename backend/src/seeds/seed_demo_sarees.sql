-- SAJEE Demo Seed Data
-- Demo stores, kiosks, staff accounts, rich saree catalog, components & demo photos

-- 1. STORES
INSERT INTO stores (id, name, code, address, city, phone) VALUES
('a0000000-0000-0000-0000-000000000001', 'SAJEE Flagship Maison', 'SAJEE-BLR-01', 'No. 42 Lavelle Road, Indiranagar', 'Bangalore', '+91 80 4123 8900'),
('a0000000-0000-0000-0000-000000000002', 'SAJEE Jubilee Hills Heritage Lounge', 'SAJEE-HYD-01', 'Road No. 36, Jubilee Hills', 'Hyderabad', '+91 40 6789 1234')
ON CONFLICT (code) DO NOTHING;

-- 2. KIOSKS
INSERT INTO kiosks (id, store_id, name, identifier, status, camera_config, ip_address) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Touch Kiosk 01 - Grand Salon', 'KIOSK-BLR-GS01', 'active', '{"resolution": "1080x1920", "orientation": "portrait", "sensor": "UltraWide HD"}'::jsonb, '192.168.1.101'),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Touch Kiosk 02 - Bridal Suite', 'KIOSK-BLR-BS02', 'active', '{"resolution": "1080x1920", "orientation": "portrait", "sensor": "UltraWide HD"}'::jsonb, '192.168.1.102')
ON CONFLICT (identifier) DO NOTHING;

-- 3. USERS (bcrypt hash for "Sajee@2026")
-- $2a$10$wT8K48q1K8m72J8G52e46eO/YqIeEa4Q1Yh2K7xZq5P5G2YgXgOa2 (we will generate live hash in seed.ts or sql)
INSERT INTO users (id, email, password_hash, full_name, role, phone, consent_data_saving) VALUES
('c0000000-0000-0000-0000-000000000001', 'admin@sajee.luxury', '$2a$10$z57hSgK2z9gY65M33iS6fOnMtx9yU9qN1rG4D9aY9zI1Z2t3q4r5s', 'Priya Somani (Director)', 'admin', '+91 98450 11223', true),
('c0000000-0000-0000-0000-000000000002', 'staff@sajee.luxury', '$2a$10$z57hSgK2z9gY65M33iS6fOnMtx9yU9qN1rG4D9aY9zI1Z2t3q4r5s', 'Ananya Sharma (Senior Draper)', 'staff', '+91 98450 44556', true),
('c0000000-0000-0000-0000-000000000003', 'customer@sajee.luxury', '$2a$10$z57hSgK2z9gY65M33iS6fOnMtx9yU9qN1rG4D9aY9zI1Z2t3q4r5s', 'Meera Venkatesh', 'customer', '+91 98450 77889', true)
ON CONFLICT (email) DO NOTHING;

-- 4. SAREE PRODUCTS (Clearly labeled demo products)
INSERT INTO saree_products (id, sku, name, description, price, fabric, color, occasion, border_type, pallu_details, blouse_piece, blouse_details, stock_quantity, status) VALUES
('d0000000-0000-0000-0000-000000000001', 'SAJEE-KANJ-001', 'Maharani Kanjeevaram Bridal Silk', 'Handloom pure mulberry silk woven with pure 24k gold zari. Features korvai interlocking border technique and traditional peacock and annapakshi motifs across the body.', 68500.00, 'Pure Kanjeevaram Silk', 'Deep Maroon & Gold', 'Bridal & Wedding', 'Broad Korvai Gold Zari Border (8 inches)', 'Heavy Rich Pallu with Mayil (Peacock) and Rudraksh motifs', true, 'Unstitched Deep Crimson Silk blouse piece with matching border (80 cm)', 4, 'available'),

('d0000000-0000-0000-0000-000000000002', 'SAJEE-BNR-002', 'Varanasi Royal Kadwa Brocade', 'Exquisite Banarasi Katan silk handwoven in Varanasi using the ancient Kadwa technique where each gold zari floral buta is etched individually into the fabric.', 52000.00, 'Banarasi Katan Silk', 'Muted Antique Gold & Ruby', 'Festive & Reception', 'Intricate Floral Jaal Kadwa Border', 'Opulent Shikarghar hunting motif pallu with real zari patina', true, 'Matching antique gold tissue silk unstitched blouse (85 cm)', 3, 'available'),

('d0000000-0000-0000-0000-000000000003', 'SAJEE-CHND-003', 'Avani Chanderi Tissue Handloom', 'Featherweight sheer silk-cotton weave infused with handspun silver and gold zari threads. Drapes like a whispering mist with contemporary grace.', 28900.00, 'Chanderi Silk Cotton', 'Warm Ivory & Forest Green', 'Cocktail & Evening', 'Sleek 3-inch Temple Zari Border', 'Minimalist linear stripes pallu with delicate tassels', true, 'Contrast bottle green chanderi silk piece with zari piping', 7, 'available'),

('d0000000-0000-0000-0000-000000000004', 'SAJEE-PAITH-004', 'Yeola Royal Paithani Heritage', 'Masterpiece Paithani crafted by master weavers in Yeola. Features the iconic kaleidoscopic peacock pallu (Mor-Bangadi) woven with tapestry weave and obverse identical finish.', 74500.00, 'Pure Paithani Silk', 'Royal Emerald & Magenta', 'Traditional Ceremony', 'Traditional Narali (Coconut) Zari Border', 'Grand Asawali & Muniya peacock tapestry woven pallu', true, 'Magenta silk unstitched running blouse piece with Paithani border', 2, 'available'),

('d0000000-0000-0000-0000-000000000005', 'SAJEE-TUSS-005', 'Katha Tussar Handpainted Artisan', 'Wild handloom Tussar silk naturally textured, bearing artisanal hand-painted flora and fauna in organic vegetable dyes by national award-winning artisans.', 34000.00, 'Handloom Tussar Silk', 'Warm Raw Ivory & Earth Umber', 'Art Gala & Daytime Festivity', 'Gicha silk selvage border with kantha stitch accents', 'Narrative tree-of-life artisan painted pallu', true, 'Running natural tussar with hand-stitched kantha sleeves', 5, 'available'),

('d0000000-0000-0000-0000-000000000006', 'SAJEE-ORG-006', 'Noor Zardozi Organza Sheer', 'Crisp translucent pure silk organza embroidered with fine zardozi wirework, cutdana, and micro-pearls. Featherweight drape with sculptural silhouettes.', 41500.00, 'Pure Silk Organza', 'Blush Champagne & Rose Zari', 'Sangeet & Reception', 'Scalloped hand-cut zardozi border', 'Dispersed floral bouquet sprinkling pallu', true, 'Hand-embroidered heavy raw silk blouse fabric', 6, 'available')
ON CONFLICT (sku) DO NOTHING;

-- 5. PRODUCT IMAGES (Authentic editorial images for demonstration)
INSERT INTO product_images (id, product_id, image_url, image_type, is_primary) VALUES
('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85', 'folded', true),
('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=85', 'pallu', false),
('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85', 'folded', true),
('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1610030469668-93510cb67655?auto=format&fit=crop&w=1200&q=85', 'folded', true),
('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1200&q=85', 'folded', true),
('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=85', 'folded', true),
('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=85', 'folded', true)
ON CONFLICT (id) DO NOTHING;

-- 6. COMPONENT ANNOTATIONS (Pre-labeled components for folded sarees)
INSERT INTO saree_component_annotations (id, product_id, image_id, body_bbox, pallu_bbox, main_border_bbox, secondary_border_bbox, motifs_bbox, blouse_piece_bbox, detection_method, is_verified, notes) VALUES
('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
 '{"x": 12, "y": 28, "width": 45, "height": 55, "label": "Body Field (Deep Maroon Silk)"}'::jsonb,
 '{"x": 58, "y": 15, "width": 38, "height": 70, "label": "Pallu (Grand 24k Zari Weave)"}'::jsonb,
 '{"x": 10, "y": 84, "width": 86, "height": 14, "label": "Main Korvai Border"}'::jsonb,
 '{"x": 10, "y": 5, "width": 86, "height": 10, "label": "Secondary Border"}'::jsonb,
 '{"x": 22, "y": 38, "width": 20, "height": 22, "label": "Peacock & Rudraksh Buttas"}'::jsonb,
 '{"x": 65, "y": 80, "width": 25, "height": 18, "label": "Blouse Piece (Unstitched)"}'::jsonb,
 'ai_assisted', true, 'Verified by Senior Draper Priya S.')
ON CONFLICT (id) DO NOTHING;
