# AssetShield Pro - Deployment Configuration

## Required Environment Variables

### Stripe Configuration (Live Mode)
```bash
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
```

### Google AdSense
```bash
GOOGLE_ADSENSE_CLIENT=ca-pub-0277917158063150
```

### Payment Configuration
```bash
STRIPE_MODE=live
CURRENCY=USD
```

## Cloudflare Pages Deployment

### 1. Via Cloudflare Dashboard
1. Go to Cloudflare Pages dashboard
2. Create new project or update existing
3. Set environment variables in Settings > Environment Variables:
   - `STRIPE_SECRET_KEY` = your live secret key
   - `STRIPE_PUBLISHABLE_KEY` = your live publishable key
   - `GOOGLE_ADSENSE_CLIENT` = ca-pub-0277917158063150

### 2. Via Wrangler CLI
```bash
# Set secrets (recommended for sensitive data)
wrangler pages secret put STRIPE_SECRET_KEY --project-name your-project
wrangler pages secret put STRIPE_PUBLISHABLE_KEY --project-name your-project

# Deploy
npm run build
wrangler pages deploy dist --project-name your-project
```

## Testing Stripe Integration

After deployment, test the checkout endpoints:

```bash
# Test Starter tier
curl -X POST https://your-domain.com/stripe-checkout/create-checkout/starter \
  -H "Content-Type: application/json" \
  -d '{"lawyerName":"Test","lawyerEmail":"test@law.com","firmName":"Test Firm","setupFee":5000,"monthlyFee":500}'

# Expected response: {"success":true,"sessionId":"cs_live_...","checkoutUrl":"https://checkout.stripe.com/..."}
```

## Features Enabled

✅ **14-Day Free Trial**: All subscriptions start with 14-day trial period
✅ **Live Stripe Integration**: Real payment processing with live API keys
✅ **Subscription Mode**: Monthly recurring billing after trial
✅ **All Tiers**: Starter ($500/mo), Professional ($1200/mo), Enterprise ($2500/mo)
✅ **Professional Demo System**: Enhanced modal-based demo requests
✅ **Risk Assessment**: Dynamic multi-step assessment form
✅ **Enhanced UX**: Professional payment modals and checkout flow

## Security Notes

- Stripe secret keys are stored as environment variables (not in code)
- All API calls use HTTPS
- Client-side never sees secret keys
- Checkout sessions are server-side generated
- GitHub push protection prevents accidental key exposure