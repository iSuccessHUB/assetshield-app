import { Hono } from 'hono'

interface CloudflareBindings {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}

export const stripeWebhookRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Stripe webhook endpoint for handling payment events
stripeWebhookRoutes.post('/webhook', async (c) => {
  try {
    const body = await c.req.text()
    const signature = c.req.header('stripe-signature')
    
    if (!signature) {
      console.error('❌ No Stripe signature header found')
      return c.json({ error: 'No signature provided' }, 400)
    }
    
    const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured')
      return c.json({ error: 'Webhook secret not configured' }, 500)
    }
    
    // Verify webhook signature (simplified for Cloudflare Workers)
    // In production, you should use the official Stripe webhook verification
    console.log('🔍 Received Stripe webhook:', {
      signature: signature.substring(0, 20) + '...',
      bodyLength: body.length,
      timestamp: new Date().toISOString()
    })
    
    // Parse the webhook event
    const event = JSON.parse(body)
    console.log('📨 Webhook event type:', event.type)
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(c, event)
        break
        
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(c, event)
        break
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(c, event)
        break
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(c, event)
        break
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(c, event)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(c, event)
        break
        
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`)
    }
    
    return c.json({ received: true })
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})

// Handle checkout session completed - setup payment succeeded
async function handleCheckoutCompleted(c: any, event: any) {
  const session = event.data.object
  console.log('✅ Checkout completed for session:', session.id)
  
  const metadata = session.metadata
  if (metadata?.type === 'platform_setup_payment') {
    console.log('🚀 Processing platform setup payment for:', metadata.firmName)
    
    // Create subscription for the customer after successful setup payment
    await createSubscriptionAfterSetup(c, session, metadata)
    
    // You could also trigger platform provisioning here
    await provisionPlatform(c, session, metadata)
  }
}

// Handle payment intent succeeded
async function handlePaymentSucceeded(c: any, event: any) {
  const paymentIntent = event.data.object
  console.log('💳 Payment succeeded:', paymentIntent.id)
  
  // Additional payment processing logic here
}

// Handle invoice payment succeeded (for subscription payments)
async function handleInvoicePaymentSucceeded(c: any, event: any) {
  const invoice = event.data.object
  console.log('📄 Invoice payment succeeded:', invoice.id)
  
  // Handle subscription payment success
  if (invoice.subscription) {
    console.log('📊 Subscription payment processed:', invoice.subscription)
    // Update platform access, send confirmation emails, etc.
  }
}

// Handle subscription created
async function handleSubscriptionCreated(c: any, event: any) {
  const subscription = event.data.object
  console.log('📅 Subscription created:', subscription.id)
  
  // Update platform status, send welcome emails, etc.
}

// Handle subscription updated
async function handleSubscriptionUpdated(c: any, event: any) {
  const subscription = event.data.object
  console.log('🔄 Subscription updated:', subscription.id)
  
  // Handle plan changes, status updates, etc.
}

// Handle subscription canceled
async function handleSubscriptionCanceled(c: any, event: any) {
  const subscription = event.data.object
  console.log('❌ Subscription canceled:', subscription.id)
  
  // Disable platform access, send cancellation confirmation, etc.
}

// Create subscription after successful setup payment
async function createSubscriptionAfterSetup(c: any, session: any, metadata: any) {
  try {
    const stripeSecretKey = c.env.STRIPE_SECRET_KEY
    
    console.log('🔄 Creating subscription for customer:', session.customer)
    
    // Define pricing based on tier
    const pricing = {
      starter: { monthly: 500 },
      professional: { monthly: 1200 },
      enterprise: { monthly: 2500 }
    }
    
    const tierPricing = pricing[metadata.tier as keyof typeof pricing]
    if (!tierPricing) {
      console.error('❌ Invalid tier:', metadata.tier)
      return
    }
    
    // Create subscription with 14-day trial
    const subscriptionData = new URLSearchParams({
      customer: session.customer,
      'items[0][price_data][currency]': 'usd',
      'items[0][price_data][unit_amount]': (tierPricing.monthly * 100).toString(),
      'items[0][price_data][recurring][interval]': 'month',
      'items[0][price_data][product_data][name]': `AssetShield ${metadata.tier.charAt(0).toUpperCase() + metadata.tier.slice(1)} Monthly`,
      'items[0][price_data][product_data][description]': `Monthly subscription for ${metadata.firmName}`,
      trial_period_days: '14',
      'metadata[tier]': metadata.tier,
      'metadata[firmName]': metadata.firmName,
      'metadata[lawyerName]': metadata.lawyerName,
      'metadata[lawyerEmail]': metadata.lawyerEmail,
      'metadata[setupPaymentSession]': session.id,
      'metadata[type]': 'platform_monthly_subscription'
    })
    
    const response = await fetch('https://api.stripe.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: subscriptionData
    })
    
    if (response.ok) {
      const subscription = await response.json()
      console.log('✅ Subscription created successfully:', subscription.id)
      
      // Store subscription info in your database here if needed
      
      return subscription
    } else {
      const error = await response.text()
      console.error('❌ Failed to create subscription:', error)
    }
    
  } catch (error) {
    console.error('❌ Error creating subscription:', error)
  }
}

// Provision platform after successful payment
async function provisionPlatform(c: any, session: any, metadata: any) {
  try {
    console.log('🚀 Provisioning platform for:', metadata.firmName)
    
    // Here you would:
    // 1. Create platform instance
    // 2. Set up white-label branding
    // 3. Configure subdomain
    // 4. Send welcome email with login credentials
    // 5. Activate features based on tier
    // 6. Create admin user account
    
    const platformConfig = {
      firmName: metadata.firmName,
      lawyerName: metadata.lawyerName,
      lawyerEmail: metadata.lawyerEmail,
      tier: metadata.tier,
      setupPaymentId: session.payment_intent,
      subscriptionStartDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      features: getFeaturesByTier(metadata.tier),
      subdomain: generateSubdomain(metadata.firmName),
      status: 'trial_active'
    }
    
    console.log('📋 Platform configuration:', platformConfig)
    
    // You would store this in your database
    // await c.env.DB.prepare(`
    //   INSERT INTO law_firms (firm_name, owner_name, owner_email, subscription_tier, features, subdomain, status, trial_ends_at)
    //   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    // `).bind(
    //   platformConfig.firmName,
    //   platformConfig.lawyerName,
    //   platformConfig.lawyerEmail,
    //   platformConfig.tier,
    //   JSON.stringify(platformConfig.features),
    //   platformConfig.subdomain,
    //   platformConfig.status,
    //   platformConfig.subscriptionStartDate
    // ).run()
    
    // Send welcome email
    await sendWelcomeEmail(platformConfig)
    
    console.log('✅ Platform provisioned successfully')
    
  } catch (error) {
    console.error('❌ Error provisioning platform:', error)
  }
}

// Get features by tier
function getFeaturesByTier(tier: string): string[] {
  const features = {
    starter: [
      'White-label branding',
      'Risk assessment tool',
      'Lead capture & management',
      'Educational content library',
      'Basic analytics dashboard',
      'Up to 100 clients/month'
    ],
    professional: [
      'Everything in Starter',
      'Advanced customization',
      'Multiple attorney accounts',
      'Document automation',
      'Advanced analytics & reporting',
      'Up to 500 clients/month'
    ],
    enterprise: [
      'Everything in Professional',
      'Multi-office deployment',
      'Custom integrations',
      'White-label mobile app',
      'Unlimited clients',
      'Dedicated account manager',
      '24/7 priority support'
    ]
  }
  
  return features[tier as keyof typeof features] || features.starter
}

// Generate subdomain from firm name
function generateSubdomain(firmName: string): string {
  return firmName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20)
    + Math.random().toString(36).substring(2, 6)
}

// Send welcome email (mock implementation)
async function sendWelcomeEmail(config: any) {
  console.log('📧 Sending welcome email to:', config.lawyerEmail)
  
  // In a real implementation, you would integrate with an email service
  // like SendGrid, Mailchimp, or AWS SES
  
  const emailContent = {
    to: config.lawyerEmail,
    subject: `Welcome to AssetShield ${config.tier.charAt(0).toUpperCase() + config.tier.slice(1)}!`,
    template: 'platform_welcome',
    data: {
      lawyerName: config.lawyerName,
      firmName: config.firmName,
      platformUrl: `https://${config.subdomain}.assetshield.app`,
      tier: config.tier,
      trialEndsAt: config.subscriptionStartDate,
      features: config.features
    }
  }
  
  console.log('📨 Welcome email prepared:', emailContent)
  // await sendEmail(emailContent)
}

// Webhook configuration endpoint
stripeWebhookRoutes.get('/config', async (c) => {
  return c.json({
    webhook_url: `${c.req.url.split('/').slice(0, 3).join('/')}/stripe-webhooks/webhook`,
    events_to_subscribe: [
      'checkout.session.completed',
      'payment_intent.succeeded',
      'invoice.payment_succeeded',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted'
    ],
    description: 'AssetShield Platform Webhook Integration',
    instructions: 'Configure this webhook URL in your Stripe Dashboard → Webhooks section'
  })
})

export default stripeWebhookRoutes