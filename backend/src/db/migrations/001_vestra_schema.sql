-- ===================================================================
-- VESTRA AI Virtual Try-On Platform - Database Migration 001
-- Tables: admins, categories, products, product_images, tryon_sessions, tryon_jobs, tryon_results
-- ===================================================================

-- 1. Admins Table (for protected Admin Dashboard access)
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(64) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  brand VARCHAR(120) DEFAULT 'VESTRA',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  subcategory VARCHAR(64),
  gender VARCHAR(32) DEFAULT 'unisex',
  garment_type VARCHAR(64) DEFAULT 'upper_body',
  tryon_compatibility VARCHAR(64) DEFAULT 'supported',
  stock_status VARCHAR(32) DEFAULT 'in_stock',
  price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  currency VARCHAR(8) DEFAULT 'USD',
  description TEXT NOT NULL,
  material TEXT,
  fit TEXT,
  care_instructions TEXT,
  sizes JSONB DEFAULT '["XS", "S", "M", "L", "XL"]'::jsonb,
  primary_image_url TEXT,
  tryon_image_url TEXT,
  is_sample BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  color VARCHAR(64),
  needs_admin_review BOOLEAN DEFAULT FALSE,
  discount_percent NUMERIC(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist for existing tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(64);
ALTER TABLE products ADD COLUMN IF NOT EXISTS gender VARCHAR(32) DEFAULT 'unisex';
ALTER TABLE products ADD COLUMN IF NOT EXISTS garment_type VARCHAR(64) DEFAULT 'upper_body';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tryon_compatibility VARCHAR(64) DEFAULT 'supported';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status VARCHAR(32) DEFAULT 'in_stock';
ALTER TABLE products ADD COLUMN IF NOT EXISTS color VARCHAR(64);
ALTER TABLE products ADD COLUMN IF NOT EXISTS needs_admin_review BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2);

-- 4. Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Try-on Sessions Table
CREATE TABLE IF NOT EXISTS tryon_sessions (
  id SERIAL PRIMARY KEY,
  session_token VARCHAR(128) NOT NULL UNIQUE,
  user_photo_url TEXT,
  silhouette_label VARCHAR(120),
  fit_preference VARCHAR(50) DEFAULT 'tailored',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 6. Try-on Jobs Table
CREATE TABLE IF NOT EXISTS tryon_jobs (
  id SERIAL PRIMARY KEY,
  job_uuid VARCHAR(64) NOT NULL UNIQUE,
  session_id INTEGER REFERENCES tryon_sessions(id) ON DELETE SET NULL,
  customer_session_id VARCHAR(128),
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_title VARCHAR(255),
  product_external_id VARCHAR(128),
  product_image_hash VARCHAR(64),
  custom_garment_url TEXT,
  custom_garment_name VARCHAR(255),
  user_photo_url TEXT NOT NULL,
  garment_image_url TEXT NOT NULL,
  garment_category VARCHAR(64) DEFAULT 'upper_body',
  selected_size VARCHAR(16) DEFAULT 'M',
  fit_preference VARCHAR(32) DEFAULT 'tailored',
  credits_used INTEGER DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  provider VARCHAR(64) NOT NULL DEFAULT 'genlook',
  provider_job_id VARCHAR(128),
  customer_image_id VARCHAR(256),
  error_code VARCHAR(64),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS customer_session_id VARCHAR(128);
ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS product_title VARCHAR(255);
ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS product_external_id VARCHAR(128);
ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS product_image_hash VARCHAR(64);
ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS fit_preference VARCHAR(32) DEFAULT 'tailored';
ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0;

-- 7. Try-on Results Table
CREATE TABLE IF NOT EXISTS tryon_results (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL UNIQUE REFERENCES tryon_jobs(id) ON DELETE CASCADE,
  result_image_url TEXT NOT NULL,
  composite_details JSONB,
  fit_score NUMERIC(4, 2) DEFAULT 0.95,
  is_simulation BOOLEAN DEFAULT FALSE,
  is_mock BOOLEAN DEFAULT FALSE,
  disclaimer_acknowledged BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. QR Mobile Upload Sessions Table
CREATE TABLE IF NOT EXISTS qr_upload_sessions (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, uploaded, consumed, expired
  photo_url TEXT,
  photo_filename VARCHAR(255),
  consent_given BOOLEAN DEFAULT FALSE,
  ip_address VARCHAR(64),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  uploaded_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for optimal querying
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_uuid ON tryon_jobs(job_uuid);
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_status ON tryon_jobs(status);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_token ON qr_upload_sessions(token);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_status ON qr_upload_sessions(status);
