-- ==============================================================================
-- AI Virtual Dressing Room - PostgreSQL Production Schema
-- ==============================================================================

-- 1. Catalog Items Table
CREATE TABLE IF NOT EXISTS catalog_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    department VARCHAR(50) NOT NULL DEFAULT 'Indian',
    gender VARCHAR(20) NOT NULL DEFAULT 'women',
    clothing_type VARCHAR(50) NOT NULL DEFAULT 'one-piece',
    fabric VARCHAR(100),
    color VARCHAR(50),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    image_filename VARCHAR(255) NOT NULL,
    description TEXT,
    occasion VARCHAR(100),
    stock_status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_catalog_category ON catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_catalog_department ON catalog_items(department);
CREATE INDEX IF NOT EXISTS idx_catalog_is_active ON catalog_items(is_active);

-- 2. Try-On Jobs Table
CREATE TABLE IF NOT EXISTS tryon_jobs (
    id VARCHAR(64) PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    progress INTEGER NOT NULL DEFAULT 0,
    person_image_path VARCHAR(255) NOT NULL,
    garment_id INTEGER REFERENCES catalog_items(id) ON DELETE SET NULL,
    garment_image_path VARCHAR(255) NOT NULL,
    garment_name VARCHAR(255),
    clothing_type VARCHAR(50) NOT NULL DEFAULT 'one-piece',
    prompt TEXT,
    provider VARCHAR(50) NOT NULL DEFAULT 'idm-vton',
    result_url VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tryon_jobs_status ON tryon_jobs(status);
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_created_at ON tryon_jobs(created_at);
