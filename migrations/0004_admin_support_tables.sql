-- ADMIN DASHBOARD SUPPORT TABLES
-- Tables for real-time admin monitoring and customer support

-- Support messages table for Enterprise customer support
CREATE TABLE IF NOT EXISTS support_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'feature_request', 'bug_report')),
  
  -- Customer context
  customer_tier TEXT,
  contact_method TEXT DEFAULT 'dashboard' CHECK (contact_method IN ('dashboard', 'email', 'phone')),
  
  -- Admin response tracking
  admin_responded BOOLEAN DEFAULT FALSE,
  admin_response TEXT,
  response_time_minutes INTEGER,
  resolved_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Payment transactions table (if not exists) for real sales tracking
CREATE TABLE IF NOT EXISTS payment_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  
  -- Stripe transaction data
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  
  -- Payment details
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'usd',
  payment_type TEXT NOT NULL CHECK (payment_type IN ('setup_fee', 'monthly_subscription', 'one_time')),
  
  -- Transaction status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  
  -- Subscription context
  subscription_tier TEXT,
  billing_period_start DATETIME,
  billing_period_end DATETIME,
  
  -- Tracking
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Audit logs table (enhanced for admin monitoring)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Event details
  action TEXT NOT NULL,
  details TEXT, -- JSON object with event details
  user_type TEXT DEFAULT 'visitor' CHECK (user_type IN ('visitor', 'customer', 'admin')),
  
  -- User context
  user_id INTEGER, -- customer_id if applicable
  user_email TEXT,
  customer_tier TEXT,
  
  -- Request tracking
  ip_address TEXT,
  user_agent TEXT,
  request_path TEXT,
  request_method TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  
  -- Geographic data
  country TEXT,
  region TEXT,
  city TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Security events table for monitoring threats
CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Event classification
  event_type TEXT NOT NULL, -- 'login_attempt', 'rate_limit', 'suspicious_activity', etc.
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Event details
  description TEXT NOT NULL,
  details TEXT, -- JSON object
  
  -- Source tracking
  ip_address TEXT,
  user_agent TEXT,
  user_id INTEGER,
  
  -- Response tracking
  action_taken TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_messages_customer ON support_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_priority ON support_messages(priority);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer ON payment_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe ON payment_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- Insert some sample data for testing (will show as $0 until real sales)
-- This ensures the admin dashboard shows correct structure with zero values
INSERT OR IGNORE INTO audit_logs (action, details, user_type, ip_address, request_path, created_at) VALUES
('platform_init', '{"message": "Platform initialized", "action": "admin_setup"}', 'admin', '127.0.0.1', '/admin', datetime('now'));