// Enhanced Demo Dashboard with Sales Optimization Features
// Integrates trial urgency, conversion tracking, service bundles, and lead capture

class EnhancedDemoDashboard {
  constructor() {
    this.sessionId = this.getSessionId()
    this.urgencyManager = new TrialUrgencyUI()
    this.analyticsTracker = new ConversionTracker()
    this.bundleManager = new ServiceBundleUI()
    
    this.init()
  }
  
  async init() {
    try {
      // Load core dashboard data
      await this.loadDashboardData()
      
      // Initialize components
      this.initializeUrgencyTracking()
      this.initializeProgressIndicators()
      this.initializeConversionOpportunities()
      this.initializeServiceBundles()
      
      // Start activity tracking
      this.startActivityTracking()
      
      // Initialize auto-save for forms
      this.initializeAutoSave()
      
    } catch (error) {
      console.error('Dashboard initialization error:', error)
      this.showErrorMessage('Failed to load dashboard')
    }
  }
  
  async loadDashboardData() {
    const response = await fetch(`/api/enhanced-demo/status/${this.sessionId}`)
    if (!response.ok) throw new Error('Failed to load demo status')
    
    this.demoData = await response.json()
    console.log('Demo data loaded:', this.demoData)
  }
  
  initializeUrgencyTracking() {
    // Create urgency banner
    this.createUrgencyBanner()
    
    // Create progress sidebar
    this.createProgressSidebar()
    
    // Update urgency every minute
    setInterval(() => {
      this.updateUrgencyDisplay()
    }, 60000)
  }
  
  createUrgencyBanner() {
    const urgencyInfo = this.demoData.urgencyInfo
    if (!urgencyInfo || urgencyInfo.level === 'low') return
    
    const banner = document.createElement('div')
    banner.className = `urgency-banner urgency-${urgencyInfo.level}`
    banner.innerHTML = `
      <div class="urgency-content">
        <div class="urgency-icon">
          ${this.getUrgencyIcon(urgencyInfo.level)}
        </div>
        <div class="urgency-message">
          <h4>${urgencyInfo.message}</h4>
          ${urgencyInfo.showCountdown ? `
            <div class="countdown-timer" data-expires="${this.demoData.expiresAt}">
              <span class="countdown-text">Time remaining: </span>
              <span class="countdown-value">Loading...</span>
            </div>
          ` : ''}
        </div>
        <div class="urgency-actions">
          ${this.demoData.conversionOpportunities?.map(opp => `
            <button class="btn btn-urgent" onclick="window.demoApp.handleConversionAction('${opp.type}')">
              ${opp.title}
            </button>
          `).join('') || ''}
        </div>
      </div>
      ${urgencyInfo.dismissible ? `
        <button class="urgency-close" onclick="this.parentElement.style.display='none'">×</button>
      ` : ''}
    `
    
    // Insert at top of page
    const main = document.querySelector('main') || document.body
    main.insertBefore(banner, main.firstChild)
    
    // Start countdown if needed
    if (urgencyInfo.showCountdown) {
      this.startCountdownTimer(banner.querySelector('.countdown-value'))
    }
  }
  
  createProgressSidebar() {
    const sidebar = document.createElement('div')
    sidebar.className = 'progress-sidebar'
    sidebar.innerHTML = `
      <div class="progress-header">
        <h3>Trial Progress</h3>
        <div class="progress-summary">
          <div class="progress-circle" data-percentage="${this.demoData.progressIndicators.completionRate}">
            <span class="progress-percentage">${this.demoData.progressIndicators.completionRate}%</span>
          </div>
          <p class="progress-text">
            ${this.demoData.progressIndicators.completedCount} of ${this.demoData.progressIndicators.totalCount} milestones completed
          </p>
        </div>
      </div>
      
      <div class="milestones-list">
        ${this.demoData.progressIndicators.milestones.map(milestone => `
          <div class="milestone-item ${milestone.completed ? 'completed' : ''}" 
               data-milestone-id="${milestone.id || milestone.name.toLowerCase().replace(/\\s+/g, '_')}">
            <div class="milestone-status">
              ${milestone.completed ? '✅' : '⭕'}
            </div>
            <div class="milestone-content">
              <h4>${milestone.name}</h4>
              <p>${milestone.description || ''}</p>
              ${!milestone.completed && milestone.estimatedTime ? `
                <span class="milestone-time">⏱️ ${milestone.estimatedTime}</span>
              ` : ''}
            </div>
            ${!milestone.completed ? `
              <button class="milestone-action btn-sm" onclick="window.demoApp.completeMilestone('${milestone.id || milestone.name.toLowerCase().replace(/\\s+/g, '_')}')">
                Start
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
      
      <div class="recommended-actions">
        <h4>Recommended Next Steps</h4>
        ${this.demoData.recommendedActions?.map(action => `
          <div class="action-item priority-${action.priority}">
            <h5>${action.title}</h5>
            <p>${action.description}</p>
            <button class="btn btn-sm btn-primary" onclick="window.demoApp.handleAction('${action.type || 'generic'}')">
              ${action.estimatedTime ? `${action.estimatedTime} - ` : ''}Start Now
            </button>
          </div>
        `).join('') || '<p>Great job! You\'re making excellent progress.</p>'}
      </div>
    `
    
    // Add to page
    document.body.appendChild(sidebar)
    
    // Initialize progress circle animation
    setTimeout(() => {
      this.animateProgressCircle(sidebar.querySelector('.progress-circle'))
    }, 500)
  }
  
  initializeProgressIndicators() {
    // Add progress indicators to main dashboard elements
    const dashboardCards = document.querySelectorAll('.dashboard-card, .feature-card')
    
    dashboardCards.forEach(card => {
      const featureName = card.dataset.feature || card.querySelector('h3')?.textContent
      if (featureName) {
        this.addFeatureProgressIndicator(card, featureName)
      }
    })
  }
  
  addFeatureProgressIndicator(element, featureName) {
    const milestoneId = featureName.toLowerCase().replace(/\\s+/g, '_')
    const milestone = this.demoData.progressIndicators.milestones.find(m => 
      (m.id || m.name.toLowerCase().replace(/\\s+/g, '_')) === milestoneId
    )
    
    if (milestone) {
      const indicator = document.createElement('div')
      indicator.className = `feature-indicator ${milestone.completed ? 'completed' : 'pending'}`
      indicator.innerHTML = milestone.completed ? '✅ Completed' : '⭕ Try This Feature'
      
      element.appendChild(indicator)
      
      // Track interactions with this feature
      element.addEventListener('click', () => {
        this.trackFeatureInteraction(milestoneId, featureName)
      })
    }
  }
  
  initializeConversionOpportunities() {
    // Show conversion opportunities at strategic moments
    if (this.demoData.conversionOpportunities?.length > 0) {
      this.createConversionModal()
    }
    
    // Create floating conversion widget
    this.createFloatingConversionWidget()
  }
  
  createConversionModal() {
    const opportunities = this.demoData.conversionOpportunities
    const modal = document.createElement('div')
    modal.className = 'conversion-modal'
    modal.id = 'conversionModal'
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>🎉 Special Offers Available!</h2>
          <button class="modal-close" onclick="window.demoApp.closeConversionModal()">×</button>
        </div>
        <div class="modal-body">
          ${opportunities.map(opp => `
            <div class="opportunity-card">
              <div class="opportunity-badge ${opp.type}">
                ${this.getOpportunityBadge(opp.type)}
              </div>
              <h3>${opp.title}</h3>
              <p class="opportunity-description">${opp.description}</p>
              <div class="opportunity-value">${opp.value}</div>
              ${opp.validUntil ? `
                <div class="opportunity-expires">
                  Expires: ${new Date(opp.validUntil).toLocaleDateString()}
                </div>
              ` : ''}
              <button class="btn btn-conversion" onclick="window.demoApp.claimOpportunity('${opp.type}')">
                Claim This Offer
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // Show modal after delay or on specific trigger
    setTimeout(() => {
      this.showConversionModal()
    }, this.getModalDelay())
  }
  
  createFloatingConversionWidget() {
    const widget = document.createElement('div')
    widget.className = 'floating-conversion-widget'
    widget.innerHTML = `
      <div class="widget-content">
        <div class="widget-header">
          <span class="widget-days">${this.demoData.daysRemaining} days left</span>
          <span class="widget-completion">${this.demoData.progressIndicators.completionRate}% complete</span>
        </div>
        <div class="widget-cta">
          <button class="btn btn-widget" onclick="window.demoApp.showConversionOptions()">
            View Packages & Pricing
          </button>
        </div>
      </div>
      <button class="widget-minimize" onclick="this.parentElement.classList.toggle('minimized')">
        ↕
      </button>
    `
    
    document.body.appendChild(widget)
  }
  
  initializeServiceBundles() {
    // Load service bundles for display
    this.loadServiceBundles()
  }
  
  async loadServiceBundles() {
    try {
      const response = await fetch(`/api/service-bundles?firmSize=${this.demoData.companyProfile?.size}&budgetRange=${this.demoData.companyProfile?.budgetRange}`)
      if (response.ok) {
        this.bundlesData = await response.json()
        this.displayServiceBundles()
      }
    } catch (error) {
      console.error('Failed to load service bundles:', error)
    }
  }
  
  displayServiceBundles() {
    const bundlesContainer = document.getElementById('serviceBundles')
    if (!bundlesContainer || !this.bundlesData?.bundles) return
    
    bundlesContainer.innerHTML = `
      <div class="bundles-header">
        <h2>Recommended Packages for Your Firm</h2>
        <p>Based on your profile: ${this.demoData.companyProfile?.name}</p>
      </div>
      
      <div class="bundles-grid">
        ${this.bundlesData.bundles.map(bundle => `
          <div class="bundle-card ${bundle.popular ? 'popular' : ''} ${bundle.featured ? 'featured' : ''}">
            ${bundle.popular ? '<div class="bundle-badge popular">Most Popular</div>' : ''}
            ${bundle.featured ? '<div class="bundle-badge featured">Recommended</div>' : ''}
            
            <div class="bundle-header">
              <h3>${bundle.name}</h3>
              <p class="bundle-tagline">${bundle.marketingTagline || bundle.description}</p>
            </div>
            
            <div class="bundle-pricing">
              <div class="bundle-price">
                <span class="price-original">$${(bundle.originalPrice / 100).toLocaleString()}</span>
                <span class="price-bundle">$${(bundle.bundlePrice / 100).toLocaleString()}</span>
              </div>
              <div class="bundle-savings">
                Save $${(bundle.savings / 100).toLocaleString()} (${bundle.discountPercentage}%)
              </div>
            </div>
            
            <div class="bundle-features">
              <h4>Includes:</h4>
              <ul>
                ${bundle.serviceNames?.map(service => `<li>✅ ${service}</li>`).join('') || ''}
              </ul>
            </div>
            
            <div class="bundle-actions">
              <button class="btn btn-bundle-primary" onclick="window.demoApp.selectBundle('${bundle.id}')">
                ${bundle.ctaText || 'Select Package'}
              </button>
              <button class="btn btn-bundle-secondary" onclick="window.demoApp.viewBundleDetails('${bundle.id}')">
                View Details
              </button>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="bundles-footer">
        <p>Need a custom package? <button class="btn btn-link" onclick="window.demoApp.requestCustomQuote()">Get Custom Quote</button></p>
      </div>
    `
  }
  
  startActivityTracking() {
    // Track user interactions and send to analytics
    document.addEventListener('click', (e) => {
      this.trackActivity('click', {
        element: e.target.tagName,
        className: e.target.className,
        text: e.target.textContent?.substring(0, 50)
      })
    })
    
    // Track page views
    this.trackActivity('page_view', {
      url: window.location.pathname,
      timestamp: new Date().toISOString()
    })
    
    // Track time spent
    this.startTimeTracking()
  }
  
  startTimeTracking() {
    let startTime = Date.now()
    let lastActivity = Date.now()
    
    // Track active time (reset on activity)
    document.addEventListener('mousemove', () => { lastActivity = Date.now() })
    document.addEventListener('keypress', () => { lastActivity = Date.now() })
    document.addEventListener('scroll', () => { lastActivity = Date.now() })
    
    // Send time tracking every 2 minutes
    setInterval(() => {
      const now = Date.now()
      const activeTime = Math.min(now - startTime, now - lastActivity + 10000) // Max 10s inactive
      
      if (activeTime > 30000) { // Only track if active for >30s
        this.trackActivity('time_spent', {
          minutes: Math.round(activeTime / 60000),
          sessionTime: Math.round((now - startTime) / 60000)
        })
        startTime = now
      }
    }, 120000) // Every 2 minutes
  }
  
  async trackActivity(activityType, activityData) {
    try {
      await fetch(`/api/enhanced-demo/activity/${this.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activityType,
          activityData
        })
      })
    } catch (error) {
      console.error('Activity tracking error:', error)
    }
  }
  
  async trackFeatureInteraction(milestoneId, featureName) {
    await this.trackActivity('feature_use', {
      feature: featureName,
      milestoneId: milestoneId
    })
    
    // Check if this completes a milestone
    this.checkMilestoneCompletion(milestoneId)
  }
  
  async completeMilestone(milestoneId) {
    try {
      const response = await fetch(`/api/enhanced-demo/milestone/${this.sessionId}/${milestoneId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          completedAt: new Date().toISOString(),
          completionData: { manual: true }
        })
      })
      
      if (response.ok) {
        // Update UI to show completion
        this.updateMilestoneUI(milestoneId, true)
        this.showMilestoneCompletionMessage(milestoneId)
        
        // Refresh progress indicators
        await this.refreshProgressData()
      }
    } catch (error) {
      console.error('Milestone completion error:', error)
    }
  }
  
  updateMilestoneUI(milestoneId, completed) {
    const milestoneElement = document.querySelector(`[data-milestone-id="${milestoneId}"]`)
    if (milestoneElement) {
      milestoneElement.classList.toggle('completed', completed)
      const statusIcon = milestoneElement.querySelector('.milestone-status')
      if (statusIcon) {
        statusIcon.textContent = completed ? '✅' : '⭕'
      }
      const actionButton = milestoneElement.querySelector('.milestone-action')
      if (actionButton && completed) {
        actionButton.style.display = 'none'
      }
    }
  }
  
  showMilestoneCompletionMessage(milestoneId) {
    const message = document.createElement('div')
    message.className = 'milestone-completion-toast'
    message.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">🎉</span>
        <span class="toast-message">Milestone completed! Great progress!</span>
      </div>
    `
    
    document.body.appendChild(message)
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      message.remove()
    }, 3000)
  }
  
  async refreshProgressData() {
    try {
      const response = await fetch(`/api/enhanced-demo/status/${this.sessionId}`)
      if (response.ok) {
        const newData = await response.json()
        this.demoData = { ...this.demoData, ...newData }
        
        // Update progress displays
        this.updateProgressCircle()
        this.updateUrgencyDisplay()
      }
    } catch (error) {
      console.error('Progress refresh error:', error)
    }
  }
  
  updateProgressCircle() {
    const circle = document.querySelector('.progress-circle')
    const percentage = document.querySelector('.progress-percentage')
    
    if (circle && percentage) {
      circle.dataset.percentage = this.demoData.progressIndicators.completionRate
      percentage.textContent = `${this.demoData.progressIndicators.completionRate}%`
      this.animateProgressCircle(circle)
    }
  }
  
  animateProgressCircle(circle) {
    const percentage = parseInt(circle.dataset.percentage)
    const circumference = 2 * Math.PI * 45 // radius = 45
    const offset = circumference - (percentage / 100) * circumference
    
    // Create SVG if it doesn't exist
    if (!circle.querySelector('svg')) {
      circle.innerHTML = `
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" stroke-width="8"/>
          <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" stroke-width="8" 
                  stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" 
                  transform="rotate(-90 50 50)" class="progress-arc"/>
        </svg>
        <span class="progress-percentage">${percentage}%</span>
      `
    }
    
    // Animate the arc
    const arc = circle.querySelector('.progress-arc')
    if (arc) {
      arc.style.strokeDashoffset = offset
      arc.style.transition = 'stroke-dashoffset 1s ease-in-out'
    }
  }
  
  updateUrgencyDisplay() {
    const now = new Date()
    const expiresAt = new Date(this.demoData.expiresAt)
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    // Update countdown timers
    const countdownElements = document.querySelectorAll('.countdown-value')
    countdownElements.forEach(element => {
      element.textContent = this.formatTimeRemaining(daysRemaining)
    })
    
    // Update urgency level if changed
    if (daysRemaining !== this.demoData.daysRemaining) {
      this.demoData.daysRemaining = daysRemaining
      // Potentially refresh urgency components
    }
  }
  
  startCountdownTimer(element) {
    const updateCountdown = () => {
      const now = new Date()
      const expiresAt = new Date(this.demoData.expiresAt)
      const timeLeft = expiresAt.getTime() - now.getTime()
      
      if (timeLeft <= 0) {
        element.textContent = 'Expired'
        return
      }
      
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
      
      if (days > 0) {
        element.textContent = `${days}d ${hours}h ${minutes}m`
      } else if (hours > 0) {
        element.textContent = `${hours}h ${minutes}m`
      } else {
        element.textContent = `${minutes}m`
      }
    }
    
    updateCountdown()
    setInterval(updateCountdown, 60000) // Update every minute
  }
  
  // Conversion and Bundle Actions
  
  async selectBundle(bundleId) {
    try {
      const response = await fetch(`/api/service-bundles/${bundleId}`)
      if (response.ok) {
        const bundleDetails = await response.json()
        this.showBundleCheckout(bundleDetails)
      }
    } catch (error) {
      console.error('Bundle selection error:', error)
    }
  }
  
  showBundleCheckout(bundle) {
    // Create checkout modal
    const modal = this.createModal('bundleCheckout', `
      <div class="checkout-header">
        <h2>Complete Your Purchase</h2>
        <p class="checkout-bundle">${bundle.name}</p>
      </div>
      
      <div class="checkout-content">
        <div class="pricing-summary">
          <div class="price-row">
            <span>Original Price:</span>
            <span class="price-original">${bundle.pricingBreakdown.totalOriginalPrice}</span>
          </div>
          <div class="price-row">
            <span>Bundle Discount:</span>
            <span class="price-savings">-${bundle.pricingBreakdown.totalSavings}</span>
          </div>
          <div class="price-row total">
            <span>Total:</span>
            <span class="price-final">${bundle.pricingBreakdown.bundlePrice}</span>
          </div>
        </div>
        
        <div class="checkout-form">
          <button class="btn btn-checkout-primary" onclick="window.demoApp.processCheckout('${bundle.id}')">
            Complete Purchase
          </button>
          <button class="btn btn-checkout-secondary" onclick="window.demoApp.scheduleConsultation()">
            Schedule Consultation First
          </button>
        </div>
      </div>
    `)
    
    this.showModal(modal)
  }
  
  async handleConversionAction(actionType) {
    switch (actionType) {
      case 'early_bird_discount':
        this.showConversionOptions()
        break
      case 'schedule_consultation':
        this.scheduleConsultation()
        break
      case 'extend_trial':
        await this.extendTrial()
        break
      default:
        console.log('Unknown conversion action:', actionType)
    }
  }
  
  async extendTrial() {
    try {
      const response = await fetch(`/api/demo/extend/${this.sessionId.replace('demo_', '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalDays: 7 })
      })
      
      if (response.ok) {
        const result = await response.json()
        this.demoData.expiresAt = result.newExpiryDate
        this.showSuccessMessage('Trial extended by 7 days!')
        this.updateUrgencyDisplay()
      }
    } catch (error) {
      console.error('Trial extension error:', error)
    }
  }
  
  scheduleConsultation() {
    // Open consultation scheduling
    window.open(`/schedule?demo=${this.sessionId}&company=${encodeURIComponent(this.demoData.companyName)}`, '_blank')
  }
  
  // Utility Methods
  
  getSessionId() {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('demo') || window.location.pathname.split('/').pop()
  }
  
  getUrgencyIcon(level) {
    const icons = {
      low: '💚',
      medium: '🟡',
      high: '🟠', 
      critical: '🔴'
    }
    return icons[level] || '💚'
  }
  
  getOpportunityBadge(type) {
    const badges = {
      discount: '💰',
      bonus: '🎁',
      extended_trial: '⏰',
      free_service: '🆓'
    }
    return badges[type] || '🎯'
  }
  
  getModalDelay() {
    // Show conversion modal based on urgency and engagement
    if (this.demoData.urgencyInfo.level === 'critical') return 5000
    if (this.demoData.urgencyInfo.level === 'high') return 30000
    if (this.demoData.progressIndicators.completionRate > 50) return 60000
    return 300000 // 5 minutes default
  }
  
  formatTimeRemaining(daysRemaining) {
    if (daysRemaining <= 0) return 'Expired'
    if (daysRemaining === 1) return '1 day'
    return `${daysRemaining} days`
  }
  
  createModal(id, content) {
    const modal = document.createElement('div')
    modal.className = 'modal'
    modal.id = id
    modal.innerHTML = `
      <div class="modal-overlay" onclick="window.demoApp.closeModal('${id}')"></div>
      <div class="modal-content">
        <button class="modal-close" onclick="window.demoApp.closeModal('${id}')">×</button>
        ${content}
      </div>
    `
    return modal
  }
  
  showModal(modal) {
    document.body.appendChild(modal)
    setTimeout(() => modal.classList.add('active'), 10)
  }
  
  closeModal(modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.classList.remove('active')
      setTimeout(() => modal.remove(), 300)
    }
  }
  
  showSuccessMessage(message) {
    const toast = document.createElement('div')
    toast.className = 'success-toast'
    toast.textContent = message
    document.body.appendChild(toast)
    
    setTimeout(() => toast.remove(), 3000)
  }
  
  showErrorMessage(message) {
    const toast = document.createElement('div')
    toast.className = 'error-toast'
    toast.textContent = message
    document.body.appendChild(toast)
    
    setTimeout(() => toast.remove(), 5000)
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.demoApp = new EnhancedDemoDashboard()
})

// Export for external use
window.EnhancedDemoDashboard = EnhancedDemoDashboard