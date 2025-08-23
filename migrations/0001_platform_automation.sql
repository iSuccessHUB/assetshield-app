-- Platform Instances Table
CREATE TABLE IF NOT EXISTS platform_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  owner_email TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_phone TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'professional', 'enterprise')),
  status TEXT DEFAULT 'provisioning' CHECK (status IN ('provisioning', 'active', 'trial', 'expired', 'suspended', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  trial_ends_at DATETIME,
  subscription_id TEXT,
  stripe_customer_id TEXT,
  stripe_payment_intent TEXT,
  setup_fee_paid INTEGER NOT NULL,
  monthly_fee INTEGER NOT NULL,
  next_billing_date DATETIME
);

-- Platform Credentials Table
CREATE TABLE IF NOT EXISTS platform_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id INTEGER NOT NULL,
  admin_email TEXT NOT NULL,
  admin_password_hash TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  setup_token TEXT NOT NULL UNIQUE,
  password_reset_token TEXT,
  password_reset_expires DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  FOREIGN KEY (platform_id) REFERENCES platform_instances(id) ON DELETE CASCADE
);

-- Platform Configuration Table  
CREATE TABLE IF NOT EXISTS platform_configurations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id INTEGER NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#1d4ed8',
  firm_address TEXT,
  firm_website TEXT,
  firm_phone TEXT,
  custom_domain TEXT,
  features_enabled TEXT DEFAULT '[]', -- JSON array of enabled features
  branding_config TEXT DEFAULT '{}', -- JSON object for branding
  email_config TEXT DEFAULT '{}', -- JSON object for email settings
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (platform_id) REFERENCES platform_instances(id) ON DELETE CASCADE
);

-- Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'attorney' CHECK (role IN ('admin', 'attorney', 'paralegal', 'assistant')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  password_hash TEXT,
  invitation_token TEXT,
  invitation_expires DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  FOREIGN KEY (platform_id) REFERENCES platform_instances(id) ON DELETE CASCADE,
  UNIQUE(platform_id, email)
);

-- Client Records Table (for the white-label platforms)
CREATE TABLE IF NOT EXISTS client_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id INTEGER NOT NULL,
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  assessment_data TEXT, -- JSON object with assessment results
  risk_score INTEGER,
  consultation_status TEXT DEFAULT 'pending' CHECK (consultation_status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  consultation_date DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (platform_id) REFERENCES platform_instances(id) ON DELETE CASCADE
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id INTEGER NOT NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  details TEXT, -- JSON object with action details
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (platform_id) REFERENCES platform_instances(id) ON DELETE CASCADE
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id INTEGER,
  template_type TEXT NOT NULL CHECK (template_type IN ('welcome', 'assessment_complete', 'consultation_reminder', 'follow_up')),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (platform_id) REFERENCES platform_instances(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_platform_instances_subdomain ON platform_instances(subdomain);
CREATE INDEX IF NOT EXISTS idx_platform_instances_owner_email ON platform_instances(owner_email);
CREATE INDEX IF NOT EXISTS idx_platform_instances_stripe_customer ON platform_instances(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_platform_credentials_platform_id ON platform_credentials(platform_id);
CREATE INDEX IF NOT EXISTS idx_platform_credentials_api_key ON platform_credentials(api_key);
CREATE INDEX IF NOT EXISTS idx_team_members_platform_id ON team_members(platform_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_client_records_platform_id ON client_records(platform_id);
CREATE INDEX IF NOT EXISTS idx_client_records_email ON client_records(client_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_platform_id ON activity_logs(platform_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_platform_id ON email_templates(platform_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);