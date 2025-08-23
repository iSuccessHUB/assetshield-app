-- Security Enhancements Migration
-- Adds tables and columns for enhanced security monitoring and compliance

-- Security events table for monitoring suspicious activities
CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL, -- login_attempt, password_change, suspicious_activity, rate_limit_exceeded
  user_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  event_data TEXT, -- JSON with specific event details
  risk_level TEXT DEFAULT 'low', -- low, medium, high, critical
  action_taken TEXT, -- blocked, logged, notified, investigated
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Failed login attempts tracking
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  blocked_until DATETIME,
  
  UNIQUE(email, ip_address)
);

-- Session management table
CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  revoked_reason TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Data encryption keys table (for field-level encryption)
CREATE TABLE IF NOT EXISTS encryption_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_id TEXT UNIQUE NOT NULL,
  encrypted_key TEXT NOT NULL, -- Encrypted with master key
  algorithm TEXT DEFAULT 'AES-256-GCM',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  rotated_at DATETIME,
  status TEXT DEFAULT 'active' -- active, rotated, revoked
);

-- Sensitive data audit table
CREATE TABLE IF NOT EXISTS data_access_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  table_name TEXT NOT NULL,
  record_id INTEGER,
  operation TEXT NOT NULL, -- SELECT, INSERT, UPDATE, DELETE
  sensitive_fields TEXT, -- JSON array of accessed sensitive fields
  access_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Password history table (prevent password reuse)
CREATE TABLE IF NOT EXISTS password_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Two-factor authentication table
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  secret TEXT NOT NULL, -- Encrypted TOTP secret
  backup_codes TEXT, -- Encrypted JSON array of backup codes
  enabled BOOLEAN DEFAULT FALSE,
  verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id)
);

-- API keys table for external integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key_name TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL, -- Hashed API key
  permissions TEXT, -- JSON array of permissions
  rate_limit INTEGER DEFAULT 1000, -- Requests per hour
  last_used_at DATETIME,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- GDPR compliance table
CREATE TABLE IF NOT EXISTS gdpr_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  request_type TEXT NOT NULL, -- data_export, data_deletion, data_portability
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, rejected
  request_data TEXT, -- JSON with request details
  response_data TEXT, -- JSON with response/export data
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add security-related columns to existing users table
ALTER TABLE users ADD COLUMN password_changed_at DATETIME;
ALTER TABLE users ADD COLUMN failed_login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until DATETIME;
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_verification_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_expires DATETIME;
ALTER TABLE users ADD COLUMN gdpr_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN gdpr_consent_date DATETIME;

-- Create indexes for performance and security monitoring
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_risk ON security_events(risk_level);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);

CREATE INDEX IF NOT EXISTS idx_failed_logins_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_logins_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_logins_blocked ON failed_login_attempts(blocked_until);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_data_audit_user ON data_access_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_data_audit_table ON data_access_audit(table_name);
CREATE INDEX IF NOT EXISTS idx_data_audit_operation ON data_access_audit(operation);
CREATE INDEX IF NOT EXISTS idx_data_audit_created ON data_access_audit(created_at);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created ON password_history(created_at);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at);

CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user ON gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_email ON gdpr_requests(email);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON gdpr_requests(request_type);

CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_two_factor ON users(two_factor_enabled);
CREATE INDEX IF NOT EXISTS idx_users_locked ON users(locked_until);