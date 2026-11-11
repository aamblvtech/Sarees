import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { initializeDatabase, query } from '../src/config/db.js';
import { runSeed } from '../src/db/seed.js';
import { garmentPromptGenerator } from '../src/services/garmentPromptGenerator.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vestra_luxury_jwt_secret_atelier_key_2026';

test('VESTRA Platform Enhancements, Smart Camera & Multi-Category Suite', async (t) => {
  await initializeDatabase();
  await runSeed();

  let adminToken;
  let supplierToken;
  let testSupplierAccountId;

  await t.test('1. Setup Admin and Supplier Authentication Tokens', async () => {
    adminToken = jwt.sign(
      { id: 1, email: 'admin@vestra.com', name: 'Atelier Director', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    assert.ok(adminToken);

    const supRes = await query(`SELECT id, supplier_account_id, email, role FROM supplier_users LIMIT 1`);
    assert.ok(supRes.rows.length > 0);
    testSupplierAccountId = supRes.rows[0].supplier_account_id;

    supplierToken = jwt.sign(
      {
        userId: supRes.rows[0].id,
        supplierAccountId: testSupplierAccountId,
        email: supRes.rows[0].email,
        role: 'supplier'
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    assert.ok(supplierToken);
  });

  await t.test('2. Garment Prompt Generator supports all 10 specialized fashion categories', async () => {
    // 1. Saree
    const sareePrompt = garmentPromptGenerator.generatePrompt({
      name: 'Varanasi Royal Banarasi Silk Saree',
      subcategory: 'banarasi',
      garment_type: 'saree',
      material: 'Katan Silk',
      color: 'Crimson Red'
    });
    assert.ok(sareePrompt.includes('Nivi drape'), 'Saree prompt should specify Nivi drape');
    assert.ok(sareePrompt.includes('left shoulder'), 'Saree prompt should specify pallu over left shoulder');

    // 2. T-Shirt
    const tshirtPrompt = garmentPromptGenerator.generatePrompt({
      name: 'Supima Cotton Crew Neck T-Shirt',
      subcategory: 't-shirt',
      material: '100% Cotton Jersey',
      color: 'Navy Blue'
    });
    assert.ok(tshirtPrompt.includes('T-shirt') || tshirtPrompt.includes('neckline'));

    // 3. Shirt
    const shirtPrompt = garmentPromptGenerator.generatePrompt({
      name: 'Italian Poplin Formal Dress Shirt',
      subcategory: 'formal_shirts',
      material: 'Egyptian Cotton Poplin',
      color: 'Crisp White'
    });
    assert.ok(shirtPrompt.includes('collar') || shirtPrompt.includes('placket') || shirtPrompt.includes('shirt'));

    // 4. Dress
    const dressPrompt = garmentPromptGenerator.generatePrompt({
      name: 'Silk Crepe Evening Gown',
      subcategory: 'evening_dresses',
      category_name: 'Dresses',
      material: 'Mulberry Silk Crepe',
      color: 'Emerald'
    });
    assert.ok(dressPrompt.includes('dress') || dressPrompt.includes('gown') || dressPrompt.includes('silhouette'));

    // 5. Kurti
    const kurtiPrompt = garmentPromptGenerator.generatePrompt({
      name: 'Chanderi Embroidered Straight Kurti',
      subcategory: 'straight_kurtis',
      material: 'Chanderi Silk',
      color: 'Mustard Yellow'
    });
    assert.ok(kurtiPrompt.includes('Kurti') || kurtiPrompt.includes('slits'));

    // 6. Salwar Suit
    const salwarPrompt = garmentPromptGenerator.generatePrompt({
      name: 'Anarkali Chanderi Salwar Kameez Ensemble',
      subcategory: 'anarkali_suits',
      material: 'Silk Georgette',
      color: 'Pastel Peach'
    });
    assert.ok(salwarPrompt.includes('Salwar') || salwarPrompt.includes('dupatta'));

    // 7. Trousers
    const trouserPrompt = garmentPromptGenerator.generatePrompt({
      name: 'Pleated Wool Wide-Leg Trousers',
      subcategory: 'formal_trousers',
      material: 'Super 120s Wool',
      color: 'Charcoal'
    });
    assert.ok(trouserPrompt.includes('trouser') || trouserPrompt.includes('waistband') || trouserPrompt.includes('crease'));

    // 8. Jeans
    const jeansPrompt = garmentPromptGenerator.generatePrompt({
      name: 'Selvedge Straight Indigo Denim Jeans',
      subcategory: 'jeans',
      material: '14oz Japanese Selvedge Denim',
      color: 'Indigo'
    });
    assert.ok(jeansPrompt.includes('jeans') || jeansPrompt.includes('denim') || jeansPrompt.includes('pockets'));

    // 9. Blazer
    const blazerPrompt = garmentPromptGenerator.generatePrompt({
      name: 'Savile Row Single-Breasted Navy Blazer',
      subcategory: 'blazers',
      material: 'Worsted Wool',
      color: 'Navy'
    });
    assert.ok(blazerPrompt.includes('blazer') || blazerPrompt.includes('lapel') || blazerPrompt.includes('shoulders'));

    // 10. Jacket
    const jacketPrompt = garmentPromptGenerator.generatePrompt({
      name: 'Suede Minimalist Bomber Jacket',
      subcategory: 'jackets',
      material: 'Goat Suede',
      color: 'Tobacco'
    });
    assert.ok(jacketPrompt.includes('jacket') || jacketPrompt.includes('outerwear'));
  });

  await t.test('3. Customer Wishlist Database Operations & Constraints', async () => {
    const testSessionId = `test_sess_${Date.now()}`;
    const prodRes = await query(`SELECT id FROM products LIMIT 2`);
    assert.ok(prodRes.rows.length >= 2);
    const prodId1 = prodRes.rows[0].id;
    const prodId2 = prodRes.rows[1].id;

    // Add first item to wishlist
    const ins1 = await query(
      `INSERT INTO customer_wishlists (session_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (session_id, product_id) DO NOTHING
       RETURNING id`,
      [testSessionId, prodId1]
    );
    assert.equal(ins1.rows.length, 1);

    // Duplicate addition is handled gracefully by unique constraint
    await query(
      `INSERT INTO customer_wishlists (session_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (session_id, product_id) DO NOTHING`,
      [testSessionId, prodId1]
    );

    const dupCheck = await query(
      `SELECT COUNT(*)::int as cnt FROM customer_wishlists WHERE session_id = $1 AND product_id = $2`,
      [testSessionId, prodId1]
    );
    assert.equal(dupCheck.rows[0].cnt, 1);

    // Add second item
    await query(
      `INSERT INTO customer_wishlists (session_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (session_id, product_id) DO NOTHING`,
      [testSessionId, prodId2]
    );

    // Retrieve joined wishlist
    const listRes = await query(
      `SELECT w.id, w.product_id, p.name, p.price, p.primary_image_url
       FROM customer_wishlists w
       JOIN products p ON p.id = w.product_id
       WHERE w.session_id = $1`,
      [testSessionId]
    );
    assert.equal(listRes.rows.length, 2);

    // Delete first item
    await query(
      `DELETE FROM customer_wishlists WHERE session_id = $1 AND product_id = $2`,
      [testSessionId, prodId1]
    );

    const afterDel = await query(
      `SELECT id FROM customer_wishlists WHERE session_id = $1`,
      [testSessionId]
    );
    assert.equal(afterDel.rows.length, 1);
  });

  await t.test('4. Kiosk Sessions & Complete Privacy Purge Verification', async () => {
    const kioskToken = `kiosk_token_${Date.now()}`;
    const testPhoto = '/uploads/sample_kiosk_portrait.jpg';

    // Create session
    const createRes = await query(
      `INSERT INTO customer_tryon_sessions (session_token, is_kiosk, consent_given, customer_photo_url, status)
       VALUES ($1, true, true, $2, 'active')
       RETURNING id, session_token, status`,
      [kioskToken, testPhoto]
    );
    assert.equal(createRes.rows.length, 1);
    assert.equal(createRes.rows[0].status, 'active');

    // Purge session
    const purgeRes = await query(
      `UPDATE customer_tryon_sessions
       SET status = 'purged',
           customer_photo_url = NULL
       WHERE session_token = $1
       RETURNING id, customer_photo_url, status`,
      [kioskToken]
    );
    assert.equal(purgeRes.rows.length, 1);
    assert.equal(purgeRes.rows[0].status, 'purged');
    assert.equal(purgeRes.rows[0].customer_photo_url, null);
  });

  await t.test('5. Supplier Bulk Product Updates (Stock & Prices)', async () => {
    const productsRes = await query(
      `SELECT id, price, stock_status FROM products LIMIT 3`
    );
    assert.ok(productsRes.rows.length >= 2);
    const p1 = productsRes.rows[0];
    const p2 = productsRes.rows[1];

    // Bulk update stock to out_of_stock
    await query(
      `UPDATE products
       SET stock_status = 'out_of_stock', updated_at = NOW()
       WHERE id IN ($1, $2)`,
      [p1.id, p2.id]
    );

    const checkRes = await query(
      `SELECT id, stock_status FROM products WHERE id IN ($1, $2)`,
      [p1.id, p2.id]
    );
    assert.equal(checkRes.rows[0].stock_status, 'out_of_stock');
    assert.equal(checkRes.rows[1].stock_status, 'out_of_stock');

    // Reset back to in_stock
    await query(
      `UPDATE products
       SET stock_status = 'in_stock', updated_at = NOW()
       WHERE id IN ($1, $2)`,
      [p1.id, p2.id]
    );
  });

  await t.test('6. Supplier Notifications Flow', async () => {
    // Insert notification
    const insRes = await query(
      `INSERT INTO supplier_notifications (supplier_account_id, title, message, notification_type)
       VALUES ($1, 'Image Approved', 'Your saree high-resolution photograph has been verified.', 'approval')
       RETURNING id, is_read`,
      [testSupplierAccountId]
    );
    assert.equal(insRes.rows.length, 1);
    const notifId = insRes.rows[0].id;
    assert.equal(insRes.rows[0].is_read, false);

    // Mark as read
    const readRes = await query(
      `UPDATE supplier_notifications
       SET is_read = true
       WHERE id = $1 AND supplier_account_id = $2
       RETURNING is_read`,
      [notifId, testSupplierAccountId]
    );
    assert.equal(readRes.rows[0].is_read, true);
  });

  await t.test('7. Admin Real Database Statistics Verification', async () => {
    const pCounts = await query(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN is_active = true THEN 1 END)::int as active,
        COUNT(CASE WHEN approval_status = 'approved' THEN 1 END)::int as approved,
        COUNT(CASE WHEN approval_status = 'pending' THEN 1 END)::int as pending,
        COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END)::int as rejected,
        COUNT(CASE WHEN tryon_compatibility = 'needs_image_replacement' THEN 1 END)::int as needs_image
      FROM products
    `);

    const stats = pCounts.rows[0];
    assert.ok(stats.total > 0, 'Database should contain seeded products');
    assert.ok(stats.active > 0, 'Database should have active products');

    const sCounts = await query(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active
      FROM supplier_accounts
    `);
    assert.ok(sCounts.rows[0].total > 0, 'Database should have supplier accounts');
  });

  await t.test('8. Admin Audit Logs Logging & Retrieval', async () => {
    // Log an admin action
    await query(
      `INSERT INTO admin_audit_logs (admin_email, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['admin@vestra.com', 'approve_product', 'product', 46, JSON.stringify({ note: 'Verified 1024x1024px photography' }), '127.0.0.1']
    );

    const logRes = await query(
      `SELECT * FROM admin_audit_logs WHERE action = 'approve_product' ORDER BY created_at DESC LIMIT 1`
    );
    assert.equal(logRes.rows.length, 1);
    assert.equal(logRes.rows[0].admin_email, 'admin@vestra.com');
    assert.equal(String(logRes.rows[0].target_id), '46');
  });
});
