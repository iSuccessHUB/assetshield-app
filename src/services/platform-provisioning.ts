// Platform Provisioning Service
// Handles automated creation and configuration of white-label platforms

interface PlatformData {
  firmName: string;
  lawyerName: string;
  lawyerEmail: string;
  lawyerPhone?: string;
  tier: 'starter' | 'professional' | 'enterprise';
  setupFee: number;
  monthlyFee: number;
  stripeCustomerId: string;
  stripePaymentIntent: string;
  subscriptionId?: string;
}

interface PlatformInstance {
  id: number;
  subdomain: string;
  adminEmail: string;
  adminPassword: string;
  apiKey: string;
  setupToken: string;
  platformUrl: string;
  trialEndsAt: string;
  features: string[];
}

export class PlatformProvisioningService {
  private db: D1Database;
  
  constructor(db: D1Database) {
    this.db = db;
  }

  // Main provisioning method called by webhook
  async provisionPlatform(platformData: PlatformData): Promise<PlatformInstance> {
    console.log('🚀 Starting platform provisioning for:', platformData.firmName);
    
    try {
      // Generate unique subdomain and credentials
      const subdomain = this.generateSubdomain(platformData.firmName);
      const credentials = this.generateCredentials(platformData.lawyerEmail);
      const features = this.getFeaturesByTier(platformData.tier);
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      
      // Create platform instance in database
      const platformId = await this.createPlatformInstance(platformData, subdomain, trialEndsAt);
      
      // Create admin credentials
      await this.createPlatformCredentials(platformId, credentials);
      
      // Create default configuration
      await this.createPlatformConfiguration(platformId, platformData);
      
      // Create admin user as team member
      await this.createAdminTeamMember(platformId, platformData, credentials.passwordHash);
      
      // Set up default email templates for this platform
      await this.setupCustomEmailTemplates(platformId);
      
      console.log('✅ Platform provisioned successfully:', subdomain);
      
      return {
        id: platformId,
        subdomain,
        adminEmail: credentials.adminEmail,
        adminPassword: credentials.adminPassword,
        apiKey: credentials.apiKey,
        setupToken: credentials.setupToken,
        platformUrl: `https://${subdomain}.assetshield.app`,
        trialEndsAt,
        features
      };
      
    } catch (error) {
      console.error('❌ Platform provisioning failed:', error);
      throw new Error(`Platform provisioning failed: ${error.message}`);
    }
  }
  
  // Generate unique subdomain from firm name
  private generateSubdomain(firmName: string): string {
    const base = firmName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}${suffix}`;
  }
  
  // Generate secure credentials
  private generateCredentials(email: string) {
    const adminPassword = this.generateSecurePassword();
    const apiKey = 'ask_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const setupToken = 'stp_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    return {
      adminEmail: email,
      adminPassword,
      passwordHash: this.hashPassword(adminPassword),
      apiKey,
      setupToken
    };
  }
  
  // Generate secure password
  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  
  // Simple password hashing (in production, use bcrypt or similar)
  private hashPassword(password: string): string {
    // Simple hash for demo - use proper bcrypt in production
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36) + '_' + password.length;
  }
  
  // Get features by tier
  private getFeaturesByTier(tier: string): string[] {
    const features = {
      starter: [
        'Complete white-label branding',
        'Risk assessment tool',
        'Lead capture & management',
        'Educational content library',
        'Basic analytics dashboard',
        'Up to 100 clients/month',
        'Email support'
      ],
      professional: [
        'Everything in Starter',
        'Advanced customization',
        'Multiple attorney accounts',
        'Document automation',
        'Advanced analytics & reporting',
        'Up to 500 clients/month',
        'Priority support',
        'Custom domain support',
        'API access'
      ],
      enterprise: [
        'Everything in Professional',
        'Multi-office deployment',
        'Custom integrations',
        'White-label mobile app',
        'Unlimited clients',
        'Dedicated account manager',
        '24/7 priority support',
        'Custom development',
        'Advanced security features'
      ]
    };
    
    return features[tier as keyof typeof features] || features.starter;
  }
  
  // Create platform instance in database
  private async createPlatformInstance(data: PlatformData, subdomain: string, trialEndsAt: string): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO platform_instances (
        firm_name, subdomain, owner_email, owner_name, owner_phone, tier, status,
        trial_ends_at, stripe_customer_id, stripe_payment_intent, setup_fee_paid, monthly_fee,
        next_billing_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.firmName,
      subdomain,
      data.lawyerEmail,
      data.lawyerName,
      data.lawyerPhone || '',
      data.tier,
      'trial',
      trialEndsAt,
      data.stripeCustomerId,
      data.stripePaymentIntent,
      data.setupFee,
      data.monthlyFee,
      trialEndsAt // Next billing is after trial ends
    ).run();
    
    return result.meta.last_row_id as number;
  }
  
  // Create platform credentials
  private async createPlatformCredentials(platformId: number, credentials: any): Promise<void> {
    await this.db.prepare(`
      INSERT INTO platform_credentials (
        platform_id, admin_email, admin_password_hash, api_key, setup_token
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      platformId,
      credentials.adminEmail,
      credentials.passwordHash,
      credentials.apiKey,
      credentials.setupToken
    ).run();
  }
  
  // Create platform configuration
  private async createPlatformConfiguration(platformId: number, data: PlatformData): Promise<void> {
    const features = this.getFeaturesByTier(data.tier);
    const brandingConfig = {
      primaryColor: '#2563eb',
      secondaryColor: '#1d4ed8',
      logoUrl: null,
      firmName: data.firmName,
      customDomain: null
    };
    
    await this.db.prepare(`
      INSERT INTO platform_configurations (
        platform_id, features_enabled, branding_config
      ) VALUES (?, ?, ?)
    `).bind(
      platformId,
      JSON.stringify(features),
      JSON.stringify(brandingConfig)
    ).run();
  }
  
  // Create admin team member
  private async createAdminTeamMember(platformId: number, data: PlatformData, passwordHash: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO team_members (
        platform_id, email, name, role, status, password_hash
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      platformId,
      data.lawyerEmail,
      data.lawyerName,
      'admin',
      'active',
      passwordHash
    ).run();
  }
  
  // Set up custom email templates for the platform
  private async setupCustomEmailTemplates(platformId: number): Promise<void> {
    // Copy default templates and customize for this platform
    const defaultTemplates = await this.db.prepare(`
      SELECT template_type, subject, body_html, body_text 
      FROM email_templates 
      WHERE platform_id IS NULL AND is_default = TRUE
    `).all();
    
    for (const template of defaultTemplates.results) {
      await this.db.prepare(`
        INSERT INTO email_templates (
          platform_id, template_type, subject, body_html, body_text, is_default
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        platformId,
        template.template_type,
        template.subject,
        template.body_html,
        template.body_text,
        false
      ).run();
    }
  }
  
  // Get platform by subdomain
  async getPlatformBySubdomain(subdomain: string) {
    return await this.db.prepare(`
      SELECT p.*, c.*, conf.*
      FROM platform_instances p
      LEFT JOIN platform_credentials c ON p.id = c.platform_id
      LEFT JOIN platform_configurations conf ON p.id = conf.platform_id
      WHERE p.subdomain = ?
    `).bind(subdomain).first();
  }
  
  // Get platform by ID
  async getPlatformById(platformId: number) {
    return await this.db.prepare(`
      SELECT p.*, c.*, conf.*
      FROM platform_instances p
      LEFT JOIN platform_credentials c ON p.id = c.platform_id  
      LEFT JOIN platform_configurations conf ON p.id = conf.platform_id
      WHERE p.id = ?
    `).bind(platformId).first();
  }
  
  // Update platform status
  async updatePlatformStatus(platformId: number, status: string): Promise<void> {
    await this.db.prepare(`
      UPDATE platform_instances 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(status, platformId).run();
  }
  
  // Add team member
  async addTeamMember(platformId: number, email: string, name: string, role: string): Promise<string> {
    const invitationToken = 'inv_' + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    
    await this.db.prepare(`
      INSERT INTO team_members (
        platform_id, email, name, role, status, invitation_token, invitation_expires
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      platformId,
      email,
      name,
      role,
      'pending',
      invitationToken,
      expiresAt
    ).run();
    
    return invitationToken;
  }
  
  // Get team members
  async getTeamMembers(platformId: number) {
    return await this.db.prepare(`
      SELECT id, email, name, role, status, created_at, last_login
      FROM team_members
      WHERE platform_id = ?
      ORDER BY created_at ASC
    `).bind(platformId).all();
  }
  
  // Log activity
  async logActivity(platformId: number, userEmail: string, action: string, details: any, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO activity_logs (
        platform_id, user_email, action, details, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      platformId,
      userEmail,
      action,
      JSON.stringify(details),
      ipAddress || null,
      userAgent || null
    ).run();
  }
  
  // Get platform analytics
  async getPlatformAnalytics(platformId: number, days: number = 30) {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const [clientCount, assessmentCount, consultationCount, activityCount] = await Promise.all([
      this.db.prepare(`SELECT COUNT(*) as count FROM client_records WHERE platform_id = ? AND created_at >= ?`).bind(platformId, sinceDate).first(),
      this.db.prepare(`SELECT COUNT(*) as count FROM client_records WHERE platform_id = ? AND assessment_data IS NOT NULL AND created_at >= ?`).bind(platformId, sinceDate).first(),
      this.db.prepare(`SELECT COUNT(*) as count FROM client_records WHERE platform_id = ? AND consultation_status = 'completed' AND created_at >= ?`).bind(platformId, sinceDate).first(),
      this.db.prepare(`SELECT COUNT(*) as count FROM activity_logs WHERE platform_id = ? AND created_at >= ?`).bind(platformId, sinceDate).first()
    ]);
    
    return {
      newClients: clientCount.count,
      completedAssessments: assessmentCount.count,
      completedConsultations: consultationCount.count,
      totalActivity: activityCount.count,
      period: `${days} days`
    };
  }
}