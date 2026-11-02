import bcrypt from 'bcryptjs';
import { query, withTransaction, checkDbConnection } from './pool.js';

export const DEMO_USERS = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    email: 'admin@sajee.luxury',
    password: 'AdminPassword@2026',
    fullName: 'Priya Somani (Director of Retail)',
    role: 'admin',
    phone: '+91 98450 11223'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    email: 'staff@sajee.luxury',
    password: 'StaffPassword@2026',
    fullName: 'Ananya Sharma (Senior Draper & Stylist)',
    role: 'staff',
    phone: '+91 98450 44556'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    email: 'customer@sajee.luxury',
    password: 'CustomerPassword@2026',
    fullName: 'Meera Venkatesh',
    role: 'customer',
    phone: '+91 98450 77889'
  }
];

export const DEMO_STORES = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'SAJEE Flagship Maison',
    code: 'SAJEE-BLR-01',
    address: 'No. 42 Lavelle Road, Indiranagar',
    city: 'Bangalore',
    phone: '+91 80 4123 8900'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'SAJEE Jubilee Hills Heritage Lounge',
    code: 'SAJEE-HYD-01',
    address: 'Road No. 36, Jubilee Hills',
    city: 'Hyderabad',
    phone: '+91 40 6789 1234'
  }
];

export const DEMO_KIOSKS = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    storeId: 'a0000000-0000-0000-0000-000000000001',
    name: 'Touch Kiosk 01 - Grand Salon',
    identifier: 'KIOSK-BLR-GS01',
    status: 'active',
    ipAddress: '192.168.1.101'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    storeId: 'a0000000-0000-0000-0000-000000000001',
    name: 'Touch Kiosk 02 - Bridal Suite',
    identifier: 'KIOSK-BLR-BS02',
    status: 'active',
    ipAddress: '192.168.1.102'
  }
];

export const DEMO_PRODUCTS = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    sku: 'SAJEE-KANJ-001',
    name: 'Maharani Kanjeevaram Bridal Silk',
    description: 'Handloom pure mulberry silk woven with pure 24k gold zari. Features korvai interlocking border technique and traditional peacock and annapakshi motifs across the body.',
    price: 68500.00,
    fabric: 'Pure Kanjeevaram Silk',
    color: 'Deep Maroon & Gold',
    occasion: 'Bridal & Wedding',
    borderType: 'Broad Korvai Gold Zari Border (8 inches)',
    palluDetails: 'Heavy Rich Pallu with Mayil (Peacock) and Rudraksh motifs',
    blousePiece: true,
    blouseDetails: 'Unstitched Deep Crimson Silk blouse piece with matching border (80 cm)',
    stockQuantity: 4,
    status: 'available',
    primaryImage: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85',
    detailImages: [
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=85'
    ],
    annotations: {
      body_bbox: { x: 12, y: 28, width: 45, height: 55, label: 'Body Field (Deep Maroon Silk)' },
      pallu_bbox: { x: 58, y: 15, width: 38, height: 70, label: 'Pallu (Grand 24k Zari Weave)' },
      main_border_bbox: { x: 10, y: 84, width: 86, height: 14, label: 'Main Korvai Border' },
      secondary_border_bbox: { x: 10, y: 5, width: 86, height: 10, label: 'Secondary Border' },
      motifs_bbox: { x: 22, y: 38, width: 20, height: 22, label: 'Peacock & Rudraksh Buttas' },
      blouse_piece_bbox: { x: 65, y: 80, width: 25, height: 18, label: 'Blouse Piece (Unstitched)' }
    }
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    sku: 'SAJEE-BNR-002',
    name: 'Varanasi Royal Kadwa Brocade',
    description: 'Exquisite Banarasi Katan silk handwoven in Varanasi using the ancient Kadwa technique where each gold zari floral buta is etched individually into the fabric.',
    price: 52000.00,
    fabric: 'Banarasi Katan Silk',
    color: 'Muted Antique Gold & Ruby',
    occasion: 'Festive & Reception',
    borderType: 'Intricate Floral Jaal Kadwa Border',
    palluDetails: 'Opulent Shikarghar hunting motif pallu with real zari patina',
    blousePiece: true,
    blouseDetails: 'Matching antique gold tissue silk unstitched blouse (85 cm)',
    stockQuantity: 3,
    status: 'available',
    primaryImage: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
    detailImages: [],
    annotations: {
      body_bbox: { x: 15, y: 20, width: 50, height: 60, label: 'Kadwa Brocade Field' },
      pallu_bbox: { x: 60, y: 10, width: 35, height: 80, label: 'Shikarghar Zari Pallu' },
      main_border_bbox: { x: 5, y: 82, width: 90, height: 16, label: 'Floral Jaal Border' }
    }
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    sku: 'SAJEE-CHND-003',
    name: 'Avani Chanderi Tissue Handloom',
    description: 'Featherweight sheer silk-cotton weave infused with handspun silver and gold zari threads. Drapes like a whispering mist with contemporary grace.',
    price: 28900.00,
    fabric: 'Chanderi Silk Cotton',
    color: 'Warm Ivory & Forest Green',
    occasion: 'Cocktail & Evening',
    borderType: 'Sleek 3-inch Temple Zari Border',
    palluDetails: 'Minimalist linear stripes pallu with delicate tassels',
    blousePiece: true,
    blouseDetails: 'Contrast bottle green chanderi silk piece with zari piping',
    stockQuantity: 7,
    status: 'available',
    primaryImage: 'https://images.unsplash.com/photo-1610030469668-93510cb67655?auto=format&fit=crop&w=1200&q=85',
    detailImages: [],
    annotations: {
      body_bbox: { x: 20, y: 25, width: 45, height: 50, label: 'Tissue Sheer Body' },
      pallu_bbox: { x: 65, y: 15, width: 30, height: 70, label: 'Temple Striped Pallu' }
    }
  },
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    sku: 'SAJEE-PAITH-004',
    name: 'Yeola Royal Paithani Heritage',
    description: 'Masterpiece Paithani crafted by master weavers in Yeola. Features the iconic kaleidoscopic peacock pallu (Mor-Bangadi) woven with tapestry weave and obverse identical finish.',
    price: 74500.00,
    fabric: 'Pure Paithani Silk',
    color: 'Royal Emerald & Magenta',
    occasion: 'Traditional Ceremony',
    borderType: 'Traditional Narali (Coconut) Zari Border',
    palluDetails: 'Grand Asawali & Muniya peacock tapestry woven pallu',
    blousePiece: true,
    blouseDetails: 'Magenta silk unstitched running blouse piece with Paithani border',
    stockQuantity: 2,
    status: 'available',
    primaryImage: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1200&q=85',
    detailImages: [],
    annotations: {
      body_bbox: { x: 10, y: 20, width: 50, height: 60, label: 'Royal Emerald Silk Field' },
      pallu_bbox: { x: 55, y: 10, width: 40, height: 80, label: 'Mor-Bangadi Tapestry Pallu' }
    }
  },
  {
    id: 'd0000000-0000-0000-0000-000000000005',
    sku: 'SAJEE-TUSS-005',
    name: 'Katha Tussar Handpainted Artisan',
    description: 'Wild handloom Tussar silk naturally textured, bearing artisanal hand-painted flora and fauna in organic vegetable dyes by national award-winning artisans.',
    price: 34000.00,
    fabric: 'Handloom Tussar Silk',
    color: 'Warm Raw Ivory & Earth Umber',
    occasion: 'Art Gala & Daytime Festivity',
    borderType: 'Gicha silk selvage border with kantha stitch accents',
    palluDetails: 'Narrative tree-of-life artisan painted pallu',
    blousePiece: true,
    blouseDetails: 'Running natural tussar with hand-stitched kantha sleeves',
    stockQuantity: 5,
    status: 'available',
    primaryImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=85',
    detailImages: [],
    annotations: {
      body_bbox: { x: 15, y: 25, width: 50, height: 50, label: 'Natural Tussar Slub Texture' },
      pallu_bbox: { x: 60, y: 15, width: 35, height: 75, label: 'Tree-of-Life Hand-painted Pallu' }
    }
  },
  {
    id: 'd0000000-0000-0000-0000-000000000006',
    sku: 'SAJEE-ORG-006',
    name: 'Noor Zardozi Organza Sheer',
    description: 'Crisp translucent pure silk organza embroidered with fine zardozi wirework, cutdana, and micro-pearls. Featherweight drape with sculptural silhouettes.',
    price: 41500.00,
    fabric: 'Pure Silk Organza',
    color: 'Blush Champagne & Rose Zari',
    occasion: 'Sangeet & Reception',
    borderType: 'Scalloped hand-cut zardozi border',
    palluDetails: 'Dispersed floral bouquet sprinkling pallu',
    blousePiece: true,
    blouseDetails: 'Hand-embroidered heavy raw silk blouse fabric',
    stockQuantity: 6,
    status: 'available',
    primaryImage: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=85',
    detailImages: [],
    annotations: {
      body_bbox: { x: 18, y: 22, width: 45, height: 55, label: 'Zardozi Embroidered Sheer Body' },
      pallu_bbox: { x: 55, y: 12, width: 40, height: 75, label: 'Floral Sprinkling Pallu' }
    }
  }
];

export async function runSeeds() {
  console.log('--- Starting Database Seeding ---');
  await checkDbConnection();

  return await withTransaction(async ({ query }) => {
    // 1. Seed Stores
    for (const store of DEMO_STORES) {
      await query(
        `INSERT INTO stores (id, name, code, address, city, phone)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO NOTHING`,
        [store.id, store.name, store.code, store.address, store.city, store.phone]
      );
    }
    console.log(`[SEED] Seeded ${DEMO_STORES.length} stores.`);

    // 2. Seed Kiosks
    for (const kiosk of DEMO_KIOSKS) {
      await query(
        `INSERT INTO kiosks (id, store_id, name, identifier, status, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (identifier) DO NOTHING`,
        [kiosk.id, kiosk.storeId, kiosk.name, kiosk.identifier, kiosk.status, kiosk.ipAddress]
      );
    }
    console.log(`[SEED] Seeded ${DEMO_KIOSKS.length} kiosks.`);

    // 3. Seed Users with Bcrypt Hashes
    for (const user of DEMO_USERS) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, role, phone, consent_data_saving)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (email) DO NOTHING`,
        [user.id, user.email, passwordHash, user.fullName, user.role, user.phone]
      );
    }
    console.log(`[SEED] Seeded ${DEMO_USERS.length} demo users (admin, staff, customer).`);

    // 4. Seed Products, Images, Annotations
    for (const p of DEMO_PRODUCTS) {
      await query(
        `INSERT INTO saree_products (id, sku, name, description, price, fabric, color, occasion, border_type, pallu_details, blouse_piece, blouse_details, stock_quantity, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (sku) DO NOTHING`,
        [p.id, p.sku, p.name, p.description, p.price, p.fabric, p.color, p.occasion, p.borderType, p.palluDetails, p.blousePiece, p.blouseDetails, p.stockQuantity, p.status]
      );

      // Primary image
      await query(
        `INSERT INTO product_images (product_id, image_url, image_type, is_primary)
         VALUES ($1, $2, 'folded', true)`,
        [p.id, p.primaryImage]
      );

      // Annotations
      if (p.annotations) {
        await query(
          `INSERT INTO saree_component_annotations (product_id, body_bbox, pallu_bbox, main_border_bbox, secondary_border_bbox, motifs_bbox, blouse_piece_bbox, detection_method, is_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai_assisted', true)`,
          [
            p.id,
            JSON.stringify(p.annotations.body_bbox || null),
            JSON.stringify(p.annotations.pallu_bbox || null),
            JSON.stringify(p.annotations.main_border_bbox || null),
            JSON.stringify(p.annotations.secondary_border_bbox || null),
            JSON.stringify(p.annotations.motifs_bbox || null),
            JSON.stringify(p.annotations.blouse_piece_bbox || null)
          ]
        );
      }
    }
    console.log(`[SEED] Seeded ${DEMO_PRODUCTS.length} saree catalog products with component annotations.`);
    console.log('--- Database Seeding Complete ---');
    return true;
  });
}
