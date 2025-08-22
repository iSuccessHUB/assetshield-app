import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

// Simple types for the assessment (no external dependency)
interface AssessmentFormData {
  name: string
  email: string
  profession: string
  netWorth: string
  legalThreats: string
  hasRealEstate?: boolean
  legalHistory?: string[]
  currentProtection?: string[]
}

interface RiskResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  wealthAtRisk: number
  recommendations: string[]
}

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
  
  // Handle legal threats from simplified form
  if (data.legalThreats === 'active') {
    riskScore += 4
  } else if (data.legalThreats === 'potential') {
    riskScore += 2
  }
  
  // Optional fields handling
  if (data.hasRealEstate) {
    riskScore += 2
  }
  
  if (data.legalHistory && Array.isArray(data.legalHistory)) {
    if (data.legalHistory.includes('lawsuit') || data.legalHistory.includes('divorce')) {
      riskScore += 3
    }
    
    if (data.legalHistory.includes('bankruptcy')) {
      riskScore += 4
    }
  }
  
  if (!data.currentProtection || !Array.isArray(data.currentProtection) || 
      data.currentProtection.length === 0 || data.currentProtection.includes('none')) {
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

// Submit assessment (Database-free version)
app.post('/submit', async (c) => {
  try {
    const data: AssessmentFormData = await c.req.json()
    
    // Validate required fields
    if (!data.email || !data.name) {
      return c.json({ error: 'Email and name are required' }, 400)
    }
    
    // Calculate risk without database dependency
    const riskResult = calculateRiskLevel(data)
    
    // Generate assessment ID (timestamp-based)
    const assessmentId = Date.now()
    
    // Log assessment for demo purposes (in production, this would be saved to database)
    console.log('Assessment submitted:', {
      assessmentId,
      user: { email: data.email, name: data.name },
      data,
      result: riskResult
    })
    
    return c.json({
      assessmentId,
      riskLevel: riskResult.riskLevel,
      wealthAtRisk: riskResult.wealthAtRisk,
      recommendations: riskResult.recommendations,
      user: {
        id: assessmentId, // Use timestamp as user ID for demo
        email: data.email,
        name: data.name
      },
      success: true
    })
    
  } catch (error) {
    console.error('Assessment submission error:', error)
    return c.json({ error: 'Failed to process assessment' }, 500)
  }
})

// Get assessment results (Database-free demo version)
app.get('/results/:id', async (c) => {
  try {
    const assessmentId = c.req.param('id')
    
    // For demo purposes, return mock results
    // In production, this would fetch from database
    return c.json({
      id: assessmentId,
      riskLevel: 'MEDIUM',
      wealthAtRisk: 750000,
      recommendations: [
        'Form an LLC for business assets',
        'Establish a basic asset protection trust', 
        'Review and increase liability insurance'
      ],
      user: {
        name: 'Demo User',
        email: 'demo@example.com'
      },
      createdAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Get assessment error:', error)
    return c.json({ error: 'Failed to get assessment' }, 500)
  }
})

export { app as assessmentRoutes }