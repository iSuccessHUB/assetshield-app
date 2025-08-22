-- Demo seed data for lawyers to test the platform
-- This creates realistic data for a law firm demo experience

-- First create demo users
INSERT OR IGNORE INTO users (id, email, password_hash, name, phone, user_type, role, permissions, is_active) VALUES 
-- Law firm staff
(1, 'admin@demo-lawfirm.com', '$2b$10$example_hash_admin', 'Sarah Johnson', '(555) 123-4567', 'law_firm', 'admin', '["full_access", "user_management", "billing", "analytics", "integrations"]', 1),
(2, 'manager.la@demo-lawfirm.com', '$2b$10$example_hash_manager', 'Michael Chen', '(555) 987-6543', 'law_firm', 'manager', '["office_management", "lead_management", "document_access", "local_analytics"]', 1),
(3, 'attorney.miami@demo-lawfirm.com', '$2b$10$example_hash_attorney', 'Elena Rodriguez', '(555) 456-7890', 'law_firm', 'attorney', '["lead_management", "document_access", "client_communication"]', 1),
(4, 'attorney.ny@demo-lawfirm.com', '$2b$10$example_hash_attorney2', 'David Thompson', '(555) 123-4568', 'law_firm', 'attorney', '["lead_management", "document_access", "client_communication"]', 1),

-- Demo clients/leads
(10, 'client1@example.com', '$2b$10$example_hash_client', 'Robert Miller', '(555) 234-5678', 'client', 'user', '[]', 1),
(11, 'client2@example.com', '$2b$10$example_hash_client', 'Jennifer Smith', '(555) 345-6789', 'client', 'user', '[]', 1),
(12, 'client3@example.com', '$2b$10$example_hash_client', 'Thomas Anderson', '(555) 456-7890', 'client', 'user', '[]', 1),
(13, 'client4@example.com', '$2b$10$example_hash_client', 'Lisa Chen', '(555) 567-8901', 'client', 'user', '[]', 1),
(14, 'client5@example.com', '$2b$10$example_hash_client', 'Mark Wilson', '(555) 678-9012', 'client', 'user', '[]', 1);

-- Demo law firms (after users exist)
INSERT OR IGNORE INTO law_firms (id, user_id, firm_name, practice_areas, website, subscription_tier, subscription_status, trial_ends_at, features, branding_config, contact_info, is_demo, demo_expires_at) VALUES 
(1, 1, 'Demo & Associates Law Firm', '["Asset Protection", "Estate Planning", "Business Law", "Wealth Management"]', 'https://demo-lawfirm.com', 'enterprise', 'trial', datetime('now', '+30 days'), 
'["Risk Assessment Tool", "Lead Capture", "Advanced Analytics", "Document Automation", "Multi-Office Support", "Custom Integrations", "24/7 Support"]',
'{"primary_color": "#1e40af", "secondary_color": "#3b82f6", "logo_url": "/static/demo-logo.png", "custom_domain": "demo.assetshield.app"}',
'{"address": "123 Legal Plaza, Suite 500\\nNew York, NY 10001", "phone": "(555) 123-4567", "email": "info@demo-lawfirm.com"}',
1, datetime('now', '+7 days'));

-- Demo offices for multi-office architecture
INSERT OR IGNORE INTO offices (id, law_firm_id, office_name, address, phone, email, manager_user_id, is_headquarters, timezone) VALUES 
(1, 1, 'New York Headquarters', '123 Legal Plaza, Suite 500\nNew York, NY 10001', '(555) 123-4567', 'ny@demo-lawfirm.com', 1, 1, 'America/New_York'),
(2, 1, 'Los Angeles Branch', '456 Sunset Blvd, Floor 12\nLos Angeles, CA 90028', '(555) 987-6543', 'la@demo-lawfirm.com', 2, 0, 'America/Los_Angeles'),
(3, 1, 'Miami Office', '789 Ocean Drive, Suite 200\nMiami, FL 33139', '(555) 456-7890', 'miami@demo-lawfirm.com', 3, 0, 'America/New_York');

-- Update users with office assignments (after offices are created)
UPDATE users SET office_id = 1, last_login_at = datetime('now', '-2 hours') WHERE id = 1;
UPDATE users SET office_id = 2, last_login_at = datetime('now', '-4 hours') WHERE id = 2;
UPDATE users SET office_id = 3, last_login_at = datetime('now', '-1 day') WHERE id = 3;
UPDATE users SET office_id = 1, last_login_at = datetime('now', '-6 hours') WHERE id = 4;

-- Demo leads with various statuses
INSERT OR IGNORE INTO leads (id, law_firm_id, office_id, assigned_attorney_id, source_type, source_data, contact_name, contact_email, contact_phone, risk_score, estimated_value, status, priority, notes, last_contact_at, next_followup_at, created_at) VALUES 
(1, 1, 1, 1, 'assessment', '{"assessment_id": 1, "completed_at": "2024-01-15T10:30:00Z"}', 'Robert Miller', 'client1@example.com', '(555) 234-5678', 85, 2500000, 'qualified', 'high', 'High-net-worth individual, owns multiple properties. Interested in offshore protection.', datetime('now', '-1 day'), datetime('now', '+2 days'), datetime('now', '-5 days')),
(2, 1, 2, 2, 'assessment', '{"assessment_id": 2, "completed_at": "2024-01-14T14:20:00Z"}', 'Jennifer Smith', 'client2@example.com', '(555) 345-6789', 72, 1200000, 'consultation', 'medium', 'Business owner, recent lawsuit threat. Needs domestic trust structure.', datetime('now', '-2 hours'), datetime('now', '+1 day'), datetime('now', '-4 days')),
(3, 1, 3, 3, 'contact_form', '{"page": "homepage", "message": "Interested in asset protection for my medical practice"}', 'Thomas Anderson', 'client3@example.com', '(555) 456-7890', 78, 1800000, 'contacted', 'high', 'Medical professional, malpractice concerns. Has existing LLC structure.', datetime('now', '-6 hours'), datetime('now', '+3 days'), datetime('now', '-3 days')),
(4, 1, 1, 4, 'assessment', '{"assessment_id": 3, "completed_at": "2024-01-12T09:15:00Z"}', 'Lisa Chen', 'client4@example.com', '(555) 567-8901', 65, 800000, 'new', 'medium', 'Tech entrepreneur, concerned about personal liability. First-time asset protection client.', NULL, datetime('now', '+1 day'), datetime('now', '-2 days')),
(5, 1, 2, 2, 'referral', '{"referrer": "John Doe, CPA", "referrer_contact": "john@example.com"}', 'Mark Wilson', 'client5@example.com', '(555) 678-9012', 91, 3200000, 'converted', 'urgent', 'Real estate mogul, ongoing litigation. Signed up for comprehensive offshore protection package.', datetime('now', '-1 day'), NULL, datetime('now', '-7 days'));

-- Demo lead activities
INSERT OR IGNORE INTO lead_activities (lead_id, user_id, activity_type, activity_data, notes, created_at) VALUES 
(1, 1, 'email', '{"subject": "Welcome to Asset Protection Consultation", "template_id": "welcome"}', 'Sent welcome email with consultation booking link', datetime('now', '-4 days')),
(1, 1, 'call', '{"duration_minutes": 25, "outcome": "positive"}', 'Initial consultation call. Client very interested in Cook Islands trust structure. Scheduled follow-up.', datetime('now', '-1 day')),
(2, 2, 'status_change', '{"from": "qualified", "to": "consultation"}', 'Moved to consultation stage after successful qualification call', datetime('now', '-3 hours')),
(2, 2, 'meeting', '{"type": "zoom", "duration_minutes": 45, "scheduled_for": "2024-01-20T15:00:00Z"}', 'Scheduled Zoom consultation for domestic asset protection trust discussion', datetime('now', '-2 hours')),
(3, 3, 'email', '{"subject": "Medical Practice Asset Protection Solutions", "template_id": "medical_professional"}', 'Sent specialized email for medical professionals', datetime('now', '-5 hours')),
(5, 2, 'status_change', '{"from": "qualified", "to": "converted"}', 'Client signed comprehensive offshore protection package - $25,000 setup + $2,500/month', datetime('now', '-1 day'));

-- Demo risk assessments
INSERT OR IGNORE INTO risk_assessments (id, user_id, law_firm_id, office_id, lead_id, profession, net_worth, business_ownership, previous_lawsuits, high_risk_activities, current_protection, risk_score, recommendations, created_at) VALUES 
(1, 10, 1, 1, 1, 'Real Estate Investor', '$5M - $10M', 'Multiple LLCs', 'None', 'High-value real estate transactions', 'Basic LLC structures', 85, 'Recommend Cook Islands Asset Protection Trust with domestic LLC layer. Consider international diversification.', datetime('now', '-5 days')),
(2, 11, 1, 2, 2, 'Business Owner', '$1M - $5M', 'C-Corporation', 'Threatened lawsuit (pending)', 'Manufacturing business', 'Corporate structure only', 72, 'Immediate domestic asset protection trust recommended. Segregate personal and business assets.', datetime('now', '-4 days')),
(3, 12, 1, 3, 3, 'Medical Professional', '$2M - $5M', 'Medical Practice LLC', 'One settled malpractice case', 'High-risk surgical procedures', 'Professional liability insurance', 78, 'Domestic asset protection trust with homestead optimization. Consider medical malpractice trust.', datetime('now', '-3 days')),
(4, 13, 1, 1, 4, 'Technology Entrepreneur', '$500K - $1M', 'Multiple startups', 'None', 'VC funding, potential IP disputes', 'None', 65, 'Start with domestic LLC and FLP structures. Plan for international expansion as wealth grows.', datetime('now', '-2 days')),
(5, 14, 1, 2, 5, 'Real Estate Developer', '$10M+', 'Complex entity structure', 'Multiple ongoing cases', 'Large development projects', 'Some domestic trusts', 91, 'Immediate offshore restructuring required. Cook Islands trust with Nevis LLC. Emergency consultation recommended.', datetime('now', '-7 days'));

-- Demo analytics events
INSERT OR IGNORE INTO analytics_events (law_firm_id, office_id, user_id, event_type, event_data, session_id, created_at) VALUES 
-- Page views and engagement
(1, 1, 10, 'page_view', '{"page": "/assessment", "time_on_page": 245}', 'sess_001', datetime('now', '-5 days')),
(1, 1, 10, 'assessment_started', '{"assessment_type": "comprehensive"}', 'sess_001', datetime('now', '-5 days')),
(1, 1, 10, 'assessment_completed', '{"risk_score": 85, "time_spent": 720}', 'sess_001', datetime('now', '-5 days')),
(1, 2, 11, 'page_view', '{"page": "/assessment", "time_on_page": 189}', 'sess_002', datetime('now', '-4 days')),
(1, 2, 11, 'assessment_completed', '{"risk_score": 72, "time_spent": 680}', 'sess_002', datetime('now', '-4 days')),
(1, 3, 12, 'page_view', '{"page": "/contact", "time_on_page": 95}', 'sess_003', datetime('now', '-3 days')),
(1, 3, 12, 'lead_generated', '{"source": "contact_form", "lead_score": 78}', 'sess_003', datetime('now', '-3 days')),
(1, 1, 13, 'assessment_started', '{"assessment_type": "basic"}', 'sess_004', datetime('now', '-2 days')),
(1, 2, 14, 'assessment_completed', '{"risk_score": 91, "time_spent": 450}', 'sess_005', datetime('now', '-7 days')),
(1, 2, 14, 'consultation_booked', '{"attorney_id": 2, "service_type": "offshore_protection"}', 'sess_005', datetime('now', '-7 days'));

-- Demo document templates
INSERT OR IGNORE INTO document_templates (id, law_firm_id, office_id, template_name, template_type, template_content, variables, jurisdiction, language, created_by) VALUES 
(1, 1, NULL, 'Asset Protection Consultation Letter', 'letter', 
'<h1>{{firm_name}}</h1>
<p>{{firm_address}}</p>
<p>{{consultation_date}}</p>

<p>Dear {{client_name}},</p>

<p>Thank you for your interest in asset protection services. Based on your risk assessment score of {{risk_score}}, we have identified several strategies that would benefit your situation:</p>

<h2>Recommended Strategies:</h2>
{{recommendations}}

<h2>Next Steps:</h2>
<ul>
<li>Schedule a comprehensive consultation</li>
<li>Review your current asset structure</li>
<li>Develop a customized protection plan</li>
</ul>

<p>Please contact us at {{firm_phone}} to schedule your consultation.</p>

<p>Sincerely,</p>
<p>{{attorney_name}}<br>{{attorney_title}}</p>',
'["firm_name", "firm_address", "consultation_date", "client_name", "risk_score", "recommendations", "firm_phone", "attorney_name", "attorney_title"]',
'US', 'en', 1),

(2, 1, NULL, 'Domestic Trust Information Package', 'report',
'<h1>Domestic Asset Protection Trust</h1>
<h2>Client: {{client_name}}</h2>

<h3>Overview</h3>
<p>A Domestic Asset Protection Trust (DAPT) provides significant protection for your assets while maintaining many of the benefits of domestic planning.</p>

<h3>Benefits for {{client_name}}:</h3>
<ul>
<li>Protection from creditor claims</li>
<li>Retention of some control over assets</li>
<li>Tax benefits in certain jurisdictions</li>
<li>Estate planning advantages</li>
</ul>

<h3>Recommended Structure:</h3>
<p>Based on your net worth of {{net_worth}} and risk profile, we recommend:</p>
{{structure_details}}

<h3>Implementation Timeline:</h3>
{{timeline}}

<h3>Estimated Costs:</h3>
<p>Setup: {{setup_cost}}</p>
<p>Annual: {{annual_cost}}</p>',
'["client_name", "net_worth", "structure_details", "timeline", "setup_cost", "annual_cost"]',
'US', 'en', 1);

-- Demo generated documents
INSERT OR IGNORE INTO generated_documents (template_id, lead_id, generated_by, document_name, document_content, document_data, status, created_at) VALUES 
(1, 1, 1, 'Robert Miller - Consultation Letter', 
'<h1>Demo & Associates Law Firm</h1>
<p>123 Legal Plaza, Suite 500<br>New York, NY 10001</p>
<p>January 16, 2024</p>

<p>Dear Robert Miller,</p>

<p>Thank you for your interest in asset protection services. Based on your risk assessment score of 85, we have identified several strategies that would benefit your situation:</p>

<h2>Recommended Strategies:</h2>
<ul>
<li>Cook Islands Asset Protection Trust</li>
<li>Domestic LLC layer for operational assets</li>
<li>International diversification of investments</li>
</ul>

<p>Please contact us at (555) 123-4567 to schedule your consultation.</p>

<p>Sincerely,</p>
<p>Sarah Johnson<br>Managing Partner</p>',
'{"firm_name": "Demo & Associates Law Firm", "client_name": "Robert Miller", "risk_score": "85", "attorney_name": "Sarah Johnson"}',
'finalized', datetime('now', '-4 days'));

-- Demo payment transactions
INSERT OR IGNORE INTO payment_transactions (id, user_id, law_firm_id, stripe_payment_intent_id, amount, currency, description, payment_type, status, billing_period_start, billing_period_end, created_at) VALUES 
(1, 14, 1, 'pi_demo_setup_fee', 2500000, 'usd', 'Enterprise Setup Fee - Offshore Protection Package', 'one_time', 'succeeded', NULL, NULL, datetime('now', '-7 days')),
(2, 14, 1, 'pi_demo_monthly_1', 250000, 'usd', 'Enterprise Monthly Subscription - January 2024', 'subscription', 'succeeded', '2024-01-01', '2024-01-31', datetime('now', '-7 days')),
(3, 11, 1, 'pi_demo_consultation', 50000, 'usd', 'Initial Consultation Fee', 'one_time', 'succeeded', NULL, NULL, datetime('now', '-4 days'));

-- Demo integration configurations
INSERT OR IGNORE INTO integrations (law_firm_id, integration_type, integration_name, api_credentials, webhook_url, configuration, is_active, last_sync_at, sync_status) VALUES 
(1, 'salesforce', 'Salesforce CRM Integration', '{"encrypted": "demo_credentials"}', 'https://demo-lawfirm.com/webhooks/salesforce', 
'{"sync_leads": true, "sync_contacts": true, "auto_create_opportunities": true, "lead_source": "AssetShield Assessment"}', 
1, datetime('now', '-2 hours'), 'active'),
(1, 'calendly', 'Calendly Booking Integration', '{"encrypted": "demo_calendly_token"}', 'https://demo-lawfirm.com/webhooks/calendly',
'{"auto_book_consultations": true, "default_attorney": "Sarah Johnson", "consultation_duration": 60}',
1, datetime('now', '-1 hour'), 'active'),
(1, 'quickbooks', 'QuickBooks Accounting', '{"encrypted": "demo_qb_credentials"}', NULL,
'{"auto_create_invoices": true, "sync_payments": true, "default_service_item": "Legal Services"}',
1, datetime('now', '-3 hours'), 'active');

-- Demo support tickets
INSERT OR IGNORE INTO support_tickets (law_firm_id, office_id, created_by, assigned_to, ticket_type, priority, subject, description, status, resolution, first_response_at, resolved_at, satisfaction_rating, created_at) VALUES 
(1, 1, 1, NULL, 'feature_request', 'medium', 'Custom Risk Assessment Questions', 
'We would like to add industry-specific questions to the risk assessment for medical professionals. Can we customize the questionnaire?',
'resolved', 'Custom questionnaire builder has been enabled for your Enterprise account. You can now create industry-specific assessments in your admin panel.',
datetime('now', '-2 days'), datetime('now', '-1 day'), 5, datetime('now', '-3 days')),

(1, 2, 2, NULL, 'technical', 'high', 'Integration Sync Issues', 
'Our Salesforce integration stopped syncing leads yesterday. The last successful sync was at 2:30 PM EST.',
'in_progress', NULL, datetime('now', '-1 day'), NULL, NULL, datetime('now', '-1 day'));

-- Demo consultation bookings
INSERT OR IGNORE INTO consultations (user_id, law_firm_id, office_id, lead_id, name, email, phone, consultation_type, preferred_date, preferred_time, message, status, created_at) VALUES 
(10, 1, 1, 1, 'Robert Miller', 'client1@example.com', '(555) 234-5678', 'Asset Protection Strategy', '2024-01-22', '10:00 AM', 
'Looking for comprehensive offshore protection for real estate portfolio', 'confirmed', datetime('now', '-4 days')),
(11, 1, 2, 2, 'Jennifer Smith', 'client2@example.com', '(555) 345-6789', 'Domestic Trust Planning', '2024-01-20', '2:00 PM',
'Need urgent protection due to potential lawsuit', 'confirmed', datetime('now', '-3 days')),
(12, 1, 3, 3, 'Thomas Anderson', 'client3@example.com', '(555) 456-7890', 'Medical Practice Protection', '2024-01-25', '11:00 AM',
'Malpractice concerns for surgical practice', 'pending', datetime('now', '-2 days'));