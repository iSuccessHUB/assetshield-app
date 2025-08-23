import { Hono } from 'hono'
import { PlatformProvisioningService } from '../services/platform-provisioning'
import { EmailService } from '../services/email-service'

interface CloudflareBindings {
  DB: D1Database;
}

export const platformApiRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Get platform by subdomain (for white-label platform access)
platformApiRoutes.get('/platform/:subdomain', async (c) => {
  try {
    const subdomain = c.req.param('subdomain')
    const provisioningService = new PlatformProvisioningService(c.env.DB)
    
    const platform = await provisioningService.getPlatformBySubdomain(subdomain)
    
    if (!platform) {
      return c.json({ error: 'Platform not found' }, 404)
    }
    
    // Return platform info (excluding sensitive data)
    const platformInfo = {
      id: platform.id,
      firmName: platform.firm_name,
      subdomain: platform.subdomain,
      tier: platform.tier,
      status: platform.status,
      trialEndsAt: platform.trial_ends_at,
      features: JSON.parse(platform.features_enabled || '[]'),
      branding: JSON.parse(platform.branding_config || '{}'),
      createdAt: platform.created_at
    }
    
    return c.json({ success: true, platform: platformInfo })
    
  } catch (error) {
    console.error('❌ Error fetching platform:', error)
    return c.json({ error: 'Failed to fetch platform' }, 500)
  }
})

// Get platform analytics
platformApiRoutes.get('/platform/:subdomain/analytics', async (c) => {
  try {
    const subdomain = c.req.param('subdomain')
    const days = parseInt(c.req.query('days') || '30')
    
    const provisioningService = new PlatformProvisioningService(c.env.DB)
    
    // Get platform first
    const platform = await provisioningService.getPlatformBySubdomain(subdomain)
    if (!platform) {
      return c.json({ error: 'Platform not found' }, 404)
    }
    
    // Get analytics
    const analytics = await provisioningService.getPlatformAnalytics(platform.id, days)
    
    return c.json({ success: true, analytics })
    
  } catch (error) {
    console.error('❌ Error fetching analytics:', error)
    return c.json({ error: 'Failed to fetch analytics' }, 500)
  }
})

// Add team member
platformApiRoutes.post('/platform/:subdomain/team', async (c) => {
  try {
    const subdomain = c.req.param('subdomain')
    const { email, name, role } = await c.req.json()
    
    if (!email || !name || !role) {
      return c.json({ error: 'Missing required fields: email, name, role' }, 400)
    }
    
    const provisioningService = new PlatformProvisioningService(c.env.DB)
    const emailService = new EmailService(c.env.DB)
    
    // Get platform
    const platform = await provisioningService.getPlatformBySubdomain(subdomain)
    if (!platform) {
      return c.json({ error: 'Platform not found' }, 404)
    }
    
    // Add team member
    const invitationToken = await provisioningService.addTeamMember(platform.id, email, name, role)
    
    // Send invitation email
    await emailService.sendTeamInvitationEmail(platform.id, {
      email,
      name,
      role,
      token: invitationToken
    })
    
    // Log activity
    await provisioningService.logActivity(
      platform.id,
      'system',
      'team_member_invited',
      { email, name, role }
    )
    
    return c.json({ 
      success: true, 
      message: 'Team member invited successfully',
      invitationToken 
    })
    
  } catch (error) {
    console.error('❌ Error adding team member:', error)
    return c.json({ error: 'Failed to add team member' }, 500)
  }
})

// Get team members
platformApiRoutes.get('/platform/:subdomain/team', async (c) => {
  try {
    const subdomain = c.req.param('subdomain')
    
    const provisioningService = new PlatformProvisioningService(c.env.DB)
    
    // Get platform
    const platform = await provisioningService.getPlatformBySubdomain(subdomain)
    if (!platform) {
      return c.json({ error: 'Platform not found' }, 404)
    }
    
    // Get team members
    const teamMembers = await provisioningService.getTeamMembers(platform.id)
    
    return c.json({ success: true, teamMembers: teamMembers.results })
    
  } catch (error) {
    console.error('❌ Error fetching team members:', error)
    return c.json({ error: 'Failed to fetch team members' }, 500)
  }
})

// Update platform status (for testing)
platformApiRoutes.put('/platform/:subdomain/status', async (c) => {
  try {
    const subdomain = c.req.param('subdomain')
    const { status } = await c.req.json()
    
    if (!status) {
      return c.json({ error: 'Status is required' }, 400)
    }
    
    const provisioningService = new PlatformProvisioningService(c.env.DB)
    
    // Get platform
    const platform = await provisioningService.getPlatformBySubdomain(subdomain)
    if (!platform) {
      return c.json({ error: 'Platform not found' }, 404)
    }
    
    // Update status
    await provisioningService.updatePlatformStatus(platform.id, status)
    
    // Log activity
    await provisioningService.logActivity(
      platform.id,
      'system',
      'status_updated',
      { oldStatus: platform.status, newStatus: status }
    )
    
    return c.json({ success: true, message: 'Platform status updated' })
    
  } catch (error) {
    console.error('❌ Error updating platform status:', error)
    return c.json({ error: 'Failed to update platform status' }, 500)
  }
})

// Test email sending
platformApiRoutes.post('/platform/:subdomain/test-email', async (c) => {
  try {
    const subdomain = c.req.param('subdomain')
    const { type, clientData } = await c.req.json()
    
    const provisioningService = new PlatformProvisioningService(c.env.DB)
    const emailService = new EmailService(c.env.DB)
    
    // Get platform
    const platform = await provisioningService.getPlatformBySubdomain(subdomain)
    if (!platform) {
      return c.json({ error: 'Platform not found' }, 404)
    }
    
    let result = false
    
    switch (type) {
      case 'assessment_complete':
        result = await emailService.sendAssessmentCompleteEmail(platform.id, clientData)
        break
        
      case 'consultation_reminder':
        result = await emailService.sendConsultationReminder(platform.id, clientData, {
          date: 'Tomorrow, January 28, 2025',
          time: '2:00 PM EST',
          duration: '60 minutes',
          location: 'Video Conference',
          attorney_name: platform.owner_name
        })
        break
        
      default:
        return c.json({ error: 'Invalid email type' }, 400)
    }
    
    return c.json({ success: result, message: result ? 'Email sent successfully' : 'Email sending failed' })
    
  } catch (error) {
    console.error('❌ Error sending test email:', error)
    return c.json({ error: 'Failed to send test email' }, 500)
  }
})

// List all platforms (admin endpoint)
platformApiRoutes.get('/admin/platforms', async (c) => {
  try {
    const provisioningService = new PlatformProvisioningService(c.env.DB)
    
    const platforms = await c.env.DB.prepare(`
      SELECT 
        id, firm_name, subdomain, owner_email, owner_name, tier, status,
        created_at, trial_ends_at, setup_fee_paid, monthly_fee
      FROM platform_instances 
      ORDER BY created_at DESC
      LIMIT 50
    `).all()
    
    return c.json({ success: true, platforms: platforms.results })
    
  } catch (error) {
    console.error('❌ Error fetching platforms:', error)
    return c.json({ error: 'Failed to fetch platforms' }, 500)
  }
})

// Platform provisioning status check
platformApiRoutes.get('/admin/platform/:id/status', async (c) => {
  try {
    const platformId = parseInt(c.req.param('id'))
    
    const provisioningService = new PlatformProvisioningService(c.env.DB)
    const platform = await provisioningService.getPlatformById(platformId)
    
    if (!platform) {
      return c.json({ error: 'Platform not found' }, 404)
    }
    
    // Get recent activity
    const recentActivity = await c.env.DB.prepare(`
      SELECT action, details, created_at
      FROM activity_logs 
      WHERE platform_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(platformId).all()
    
    return c.json({ 
      success: true, 
      platform: {
        id: platform.id,
        firmName: platform.firm_name,
        subdomain: platform.subdomain,
        status: platform.status,
        tier: platform.tier,
        createdAt: platform.created_at,
        trialEndsAt: platform.trial_ends_at,
        platformUrl: `https://${platform.subdomain}.assetshield.app`
      },
      recentActivity: recentActivity.results
    })
    
  } catch (error) {
    console.error('❌ Error checking platform status:', error)
    return c.json({ error: 'Failed to check platform status' }, 500)
  }
})

export default platformApiRoutes