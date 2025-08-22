import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

export const complianceRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Privacy policy and GDPR compliance
complianceRoutes.get('/privacy-policy', (c) => {
  return c.json({
    success: true,
    policy: {
      lastUpdated: '2024-08-22',
      version: '1.0',
      sections: [
        {
          title: 'Data Collection',
          content: 'We collect personal information necessary for providing asset protection services...'
        },
        {
          title: 'Data Usage',
          content: 'Your data is used exclusively for providing legal services and risk assessments...'
        },
        {
          title: 'Data Protection',
          content: 'We implement industry-standard security measures including encryption...'
        },
        {
          title: 'Your Rights',
          content: 'You have the right to access, modify, or delete your personal data...'
        }
      ],
      gdprCompliant: true,
      ccpaCompliant: true
    }
  })
})

// Terms of service
complianceRoutes.get('/terms-of-service', (c) => {
  return c.json({
    success: true,
    terms: {
      lastUpdated: '2024-08-22',
      version: '1.0',
      sections: [
        {
          title: 'Service Description',
          content: 'AssetShield App provides asset protection risk assessment and legal services...'
        },
        {
          title: 'User Responsibilities',
          content: 'Users must provide accurate information and comply with applicable laws...'
        },
        {
          title: 'Limitation of Liability',
          content: 'Our liability is limited to the amount paid for services...'
        },
        {
          title: 'Professional Disclaimer',
          content: 'This platform provides general information and should not replace professional legal advice...'
        }
      ]
    }
  })
})

// Data export (GDPR Article 20 - Right to data portability)
complianceRoutes.get('/data-export', async (c) => {
  // This would require authentication in real implementation
  const userId = c.req.header('user-id') || '1'
  
  try {
    // Get all user data
    const userData = await c.env.DB.prepare(`
      SELECT 
        u.id, u.email, u.name, u.phone, u.created_at,
        ra.profession, ra.net_worth_range, ra.risk_level, ra.wealth_at_risk,
        us.service_type, us.access_level, us.purchase_date,
        p.amount, p.service_type as payment_service, p.created_at as payment_date
      FROM users u
      LEFT JOIN risk_assessments ra ON u.id = ra.user_id
      LEFT JOIN user_services us ON u.id = us.user_id
      LEFT JOIN payments p ON u.id = p.user_id
      WHERE u.id = ?
    `).bind(userId).all()
    
    return c.json({
      success: true,
      exportDate: new Date().toISOString(),
      userData: userData.results || []
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to export data' }, 500)
  }
})

// Data deletion request (GDPR Article 17 - Right to erasure)
complianceRoutes.post('/data-deletion-request', async (c) => {
  const { userId, reason } = await c.req.json()
  
  try {
    // Log deletion request
    await c.env.DB.prepare(`
      INSERT INTO compliance_requests (user_id, request_type, reason, status, created_at)
      VALUES (?, 'deletion', ?, 'pending', datetime('now'))
    `).bind(userId, reason || 'User requested deletion').run()
    
    return c.json({
      success: true,
      message: 'Deletion request submitted. We will process it within 30 days as required by GDPR.'
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to submit deletion request' }, 500)
  }
})

// Audit log for compliance
complianceRoutes.post('/audit-log', async (c) => {
  const { userId, action, details, ipAddress } = await c.req.json()
  
  try {
    await c.env.DB.prepare(`
      INSERT INTO audit_logs (user_id, action, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(userId, action, JSON.stringify(details), ipAddress).run()
    
    return c.json({ success: true })
    
  } catch (error) {
    return c.json({ error: 'Failed to log audit event' }, 500)
  }
})

// Security headers and CSP
complianceRoutes.get('/security-headers', (c) => {
  return c.json({
    success: true,
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.tailwindcss.com cdn.jsdelivr.net js.stripe.com; style-src 'self' 'unsafe-inline' cdn.tailwindcss.com cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' cdn.jsdelivr.net; connect-src 'self' api.stripe.com",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  })
})