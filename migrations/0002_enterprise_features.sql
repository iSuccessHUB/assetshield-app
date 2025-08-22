-- Enterprise Features Migration
-- Multi-office architecture, demo system, and enhanced analytics

-- Law firms table (enhanced)
CREATE TABLE IF NOT EXISTS law_firms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  firm_name TEXT NOT NULL,
  practice_areas TEXT, -- JSON array
  website TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'starter', -- starter, professional, enterprise
  subscription_status TEXT DEFAULT 'trial', -- trial, active, inactive, cancelled
  trial_ends_at DATETIME,
  features TEXT, -- JSON array of enabled features
  branding_config TEXT, -- JSON: colors, logo, custom domain
  contact_info TEXT, -- JSON: address, phone, email
  is_demo BOOLEAN DEFAULT 0,
  demo_expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Offices table for multi-office architecture
CREATE TABLE IF NOT EXISTS offices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  law_firm_id INTEGER NOT NULL,
  office_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  manager_user_id INTEGER,
  is_headquarters BOOLEAN DEFAULT 0,
  timezone TEXT DEFAULT 'America/New_York',
  settings TEXT, -- JSON configuration
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (law_firm_id) REFERENCES law_firms(id),
  FOREIGN KEY (manager_user_id) REFERENCES users(id)
);

-- Enhanced users table (add office relationship)
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'client';
ALTER TABLE users ADD COLUMN office_id INTEGER REFERENCES offices(id);
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'; -- admin, manager, attorney, staff, user
ALTER TABLE users ADD COLUMN permissions TEXT; -- JSON array of permissions
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1;

-- Demo requests and trials
CREATE TABLE IF NOT EXISTS demo_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  law_firm_id INTEGER,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT,
  firm_name TEXT NOT NULL,
  interest_tier TEXT NOT NULL, -- starter, professional, enterprise
  demo_scheduled_at DATETIME,
  demo_completed_at DATETIME,
  demo_feedback TEXT,
  converted_to_paid BOOLEAN DEFAULT 0,
  status TEXT DEFAULT 'requested', -- requested, scheduled, completed, converted, expired
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (law_firm_id) REFERENCES law_firms(id)
);

-- Analytics events for comprehensive tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  law_firm_id INTEGER,
  office_id INTEGER,
  user_id INTEGER,
  event_type TEXT NOT NULL, -- page_view, assessment_started, assessment_completed, lead_generated, etc.
  event_data TEXT, -- JSON with event-specific data
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (law_firm_id) REFERENCES law_firms(id),
  FOREIGN KEY (office_id) REFERENCES offices(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Leads table for comprehensive CRM
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  law_firm_id INTEGER NOT NULL,
  office_id INTEGER,
  assigned_attorney_id INTEGER,
  source_type TEXT, -- assessment, contact_form, referral, demo
  source_data TEXT, -- JSON with source-specific data
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  risk_score INTEGER,
  estimated_value INTEGER, -- potential case value in cents
  status TEXT DEFAULT 'new', -- new, contacted, qualified, consultation, converted, lost
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  notes TEXT,
  last_contact_at DATETIME,
  next_followup_at DATETIME,
  converted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (law_firm_id) REFERENCES law_firms(id),
  FOREIGN KEY (office_id) REFERENCES offices(id),
  FOREIGN KEY (assigned_attorney_id) REFERENCES users(id)
);

-- Lead activities for detailed tracking
CREATE TABLE IF NOT EXISTS lead_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  user_id INTEGER,
  activity_type TEXT NOT NULL, -- call, email, meeting, note, status_change
  activity_data TEXT, -- JSON with activity details
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Document templates with office/firm customization
CREATE TABLE IF NOT EXISTS document_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  law_firm_id INTEGER,
  office_id INTEGER,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- letter, agreement, checklist, report
  template_content TEXT NOT NULL,
  variables TEXT, -- JSON array of template variables
  jurisdiction TEXT DEFAULT 'US',
  language TEXT DEFAULT 'en',
  is_active BOOLEAN DEFAULT 1,
  version INTEGER DEFAULT 1,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (law_firm_id) REFERENCES law_firms(id),
  FOREIGN KEY (office_id) REFERENCES offices(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Generated documents
CREATE TABLE IF NOT EXISTS generated_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  lead_id INTEGER,
  generated_by INTEGER NOT NULL,
  document_name TEXT NOT NULL,
  document_content TEXT NOT NULL,
  document_data TEXT, -- JSON with the data used to generate
  file_path TEXT, -- Path to generated PDF/Word file
  status TEXT DEFAULT 'draft', -- draft, finalized, sent, signed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES document_templates(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (generated_by) REFERENCES users(id)
);

-- Integration APIs and webhooks
CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  law_firm_id INTEGER NOT NULL,
  integration_type TEXT NOT NULL, -- salesforce, hubspot, quickbooks, calendly, etc.
  integration_name TEXT NOT NULL,
  api_credentials TEXT, -- Encrypted JSON with API keys/tokens
  webhook_url TEXT,
  webhook_secret TEXT,
  configuration TEXT, -- JSON with integration-specific settings
  is_active BOOLEAN DEFAULT 1,
  last_sync_at DATETIME,
  sync_status TEXT DEFAULT 'pending', -- pending, active, error, disabled
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (law_firm_id) REFERENCES law_firms(id)
);

-- Integration sync logs
CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  integration_id INTEGER NOT NULL,
  sync_type TEXT NOT NULL, -- full, incremental, webhook
  records_processed INTEGER DEFAULT 0,
  records_success INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (integration_id) REFERENCES integrations(id)
);

-- Support tickets for dedicated account management
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  law_firm_id INTEGER NOT NULL,
  office_id INTEGER,
  created_by INTEGER NOT NULL,
  assigned_to INTEGER,
  ticket_type TEXT NOT NULL, -- technical, billing, training, feature_request
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent, critical
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open, in_progress, waiting_customer, resolved, closed
  resolution TEXT,
  first_response_at DATETIME,
  resolved_at DATETIME,
  satisfaction_rating INTEGER, -- 1-5 stars
  satisfaction_feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (law_firm_id) REFERENCES law_firms(id),
  FOREIGN KEY (office_id) REFERENCES offices(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Support ticket messages
CREATE TABLE IF NOT EXISTS support_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  message_content TEXT NOT NULL,
  attachments TEXT, -- JSON array of attachment info
  is_internal BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Enhanced payment tracking
ALTER TABLE payment_transactions ADD COLUMN law_firm_id INTEGER REFERENCES law_firms(id);
ALTER TABLE payment_transactions ADD COLUMN payment_type TEXT DEFAULT 'one_time'; -- one_time, subscription, setup_fee
ALTER TABLE payment_transactions ADD COLUMN billing_period_start DATE;
ALTER TABLE payment_transactions ADD COLUMN billing_period_end DATE;

-- Risk assessments - link to law firm
ALTER TABLE risk_assessments ADD COLUMN law_firm_id INTEGER REFERENCES law_firms(id);
ALTER TABLE risk_assessments ADD COLUMN office_id INTEGER REFERENCES offices(id);
ALTER TABLE risk_assessments ADD COLUMN lead_id INTEGER REFERENCES leads(id);

-- Consultations - link to law firm
ALTER TABLE consultations ADD COLUMN law_firm_id INTEGER REFERENCES law_firms(id);
ALTER TABLE consultations ADD COLUMN office_id INTEGER REFERENCES offices(id);
ALTER TABLE consultations ADD COLUMN lead_id INTEGER REFERENCES leads(id);

-- Create comprehensive indexes
CREATE INDEX IF NOT EXISTS idx_law_firms_subscription_tier ON law_firms(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_law_firms_status ON law_firms(subscription_status);
CREATE INDEX IF NOT EXISTS idx_law_firms_demo ON law_firms(is_demo, demo_expires_at);
CREATE INDEX IF NOT EXISTS idx_offices_law_firm_id ON offices(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_users_office_id ON users(office_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_analytics_events_law_firm_id ON analytics_events(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_law_firm_id ON leads(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_attorney ON leads(assigned_attorney_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_law_firm_id ON document_templates(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_template_id ON generated_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_integrations_law_firm_id ON integrations(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_law_firm_id ON support_tickets(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);