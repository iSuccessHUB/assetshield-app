import { Hono } from 'hono'
import { InputValidator, SecureDatabase } from '../utils/database-security'

interface CloudflareBindings {
  DB: D1Database;
}

export const securityRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// CSP violation reporting endpoint
securityRoutes.post('/csp-report', async (c) => {
  try {
    const report = await c.req.json()
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For') || 
               'unknown'
    
    // Log CSP violation for security monitoring
    console.warn('CSP Violation detected:', {
      ip,
      userAgent: c.req.header('User-Agent'),
      report: report['csp-report'] || report,
      timestamp: new Date().toISOString()
    })
    
    // Store in security events table
    const { env } = c
    if (env.DB) {
      await env.DB.prepare(`
        INSERT INTO security_events (
          event_type, ip_address, user_agent, event_data, 
          risk_level, action_taken, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        'csp_violation',
        ip,
        c.req.header('User-Agent') || 'unknown',
        JSON.stringify(report),
        'medium',
        'logged'
      ).run()
    }
    
    return c.text('', 204) // No content response for CSP reports
  } catch (error) {
    console.error('CSP report handling error:', error)
    return c.text('', 400)
  }
})

// Security health check endpoint
securityRoutes.get('/health', async (c) => {
  try {
    const { env } = c
    const db = new SecureDatabase(env.DB)
    
    // Check for recent security events
    const recentEvents = await db.secureSelect(`
      SELECT 
        event_type,
        risk_level,
        COUNT(*) as count,
        MAX(created_at) as latest
      FROM security_events 
      WHERE created_at > datetime('now', '-24 hours')
      GROUP BY event_type, risk_level
      ORDER BY count DESC
    `, [], 50)
    
    // Check for suspicious activity patterns
    const suspiciousIPs = await db.secureSelect(`
      SELECT 
        ip_address,
        COUNT(*) as event_count,
        COUNT(DISTINCT event_type) as event_types,
        MAX(created_at) as latest_event
      FROM security_events 
      WHERE created_at > datetime('now', '-1 hour')
        AND risk_level IN ('high', 'critical')
      GROUP BY ip_address
      HAVING event_count > 10
      ORDER BY event_count DESC
    `, [], 20)
    
    // Get authentication statistics
    const authStats = await db.secureSelect(`
      SELECT 
        SUM(CASE WHEN event_type = 'login_success' THEN 1 ELSE 0 END) as successful_logins,
        SUM(CASE WHEN event_type = 'login_failed' THEN 1 ELSE 0 END) as failed_logins,
        SUM(CASE WHEN event_type = 'password_change' THEN 1 ELSE 0 END) as password_changes,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM security_events 
      WHERE created_at > datetime('now', '-24 hours')
        AND event_type IN ('login_success', 'login_failed', 'password_change')
    `)
    
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      security_summary: {
        recent_events: recentEvents.data || [],
        suspicious_activity: {
          high_risk_ips: suspiciousIPs.data || [],
          total_suspicious: (suspiciousIPs.data || []).length
        },
        authentication: (authStats.data || [])[0] || {
          successful_logins: 0,
          failed_logins: 0,
          password_changes: 0,
          unique_ips: 0
        }
      }
    })
    
  } catch (error) {
    console.error('Security health check error:', error)
    return c.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Security monitoring unavailable'
    }, 500)
  }
})

// Rate limit status endpoint
securityRoutes.get('/rate-limits/:identifier', async (c) => {
  const identifier = c.req.param('identifier')
  
  if (!identifier || identifier.length < 3) {
    return c.json({ error: 'Invalid identifier' }, 400)
  }
  
  // Get rate limit status (mock implementation)
  const key = `rate_limit:${identifier}`
  
  // In a real implementation, this would check the rate limiting store
  return c.json({
    identifier,
    current_requests: 0,
    limit: 100,
    window_ms: 900000,
    reset_time: new Date(Date.now() + 900000).toISOString(),
    blocked: false
  })
})

// Security event reporting (for internal use)
securityRoutes.post('/events', async (c) => {
  try {
    const eventData = await c.req.json()
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For') || 
               'unknown'
    
    // Validate event data
    const validEventTypes = [
      'login_attempt', 'login_success', 'login_failed',
      'password_change', 'account_locked', 'suspicious_activity',
      'rate_limit_exceeded', 'data_access', 'api_key_used'
    ]
    
    if (!eventData.event_type || !validEventTypes.includes(eventData.event_type)) {
      return c.json({ error: 'Invalid event type' }, 400)
    }
    
    const { env } = c
    const result = await env.DB.prepare(`
      INSERT INTO security_events (
        event_type, user_id, ip_address, user_agent, 
        event_data, risk_level, action_taken, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      eventData.event_type,
      eventData.user_id || null,
      ip,
      c.req.header('User-Agent') || 'unknown',
      JSON.stringify(eventData.data || {}),
      eventData.risk_level || 'low',
      eventData.action_taken || 'logged'
    ).run()
    
    return c.json({
      success: true,
      event_id: result.meta?.last_row_id
    })
    
  } catch (error) {
    console.error('Security event logging error:', error)
    return c.json({ error: 'Failed to log security event' }, 500)
  }
})

// Get security metrics for admin dashboard
securityRoutes.get('/metrics', async (c) => {
  try {
    const { env } = c
    const db = new SecureDatabase(env.DB)
    
    // Get comprehensive security metrics
    const [
      eventsByType,
      eventsByRisk,
      topIPs,
      recentIncidents
    ] = await Promise.all([
      db.secureSelect(`
        SELECT 
          event_type,
          COUNT(*) as count,
          MIN(created_at) as first_seen,
          MAX(created_at) as last_seen
        FROM security_events 
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY event_type
        ORDER BY count DESC
      `),
      
      db.secureSelect(`
        SELECT 
          risk_level,
          COUNT(*) as count,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM security_events 
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY risk_level
        ORDER BY count DESC
      `),
      
      db.secureSelect(`
        SELECT 
          ip_address,
          COUNT(*) as event_count,
          COUNT(DISTINCT event_type) as event_types,
          MAX(created_at) as latest_activity
        FROM security_events 
        WHERE created_at > datetime('now', '-24 hours')
        GROUP BY ip_address
        ORDER BY event_count DESC
        LIMIT 10
      `),
      
      db.secureSelect(`
        SELECT 
          event_type,
          risk_level,
          ip_address,
          event_data,
          created_at
        FROM security_events 
        WHERE risk_level IN ('high', 'critical')
          AND created_at > datetime('now', '-7 days')
        ORDER BY created_at DESC
        LIMIT 20
      `)
    ])
    
    return c.json({
      success: true,
      metrics: {
        events_by_type: eventsByType.data || [],
        events_by_risk: eventsByRisk.data || [],
        top_ips: topIPs.data || [],
        recent_incidents: recentIncidents.data || []
      },
      generated_at: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Security metrics error:', error)
    return c.json({ error: 'Failed to generate security metrics' }, 500)
  }
})