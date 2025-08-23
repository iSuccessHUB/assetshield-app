// Centralized SaaS Platform Service
// Manages customers, white-label configurations, and domain mapping

interface CustomerData {
  firmName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  tier: 'starter' | 'professional' | 'enterprise';
  setupFee: number;
  monthlyFee: number;
  stripeCustomerId: string;
  subscriptionId?: string;
}

interface WhiteLabelConfig {
  customerId: number;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  firmAddress?: string;
  firmWebsite?: string;
  firmPhone?: string;
  firmDescription?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  aboutContent?: string;
  servicesContent?: string;
  featuresEnabled: string[];
  fromEmail?: string;
  replyToEmail?: string;
}

export class SaaSPlatformService {
  private db: D1Database;
  
  constructor(db: D1Database) {
    this.db = db;
  }

  // Create new customer account after payment
  async createCustomer(customerData: CustomerData): Promise<{ customerId: number; apiKey: string; password: string }> {
    console.log('🏗️ Creating customer account for:', customerData.firmName);
    
    try {
      // Generate secure password and API key
      const password = this.generateSecurePassword();
      const passwordHash = this.hashPassword(password);
      const apiKey = 'ask_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      
      // Create customer record
      const result = await this.db.prepare(`
        INSERT INTO customers (
          firm_name, owner_name, owner_email, owner_phone, password_hash, tier, status,
          trial_ends_at, stripe_customer_id, subscription_id, setup_fee_paid, monthly_fee,
          next_billing_date, api_key, api_key_created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        customerData.firmName,
        customerData.ownerName,
        customerData.ownerEmail,
        customerData.ownerPhone || '',
        passwordHash,
        customerData.tier,
        'trial',
        trialEndsAt,
        customerData.stripeCustomerId,
        customerData.subscriptionId || '',
        customerData.setupFee,
        customerData.monthlyFee,
        trialEndsAt,
        apiKey
      ).run();
      
      const customerId = result.meta.last_row_id as number;
      
      // Create default white-label configuration
      await this.createDefaultWhiteLabelConfig(customerId, customerData);
      
      // Log account creation
      await this.logActivity(customerId, customerData.ownerEmail, 'account_created', {
        tier: customerData.tier,
        setupFee: customerData.setupFee,
        monthlyFee: customerData.monthlyFee
      });
      
      console.log('✅ Customer account created:', customerId);
      
      return {
        customerId,
        apiKey,
        password
      };
      
    } catch (error) {
      console.error('❌ Failed to create customer:', error);
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }
  
  // Create default white-label configuration
  private async createDefaultWhiteLabelConfig(customerId: number, customerData: CustomerData): Promise<void> {
    const features = this.getFeaturesByTier(customerData.tier);
    
    await this.db.prepare(`
      INSERT INTO white_label_configs (
        customer_id, primary_color, secondary_color, accent_color,
        hero_title, hero_subtitle, features_enabled, from_email, reply_to_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      customerId,
      '#2563eb',
      '#1d4ed8', 
      '#10b981',
      `Protect Your Assets with ${customerData.firmName}`,
      'Professional asset protection strategies tailored for your unique situation',
      JSON.stringify(features),
      customerData.ownerEmail,
      customerData.ownerEmail
    ).run();
  }
  
  // Get customer by domain
  async getCustomerByDomain(domain: string) {
    console.log('🔍 Looking up customer by domain:', domain);
    
    const result = await this.db.prepare(`
      SELECT c.*, wl.*, cd.domain
      FROM customers c
      JOIN customer_domains cd ON c.id = cd.customer_id
      JOIN white_label_configs wl ON c.id = wl.customer_id
      WHERE cd.domain = ? AND cd.verification_status = 'verified'
    `).bind(domain).first();
    
    if (result) {
      return {
        ...result,
        features_enabled: JSON.parse(result.features_enabled || '[]')
      };
    }
    
    return null;
  }
  
  // Get customer by email (for dashboard login)
  async getCustomerByEmail(email: string) {
    const result = await this.db.prepare(`
      SELECT c.*, wl.*
      FROM customers c
      LEFT JOIN white_label_configs wl ON c.id = wl.customer_id
      WHERE c.owner_email = ?
    `).bind(email).first();
    
    if (result) {
      return {
        ...result,
        features_enabled: JSON.parse(result.features_enabled || '[]')
      };
    }
    
    return null;
  }
  
  // Authenticate customer login
  async authenticateCustomer(email: string, password: string): Promise<any | null> {
    const customer = await this.db.prepare(`
      SELECT * FROM customers WHERE owner_email = ?
    `).bind(email).first();
    
    if (customer && this.verifyPassword(password, customer.password_hash)) {
      // Update last login
      await this.db.prepare(`
        UPDATE customers SET last_login = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(customer.id).run();
      
      // Get full customer data with config
      return await this.getCustomerByEmail(email);
    }
    
    return null;
  }
  
  // Add domain to customer account
  async addCustomerDomain(customerId: number, domain: string, isPrimary: boolean = false): Promise<void> {
    console.log('🌐 Adding domain for customer:', customerId, domain);
    
    // If this is primary, unset other primary domains
    if (isPrimary) {
      await this.db.prepare(`
        UPDATE customer_domains SET is_primary = FALSE WHERE customer_id = ?
      `).bind(customerId).run();
    }
    
    await this.db.prepare(`
      INSERT INTO customer_domains (customer_id, domain, is_primary, verification_status)
      VALUES (?, ?, ?, ?)
    `).bind(customerId, domain, isPrimary, 'pending').run();
    
    await this.logActivity(customerId, null, 'domain_added', { domain, isPrimary });
  }
  
  // Verify domain ownership
  async verifyDomain(customerId: number, domain: string): Promise<boolean> {
    console.log('🔍 Verifying domain:', domain);
    
    // In a real implementation, you would:
    // 1. Check DNS records for verification
    // 2. Validate SSL certificate
    // 3. Test domain accessibility
    
    // For now, simulate successful verification
    await this.db.prepare(`
      UPDATE customer_domains 
      SET verification_status = 'verified', verified_at = CURRENT_TIMESTAMP
      WHERE customer_id = ? AND domain = ?
    `).bind(customerId, domain).run();
    
    await this.logActivity(customerId, null, 'domain_verified', { domain });
    
    return true;
  }
  
  // Update white-label configuration
  async updateWhiteLabelConfig(customerId: number, config: Partial<WhiteLabelConfig>): Promise<void> {
    console.log('🎨 Updating white-label config for customer:', customerId);
    
    const updates = [];
    const values = [];
    
    if (config.logoUrl !== undefined) {
      updates.push('logo_url = ?');
      values.push(config.logoUrl);
    }
    if (config.primaryColor) {
      updates.push('primary_color = ?');
      values.push(config.primaryColor);
    }
    if (config.secondaryColor) {
      updates.push('secondary_color = ?');
      values.push(config.secondaryColor);
    }
    if (config.accentColor) {
      updates.push('accent_color = ?');
      values.push(config.accentColor);
    }
    if (config.firmAddress !== undefined) {
      updates.push('firm_address = ?');
      values.push(config.firmAddress);
    }
    if (config.firmWebsite !== undefined) {
      updates.push('firm_website = ?');
      values.push(config.firmWebsite);
    }
    if (config.firmPhone !== undefined) {
      updates.push('firm_phone = ?');
      values.push(config.firmPhone);
    }
    if (config.firmDescription !== undefined) {
      updates.push('firm_description = ?');
      values.push(config.firmDescription);
    }
    if (config.heroTitle !== undefined) {
      updates.push('hero_title = ?');
      values.push(config.heroTitle);
    }
    if (config.heroSubtitle !== undefined) {
      updates.push('hero_subtitle = ?');
      values.push(config.heroSubtitle);
    }
    if (config.aboutContent !== undefined) {
      updates.push('about_content = ?');
      values.push(config.aboutContent);
    }
    if (config.servicesContent !== undefined) {
      updates.push('services_content = ?');
      values.push(config.servicesContent);
    }
    if (config.featuresEnabled) {
      updates.push('features_enabled = ?');
      values.push(JSON.stringify(config.featuresEnabled));
    }
    if (config.fromEmail !== undefined) {
      updates.push('from_email = ?');
      values.push(config.fromEmail);
    }
    if (config.replyToEmail !== undefined) {
      updates.push('reply_to_email = ?');
      values.push(config.replyToEmail);
    }
    
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(customerId);
      
      const query = `UPDATE white_label_configs SET ${updates.join(', ')} WHERE customer_id = ?`;
      await this.db.prepare(query).bind(...values).run();
      
      await this.logActivity(customerId, null, 'config_updated', { updates: Object.keys(config) });
    }
  }
  
  // Get customer domains
  async getCustomerDomains(customerId: number) {
    return await this.db.prepare(`
      SELECT * FROM customer_domains 
      WHERE customer_id = ? 
      ORDER BY is_primary DESC, created_at ASC
    `).bind(customerId).all();
  }
  
  // Get customer leads
  async getCustomerLeads(customerId: number, limit: number = 50, offset: number = 0) {
    return await this.db.prepare(`
      SELECT * FROM client_leads 
      WHERE customer_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(customerId, limit, offset).all();
  }
  
  // Add client lead
  async addClientLead(customerId: number, leadData: any): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO client_leads (
        customer_id, client_name, client_email, client_phone, source_domain,
        assessment_data, risk_score, risk_level, ip_address, user_agent, referrer,
        utm_source, utm_medium, utm_campaign
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      customerId,
      leadData.clientName,
      leadData.clientEmail,
      leadData.clientPhone || '',
      leadData.sourceDomain || '',
      JSON.stringify(leadData.assessmentData || {}),
      leadData.riskScore || 0,
      leadData.riskLevel || 'low',
      leadData.ipAddress || '',
      leadData.userAgent || '',
      leadData.referrer || '',
      leadData.utmSource || '',
      leadData.utmMedium || '',
      leadData.utmCampaign || ''
    ).run();
    
    const leadId = result.meta.last_row_id as number;
    
    await this.logActivity(customerId, null, 'lead_captured', {
      leadId,
      clientEmail: leadData.clientEmail,
      riskScore: leadData.riskScore
    });
    
    return leadId;
  }
  
  // Get customer analytics
  async getCustomerAnalytics(customerId: number, days: number = 30) {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const [leadCount, assessmentCount, consultationCount] = await Promise.all([
      this.db.prepare(`SELECT COUNT(*) as count FROM client_leads WHERE customer_id = ? AND created_at >= ?`).bind(customerId, sinceDate).first(),
      this.db.prepare(`SELECT COUNT(*) as count FROM client_leads WHERE customer_id = ? AND assessment_data IS NOT NULL AND assessment_data != '{}' AND created_at >= ?`).bind(customerId, sinceDate).first(),
      this.db.prepare(`SELECT COUNT(*) as count FROM client_leads WHERE customer_id = ? AND status = 'consultation_scheduled' AND created_at >= ?`).bind(customerId, sinceDate).first()
    ]);
    
    // Get risk score distribution
    const riskDistribution = await this.db.prepare(`
      SELECT risk_level, COUNT(*) as count 
      FROM client_leads 
      WHERE customer_id = ? AND created_at >= ?
      GROUP BY risk_level
    `).bind(customerId, sinceDate).all();
    
    return {
      totalLeads: leadCount.count,
      completedAssessments: assessmentCount.count,
      scheduledConsultations: consultationCount.count,
      riskDistribution: riskDistribution.results,
      period: `${days} days`
    };
  }
  
  // Utility methods
  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  
  private hashPassword(password: string): string {
    // Simple hash for demo - use proper bcrypt in production
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36) + '_' + password.length;
  }
  
  private verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }
  
  private getFeaturesByTier(tier: string): string[] {
    const features = {
      starter: [
        'White-label branding',
        'Risk assessment tool',
        'Lead capture & management',
        'Basic analytics',
        'Email templates',
        'Up to 100 leads/month'
      ],
      professional: [
        'Everything in Starter',
        'Custom domain support',
        'Advanced analytics',
        'Team member access',
        'Email automation',
        'Priority support',
        'Up to 500 leads/month'
      ],
      enterprise: [
        'Everything in Professional',
        'Multiple domains',
        'Advanced customization',
        'API access',
        'Custom integrations',
        'Dedicated support',
        'Unlimited leads'
      ]
    };
    
    return features[tier as keyof typeof features] || features.starter;
  }
  
  // Log customer activity
  async logActivity(customerId: number, userEmail: string | null, action: string, details: any, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO activity_logs (
        customer_id, user_email, action, details, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      customerId,
      userEmail,
      action,
      JSON.stringify(details),
      ipAddress || null,
      userAgent || null
    ).run();
  }
}