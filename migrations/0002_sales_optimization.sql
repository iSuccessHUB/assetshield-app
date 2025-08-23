-- Sales Optimization Features Migration
-- Adds tables and columns for demo tracking, lead capture, service bundles, and analytics

-- Demo sessions table for tracking law firm trials
CREATE TABLE IF NOT EXISTS demo_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  law_firm_size TEXT, -- solo, small (2-10), medium (11-50), large (50+)
  practice_areas TEXT, -- JSON array of practice areas
  current_software TEXT,
  pain_points TEXT,
  budget_range TEXT, -- under-5k, 5k-15k, 15k-50k, 50k+
  decision_timeline TEXT, -- immediate, 1-3months, 3-6months, 6months+
  decision_makers TEXT, -- JSON array of decision maker roles
  marketing_source TEXT, -- google, referral, linkedin, direct, etc.
  utm_campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Engagement tracking
  login_count INTEGER DEFAULT 0,
  pages_viewed INTEGER DEFAULT 0,
  features_used TEXT, -- JSON array of features accessed
  time_spent_minutes INTEGER DEFAULT 0,
  documents_created INTEGER DEFAULT 0,
  
  -- Conversion tracking
  status TEXT DEFAULT 'active', -- active, expired, converted, abandoned
  converted_at DATETIME,
  conversion_value INTEGER, -- in cents
  conversion_services TEXT, -- JSON array of purchased services
  
  -- Follow-up tracking  
  sales_notes TEXT,
  follow_up_scheduled DATETIME,
  last_contact_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service bundles table for package deals
CREATE TABLE IF NOT EXISTS service_bundles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  bundle_type TEXT NOT NULL, -- starter, professional, enterprise, custom
  original_price INTEGER NOT NULL, -- sum of individual service prices in cents
  bundle_price INTEGER NOT NULL, -- discounted price in cents
  discount_percentage INTEGER, -- calculated discount
  
  -- Bundle composition (JSON array of service IDs)
  included_services TEXT NOT NULL, -- JSON array of service IDs
  
  -- Marketing
  popular BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  marketing_tagline TEXT,
  
  -- Availability
  active BOOLEAN DEFAULT TRUE,
  valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User bundle purchases
CREATE TABLE IF NOT EXISTS user_bundle_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  bundle_id INTEGER NOT NULL,
  purchase_price INTEGER NOT NULL, -- actual price paid in cents
  discount_applied INTEGER DEFAULT 0, -- discount amount in cents
  
  status TEXT DEFAULT 'active', -- active, inactive, cancelled, refunded
  purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  
  -- Payment tracking
  stripe_payment_intent_id TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (bundle_id) REFERENCES service_bundles(id)
);

-- Enhanced user services table with access levels
ALTER TABLE user_services ADD COLUMN access_level TEXT DEFAULT 'basic'; -- basic, premium, enterprise
ALTER TABLE user_services ADD COLUMN service_type TEXT; -- llc, trust, offshore, etc.
ALTER TABLE user_services ADD COLUMN purchase_source TEXT; -- direct, bundle, demo_conversion

-- Demo activity tracking
CREATE TABLE IF NOT EXISTS demo_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  demo_session_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL, -- login, page_view, feature_use, document_create, etc.
  activity_data TEXT, -- JSON with specific activity details
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (demo_session_id) REFERENCES demo_sessions(id)
);

-- Conversion funnel analytics
CREATE TABLE IF NOT EXISTS conversion_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  
  -- Demo metrics
  demos_started INTEGER DEFAULT 0,
  demos_active INTEGER DEFAULT 0,
  demos_expired INTEGER DEFAULT 0,
  demos_converted INTEGER DEFAULT 0,
  
  -- Engagement metrics
  avg_login_count REAL DEFAULT 0,
  avg_pages_viewed REAL DEFAULT 0,
  avg_time_spent REAL DEFAULT 0,
  avg_features_used REAL DEFAULT 0,
  
  -- Conversion metrics
  conversion_rate REAL DEFAULT 0,
  avg_conversion_value REAL DEFAULT 0,
  total_conversion_value INTEGER DEFAULT 0,
  
  -- Lead quality metrics
  qualified_leads INTEGER DEFAULT 0,
  high_value_leads INTEGER DEFAULT 0, -- budget 50k+
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(date)
);

-- Lead scoring table
CREATE TABLE IF NOT EXISTS lead_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  demo_session_id INTEGER NOT NULL,
  
  -- Scoring factors
  company_size_score INTEGER DEFAULT 0, -- 1-10 based on firm size
  budget_score INTEGER DEFAULT 0, -- 1-10 based on budget range
  timeline_score INTEGER DEFAULT 0, -- 1-10 based on decision timeline
  engagement_score INTEGER DEFAULT 0, -- 1-10 based on platform usage
  fit_score INTEGER DEFAULT 0, -- 1-10 based on practice areas match
  
  -- Final scores
  total_score INTEGER DEFAULT 0,
  grade TEXT, -- A, B, C, D based on total score
  
  -- Sales priority
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  assigned_to TEXT, -- sales rep identifier
  
  calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (demo_session_id) REFERENCES demo_sessions(id),
  UNIQUE(demo_session_id)
);

-- Email campaign tracking
CREATE TABLE IF NOT EXISTS email_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  demo_session_id INTEGER NOT NULL,
  
  campaign_type TEXT NOT NULL, -- welcome, day_3_check_in, day_7_tips, day_10_urgency, day_13_final, post_expiry
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  opened_at DATETIME,
  clicked_at DATETIME,
  replied_at DATETIME,
  
  -- Email content tracking
  subject_line TEXT,
  template_used TEXT,
  
  FOREIGN KEY (demo_session_id) REFERENCES demo_sessions(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_demo_sessions_email ON demo_sessions(email);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_status ON demo_sessions(status);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires_at ON demo_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_marketing_source ON demo_sessions(marketing_source);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_law_firm_size ON demo_sessions(law_firm_size);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_budget_range ON demo_sessions(budget_range);

CREATE INDEX IF NOT EXISTS idx_demo_activities_session_id ON demo_activities(demo_session_id);
CREATE INDEX IF NOT EXISTS idx_demo_activities_timestamp ON demo_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_demo_activities_type ON demo_activities(activity_type);

CREATE INDEX IF NOT EXISTS idx_service_bundles_active ON service_bundles(active);
CREATE INDEX IF NOT EXISTS idx_service_bundles_bundle_type ON service_bundles(bundle_type);

CREATE INDEX IF NOT EXISTS idx_user_bundle_purchases_user_id ON user_bundle_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bundle_purchases_status ON user_bundle_purchases(status);

CREATE INDEX IF NOT EXISTS idx_conversion_analytics_date ON conversion_analytics(date);
CREATE INDEX IF NOT EXISTS idx_lead_scores_grade ON lead_scores(grade);
CREATE INDEX IF NOT EXISTS idx_lead_scores_priority ON lead_scores(priority);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_demo_session_id ON email_campaigns(demo_session_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_campaign_type ON email_campaigns(campaign_type);