import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

export const documentsRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Get available document templates
documentsRoutes.get('/templates', async (c) => {
  try {
    const jurisdiction = c.req.query('jurisdiction') || 'US'
    const language = c.req.query('language') || 'en'
    
    const templates = await c.env.DB.prepare(`
      SELECT id, name, type, jurisdiction, language, variables
      FROM document_templates 
      WHERE jurisdiction = ? AND language = ? AND is_active = 1
      ORDER BY name
    `).bind(jurisdiction, language).all()
    
    return c.json({
      success: true,
      templates: templates.results || []
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to fetch templates' }, 500)
  }
})

// Generate document from template
documentsRoutes.post('/generate', async (c) => {
  try {
    const { templateId, documentData, documentName } = await c.req.json()
    const userId = c.req.header('user-id') || '1' // In real app, get from JWT
    
    // Get template
    const template = await c.env.DB.prepare(`
      SELECT * FROM document_templates WHERE id = ? AND is_active = 1
    `).bind(templateId).first()
    
    if (!template) {
      return c.json({ error: 'Template not found' }, 404)
    }
    
    // Process template with data
    let processedContent = template.template_content
    const variables = JSON.parse(template.variables || '[]')
    
    // Replace template variables
    variables.forEach(variable => {
      const value = documentData[variable] || ''
      const regex = new RegExp(`{{\\s*${variable}\\s*}}`, 'g')
      processedContent = processedContent.replace(regex, value)
    })
    
    // Save generated document record
    const result = await c.env.DB.prepare(`
      INSERT INTO generated_documents (template_id, user_id, document_name, document_data, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(templateId, userId, documentName, JSON.stringify(documentData)).run()
    
    return c.json({
      success: true,
      documentId: result.meta.last_row_id,
      content: processedContent,
      downloadUrl: `/api/documents/download/${result.meta.last_row_id}`
    })
    
  } catch (error) {
    console.error('Document generation error:', error)
    return c.json({ error: 'Failed to generate document' }, 500)
  }
})

// Download generated document
documentsRoutes.get('/download/:id', async (c) => {
  try {
    const documentId = c.req.param('id')
    const userId = c.req.header('user-id') || '1'
    
    const document = await c.env.DB.prepare(`
      SELECT gd.*, dt.template_content, dt.variables, dt.name as template_name
      FROM generated_documents gd
      JOIN document_templates dt ON gd.template_id = dt.id
      WHERE gd.id = ? AND gd.user_id = ?
    `).bind(documentId, userId).first()
    
    if (!document) {
      return c.json({ error: 'Document not found' }, 404)
    }
    
    // Update download count
    await c.env.DB.prepare(`
      UPDATE generated_documents 
      SET download_count = download_count + 1 
      WHERE id = ?
    `).bind(documentId).run()
    
    // Process template with saved data
    let processedContent = document.template_content
    const variables = JSON.parse(document.variables || '[]')
    const documentData = JSON.parse(document.document_data || '{}')
    
    variables.forEach(variable => {
      const value = documentData[variable] || ''
      const regex = new RegExp(`{{\\s*${variable}\\s*}}`, 'g')
      processedContent = processedContent.replace(regex, value)
    })
    
    // Return as HTML for now (in production, convert to PDF)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${document.document_name}</title>
        
        <!-- Favicon -->
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        <link rel="apple-touch-icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDE4MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxODAiIGhlaWdodD0iMTgwIiByeD0iNDAiIGZpbGw9IiMyZDYzYTQiLz4KPHBhdGggZD0iTTkwIDIwTDQ1IDUwVjEwMEw5MCA2MEwxMzUgMTAwVjUwTDkwIDIwWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTkwIDQwTDY3IDYwVjEwMEw5MCAxMjBMMTEzIDEwMFY2MEw5MCA0MFoiIGZpbGw9IiMyZDYzYTQiLz4KPC9zdmc+" />
        <link rel="shortcut icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1, h2 { color: #333; }
          p { margin: 10px 0; }
          ul { margin: 10px 0 10px 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .footer { border-top: 1px solid #ccc; padding-top: 20px; margin-top: 40px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AssetShield App</h1>
          <p>Generated: ${new Date().toLocaleDateString()}</p>
        </div>
        ${processedContent}
        <div class="footer">
          <p>This document was generated by AssetShield App. For questions, contact support@assetshieldapp.com</p>
        </div>
      </body>
      </html>
    `
    
    c.header('Content-Type', 'text/html')
    c.header('Content-Disposition', `attachment; filename="${document.document_name}.html"`)
    return c.text(htmlContent)
    
  } catch (error) {
    return c.json({ error: 'Failed to download document' }, 500)
  }
})

// Get user's generated documents
documentsRoutes.get('/my-documents', async (c) => {
  try {
    const userId = c.req.header('user-id') || '1'
    
    const documents = await c.env.DB.prepare(`
      SELECT 
        gd.id, gd.document_name, gd.download_count, gd.created_at,
        dt.name as template_name, dt.type as template_type
      FROM generated_documents gd
      JOIN document_templates dt ON gd.template_id = dt.id
      WHERE gd.user_id = ?
      ORDER BY gd.created_at DESC
    `).bind(userId).all()
    
    return c.json({
      success: true,
      documents: documents.results || []
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to fetch documents' }, 500)
  }
})

// Create custom template (for law firms)
documentsRoutes.post('/templates', async (c) => {
  try {
    const { name, type, jurisdiction, language, template_content, variables } = await c.req.json()
    const userId = c.req.header('user-id') || '1'
    
    const result = await c.env.DB.prepare(`
      INSERT INTO document_templates (name, type, jurisdiction, language, template_content, variables, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(name, type, jurisdiction, language, template_content, JSON.stringify(variables), userId).run()
    
    return c.json({
      success: true,
      templateId: result.meta.last_row_id,
      message: 'Template created successfully'
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to create template' }, 500)
  }
})

// AI-powered document insights (mock implementation)
documentsRoutes.post('/insights', async (c) => {
  try {
    const { documentContent, documentType } = await c.req.json()
    
    // Mock AI analysis - in production, integrate with AI service
    const insights = {
      riskFactors: [
        {
          factor: 'Insufficient liability protection',
          severity: 'High',
          recommendation: 'Consider establishing an LLC structure'
        },
        {
          factor: 'Personal assets at risk',
          severity: 'Medium', 
          recommendation: 'Implement asset protection trust'
        }
      ],
      complianceScore: 75,
      recommendations: [
        'Update jurisdiction-specific clauses for better protection',
        'Add privacy provisions for enhanced confidentiality',
        'Include dispute resolution mechanisms'
      ],
      estimatedProtectionLevel: 'Moderate',
      suggestedImprovements: [
        'Enhanced liability shields',
        'International protection structures',
        'Tax optimization strategies'
      ]
    }
    
    return c.json({
      success: true,
      insights
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to generate insights' }, 500)
  }
})

// Bulk document generation for law firms
documentsRoutes.post('/bulk-generate', async (c) => {
  try {
    const { templateId, clientsData } = await c.req.json()
    const userId = c.req.header('user-id') || '1'
    
    const template = await c.env.DB.prepare(`
      SELECT * FROM document_templates WHERE id = ? AND is_active = 1
    `).bind(templateId).first()
    
    if (!template) {
      return c.json({ error: 'Template not found' }, 404)
    }
    
    const generatedDocuments = []
    const variables = JSON.parse(template.variables || '[]')
    
    for (const clientData of clientsData) {
      // Process template for each client
      let processedContent = template.template_content
      
      variables.forEach(variable => {
        const value = clientData[variable] || ''
        const regex = new RegExp(`{{\\s*${variable}\\s*}}`, 'g')
        processedContent = processedContent.replace(regex, value)
      })
      
      // Save document
      const result = await c.env.DB.prepare(`
        INSERT INTO generated_documents (template_id, user_id, document_name, document_data, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(templateId, userId, `${template.name} - ${clientData.client_name}`, JSON.stringify(clientData)).run()
      
      generatedDocuments.push({
        documentId: result.meta.last_row_id,
        clientName: clientData.client_name,
        downloadUrl: `/api/documents/download/${result.meta.last_row_id}`
      })
    }
    
    return c.json({
      success: true,
      generated: generatedDocuments.length,
      documents: generatedDocuments
    })
    
  } catch (error) {
    return c.json({ error: 'Failed to generate bulk documents' }, 500)
  }
})