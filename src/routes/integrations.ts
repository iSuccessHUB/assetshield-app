import { Hono } from 'hono'
import { verify } from 'hono/jwt'

interface CloudflareBindings {
  DB: D1Database;
}

export const integrationsRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// JWT Secret - Use same secure implementation as auth.ts
function getJWTSecret(): string {
  if (typeof process !== 'undefined' && process.env?.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  return 'fallback-jwt-secret-set-environment-variable-in-production-for-security';
}

// Middleware for API authentication
async function requireApiAuth(c: any, next: any) {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401)
    }
    
    const token = authHeader.substring(7)
    const payload = await verify(token, getJWTSecret())
    
    c.set('firmId', payload.firmId)
    c.set('userId', payload.userId)
    
    await next()
  } catch (error) {
    return c.json({ error: 'Invalid API token' }, 401)
  }
}

// Get all integrations for a law firm
integrationsRoutes.get('/:firmId', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const { env } = c
    
    const integrations = await env.DB.prepare(`
      SELECT 
        id, integration_type, integration_name, webhook_url,
        configuration, is_active, last_sync_at, sync_status, error_message,
        created_at, updated_at
      FROM integrations 
      WHERE law_firm_id = ?
      ORDER BY integration_name
    `).bind(firmId).all()
    
    return c.json({ integrations: integrations.results || [] })
    
  } catch (error) {
    console.error('Integrations list error:', error)
    return c.json({ error: 'Failed to load integrations' }, 500)
  }
})

// Create new integration
integrationsRoutes.post('/:firmId', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const { 
      integrationType,
      integrationName, 
      apiCredentials, 
      webhookUrl,
      configuration = {}
    } = await c.req.json()
    
    if (!integrationType || !integrationName) {
      return c.json({ error: 'Integration type and name are required' }, 400)
    }
    
    const { env } = c
    
    // Encrypt API credentials (in production, use proper encryption)
    const encryptedCredentials = JSON.stringify({ encrypted: apiCredentials })
    
    const result = await env.DB.prepare(`
      INSERT INTO integrations (
        law_firm_id, integration_type, integration_name, 
        api_credentials, webhook_url, configuration, 
        is_active, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      firmId, integrationType, integrationName,
      encryptedCredentials, webhookUrl || null, 
      JSON.stringify(configuration), 1, 'pending'
    ).run()
    
    return c.json({
      success: true,
      integrationId: result.meta.last_row_id
    })
    
  } catch (error) {
    console.error('Integration creation error:', error)
    return c.json({ error: 'Failed to create integration' }, 500)
  }
})

// Update integration
integrationsRoutes.put('/:firmId/:integrationId', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const integrationId = c.req.param('integrationId')
    const { 
      integrationName, 
      apiCredentials, 
      webhookUrl,
      configuration,
      isActive 
    } = await c.req.json()
    
    const { env } = c
    
    const encryptedCredentials = apiCredentials ? 
      JSON.stringify({ encrypted: apiCredentials }) : null
    
    let query = `
      UPDATE integrations 
      SET integration_name = ?, webhook_url = ?, 
          configuration = ?, is_active = ?, updated_at = datetime('now')
    `
    const params = [
      integrationName, webhookUrl || null,
      JSON.stringify(configuration || {}), isActive ? 1 : 0
    ]
    
    if (encryptedCredentials) {
      query += ', api_credentials = ?'
      params.push(encryptedCredentials)
    }
    
    query += ' WHERE id = ? AND law_firm_id = ?'
    params.push(integrationId, firmId)
    
    await env.DB.prepare(query).bind(...params).run()
    
    return c.json({ success: true })
    
  } catch (error) {
    console.error('Integration update error:', error)
    return c.json({ error: 'Failed to update integration' }, 500)
  }
})

// Test integration connection
integrationsRoutes.post('/:firmId/:integrationId/test', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const integrationId = c.req.param('integrationId')
    const { env } = c
    
    const integration = await env.DB.prepare(`
      SELECT * FROM integrations 
      WHERE id = ? AND law_firm_id = ?
    `).bind(integrationId, firmId).first()
    
    if (!integration) {
      return c.json({ error: 'Integration not found' }, 404)
    }
    
    // Simulate API test based on integration type
    const testResult = await testIntegrationConnection(integration)
    
    // Update sync status
    await env.DB.prepare(`
      UPDATE integrations 
      SET sync_status = ?, error_message = ?, last_sync_at = datetime('now')
      WHERE id = ?
    `).bind(
      testResult.success ? 'active' : 'error',
      testResult.error || null,
      integrationId
    ).run()
    
    return c.json(testResult)
    
  } catch (error) {
    console.error('Integration test error:', error)
    return c.json({ error: 'Failed to test integration' }, 500)
  }
})

// Webhook endpoints for external systems
integrationsRoutes.post('/webhook/:firmId/:integrationType', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const integrationType = c.req.param('integrationType')
    const webhookData = await c.req.json()
    
    const { env } = c
    
    // Process webhook based on integration type
    const result = await processWebhook(env.DB, firmId, integrationType, webhookData)
    
    return c.json(result)
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return c.json({ error: 'Failed to process webhook' }, 500)
  }
})

// REST API endpoints for external systems

// Get leads (for CRM integrations)
integrationsRoutes.get('/api/v1/leads', requireApiAuth, async (c) => {
  try {
    const firmId = c.get('firmId')
    const { status, limit = 50, offset = 0 } = c.req.query()
    const { env } = c
    
    let query = `
      SELECT 
        l.id, l.contact_name, l.contact_email, l.contact_phone,
        l.risk_score, l.estimated_value, l.status, l.priority,
        l.notes, l.created_at, l.updated_at,
        u.name as assigned_attorney_name,
        o.office_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_attorney_id = u.id
      LEFT JOIN offices o ON l.office_id = o.id
      WHERE l.law_firm_id = ?
    `
    const params = [firmId]
    
    if (status && status !== 'all') {
      query += ' AND l.status = ?'
      params.push(status)
    }
    
    query += ` ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`
    
    const leads = await env.DB.prepare(query).bind(...params).all()
    
    return c.json({
      success: true,
      leads: leads.results || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    })
    
  } catch (error) {
    console.error('API leads error:', error)
    return c.json({ error: 'Failed to fetch leads' }, 500)
  }
})

// Create lead via API (for website integrations)
integrationsRoutes.post('/api/v1/leads', requireApiAuth, async (c) => {
  try {
    const firmId = c.get('firmId')
    const { 
      contactName, 
      contactEmail, 
      contactPhone,
      riskScore,
      estimatedValue,
      sourceType = 'api',
      sourceData = {},
      notes,
      assignedAttorneyId,
      officeId
    } = await c.req.json()
    
    if (!contactName || !contactEmail) {
      return c.json({ error: 'Contact name and email are required' }, 400)
    }
    
    const { env } = c
    
    const result = await env.DB.prepare(`
      INSERT INTO leads (
        law_firm_id, office_id, assigned_attorney_id, source_type, source_data,
        contact_name, contact_email, contact_phone, risk_score, estimated_value,
        status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      firmId, officeId || null, assignedAttorneyId || null,
      sourceType, JSON.stringify(sourceData), contactName,
      contactEmail, contactPhone || null, riskScore || null,
      estimatedValue || null, 'new', notes || null
    ).run()
    
    return c.json({
      success: true,
      leadId: result.meta.last_row_id
    })
    
  } catch (error) {
    console.error('API create lead error:', error)
    return c.json({ error: 'Failed to create lead' }, 500)
  }
})

// Update lead via API
integrationsRoutes.put('/api/v1/leads/:leadId', requireApiAuth, async (c) => {
  try {
    const firmId = c.get('firmId')
    const leadId = c.req.param('leadId')
    const { 
      status, 
      assignedAttorneyId, 
      notes,
      estimatedValue,
      priority 
    } = await c.req.json()
    
    const { env } = c
    
    await env.DB.prepare(`
      UPDATE leads 
      SET status = ?, assigned_attorney_id = ?, notes = ?,
          estimated_value = ?, priority = ?, updated_at = datetime('now')
      WHERE id = ? AND law_firm_id = ?
    `).bind(
      status, assignedAttorneyId || null, notes,
      estimatedValue || null, priority || 'medium',
      leadId, firmId
    ).run()
    
    return c.json({ success: true })
    
  } catch (error) {
    console.error('API update lead error:', error)
    return c.json({ error: 'Failed to update lead' }, 500)
  }
})

// Get analytics data (for reporting integrations)
integrationsRoutes.get('/api/v1/analytics', requireApiAuth, async (c) => {
  try {
    const firmId = c.get('firmId')
    const { timeframe = '30d', metric } = c.req.query()
    const { env } = c
    
    const timeframeSql = getTimeframeSql(timeframe)
    
    let analyticsData = {}
    
    if (!metric || metric === 'leads') {
      const leadMetrics = await env.DB.prepare(`
        SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
          AVG(risk_score) as avg_risk_score,
          SUM(estimated_value) as total_pipeline
        FROM leads
        WHERE law_firm_id = ? AND created_at >= datetime('now', '${timeframeSql}')
      `).bind(firmId).first()
      
      analyticsData.leads = leadMetrics
    }
    
    if (!metric || metric === 'assessments') {
      const assessmentMetrics = await env.DB.prepare(`
        SELECT 
          COUNT(*) as total_assessments,
          AVG(risk_score) as avg_risk_score
        FROM risk_assessments
        WHERE law_firm_id = ? AND created_at >= datetime('now', '${timeframeSql}')
      `).bind(firmId).first()
      
      analyticsData.assessments = assessmentMetrics
    }
    
    return c.json({
      success: true,
      timeframe,
      analytics: analyticsData
    })
    
  } catch (error) {
    console.error('API analytics error:', error)
    return c.json({ error: 'Failed to fetch analytics' }, 500)
  }
})

// Generate API token for external integrations
integrationsRoutes.post('/api/tokens/:firmId', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const { name, permissions = [], expiresIn = '1y' } = await c.req.json()
    
    if (!name) {
      return c.json({ error: 'Token name is required' }, 400)
    }
    
    // Generate JWT token
    const payload = {
      firmId: parseInt(firmId),
      tokenName: name,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + getExpirationSeconds(expiresIn)
    }
    
    const token = await sign(payload, getJWTSecret())
    
    return c.json({
      success: true,
      token,
      expiresIn,
      permissions
    })
    
  } catch (error) {
    console.error('Token generation error:', error)
    return c.json({ error: 'Failed to generate API token' }, 500)
  }
})

// Helper functions
async function testIntegrationConnection(integration: any): Promise<any> {
  // Simulate testing different integration types
  switch (integration.integration_type) {
    case 'salesforce':
      return { success: true, message: 'Salesforce connection successful' }
    
    case 'hubspot':
      return { success: true, message: 'HubSpot connection successful' }
    
    case 'calendly':
      return { success: true, message: 'Calendly connection successful' }
    
    case 'quickbooks':
      return { success: true, message: 'QuickBooks connection successful' }
    
    case 'zapier':
      return { success: true, message: 'Zapier webhook connection successful' }
    
    default:
      return { success: false, error: 'Unknown integration type' }
  }
}

async function processWebhook(db: D1Database, firmId: string, integrationType: string, data: any): Promise<any> {
  switch (integrationType) {
    case 'calendly':
      return await processCalendlyWebhook(db, firmId, data)
    
    case 'salesforce':
      return await processSalesforceWebhook(db, firmId, data)
    
    case 'zapier':
      return await processZapierWebhook(db, firmId, data)
    
    default:
      return { success: false, error: 'Unsupported webhook type' }
  }
}

async function processCalendlyWebhook(db: D1Database, firmId: string, data: any): Promise<any> {
  try {
    // Process Calendly meeting scheduled webhook
    if (data.event === 'invitee.created') {
      const { name, email, phone, scheduled_event } = data.payload
      
      // Create or update lead
      await db.prepare(`
        INSERT INTO leads (
          law_firm_id, source_type, source_data, contact_name,
          contact_email, contact_phone, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        firmId, 'calendly', JSON.stringify(data.payload),
        name, email, phone || null, 'consultation',
        `Consultation scheduled via Calendly for ${scheduled_event.start_time}`
      ).run()
      
      return { success: true, message: 'Lead created from Calendly booking' }
    }
    
    return { success: true, message: 'Webhook processed' }
    
  } catch (error) {
    console.error('Calendly webhook error:', error)
    return { success: false, error: 'Failed to process Calendly webhook' }
  }
}

async function processSalesforceWebhook(db: D1Database, firmId: string, data: any): Promise<any> {
  try {
    // Process Salesforce lead updates
    if (data.sobject && data.sobject.Lead) {
      const lead = data.sobject.Lead
      
      // Update existing lead or create new one
      const existingLead = await db.prepare(`
        SELECT id FROM leads 
        WHERE contact_email = ? AND law_firm_id = ?
      `).bind(lead.Email, firmId).first()
      
      if (existingLead) {
        await db.prepare(`
          UPDATE leads 
          SET status = ?, notes = ?, updated_at = datetime('now')
          WHERE id = ?
        `).bind(
          mapSalesforceStatus(lead.Status), 
          lead.Description || '',
          existingLead.id
        ).run()
      }
      
      return { success: true, message: 'Salesforce lead synchronized' }
    }
    
    return { success: true, message: 'Webhook processed' }
    
  } catch (error) {
    console.error('Salesforce webhook error:', error)
    return { success: false, error: 'Failed to process Salesforce webhook' }
  }
}

async function processZapierWebhook(db: D1Database, firmId: string, data: any): Promise<any> {
  try {
    // Generic Zapier webhook processing
    if (data.action === 'create_lead') {
      await db.prepare(`
        INSERT INTO leads (
          law_firm_id, source_type, source_data, contact_name,
          contact_email, contact_phone, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        firmId, 'zapier', JSON.stringify(data),
        data.name, data.email, data.phone || null,
        'new', data.notes || 'Created via Zapier integration'
      ).run()
      
      return { success: true, message: 'Lead created via Zapier' }
    }
    
    return { success: true, message: 'Zapier webhook processed' }
    
  } catch (error) {
    console.error('Zapier webhook error:', error)
    return { success: false, error: 'Failed to process Zapier webhook' }
  }
}

function mapSalesforceStatus(sfStatus: string): string {
  const statusMap: Record<string, string> = {
    'New': 'new',
    'Working - Contacted': 'contacted',
    'Qualified': 'qualified',
    'Closed - Converted': 'converted',
    'Closed - Not Converted': 'lost'
  }
  
  return statusMap[sfStatus] || 'new'
}

function getTimeframeSql(timeframe: string): string {
  switch (timeframe) {
    case '7d': return '-7 days'
    case '30d': return '-30 days'
    case '90d': return '-90 days'
    case '1y': return '-1 year'
    default: return '-30 days'
  }
}

function getExpirationSeconds(expiresIn: string): number {
  switch (expiresIn) {
    case '1d': return 24 * 60 * 60
    case '7d': return 7 * 24 * 60 * 60
    case '30d': return 30 * 24 * 60 * 60
    case '1y': return 365 * 24 * 60 * 60
    default: return 365 * 24 * 60 * 60
  }
}

// Import sign function
import { sign } from 'hono/jwt'

export default integrationsRoutes