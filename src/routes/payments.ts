import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Real Stripe integration with live API keys

// Create payment intent for services
app.post('/create-intent', async (c) => {
  try {
    const { amount, serviceType, userId } = await c.req.json()
    
    if (!amount || !serviceType || !userId) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    // Create real Stripe payment intent
    const stripeSecretKey = c.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return c.json({ error: 'Stripe not configured' }, 500)
    }
    
    // Create Stripe payment intent using fetch API (Cloudflare Workers compatible)
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency: 'usd',
        'metadata[serviceType]': serviceType,
        'metadata[userId]': userId.toString(),
        'automatic_payment_methods[enabled]': 'true'
      })
    })
    
    if (!response.ok) {
      console.error('Stripe API error:', await response.text())
      return c.json({ error: 'Failed to create payment intent' }, 500)
    }
    
    const paymentIntent = await response.json()
    
    // Save payment record (only if database is available)
    const { env } = c
    if (env.DB) {
      try {
        await env.DB.prepare(
          `INSERT INTO payments (user_id, stripe_payment_intent_id, amount, currency, payment_type, service_type, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          userId,
          paymentIntent.id,
          amount,
          'usd',
          'service',
          serviceType,
          'pending'
        ).run()
      } catch (dbError) {
        console.error('Database error:', dbError)
        // Continue without database logging for now
      }
    }
    
    return c.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })
    
  } catch (error) {
    console.error('Payment intent creation error:', error)
    return c.json({ error: 'Failed to create payment intent' }, 500)
  }
})

// Create setup fee payment for law firms
app.post('/setup-fee', async (c) => {
  try {
    const { tier, userId } = await c.req.json()
    
    if (!tier || !userId) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    // Setup fee amounts
    const setupFees = {
      starter: 500000,     // $5,000 
      professional: 1000000, // $10,000
      enterprise: 2500000,    // $25,000
      custom: 1500000       // $15,000
    }
    
    const amount = setupFees[tier as keyof typeof setupFees]
    if (!amount) {
      return c.json({ error: 'Invalid tier' }, 400)
    }
    
    // Create real Stripe payment intent for setup fee
    const stripeSecretKey = c.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return c.json({ error: 'Stripe not configured' }, 500)
    }
    
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency: 'usd',
        'metadata[tier]': tier,
        'metadata[userId]': userId.toString(),
        'metadata[type]': 'setup_fee',
        'automatic_payment_methods[enabled]': 'true'
      })
    })
    
    if (!response.ok) {
      console.error('Stripe API error:', await response.text())
      return c.json({ error: 'Failed to create payment intent' }, 500)
    }
    
    const paymentIntent = await response.json()
    
    // Save payment record (only if database is available) 
    const { env } = c
    if (env.DB) {
      try {
        await env.DB.prepare(
          `INSERT INTO payments (user_id, stripe_payment_intent_id, amount, currency, payment_type, service_type, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          userId,
          paymentIntent.id,
          amount,
          'usd',
          'setup_fee',
          tier,
          'pending'
        ).run()
      } catch (dbError) {
        console.error('Database error:', dbError)
        // Continue without database logging for now
      }
    }
    
    return c.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount
    })
    
  } catch (error) {
    console.error('Setup fee payment error:', error)
    return c.json({ error: 'Failed to create setup fee payment' }, 500)
  }
})

// Webhook handler for Stripe events
app.post('/webhook', async (c) => {
  try {
    // In a real implementation, you would verify the webhook signature
    // const sig = c.req.header('stripe-signature')
    // const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET
    const event = await c.req.json()
    
    console.log('Stripe webhook event:', event.type, event.data?.object?.id)
    
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      
      // Update payment status (only if database is available)
      const { env } = c
      if (env.DB) {
        try {
          await env.DB.prepare(
            'UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE stripe_payment_intent_id = ?'
          ).bind('succeeded', paymentIntent.id).run()
          
          // If it's a setup fee, activate the law firm subscription
          const payment = await env.DB.prepare(
            'SELECT * FROM payments WHERE stripe_payment_intent_id = ?'
          ).bind(paymentIntent.id).first()
          
          if (payment && payment.payment_type === 'setup_fee') {
            await env.DB.prepare(
              'UPDATE law_firms SET setup_fee_paid = TRUE, subscription_status = "active" WHERE user_id = ?'
            ).bind(payment.user_id).run()
          }
        } catch (dbError) {
          console.error('Database update error:', dbError)
        }
      }
    }
    
    return c.json({ received: true })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})

// Get payment status
app.get('/status/:paymentIntentId', async (c) => {
  try {
    const paymentIntentId = c.req.param('paymentIntentId')
    const { env } = c
    
    const payment = await env.DB.prepare(
      'SELECT * FROM payments WHERE stripe_payment_intent_id = ?'
    ).bind(paymentIntentId).first()
    
    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404)
    }
    
    return c.json({
      status: payment.status,
      amount: payment.amount,
      paymentType: payment.payment_type,
      serviceType: payment.service_type
    })
    
  } catch (error) {
    console.error('Payment status error:', error)
    return c.json({ error: 'Failed to get payment status' }, 500)
  }
})

// Create premium upgrade payment (includes ad removal)
app.post('/premium-upgrade', async (c) => {
  try {
    const { userId, plan = 'premium' } = await c.req.json()
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    
    // Ensure user exists in database (create guest user if needed)
    const { env } = c
    let user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
    
    if (!user) {
      // Create a guest user for premium upgrade
      const result = await env.DB.prepare(
        `INSERT INTO users (id, email, name, user_type, created_at) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
      ).bind(userId, `guest_${userId}@assetshield.temp`, `Guest User ${userId}`, 'customer').run()
      
      if (!result.success) {
        return c.json({ error: 'Failed to create user record' }, 500)
      }
    }
    
    // Premium plan pricing (in cents for Stripe)
    const premiumPlans = {
      basic: { amount: 2999, name: 'Basic Premium', description: 'Ad removal + basic features' },
      premium: { amount: 4999, name: 'Premium', description: 'Ad removal + all premium features' },
      complete: { amount: 9999, name: 'Complete', description: 'Ad removal + complete access + priority support' }
    }
    
    const selectedPlan = premiumPlans[plan] || premiumPlans.premium
    
    // Create real Stripe Payment Intent
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: selectedPlan.amount.toString(),
        currency: 'usd',
        'metadata[userId]': userId,
        'metadata[plan]': plan,
        'metadata[planName]': selectedPlan.name,
        'metadata[serviceType]': 'ad_free_premium',
        description: `AssetShield Premium Upgrade - ${selectedPlan.name}`,
      }).toString()
    })
    
    if (!stripeResponse.ok) {
      const error = await stripeResponse.text()
      console.error('Stripe API error:', error)
      return c.json({ error: 'Failed to create payment intent with Stripe' }, 500)
    }
    
    const paymentIntent = await stripeResponse.json()
    
    // Save payment record with premium upgrade details
    await env.DB.prepare(
      `INSERT INTO payments (user_id, stripe_payment_intent_id, amount, currency, payment_type, service_type, status, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      userId,
      paymentIntent.id,
      selectedPlan.amount,
      'usd',
      'premium_upgrade',
      'ad_free_premium',
      'pending',
      JSON.stringify({
        plan,
        features: ['ad_removal', 'premium_features', 'priority_support'],
        planName: selectedPlan.name,
        planDescription: selectedPlan.description
      })
    ).run()
    
    return c.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: selectedPlan.amount,
      plan: selectedPlan,
      features: [
        'Complete ad removal across all sections',
        'Priority customer support', 
        'Advanced assessment features',
        'Exclusive legal document templates',
        'Direct attorney consultation access',
        'Premium educational content',
        'Enhanced privacy protection'
      ]
    })
    
  } catch (error) {
    console.error('Premium upgrade payment error:', error)
    return c.json({ error: 'Failed to create premium upgrade payment' }, 500)
  }
})

// Process premium upgrade success
app.post('/premium-upgrade/success', async (c) => {
  try {
    const { paymentIntentId, userId } = await c.req.json()
    
    if (!paymentIntentId || !userId) {
      return c.json({ error: 'Payment intent ID and user ID are required' }, 400)
    }
    
    const { env } = c
    
    // Update payment status
    await env.DB.prepare(
      'UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE stripe_payment_intent_id = ? AND user_id = ?'
    ).bind('succeeded', paymentIntentId, userId).run()
    
    // Get payment details
    const payment = await env.DB.prepare(
      'SELECT * FROM payments WHERE stripe_payment_intent_id = ? AND user_id = ?'
    ).bind(paymentIntentId, userId).first()
    
    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404)
    }
    
    const metadata = JSON.parse(payment.metadata || '{}')
    const plan = metadata.plan || 'premium'
    
    // Create or update user service record for premium access
    await env.DB.prepare(`
      INSERT OR REPLACE INTO user_services 
      (user_id, service_type, access_level, status, payment_id, purchase_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      userId,
      'ad_free_premium',
      plan, // 'basic', 'premium', or 'complete'
      'active',
      payment.id
    ).run()
    
    return c.json({
      success: true,
      message: 'Premium upgrade successful! Ads have been removed.',
      plan,
      features: metadata.features || [],
      adFreeActivated: true
    })
    
  } catch (error) {
    console.error('Premium upgrade success processing error:', error)
    return c.json({ error: 'Failed to process premium upgrade' }, 500)
  }
})

export { app as paymentRoutes }