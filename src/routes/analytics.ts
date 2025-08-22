import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

export const analyticsRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Advanced analytics for law firms
analyticsRoutes.get('/firm-analytics/:firmId', async (c) => {
  const firmId = c.req.param('firmId')
  const timeframe = c.req.query('timeframe') || '30d' // 7d, 30d, 90d, 1y
  
  try {
    // Lead conversion funnel
    const conversionFunnel = await c.env.DB.prepare(`
      SELECT 
        'Risk Assessment' as stage,
        COUNT(*) as count,
        1 as order_num
      FROM risk_assessments ra
      JOIN users u ON ra.user_id = u.id
      WHERE u.created_at >= datetime('now', '-${timeframe.replace('d', ' days').replace('y', ' years')}')
      
      UNION ALL
      
      SELECT 
        'Consultation Scheduled' as stage,
        COUNT(*) as count,
        2 as order_num
      FROM demo_requests dr
      WHERE dr.interest_tier = 'consultation' 
      AND dr.created_at >= datetime('now', '-${timeframe.replace('d', ' days').replace('y', ' years')}')
      
      UNION ALL
      
      SELECT 
        'Service Purchased' as stage,
        COUNT(*) as count,
        3 as order_num
      FROM payments p
      WHERE p.status = 'succeeded'
      AND p.created_at >= datetime('now', '-${timeframe.replace('d', ' days').replace('y', ' years')}')
      
      ORDER BY order_num
    `).all()
    
    // Revenue analytics
    const revenueAnalytics = await c.env.DB.prepare(`
      SELECT 
        DATE(p.created_at) as date,
        p.service_type,
        SUM(p.amount) as revenue,
        COUNT(*) as transactions
      FROM payments p
      WHERE p.status = 'succeeded'
      AND p.created_at >= datetime('now', '-${timeframe.replace('d', ' days').replace('y', ' years')}')
      GROUP BY DATE(p.created_at), p.service_type
      ORDER BY date DESC
    `).all()
    
    // Client demographics
    const demographics = await c.env.DB.prepare(`
      SELECT 
        ra.profession,
        ra.net_worth_range,
        ra.risk_level,
        COUNT(*) as count,
        AVG(ra.wealth_at_risk) as avg_wealth_at_risk
      FROM risk_assessments ra
      JOIN users u ON ra.user_id = u.id
      WHERE u.created_at >= datetime('now', '-${timeframe.replace('d', ' days').replace('y', ' years')}')
      GROUP BY ra.profession, ra.net_worth_range, ra.risk_level
      ORDER BY count DESC
    `).all()
    
    // Geographic distribution
    const geographic = await c.env.DB.prepare(`
      SELECT 
        CASE 
          WHEN u.phone LIKE '+1%' THEN 'United States'
          WHEN u.phone LIKE '+44%' THEN 'United Kingdom'
          WHEN u.phone LIKE '+1%' AND LENGTH(u.phone) = 12 THEN 'Canada'
          ELSE 'Other'
        END as region,
        COUNT(*) as count
      FROM users u
      WHERE u.created_at >= datetime('now', '-${timeframe.replace('d', ' days').replace('y', ' years')}')
      GROUP BY region
      ORDER BY count DESC
    `).all()
    
    // Performance metrics
    const performance = await c.env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT ra.id) as total_assessments,
        COUNT(DISTINCT CASE WHEN p.status = 'succeeded' THEN p.id END) as successful_payments,
        ROUND(
          CAST(COUNT(DISTINCT CASE WHEN p.status = 'succeeded' THEN p.id END) AS FLOAT) / 
          CAST(COUNT(DISTINCT ra.id) AS FLOAT) * 100, 2
        ) as conversion_rate,
        SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END) as total_revenue
      FROM users u
      LEFT JOIN risk_assessments ra ON u.id = ra.user_id
      LEFT JOIN payments p ON u.id = p.user_id
      WHERE u.created_at >= datetime('now', '-${timeframe.replace('d', ' days').replace('y', ' years')}')
    `).first()
    
    return c.json({
      success: true,
      timeframe,
      analytics: {
        conversionFunnel: conversionFunnel.results || [],
        revenueAnalytics: revenueAnalytics.results || [],
        demographics: demographics.results || [],
        geographic: geographic.results || [],
        performance: performance || {}
      }
    })
    
  } catch (error) {
    console.error('Analytics error:', error)
    return c.json({ error: 'Failed to generate analytics' }, 500)
  }
})

// Risk assessment insights
analyticsRoutes.get('/risk-insights', async (c) => {
  try {
    const insights = await c.env.DB.prepare(`
      SELECT 
        profession,
        net_worth_range,
        risk_level,
        COUNT(*) as count,
        AVG(wealth_at_risk) as avg_wealth_at_risk,
        MIN(wealth_at_risk) as min_wealth_at_risk,
        MAX(wealth_at_risk) as max_wealth_at_risk
      FROM risk_assessments
      WHERE created_at >= datetime('now', '-90 days')
      GROUP BY profession, net_worth_range, risk_level
      ORDER BY count DESC
    `).all()
    
    const trends = await c.env.DB.prepare(`
      SELECT 
        DATE(created_at) as date,
        risk_level,
        COUNT(*) as count
      FROM risk_assessments
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at), risk_level
      ORDER BY date DESC
    `).all()
    
    return c.json({
      success: true,
      insights: {
        riskProfiles: insights.results || [],
        trends: trends.results || []
      }
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to generate risk insights' }, 500)
  }
})

// Real-time dashboard metrics
analyticsRoutes.get('/realtime-metrics', async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const metrics = await c.env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT CASE WHEN DATE(u.created_at) = ? THEN u.id END) as new_users_today,
        COUNT(DISTINCT CASE WHEN DATE(ra.created_at) = ? THEN ra.id END) as assessments_today,
        COUNT(DISTINCT CASE WHEN DATE(dr.created_at) = ? AND dr.interest_tier = 'consultation' THEN dr.id END) as consultations_today,
        COUNT(DISTINCT CASE WHEN DATE(p.created_at) = ? AND p.status = 'succeeded' THEN p.id END) as payments_today,
        SUM(CASE WHEN DATE(p.created_at) = ? AND p.status = 'succeeded' THEN p.amount ELSE 0 END) as revenue_today
      FROM users u
      LEFT JOIN risk_assessments ra ON u.id = ra.user_id
      LEFT JOIN demo_requests dr ON dr.email = u.email
      LEFT JOIN payments p ON u.id = p.user_id
    `).bind(today, today, today, today, today).first()
    
    return c.json({
      success: true,
      date: today,
      metrics: metrics || {}
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to get realtime metrics' }, 500)
  }
})

// Export analytics data
analyticsRoutes.get('/export/:type', async (c) => {
  const type = c.req.param('type') // 'leads', 'revenue', 'assessments'
  const format = c.req.query('format') || 'json' // 'json', 'csv'
  
  try {
    let data = []
    
    switch (type) {
      case 'leads':
        const leads = await c.env.DB.prepare(`
          SELECT 
            l.id, l.name, l.email, l.phone, l.status, l.source,
            l.created_at, l.updated_at
          FROM leads l
          ORDER BY l.created_at DESC
        `).all()
        data = leads.results || []
        break
        
      case 'revenue':
        const revenue = await c.env.DB.prepare(`
          SELECT 
            p.id, p.amount, p.service_type, p.status,
            p.created_at, u.name, u.email
          FROM payments p
          JOIN users u ON p.user_id = u.id
          WHERE p.status = 'succeeded'
          ORDER BY p.created_at DESC
        `).all()
        data = revenue.results || []
        break
        
      case 'assessments':
        const assessments = await c.env.DB.prepare(`
          SELECT 
            ra.id, ra.profession, ra.net_worth_range, ra.risk_level,
            ra.wealth_at_risk, ra.created_at, u.name, u.email
          FROM risk_assessments ra
          JOIN users u ON ra.user_id = u.id
          ORDER BY ra.created_at DESC
        `).all()
        data = assessments.results || []
        break
        
      default:
        return c.json({ error: 'Invalid export type' }, 400)
    }
    
    if (format === 'csv') {
      // Convert to CSV format
      if (data.length === 0) {
        return c.text('No data available')
      }
      
      const headers = Object.keys(data[0]).join(',')
      const rows = data.map(row => Object.values(row).join(',')).join('\n')
      const csv = `${headers}\n${rows}`
      
      c.header('Content-Type', 'text/csv')
      c.header('Content-Disposition', `attachment; filename="${type}-export.csv"`)
      return c.text(csv)
    }
    
    return c.json({
      success: true,
      type,
      count: data.length,
      data
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to export data' }, 500)
  }
})