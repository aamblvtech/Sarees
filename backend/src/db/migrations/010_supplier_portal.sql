-- ==============================================================================
-- Migration 010: VESTRA Supplier Portal
-- Tables: supplier_users, supplier_profiles, supplier_product_submissions,
--         supplier_activity_logs
-- ==============================================================================

-- 0. Extend baseline tables
ALTER TABLE supplier_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS colour VARCHAR(64);
ALTER TABLE products ADD COLUMN IF NOT EXISTS fabric VARCHAR(64);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_ai_ready BOOLEAN DEFAULT FALSE;

-- 1. Supplier User Authentication & RBAC
CREATE TABLE IF NOT EXISTS supplier_users (
  id SERIAL PRIMARY KEY,
  supplier_account_id INTEGER NOT NULL REFERENCES supplier_accounts(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150),
  role VARCHAR(50) DEFAULT 'supplier',
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'rejected'
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_users_email ON supplier_users(email);
CREATE INDEX IF NOT EXISTS idx_supplier_users_acc_id ON supplier_users(supplier_account_id);

-- 2. Extended Supplier Profiles
CREATE TABLE IF NOT EXISTS supplier_profiles (
  id SERIAL PRIMARY KEY,
  supplier_account_id INTEGER NOT NULL UNIQUE REFERENCES supplier_accounts(id) ON DELETE CASCADE,
  business_registration_number VARCHAR(100),
  tax_id VARCHAR(100),
  bank_account_details JSONB DEFAULT '{}',
  warehouse_address TEXT,
  contact_phone VARCHAR(64),
  brand_name VARCHAR(150),
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Supplier Product Submissions Tracking
CREATE TABLE IF NOT EXISTS supplier_product_submissions (
  id SERIAL PRIMARY KEY,
  supplier_account_id INTEGER NOT NULL REFERENCES supplier_accounts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  submission_batch VARCHAR(100),
  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'NEEDS_IMAGE', 'AI_READY'
  admin_feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by VARCHAR(150)
);

CREATE INDEX IF NOT EXISTS idx_subm_acc_id ON supplier_product_submissions(supplier_account_id);
CREATE INDEX IF NOT EXISTS idx_subm_prod_id ON supplier_product_submissions(product_id);

-- 4. Supplier Activity & Audit Logs
CREATE TABLE IF NOT EXISTS supplier_activity_logs (
  id SERIAL PRIMARY KEY,
  supplier_account_id INTEGER NOT NULL REFERENCES supplier_accounts(id) ON DELETE CASCADE,
  supplier_user_id INTEGER REFERENCES supplier_users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_act_acc_id ON supplier_activity_logs(supplier_account_id);

-- 5. Seed Sample Verified & Pending Supplier Accounts
-- Active account: supplier@surathandloom.com / SupplierPass2026!
INSERT INTO supplier_users (supplier_account_id, email, password_hash, full_name, role, status)
SELECT id, 'supplier@surathandloom.com', '$2a$10$5kMWenEHeOTZjnB7pB0u3uD3f6RhmWgMrK69hcC1QARiNqiOhqhVe', 'Rajesh K. Mehta', 'supplier', 'active'
FROM supplier_accounts
WHERE supplier_code = 'SUP-TEX-001'
ON CONFLICT (email) DO NOTHING;

INSERT INTO supplier_profiles (supplier_account_id, business_registration_number, tax_id, warehouse_address, contact_phone, brand_name)
SELECT id, 'GJ-SRT-2024-99881', 'GSTIN24AAACS1122D1Z4', 'Ring Road Textile Market, Surat, Gujarat 395002', '+91 98250 11223', 'Surat Handloom Mills'
FROM supplier_accounts
WHERE supplier_code = 'SUP-TEX-001'
ON CONFLICT (supplier_account_id) DO NOTHING;

-- Pending account: weaver@varanasiweaves.org / WeaverPass2026!
INSERT INTO supplier_users (supplier_account_id, email, password_hash, full_name, role, status)
SELECT id, 'weaver@varanasiweaves.org', '$2a$10$kXJXTAOMzSidC35AbXkQVez2m0fXM/daIMU.AN5m/AgNeCq8pxaVq', 'Anand Swarup Verma', 'supplier', 'pending'
FROM supplier_accounts
WHERE supplier_code = 'SUP-WEAVE-002'
ON CONFLICT (email) DO NOTHING;

INSERT INTO supplier_profiles (supplier_account_id, business_registration_number, tax_id, warehouse_address, contact_phone, brand_name)
SELECT id, 'UP-VNS-2023-44112', 'GSTIN09AABCV5544E1Z8', 'Chowk Handloom Cluster, Varanasi, Uttar Pradesh 221001', '+91 94152 44556', 'Varanasi Master Weavers'
FROM supplier_accounts
WHERE supplier_code = 'SUP-WEAVE-002'
ON CONFLICT (supplier_account_id) DO NOTHING;
