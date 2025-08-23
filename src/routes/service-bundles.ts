import { Hono } from 'hono'

interface CloudflareBindings {
  DB: D1Database;
}

export const serviceBundleRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Get all available service bundles
serviceBundleRoutes.get('/', async (c) => {
  try {
    const { env } = c
    const firmSize = c.req.query('firmSize')
    const budgetRange = c.req.query('budgetRange')
    
    let bundleQuery = `
      SELECT sb.*, 
             GROUP_CONCAT(s.name) as service_names,
             GROUP_CONCAT(s.description) as service_descriptions
      FROM service_bundles sb
      LEFT JOIN services s ON json_extract(sb.included_services, '$[*]') LIKE '%' || s.id || '%'
      WHERE sb.active = 1
    `
    
    // Filter by firm size if provided
    if (firmSize) {
      bundleQuery += ` AND (sb.bundle_type = '${firmSize}' OR sb.bundle_type = 'custom')`
    }
    
    bundleQuery += ` GROUP BY sb.id ORDER BY sb.bundle_price ASC`
    
    const bundles = await env.DB.prepare(bundleQuery).all()
    
    // Process bundles and add recommendations
    const processedBundles = (bundles.results || []).map((bundle: any) => ({
      id: bundle.id,
      name: bundle.name,
      description: bundle.description,
      bundleType: bundle.bundle_type,
      originalPrice: bundle.original_price,
      bundlePrice: bundle.bundle_price,
      discountPercentage: bundle.discount_percentage,
      savings: bundle.original_price - bundle.bundle_price,
      
      // Marketing features
      popular: bundle.popular === 1,
      featured: bundle.featured === 1,
      marketingTagline: bundle.marketing_tagline,
      
      // Included services
      includedServices: JSON.parse(bundle.included_services || '[]'),
      serviceNames: bundle.service_names ? bundle.service_names.split(',') : [],
      serviceDescriptions: bundle.service_descriptions ? bundle.service_descriptions.split(',') : [],
      
      // Pricing display
      priceDisplay: {
        original: formatPrice(bundle.original_price),
        bundle: formatPrice(bundle.bundle_price),
        savings: formatPrice(bundle.original_price - bundle.bundle_price),
        discountPercentage: bundle.discount_percentage
      },
      
      // Recommendations
      recommendedFor: getRecommendedFor(bundle.bundle_type, firmSize, budgetRange),
      
      // Value propositions
      valueProps: getBundleValueProps(bundle.bundle_type),
      
      // Call to action
      ctaText: getCtaText(bundle.popular, bundle.featured, bundle.discount_percentage)
    }))
    
    // Add bundle comparison data
    const comparison = generateBundleComparison(processedBundles)
    
    return c.json({
      bundles: processedBundles,
      comparison,
      recommendations: getBundleRecommendations(processedBundles, firmSize, budgetRange)
    })
    
  } catch (error) {
    console.error('Service bundles fetch error:', error)
    return c.json({ error: 'Failed to fetch service bundles' }, 500)
  }
})

// Get bundle details with personalized pricing
serviceBundleRoutes.get('/:bundleId', async (c) => {
  try {
    const bundleId = c.req.param('bundleId')
    const { env } = c
    
    // Get bundle with full service details
    const bundle = await env.DB.prepare(`
      SELECT sb.*,
             json_group_array(
               json_object(
                 'id', s.id,
                 'name', s.name,
                 'description', s.description,
                 'price', s.price,
                 'service_type', s.service_type,
                 'features', s.features
               )
             ) as services
      FROM service_bundles sb
      LEFT JOIN services s ON json_extract(sb.included_services, '$[*]') = s.id
      WHERE sb.id = ? AND sb.active = 1
      GROUP BY sb.id
    `).bind(bundleId).first()
    
    if (!bundle) {
      return c.json({ error: 'Bundle not found' }, 404)
    }
    
    // Parse services data
    const services = JSON.parse(bundle.services || '[]').filter((s: any) => s.id !== null)
    
    // Calculate detailed pricing breakdown
    const pricingBreakdown = {
      services: services.map((s: any) => ({
        name: s.name,
        originalPrice: formatPrice(s.price),
        includedInBundle: true
      })),
      totalOriginalPrice: formatPrice(bundle.original_price),
      bundlePrice: formatPrice(bundle.bundle_price),
      totalSavings: formatPrice(bundle.original_price - bundle.bundle_price),
      discountPercentage: bundle.discount_percentage
    }
    
    // Get implementation timeline
    const implementation = getBundleImplementation(bundle.bundle_type, services.length)
    
    // Get ROI projections
    const roiProjections = calculateROIProjections(bundle.bundle_type, bundle.bundle_price)
    
    const response = {
      id: bundle.id,
      name: bundle.name,
      description: bundle.description,
      bundleType: bundle.bundle_type,
      marketingTagline: bundle.marketing_tagline,
      
      // Services included
      includedServices: services,
      
      // Detailed pricing
      pricingBreakdown,
      
      // Implementation details
      implementation,
      
      // ROI and value
      roiProjections,
      
      // Features matrix
      features: getBundleFeatures(bundle.bundle_type),
      
      // Support included
      supportIncluded: getBundleSupport(bundle.bundle_type),
      
      // Frequently asked questions
      faq: getBundleFAQ(bundle.bundle_type),
      
      // Testimonials
      testimonials: getBundleTestimonials(bundle.bundle_type),
      
      // Next steps
      nextSteps: getBundleNextSteps(bundle.bundle_type)
    }
    
    return c.json(response)
    
  } catch (error) {
    console.error('Bundle details error:', error)
    return c.json({ error: 'Failed to fetch bundle details' }, 500)
  }
})

// Create custom bundle quote
serviceBundleRoutes.post('/custom-quote', async (c) => {
  try {
    const { firmProfile, selectedServices, customRequirements } = await c.req.json()
    const { env } = c
    
    // Validate firm profile
    if (!firmProfile.companyName || !firmProfile.email) {
      return c.json({ error: 'Company name and email are required' }, 400)
    }
    
    // Get services pricing
    let totalPrice = 0
    const serviceDetails = []
    
    for (const serviceId of selectedServices) {
      const service = await env.DB.prepare(`
        SELECT * FROM services WHERE id = ?
      `).bind(serviceId).first()
      
      if (service) {
        serviceDetails.push(service)
        totalPrice += service.price
      }
    }
    
    // Calculate custom bundle discount based on firm size and total value
    const customDiscount = calculateCustomDiscount(firmProfile.firmSize, totalPrice, selectedServices.length)
    const bundlePrice = Math.round(totalPrice * (1 - customDiscount.percentage / 100))
    
    // Create custom quote record
    const quoteResult = await env.DB.prepare(`
      INSERT INTO custom_quotes (
        company_name, contact_email, firm_size, practice_areas,
        selected_services, custom_requirements, original_price,
        quoted_price, discount_percentage, status, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      firmProfile.companyName,
      firmProfile.email,
      firmProfile.firmSize,
      JSON.stringify(firmProfile.practiceAreas || []),
      JSON.stringify(selectedServices),
      customRequirements || '',
      totalPrice,
      bundlePrice,
      customDiscount.percentage,
      'pending',
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days validity
    ).run()
    
    const quoteId = quoteResult.meta.last_row_id
    
    // Generate quote proposal
    const proposal = {
      quoteId,
      companyName: firmProfile.companyName,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      
      // Pricing summary
      pricing: {
        originalPrice: formatPrice(totalPrice),
        quotedPrice: formatPrice(bundlePrice),
        totalSavings: formatPrice(totalPrice - bundlePrice),
        discountPercentage: customDiscount.percentage,
        reason: customDiscount.reason
      },
      
      // Services included
      includedServices: serviceDetails.map(s => ({
        name: s.name,
        description: s.description,
        originalPrice: formatPrice(s.price),
        features: JSON.parse(s.features || '[]')
      })),
      
      // Custom requirements addressed
      customSolutions: generateCustomSolutions(customRequirements, firmProfile.firmSize),
      
      // Implementation plan
      implementationPlan: generateImplementationPlan(serviceDetails, firmProfile.firmSize),
      
      // Value proposition
      valueProposition: generateValueProposition(firmProfile, bundlePrice, totalPrice - bundlePrice),
      
      // Next steps
      nextSteps: [
        'Review the detailed proposal',
        'Schedule a consultation to discuss implementation',
        'Finalize contract and payment terms',
        'Begin onboarding and setup process'
      ]
    }
    
    return c.json(proposal)
    
  } catch (error) {
    console.error('Custom quote error:', error)
    return c.json({ error: 'Failed to generate custom quote' }, 500)
  }
})

// Purchase bundle
serviceBundleRoutes.post('/purchase/:bundleId', async (c) => {
  try {
    const bundleId = c.req.param('bundleId')
    const { userId, paymentMethodId, promoCode } = await c.req.json()
    const { env } = c
    
    // Get bundle details
    const bundle = await env.DB.prepare(`
      SELECT * FROM service_bundles WHERE id = ? AND active = 1
    `).bind(bundleId).first()
    
    if (!bundle) {
      return c.json({ error: 'Bundle not found' }, 404)
    }
    
    // Apply promo code if provided
    let finalPrice = bundle.bundle_price
    let promoDiscount = 0
    
    if (promoCode) {
      const promo = await validatePromoCode(env.DB, promoCode, bundle.bundle_price)
      if (promo.valid) {
        promoDiscount = promo.discount
        finalPrice = bundle.bundle_price - promo.discount
      }
    }
    
    // Record bundle purchase
    const purchaseResult = await env.DB.prepare(`
      INSERT INTO user_bundle_purchases (
        user_id, bundle_id, purchase_price, discount_applied,
        status, stripe_payment_intent_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      bundleId,
      finalPrice,
      promoDiscount,
      'active',
      paymentMethodId // In real implementation, this would be from Stripe
    ).run()
    
    // Add individual services to user account
    const includedServices = JSON.parse(bundle.included_services || '[]')
    for (const serviceId of includedServices) {
      await env.DB.prepare(`
        INSERT INTO user_services (
          user_id, service_id, status, purchase_source, access_level
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        userId,
        serviceId,
        'active',
        'bundle',
        getBundleAccessLevel(bundle.bundle_type)
      ).run()
    }
    
    return c.json({
      success: true,
      purchaseId: purchaseResult.meta.last_row_id,
      bundleName: bundle.name,
      finalPrice: formatPrice(finalPrice),
      savings: formatPrice((bundle.original_price - finalPrice)),
      activationDate: new Date().toISOString(),
      message: 'Bundle activated successfully!'
    })
    
  } catch (error) {
    console.error('Bundle purchase error:', error)
    return c.json({ error: 'Failed to process bundle purchase' }, 500)
  }
})

// Helper Functions

function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toLocaleString()}`
}

function getRecommendedFor(bundleType: string, firmSize?: string, budgetRange?: string): string {
  const recommendations: Record<string, string> = {
    starter: 'Solo practitioners and small firms starting their asset protection practice',
    professional: 'Established firms ready to scale their client base and increase revenue',
    enterprise: 'Large firms and multi-office practices requiring comprehensive solutions',
    custom: 'Firms with specific requirements or unique practice areas'
  }
  
  return recommendations[bundleType] || 'All firm sizes'
}

function getBundleValueProps(bundleType: string): string[] {
  const valueProps: Record<string, string[]> = {
    starter: [
      'Complete white-label platform ready in 48 hours',
      'No setup fees or hidden costs',
      'Proven to increase qualified leads by 200%+',
      'Full training and onboarding included'
    ],
    professional: [
      'Advanced automation saves 15+ hours per week',
      'Multi-attorney dashboard for team collaboration',
      'Priority support with dedicated success manager',
      'Custom integrations with existing systems'
    ],
    enterprise: [
      'Multi-office deployment and management',
      'Unlimited user accounts and client capacity',
      'Custom development and feature requests',
      '24/7 priority support with SLA guarantees'
    ],
    custom: [
      'Tailored solution for your specific needs',
      'Flexible pricing based on your requirements',
      'Direct access to our development team',
      'Ongoing customization and feature development'
    ]
  }
  
  return valueProps[bundleType] || []
}

function getCtaText(popular: boolean, featured: boolean, discountPercentage: number): string {
  if (featured) return 'Start Free Trial'
  if (popular) return 'Most Popular - Get Started'
  if (discountPercentage > 20) return `Save ${discountPercentage}% - Limited Time`
  return 'Get Started'
}

function generateBundleComparison(bundles: any[]): any {
  if (bundles.length === 0) return {}
  
  // Create feature comparison matrix
  const allFeatures = new Set<string>()
  bundles.forEach(bundle => {
    bundle.valueProps.forEach((prop: string) => allFeatures.add(prop))
  })
  
  return {
    features: Array.from(allFeatures),
    matrix: bundles.map(bundle => ({
      bundleId: bundle.id,
      name: bundle.name,
      price: bundle.priceDisplay.bundle,
      features: Array.from(allFeatures).map(feature => 
        bundle.valueProps.includes(feature)
      )
    }))
  }
}

function getBundleRecommendations(bundles: any[], firmSize?: string, budgetRange?: string): any {
  let recommended = bundles.find(b => b.popular) || bundles[0]
  
  // Adjust recommendation based on firm profile
  if (firmSize === 'solo' || budgetRange === 'under-5k') {
    recommended = bundles.find(b => b.bundleType === 'starter') || bundles[0]
  } else if (firmSize === 'large' || budgetRange === '50k+') {
    recommended = bundles.find(b => b.bundleType === 'enterprise') || bundles[bundles.length - 1]
  }
  
  return {
    recommended: recommended.id,
    reason: `Best fit for ${firmSize || 'your'} firm size and ${budgetRange || 'budget'} range`,
    alternatives: bundles.filter(b => b.id !== recommended.id).slice(0, 2).map(b => ({
      id: b.id,
      name: b.name,
      reason: b.bundleType === 'starter' ? 'More budget-friendly option' : 'More comprehensive solution'
    }))
  }
}

function getBundleImplementation(bundleType: string, serviceCount: number): any {
  const baseTimeline = {
    starter: { setup: '24-48 hours', training: '2 hours', golive: '3-5 days' },
    professional: { setup: '3-5 days', training: '4 hours', golive: '1-2 weeks' },
    enterprise: { setup: '1-2 weeks', training: '8 hours', golive: '2-4 weeks' },
    custom: { setup: '2-4 weeks', training: '8+ hours', golive: '4-6 weeks' }
  }
  
  return {
    timeline: baseTimeline[bundleType] || baseTimeline.starter,
    phases: [
      { name: 'Setup & Configuration', duration: baseTimeline[bundleType]?.setup },
      { name: 'Training & Onboarding', duration: baseTimeline[bundleType]?.training },
      { name: 'Testing & Go-Live', duration: baseTimeline[bundleType]?.golive }
    ],
    requirements: [
      'Access to firm branding assets (logo, colors)',
      'List of practice areas and service offerings',
      'Integration requirements (if any)',
      'Team member contact information'
    ]
  }
}

function calculateROIProjections(bundleType: string, bundlePrice: number): any {
  const monthlyPrice = bundlePrice / 100 / 12 // Convert to monthly cost
  
  const projections = {
    starter: { leadsIncrease: 200, conversionRate: 15, avgClientValue: 5000 },
    professional: { leadsIncrease: 400, conversionRate: 20, avgClientValue: 7500 },
    enterprise: { leadsIncrease: 800, conversionRate: 25, avgClientValue: 10000 }
  }
  
  const projection = projections[bundleType] || projections.starter
  const monthlyNewRevenue = (projection.leadsIncrease / 12) * (projection.conversionRate / 100) * projection.avgClientValue
  const roi = ((monthlyNewRevenue - monthlyPrice) / monthlyPrice) * 100
  
  return {
    monthlyInvestment: formatPrice(monthlyPrice * 100),
    projectedMonthlyRevenue: formatPrice(monthlyNewRevenue * 100),
    monthlyROI: Math.round(roi),
    paybackPeriod: Math.ceil(monthlyPrice / (monthlyNewRevenue - monthlyPrice)),
    annualROI: formatPrice((monthlyNewRevenue * 12 - bundlePrice) * 100)
  }
}

function getBundleFeatures(bundleType: string): any {
  // This would return a comprehensive feature matrix
  return {
    coreFeatures: ['Risk Assessment', 'Lead Management', 'Analytics'],
    advancedFeatures: bundleType === 'starter' ? [] : ['Document Automation', 'Multi-user Access'],
    enterpriseFeatures: bundleType === 'enterprise' ? ['Custom Development', 'API Access'] : []
  }
}

function getBundleSupport(bundleType: string): any {
  const support = {
    starter: { type: 'Email', response: '24-48 hours', training: '2 hours' },
    professional: { type: 'Phone + Email', response: '4-8 hours', training: '4 hours' },
    enterprise: { type: '24/7 Priority', response: '1 hour', training: 'Unlimited' }
  }
  
  return support[bundleType] || support.starter
}

function getBundleFAQ(bundleType: string): any[] {
  return [
    {
      question: 'How quickly can we get started?',
      answer: `Setup typically takes ${bundleType === 'starter' ? '24-48 hours' : '3-5 business days'} depending on your requirements.`
    },
    {
      question: 'Can we customize the platform?',
      answer: bundleType === 'enterprise' ? 'Yes, full customization and white-labeling included.' : 'Basic customization included, advanced options available.'
    },
    {
      question: 'What training is provided?',
      answer: `We provide comprehensive training including ${getBundleSupport(bundleType).training} of personalized sessions.`
    }
  ]
}

function getBundleTestimonials(bundleType: string): any[] {
  const testimonials = {
    starter: [
      { name: 'John Smith, Solo Practitioner', quote: 'Increased my leads by 250% in just 3 months.' }
    ],
    professional: [
      { name: 'Sarah Johnson, Managing Partner', quote: 'Our team productivity increased by 40% with the automation features.' }
    ],
    enterprise: [
      { name: 'Michael Chen, Multi-Office Firm', quote: 'The enterprise solution scaled perfectly across our 8 offices.' }
    ]
  }
  
  return testimonials[bundleType] || testimonials.starter
}

function getBundleNextSteps(bundleType: string): string[] {
  const baseSteps = [
    'Schedule a personalized demo',
    'Discuss your specific requirements',
    'Review implementation timeline'
  ]
  
  if (bundleType === 'enterprise') {
    baseSteps.push('Meet with our technical team', 'Plan custom integrations')
  } else {
    baseSteps.push('Finalize setup details', 'Begin onboarding process')
  }
  
  return baseSteps
}

function calculateCustomDiscount(firmSize: string, totalPrice: number, serviceCount: number): any {
  let percentage = 0
  let reason = ''
  
  // Base discount for multiple services
  if (serviceCount >= 3) {
    percentage += 10
    reason += 'Multi-service bundle discount. '
  }
  
  // Firm size discount
  if (firmSize === 'large') {
    percentage += 15
    reason += 'Large firm volume discount. '
  } else if (firmSize === 'medium') {
    percentage += 10
    reason += 'Medium firm discount. '
  }
  
  // High-value discount
  if (totalPrice > 50000) {
    percentage += 10
    reason += 'High-value package discount.'
  }
  
  return {
    percentage: Math.min(percentage, 35), // Cap at 35% total discount
    reason: reason.trim() || 'Custom package pricing'
  }
}

function generateCustomSolutions(requirements: string, firmSize: string): string[] {
  const solutions = [
    'Tailored onboarding process for your firm size',
    'Custom branding and white-labeling',
    'Integration with your existing systems'
  ]
  
  if (requirements.includes('multi-office')) {
    solutions.push('Multi-office deployment and management')
  }
  
  if (requirements.includes('custom')) {
    solutions.push('Custom feature development')
  }
  
  return solutions
}

function generateImplementationPlan(services: any[], firmSize: string): any {
  const phases = [
    { name: 'Discovery & Planning', duration: '1 week', tasks: ['Requirements gathering', 'System analysis'] },
    { name: 'Setup & Configuration', duration: '1-2 weeks', tasks: ['Platform configuration', 'Branding setup'] },
    { name: 'Training & Testing', duration: '1 week', tasks: ['Team training', 'User acceptance testing'] },
    { name: 'Go-Live & Support', duration: 'Ongoing', tasks: ['Launch support', 'Performance monitoring'] }
  ]
  
  return { phases, totalDuration: '4-6 weeks', teamSize: firmSize === 'large' ? '3-4 people' : '1-2 people' }
}

function generateValueProposition(firmProfile: any, bundlePrice: number, savings: number): any {
  return {
    investment: formatPrice(bundlePrice),
    savings: formatPrice(savings),
    roi: {
      monthly: 'Break-even in 30-60 days',
      annual: '300-500% ROI typical for similar firms'
    },
    benefits: [
      `Estimated ${firmProfile.firmSize === 'large' ? '500+' : '200+'} additional qualified leads per year`,
      'Reduced manual work and increased efficiency',
      'Professional platform increases client trust and conversion'
    ]
  }
}

async function validatePromoCode(db: D1Database, promoCode: string, bundlePrice: number): Promise<any> {
  // This would validate promo codes against a database table
  const validCodes = {
    'EARLY20': { discount: bundlePrice * 0.20, valid: true },
    'NEWCLIENT': { discount: bundlePrice * 0.15, valid: true }
  }
  
  return validCodes[promoCode] || { valid: false, discount: 0 }
}

function getBundleAccessLevel(bundleType: string): string {
  const levels = {
    starter: 'basic',
    professional: 'premium',
    enterprise: 'enterprise',
    custom: 'premium'
  }
  
  return levels[bundleType] || 'basic'
}

export default serviceBundleRoutes