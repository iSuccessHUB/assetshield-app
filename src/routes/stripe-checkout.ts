import { Hono } from 'hono'

interface CloudflareBindings {
  DB?: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
}

export const stripeCheckoutRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Create Stripe checkout session for platform purchase
stripeCheckoutRoutes.post('/create-checkout/:tier', async (c) => {
  try {
    const tier = c.req.param('tier')
    const { 
      lawyerName, 
      lawyerEmail, 
      lawyerPhone, 
      firmName,
      setupFee,
      monthlyFee 
    } = await c.req.json()
    
    if (!lawyerName || !lawyerEmail || !firmName) {
      return c.json({ error: 'Missing required information' }, 400)
    }
    
    // Define pricing based on tier
    const pricing = {
      starter: { setup: 5000, monthly: 500 },
      professional: { setup: 10000, monthly: 1200 },
      enterprise: { setup: 25000, monthly: 2500 }
    }
    
    const tierPricing = pricing[tier as keyof typeof pricing]
    if (!tierPricing) {
      return c.json({ error: 'Invalid tier' }, 400)
    }
    
    // Create Stripe checkout session configuration
    const checkoutSession = {
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${c.req.url.split('/').slice(0, 3).join('/')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${c.req.url.split('/').slice(0, 3).join('/')}/#pricing`,
      customer_email: lawyerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: tierPricing.setup * 100, // Convert to cents
            product_data: {
              name: `AssetShield ${tier.charAt(0).toUpperCase() + tier.slice(1)} Platform`,
              description: `One-time setup fee for ${firmName}`,
              images: ['https://assetshieldapp.com/static/assetshield-logo.png']
            }
          },
          quantity: 1
        }
      ],
      metadata: {
        tier,
        lawyerName,
        lawyerEmail,
        lawyerPhone: lawyerPhone || '',
        firmName,
        setupFee: tierPricing.setup.toString(),
        monthlyFee: tierPricing.monthly.toString(),
        type: 'platform_purchase'
      },
      subscription_data: {
        items: [{
          price_data: {
            currency: 'usd',
            unit_amount: tierPricing.monthly * 100,
            recurring: { interval: 'month' },
            product_data: {
              name: `AssetShield ${tier.charAt(0).toUpperCase() + tier.slice(1)} Monthly`,
              description: `Monthly subscription for ${firmName}`
            }
          }
        }]
      }
    }
    
    // Get Stripe secret key from environment
    const stripeSecretKey = c.env.STRIPE_SECRET_KEY
    
    if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) {
      console.error('Stripe secret key not configured in environment')
      return c.json({ 
        error: 'Stripe not configured',
        details: 'Please configure STRIPE_SECRET_KEY in your deployment environment'
      }, 500)
    }
    
    // Create Stripe checkout session using fetch API
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        mode: 'subscription',
        success_url: `${c.req.url.split('/').slice(0, 3).join('/')}/stripe-checkout/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${c.req.url.split('/').slice(0, 3).join('/')}/#pricing`,
        customer_email: lawyerEmail,
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': (tierPricing.monthly * 100).toString(),
        'line_items[0][price_data][recurring][interval]': 'month',
        'line_items[0][price_data][product_data][name]': `AssetShield ${tier.charAt(0).toUpperCase() + tier.slice(1)} Platform`,
        'line_items[0][price_data][product_data][description]': `Monthly subscription for ${firmName} - includes setup and platform access`,
        'line_items[0][quantity]': '1',
        'metadata[tier]': tier,
        'metadata[lawyerName]': lawyerName,
        'metadata[lawyerEmail]': lawyerEmail,
        'metadata[lawyerPhone]': lawyerPhone || '',
        'metadata[firmName]': firmName,
        'metadata[setupFee]': tierPricing.setup.toString(),
        'metadata[monthlyFee]': tierPricing.monthly.toString(),
        'metadata[type]': 'platform_subscription_with_trial',
        'subscription_data[trial_period_days]': '14'
      })
    })
    
    if (!response.ok) {
      console.error('Stripe checkout creation error:', await response.text())
      return c.json({ error: 'Failed to create checkout session' }, 500)
    }
    
    const session = await response.json()
    
    return c.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url
    })
    
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

// Mock checkout page for demonstration
stripeCheckoutRoutes.get('/demo-checkout', async (c) => {
  const tier = c.req.query('tier')
  const firmName = c.req.query('firm')
  const email = c.req.query('email')
  const name = c.req.query('name')
  const setupFee = c.req.query('setup')
  const monthlyFee = c.req.query('monthly')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AssetShield Platform Purchase</title>
        
        <!-- Favicon -->
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        <link rel="apple-touch-icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDE4MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxODAiIGhlaWdodD0iMTgwIiByeD0iNDAiIGZpbGw9IiMyZDYzYTQiLz4KPHBhdGggZD0iTTkwIDIwTDQ1IDUwVjEwMEw5MCA2MEwxMzUgMTAwVjUwTDkwIDIwWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTkwIDQwTDY3IDYwVjEwMEw5MCAxMjBMMTEzIDEwMFY2MEw5MCA0MFoiIGZpbGw9IiMyZDYzYTQiLz4KPC9zdmc+" />
        <link rel="shortcut icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen flex items-center justify-center px-4">
            <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div class="text-center mb-8">
                    <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-shield-alt text-white text-2xl"></i>
                    </div>
                    <h1 class="text-2xl font-bold text-gray-900">Complete Your Purchase</h1>
                    <p class="text-gray-600">Secure checkout for ${firmName}</p>
                </div>
                
                <div class="border rounded-lg p-6 mb-6 bg-gray-50">
                    <h3 class="font-semibold text-gray-900 mb-4">Order Summary</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span>AssetShield ${tier?.charAt(0).toUpperCase() + tier?.slice(1)} Platform</span>
                            <span>$${setupFee}</span>
                        </div>
                        <div class="flex justify-between text-sm text-gray-600">
                            <span>Monthly Subscription (starting next month)</span>
                            <span>$${monthlyFee}/month</span>
                        </div>
                        <div class="border-t pt-3 flex justify-between font-semibold">
                            <span>Total Today</span>
                            <span>$${setupFee}</span>
                        </div>
                    </div>
                </div>
                
                <div class="mb-6">
                    <div class="flex items-center space-x-2 text-green-600 mb-2">
                        <i class="fas fa-check-circle"></i>
                        <span class="text-sm font-medium">Instant platform activation</span>
                    </div>
                    <div class="flex items-center space-x-2 text-green-600 mb-2">
                        <i class="fas fa-check-circle"></i>
                        <span class="text-sm font-medium">Custom subdomain included</span>
                    </div>
                    <div class="flex items-center space-x-2 text-green-600 mb-2">
                        <i class="fas fa-check-circle"></i>
                        <span class="text-sm font-medium">Full white-label branding</span>
                    </div>
                    <div class="flex items-center space-x-2 text-green-600">
                        <i class="fas fa-check-circle"></i>
                        <span class="text-sm font-medium">24/7 automated setup</span>
                    </div>
                </div>
                
                <!-- Mock Payment Form -->
                <form id="checkout-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                        <input type="text" value="4242 4242 4242 4242" readonly 
                               class="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600">
                        <p class="text-xs text-gray-500 mt-1">Demo mode - using test card</p>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                            <input type="text" value="12/25" readonly 
                                   class="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                            <input type="text" value="123" readonly 
                                   class="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600">
                        </div>
                    </div>
                    
                    <button type="submit" 
                            class="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="fas fa-lock mr-2"></i>
                        Complete Purchase - $${setupFee}
                    </button>
                </form>
                
                <div class="mt-6 text-center text-xs text-gray-500">
                    <i class="fas fa-shield-alt mr-1"></i>
                    Secured by Stripe • 256-bit SSL encryption
                </div>
            </div>
        </div>
        
        <script>
            document.getElementById('checkout-form').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const button = e.target.querySelector('button[type="submit"]');
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
                button.disabled = true;
                
                // Simulate payment processing
                setTimeout(async () => {
                    try {
                        // Call provisioning API
                        const response = await fetch('/provisioning/purchase/${tier}', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                lawyerName: '${name}',
                                lawyerEmail: '${email}',
                                firmName: '${firmName}',
                                setupFee: ${setupFee},
                                monthlyFee: ${monthlyFee},
                                stripePaymentIntentId: 'pi_demo_' + Date.now()
                            })
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            // Redirect to success page
                            window.location.href = '/purchase-success?firmId=' + result.lawFirmId;
                        } else {
                            throw new Error(result.error || 'Purchase failed');
                        }
                    } catch (error) {
                        alert('Error: ' + error.message);
                        button.innerHTML = originalText;
                        button.disabled = false;
                    }
                }, 2000);
            });
        </script>
    </body>
    </html>
  `)
})

// Success page after purchase
stripeCheckoutRoutes.get('/purchase-success', async (c) => {
  const firmId = c.req.query('firmId')
  
  if (!firmId) {
    return c.redirect('/')
  }
  
  const { env } = c
  
  // Get firm information
  const firmInfo = await env.DB.prepare(`
    SELECT 
      lf.*, 
      u.name as owner_name, u.email as owner_email
    FROM law_firms lf
    JOIN users u ON lf.user_id = u.id
    WHERE lf.id = ?
  `).bind(firmId).first()
  
  if (!firmInfo) {
    return c.redirect('/')
  }
  
  const branding = JSON.parse(firmInfo.branding_config || '{}')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AssetShield - Platform Ready!</title>
        
        <!-- Favicon -->
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        <link rel="apple-touch-icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDE4MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxODAiIGhlaWdodD0iMTgwIiByeD0iNDAiIGZpbGw9IiMyZDYzYTQiLz4KPHBhdGggZD0iTTkwIDIwTDQ1IDUwVjEwMEw5MCA2MEwxMzUgMTAwVjUwTDkwIDIwWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTkwIDQwTDY3IDYwVjEwMEw5MCA2MEwxMTMgMTAwVjYwTDkwIDQwWiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        <link rel="shortcut icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-green-400 to-blue-600">
        <div class="min-h-screen flex items-center justify-center px-4">
            <div class="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8 text-center">
                <div class="mb-8">
                    <div class="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-check text-white text-3xl"></i>
                    </div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">🎉 Congratulations!</h1>
                    <p class="text-xl text-gray-600">Your AssetShield platform is ready</p>
                </div>
                
                <div class="bg-blue-50 rounded-lg p-6 mb-8 text-left">
                    <h3 class="font-semibold text-gray-900 mb-4">Platform Details</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-600">Firm:</span>
                            <div class="font-medium">${firmInfo.firm_name}</div>
                        </div>
                        <div>
                            <span class="text-gray-600">Owner:</span>
                            <div class="font-medium">${firmInfo.owner_name}</div>
                        </div>
                        <div>
                            <span class="text-gray-600">Platform URL:</span>
                            <div class="font-medium text-blue-600">https://${branding.subdomain || 'demo'}.assetshield.app</div>
                        </div>
                        <div>
                            <span class="text-gray-600">Tier:</span>
                            <div class="font-medium capitalize">${firmInfo.subscription_tier}</div>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div class="text-left">
                        <h4 class="font-semibold text-gray-900 mb-3">✅ Activated Features</h4>
                        <ul class="space-y-2 text-sm text-gray-600">
                            ${JSON.parse(firmInfo.features || '[]').slice(0, 5).map(feature => 
                              `<li><i class="fas fa-check text-green-500 mr-2"></i>${feature}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    <div class="text-left">
                        <h4 class="font-semibold text-gray-900 mb-3">🚀 Next Steps</h4>
                        <ul class="space-y-2 text-sm text-gray-600">
                            <li><i class="fas fa-arrow-right text-blue-500 mr-2"></i>Access your dashboard</li>
                            <li><i class="fas fa-arrow-right text-blue-500 mr-2"></i>Customize your branding</li>
                            <li><i class="fas fa-arrow-right text-blue-500 mr-2"></i>Add team members</li>
                            <li><i class="fas fa-arrow-right text-blue-500 mr-2"></i>Start capturing leads</li>
                        </ul>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <a href="/dashboard/firm/${firmInfo.id}" 
                       class="block w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="fas fa-tachometer-alt mr-2"></i>
                        Access Your Dashboard
                    </a>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <a href="https://${branding.subdomain || 'demo'}.assetshield.app" target="_blank"
                           class="block py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">
                            <i class="fas fa-external-link-alt mr-2"></i>
                            View Your Platform
                        </a>
                        <a href="mailto:support@assetshield.com" 
                           class="block py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">
                            <i class="fas fa-envelope mr-2"></i>
                            Contact Support
                        </a>
                    </div>
                </div>
                
                <div class="mt-8 p-4 bg-yellow-50 rounded-lg text-left">
                    <h4 class="font-semibold text-yellow-800 mb-2">📧 Check Your Email</h4>
                    <p class="text-sm text-yellow-700">
                        We've sent detailed setup instructions to <strong>${firmInfo.owner_email}</strong>.
                        The email includes login credentials, customization guide, and support resources.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `)
})

export default stripeCheckoutRoutes