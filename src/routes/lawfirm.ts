import { Hono } from 'hono'
import type { CloudflareBindings, LawFirm, Lead, DemoRequest, User } from '../types'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Register law firm
app.post('/register', async (c) => {
  try {
    const { email, name, phone, firmName, practiceAreas, website, tier } = await c.req.json()
    
    if (!email || !name || !firmName || !tier) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    const { env } = c
    
    // Check if user exists
    let user = await env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first<User>()
    
    if (!user) {
      const userResult = await env.DB.prepare(
        'INSERT INTO users (email, name, phone, user_type) VALUES (?, ?, ?, ?)'
      ).bind(email, name, phone || null, 'law_firm').run()
      
      user = {
        id: userResult.meta.last_row_id as number,
        email,
        name,
        phone: phone || '',
        user_type: 'law_firm',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    
    // Create law firm record
    const lawFirmResult = await env.DB.prepare(
      `INSERT INTO law_firms (user_id, firm_name, practice_areas, website, subscription_tier, subscription_status, features)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.id,
      firmName,
      JSON.stringify(practiceAreas || []),
      website || null,
      tier,
      'inactive',
      JSON.stringify(getFeaturesByTier(tier))
    ).run()
    
    return c.json({
      lawFirmId: lawFirmResult.meta.last_row_id,
      userId: user.id,
      tier,
      features: getFeaturesByTier(tier)
    })
    
  } catch (error) {
    console.error('Law firm registration error:', error)
    return c.json({ error: 'Failed to register law firm' }, 500)
  }
})

// Get law firm dashboard data
app.get('/dashboard/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const { env } = c
    
    // Get law firm info
    const lawFirm = await env.DB.prepare(
      'SELECT * FROM law_firms WHERE user_id = ?'
    ).bind(userId).first<LawFirm>()
    
    if (!lawFirm) {
      return c.json({ error: 'Law firm not found' }, 404)
    }
    
    // Get leads statistics
    const totalLeads = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM leads WHERE law_firm_id = ?'
    ).bind(lawFirm.id).first()
    
    const monthlyLeads = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM leads 
       WHERE law_firm_id = ? AND created_at >= date('now', '-30 days')`
    ).bind(lawFirm.id).first()
    
    const convertedLeads = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM leads WHERE law_firm_id = ? AND status = "converted"'
    ).bind(lawFirm.id).first()
    
    const conversionRate = totalLeads?.count ? 
      Math.round((convertedLeads?.count || 0) / totalLeads.count * 100) : 0
    
    // Get recent leads
    const recentLeads = await env.DB.prepare(
      `SELECT * FROM leads WHERE law_firm_id = ? 
       ORDER BY created_at DESC LIMIT 10`
    ).bind(lawFirm.id).all()
    
    return c.json({
      lawFirm: {
        id: lawFirm.id,
        firmName: lawFirm.firm_name,
        subscriptionTier: lawFirm.subscription_tier,
        subscriptionStatus: lawFirm.subscription_status,
        setupFeePaid: lawFirm.setup_fee_paid,
        features: JSON.parse(lawFirm.features || '[]')
      },
      analytics: {
        totalLeads: totalLeads?.count || 0,
        monthlyLeads: monthlyLeads?.count || 0,
        conversionRate,
        estimatedRevenue: (convertedLeads?.count || 0) * 50000 // Assume $50k average case value
      },
      recentLeads: recentLeads.results
    })
    
  } catch (error) {
    console.error('Dashboard data error:', error)
    return c.json({ error: 'Failed to get dashboard data' }, 500)
  }
})

// Get all leads for a law firm
app.get('/leads/:lawFirmId', async (c) => {
  try {
    const lawFirmId = c.req.param('lawFirmId')
    const { env } = c
    
    const leads = await env.DB.prepare(
      `SELECT l.*, ra.risk_level, ra.wealth_at_risk 
       FROM leads l
       LEFT JOIN risk_assessments ra ON l.assessment_id = ra.id
       WHERE l.law_firm_id = ?
       ORDER BY l.created_at DESC`
    ).bind(lawFirmId).all()
    
    return c.json({ leads: leads.results })
    
  } catch (error) {
    console.error('Get leads error:', error)
    return c.json({ error: 'Failed to get leads' }, 500)
  }
})

// Update lead status
app.put('/leads/:leadId', async (c) => {
  try {
    const leadId = c.req.param('leadId')
    const { status, notes, assignedTo } = await c.req.json()
    const { env } = c
    
    await env.DB.prepare(
      `UPDATE leads SET status = ?, notes = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(status, notes, assignedTo, leadId).run()
    
    return c.json({ success: true })
    
  } catch (error) {
    console.error('Update lead error:', error)
    return c.json({ error: 'Failed to update lead' }, 500)
  }
})

// Request demo
app.post('/demo-request', async (c) => {
  try {
    const { email, name, phone, firmName, practiceSize, interestTier, message } = await c.req.json()
    
    if (!email || !name || !interestTier) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    const { env } = c
    
    const demoResult = await env.DB.prepare(
      `INSERT INTO demo_requests (email, name, phone, firm_name, practice_size, interest_tier, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(email, name, phone, firmName, practiceSize, interestTier, message).run()
    
    return c.json({
      demoRequestId: demoResult.meta.last_row_id,
      message: 'Demo request submitted successfully. We will contact you within 24 hours.'
    })
    
  } catch (error) {
    console.error('Demo request error:', error)
    return c.json({ error: 'Failed to submit demo request' }, 500)
  }
})

// Analytics events
app.post('/analytics/:lawFirmId', async (c) => {
  try {
    const lawFirmId = c.req.param('lawFirmId')
    const { eventType, eventData } = await c.req.json()
    const { env } = c
    
    await env.DB.prepare(
      'INSERT INTO analytics_events (law_firm_id, event_type, event_data) VALUES (?, ?, ?)'
    ).bind(lawFirmId, eventType, JSON.stringify(eventData || {})).run()
    
    return c.json({ success: true })
    
  } catch (error) {
    console.error('Analytics event error:', error)
    return c.json({ error: 'Failed to record analytics event' }, 500)
  }
})

// Helper function to get features by tier
function getFeaturesByTier(tier: string): string[] {
  const features = {
    professional: [
      'Risk Assessment Tool',
      'Lead Capture',
      'Basic Analytics',
      'Email Integration',
      'Custom Branding',
      'Setup & Training'
    ],
    enterprise: [
      'Risk Assessment Tool',
      'Lead Capture',
      'Basic Analytics',
      'Email Integration',
      'Custom Branding',
      'Setup & Training',
      'Calendar Booking',
      'PDF Report Generation',
      'Strategy Configurator',
      'Education Portal',
      'Admin Dashboard',
      'Email Automation',
      'Priority Support'
    ],
    custom: [
      'Risk Assessment Tool',
      'Lead Capture',
      'Basic Analytics',
      'Email Integration',
      'Custom Branding',
      'Setup & Training',
      'Calendar Booking',
      'PDF Report Generation',
      'Strategy Configurator',
      'Education Portal',
      'Admin Dashboard',
      'Email Automation',
      'Priority Support',
      'Custom Development',
      'CRM Integration',
      'Advanced Workflows',
      'White-label Licensing',
      'Dedicated Support'
    ]
  }
  
  return features[tier as keyof typeof features] || []
}

export { app as lawFirmRoutes }