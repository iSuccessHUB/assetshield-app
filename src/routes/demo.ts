import { Hono } from 'hono'

interface CloudflareBindings {
  DB: D1Database;
}

export const demoRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Start demo session for law firms
demoRoutes.post('/start', async (c) => {
  try {
    const { 
      lawyerName, 
      lawyerEmail, 
      lawyerPhone, 
      firmName, 
      practiceAreas, 
      website,
      interestedTier = 'professional' 
    } = await c.req.json()
    
    if (!lawyerName || !lawyerEmail || !firmName) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    const { env } = c
    
    // Create demo user
    const userResult = await env.DB.prepare(`
      INSERT INTO users (email, password_hash, name, phone, user_type, role, permissions, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      lawyerEmail, 
      '$2b$10$demo_hash_placeholder', 
      lawyerName, 
      lawyerPhone || '', 
      'law_firm', 
      'admin',
      JSON.stringify(['full_access', 'user_management', 'billing', 'analytics', 'integrations']),
      1
    ).run()
    
    const userId = userResult.meta.last_row_id
    
    // Create demo law firm
    const demoExpiresAt = new Date()
    demoExpiresAt.setDate(demoExpiresAt.getDate() + 14) // 14-day demo
    
    const lawFirmResult = await env.DB.prepare(`
      INSERT INTO law_firms (
        user_id, firm_name, practice_areas, website, 
        subscription_tier, subscription_status, trial_ends_at,
        features, branding_config, contact_info, 
        is_demo, demo_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      firmName,
      JSON.stringify(practiceAreas || ['Asset Protection']),
      website || '',
      interestedTier,
      'trial',
      demoExpiresAt.toISOString(),
      JSON.stringify(getFeaturesByTier(interestedTier)),
      JSON.stringify({
        primary_color: '#1e40af',
        secondary_color: '#3b82f6', 
        logo_url: '/static/demo-logo.png',
        custom_domain: `${firmName.toLowerCase().replace(/[^a-z0-9]/g, '')}.assetshield.app`
      }),
      JSON.stringify({
        address: '123 Demo Street\\nDemo City, DC 12345',
        phone: lawyerPhone || '(555) 123-DEMO',
        email: lawyerEmail
      }),
      1,
      demoExpiresAt.toISOString()
    ).run()
    
    const lawFirmId = lawFirmResult.meta.last_row_id
    
    // Create demo headquarters office
    await env.DB.prepare(`
      INSERT INTO offices (
        law_firm_id, office_name, address, phone, email, 
        manager_user_id, is_headquarters, timezone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      lawFirmId,
      `${firmName} - Main Office`,
      '123 Demo Street\nDemo City, DC 12345',
      lawyerPhone || '(555) 123-DEMO',
      lawyerEmail,
      userId,
      1,
      'America/New_York'
    ).run()
    
    // Generate demo leads and data
    await generateDemoData(env.DB, lawFirmId, userId)
    
    // Record demo request
    await env.DB.prepare(`
      INSERT INTO demo_requests (
        law_firm_id, requester_name, requester_email, requester_phone,
        firm_name, interest_tier, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      lawFirmId, lawyerName, lawyerEmail, lawyerPhone || '',
      firmName, interestedTier, 'active'
    ).run()
    
    return c.json({
      success: true,
      demoId: lawFirmId,
      userId: userId,
      expiresAt: demoExpiresAt.toISOString(),
      loginUrl: `/demo/dashboard/${lawFirmId}`,
      features: getFeaturesByTier(interestedTier)
    })
    
  } catch (error) {
    console.error('Demo start error:', error)
    return c.json({ error: 'Failed to start demo' }, 500)
  }
})

// Get demo dashboard data
demoRoutes.get('/dashboard/:demoId', async (c) => {
  try {
    const demoId = c.req.param('demoId')
    const { env } = c
    
    // Get demo law firm info
    const lawFirm = await env.DB.prepare(`
      SELECT lf.*, u.name as owner_name
      FROM law_firms lf
      JOIN users u ON lf.user_id = u.id
      WHERE lf.id = ? AND lf.is_demo = 1 AND lf.demo_expires_at > datetime('now')
    `).bind(demoId).first()
    
    if (!lawFirm) {
      return c.json({ error: 'Demo not found or expired' }, 404)
    }
    
    // Get demo statistics
    const stats = await getDemoStats(env.DB, demoId)
    
    return c.json({
      lawFirm: {
        id: lawFirm.id,
        name: lawFirm.firm_name,
        tier: lawFirm.subscription_tier,
        features: JSON.parse(lawFirm.features || '[]'),
        branding: JSON.parse(lawFirm.branding_config || '{}'),
        expiresAt: lawFirm.demo_expires_at
      },
      stats
    })
    
  } catch (error) {
    console.error('Demo dashboard error:', error)
    return c.json({ error: 'Failed to load demo dashboard' }, 500)
  }
})

// Get demo analytics data
demoRoutes.get('/analytics/:demoId', async (c) => {
  try {
    const demoId = c.req.param('demoId')
    const timeframe = c.req.query('timeframe') || '30d'
    const { env } = c
    
    // Verify demo access
    const lawFirm = await env.DB.prepare(`
      SELECT id FROM law_firms 
      WHERE id = ? AND is_demo = 1 AND demo_expires_at > datetime('now')
    `).bind(demoId).first()
    
    if (!lawFirm) {
      return c.json({ error: 'Demo not found or expired' }, 404)
    }
    
    // Get comprehensive analytics
    const analytics = await getDemoAnalytics(env.DB, demoId, timeframe)
    
    return c.json(analytics)
    
  } catch (error) {
    console.error('Demo analytics error:', error)
    return c.json({ error: 'Failed to load analytics' }, 500)
  }
})

// Extend demo period (for interested prospects)
demoRoutes.post('/extend/:demoId', async (c) => {
  try {
    const demoId = c.req.param('demoId')
    const { additionalDays = 7 } = await c.req.json()
    const { env } = c
    
    const newExpiryDate = new Date()
    newExpiryDate.setDate(newExpiryDate.getDate() + additionalDays)
    
    await env.DB.prepare(`
      UPDATE law_firms 
      SET demo_expires_at = ?
      WHERE id = ? AND is_demo = 1
    `).bind(newExpiryDate.toISOString(), demoId).run()
    
    return c.json({
      success: true,
      newExpiryDate: newExpiryDate.toISOString()
    })
    
  } catch (error) {
    console.error('Demo extend error:', error)
    return c.json({ error: 'Failed to extend demo' }, 500)
  }
})

// Convert demo to paid subscription
demoRoutes.post('/convert/:demoId', async (c) => {
  try {
    const demoId = c.req.param('demoId')
    const { subscriptionTier, paymentMethodId } = await c.req.json()
    const { env } = c
    
    // Update law firm to active subscription
    await env.DB.prepare(`
      UPDATE law_firms 
      SET subscription_status = 'active',
          subscription_tier = ?,
          is_demo = 0,
          demo_expires_at = NULL,
          trial_ends_at = NULL
      WHERE id = ?
    `).bind(subscriptionTier, demoId).run()
    
    // Update demo request status
    await env.DB.prepare(`
      UPDATE demo_requests 
      SET converted_to_paid = 1, status = 'converted'
      WHERE law_firm_id = ?
    `).bind(demoId).run()
    
    return c.json({
      success: true,
      message: 'Demo converted to paid subscription'
    })
    
  } catch (error) {
    console.error('Demo conversion error:', error)
    return c.json({ error: 'Failed to convert demo' }, 500)
  }
})

// Helper functions
function getFeaturesByTier(tier: string): string[] {
  const features: Record<string, string[]> = {
    starter: [
      'Risk Assessment Tool',
      'Lead Capture & Management', 
      'Basic Analytics Dashboard',
      'Educational Content Library',
      'Complete White-Label Branding',
      'Up to 100 clients/month',
      'Email Support'
    ],
    professional: [
      'Everything in Starter',
      'Advanced Customization',
      'Multiple Attorney Accounts',
      'Document Automation',
      'Advanced Analytics & Reporting',
      'Up to 500 clients/month',
      'Priority Support',
      'Custom Integration APIs'
    ],
    enterprise: [
      'Everything in Professional',
      'Multi-Office Deployment',
      'Custom Integrations',
      'White-Label Mobile App',
      'Unlimited Clients',
      'Dedicated Account Manager',
      '24/7 Priority Support',
      'Custom Development'
    ]
  }
  
  return features[tier] || features.starter
}

async function generateDemoData(db: D1Database, lawFirmId: number, userId: number) {
  // Generate demo leads
  const demoLeads = [
    {
      name: 'John Anderson',
      email: 'j.anderson@example.com',
      phone: '(555) 234-5678',
      riskScore: 78,
      estimatedValue: 1500000,
      status: 'qualified',
      notes: 'Business owner interested in domestic trust structures'
    },
    {
      name: 'Sarah Martinez',
      email: 's.martinez@example.com', 
      phone: '(555) 345-6789',
      riskScore: 85,
      estimatedValue: 2300000,
      status: 'consultation',
      notes: 'High-net-worth individual, needs offshore protection'
    },
    {
      name: 'Michael Chen',
      email: 'm.chen@example.com',
      phone: '(555) 456-7890', 
      riskScore: 72,
      estimatedValue: 980000,
      status: 'new',
      notes: 'Medical professional, malpractice concerns'
    }
  ]
  
  for (const lead of demoLeads) {
    await db.prepare(`
      INSERT INTO leads (
        law_firm_id, assigned_attorney_id, source_type, contact_name, 
        contact_email, contact_phone, risk_score, estimated_value, 
        status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      lawFirmId, userId, 'assessment', lead.name, lead.email, lead.phone,
      lead.riskScore, lead.estimatedValue, lead.status, lead.notes,
      new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    ).run()
  }
  
  // Generate demo analytics events
  const eventTypes = [
    'page_view', 'assessment_started', 'assessment_completed', 
    'lead_generated', 'consultation_booked', 'document_generated'
  ]
  
  for (let i = 0; i < 50; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const eventDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    
    await db.prepare(`
      INSERT INTO analytics_events (
        law_firm_id, event_type, event_data, created_at
      ) VALUES (?, ?, ?, ?)
    `).bind(
      lawFirmId,
      eventType,
      JSON.stringify({ demo: true, value: Math.floor(Math.random() * 1000) }),
      eventDate.toISOString()
    ).run()
  }
}

async function getDemoStats(db: D1Database, lawFirmId: number) {
  const leadStats = await db.prepare(`
    SELECT 
      COUNT(*) as total_leads,
      COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
      COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
      COUNT(CASE WHEN status = 'consultation' THEN 1 END) as consultation_leads,
      COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
      AVG(risk_score) as avg_risk_score,
      SUM(estimated_value) as total_pipeline_value
    FROM leads WHERE law_firm_id = ?
  `).bind(lawFirmId).first()
  
  const activityStats = await db.prepare(`
    SELECT 
      COUNT(*) as total_events,
      COUNT(CASE WHEN event_type = 'assessment_completed' THEN 1 END) as assessments_completed,
      COUNT(CASE WHEN event_type = 'consultation_booked' THEN 1 END) as consultations_booked
    FROM analytics_events 
    WHERE law_firm_id = ? AND created_at >= datetime('now', '-30 days')
  `).bind(lawFirmId).first()
  
  return {
    leads: leadStats,
    activity: activityStats
  }
}

async function getDemoAnalytics(db: D1Database, lawFirmId: number, timeframe: string) {
  const timeframeSql = timeframe === '7d' ? '-7 days' : '-30 days'
  
  // Conversion funnel
  const funnel = await db.prepare(`
    SELECT 
      'Visitors' as stage, COUNT(DISTINCT session_id) as count, 1 as order_num
    FROM analytics_events 
    WHERE law_firm_id = ? AND created_at >= datetime('now', '${timeframeSql}')
    
    UNION ALL
    
    SELECT 
      'Assessments Started' as stage, 
      COUNT(*) as count, 2 as order_num
    FROM analytics_events 
    WHERE law_firm_id = ? AND event_type = 'assessment_started' 
    AND created_at >= datetime('now', '${timeframeSql}')
    
    UNION ALL
    
    SELECT 
      'Assessments Completed' as stage,
      COUNT(*) as count, 3 as order_num  
    FROM analytics_events
    WHERE law_firm_id = ? AND event_type = 'assessment_completed'
    AND created_at >= datetime('now', '${timeframeSql}')
    
    UNION ALL
    
    SELECT
      'Leads Generated' as stage,
      COUNT(*) as count, 4 as order_num
    FROM leads
    WHERE law_firm_id = ? AND created_at >= datetime('now', '${timeframeSql}')
    
    ORDER BY order_num
  `).bind(lawFirmId, lawFirmId, lawFirmId, lawFirmId).all()
  
  // Daily activity
  const dailyActivity = await db.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as events,
      COUNT(CASE WHEN event_type = 'assessment_completed' THEN 1 END) as assessments,
      COUNT(CASE WHEN event_type = 'lead_generated' THEN 1 END) as leads
    FROM analytics_events
    WHERE law_firm_id = ? AND created_at >= datetime('now', '${timeframeSql}')
    GROUP BY DATE(created_at)
    ORDER BY date
  `).bind(lawFirmId).all()
  
  return {
    funnel: funnel.results || [],
    dailyActivity: dailyActivity.results || []
  }
}

export default demoRoutes