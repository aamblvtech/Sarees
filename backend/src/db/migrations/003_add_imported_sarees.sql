-- ===================================================================
-- VESTRA AI Virtual Try-On Platform - Database Migration 003
-- Purpose: Schema support and indexing for imported catalogue saree products,
--          admin review flags, colour attributes, and discount percentages.
-- ===================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS color VARCHAR(64);
ALTER TABLE products ADD COLUMN IF NOT EXISTS needs_admin_review BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2);

CREATE INDEX IF NOT EXISTS idx_products_needs_admin_review ON products (needs_admin_review);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);
CREATE INDEX IF NOT EXISTS idx_products_color ON products (color);
