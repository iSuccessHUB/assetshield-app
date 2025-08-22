// Google AdSense Integration for AssetShield App
// Strategic ad placement with premium ad-free benefits

class AdSenseManager {
  constructor() {
    this.adsenseClientId = 'ca-pub-0277917158063150' // Your real AdSense Publisher ID
    this.isAdFreeUser = false
    this.adPlacements = []
    this.init()
  }

  init() {
    // Check user's ad-free status
    this.checkAdFreeStatus()
    
    // Load AdSense script only if user doesn't have ad-free premium
    if (!this.isAdFreeUser) {
      this.loadAdSenseScript()
      this.setupAdPlacements()
      this.showAdFreeUpgradePrompts()
    } else {
      this.showAdFreeStatus()
    }
  }

  async checkAdFreeStatus() {
    try {
      // Check if user is logged in and has premium access
      const token = localStorage.getItem('auth_token')
      if (token) {
        const response = await fetch('/api/auth/user-status', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const userData = await response.json()
          this.isAdFreeUser = userData.isPremium || userData.hasAdFreeAccess
        }
      }
    } catch (error) {
      console.log('Could not check ad-free status, showing ads')
      this.isAdFreeUser = false
    }
  }

  loadAdSenseScript() {
    // Load Google AdSense script
    const script = document.createElement('script')
    script.async = true
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.adsenseClientId}`
    script.crossOrigin = 'anonymous'
    document.head.appendChild(script)

    // Initialize AdSense
    window.adsbygoogle = window.adsbygoogle || []
  }

  createAdUnit(containerId, adSlot, adFormat = 'auto', adStyle = {}) {
    const container = document.getElementById(containerId)
    if (!container) return null

    // Create ad container with premium upgrade option
    const adWrapper = document.createElement('div')
    adWrapper.className = 'ad-wrapper relative bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6'
    adWrapper.innerHTML = `
      <div class="flex justify-between items-center mb-3">
        <span class="text-xs text-gray-500 uppercase tracking-wide">Advertisement</span>
        <button onclick="showAdFreeUpgrade()" class="text-xs text-blue-600 hover:text-blue-700 font-medium">
          Remove Ads ✨ Go Premium
        </button>
      </div>
      <ins class="adsbygoogle"
           style="display:block; ${Object.entries(adStyle).map(([k,v]) => `${k}:${v}`).join(';')}"
           data-ad-client="${this.adsenseClientId}"
           data-ad-slot="${adSlot}"
           data-ad-format="${adFormat}">
      </ins>
    `

    container.appendChild(adWrapper)

    // Push ad to AdSense
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (error) {
      console.log('AdSense error:', error)
    }

    return adWrapper
  }

  setupAdPlacements() {
    // Strategic ad placements throughout the app
    setTimeout(() => {
      this.setupHeaderAd()
      this.setupSidebarAds()
      this.setupContentAds()
      this.setupAssessmentAds()
      this.setupEducationAds()
      this.setupFooterAd()
    }, 2000) // Delay to ensure DOM is ready
  }

  setupHeaderAd() {
    // Header banner ad - non-intrusive
    const nav = document.querySelector('nav')
    if (nav) {
      const headerAdContainer = document.createElement('div')
      headerAdContainer.id = 'header-ad-container'
      headerAdContainer.className = 'w-full bg-blue-50 border-b border-blue-100'
      nav.parentNode.insertBefore(headerAdContainer, nav.nextSibling)

      this.createAdUnit('header-ad-container', '1234567890', 'horizontal', {
        'width': '100%',
        'height': '90px'
      })
    }
  }

  setupSidebarAds() {
    // Add sidebar ad containers to main content areas
    const mainSections = document.querySelectorAll('section')
    mainSections.forEach((section, index) => {
      if (index % 2 === 0) { // Every other section
        const sidebarContainer = document.createElement('div')
        sidebarContainer.id = `sidebar-ad-${index}`
        sidebarContainer.className = 'hidden lg:block fixed right-4 top-1/3 w-64 z-40'
        document.body.appendChild(sidebarContainer)

        this.createAdUnit(`sidebar-ad-${index}`, '2345678901', 'vertical', {
          'width': '250px',
          'height': '300px'
        })
      }
    })
  }

  setupContentAds() {
    // In-content ads between sections
    const heroSection = document.querySelector('section')
    if (heroSection && heroSection.nextElementSibling) {
      const contentAdContainer = document.createElement('div')
      contentAdContainer.id = 'content-ad-1'
      contentAdContainer.className = 'py-8 bg-gray-50'
      heroSection.parentNode.insertBefore(contentAdContainer, heroSection.nextElementSibling)

      this.createAdUnit('content-ad-1', '3456789012', 'rectangle', {
        'width': '336px',
        'height': '280px',
        'margin': '0 auto'
      })
    }
  }

  setupAssessmentAds() {
    // Add ads around assessment area (non-disruptive)
    const assessmentSection = document.getElementById('assessment')
    if (assessmentSection) {
      // Before assessment
      const preAssessmentContainer = document.createElement('div')
      preAssessmentContainer.id = 'pre-assessment-ad'
      preAssessmentContainer.className = 'mb-8'
      const assessmentContainer = assessmentSection.querySelector('.max-w-4xl')
      assessmentContainer.insertBefore(preAssessmentContainer, assessmentContainer.firstChild)

      this.createAdUnit('pre-assessment-ad', '4567890123', 'responsive', {
        'width': '100%',
        'height': '250px'
      })

      // After assessment completion area
      const postAssessmentContainer = document.createElement('div')
      postAssessmentContainer.id = 'post-assessment-ad'
      postAssessmentContainer.className = 'mt-8'
      assessmentContainer.appendChild(postAssessmentContainer)
    }
  }

  setupEducationAds() {
    // Ads in education section
    const educationSection = document.getElementById('education')
    if (educationSection) {
      const educationAdContainer = document.createElement('div')
      educationAdContainer.id = 'education-ad'
      educationAdContainer.className = 'my-8'
      
      const educationContent = educationSection.querySelector('.max-w-6xl')
      if (educationContent) {
        const midpoint = Math.floor(educationContent.children.length / 2)
        if (educationContent.children[midpoint]) {
          educationContent.insertBefore(educationAdContainer, educationContent.children[midpoint])
          
          this.createAdUnit('education-ad', '5678901234', 'responsive', {
            'width': '100%',
            'height': '200px'
          })
        }
      }
    }
  }

  setupFooterAd() {
    // Footer ad before actual footer
    const footer = document.querySelector('footer')
    if (footer) {
      const footerAdContainer = document.createElement('div')
      footerAdContainer.id = 'footer-ad-container'
      footerAdContainer.className = 'bg-gray-100 py-8'
      footer.parentNode.insertBefore(footerAdContainer, footer)

      this.createAdUnit('footer-ad-container', '6789012345', 'horizontal', {
        'width': '100%',
        'height': '250px'
      })
    }
  }

  showAdFreeUpgradePrompts() {
    // Add subtle upgrade prompts
    this.addUpgradeFloatingButton()
    this.addUpgradeModalTriggers()
  }

  addUpgradeFloatingButton() {
    const upgradeButton = document.createElement('div')
    upgradeButton.className = 'fixed bottom-4 left-4 z-50 lg:hidden'
    upgradeButton.innerHTML = `
      <button onclick="showAdFreeUpgrade()" class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all text-sm font-medium">
        <i class="fas fa-crown mr-2"></i>Remove Ads
      </button>
    `
    document.body.appendChild(upgradeButton)
  }

  addUpgradeModalTriggers() {
    // Add upgrade hints after user interacts with content
    let interactionCount = 0
    document.addEventListener('click', () => {
      interactionCount++
      if (interactionCount === 5) { // After 5 clicks
        this.showUpgradeHint()
      }
    })
  }

  showUpgradeHint() {
    const hint = document.createElement('div')
    hint.className = 'fixed top-20 right-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm'
    hint.innerHTML = `
      <div class="flex items-start">
        <i class="fas fa-crown text-yellow-300 mr-3 mt-1"></i>
        <div>
          <h4 class="font-bold mb-2">Enjoying AssetShield?</h4>
          <p class="text-sm mb-3">Remove ads and unlock premium features for the ultimate experience!</p>
          <button onclick="showAdFreeUpgrade(); this.parentElement.parentElement.parentElement.remove()" class="bg-white text-purple-600 px-3 py-1 rounded text-sm font-medium">
            Upgrade Now
          </button>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="ml-2 text-white/80 hover:text-white text-sm">
            Maybe Later
          </button>
        </div>
      </div>
    `
    document.body.appendChild(hint)

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (hint.parentNode) hint.remove()
    }, 10000)
  }

  showAdFreeStatus() {
    // Show premium badge for ad-free users
    const premiumBadge = document.createElement('div')
    premiumBadge.className = 'fixed top-20 right-4 bg-gradient-to-r from-gold-400 to-yellow-500 text-white px-4 py-2 rounded-full shadow-lg z-50'
    premiumBadge.innerHTML = `
      <i class="fas fa-crown mr-2"></i>
      <span class="font-medium">Ad-Free Premium</span>
    `
    document.body.appendChild(premiumBadge)

    // Auto-hide after 5 seconds
    setTimeout(() => {
      premiumBadge.style.opacity = '0'
      premiumBadge.style.transform = 'translateX(100%)'
      setTimeout(() => premiumBadge.remove(), 300)
    }, 5000)
  }

  // Method to remove all ads (called when user upgrades)
  removeAllAds() {
    const ads = document.querySelectorAll('.ad-wrapper')
    ads.forEach(ad => {
      ad.style.opacity = '0'
      setTimeout(() => ad.remove(), 300)
    })
    
    // Show success message
    const successMessage = document.createElement('div')
    successMessage.className = 'fixed top-20 right-4 bg-green-600 text-white p-4 rounded-lg shadow-xl z-50'
    successMessage.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-check-circle mr-3"></i>
        <span>Ads removed! Welcome to Premium! 🎉</span>
      </div>
    `
    document.body.appendChild(successMessage)
    
    setTimeout(() => successMessage.remove(), 5000)
  }
}

// Global functions
window.showAdFreeUpgrade = function() {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-8 max-w-md w-full mx-4">
      <div class="text-center">
        <div class="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-crown text-white text-2xl"></i>
        </div>
        <h3 class="text-2xl font-bold text-gray-800 mb-4">Remove Ads Forever</h3>
        <p class="text-gray-600 mb-6">Upgrade to Premium for an ad-free experience plus exclusive features:</p>
        
        <div class="text-left bg-gray-50 rounded-lg p-4 mb-6">
          <div class="flex items-center mb-2">
            <i class="fas fa-check text-green-600 mr-3"></i>
            <span class="text-sm">Complete ad removal</span>
          </div>
          <div class="flex items-center mb-2">
            <i class="fas fa-check text-green-600 mr-3"></i>
            <span class="text-sm">Priority customer support</span>
          </div>
          <div class="flex items-center mb-2">
            <i class="fas fa-check text-green-600 mr-3"></i>
            <span class="text-sm">Advanced assessment features</span>
          </div>
          <div class="flex items-center mb-2">
            <i class="fas fa-check text-green-600 mr-3"></i>
            <span class="text-sm">Exclusive legal templates</span>
          </div>
          <div class="flex items-center">
            <i class="fas fa-check text-green-600 mr-3"></i>
            <span class="text-sm">Direct attorney consultation</span>
          </div>
        </div>
        
        <div class="flex space-x-3">
          <button onclick="this.closest('.fixed').remove()" class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-400 transition-colors">
            Maybe Later
          </button>
          <button onclick="purchasePremium()" class="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded hover:from-purple-700 hover:to-blue-700 transition-colors">
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(modal)
}

window.purchasePremium = function() {
  // Close the upgrade modal first
  const modal = document.querySelector('.fixed.inset-0')
  if (modal) modal.remove()
  
  // Show premium upgrade options
  showPremiumUpgradeModal()
}

function showPremiumUpgradeModal() {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
      <div class="text-center mb-8">
        <div class="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-crown text-white text-3xl"></i>
        </div>
        <h2 class="text-3xl font-bold text-gray-800 mb-4">Choose Your Premium Plan</h2>
        <p class="text-gray-600">Remove ads forever and unlock exclusive features</p>
      </div>
      
      <div class="grid md:grid-cols-3 gap-6 mb-8">
        <!-- Basic Premium -->
        <div class="border rounded-xl p-6 relative hover:border-purple-500 transition-colors">
          <h3 class="text-xl font-bold text-gray-800 mb-2">Basic Premium</h3>
          <div class="text-3xl font-bold text-purple-600 mb-4">$29.99</div>
          <ul class="text-sm text-gray-600 space-y-2 mb-6">
            <li class="flex items-center"><i class="fas fa-check text-green-600 mr-2"></i>Complete ad removal</li>
            <li class="flex items-center"><i class="fas fa-check text-green-600 mr-2"></i>Enhanced assessment</li>
            <li class="flex items-center"><i class="fas fa-check text-green-600 mr-2"></i>Priority support</li>
          </ul>
          <button onclick="processPremiumUpgrade('basic')" class="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Choose Basic
          </button>
        </div>
        
        <!-- Premium (Popular) -->
        <div class="border-2 border-purple-500 rounded-xl p-6 relative hover:border-purple-600 transition-colors">
          <div class="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">Premium</h3>
          <div class="text-3xl font-bold text-purple-600 mb-4">$49.99</div>
          <ul class="text-sm text-gray-600 space-y-2 mb-6">
            <li class="flex items-center"><i class="fas fa-check text-green-600 mr-2"></i>Everything in Basic</li>
            <li class="flex items-center"><i class="fas fa-check text-green-600 mr-2"></i>Legal document templates</li>
            <li class="flex items-center"><i class="fas fa-check text-green-600 mr-2"></i>Advanced analytics</li>
            <li class="flex items-center"><i class="fas fa-check text-green-600 mr-2"></i>Multi-jurisdiction support</li>
          </ul>
          <button onclick="processPremiumUpgrade('premium')" class="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Choose Premium
          </button>
        </div>
        
        <!-- Complete -->
        <div class="border rounded-xl p-6 relative hover:border-purple-500 transition-colors">
          <h3 class="text-xl font-bold text-gray-800 mb-2">Complete</h3>
          <div class="text-3xl font-bold text-purple-600 mb-4">$99.99</div>
          <ul class="text-sm text-gray-600 space-y-2 mb-6">
            <li class="flex items-center"><i class="fas fa-check text-green-600 mr-2"></i>Everything in Premium</li>
            <li class="flex items-center"><i class="fas fa-check text-green-600 mr-2"></i>Direct attorney access</li>
            <li class="flex items-center"><i class="fas fa-check text-green-600 mr-2"></i>Unlimited consultations</li>
            <li class="flex items-center"><i class="fas fa-check text-green-600 mr-2"></i>Custom strategies</li>
          </ul>
          <button onclick="processPremiumUpgrade('complete')" class="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors">
            Choose Complete
          </button>
        </div>
      </div>
      
      <div class="text-center">
        <button onclick="this.closest('.fixed').remove()" class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">
          Maybe Later
        </button>
      </div>
    </div>
  `
  document.body.appendChild(modal)
}

async function processPremiumUpgrade(plan) {
  try {
    // Show loading state
    const loadingModal = document.createElement('div')
    loadingModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    loadingModal.innerHTML = `
      <div class="bg-white rounded-xl p-8 text-center">
        <div class="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">Setting up payment...</h3>
        <p class="text-gray-600">Preparing your premium upgrade</p>
      </div>
    `
    
    // Remove existing modals
    document.querySelectorAll('.fixed.inset-0').forEach(modal => modal.remove())
    document.body.appendChild(loadingModal)
    
    // Get user ID (check if user is logged in)
    let userId = localStorage.getItem('user_id')
    
    if (!userId) {
      // Create a temporary user ID for guest checkout
      userId = `guest_${Date.now()}`
      localStorage.setItem('user_id', userId)
    }
    
    // Create premium upgrade payment intent with real Stripe
    const response = await fetch('/api/payments/premium-upgrade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, plan })
    })
    
    const result = await response.json()
    
    if (response.ok && result.clientSecret) {
      // Remove loading modal
      loadingModal.remove()
      
      // Create Stripe payment modal
      showStripePaymentModal(result, plan)
      
    } else {
      throw new Error(result.error || 'Failed to create upgrade payment')
    }
    
  } catch (error) {
    console.error('Premium upgrade error:', error)
    
    // Remove loading modal
    const loadingModal = document.querySelector('.fixed.inset-0')
    if (loadingModal) loadingModal.remove()
    
    // Show error modal
    const errorModal = document.createElement('div')
    errorModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    errorModal.innerHTML = `
      <div class="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
        <i class="fas fa-exclamation-triangle text-red-600 text-4xl mb-4"></i>
        <h3 class="text-xl font-bold text-gray-800 mb-4">Upgrade Failed</h3>
        <p class="text-gray-600 mb-6">${error.message}</p>
        <button onclick="this.closest('.fixed').remove()" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          Try Again Later
        </button>
      </div>
    `
    document.body.appendChild(errorModal)
  }
}

function showStripePaymentModal(paymentData, plan) {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-8 max-w-md w-full mx-4">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-crown text-white text-2xl"></i>
        </div>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">Complete Your Upgrade</h2>
        <p class="text-gray-600">${paymentData.plan.name} - $${(paymentData.amount / 100).toFixed(2)}</p>
      </div>
      
      <form id="payment-form">
        <div id="payment-element" class="mb-6">
          <!-- Stripe Elements will create form elements here -->
        </div>
        
        <div class="text-sm text-gray-600 mb-4">
          <div class="flex items-center justify-center">
            <i class="fas fa-lock mr-2"></i>
            <span>Secure payment powered by Stripe</span>
          </div>
        </div>
        
        <div class="flex space-x-3">
          <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 px-4 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors">
            Cancel
          </button>
          <button type="submit" id="submit-payment" class="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors">
            <span id="button-text">Pay $${(paymentData.amount / 100).toFixed(2)}</span>
            <div id="spinner" class="hidden w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
          </button>
        </div>
      </form>
    </div>
  `
  document.body.appendChild(modal)
  
  // Initialize Stripe Elements
  if (window.stripe) {
    const elements = window.stripe.elements({
      clientSecret: paymentData.clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#7c3aed',
        }
      }
    })
    
    const paymentElement = elements.create('payment')
    paymentElement.mount('#payment-element')
    
    // Handle form submission
    const form = document.getElementById('payment-form')
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      
      const submitButton = document.getElementById('submit-payment')
      const buttonText = document.getElementById('button-text')
      const spinner = document.getElementById('spinner')
      
      // Show loading state
      submitButton.disabled = true
      buttonText.textContent = 'Processing...'
      spinner.classList.remove('hidden')
      
      try {
        const { error, paymentIntent } = await window.stripe.confirmPayment({
          elements,
          redirect: 'if_required'
        })
        
        if (error) {
          // Show error message
          alert(`Payment failed: ${error.message}`)
          
          // Reset button state
          submitButton.disabled = false
          buttonText.textContent = `Pay $${(paymentData.amount / 100).toFixed(2)}`
          spinner.classList.add('hidden')
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          // Payment successful!
          modal.remove()
          
          // Process success on backend
          const userId = localStorage.getItem('user_id')
          const successResponse = await fetch('/api/payments/premium-upgrade/success', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              paymentIntentId: paymentIntent.id, 
              userId 
            })
          })
          
          if (successResponse.ok) {
            // Remove all ads immediately
            window.adsenseManager?.removeAllAds()
            
            // Show success message
            showUpgradeSuccessModal(plan, paymentData.plan)
          } else {
            alert('Payment processed but failed to activate premium features. Please contact support.')
          }
        }
      } catch (err) {
        console.error('Payment error:', err)
        alert('An unexpected error occurred. Please try again.')
        
        // Reset button state
        submitButton.disabled = false
        buttonText.textContent = `Pay $${(paymentData.amount / 100).toFixed(2)}`
        spinner.classList.add('hidden')
      }
    })
  } else {
    alert('Stripe is not loaded. Please refresh the page and try again.')
    modal.remove()
  }
}

function showUpgradeSuccessModal(plan, planDetails) {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
      <div class="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <i class="fas fa-crown text-white text-3xl"></i>
      </div>
      <h2 class="text-2xl font-bold text-gray-800 mb-4">Welcome to Premium! 🎉</h2>
      <p class="text-gray-600 mb-6">You've successfully upgraded to ${planDetails?.name || plan}. All ads have been removed and premium features are now unlocked!</p>
      
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h4 class="font-bold text-green-800 mb-2">What's New:</h4>
        <ul class="text-sm text-green-700 space-y-1">
          <li>✅ Complete ad removal</li>
          <li>✅ Premium features unlocked</li>
          <li>✅ Priority support activated</li>
          <li>✅ Enhanced privacy protection</li>
        </ul>
      </div>
      
      <button onclick="this.closest('.fixed').remove(); window.location.reload()" class="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors">
        Enjoy Your Premium Experience!
      </button>
    </div>
  `
  document.body.appendChild(modal)
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.adsenseManager = new AdSenseManager()
  })
} else {
  window.adsenseManager = new AdSenseManager()
}

// Export for use in other scripts
window.AdSenseManager = AdSenseManager