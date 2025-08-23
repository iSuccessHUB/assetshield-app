-- CENTRALIZED SAAS PLATFORM SCHEMA
-- One dashboard, multiple white-label deployments per customer

-- Drop old complex tables (we'll recreate simplified versions)
DROP TABLE IF EXISTS platform_instances;
DROP TABLE IF EXISTS platform_credentials;
DROP TABLE IF EXISTS platform_configurations;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS client_records;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS email_templates;

-- Customers table (one account per law firm)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT UNIQUE NOT NULL,
  owner_phone TEXT,
  password_hash TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'professional', 'enterprise')),
  status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  trial_ends_at DATETIME,
  last_login DATETIME,
  
  -- Stripe integration
  stripe_customer_id TEXT,
  subscription_id TEXT,
  setup_fee_paid INTEGER NOT NULL,
  monthly_fee INTEGER NOT NULL,
  next_billing_date DATETIME,
  
  -- API access
  api_key TEXT UNIQUE,
  api_key_created_at DATETIME
);

-- Customer domains (customers can have multiple domains)
CREATE TABLE IF NOT EXISTS customer_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'failed')),
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- White-label configurations (one per customer)
CREATE TABLE IF NOT EXISTS white_label_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL UNIQUE,
  
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#1d4ed8',
  accent_color TEXT DEFAULT '#10b981',
  
  -- Firm information
  firm_address TEXT,
  firm_website TEXT,
  firm_phone TEXT,
  firm_description TEXT,
  
  -- Content customization
  hero_title TEXT,
  hero_subtitle TEXT,
  about_content TEXT,
  services_content TEXT,
  
  -- Features enabled based on tier
  features_enabled TEXT DEFAULT '[]', -- JSON array
  
  -- Email settings
  from_email TEXT,
  reply_to_email TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Customer team members (attorneys, staff)
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'attorney' CHECK (role IN ('admin', 'attorney', 'paralegal', 'assistant')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  password_hash TEXT,
  invitation_token TEXT,
  invitation_expires DATETIME,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  UNIQUE(customer_id, email)
);

-- Client leads (captured through white-label sites)
CREATE TABLE IF NOT EXISTS client_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  
  -- Client information
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  source_domain TEXT, -- Which domain they came from
  
  -- Assessment data
  assessment_data TEXT, -- JSON object with responses
  risk_score INTEGER,
  risk_level TEXT, -- low, medium, high
  
  -- Lead status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'consultation_scheduled', 'converted', 'closed')),
  consultation_date DATETIME,
  notes TEXT,
  
  -- Tracking
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Assessment questions (customizable per customer)
CREATE TABLE IF NOT EXISTS assessment_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER, -- NULL for default questions
  category TEXT NOT NULL, -- 'personal', 'business', 'assets', 'risk'
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('text', 'number', 'multiple_choice', 'yes_no', 'scale')),
  options TEXT, -- JSON array for multiple choice
  weight INTEGER DEFAULT 1, -- For risk scoring
  is_required BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Activity logs (customer actions and system events)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT, -- 'lead', 'config', 'domain', 'team'
  entity_id INTEGER,
  details TEXT, -- JSON object
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Email templates (customizable per customer)
CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER, -- NULL for default templates
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('welcome', 'assessment_complete', 'consultation_reminder', 'follow_up')),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(owner_email);
CREATE INDEX IF NOT EXISTS idx_customers_stripe ON customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_api_key ON customers(api_key);
CREATE INDEX IF NOT EXISTS idx_customer_domains_domain ON customer_domains(domain);
CREATE INDEX IF NOT EXISTS idx_customer_domains_customer ON customer_domains(customer_id);
CREATE INDEX IF NOT EXISTS idx_white_label_configs_customer ON white_label_configs(customer_id);
CREATE INDEX IF NOT EXISTS idx_team_members_customer ON team_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_client_leads_customer ON client_leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_client_leads_email ON client_leads(client_email);
CREATE INDEX IF NOT EXISTS idx_client_leads_status ON client_leads(status);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_customer ON assessment_questions(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_customer ON activity_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_customer ON email_templates(customer_id);

-- Insert default assessment questions
INSERT INTO assessment_questions (customer_id, category, question_text, question_type, options, weight, order_index) VALUES
(NULL, 'personal', 'What is your current net worth?', 'multiple_choice', '["Under $500K", "$500K - $1M", "$1M - $5M", "$5M - $10M", "Over $10M"]', 5, 1),
(NULL, 'personal', 'What is your annual income?', 'multiple_choice', '["Under $100K", "$100K - $250K", "$250K - $500K", "$500K - $1M", "Over $1M"]', 4, 2),
(NULL, 'personal', 'What is your profession?', 'multiple_choice', '["Medical Professional", "Business Owner", "Real Estate", "Finance/Investment", "Legal Professional", "Other"]', 3, 3),
(NULL, 'business', 'Do you own a business?', 'yes_no', NULL, 4, 4),
(NULL, 'business', 'What type of business do you own?', 'multiple_choice', '["Medical Practice", "Law Firm", "Real Estate", "Construction", "Technology", "Retail", "Manufacturing", "Other"]', 3, 5),
(NULL, 'business', 'How many employees do you have?', 'multiple_choice', '["Just me", "1-5", "6-20", "21-50", "Over 50"]', 2, 6),
(NULL, 'assets', 'Do you own real estate?', 'yes_no', NULL, 3, 7),
(NULL, 'assets', 'How many properties do you own?', 'multiple_choice', '["1", "2-3", "4-10", "Over 10"]', 3, 8),
(NULL, 'assets', 'Do you have investment accounts?', 'yes_no', NULL, 2, 9),
(NULL, 'risk', 'Have you ever been sued?', 'yes_no', NULL, 5, 10),
(NULL, 'risk', 'Are you concerned about potential litigation?', 'scale', '["1", "2", "3", "4", "5"]', 4, 11),
(NULL, 'risk', 'Do you have adequate insurance coverage?', 'yes_no', NULL, 3, 12);

-- Insert default email templates
INSERT INTO email_templates (customer_id, template_name, template_type, subject, body_html, body_text) VALUES
(NULL, 'Default Welcome', 'welcome', 'Welcome to {{firm_name}} - Your Asset Protection Assessment', 
'<h2>Welcome {{client_name}},</h2><p>Thank you for completing your asset protection assessment with {{firm_name}}.</p><p>We will review your responses and contact you within 24 hours to discuss your personalized protection strategy.</p><p>Best regards,<br>{{firm_name}} Team</p>',
'Welcome {{client_name}},\n\nThank you for completing your asset protection assessment with {{firm_name}}.\n\nWe will review your responses and contact you within 24 hours to discuss your personalized protection strategy.\n\nBest regards,\n{{firm_name}} Team'),

(NULL, 'Default Assessment Complete', 'assessment_complete', 'Your Asset Protection Risk Assessment Results',
'<h2>Hello {{client_name}},</h2><p>Your asset protection assessment is complete. Based on your responses, your risk score is <strong>{{risk_score}}/100</strong> ({{risk_level}} risk).</p><p>We recommend scheduling a consultation to discuss your personalized protection strategy.</p><p>Contact us at {{firm_phone}} or reply to this email.</p><p>Best regards,<br>{{firm_name}}</p>',
'Hello {{client_name}},\n\nYour asset protection assessment is complete. Based on your responses, your risk score is {{risk_score}}/100 ({{risk_level}} risk).\n\nWe recommend scheduling a consultation to discuss your personalized protection strategy.\n\nContact us at {{firm_phone}} or reply to this email.\n\nBest regards,\n{{firm_name}}');