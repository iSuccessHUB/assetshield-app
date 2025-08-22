import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

export const consultationRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Schedule consultation request
consultationRoutes.post('/schedule', async (c) => {
  try {
    const body = await c.req.json()
    const { 
      name, 
      email, 
      phone, 
      contactMethod, 
      preferredTime, 
      urgency, 
      primaryConcern, 
      message 
    } = body

    // Validate required fields
    if (!name || !email || !phone || !contactMethod || !preferredTime || !urgency || !primaryConcern) {
      return c.json({ 
        error: 'Missing required fields. Please fill in all required information.' 
      }, 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return c.json({ 
        error: 'Please provide a valid email address.' 
      }, 400)
    }

    // Generate request ID
    const requestId = `CONS-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

    // Insert consultation request into database
    const insertQuery = `
      INSERT INTO demo_requests (
        email, name, phone, firm_name, practice_size, 
        interest_tier, message, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `

    // Prepare consultation details for message field
    const consultationDetails = JSON.stringify({
      contactMethod,
      preferredTime,
      urgency,
      primaryConcern,
      originalMessage: message || '',
      requestType: 'consultation',
      requestId
    })

    const result = await c.env.DB.prepare(insertQuery)
      .bind(
        email,
        name,
        phone,
        '', // firm_name - empty for individual consultation
        '', // practice_size - empty for individual consultation  
        'consultation', // Using interest_tier field to indicate this is a consultation
        consultationDetails,
      )
      .run()

    if (!result.success) {
      console.error('Database insert failed:', result.error)
      return c.json({ 
        error: 'Failed to schedule consultation. Please try again.' 
      }, 500)
    }

    // TODO: Send confirmation email (would integrate with email service)
    // TODO: Send notification to internal team (would integrate with notification service)
    
    console.log(`Consultation scheduled: ${requestId} for ${name} (${email})`)

    return c.json({
      success: true,
      requestId,
      message: 'Consultation request submitted successfully',
      nextSteps: [
        'You will receive a confirmation email within 15 minutes',
        'Our team will contact you within 24 hours to confirm your appointment',
        'We will send you a calendar invite with all the details',
        'Please prepare any questions about your asset protection needs'
      ]
    })

  } catch (error) {
    console.error('Consultation scheduling error:', error)
    return c.json({ 
      error: 'An unexpected error occurred. Please try again or contact us directly.' 
    }, 500)
  }
})

// Get consultation requests (for admin/internal use)
consultationRoutes.get('/requests', async (c) => {
  try {
    const query = `
      SELECT 
        id,
        email,
        name,
        phone,
        message,
        status,
        created_at
      FROM demo_requests 
      WHERE interest_tier = 'consultation'
      ORDER BY created_at DESC
      LIMIT 50
    `
    
    const result = await c.env.DB.prepare(query).all()
    
    if (!result.success) {
      return c.json({ error: 'Failed to fetch consultation requests' }, 500)
    }

    // Parse consultation details from message field
    const consultations = result.results.map((row: any) => {
      let consultationDetails = {}
      try {
        consultationDetails = JSON.parse(row.message || '{}')
      } catch {
        consultationDetails = { originalMessage: row.message }
      }

      return {
        id: row.id,
        email: row.email,
        name: row.name,
        phone: row.phone,
        status: row.status,
        created_at: row.created_at,
        requestId: consultationDetails.requestId || `CONS-${row.id}`,
        contactMethod: consultationDetails.contactMethod || 'phone',
        preferredTime: consultationDetails.preferredTime || 'flexible',
        urgency: consultationDetails.urgency || 'planning',
        primaryConcern: consultationDetails.primaryConcern || 'general_consultation',
        originalMessage: consultationDetails.originalMessage || ''
      }
    })

    return c.json({ 
      success: true,
      consultations 
    })

  } catch (error) {
    console.error('Error fetching consultation requests:', error)
    return c.json({ 
      error: 'Failed to fetch consultation requests' 
    }, 500)
  }
})

// Update consultation status (for admin/internal use)
consultationRoutes.put('/requests/:id/status', async (c) => {
  try {
    const id = c.req.param('id')
    const { status, scheduled_at } = await c.req.json()

    // Validate status
    const validStatuses = ['pending', 'scheduled', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return c.json({ 
        error: 'Invalid status. Must be one of: pending, scheduled, completed, cancelled' 
      }, 400)
    }

    const updateQuery = `
      UPDATE demo_requests 
      SET status = ?, scheduled_at = ?, updated_at = datetime('now')
      WHERE id = ? AND interest_tier = 'consultation'
    `

    const result = await c.env.DB.prepare(updateQuery)
      .bind(status, scheduled_at || null, id)
      .run()

    if (!result.success) {
      return c.json({ 
        error: 'Failed to update consultation status' 
      }, 500)
    }

    if (result.changes === 0) {
      return c.json({ 
        error: 'Consultation request not found' 
      }, 404)
    }

    return c.json({ 
      success: true,
      message: 'Consultation status updated successfully' 
    })

  } catch (error) {
    console.error('Error updating consultation status:', error)
    return c.json({ 
      error: 'Failed to update consultation status' 
    }, 500)
  }
})

// Get consultation statistics
consultationRoutes.get('/stats', async (c) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as this_week,
        COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as this_month
      FROM demo_requests 
      WHERE interest_tier = 'consultation'
    `
    
    const result = await c.env.DB.prepare(query).first()
    
    if (!result) {
      return c.json({ 
        error: 'Failed to fetch consultation statistics' 
      }, 500)
    }

    return c.json({ 
      success: true,
      stats: {
        total: result.total || 0,
        pending: result.pending || 0,
        scheduled: result.scheduled || 0,
        completed: result.completed || 0,
        cancelled: result.cancelled || 0,
        thisWeek: result.this_week || 0,
        thisMonth: result.this_month || 0
      }
    })

  } catch (error) {
    console.error('Error fetching consultation statistics:', error)
    return c.json({ 
      error: 'Failed to fetch consultation statistics' 
    }, 500)
  }
})