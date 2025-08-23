// Trial Urgency and Progress Tracking System
// This module provides comprehensive trial progress tracking and urgency messaging

export interface TrialProgress {
  sessionId: string
  daysRemaining: number
  totalDays: number
  completionRate: number
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  milestones: TrialMilestone[]
  urgencyMessages: UrgencyMessage[]
  recommendations: string[]
  nextSteps: NextStep[]
  incentives: ConversionIncentive[]
}

export interface TrialMilestone {
  id: string
  name: string
  description: string
  completed: boolean
  completedAt?: string
  weight: number
  category: 'setup' | 'exploration' | 'usage' | 'evaluation'
  estimatedTime: string
  helpText?: string
}

export interface UrgencyMessage {
  type: 'info' | 'warning' | 'urgent' | 'critical'
  title: string
  message: string
  actionText?: string
  actionUrl?: string
  showCountdown: boolean
  dismissible: boolean
}

export interface NextStep {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedTime: string
  category: string
  completed: boolean
  actionUrl?: string
}

export interface ConversionIncentive {
  id: string
  type: 'discount' | 'bonus' | 'extended_trial' | 'free_service'
  title: string
  description: string
  value: string
  validUntil: string
  conditions: string[]
  ctaText: string
  ctaUrl: string
}

export class TrialUrgencyManager {
  private db: D1Database
  
  constructor(db: D1Database) {
    this.db = db
  }
  
  // Get comprehensive trial progress and urgency data
  async getTrialProgress(sessionId: string): Promise<TrialProgress> {
    const demo = await this.getDemoSession(sessionId)
    if (!demo) {
      throw new Error('Demo session not found')
    }
    
    const now = new Date()
    const expiresAt = new Date(demo.expires_at)
    const startedAt = new Date(demo.started_at)
    const totalDays = Math.ceil((expiresAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    // Get milestones and calculate completion
    const milestones = await this.calculateMilestones(demo)
    const completionRate = this.calculateCompletionRate(milestones)
    
    // Determine urgency level
    const urgencyLevel = this.determineUrgencyLevel(daysRemaining, completionRate, demo.login_count)
    
    // Generate urgency messages
    const urgencyMessages = this.generateUrgencyMessages(daysRemaining, completionRate, urgencyLevel, demo)
    
    // Get personalized recommendations
    const recommendations = await this.generateRecommendations(demo, milestones, urgencyLevel)
    
    // Get next steps
    const nextSteps = await this.generateNextSteps(demo, milestones, daysRemaining)
    
    // Get conversion incentives
    const incentives = await this.getConversionIncentives(demo, daysRemaining, completionRate)
    
    return {
      sessionId,
      daysRemaining,
      totalDays,
      completionRate,
      urgencyLevel,
      milestones,
      urgencyMessages,
      recommendations,
      nextSteps,
      incentives
    }
  }
  
  // Update trial progress when user completes actions
  async updateTrialProgress(sessionId: string, milestoneId: string, completedData?: any): Promise<void> {
    const now = new Date().toISOString()
    
    // Record milestone completion
    await this.db.prepare(`
      INSERT OR REPLACE INTO demo_milestones (
        demo_session_id, milestone_id, completed_at, completion_data
      ) 
      SELECT ds.id, ?, ?, ?
      FROM demo_sessions ds 
      WHERE ds.session_id = ?
    `).bind(milestoneId, now, JSON.stringify(completedData || {}), sessionId).run()
    
    // Update session engagement metrics
    await this.updateSessionMetrics(sessionId, milestoneId)
    
    // Trigger milestone-specific actions
    await this.handleMilestoneCompletion(sessionId, milestoneId)
  }
  
  // Get trial urgency widget data for dashboard
  async getUrgencyWidget(sessionId: string): Promise<any> {
    const progress = await this.getTrialProgress(sessionId)
    
    return {
      daysRemaining: progress.daysRemaining,
      urgencyLevel: progress.urgencyLevel,
      completionRate: progress.completionRate,
      primaryMessage: progress.urgencyMessages[0],
      topIncentive: progress.incentives[0],
      criticalNextSteps: progress.nextSteps.filter(step => step.priority === 'urgent').slice(0, 2),
      showProgressBar: true,
      showCountdown: progress.daysRemaining <= 7
    }
  }
  
  // Generate daily urgency email content
  async generateUrgencyEmail(sessionId: string): Promise<any> {
    const progress = await this.getTrialProgress(sessionId)
    const demo = await this.getDemoSession(sessionId)
    
    let emailType = 'standard'
    let subject = 'Your AssetShield Pro Trial Progress'
    
    if (progress.daysRemaining <= 1) {
      emailType = 'final_warning'
      subject = '⚠️ Your Trial Expires Tomorrow - Don\'t Lose Your Data!'
    } else if (progress.daysRemaining <= 3) {
      emailType = 'urgent'
      subject = '🚨 Only 3 Days Left - Save 20% Now!'
    } else if (progress.daysRemaining <= 7) {
      emailType = 'reminder'
      subject = 'One Week Left - Complete Your Evaluation'
    } else if (progress.completionRate < 30) {
      emailType = 'low_engagement'
      subject = 'Getting the Most from Your AssetShield Pro Trial'
    }
    
    return {
      type: emailType,
      subject,
      data: {
        companyName: demo.company_name,
        contactName: demo.contact_name,
        daysRemaining: progress.daysRemaining,
        completionRate: progress.completionRate,
        completedMilestones: progress.milestones.filter(m => m.completed).length,
        totalMilestones: progress.milestones.length,
        primaryIncentive: progress.incentives[0],
        urgentNextSteps: progress.nextSteps.filter(s => s.priority === 'urgent'),
        loginUrl: `/demo/dashboard/${sessionId}`,
        unsubscribeUrl: `/demo/unsubscribe/${sessionId}`
      }
    }
  }
  
  // Private helper methods
  
  private async getDemoSession(sessionId: string): Promise<any> {
    const demo = await this.db.prepare(`
      SELECT ds.*, ls.total_score, ls.grade, ls.priority
      FROM demo_sessions ds
      LEFT JOIN lead_scores ls ON ds.id = ls.demo_session_id
      WHERE ds.session_id = ?
    `).bind(sessionId).first()
    
    return demo
  }
  
  private async calculateMilestones(demo: any): Promise<TrialMilestone[]> {
    // Get completed milestones
    const completedMilestones = await this.db.prepare(`
      SELECT milestone_id, completed_at
      FROM demo_milestones dm
      WHERE dm.demo_session_id = ?
    `).bind(demo.id).all()
    
    const completed = new Map()
    for (const milestone of completedMilestones.results || []) {
      completed.set(milestone.milestone_id, milestone.completed_at)
    }
    
    // Define all possible milestones
    const allMilestones: TrialMilestone[] = [
      // Setup Phase
      {
        id: 'account_setup',
        name: 'Account Setup Complete',
        description: 'Basic profile and company information configured',
        completed: completed.has('account_setup'),
        completedAt: completed.get('account_setup'),
        weight: 10,
        category: 'setup',
        estimatedTime: '5 minutes',
        helpText: 'Complete your firm profile to unlock full features'
      },
      {
        id: 'branding_setup',
        name: 'Branding Customization',
        description: 'Logo, colors, and white-label settings configured',
        completed: completed.has('branding_setup'),
        completedAt: completed.get('branding_setup'),
        weight: 15,
        category: 'setup',
        estimatedTime: '10 minutes',
        helpText: 'Customize the platform to match your firm\'s brand'
      },
      
      // Exploration Phase
      {
        id: 'risk_assessment_tour',
        name: 'Risk Assessment Tool Explored',
        description: 'Viewed and tested the client risk assessment features',
        completed: completed.has('risk_assessment_tour'),
        completedAt: completed.get('risk_assessment_tour'),
        weight: 20,
        category: 'exploration',
        estimatedTime: '15 minutes',
        helpText: 'See how the tool identifies high-value prospects'
      },
      {
        id: 'analytics_dashboard_view',
        name: 'Analytics Dashboard Review',
        description: 'Explored client analytics and reporting features',
        completed: completed.has('analytics_dashboard_view'),
        completedAt: completed.get('analytics_dashboard_view'),
        weight: 15,
        category: 'exploration',
        estimatedTime: '10 minutes',
        helpText: 'Understand your client pipeline and conversion metrics'
      },
      
      // Usage Phase
      {
        id: 'sample_assessment_created',
        name: 'Sample Assessment Created',
        description: 'Created and completed a sample client assessment',
        completed: completed.has('sample_assessment_created'),
        completedAt: completed.get('sample_assessment_created'),
        weight: 25,
        category: 'usage',
        estimatedTime: '20 minutes',
        helpText: 'Experience the full client assessment workflow'
      },
      {
        id: 'lead_management_test',
        name: 'Lead Management Test',
        description: 'Added and managed sample leads in the system',
        completed: completed.has('lead_management_test'),
        completedAt: completed.get('lead_management_test'),
        weight: 20,
        category: 'usage',
        estimatedTime: '15 minutes',
        helpText: 'Test the complete lead nurturing process'
      },
      
      // Evaluation Phase
      {
        id: 'integration_planning',
        name: 'Integration Planning',
        description: 'Reviewed integration options with existing systems',
        completed: completed.has('integration_planning'),
        completedAt: completed.get('integration_planning'),
        weight: 10,
        category: 'evaluation',
        estimatedTime: '15 minutes',
        helpText: 'Plan how this fits with your current workflow'
      },
      {
        id: 'team_collaboration_test',
        name: 'Team Collaboration Test',
        description: 'Tested multi-user features and permissions',
        completed: completed.has('team_collaboration_test'),
        completedAt: completed.get('team_collaboration_test'),
        weight: 15,
        category: 'evaluation',
        estimatedTime: '20 minutes',
        helpText: 'See how your team would use the platform together'
      }
    ]
    
    // Customize milestones based on firm profile
    return this.customizeMilestonesForFirm(allMilestones, demo)
  }
  
  private customizeMilestonesForFirm(milestones: TrialMilestone[], demo: any): TrialMilestone[] {
    // Filter and customize based on firm size, practice areas, etc.
    let customized = [...milestones]
    
    // Solo practitioners might not need team collaboration
    if (demo.law_firm_size === 'solo') {
      customized = customized.filter(m => m.id !== 'team_collaboration_test')
    }
    
    // Large firms get additional enterprise milestones
    if (demo.law_firm_size === 'large') {
      customized.push({
        id: 'multi_office_setup',
        name: 'Multi-Office Configuration',
        description: 'Configured settings for multiple office locations',
        completed: false,
        weight: 15,
        category: 'setup',
        estimatedTime: '25 minutes',
        helpText: 'Set up the platform for your multiple office locations'
      })
    }
    
    return customized
  }
  
  private calculateCompletionRate(milestones: TrialMilestone[]): number {
    if (milestones.length === 0) return 0
    
    const totalWeight = milestones.reduce((sum, m) => sum + m.weight, 0)
    const completedWeight = milestones.filter(m => m.completed).reduce((sum, m) => sum + m.weight, 0)
    
    return Math.round((completedWeight / totalWeight) * 100)
  }
  
  private determineUrgencyLevel(daysRemaining: number, completionRate: number, loginCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (daysRemaining <= 1) return 'critical'
    if (daysRemaining <= 3) return 'high'
    if (daysRemaining <= 7 && completionRate < 50) return 'high'
    if (daysRemaining <= 7) return 'medium'
    if (completionRate < 25 && loginCount <= 2) return 'medium'
    return 'low'
  }
  
  private generateUrgencyMessages(daysRemaining: number, completionRate: number, urgencyLevel: string, demo: any): UrgencyMessage[] {
    const messages: UrgencyMessage[] = []
    
    // Primary urgency message based on time remaining
    if (daysRemaining <= 1) {
      messages.push({
        type: 'critical',
        title: '⚠️ Trial Expires Tomorrow!',
        message: 'Don\'t lose access to your data and progress. Convert now to save 20% and keep everything you\'ve built.',
        actionText: 'Save My Progress - Convert Now',
        actionUrl: `/demo/convert/${demo.session_id}`,
        showCountdown: true,
        dismissible: false
      })
    } else if (daysRemaining <= 3) {
      messages.push({
        type: 'urgent',
        title: `🚨 Only ${daysRemaining} Days Left`,
        message: 'Your trial is ending soon. Convert now to save 20% on your first year and preserve all your work.',
        actionText: 'Convert & Save 20%',
        actionUrl: `/demo/convert/${demo.session_id}`,
        showCountdown: true,
        dismissible: false
      })
    } else if (daysRemaining <= 7) {
      messages.push({
        type: 'warning',
        title: `One Week Remaining`,
        message: 'Make the most of your remaining trial time. Complete your evaluation and schedule a consultation.',
        actionText: 'Schedule Consultation',
        actionUrl: `/demo/schedule/${demo.session_id}`,
        showCountdown: true,
        dismissible: true
      })
    }
    
    // Completion-based messages
    if (completionRate < 30 && daysRemaining > 3) {
      messages.push({
        type: 'info',
        title: 'Get More from Your Trial',
        message: `You've completed ${completionRate}% of key features. Explore more to see the full value.`,
        actionText: 'Continue Exploring',
        actionUrl: `/demo/dashboard/${demo.session_id}`,
        showCountdown: false,
        dismissible: true
      })
    }
    
    // High-value prospect messages
    if (demo.grade === 'A' && daysRemaining <= 5) {
      messages.push({
        type: 'info',
        title: '🎯 VIP Treatment Available',
        message: 'As a high-priority prospect, you qualify for white-glove onboarding and priority support.',
        actionText: 'Learn About VIP Benefits',
        actionUrl: `/demo/vip/${demo.session_id}`,
        showCountdown: false,
        dismissible: true
      })
    }
    
    return messages
  }
  
  private async generateRecommendations(demo: any, milestones: TrialMilestone[], urgencyLevel: string): Promise<string[]> {
    const recommendations: string[] = []
    
    // Milestone-based recommendations
    const incompleteMilestones = milestones.filter(m => !m.completed)
    const highValueIncomplete = incompleteMilestones.filter(m => m.weight >= 20)
    
    if (highValueIncomplete.length > 0) {
      recommendations.push(`Complete "${highValueIncomplete[0].name}" to see the highest impact features`)
    }
    
    // Urgency-based recommendations
    if (urgencyLevel === 'critical' || urgencyLevel === 'high') {
      recommendations.push('Schedule an immediate consultation to discuss your needs and conversion options')
      recommendations.push('Review service packages to find the best fit for your firm')
    }
    
    // Profile-based recommendations
    if (demo.law_firm_size === 'large') {
      recommendations.push('Explore multi-office deployment options and enterprise features')
    }
    
    if (demo.budget_range === '50k+') {
      recommendations.push('Consider our Enterprise package with custom development and priority support')
    }
    
    return recommendations
  }
  
  private async generateNextSteps(demo: any, milestones: TrialMilestone[], daysRemaining: number): Promise<NextStep[]> {
    const nextSteps: NextStep[] = []
    
    // Get incomplete milestones as next steps
    const incomplete = milestones.filter(m => !m.completed).slice(0, 4)
    
    for (const milestone of incomplete) {
      nextSteps.push({
        id: milestone.id,
        title: milestone.name,
        description: milestone.description,
        priority: milestone.weight >= 20 ? 'high' : 'medium',
        estimatedTime: milestone.estimatedTime,
        category: milestone.category,
        completed: false,
        actionUrl: `/demo/milestone/${demo.session_id}/${milestone.id}`
      })
    }
    
    // Add conversion-specific next steps based on urgency
    if (daysRemaining <= 7) {
      nextSteps.unshift({
        id: 'schedule_consultation',
        title: 'Schedule Implementation Consultation',
        description: 'Discuss your requirements and implementation timeline',
        priority: 'urgent',
        estimatedTime: '30 minutes',
        category: 'conversion',
        completed: false,
        actionUrl: `/demo/schedule/${demo.session_id}`
      })
    }
    
    if (demo.grade === 'A' || demo.grade === 'B') {
      nextSteps.push({
        id: 'review_packages',
        title: 'Review Recommended Service Packages',
        description: 'See personalized bundle recommendations for your firm',
        priority: 'high',
        estimatedTime: '15 minutes',
        category: 'conversion',
        completed: false,
        actionUrl: `/demo/packages/${demo.session_id}`
      })
    }
    
    return nextSteps
  }
  
  private async getConversionIncentives(demo: any, daysRemaining: number, completionRate: number): Promise<ConversionIncentive[]> {
    const incentives: ConversionIncentive[] = []
    
    // Time-based incentives
    if (daysRemaining <= 3) {
      incentives.push({
        id: 'early_bird_20',
        type: 'discount',
        title: '20% Early Bird Discount',
        description: 'Convert before your trial expires and save 20% on your first year',
        value: '20% off',
        validUntil: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString(),
        conditions: ['Convert within trial period', 'Annual payment required'],
        ctaText: 'Save 20% - Convert Now',
        ctaUrl: `/demo/convert/${demo.session_id}?discount=early_bird_20`
      })
    }
    
    // Completion-based incentives
    if (completionRate >= 75) {
      incentives.push({
        id: 'power_user_bonus',
        type: 'bonus',
        title: 'Power User Bonus - Free Setup',
        description: 'You\'ve mastered the platform! Get free white-glove setup and training',
        value: '$2,500 value',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        conditions: ['Complete 75%+ of trial milestones', 'Convert within 7 days'],
        ctaText: 'Claim Free Setup',
        ctaUrl: `/demo/convert/${demo.session_id}?bonus=power_user`
      })
    }
    
    // Grade-based incentives
    if (demo.grade === 'A') {
      incentives.push({
        id: 'vip_treatment',
        type: 'bonus',
        title: 'VIP White-Glove Service',
        description: 'Priority implementation with dedicated success manager',
        value: 'Exclusive access',
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        conditions: ['Grade A prospect status', 'Enterprise or Professional package'],
        ctaText: 'Get VIP Treatment',
        ctaUrl: `/demo/vip/${demo.session_id}`
      })
    }
    
    // Extended trial for low engagement
    if (completionRate < 40 && daysRemaining <= 2) {
      incentives.push({
        id: 'extended_trial',
        type: 'extended_trial',
        title: 'Free 7-Day Extension',
        description: 'Need more time? Get an additional week to complete your evaluation',
        value: '7 extra days',
        validUntil: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        conditions: ['Available once per trial', 'Must request before expiry'],
        ctaText: 'Extend My Trial',
        ctaUrl: `/demo/extend/${demo.session_id}`
      })
    }
    
    return incentives
  }
  
  private async updateSessionMetrics(sessionId: string, milestoneId: string): Promise<void> {
    // Update engagement score based on milestone completion
    const milestoneWeight = this.getMilestoneWeight(milestoneId)
    
    await this.db.prepare(`
      UPDATE demo_sessions 
      SET last_active_at = ?,
          updated_at = ?
      WHERE session_id = ?
    `).bind(
      new Date().toISOString(),
      new Date().toISOString(),
      sessionId
    ).run()
    
    // Update lead score engagement component
    await this.db.prepare(`
      UPDATE lead_scores 
      SET engagement_score = engagement_score + ?,
          total_score = company_size_score + budget_score + timeline_score + engagement_score + ? + fit_score,
          updated_at = ?
      FROM demo_sessions ds
      WHERE lead_scores.demo_session_id = ds.id 
      AND ds.session_id = ?
    `).bind(
      milestoneWeight * 0.1, // Each milestone adds to engagement score
      milestoneWeight * 0.1,
      new Date().toISOString(),
      sessionId
    ).run()
  }
  
  private async handleMilestoneCompletion(sessionId: string, milestoneId: string): Promise<void> {
    // Trigger specific actions based on milestone type
    const actions = {
      'sample_assessment_created': async () => {
        // Send congratulations email and suggest next steps
        console.log(`Milestone completed: ${milestoneId} for session ${sessionId}`)
      },
      'branding_setup': async () => {
        // Show preview of branded platform
        console.log(`Branding setup completed for session ${sessionId}`)
      }
    }
    
    const action = actions[milestoneId as keyof typeof actions]
    if (action) {
      await action()
    }
  }
  
  private getMilestoneWeight(milestoneId: string): number {
    const weights = {
      'account_setup': 10,
      'branding_setup': 15,
      'risk_assessment_tour': 20,
      'analytics_dashboard_view': 15,
      'sample_assessment_created': 25,
      'lead_management_test': 20,
      'integration_planning': 10,
      'team_collaboration_test': 15
    }
    
    return weights[milestoneId as keyof typeof weights] || 10
  }
}

// Utility functions for frontend components

export function getUrgencyColorScheme(urgencyLevel: string): any {
  const schemes = {
    low: {
      primary: '#10B981',
      background: '#ECFDF5',
      border: '#10B981',
      text: '#065F46'
    },
    medium: {
      primary: '#F59E0B',
      background: '#FFFBEB',
      border: '#F59E0B', 
      text: '#92400E'
    },
    high: {
      primary: '#EF4444',
      background: '#FEF2F2',
      border: '#EF4444',
      text: '#991B1B'
    },
    critical: {
      primary: '#DC2626',
      background: '#FEE2E2',
      border: '#DC2626',
      text: '#7F1D1D'
    }
  }
  
  return schemes[urgencyLevel as keyof typeof schemes] || schemes.low
}

export function formatTimeRemaining(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'Expired'
  if (daysRemaining === 1) return '1 day remaining'
  if (daysRemaining <= 7) return `${daysRemaining} days remaining`
  if (daysRemaining <= 14) return `${Math.ceil(daysRemaining / 7)} week${Math.ceil(daysRemaining / 7) > 1 ? 's' : ''} remaining`
  return `${daysRemaining} days remaining`
}

export function getProgressBarConfig(completionRate: number, urgencyLevel: string): any {
  const colors = getUrgencyColorScheme(urgencyLevel)
  
  return {
    percentage: completionRate,
    color: colors.primary,
    backgroundColor: colors.background,
    showPercentage: true,
    animated: completionRate < 100,
    height: '8px',
    borderRadius: '4px'
  }
}

export default TrialUrgencyManager