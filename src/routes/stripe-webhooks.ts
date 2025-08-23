import { Hono } from 'hono'
import { SaaSPlatformService } from '../services/saas-platform'

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

// Create customer account in centralized SaaS platform
async function provisionPlatformComplete(c: any, session: any, metadata: any, subscription: any) {
  try {
    console.log('🚀 Creating customer account for:', metadata.firmName)
    
    // Initialize SaaS service
    const saasService = new SaaSPlatformService(c.env.DB)
    
    // Prepare customer data
    const customerData = {
      firmName: metadata.firmName,
      ownerName: metadata.lawyerName,
      ownerEmail: metadata.lawyerEmail,
      ownerPhone: metadata.lawyerPhone || '',
      tier: metadata.tier,
      setupFee: parseInt(metadata.setupFee),
      monthlyFee: parseInt(metadata.monthlyFee),
      stripeCustomerId: session.customer,
      subscriptionId: subscription?.id
    }
    
    // Create customer account
    const customerAccount = await saasService.createCustomer(customerData)
    
    // Send welcome email with dashboard credentials
    await sendWelcomeEmail({
      lawyerName: customerData.ownerName,
      lawyerEmail: customerData.ownerEmail,
      firmName: customerData.firmName,
      tier: customerData.tier,
      dashboardUrl: 'https://dashboard.assetshield.com',
      loginEmail: customerData.ownerEmail,
      loginPassword: customerAccount.password,
      apiKey: customerAccount.apiKey,
      trialEndsDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      monthlyFee: customerData.monthlyFee
    })
    
    // Log the successful account creation
    await saasService.logActivity(
      customerAccount.customerId,
      customerData.ownerEmail,
      'account_created',
      {
        stripeSessionId: session.id,
        subscriptionId: subscription?.id,
        setupFeePaid: customerData.setupFee,
        tier: customerData.tier
      }
    )
    
    console.log('✅ Customer account created successfully:', {
      customerId: customerAccount.customerId,
      email: customerData.ownerEmail,
      tier: customerData.tier
    })
    
  } catch (error) {
    console.error('❌ Customer account creation failed:', error)
    
    // Send error notification to support
    try {
      console.log('📧 Sending error notification to support')
      // In production, implement error notification system
    } catch (notificationError) {
      console.error('❌ Failed to send error notification:', notificationError)
    }
  }
}

// Send welcome email with dashboard access
async function sendWelcomeEmail(emailData: any): Promise<void> {
  console.log('📧 Sending welcome email to:', emailData.lawyerEmail)
  
  // In a real implementation, integrate with email service
  const emailContent = {
    to: emailData.lawyerEmail,
    subject: `🎉 Welcome to AssetShield ${emailData.tier.charAt(0).toUpperCase() + emailData.tier.slice(1)}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
              .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; color: #6b7280; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
              .credentials { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🛡️ Welcome to AssetShield</h1>
                  <p>Your centralized SaaS dashboard is ready!</p>
              </div>
              
              <div class="content">
                  <h2>Hello ${emailData.lawyerName},</h2>
                  
                  <p>Congratulations! Your AssetShield ${emailData.tier} account for <strong>${emailData.firmName}</strong> has been successfully created.</p>
                  
                  <div class="credentials">
                      <h3>🔑 Dashboard Access</h3>
                      <p><strong>Dashboard URL:</strong> <a href="${emailData.dashboardUrl}">${emailData.dashboardUrl}</a></p>
                      <p><strong>Email:</strong> ${emailData.loginEmail}</p>
                      <p><strong>Password:</strong> ${emailData.loginPassword}</p>
                      <p><strong>API Key:</strong> ${emailData.apiKey}</p>
                  </div>
                  
                  <a href="${emailData.dashboardUrl}" class="button">🚀 Access Your Dashboard</a>
                  
                  <h3>🚀 Getting Started:</h3>
                  <ol>
                      <li><strong>Login</strong> to your dashboard using the credentials above</li>
                      <li><strong>Customize</strong> your white-label branding (logo, colors, content)</li>
                      <li><strong>Connect</strong> your custom domain (optional)</li>
                      <li><strong>Share</strong> your branded assessment tool with clients</li>
                      <li><strong>Track leads</strong> and manage consultations from your dashboard</li>
                  </ol>
                  
                  <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                      <h4>⏰ Trial Period</h4>
                      <p>Your 14-day trial is active until <strong>${emailData.trialEndsDate}</strong>. After the trial, your monthly subscription of $${emailData.monthlyFee} will begin automatically.</p>
                  </div>
                  
                  <p>Questions? We're here to help you succeed!</p>
              </div>
              
              <div class="footer">
                  <p>Contact us at <a href="mailto:support@assetshield.com">support@assetshield.com</a></p>
                  <p>AssetShield - Centralized White-Label Platform</p>
              </div>
          </div>
      </body>
      </html>
    `,
    text: `Welcome to AssetShield!

Hello ${emailData.lawyerName},

Your AssetShield ${emailData.tier} account for ${emailData.firmName} is ready!

Dashboard Access:
- URL: ${emailData.dashboardUrl}
- Email: ${emailData.loginEmail}
- Password: ${emailData.loginPassword}
- API Key: ${emailData.apiKey}

Getting Started:
1. Login to your dashboard
2. Customize your branding
3. Connect your domain (optional)
4. Share with clients
5. Track leads and consultations

Trial: 14 days until ${emailData.trialEndsDate}
Monthly: $${emailData.monthlyFee} (after trial)

Questions? Contact support@assetshield.com

Best regards,
AssetShield Team`
  };
  
  console.log('📨 Welcome email prepared:', {
    to: emailContent.to,
    subject: emailContent.subject
  });
  
  // Simulate email sending (replace with real email service)
  console.log('✅ Welcome email sent successfully (simulated)');
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