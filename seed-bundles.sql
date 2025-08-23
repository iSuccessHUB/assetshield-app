-- Seed data for service bundles and services

-- Insert base services first
INSERT OR REPLACE INTO services (id, name, description, price, service_type, features) VALUES
(1, 'Risk Assessment Tool', 'Complete client risk evaluation system', 150000, 'assessment', '["Automated risk scoring", "Client questionnaires", "Report generation"]'),
(2, 'Lead Management System', 'Client acquisition and nurturing platform', 200000, 'lead_management', '["Lead capture forms", "CRM integration", "Email automation"]'),
(3, 'Document Automation', 'Automated legal document generation', 300000, 'document_prep', '["Template library", "Custom forms", "E-signature integration"]'),
(4, 'Analytics Dashboard', 'Business intelligence and reporting', 250000, 'analytics', '["Revenue tracking", "Client metrics", "Performance reports"]'),
(5, 'White Label Branding', 'Custom platform branding', 100000, 'branding', '["Logo integration", "Color schemes", "Custom domain"]'),
(6, 'Multi-User Access', 'Team collaboration features', 180000, 'collaboration', '["User roles", "Permissions", "Team management"]'),
(7, 'API Integrations', 'Third-party software connections', 400000, 'integration', '["Custom APIs", "Webhook support", "Data sync"]'),
(8, 'Priority Support', 'Enhanced customer support', 120000, 'support', '["Phone support", "Dedicated rep", "Training sessions"]');

-- Insert service bundles
INSERT OR REPLACE INTO service_bundles (id, name, description, bundle_type, original_price, bundle_price, discount_percentage, included_services, popular, featured, marketing_tagline, active) VALUES
(1, 'Starter Package', 'Perfect for solo practitioners and small firms getting started with asset protection services', 'starter', 600000, 450000, 25, '[1,2,5]', 0, 0, 'Everything you need to start', 1),
(2, 'Professional Package', 'Comprehensive solution for established firms ready to scale their practice', 'professional', 1050000, 750000, 29, '[1,2,3,4,5,6,8]', 1, 1, 'Most popular choice', 1),
(3, 'Enterprise Package', 'Complete platform for large firms and multi-office practices', 'enterprise', 1500000, 1000000, 33, '[1,2,3,4,5,6,7,8]', 0, 0, 'Maximum features and support', 1),
(4, 'Custom Solutions', 'Tailored package for unique requirements', 'custom', 2000000, 1500000, 25, '[1,2,3,4,5,6,7,8]', 0, 0, 'Built for your needs', 1);