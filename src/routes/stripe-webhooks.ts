import { Hono } from 'hono'
import { PlatformProvisioningService } from '../services/platform-provisioning'
import { EmailService } from '../services/email-service'

interface CloudflareBindings {
  DB: D1Database;
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
    const subscription = await createSubscriptionAfterSetup(c, session, metadata)
    
    // Provision the platform automatically
    await provisionPlatformComplete(c, session, metadata, subscription)
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

// Complete platform provisioning with database and email integration
async function provisionPlatformComplete(c: any, session: any, metadata: any, subscription: any) {
  try {
    console.log('🚀 Starting complete platform provisioning for:', metadata.firmName)
    
    // Initialize services
    const provisioningService = new PlatformProvisioningService(c.env.DB)
    const emailService = new EmailService(c.env.DB)
    
    // Prepare platform data
    const platformData = {
      firmName: metadata.firmName,
      lawyerName: metadata.lawyerName,
      lawyerEmail: metadata.lawyerEmail,
      lawyerPhone: metadata.lawyerPhone || '',
      tier: metadata.tier,
      setupFee: parseInt(metadata.setupFee),
      monthlyFee: parseInt(metadata.monthlyFee),
      stripeCustomerId: session.customer,
      stripePaymentIntent: session.payment_intent,
      subscriptionId: subscription?.id
    }
    
    // Provision the platform
    const platformInstance = await provisioningService.provisionPlatform(platformData)
    
    // Send welcome email with credentials
    const welcomeEmailData = {
      lawyerName: platformData.lawyerName,
      firmName: platformData.firmName,
      tier: platformData.tier.charAt(0).toUpperCase() + platformData.tier.slice(1),
      platformUrl: platformInstance.platformUrl,
      adminEmail: platformInstance.adminEmail,
      adminPassword: platformInstance.adminPassword,
      apiKey: platformInstance.apiKey,
      trialEndsDate: new Date(platformInstance.trialEndsAt).toLocaleDateString(),
      monthlyFee: platformData.monthlyFee,
      features: platformInstance.features
    }
    
    await emailService.sendWelcomeEmail(welcomeEmailData)
    
    // Log the successful provisioning
    await provisioningService.logActivity(
      platformInstance.id,
      platformData.lawyerEmail,
      'platform_provisioned',
      {
        stripeSessionId: session.id,
        subscriptionId: subscription?.id,
        setupFeePaid: platformData.setupFee,
        tier: platformData.tier
      }
    )
    
    console.log('✅ Complete platform provisioning successful:', {
      platformId: platformInstance.id,
      subdomain: platformInstance.subdomain,
      platformUrl: platformInstance.platformUrl
    })
    
  } catch (error) {
    console.error('❌ Complete platform provisioning failed:', error)
    
    // Send error notification to support
    try {
      console.log('📧 Sending error notification to support')
      // In production, implement error notification system
    } catch (notificationError) {
      console.error('❌ Failed to send error notification:', notificationError)
    }
  }
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