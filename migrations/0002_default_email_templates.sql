-- Insert default email templates
INSERT OR IGNORE INTO email_templates (platform_id, template_type, subject, body_html, body_text, is_default) VALUES 
(NULL, 'welcome', '🎉 Welcome to Your AssetShield Platform!', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Welcome to AssetShield</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; color: #6b7280; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
        .credentials { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
        .feature { display: flex; align-items: center; margin: 10px 0; }
        .feature-icon { color: #10b981; margin-right: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Welcome to AssetShield</h1>
            <p>Your white-label asset protection platform is ready!</p>
        </div>
        
        <div class="content">
            <h2>Hello {{lawyer_name}},</h2>
            
            <p>Congratulations! Your AssetShield {{tier}} platform for <strong>{{firm_name}}</strong> has been successfully provisioned and is ready to use.</p>
            
            <div class="credentials">
                <h3>🔑 Your Platform Access</h3>
                <p><strong>Platform URL:</strong> <a href="{{platform_url}}">{{platform_url}}</a></p>
                <p><strong>Admin Email:</strong> {{admin_email}}</p>
                <p><strong>Admin Password:</strong> {{admin_password}}</p>
                <p><strong>API Key:</strong> {{api_key}}</p>
            </div>
            
            <a href="{{platform_url}}" class="button">🚀 Access Your Platform</a>
            
            <h3>✨ What You Get with {{tier}}:</h3>
            {{features_list}}
            
            <h3>🚀 Quick Start Guide:</h3>
            <ol>
                <li><strong>Login</strong> to your admin dashboard using the credentials above</li>
                <li><strong>Customize</strong> your branding (logo, colors, firm information)</li>
                <li><strong>Add team members</strong> and set their roles</li>
                <li><strong>Configure</strong> your client intake forms and assessment questions</li>
                <li><strong>Test</strong> the client experience from your platform URL</li>
                <li><strong>Start capturing leads</strong> and growing your practice!</li>
            </ol>
            
            <h3>📚 Resources:</h3>
            <ul>
                <li><a href="{{setup_guide_url}}">Complete Setup Guide</a></li>
                <li><a href="{{video_tutorials_url}}">Video Tutorials</a></li>
                <li><a href="{{api_documentation_url}}">API Documentation</a></li>
                <li><a href="{{branding_guide_url}}">Branding Customization Guide</a></li>
            </ul>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4>⏰ Trial Period</h4>
                <p>Your 14-day trial period is active until <strong>{{trial_ends_date}}</strong>. After the trial, your monthly subscription of ${{monthly_fee}} will begin automatically.</p>
            </div>
            
            <p>Need help getting started? We''re here to support you!</p>
        </div>
        
        <div class="footer">
            <p>Questions? Contact us at <a href="mailto:support@assetshield.com">support@assetshield.com</a></p>
            <p>AssetShield - Professional Asset Protection Platform</p>
        </div>
    </div>
</body>
</html>',
'Welcome to AssetShield!

Hello {{lawyer_name}},

Your AssetShield {{tier}} platform for {{firm_name}} is ready!

Platform Access:
- URL: {{platform_url}}
- Email: {{admin_email}}  
- Password: {{admin_password}}
- API Key: {{api_key}}

Quick Start:
1. Login to your admin dashboard
2. Customize your branding
3. Add team members  
4. Configure client intake forms
5. Start capturing leads!

Trial Period: 14 days until {{trial_ends_date}}
Monthly Fee: ${{monthly_fee}} (starts after trial)

Need help? Contact support@assetshield.com

Best regards,
AssetShield Team', TRUE),

(NULL, 'assessment_complete', 'Asset Protection Assessment Complete', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Assessment Complete</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; color: #6b7280; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
        .risk-score { background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .risk-high { background: #fef2f2; border-left: 4px solid #ef4444; }
        .risk-medium { background: #fffbeb; border-left: 4px solid #f59e0b; }
        .risk-low { background: #f0fdf4; border-left: 4px solid #10b981; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Assessment Complete</h1>
            <p>Your asset protection risk analysis is ready</p>
        </div>
        
        <div class="content">
            <h2>Hello {{client_name}},</h2>
            
            <p>Thank you for completing your asset protection assessment with {{firm_name}}. Your results have been analyzed and are ready for review.</p>
            
            <div class="risk-score risk-{{risk_level}}">
                <h3>Your Risk Score: {{risk_score}}/100</h3>
                <p><strong>Risk Level: {{risk_level_text}}</strong></p>
            </div>
            
            <h3>Key Findings:</h3>
            {{assessment_summary}}
            
            <h3>Recommended Next Steps:</h3>
            {{recommendations}}
            
            <p>Our team has reviewed your assessment and would like to schedule a consultation to discuss your personalized asset protection strategy.</p>
            
            <a href="{{consultation_link}}" class="button">📅 Schedule Consultation</a>
            
            <p>During your consultation, we''ll discuss:</p>
            <ul>
                <li>Detailed analysis of your risk factors</li>
                <li>Customized protection strategies</li>
                <li>Implementation timeline and costs</li>
                <li>Ongoing maintenance and updates</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>{{firm_name}} | {{firm_phone}} | {{firm_email}}</p>
            <p>Professional Asset Protection Services</p>
        </div>
    </div>
</body>
</html>',
'Assessment Complete

Hello {{client_name}},

Your asset protection assessment with {{firm_name}} is complete.

Risk Score: {{risk_score}}/100
Risk Level: {{risk_level_text}}

Key Findings:
{{assessment_summary}}

Recommended Next Steps:
{{recommendations}}

Schedule your consultation: {{consultation_link}}

Contact: {{firm_name}} | {{firm_phone}} | {{firm_email}}', TRUE),

(NULL, 'consultation_reminder', 'Consultation Reminder - Tomorrow', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Consultation Reminder</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; color: #6b7280; }
        .appointment { background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Consultation Reminder</h1>
            <p>Your asset protection consultation is tomorrow</p>
        </div>
        
        <div class="content">
            <h2>Hello {{client_name}},</h2>
            
            <p>This is a friendly reminder about your upcoming asset protection consultation with {{firm_name}}.</p>
            
            <div class="appointment">
                <h3>📅 Appointment Details</h3>
                <p><strong>Date:</strong> {{consultation_date}}</p>
                <p><strong>Time:</strong> {{consultation_time}}</p>
                <p><strong>Duration:</strong> {{consultation_duration}}</p>
                <p><strong>Location:</strong> {{consultation_location}}</p>
                <p><strong>Attorney:</strong> {{attorney_name}}</p>
            </div>
            
            <h3>What to Bring:</h3>
            <ul>
                <li>List of your major assets (real estate, investments, business interests)</li>
                <li>Current insurance policies</li>
                <li>Existing estate planning documents</li>
                <li>Questions about asset protection strategies</li>
            </ul>
            
            <h3>What We''ll Cover:</h3>
            <ul>
                <li>Review of your risk assessment results</li>
                <li>Customized asset protection recommendations</li>
                <li>Implementation timeline and process</li>
                <li>Investment and ongoing costs</li>
                <li>Next steps to secure your assets</li>
            </ul>
            
            <p>Need to reschedule or have questions? Contact us immediately.</p>
        </div>
        
        <div class="footer">
            <p>{{firm_name}} | {{firm_phone}} | {{firm_email}}</p>
            <p>Professional Asset Protection Services</p>
        </div>
    </div>
</body>
</html>',
'Consultation Reminder

Hello {{client_name}},

Your asset protection consultation with {{firm_name}} is tomorrow.

Appointment Details:
- Date: {{consultation_date}}
- Time: {{consultation_time}} 
- Duration: {{consultation_duration}}
- Location: {{consultation_location}}
- Attorney: {{attorney_name}}

What to Bring:
- List of major assets
- Insurance policies
- Estate planning documents
- Your questions

Contact: {{firm_name}} | {{firm_phone}} | {{firm_email}}', TRUE);