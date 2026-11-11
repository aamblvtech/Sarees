-- ==============================================================================
-- Migration 011: VESTRA Complete Platform Enhancement
-- Tables: customer_wishlists, customer_tryon_sessions, supplier_notifications,
--         admin_audit_logs
-- Extensions to: products (tryon_count, favorite_count)
-- ==============================================================================

-- 1. Extend products table with engagement tracking
ALTER TABLE products ADD COLUMN IF NOT EXISTS tryon_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0;

-- 2. Customer Wishlists (session-isolated and account-compatible)
CREATE TABLE IF NOT EXISTS customer_wishlists (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(128) NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_session_product UNIQUE (session_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_session ON customer_wishlists(session_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product ON customer_wishlists(product_id);

-- 3. Customer Try-On & Mall Kiosk Sessions
CREATE TABLE IF NOT EXISTS customer_tryon_sessions (
  id SERIAL PRIMARY KEY,
  session_token VARCHAR(128) NOT NULL UNIQUE,
  is_kiosk BOOLEAN DEFAULT FALSE,
  consent_given BOOLEAN DEFAULT FALSE,
  customer_photo_url TEXT,
  customer_image_id VARCHAR(256),
  device_type VARCHAR(64) DEFAULT 'desktop',
  status VARCHAR(32) DEFAULT 'active', -- 'active', 'completed', 'expired', 'purged'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '2 hours')
);

CREATE INDEX IF NOT EXISTS idx_cust_sessions_token ON customer_tryon_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_cust_sessions_status ON customer_tryon_sessions(status);

-- 4. Supplier Notifications & Review Alerts
CREATE TABLE IF NOT EXISTS supplier_notifications (
  id SERIAL PRIMARY KEY,
  supplier_account_id INTEGER NOT NULL REFERENCES supplier_accounts(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) DEFAULT 'info', -- 'approval', 'rejection', 'needs_image', 'inventory', 'info'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_notif_acc ON supplier_notifications(supplier_account_id);

-- 5. Admin Security & Moderation Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(64),
  target_id VARCHAR(128),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at);
