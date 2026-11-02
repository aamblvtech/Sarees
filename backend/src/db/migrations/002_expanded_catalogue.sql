-- ===================================================================
-- VESTRA AI Virtual Try-On Platform - Database Migration 002
-- Purpose: Indexes for expanded subcategories, garment taxonomy, and try-on compatibility filters.
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products (subcategory);
CREATE INDEX IF NOT EXISTS idx_products_tryon_compatibility ON products (tryon_compatibility);
CREATE INDEX IF NOT EXISTS idx_products_gender_garment_type ON products (gender, garment_type);
