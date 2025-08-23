// Email Service for Platform Automation
// Handles automated email sending for welcome emails, notifications, etc.

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
}

interface WelcomeEmailData {
  lawyerName: string;
  firmName: string;
  tier: string;
  platformUrl: string;
  adminEmail: string;
  adminPassword: string;
  apiKey: string;
  trialEndsDate: string;
  monthlyFee: number;
  features: string[];
}

export class EmailService {
  private db: D1Database;
  private fromEmail: string = 'welcome@isuccesshub.com';
  private supportEmail: string = 'support@isuccesshub.com';
  
  constructor(db: D1Database) {
    this.db = db;
  }
  
  // Send welcome email to new platform owner
  async sendWelcomeEmail(emailData: WelcomeEmailData): Promise<boolean> {
    console.log('📧 Sending welcome email to:', emailData.adminEmail);
    
    try {
      // Get welcome email template
      const template = await this.getEmailTemplate('welcome');
      
      // Replace template variables
      const subject = this.replaceTemplateVars(template.subject, emailData);
      const htmlBody = this.replaceTemplateVars(template.body_html, emailData);
      const textBody = this.replaceTemplateVars(template.body_text, emailData);
      
      // Send email
      await this.sendEmail({
        to: emailData.adminEmail,
        subject,
        html: htmlBody,
        text: textBody,
        from: this.fromEmail,
        replyTo: this.supportEmail
      });
      
      console.log('✅ Welcome email sent successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return false;
    }
  }
  
  // Send assessment completion email to client
  async sendAssessmentCompleteEmail(platformId: number, clientData: any): Promise<boolean> {
    console.log('📧 Sending assessment complete email to:', clientData.email);
    
    try {
      // Get platform info for branding
      const platform = await this.getPlatformInfo(platformId);
      
      // Get assessment email template
      const template = await this.getEmailTemplate('assessment_complete', platformId);
      
      // Prepare template data
      const templateData = {
        client_name: clientData.name,
        firm_name: platform.firm_name,
        firm_phone: platform.firm_phone || '(555) 123-4567',
        firm_email: platform.owner_email,
        risk_score: clientData.risk_score,
        risk_level: this.getRiskLevel(clientData.risk_score),
        risk_level_text: this.getRiskLevelText(clientData.risk_score),
        assessment_summary: clientData.assessment_summary || 'Your assessment has been completed and reviewed by our team.',
        recommendations: clientData.recommendations || 'We recommend scheduling a consultation to discuss your personalized protection strategy.',
        consultation_link: `https://${platform.subdomain}.assetshield.app/schedule-consultation?token=${clientData.consultation_token}`
      };
      
      // Replace template variables
      const subject = this.replaceTemplateVars(template.subject, templateData);
      const htmlBody = this.replaceTemplateVars(template.body_html, templateData);
      const textBody = this.replaceTemplateVars(template.body_text, templateData);
      
      // Send email
      await this.sendEmail({
        to: clientData.email,
        subject,
        html: htmlBody,
        text: textBody,
        from: `${platform.firm_name} <noreply@${platform.subdomain}.assetshield.app>`,
        replyTo: platform.owner_email
      });
      
      console.log('✅ Assessment complete email sent successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send assessment complete email:', error);
      return false;
    }
  }
  
  // Send consultation reminder email
  async sendConsultationReminder(platformId: number, clientData: any, consultationData: any): Promise<boolean> {
    console.log('📧 Sending consultation reminder to:', clientData.email);
    
    try {
      // Get platform info
      const platform = await this.getPlatformInfo(platformId);
      
      // Get reminder email template
      const template = await this.getEmailTemplate('consultation_reminder', platformId);
      
      // Prepare template data
      const templateData = {
        client_name: clientData.name,
        firm_name: platform.firm_name,
        firm_phone: platform.firm_phone || '(555) 123-4567',
        firm_email: platform.owner_email,
        consultation_date: consultationData.date,
        consultation_time: consultationData.time,
        consultation_duration: consultationData.duration || '60 minutes',
        consultation_location: consultationData.location || 'Video Conference',
        attorney_name: consultationData.attorney_name || platform.owner_name
      };
      
      // Replace template variables
      const subject = this.replaceTemplateVars(template.subject, templateData);
      const htmlBody = this.replaceTemplateVars(template.body_html, templateData);
      const textBody = this.replaceTemplateVars(template.body_text, templateData);
      
      // Send email
      await this.sendEmail({
        to: clientData.email,
        subject,
        html: htmlBody,
        text: textBody,
        from: `${platform.firm_name} <noreply@${platform.subdomain}.assetshield.app>`,
        replyTo: platform.owner_email
      });
      
      console.log('✅ Consultation reminder sent successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send consultation reminder:', error);
      return false;
    }
  }
  
  // Send team member invitation email
  async sendTeamInvitationEmail(platformId: number, invitationData: any): Promise<boolean> {
    console.log('📧 Sending team invitation to:', invitationData.email);
    
    try {
      // Get platform info
      const platform = await this.getPlatformInfo(platformId);
      
      const subject = `Invitation to join ${platform.firm_name} on AssetShield`;
      const invitationUrl = `https://${platform.subdomain}.assetshield.app/accept-invitation?token=${invitationData.token}`;
      
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Team Invitation</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; color: #6b7280; }
                .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🤝 Team Invitation</h1>
                    <p>You've been invited to join ${platform.firm_name}</p>
                </div>
                
                <div class="content">
                    <h2>Hello ${invitationData.name},</h2>
                    
                    <p>${platform.owner_name} has invited you to join <strong>${platform.firm_name}</strong> on their AssetShield platform as a <strong>${invitationData.role}</strong>.</p>
                    
                    <p>With this role, you'll be able to:</p>
                    <ul>
                        <li>Access client assessments and data</li>
                        <li>Manage consultations and follow-ups</li>
                        <li>Use the platform's asset protection tools</li>
                        <li>Collaborate with your team</li>
                    </ul>
                    
                    <a href="${invitationUrl}" class="button">Accept Invitation</a>
                    
                    <p>This invitation will expire in 7 days. If you have any questions, contact ${platform.owner_name} at ${platform.owner_email}.</p>
                </div>
                
                <div class="footer">
                    <p>${platform.firm_name} | AssetShield Platform</p>
                </div>
            </div>
        </body>
        </html>
      `;
      
      const textBody = `
        Team Invitation
        
        Hello ${invitationData.name},
        
        ${platform.owner_name} has invited you to join ${platform.firm_name} on their AssetShield platform as a ${invitationData.role}.
        
        Accept your invitation: ${invitationUrl}
        
        This invitation expires in 7 days.
        
        Questions? Contact ${platform.owner_name} at ${platform.owner_email}
        
        ${platform.firm_name} | AssetShield Platform
      `;
      
      // Send email
      await this.sendEmail({
        to: invitationData.email,
        subject,
        html: htmlBody,
        text: textBody,
        from: `${platform.firm_name} <noreply@${platform.subdomain}.assetshield.app>`,
        replyTo: platform.owner_email
      });
      
      console.log('✅ Team invitation sent successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send team invitation:', error);
      return false;
    }
  }
  
  // Get email template
  private async getEmailTemplate(type: string, platformId?: number) {
    // Try to get platform-specific template first, then fall back to default
    let template;
    
    if (platformId) {
      template = await this.db.prepare(`
        SELECT subject, body_html, body_text 
        FROM email_templates 
        WHERE platform_id = ? AND template_type = ?
      `).bind(platformId, type).first();
    }
    
    if (!template) {
      template = await this.db.prepare(`
        SELECT subject, body_html, body_text 
        FROM email_templates 
        WHERE platform_id IS NULL AND template_type = ? AND is_default = TRUE
      `).bind(type).first();
    }
    
    if (!template) {
      throw new Error(`Email template not found: ${type}`);
    }
    
    return template;
  }
  
  // Get platform info for email branding
  private async getPlatformInfo(platformId: number) {
    const platform = await this.db.prepare(`
      SELECT p.*, conf.firm_phone
      FROM platform_instances p
      LEFT JOIN platform_configurations conf ON p.id = conf.platform_id
      WHERE p.id = ?
    `).bind(platformId).first();
    
    if (!platform) {
      throw new Error(`Platform not found: ${platformId}`);
    }
    
    return platform;
  }
  
  // Replace template variables
  private replaceTemplateVars(template: string, data: any): string {
    let result = template;
    
    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    // Handle special cases
    if (data.features && Array.isArray(data.features)) {
      const featuresList = data.features
        .map(feature => `<div class="feature"><span class="feature-icon">✅</span>${feature}</div>`)
        .join('');
      result = result.replace('{{features_list}}', featuresList);
    }
    
    // Handle URLs
    result = result.replace('{{setup_guide_url}}', 'https://docs.assetshield.com/setup-guide');
    result = result.replace('{{video_tutorials_url}}', 'https://docs.assetshield.com/tutorials');
    result = result.replace('{{api_documentation_url}}', 'https://docs.assetshield.com/api');
    result = result.replace('{{branding_guide_url}}', 'https://docs.assetshield.com/branding');
    
    return result;
  }
  
  // Get risk level from score
  private getRiskLevel(score: number): string {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }
  
  // Get risk level text
  private getRiskLevelText(score: number): string {
    if (score >= 70) return 'High Risk - Immediate Action Recommended';
    if (score >= 40) return 'Medium Risk - Proactive Protection Advised';
    return 'Low Risk - Basic Protection Sufficient';
  }
  
  // Send email via external service (implement based on your email provider)
  private async sendEmail(emailData: EmailData): Promise<void> {
    console.log('📮 Sending email:', {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from
    });
    
    // In a real implementation, you would integrate with:
    // - SendGrid
    // - Mailgun  
    // - AWS SES
    // - Resend
    // - Postmark
    // etc.
    
    // For now, we'll simulate successful email sending
    // Replace this with actual email service integration
    
    /*
    // Example SendGrid integration:
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: emailData.to }]
        }],
        from: { email: emailData.from },
        reply_to: { email: emailData.replyTo },
        subject: emailData.subject,
        content: [
          { type: 'text/html', value: emailData.html },
          { type: 'text/plain', value: emailData.text }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Email sending failed: ${response.statusText}`);
    }
    */
    
    // Simulate successful sending
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✅ Email sent successfully (simulated)');
  }
  
  // Send notification email to platform admin
  async sendAdminNotification(platformId: number, subject: string, message: string): Promise<boolean> {
    try {
      const platform = await this.getPlatformInfo(platformId);
      
      await this.sendEmail({
        to: platform.owner_email,
        subject: `${platform.firm_name} - ${subject}`,
        html: `
          <h2>${subject}</h2>
          <p>${message}</p>
          <p>Platform: <a href="https://${platform.subdomain}.assetshield.app">https://${platform.subdomain}.assetshield.app</a></p>
        `,
        text: `${subject}\n\n${message}\n\nPlatform: https://${platform.subdomain}.assetshield.app`,
        from: this.supportEmail
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error);
      return false;
    }
  }
}