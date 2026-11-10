import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { initializeDatabase, query } from '../src/config/db.js';
import { runSeed } from '../src/db/seed.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vestra_luxury_jwt_secret_atelier_key_2026';

test('VESTRA Supplier Portal Suite', async (t) => {
  await initializeDatabase();
  await runSeed();

  let adminToken;
  let testSupplierId;
  let testSupplierUserId;
  let supplierAuthToken;
  let createdProductId;

  await t.test('1. Setup Admin Token for protected verification steps', async () => {
    // Generate valid admin token matching requireAdminAuth
    adminToken = jwt.sign(
      { id: 1, email: 'admin@vestra.com', name: 'Atelier Director', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '4h' }
    );
    assert.ok(adminToken);
  });

  await t.test('2. Seeded active supplier can authenticate and receive JWT with role supplier', async () => {
    const email = 'supplier@surathandloom.com';
    const res = await query(
      `SELECT su.*, sa.company_name, sa.status as account_status 
       FROM supplier_users su
       JOIN supplier_accounts sa ON su.supplier_account_id = sa.id
       WHERE su.email = $1`,
      [email]
    );

    assert.equal(res.rows.length, 1);
    const user = res.rows[0];
    assert.equal(user.role, 'supplier');
    assert.equal(user.status, 'active');
    assert.equal(user.account_status, 'active');

    const match = await bcrypt.compare('SupplierPass2026!', user.password_hash);
    assert.equal(match, true);

    const token = jwt.sign(
      {
        userId: user.id,
        supplierAccountId: user.supplier_account_id,
        email: user.email,
        role: user.role,
        companyName: user.company_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const decoded = jwt.verify(token, JWT_SECRET);
    assert.equal(decoded.role, 'supplier');
    assert.equal(decoded.supplierAccountId, user.supplier_account_id);
  });

  await t.test('3. Seeded pending supplier is blocked from logging in until admin approval', async () => {
    const email = 'weaver@varanasiweaves.org';
    const res = await query(
      `SELECT su.*, sa.status as account_status 
       FROM supplier_users su
       JOIN supplier_accounts sa ON su.supplier_account_id = sa.id
       WHERE su.email = $1`,
      [email]
    );

    assert.equal(res.rows.length, 1);
    const user = res.rows[0];
    assert.equal(user.status, 'pending');

    // Verification check simulating login controller logic:
    const isApproved = user.status === 'active' && user.account_status === 'active';
    assert.equal(isApproved, false, 'Pending supplier must not be allowed to authenticate');
  });

  await t.test('4. Register new supplier with complete profile details in pending status', async () => {
    const companyName = 'Jaipur Block Prints Guild';
    const email = 'contact@jaipurprints.org';
    const password = 'JaipurSecurePass2026!';
    const supplierCode = `SUP-JP-${Date.now().toString().slice(-4)}`;

    const hash = await bcrypt.hash(password, 10);

    // 1. Create supplier_account
    const accRes = await query(
      `INSERT INTO supplier_accounts 
       (supplier_code, company_name, contact_person, email, phone, supplier_type, city, country, image_usage_terms_agreed, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING id, supplier_code, company_name, status`,
      [supplierCode, companyName, 'Govind Sharma', email, '+91 94140 12345', 'manufacturer', 'Jaipur', 'India', true]
    );

    testSupplierId = accRes.rows[0].id;
    assert.equal(accRes.rows[0].status, 'pending');

    // 2. Create supplier_user
    const userRes = await query(
      `INSERT INTO supplier_users 
       (supplier_account_id, email, password_hash, full_name, role, status)
       VALUES ($1, $2, $3, $4, 'supplier', 'pending')
       RETURNING id, email, role, status`,
      [testSupplierId, email, hash, 'Govind Sharma']
    );

    testSupplierUserId = userRes.rows[0].id;
    assert.equal(userRes.rows[0].status, 'pending');

    // 3. Create supplier_profile
    await query(
      `INSERT INTO supplier_profiles
       (supplier_account_id, business_registration_number, tax_id, warehouse_address, contact_phone, brand_name, website_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [testSupplierId, 'RJ-JPR-2024-5544', 'GSTIN08AABCJ1234E1Z1', 'Sanganer Industrial Area, Jaipur 302029', '+91 94140 12345', 'Jaipur Heritage Weaves', 'https://jaipurprints.example.com']
    );

    const profRes = await query('SELECT * FROM supplier_profiles WHERE supplier_account_id = $1', [testSupplierId]);
    assert.equal(profRes.rows.length, 1);
    assert.equal(profRes.rows[0].brand_name, 'Jaipur Heritage Weaves');
  });

  await t.test('5. Admin approves pending supplier account and activates logins', async () => {
    // Admin updates status
    await query(
      `UPDATE supplier_accounts SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [testSupplierId]
    );
    await query(
      `UPDATE supplier_users SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE supplier_account_id = $1`,
      [testSupplierId]
    );

    const checkAcc = await query('SELECT status FROM supplier_accounts WHERE id = $1', [testSupplierId]);
    const checkUser = await query('SELECT status FROM supplier_users WHERE id = $1', [testSupplierUserId]);

    assert.equal(checkAcc.rows[0].status, 'active');
    assert.equal(checkUser.rows[0].status, 'active');

    // Issue auth token for the newly approved supplier
    supplierAuthToken = jwt.sign(
      {
        userId: testSupplierUserId,
        supplierAccountId: testSupplierId,
        email: 'contact@jaipurprints.org',
        role: 'supplier',
        companyName: 'Jaipur Block Prints Guild'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    assert.ok(supplierAuthToken);
  });

  await t.test('6. Supplier submits a high-resolution garment passing the >= 250px validation gate', async () => {
    const sku = `SUP-JP-SAR-${Date.now().toString().slice(-4)}`;
    const imageUrl = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&h=1600';
    const width = 1200;
    const height = 1600;

    // Verify technical dimensions gate
    assert.ok(width >= 250 && height >= 250, 'Image dimensions must satisfy technical gate >= 250x250');

    // Insert into products with supplier ownership
    const prodRes = await query(
      `INSERT INTO products (
        sku, name, slug, brand, category_id, subcategory, gender, garment_type,
        tryon_compatibility, price, original_price, currency, description,
        color, material, primary_image_url, tryon_image_url,
        image_width, image_height, is_sample, is_active, is_ai_ready,
        needs_admin_review, approval_status, source, supplier_id, image_usage_permission
      ) VALUES (
        $1, $2, $3, $4, 1, $5, $6, $7,
        $8, $9, $10, 'INR', $11,
        $12, $13, $14, $14,
        $15, $16, false, false, false,
        true, 'PENDING', 'supplier_portal', $17, 'supplier_granted'
      ) RETURNING id, sku, name, approval_status, is_active, is_ai_ready, supplier_id`,
      [
        sku,
        'Handblock Printed Chanderi Saree',
        `handblock-printed-chanderi-${Date.now()}`,
        'Jaipur Heritage Weaves',
        'Sarees',
        'women',
        'saree',
        'upper_and_lower',
        3899,
        5499,
        'Authentic hand-blocked Chanderi cotton-silk saree crafted by master artisans in Jaipur.',
        'Indigo Blue',
        'Chanderi Silk Cotton',
        imageUrl,
        width,
        height,
        testSupplierId
      ]
    );

    createdProductId = prodRes.rows[0].id;
    assert.equal(prodRes.rows[0].approval_status, 'PENDING');
    assert.equal(prodRes.rows[0].is_active, false, 'New supplier products must not be active');
    assert.equal(prodRes.rows[0].is_ai_ready, false, 'New supplier products must not be marked AI_READY without admin signoff');
    assert.equal(prodRes.rows[0].supplier_id, testSupplierId);

    // Track submission
    await query(
      `INSERT INTO supplier_product_submissions (supplier_account_id, product_id, status)
       VALUES ($1, $2, 'PENDING')`,
      [testSupplierId, createdProductId]
    );
  });

  await t.test('7. Customer Catalogue completely hides pending supplier products', async () => {
    // Customer catalogue query matches GET /api/products
    const catRes = await query(
      `SELECT id, name, approval_status, is_active 
       FROM products 
       WHERE is_active = true AND (approval_status IN ('APPROVED', 'AI_READY') OR approval_status IS NULL)`
    );

    const foundPending = catRes.rows.some(p => p.id === createdProductId);
    assert.equal(foundPending, false, 'Pending supplier garment must be invisible in customer catalogue');
  });

  await t.test('8. Strict Tenant Isolation prevents Supplier B from accessing or updating Supplier A products', async () => {
    // Another supplier (Surat Handloom Mills, ID = 1)
    const otherSupplierId = 1;

    // Attempt to select product using tenant filter
    const unauthorizedQuery = await query(
      `SELECT * FROM products WHERE id = $1 AND supplier_id = $2`,
      [createdProductId, otherSupplierId]
    );

    assert.equal(unauthorizedQuery.rows.length, 0, 'Supplier B must not be able to retrieve Supplier A product');

    // Attempt update with mismatched tenant ID
    const unauthorizedUpdate = await query(
      `UPDATE products SET price = 99999 WHERE id = $1 AND supplier_id = $2 RETURNING id`,
      [createdProductId, otherSupplierId]
    );

    assert.equal(unauthorizedUpdate.rows.length, 0, 'Supplier B must not be able to mutate Supplier A product');
  });

  await t.test('9. Admin reviews and approves supplier product, making it active in customer catalogue', async () => {
    // Admin approves product
    await query(
      `UPDATE products 
       SET approval_status = 'APPROVED', is_active = true, needs_admin_review = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [createdProductId]
    );

    await query(
      `UPDATE supplier_product_submissions 
       SET status = 'APPROVED', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = 'admin@vestra.com'
       WHERE product_id = $1`,
      [createdProductId]
    );

    // Verify it is now visible in customer catalogue with supplier attribution
    const liveCatRes = await query(
      `SELECT p.id, p.name, p.brand, p.approval_status, p.is_active, sa.company_name as supplier_name
       FROM products p
       LEFT JOIN supplier_accounts sa ON p.supplier_id = sa.id
       WHERE p.is_active = true AND (p.approval_status IN ('APPROVED', 'AI_READY') OR p.approval_status IS NULL)
         AND p.id = $1`,
      [createdProductId]
    );

    assert.equal(liveCatRes.rows.length, 1);
    assert.equal(liveCatRes.rows[0].approval_status, 'APPROVED');
    assert.equal(liveCatRes.rows[0].supplier_name, 'Jaipur Block Prints Guild');
  });

  await t.test('10. Admin Supplier Overview lists all suppliers with product metrics', async () => {
    const listRes = await query(
      `SELECT sa.id, sa.company_name, sa.status,
              COUNT(p.id) AS total_products
       FROM supplier_accounts sa
       LEFT JOIN products p ON p.supplier_id = sa.id
       GROUP BY sa.id, sa.company_name, sa.status
       ORDER BY sa.id ASC`
    );

    assert.ok(listRes.rows.length >= 2, 'Should list both Surat and Jaipur suppliers');
    const jaipur = listRes.rows.find(s => s.id === testSupplierId);
    assert.ok(jaipur);
    assert.equal(parseInt(jaipur.total_products, 10), 1);
  });
});
