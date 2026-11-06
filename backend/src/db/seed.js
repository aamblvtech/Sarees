import bcrypt from 'bcryptjs';
import { query, pool } from '../config/db.js';
import { sampleCategories, sampleProducts } from '../data/sampleProducts.js';

export async function runSeed() {
  console.log('[Seed] Seeding VESTRA database with admin, categories, and luxury collection...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Seed Default Admin Account (Bcrypt hashed)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@vestra.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword2026!';
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await client.query(
      `INSERT INTO admins (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name`,
      [adminEmail, passwordHash, 'VESTRA Atelier Administrator', 'superadmin']
    );
    console.log(`[Seed] Seeded admin user: ${adminEmail} (password: ${adminPassword})`);

    // 2. Seed Categories
    const categoryMap = new Map();
    for (const cat of sampleCategories) {
      const catResult = await client.query(
        `INSERT INTO categories (name, slug, description, image_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url
         RETURNING id, slug`,
        [cat.name, cat.slug, cat.description, cat.imageUrl]
      );
      categoryMap.set(cat.slug, catResult.rows[0].id);
    }
    console.log(`[Seed] Seeded ${categoryMap.size} apparel categories.`);

    // 3. Clean up removed legacy low-resolution crops (<250x250px)
    await client.query("DELETE FROM products WHERE tryon_compatibility = 'needs_image_replacement' OR id IN (46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64)");

    // 4. Seed Products
    for (const prod of sampleProducts) {
      const catSlug = sampleCategories.find((c) => c.id === prod.categoryId)?.slug;
      const categoryId = categoryMap.get(catSlug) || null;

      const prodResult = await client.query(
        `INSERT INTO products (
           sku, name, slug, brand, category_id, subcategory, gender, garment_type,
           tryon_compatibility, stock_status, price, original_price, currency,
           description, material, fit, care_instructions, sizes,
           primary_image_url, tryon_image_url, is_sample, is_featured, is_active,
           color, needs_admin_review, discount_percent, image_width, image_height, approval_status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
         ON CONFLICT (sku) DO UPDATE
         SET name = EXCLUDED.name, brand = EXCLUDED.brand, category_id = EXCLUDED.category_id,
             subcategory = EXCLUDED.subcategory, gender = EXCLUDED.gender,
             garment_type = EXCLUDED.garment_type, tryon_compatibility = EXCLUDED.tryon_compatibility,
             stock_status = EXCLUDED.stock_status, price = EXCLUDED.price,
             original_price = EXCLUDED.original_price, description = EXCLUDED.description,
             material = EXCLUDED.material, fit = EXCLUDED.fit,
             care_instructions = EXCLUDED.care_instructions, sizes = EXCLUDED.sizes,
             primary_image_url = EXCLUDED.primary_image_url, tryon_image_url = EXCLUDED.tryon_image_url,
             is_featured = EXCLUDED.is_featured, is_active = EXCLUDED.is_active,
             color = EXCLUDED.color, needs_admin_review = EXCLUDED.needs_admin_review,
             discount_percent = EXCLUDED.discount_percent,
             image_width = EXCLUDED.image_width, image_height = EXCLUDED.image_height,
             approval_status = EXCLUDED.approval_status,
             updated_at = CURRENT_TIMESTAMP
         RETURNING id, sku`,
        [
          prod.sku,
          prod.name,
          prod.slug,
          prod.brand || 'VESTRA',
          categoryId,
          prod.subcategory || 'sarees',
          prod.gender || 'women',
          prod.garmentType || 'upper_body',
          prod.tryonCompatibility || 'supported',
          prod.stockStatus || 'in_stock',
          prod.price,
          prod.originalPrice || null,
          prod.currency || 'USD',
          prod.description,
          prod.material,
          prod.fit,
          prod.careInstructions,
          JSON.stringify(prod.sizes || ['XS', 'S', 'M', 'L', 'XL']),
          prod.primaryImage,
          prod.tryonOverlayImage || prod.primaryImage,
          false,
          prod.isFeatured || false,
          prod.isActive ?? true,
          prod.color || null,
          prod.needsAdminReview || false,
          prod.discountPercent || null,
          prod.imageWidth || null,
          prod.imageHeight || null,
          prod.approvalStatus || (prod.tryonCompatibility === 'supported' ? 'AI_READY' : 'APPROVED')
        ]
      );

      const productId = prodResult.rows[0].id;

      // Seed Product Images
      await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
      let sortOrder = 0;
      for (const imgUrl of prod.images || [prod.primaryImage]) {
        await client.query(
          `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            productId,
            imgUrl,
            `${prod.name} Luxury View ${sortOrder + 1}`,
            sortOrder === 0,
            sortOrder
          ]
        );
        sortOrder++;
      }
    }

    // Safely archive any legacy products not in curated collection
    const validSkus = sampleProducts.map((p) => p.sku);
    if (validSkus.length > 0) {
      const placeholders = validSkus.map((_, i) => `$${i + 1}`).join(', ');
      await client.query(
        `UPDATE products SET is_active = false WHERE sku NOT IN (${placeholders})`,
        validSkus
      );
    }

    await client.query('COMMIT');
    console.log(`[Seed] Seeded ${sampleProducts.length} luxury garments into database.`);
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed Error]:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// CLI execution: node src/db/seed.js
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed()
    .then(() => {
      console.log('[Seed] Finished. Exiting.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Failed]:', err);
      process.exit(1);
    });
}
