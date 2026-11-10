-- ==============================================================================
-- Migration 009: Multi-Source Fashion Catalogue Integration
-- Tables: catalogue_sources, supplier_accounts, external_product_mappings,
--         product_image_assets, catalogue_sync_logs
-- ==============================================================================

-- 1. Extend products table for multi-source tracking
ALTER TABLE products ADD COLUMN IF NOT EXISTS source VARCHAR(64) DEFAULT 'atelier';
ALTER TABLE products ADD COLUMN IF NOT EXISTS external_product_id VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_usage_permission VARCHAR(50) DEFAULT 'confirmed';

-- 2. Catalogue Sources (Marketplaces, APIs & Suppliers)
CREATE TABLE IF NOT EXISTS catalogue_sources (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  source_type VARCHAR(64) NOT NULL,
  auth_type VARCHAR(64) DEFAULT 'api_credentials',
  is_enabled BOOLEAN DEFAULT FALSE,
  status VARCHAR(64) DEFAULT 'unconfigured',
  credentials_configured BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}'::jsonb,
  products_imported INTEGER DEFAULT 0,
  products_rejected INTEGER DEFAULT 0,
  products_awaiting_review INTEGER DEFAULT 0,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(64),
  last_sync_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Sources
INSERT INTO catalogue_sources (slug, name, source_type, auth_type, is_enabled, status, credentials_configured, config, products_imported)
VALUES
  ('atelier', 'VESTRA Atelier Archive', 'internal_archive', 'none', TRUE, 'active', TRUE, '{"mode": "internal"}'::jsonb, 92),
  ('flipkart', 'Flipkart Affiliate API', 'affiliate_api', 'affiliate_token', FALSE, 'unconfigured', FALSE, '{"api_base": "https://affiliate-api.flipkart.net/affiliate/1.0"}'::jsonb, 0),
  ('myntra', 'Myntra Partner API', 'partner_api', 'partner_oauth', FALSE, 'pending_partner_approval', FALSE, '{"portal": "partner.myntra.com"}'::jsonb, 0),
  ('amazon', 'Amazon Creators API', 'creators_api', 'creators_keys', FALSE, 'unconfigured', FALSE, '{"api_base": "webservices.amazon.in", "region": "eu-west-1"}'::jsonb, 0),
  ('supplier_csv', 'Supplier Batch Import (CSV/Excel)', 'supplier_import', 'none', TRUE, 'active', TRUE, '{"accepted_formats": ["csv", "xlsx"]}'::jsonb, 0),
  ('manual', 'Manual Boutique Entry', 'manual_entry', 'none', TRUE, 'active', TRUE, '{}'::jsonb, 0)
ON CONFLICT (slug) DO NOTHING;

-- 3. Supplier Accounts (Clothing Manufacturers, Local Wholesalers, Boutiques)
CREATE TABLE IF NOT EXISTS supplier_accounts (
  id SERIAL PRIMARY KEY,
  supplier_code VARCHAR(64) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(120),
  email VARCHAR(255),
  phone VARCHAR(64),
  supplier_type VARCHAR(64) DEFAULT 'wholesaler',
  city VARCHAR(100),
  country VARCHAR(64) DEFAULT 'India',
  default_currency VARCHAR(8) DEFAULT 'INR',
  image_usage_terms_agreed BOOLEAN DEFAULT TRUE,
  status VARCHAR(32) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed sample certified local suppliers and manufacturers
INSERT INTO supplier_accounts (supplier_code, company_name, contact_person, email, phone, supplier_type, city, country, notes)
VALUES
  ('SUP-TEX-001', 'Surat Handloom & Silk Mills', 'Rajesh K. Mehta', 'partners@surathandloom.com', '+91 98250 11223', 'manufacturer', 'Surat', 'India', 'Certified pure silk and viscose fabric manufacturer.'),
  ('SUP-WEAVE-002', 'Varanasi Master Weavers Co-op', 'Anand Swarup Verma', 'order@varanasiweaves.org', '+91 94152 44556', 'artisan_cooperative', 'Varanasi', 'India', 'Master weaver group for Banarasi antique zari textiles.'),
  ('SUP-BLR-003', 'Aura Luxury Apparel Wholesalers', 'Priya Sundaram', 'b2b@aurafashion.in', '+91 80 4122 8899', 'wholesaler', 'Bengaluru', 'India', 'Ready-to-wear Western and Indo-Western attire distributor.')
ON CONFLICT (supplier_code) DO NOTHING;

-- 4. External Product Mappings (Prevents duplicates across sources)
CREATE TABLE IF NOT EXISTS external_product_mappings (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  source VARCHAR(64) NOT NULL,
  external_product_id VARCHAR(255) NOT NULL,
  source_product_url TEXT,
  affiliate_url TEXT,
  source_sku VARCHAR(120),
  supplier_account_id INTEGER REFERENCES supplier_accounts(id) ON DELETE SET NULL,
  raw_payload JSONB,
  sync_hash VARCHAR(64),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_source_external_id UNIQUE (source, external_product_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_mappings_source_id ON external_product_mappings (source, external_product_id);
CREATE INDEX IF NOT EXISTS idx_ext_mappings_prod_id ON external_product_mappings (product_id);

-- 5. Product Image Assets (Multi-image tracking, resolution & usage rights)
CREATE TABLE IF NOT EXISTS product_image_assets (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  local_path TEXT,
  image_type VARCHAR(32) DEFAULT 'primary',
  width INTEGER,
  height INTEGER,
  format VARCHAR(16),
  file_size_bytes INTEGER,
  image_status VARCHAR(50) DEFAULT 'IMAGE_VALID',
  usage_permission VARCHAR(50) DEFAULT 'confirmed',
  is_primary BOOLEAN DEFAULT FALSE,
  is_tryon_ready BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_img_assets_prod_id ON product_image_assets (product_id);

-- 6. Catalogue Sync Logs (Full transparency & audit of sync batches)
CREATE TABLE IF NOT EXISTS catalogue_sync_logs (
  id SERIAL PRIMARY KEY,
  source VARCHAR(64) NOT NULL,
  batch_id VARCHAR(100),
  sync_type VARCHAR(64) DEFAULT 'import',
  status VARCHAR(32) DEFAULT 'completed',
  items_total INTEGER DEFAULT 0,
  items_imported INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_rejected INTEGER DEFAULT 0,
  items_pending_review INTEGER DEFAULT 0,
  error_summary TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

