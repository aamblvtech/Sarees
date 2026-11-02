-- SAJEE Virtual Try-On Platform - Database Schema
-- Standard PostgreSQL DDL with strict types, constraints, indexes, and transactions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & ROLES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('customer', 'staff', 'admin')),
    phone VARCHAR(50),
    consent_data_saving BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. STORES & RETAIL OUTLETS
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. PHYSICAL KIOSKS
CREATE TABLE IF NOT EXISTS kiosks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    identifier VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    camera_config JSONB DEFAULT '{"resolution": "1080p", "fps": 30, "facing": "user"}'::jsonb,
    ip_address VARCHAR(100),
    last_heartbeat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. SAREE PRODUCTS
CREATE TABLE IF NOT EXISTS saree_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    fabric VARCHAR(100) NOT NULL,
    color VARCHAR(100) NOT NULL,
    occasion VARCHAR(100) NOT NULL,
    border_type VARCHAR(150),
    pallu_details TEXT,
    blouse_piece BOOLEAN DEFAULT TRUE,
    blouse_details TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 1 CHECK (stock_quantity >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold_out')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. PRODUCT IMAGES
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES saree_products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type VARCHAR(50) NOT NULL DEFAULT 'folded' CHECK (image_type IN ('folded', 'draped', 'pallu', 'border', 'detail')),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. SAREE COMPONENT LABELS / ANNOTATIONS
CREATE TABLE IF NOT EXISTS saree_component_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES saree_products(id) ON DELETE CASCADE,
    image_id UUID REFERENCES product_images(id) ON DELETE SET NULL,
    body_bbox JSONB, -- coordinates: { x, y, width, height, label }
    pallu_bbox JSONB,
    main_border_bbox JSONB,
    secondary_border_bbox JSONB,
    motifs_bbox JSONB,
    blouse_piece_bbox JSONB,
    detection_method VARCHAR(50) DEFAULT 'manual' CHECK (detection_method IN ('manual', 'ai_assisted', 'ai_auto')),
    is_verified BOOLEAN DEFAULT FALSE,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. CUSTOMER SESSIONS (QR-LINKED KIOSK / MOBILE SESSIONS)
CREATE TABLE IF NOT EXISTS customer_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    kiosk_id UUID REFERENCES kiosks(id) ON DELETE SET NULL,
    session_token_hash VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'completed')),
    customer_consent BOOLEAN DEFAULT FALSE,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(50),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. TRY-ON COLLECTIONS
CREATE TABLE IF NOT EXISTS try_on_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES customer_sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'Current Draping Selection',
    created_by_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. COLLECTION ITEMS
CREATE TABLE IF NOT EXISTS collection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES try_on_collections(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES saree_products(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, product_id)
);

-- 10. UPLOADED CUSTOMER PHOTOS
CREATE TABLE IF NOT EXISTS uploaded_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES customer_sessions(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    consent_recorded BOOLEAN NOT NULL DEFAULT FALSE,
    is_purged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. TRY-ON JOBS
CREATE TABLE IF NOT EXISTS try_on_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES customer_sessions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES saree_products(id) ON DELETE CASCADE,
    customer_photo_id UUID REFERENCES uploaded_photos(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    provider VARCHAR(50) NOT NULL DEFAULT 'mock' CHECK (provider IN ('idm_vton', 'mock', 'replicate', 'replicate_idm_vton', 'cloud')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. TRY-ON RESULTS
CREATE TABLE IF NOT EXISTS try_on_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES try_on_jobs(id) ON DELETE CASCADE,
    result_image_url TEXT NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    is_simulation BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    ip_address VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- PERFORMANCE & LOOKUP INDEXES
CREATE INDEX IF NOT EXISTS idx_saree_products_sku ON saree_products(sku);
CREATE INDEX IF NOT EXISTS idx_saree_products_fabric ON saree_products(fabric);
CREATE INDEX IF NOT EXISTS idx_saree_products_occasion ON saree_products(occasion);
CREATE INDEX IF NOT EXISTS idx_saree_products_price ON saree_products(price);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_token_hash ON customer_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_status ON customer_sessions(status);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_try_on_jobs_session ON try_on_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_try_on_jobs_status ON try_on_jobs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
