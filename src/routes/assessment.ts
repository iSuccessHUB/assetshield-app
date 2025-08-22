import { Hono } from 'hono'
import type { CloudflareBindings, RiskAssessment, User, AssessmentFormData, RiskResult } from '../types'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Calculate risk level based on assessment data
function calculateRiskLevel(data: AssessmentFormData): RiskResult {
  let riskScore = 0
  let wealthAtRisk = 0
  
  // Parse net worth
  const netWorthMap: { [key: string]: number } = {
    'under_500k': 250000,
    '500k_1m': 750000,
    '1m_5m': 3000000,
    '5m_10m': 7500000,
    'over_10m': 15000000
  }
  
  const netWorth = netWorthMap[data.netWorth] || 250000
  
  // Risk factors scoring
  if (data.profession === 'doctor' || data.profession === 'lawyer' || data.profession === 'business_owner') {
    riskScore += 3
  }
  
  if (data.hasRealEstate) {
    riskScore += 2
  }
  
  if (data.legalHistory.includes('lawsuit') || data.legalHistory.includes('divorce')) {
    riskScore += 3
  }
  
  if (data.legalHistory.includes('bankruptcy')) {
    riskScore += 4
  }
  
  if (data.currentProtection.length === 0 || data.currentProtection.includes('none')) {
    riskScore += 2
  }
  
  // Determine risk level and wealth at risk
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  let riskPercentage = 0
  
  if (riskScore <= 3) {
    riskLevel = 'LOW'
    riskPercentage = 0.1 // 10%
  } else if (riskScore <= 7) {
    riskLevel = 'MEDIUM'
    riskPercentage = 0.3 // 30%
  } else {
    riskLevel = 'HIGH'
    riskPercentage = 0.6 // 60%
  }
  
  wealthAtRisk = Math.round(netWorth * riskPercentage)
  
  // Generate recommendations
  const recommendations: string[] = []
  
  if (riskLevel === 'HIGH') {
    recommendations.push('Establish a Domestic Asset Protection Trust immediately')
    recommendations.push('Consider offshore asset protection structures')
    recommendations.push('Maximize liability insurance coverage')
  } else if (riskLevel === 'MEDIUM') {
    recommendations.push('Form an LLC for business assets')
    recommendations.push('Establish a basic asset protection trust')
    recommendations.push('Review and increase liability insurance')
  } else {
    recommendations.push('Maintain adequate liability insurance')
    recommendations.push('Consider an LLC for real estate holdings')
    recommendations.push('Regular review of asset protection strategies')
  }
  
  return {
    riskLevel,
    wealthAtRisk,
    recommendations
  }
}

// Submit assessment
app.post('/submit', async (c) => {
  try {
    const data: AssessmentFormData = await c.req.json()
    
    // Validate required fields
    if (!data.email || !data.name) {
      return c.json({ error: 'Email and name are required' }, 400)
    }
    
    const { env } = c
    
    // Check if user exists, create if not
    let user = await env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(data.email).first<User>()
    
    if (!user) {
      const userResult = await env.DB.prepare(
        'INSERT INTO users (email, name, phone, user_type) VALUES (?, ?, ?, ?)'
      ).bind(data.email, data.name, data.phone || null, 'individual').run()
      
      user = {
        id: userResult.meta.last_row_id as number,
        email: data.email,
        name: data.name,
        phone: data.phone || '',
        user_type: 'individual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    
    // Calculate risk
    const riskResult = calculateRiskLevel(data)
    
    // Save assessment
    const assessmentResult = await env.DB.prepare(
      `INSERT INTO risk_assessments 
       (user_id, profession, net_worth_range, has_real_estate, liquid_asset_percentage, 
        legal_history, current_protection, risk_level, wealth_at_risk, recommendations) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.id,
      data.profession,
      data.netWorth,
      data.hasRealEstate,
      data.liquidAssetPercentage,
      JSON.stringify(data.legalHistory),
      JSON.stringify(data.currentProtection),
      riskResult.riskLevel,
      riskResult.wealthAtRisk,
      JSON.stringify(riskResult.recommendations)
    ).run()
    
    return c.json({
      assessmentId: assessmentResult.meta.last_row_id,
      riskLevel: riskResult.riskLevel,
      wealthAtRisk: riskResult.wealthAtRisk,
      recommendations: riskResult.recommendations,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })
    
  } catch (error) {
    console.error('Assessment submission error:', error)
    return c.json({ error: 'Failed to process assessment' }, 500)
  }
})

// Get assessment results
app.get('/results/:id', async (c) => {
  try {
    const assessmentId = c.req.param('id')
    const { env } = c
    
    const assessment = await env.DB.prepare(
      `SELECT ra.*, u.name, u.email 
       FROM risk_assessments ra 
       JOIN users u ON ra.user_id = u.id 
       WHERE ra.id = ?`
    ).bind(assessmentId).first<RiskAssessment & { name: string, email: string }>()
    
    if (!assessment) {
      return c.json({ error: 'Assessment not found' }, 404)
    }
    
    return c.json({
      id: assessment.id,
      riskLevel: assessment.risk_level,
      wealthAtRisk: assessment.wealth_at_risk,
      recommendations: JSON.parse(assessment.recommendations || '[]'),
      user: {
        name: assessment.name,
        email: assessment.email
      },
      createdAt: assessment.created_at
    })
    
  } catch (error) {
    console.error('Get assessment error:', error)
    return c.json({ error: 'Failed to get assessment' }, 500)
  }
})

export { app as assessmentRoutes }