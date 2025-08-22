import { Hono } from 'hono'
import { verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'
import type { CloudflareBindings } from '../types'

export const membersRoutes = new Hono<{ Bindings: CloudflareBindings }>()

const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production'

// Middleware to check authentication
async function requireAuth(c: any, next: any) {
  try {
    const token = getCookie(c, 'auth_token')
    
    if (!token) {
      return c.redirect('/login?redirect=' + encodeURIComponent(c.req.url))
    }
    
    const payload = await verify(token, JWT_SECRET)
    
    // Add user info to context
    c.set('user', {
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType
    })
    
    await next()
  } catch (error) {
    return c.redirect('/login?error=invalid_token')
  }
}

// Get member dashboard data
membersRoutes.get('/dashboard', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    
    // Get user details and purchased services
    const userDetails = await c.env.DB.prepare(`
      SELECT 
        u.id, u.email, u.name, u.user_type, u.created_at,
        us.service_type, us.access_level, us.status, us.purchase_date
      FROM users u
      LEFT JOIN user_services us ON u.id = us.user_id AND us.status = 'active'
      WHERE u.id = ?
    `).bind(user.userId).all()
    
    if (!userDetails.results || userDetails.results.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    const userData = userDetails.results[0]
    const services = userDetails.results
      .filter(row => row.service_type)
      .map(row => ({
        type: row.service_type,
        accessLevel: row.access_level,
        status: row.status,
        purchaseDate: row.purchase_date
      }))
    
    // Get recent activity
    const recentActivity = await c.env.DB.prepare(`
      SELECT 
        'assessment' as type,
        'Risk Assessment Completed' as title,
        created_at
      FROM risk_assessments 
      WHERE user_id = ?
      UNION ALL
      SELECT 
        'payment' as type,
        'Service Purchase: ' || service_type as title,
        created_at
      FROM payments 
      WHERE user_id = ? AND status = 'succeeded'
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(user.userId, user.userId).all()
    
    return c.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        memberSince: userData.created_at
      },
      services,
      recentActivity: recentActivity.results || []
    })
    
  } catch (error) {
    console.error('Dashboard error:', error)
    return c.json({ error: 'Failed to load dashboard' }, 500)
  }
})

// Get specific service content
membersRoutes.get('/service/:type', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const serviceType = c.req.param('type')
    
    // Check if user has access to this service
    const serviceAccess = await c.env.DB.prepare(
      'SELECT access_level, status FROM user_services WHERE user_id = ? AND service_type = ? AND status = "active"'
    ).bind(user.userId, serviceType).first()
    
    if (!serviceAccess) {
      return c.json({ 
        error: 'Access denied', 
        message: 'You do not have access to this service. Please purchase it first.' 
      }, 403)
    }
    
    // Return service-specific content based on type
    const serviceContent = getServiceContent(serviceType, serviceAccess.access_level)
    
    return c.json({
      success: true,
      service: {
        type: serviceType,
        accessLevel: serviceAccess.access_level,
        status: serviceAccess.status,
        content: serviceContent
      }
    })
    
  } catch (error) {
    console.error('Service content error:', error)
    return c.json({ error: 'Failed to load service content' }, 500)
  }
})

// Get member resources
membersRoutes.get('/resources', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    
    // Get user's purchased services to determine available resources
    const userServices = await c.env.DB.prepare(
      'SELECT service_type, access_level FROM user_services WHERE user_id = ? AND status = "active"'
    ).bind(user.userId).all()
    
    const availableResources = []
    
    // Add resources based on purchased services
    for (const service of userServices.results || []) {
      const resources = getServiceResources(service.service_type, service.access_level)
      availableResources.push(...resources)
    }
    
    return c.json({
      success: true,
      resources: availableResources
    })
    
  } catch (error) {
    console.error('Resources error:', error)
    return c.json({ error: 'Failed to load resources' }, 500)
  }
})

// Helper function to get service content
function getServiceContent(serviceType: string, accessLevel: string) {
  const content = {
    llc: {
      basic: {
        title: 'LLC Formation Service',
        description: 'Your LLC formation package includes:',
        items: [
          'Complete LLC formation documents',
          'Operating Agreement template',
          'EIN application assistance',
          'Basic compliance guidelines'
        ],
        downloads: [
          { name: 'LLC Formation Checklist', url: '/downloads/llc-checklist.pdf' },
          { name: 'Operating Agreement Template', url: '/downloads/operating-agreement.pdf' }
        ]
      },
      premium: {
        title: 'Premium LLC Formation Service',
        description: 'Your premium LLC package includes everything in basic plus:',
        items: [
          'All Basic features',
          'Customized Operating Agreement',
          'Advanced tax optimization strategies',
          'Ongoing compliance calendar',
          '1-hour consultation call'
        ],
        downloads: [
          { name: 'LLC Formation Checklist', url: '/downloads/llc-checklist.pdf' },
          { name: 'Custom Operating Agreement', url: '/downloads/custom-operating-agreement.pdf' },
          { name: 'Tax Optimization Guide', url: '/downloads/tax-optimization.pdf' }
        ]
      }
    },
    trust: {
      basic: {
        title: 'Asset Protection Trust Service',
        description: 'Your trust formation package includes:',
        items: [
          'Trust formation documents',
          'Trust administration guide',
          'Beneficiary designation forms',
          'Basic asset transfer instructions'
        ],
        downloads: [
          { name: 'Trust Formation Documents', url: '/downloads/trust-docs.pdf' },
          { name: 'Administration Guide', url: '/downloads/trust-admin.pdf' }
        ]
      },
      premium: {
        title: 'Premium Asset Protection Trust Service',
        description: 'Your premium trust package includes everything in basic plus:',
        items: [
          'All Basic features',
          'Customized trust provisions',
          'Advanced asset protection strategies',
          'Ongoing trustee guidance',
          '2-hour consultation call'
        ],
        downloads: [
          { name: 'Trust Formation Documents', url: '/downloads/trust-docs.pdf' },
          { name: 'Custom Trust Provisions', url: '/downloads/custom-trust.pdf' },
          { name: 'Advanced Protection Guide', url: '/downloads/advanced-protection.pdf' }
        ]
      }
    },
    offshore: {
      basic: {
        title: 'Offshore Asset Protection Service',
        description: 'Your offshore protection package includes:',
        items: [
          'Offshore entity formation',
          'Bank account assistance',
          'Basic compliance requirements',
          'Asset transfer guidelines'
        ],
        downloads: [
          { name: 'Offshore Setup Guide', url: '/downloads/offshore-setup.pdf' },
          { name: 'Compliance Requirements', url: '/downloads/offshore-compliance.pdf' }
        ]
      },
      premium: {
        title: 'Premium Offshore Asset Protection Service',
        description: 'Your premium offshore package includes everything in basic plus:',
        items: [
          'All Basic features',
          'Multi-jurisdictional structures',
          'Advanced privacy protections',
          'Ongoing management services',
          '3-hour consultation call'
        ],
        downloads: [
          { name: 'Offshore Setup Guide', url: '/downloads/offshore-setup.pdf' },
          { name: 'Advanced Structures Guide', url: '/downloads/advanced-offshore.pdf' },
          { name: 'Privacy Protection Manual', url: '/downloads/privacy-manual.pdf' }
        ]
      }
    }
  }
  
  return content[serviceType]?.[accessLevel] || null
}

// Helper function to get service resources
function getServiceResources(serviceType: string, accessLevel: string) {
  const baseResources = [
    {
      title: 'Member Support',
      description: 'Access to our member support team',
      type: 'support',
      available: true
    },
    {
      title: 'Monthly Newsletter',
      description: 'Exclusive member newsletter with updates',
      type: 'newsletter',
      available: true
    }
  ]
  
  const serviceResources = {
    llc: [
      {
        title: 'LLC Compliance Tools',
        description: 'Tools to maintain LLC compliance',
        type: 'tools',
        available: true
      }
    ],
    trust: [
      {
        title: 'Trust Management Portal',
        description: 'Online portal for trust management',
        type: 'portal',
        available: accessLevel === 'premium'
      }
    ],
    offshore: [
      {
        title: 'Offshore Compliance Monitor',
        description: 'Monitor compliance requirements',
        type: 'monitor',
        available: accessLevel === 'premium'
      }
    ]
  }
  
  return [...baseResources, ...(serviceResources[serviceType] || [])]
}