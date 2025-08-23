import { Hono } from 'hono'
// Generate UUID-like string using crypto
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface CloudflareBindings {
  DB: D1Database;
}

export const enhancedDemoRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Enhanced demo registration with comprehensive lead capture
enhancedDemoRoutes.post('/register', async (c) => {
  try {
    const registrationData = await c.req.json()
    
    // Validate required fields
    const requiredFields = ['companyName', 'contactName', 'email']
    for (const field of requiredFields) {
      if (!registrationData[field]) {
        return c.json({ error: `Missing required field: ${field}` }, 400)
      }
    }
    
    const { env } = c
    const sessionId = generateUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 14) // 14-day trial
    
    // Extract marketing attribution
    const utmData = {
      campaign: registrationData.utm_campaign || 'direct',
      source: registrationData.utm_source || 'direct',
      medium: registrationData.utm_medium || 'direct'
    }
    
    // Calculate lead score
    const leadScore = calculateLeadScore(registrationData)
    
    try {
      // Create enhanced demo session with comprehensive data capture
      const demoResult = await env.DB.prepare(`
        INSERT INTO demo_sessions (
          session_id, company_name, contact_name, email, phone,
          law_firm_size, practice_areas, current_software, pain_points,
          budget_range, decision_timeline, decision_makers,
          marketing_source, utm_campaign, utm_source, utm_medium,
          expires_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        registrationData.companyName,
        registrationData.contactName,
        registrationData.email,
        registrationData.phone || '',
        registrationData.lawFirmSize || 'unknown',
        JSON.stringify(registrationData.practiceAreas || []),
        registrationData.currentSoftware || '',
        registrationData.painPoints || '',
        registrationData.budgetRange || 'unknown',
        registrationData.decisionTimeline || 'unknown',
        JSON.stringify(registrationData.decisionMakers || []),
        registrationData.marketingSource || 'direct',
        utmData.campaign,
        utmData.source,
        utmData.medium,
        expiresAt.toISOString(),
        'active'
      ).run()
      
      const demoSessionId = demoResult.meta.last_row_id
      
      // Create lead score record
      await env.DB.prepare(`
        INSERT INTO lead_scores (
          demo_session_id, company_size_score, budget_score, timeline_score,
          engagement_score, fit_score, total_score, grade, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        demoSessionId,
        leadScore.companySizeScore,
        leadScore.budgetScore,
        leadScore.timelineScore,
        0, // Initial engagement score
        leadScore.fitScore,
        leadScore.totalScore,
        leadScore.grade,
        leadScore.priority
      ).run()
      
      // Record initial activity
      await recordDemoActivity(env.DB, demoSessionId, 'demo_registered', {
        registration_data: registrationData,
        lead_score: leadScore,
        utm_data: utmData
      })
      
      // Send welcome email sequence
      await scheduleWelcomeEmailSequence(env.DB, demoSessionId, registrationData.email)
      
      // Update daily analytics
      await updateDailyAnalytics(env.DB, new Date(), 'demos_started', 1)
      
      const response = {
        success: true,
        sessionId: sessionId,
        demoUrl: `/demo/dashboard/${sessionId}`,
        expiresAt: expiresAt.toISOString(),
        leadScore: leadScore,
        trialDaysRemaining: 14,
        features: getFeaturesByTier(registrationData.interestedTier || 'professional'),
        onboardingSteps: getOnboardingSteps(leadScore.grade)
      }
      
      return c.json(response)
      
    } catch (dbError) {
      console.error('Database error during demo registration:', dbError)
      return c.json({ error: 'Failed to create demo session' }, 500)
    }
    
  } catch (error) {
    console.error('Demo registration error:', error)
    return c.json({ error: 'Invalid registration data' }, 400)
  }
})

// Get demo status with urgency indicators
enhancedDemoRoutes.get('/status/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId')
    const { env } = c
    
    const demo = await env.DB.prepare(`
      SELECT ds.*, ls.total_score, ls.grade, ls.priority
      FROM demo_sessions ds
      LEFT JOIN lead_scores ls ON ds.id = ls.demo_session_id
      WHERE ds.session_id = ?
    `).bind(sessionId).first()
    
    if (!demo) {
      return c.json({ error: 'Demo session not found' }, 404)
    }
    
    const now = new Date()
    const expiresAt = new Date(demo.expires_at)
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    // Calculate progress indicators
    const progressIndicators = await calculateProgressIndicators(env.DB, demo.id, daysRemaining)
    
    // Get recent activities
    const recentActivities = await env.DB.prepare(`
      SELECT activity_type, activity_data, timestamp
      FROM demo_activities
      WHERE demo_session_id = ?
      ORDER BY timestamp DESC
      LIMIT 10
    `).bind(demo.id).all()
    
    // Determine urgency level and messaging
    const urgencyInfo = getUrgencyInfo(daysRemaining, demo.login_count, progressIndicators.completionRate)
    
    const response = {
      sessionId: sessionId,
      companyName: demo.company_name,
      contactName: demo.contact_name,
      status: demo.status,
      daysRemaining: daysRemaining,
      expiresAt: demo.expires_at,
      lastActiveAt: demo.last_active_at,
      
      // Progress tracking
      progressIndicators,
      loginCount: demo.login_count,
      featuresUsed: JSON.parse(demo.features_used || '[]'),
      timeSpentMinutes: demo.time_spent_minutes,
      
      // Urgency and engagement
      urgencyInfo,
      leadScore: {
        total: demo.total_score,
        grade: demo.grade,
        priority: demo.priority
      },
      
      // Recent activity
      recentActivities: recentActivities.results || [],
      
      // Next steps
      recommendedActions: getRecommendedActions(daysRemaining, progressIndicators.completionRate, demo.grade),
      
      // Conversion opportunities
      conversionOpportunities: await getConversionOpportunities(env.DB, demo.id)
    }
    
    // Update last active timestamp
    await env.DB.prepare(`
      UPDATE demo_sessions 
      SET last_active_at = ?
      WHERE id = ?
    `).bind(now.toISOString(), demo.id).run()
    
    return c.json(response)
    
  } catch (error) {
    console.error('Demo status error:', error)
    return c.json({ error: 'Failed to get demo status' }, 500)
  }
})

// Record demo activity for engagement tracking
enhancedDemoRoutes.post('/activity/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId')
    const { activityType, activityData } = await c.req.json()
    const { env } = c
    
    // Get demo session
    const demo = await env.DB.prepare(`
      SELECT id FROM demo_sessions WHERE session_id = ? AND status = 'active'
    `).bind(sessionId).first()
    
    if (!demo) {
      return c.json({ error: 'Demo session not found or inactive' }, 404)
    }
    
    // Record activity
    await recordDemoActivity(env.DB, demo.id, activityType, activityData)
    
    // Update session engagement metrics
    await updateSessionEngagement(env.DB, demo.id, activityType, activityData)
    
    // Update lead score based on engagement
    await updateEngagementScore(env.DB, demo.id)
    
    return c.json({ success: true })
    
  } catch (error) {
    console.error('Activity recording error:', error)
    return c.json({ error: 'Failed to record activity' }, 500)
  }
})

// Get conversion opportunities and recommendations
enhancedDemoRoutes.get('/conversion/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId')
    const { env } = c
    
    const demo = await env.DB.prepare(`
      SELECT ds.*, ls.total_score, ls.grade, ls.priority
      FROM demo_sessions ds
      LEFT JOIN lead_scores ls ON ds.id = ls.demo_session_id
      WHERE ds.session_id = ?
    `).bind(sessionId).first()
    
    if (!demo) {
      return c.json({ error: 'Demo session not found' }, 404)
    }
    
    // Get service bundles based on firm profile
    const recommendedBundles = await getRecommendedServiceBundles(env.DB, demo)
    
    // Calculate conversion incentives
    const incentives = calculateConversionIncentives(demo)
    
    // Get testimonials and case studies
    const socialProof = await getSocialProofContent(env.DB, demo.practice_areas)
    
    const response = {
      sessionId: sessionId,
      companyProfile: {
        name: demo.company_name,
        size: demo.law_firm_size,
        practiceAreas: JSON.parse(demo.practice_areas || '[]'),
        budgetRange: demo.budget_range,
        timeline: demo.decision_timeline
      },
      
      // Recommended packages
      recommendedBundles,
      
      // Conversion incentives
      incentives,
      
      // Social proof
      socialProof,
      
      // Urgency factors
      urgencyFactors: {
        daysRemaining: Math.ceil((new Date(demo.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        earlyBirdDiscount: incentives.earlyBirdDiscount,
        limitedTime: true
      },
      
      // Next steps
      nextSteps: [
        'Schedule a personalized walkthrough',
        'Discuss custom integration needs',
        'Review pricing and implementation timeline',
        'Connect with existing customers in your practice area'
      ]
    }
    
    return c.json(response)
    
  } catch (error) {
    console.error('Conversion opportunities error:', error)
    return c.json({ error: 'Failed to get conversion opportunities' }, 500)
  }
})

// Helper Functions

function calculateLeadScore(registrationData: any): any {
  let companySizeScore = 0
  let budgetScore = 0
  let timelineScore = 0
  let fitScore = 0
  
  // Company size scoring (1-10)
  switch (registrationData.lawFirmSize) {
    case 'solo': companySizeScore = 3; break
    case 'small': companySizeScore = 6; break
    case 'medium': companySizeScore = 8; break
    case 'large': companySizeScore = 10; break
    default: companySizeScore = 1
  }
  
  // Budget scoring (1-10)
  switch (registrationData.budgetRange) {
    case 'under-5k': budgetScore = 3; break
    case '5k-15k': budgetScore = 6; break
    case '15k-50k': budgetScore = 8; break
    case '50k+': budgetScore = 10; break
    default: budgetScore = 1
  }
  
  // Timeline scoring (1-10)
  switch (registrationData.decisionTimeline) {
    case 'immediate': timelineScore = 10; break
    case '1-3months': timelineScore = 8; break
    case '3-6months': timelineScore = 5; break
    case '6months+': timelineScore = 2; break
    default: timelineScore = 1
  }
  
  // Practice area fit scoring (1-10)
  const practiceAreas = registrationData.practiceAreas || []
  const highValueAreas = ['estate-planning', 'business-law', 'wealth-management', 'tax-law']
  const matchCount = practiceAreas.filter((area: string) => highValueAreas.includes(area)).length
  fitScore = Math.min(10, matchCount * 2.5)
  
  const totalScore = companySizeScore + budgetScore + timelineScore + fitScore
  
  // Grade assignment
  let grade = 'D'
  let priority = 'low'
  
  if (totalScore >= 32) {
    grade = 'A'
    priority = 'urgent'
  } else if (totalScore >= 24) {
    grade = 'B'
    priority = 'high'
  } else if (totalScore >= 16) {
    grade = 'C'
    priority = 'medium'
  }
  
  return {
    companySizeScore,
    budgetScore,
    timelineScore,
    fitScore,
    totalScore,
    grade,
    priority
  }
}

async function recordDemoActivity(db: D1Database, demoSessionId: number, activityType: string, activityData: any) {
  await db.prepare(`
    INSERT INTO demo_activities (demo_session_id, activity_type, activity_data, timestamp)
    VALUES (?, ?, ?, ?)
  `).bind(
    demoSessionId,
    activityType,
    JSON.stringify(activityData),
    new Date().toISOString()
  ).run()
}

async function updateSessionEngagement(db: D1Database, demoSessionId: number, activityType: string, activityData: any) {
  const updates: string[] = []
  const values: any[] = []
  
  // Update engagement metrics based on activity type
  switch (activityType) {
    case 'login':
      updates.push('login_count = login_count + 1')
      break
    case 'page_view':
      updates.push('pages_viewed = pages_viewed + 1')
      break
    case 'feature_use':
      // Update features used array
      const currentFeatures = await db.prepare(`
        SELECT features_used FROM demo_sessions WHERE id = ?
      `).bind(demoSessionId).first()
      
      const features = JSON.parse(currentFeatures?.features_used || '[]')
      if (!features.includes(activityData.feature)) {
        features.push(activityData.feature)
        updates.push('features_used = ?')
        values.push(JSON.stringify(features))
      }
      break
    case 'document_create':
      updates.push('documents_created = documents_created + 1')
      break
    case 'time_spent':
      updates.push('time_spent_minutes = time_spent_minutes + ?')
      values.push(activityData.minutes || 0)
      break
  }
  
  if (updates.length > 0) {
    const sql = `UPDATE demo_sessions SET ${updates.join(', ')}, last_active_at = ? WHERE id = ?`
    values.push(new Date().toISOString(), demoSessionId)
    await db.prepare(sql).bind(...values).run()
  }
}

async function updateEngagementScore(db: D1Database, demoSessionId: number) {
  // Get current engagement metrics
  const demo = await db.prepare(`
    SELECT login_count, pages_viewed, features_used, time_spent_minutes, documents_created
    FROM demo_sessions WHERE id = ?
  `).bind(demoSessionId).first()
  
  if (!demo) return
  
  // Calculate engagement score (1-10)
  let engagementScore = 0
  
  // Login frequency (max 2 points)
  engagementScore += Math.min(2, demo.login_count * 0.5)
  
  // Page views (max 2 points)
  engagementScore += Math.min(2, demo.pages_viewed * 0.1)
  
  // Features used (max 3 points)
  const featuresUsed = JSON.parse(demo.features_used || '[]').length
  engagementScore += Math.min(3, featuresUsed * 0.5)
  
  // Time spent (max 2 points)
  engagementScore += Math.min(2, demo.time_spent_minutes * 0.01)
  
  // Documents created (max 1 point)
  engagementScore += Math.min(1, demo.documents_created * 0.2)
  
  // Update lead score
  await db.prepare(`
    UPDATE lead_scores 
    SET engagement_score = ?, total_score = company_size_score + budget_score + timeline_score + ? + fit_score,
        updated_at = ?
    WHERE demo_session_id = ?
  `).bind(Math.round(engagementScore), Math.round(engagementScore), new Date().toISOString(), demoSessionId).run()
}

async function scheduleWelcomeEmailSequence(db: D1Database, demoSessionId: number, email: string) {
  const emailSequence = [
    { type: 'welcome', delay: 0 },
    { type: 'day_3_check_in', delay: 3 },
    { type: 'day_7_tips', delay: 7 },
    { type: 'day_10_urgency', delay: 10 },
    { type: 'day_13_final', delay: 13 }
  ]
  
  for (const emailConfig of emailSequence) {
    const sendDate = new Date()
    sendDate.setDate(sendDate.getDate() + emailConfig.delay)
    
    // In production, this would schedule actual emails
    console.log(`Scheduling ${emailConfig.type} email for ${email} on ${sendDate.toISOString()}`)
  }
}

async function updateDailyAnalytics(db: D1Database, date: Date, metric: string, increment: number) {
  const dateStr = date.toISOString().split('T')[0]
  
  await db.prepare(`
    INSERT INTO conversion_analytics (date, ${metric})
    VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET
    ${metric} = ${metric} + ?
  `).bind(dateStr, increment, increment).run()
}

async function calculateProgressIndicators(db: D1Database, demoSessionId: number, daysRemaining: number) {
  const activities = await db.prepare(`
    SELECT activity_type, COUNT(*) as count
    FROM demo_activities
    WHERE demo_session_id = ?
    GROUP BY activity_type
  `).bind(demoSessionId).all()
  
  const activityMap = new Map()
  for (const activity of activities.results || []) {
    activityMap.set(activity.activity_type, activity.count)
  }
  
  // Define completion criteria
  const milestones = [
    { name: 'Account Setup', completed: activityMap.has('login') },
    { name: 'Risk Assessment Tool', completed: activityMap.has('assessment_completed') },
    { name: 'Lead Management', completed: activityMap.has('lead_created') },
    { name: 'Document Generation', completed: activityMap.has('document_generated') },
    { name: 'Analytics Review', completed: activityMap.has('analytics_viewed') },
    { name: 'Customization', completed: activityMap.has('branding_updated') }
  ]
  
  const completedCount = milestones.filter(m => m.completed).length
  const completionRate = Math.round((completedCount / milestones.length) * 100)
  
  return {
    milestones,
    completedCount,
    totalCount: milestones.length,
    completionRate,
    daysRemaining
  }
}

function getUrgencyInfo(daysRemaining: number, loginCount: number, completionRate: number) {
  let urgencyLevel = 'low'
  let urgencyMessage = ''
  let urgencyColor = 'green'
  
  if (daysRemaining <= 2) {
    urgencyLevel = 'critical'
    urgencyMessage = 'Trial expires in 2 days! Don\'t lose access to your data.'
    urgencyColor = 'red'
  } else if (daysRemaining <= 5) {
    urgencyLevel = 'high'
    urgencyMessage = 'Trial expires soon. Schedule a call to discuss your needs.'
    urgencyColor = 'orange'
  } else if (daysRemaining <= 10 && completionRate < 50) {
    urgencyLevel = 'medium'
    urgencyMessage = 'You\'re halfway through your trial. Explore more features!'
    urgencyColor = 'yellow'
  } else if (loginCount === 1) {
    urgencyLevel = 'medium'
    urgencyMessage = 'Welcome back! Continue exploring your personalized demo.'
    urgencyColor = 'blue'
  }
  
  return {
    level: urgencyLevel,
    message: urgencyMessage,
    color: urgencyColor,
    daysRemaining,
    showCountdown: daysRemaining <= 7
  }
}

function getRecommendedActions(daysRemaining: number, completionRate: number, grade: string) {
  const actions = []
  
  if (completionRate < 30) {
    actions.push({
      title: 'Complete Platform Tour',
      description: 'Discover key features that will save you time',
      priority: 'high',
      estimatedTime: '15 minutes'
    })
  }
  
  if (daysRemaining <= 5) {
    actions.push({
      title: 'Schedule Consultation',
      description: 'Discuss implementation and custom needs',
      priority: 'urgent',
      estimatedTime: '30 minutes'
    })
  }
  
  if (grade === 'A' || grade === 'B') {
    actions.push({
      title: 'Review Service Packages',
      description: 'See recommended bundles for your firm size',
      priority: 'high',
      estimatedTime: '10 minutes'
    })
  }
  
  actions.push({
    title: 'Import Sample Data',
    description: 'See how your actual clients would appear',
    priority: 'medium',
    estimatedTime: '20 minutes'
  })
  
  return actions
}

async function getConversionOpportunities(db: D1Database, demoSessionId: number) {
  // This would analyze user behavior and return personalized conversion opportunities
  return [
    {
      type: 'early_bird_discount',
      title: '20% Early Bird Discount',
      description: 'Convert before trial expires and save 20% on your first year',
      validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      type: 'free_setup',
      title: 'Free Setup & Training',
      description: 'We\'ll handle the complete setup and train your team',
      value: '$2,500'
    }
  ]
}

async function getRecommendedServiceBundles(db: D1Database, demo: any) {
  // Get bundles that match the firm profile
  const bundles = await db.prepare(`
    SELECT * FROM service_bundles 
    WHERE active = 1 
    ORDER BY bundle_price ASC
  `).all()
  
  // This would include logic to recommend based on firm size, budget, etc.
  return bundles.results || []
}

function calculateConversionIncentives(demo: any) {
  const daysRemaining = Math.ceil((new Date(demo.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    earlyBirdDiscount: daysRemaining > 7 ? 20 : (daysRemaining > 3 ? 15 : 10),
    freeSetupValue: 2500,
    freeTrainingHours: demo.law_firm_size === 'large' ? 8 : (demo.law_firm_size === 'medium' ? 4 : 2),
    extendedTrial: daysRemaining <= 3 ? 7 : 0 // Additional days if near expiry
  }
}

async function getSocialProofContent(db: D1Database, practiceAreas: string) {
  // This would return relevant testimonials and case studies
  const areas = JSON.parse(practiceAreas || '[]')
  
  return {
    testimonials: [
      {
        name: 'Sarah Johnson, Managing Partner',
        firm: 'Johnson & Associates',
        quote: 'AssetShield Pro increased our qualified leads by 300% in the first quarter.',
        practiceArea: 'Estate Planning'
      }
    ],
    caseStudies: [
      {
        title: 'How a 15-Attorney Firm Generated $2M in New Business',
        firmSize: 'medium',
        results: '+300% qualified leads, +250% revenue growth',
        timeframe: '6 months'
      }
    ]
  }
}

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

function getOnboardingSteps(grade: string): any[] {
  const baseSteps = [
    { id: 1, title: 'Complete Your Profile', description: 'Add firm details and branding', completed: false },
    { id: 2, title: 'Explore Risk Assessment', description: 'Try the client risk assessment tool', completed: false },
    { id: 3, title: 'Review Analytics Dashboard', description: 'See how client data is visualized', completed: false },
    { id: 4, title: 'Test Lead Management', description: 'Create and manage sample leads', completed: false }
  ]
  
  if (grade === 'A' || grade === 'B') {
    baseSteps.push(
      { id: 5, title: 'Schedule Implementation Call', description: 'Discuss go-live timeline and requirements', completed: false }
    )
  } else {
    baseSteps.push(
      { id: 5, title: 'Connect with Success Manager', description: 'Get personalized guidance and best practices', completed: false }
    )
  }
  
  return baseSteps
}

export default enhancedDemoRoutes