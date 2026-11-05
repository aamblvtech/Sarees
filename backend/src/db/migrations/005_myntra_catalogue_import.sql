-- Migration 005: Myntra Product Catalogue Import & Multi-Stage Approval Workflow

-- 1. Add Myntra reference and approval workflow columns
ALTER TABLE products
ADD COLUMN IF NOT EXISTS myntra_url VARCHAR(1000),
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'APPROVED',
ADD COLUMN IF NOT EXISTS permission_status VARCHAR(50) DEFAULT 'authorized',
ADD COLUMN IF NOT EXISTS permission_notes TEXT,
ADD COLUMN IF NOT EXISTS front_image_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS back_image_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS side_image_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS model_image_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS import_source VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(100);

-- 2. Populate approval_status for existing products safely
UPDATE products
SET approval_status = CASE 
  WHEN tryon_compatibility = 'supported' THEN 'AI_READY'
  WHEN tryon_compatibility = 'needs_image_replacement' THEN 'NEEDS_IMAGE'
  ELSE 'APPROVED'
END
WHERE approval_status IS NULL OR approval_status = 'APPROVED';

-- 3. Create index for fast duplicate checking by Myntra reference URL
CREATE INDEX IF NOT EXISTS idx_products_myntra_url ON products (myntra_url);
