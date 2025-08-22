import { Hono } from 'hono'

interface CloudflareBindings {
  DB: D1Database;
}

export const provisioningRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Automated platform purchase and provisioning
provisioningRoutes.post('/purchase/:tier', async (c) => {
  try {
    const tier = c.req.param('tier')
    const { 
      lawyerName, 
      lawyerEmail, 
      lawyerPhone, 
      firmName,
      practiceAreas,
      website,
      setupFee,
      monthlyFee,
      stripePaymentIntentId 
    } = await c.req.json()
    
    if (!lawyerName || !lawyerEmail || !firmName) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    const { env } = c
    
    // 1. Create law firm owner user
    const userResult = await env.DB.prepare(`
      INSERT INTO users (email, password_hash, name, phone, user_type, role, permissions, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      lawyerEmail, 
      '$2b$10$automated_provisioning_hash', 
      lawyerName, 
      lawyerPhone || '', 
      'law_firm', 
      'admin',
      JSON.stringify(['full_access', 'user_management', 'billing', 'analytics', 'integrations']),
      1
    ).run()
    
    const userId = userResult.meta.last_row_id
    
    // 2. Generate unique subdomain for the law firm
    const subdomain = generateSubdomain(firmName)
    
    // 3. Create law firm with full platform access
    const lawFirmResult = await env.DB.prepare(`
      INSERT INTO law_firms (
        user_id, firm_name, practice_areas, website, 
        subscription_tier, subscription_status, 
        features, branding_config, contact_info, 
        is_demo, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      firmName,
      JSON.stringify(practiceAreas || ['Asset Protection']),
      website || '',
      tier,
      'active', // Immediately active after payment
      JSON.stringify(getFeaturesByTier(tier)),
      JSON.stringify({
        primary_color: '#1e40af',
        secondary_color: '#3b82f6', 
        logo_url: '/static/default-firm-logo.png',
        custom_domain: `${subdomain}.assetshield.app`,
        subdomain: subdomain
      }),
      JSON.stringify({
        address: '',
        phone: lawyerPhone || '',
        email: lawyerEmail
      }),
      0, // Not a demo - real paid account
      new Date().toISOString()
    ).run()
    
    const lawFirmId = lawFirmResult.meta.last_row_id
    
    // 4. Create headquarters office
    const officeResult = await env.DB.prepare(`
      INSERT INTO offices (
        law_firm_id, office_name, address, phone, email, 
        manager_user_id, is_headquarters, timezone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      lawFirmId,
      `${firmName} - Headquarters`,
      'Address to be updated in settings',
      lawyerPhone || '',
      lawyerEmail,
      userId,
      1,
      'America/New_York'
    ).run()
    
    const officeId = officeResult.meta.last_row_id
    
    // 5. Update user with office assignment
    await env.DB.prepare(`
      UPDATE users SET office_id = ? WHERE id = ?
    `).bind(officeId, userId).run()
    
    // 6. Record payment transaction
    await env.DB.prepare(`
      INSERT INTO payment_transactions (
        user_id, law_firm_id, stripe_payment_intent_id, 
        amount, currency, description, payment_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId, lawFirmId, stripePaymentIntentId,
      setupFee * 100, 'usd', // Convert to cents
      `${tier.charAt(0).toUpperCase() + tier.slice(1)} Platform Setup Fee`,
      'setup_fee', 'succeeded'
    ).run()
    
    // 7. Set up monthly subscription record
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    
    await env.DB.prepare(`
      INSERT INTO payment_transactions (
        user_id, law_firm_id, amount, currency, description, 
        payment_type, status, billing_period_start, billing_period_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId, lawFirmId, monthlyFee * 100, 'usd',
      `${tier.charAt(0).toUpperCase() + tier.slice(1)} Platform Monthly Subscription`,
      'subscription', 'pending',
      new Date().toISOString().split('T')[0],
      nextBillingDate.toISOString().split('T')[0]
    ).run()
    
    // 8. Create default document templates for the firm
    await createDefaultTemplates(env.DB, lawFirmId, firmName)
    
    // 9. Send welcome email and setup instructions
    await sendWelcomeEmail(lawyerEmail, lawyerName, firmName, subdomain, tier)
    
    // 10. Generate login credentials and access information
    const loginUrl = `/dashboard/firm/${lawFirmId}`
    const platformUrl = `https://${subdomain}.assetshield.app`
    
    return c.json({
      success: true,
      lawFirmId,
      userId,
      tier,
      platformAccess: {
        loginUrl,
        platformUrl,
        subdomain,
        dashboardUrl: loginUrl
      },
      billing: {
        setupFee,
        monthlyFee,
        nextBillingDate: nextBillingDate.toISOString()
      },
      features: getFeaturesByTier(tier)
    })
    
  } catch (error) {
    console.error('Platform provisioning error:', error)
    return c.json({ error: 'Failed to provision platform' }, 500)
  }
})

// Stripe webhook handler for automated payment processing
provisioningRoutes.post('/stripe/webhook', async (c) => {
  try {
    const signature = c.req.header('stripe-signature')
    const payload = await c.req.text()
    
    // In production, verify Stripe webhook signature here
    const event = JSON.parse(payload)
    
    const { env } = c
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(env.DB, event.data.object)
        break
        
      case 'invoice.payment_succeeded':
        await handleSubscriptionPayment(env.DB, event.data.object)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailure(env.DB, event.data.object)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(env.DB, event.data.object)
        break
    }
    
    return c.json({ received: true })
    
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})

// Get platform status and access information
provisioningRoutes.get('/status/:lawFirmId', async (c) => {
  try {
    const lawFirmId = c.req.param('lawFirmId')
    const { env } = c
    
    const firmInfo = await env.DB.prepare(`
      SELECT 
        lf.*, 
        u.name as owner_name, u.email as owner_email,
        o.office_name as headquarters_name
      FROM law_firms lf
      JOIN users u ON lf.user_id = u.id
      LEFT JOIN offices o ON lf.id = o.law_firm_id AND o.is_headquarters = 1
      WHERE lf.id = ?
    `).bind(lawFirmId).first()
    
    if (!firmInfo) {
      return c.json({ error: 'Law firm not found' }, 404)
    }
    
    const branding = JSON.parse(firmInfo.branding_config || '{}')
    
    return c.json({
      lawFirm: {
        id: firmInfo.id,
        name: firmInfo.firm_name,
        owner: firmInfo.owner_name,
        email: firmInfo.owner_email,
        tier: firmInfo.subscription_tier,
        status: firmInfo.subscription_status,
        features: JSON.parse(firmInfo.features || '[]'),
        platformUrl: `https://${branding.subdomain || 'demo'}.assetshield.app`,
        customDomain: branding.custom_domain,
        createdAt: firmInfo.created_at
      }
    })
    
  } catch (error) {
    console.error('Status check error:', error)
    return c.json({ error: 'Failed to check status' }, 500)
  }
})

// Helper functions
function generateSubdomain(firmName: string): string {
  // Generate a clean subdomain from firm name
  const base = firmName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20)
  
  // Add random suffix to ensure uniqueness
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

function getFeaturesByTier(tier: string): string[] {
  const features: Record<string, string[]> = {
    starter: [
      'Complete White-Label Branding',
      'Risk Assessment Tool',
      'Lead Capture & Management', 
      'Basic Analytics Dashboard',
      'Educational Content Library',
      'Up to 100 clients/month',
      'Email Support',
      'Custom Domain Setup',
      'Automated Client Onboarding'
    ],
    professional: [
      'Everything in Starter',
      'Advanced Customization',
      'Multiple Attorney Accounts',
      'Document Automation',
      'Advanced Analytics & Reporting',
      'Up to 500 clients/month',
      'Priority Support',
      'Custom Integration APIs',
      'Lead Scoring & Attribution',
      'Automated Follow-up Sequences'
    ],
    enterprise: [
      'Everything in Professional',
      'Multi-Office Deployment',
      'Custom Integrations',
      'White-Label Mobile App',
      'Unlimited Clients',
      'Dedicated Account Manager',
      '24/7 Priority Support',
      'Custom Development',
      'Advanced Compliance Features',
      'Enterprise SSO Integration'
    ]
  }
  
  return features[tier] || features.starter
}

async function createDefaultTemplates(db: D1Database, lawFirmId: number, firmName: string) {
  const templates = [
    {
      name: 'Asset Protection Consultation Letter',
      type: 'letter',
      content: `Dear {{client_name}},\n\nThank you for your interest in asset protection services from ${firmName}.\n\nBased on your risk assessment score of {{risk_score}}, we recommend the following strategies:\n\n{{recommendations}}\n\nPlease contact us to schedule your consultation.\n\nBest regards,\n{{attorney_name}}\n${firmName}`
    },
    {
      name: 'Initial Client Intake Form',
      type: 'form',
      content: 'Standard intake form template with asset protection focus...'
    },
    {
      name: 'Trust Formation Checklist',
      type: 'checklist', 
      content: 'Comprehensive checklist for trust establishment process...'
    }
  ]
  
  for (const template of templates) {
    await db.prepare(`
      INSERT INTO document_templates (
        law_firm_id, template_name, template_type, template_content,
        variables, jurisdiction, language, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      lawFirmId, template.name, template.type, template.content,
      JSON.stringify(['client_name', 'risk_score', 'recommendations', 'attorney_name']),
      'US', 'en', 1, 1 // Created by system user
    ).run()
  }
}

async function sendWelcomeEmail(email: string, name: string, firmName: string, subdomain: string, tier: string) {
  // In production, integrate with email service (SendGrid, AWS SES, etc.)
  console.log(`
    Welcome Email Sent to: ${email}
    
    Subject: Welcome to AssetShield - Your Platform is Ready!
    
    Dear ${name},
    
    Congratulations! Your ${tier} AssetShield platform for ${firmName} has been successfully provisioned and is ready to use.
    
    Platform Access:
    - URL: https://${subdomain}.assetshield.app
    - Login with your email: ${email}
    - Dashboard: Direct access to analytics and lead management
    
    Your platform includes:
    ${getFeaturesByTier(tier).map(f => `    ✓ ${f}`).join('\n')}
    
    Next Steps:
    1. Log in to your platform
    2. Customize your branding and firm information
    3. Set up your team members (Professional/Enterprise)
    4. Configure your domain and integrations
    
    Need help? Contact our support team at support@assetshield.com
    
    Welcome to AssetShield!
    The AssetShield Team
  `)
}

async function handlePaymentSuccess(db: D1Database, paymentIntent: any) {
  // Update payment status and activate platform features
  await db.prepare(`
    UPDATE payment_transactions 
    SET status = 'succeeded' 
    WHERE stripe_payment_intent_id = ?
  `).bind(paymentIntent.id).run()
}

async function handleSubscriptionPayment(db: D1Database, invoice: any) {
  // Record successful monthly payment
  console.log('Monthly subscription payment received:', invoice.id)
}

async function handlePaymentFailure(db: D1Database, invoice: any) {
  // Handle failed payment - notify firm, update status
  console.log('Payment failed for invoice:', invoice.id)
}

async function handleSubscriptionCancellation(db: D1Database, subscription: any) {
  // Deactivate platform access but preserve data
  console.log('Subscription cancelled:', subscription.id)
}

export default provisioningRoutes