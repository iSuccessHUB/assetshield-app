// Enhanced AssetShield App - Global functionality and mobile UX

// Global state management
const AppState = {
  currentLanguage: localStorage.getItem('preferred-language') || 'en',
  userPreferences: JSON.parse(localStorage.getItem('user-preferences') || '{}'),
  isOffline: !navigator.onLine,
  installPromptEvent: null,
  translations: {},
  currentUser: null
}

// Initialize enhanced features
document.addEventListener('DOMContentLoaded', function() {
  console.log('Enhanced AssetShield App initializing...')
  
  // Initialize all enhanced features
  initializeMobileUX()
  initializeInternationalization()
  initializePWAFeatures()
  initializeOfflineCapabilities()
  initializePerformanceTracking()
  loadUserPreferences()
  
  console.log('Enhanced features initialized')
})

// Mobile UX Enhancements
function initializeMobileUX() {
  // Touch-friendly interactions
  addTouchGestures()
  
  // Responsive navigation
  setupMobileNavigation()
  
  // Improved form handling for mobile
  enhanceMobileForms()
  
  // Prevent zoom on input focus (iOS)
  preventZoomOnInputFocus()
}

function addTouchGestures() {
  let startY = 0
  let currentY = 0
  
  document.addEventListener('touchstart', function(e) {
    startY = e.touches[0].clientY
  }, { passive: true })
  
  document.addEventListener('touchmove', function(e) {
    currentY = e.touches[0].clientY
  }, { passive: true })
  
  // Add swipe gestures for forms and modals
  document.addEventListener('touchend', function(e) {
    const deltaY = startY - currentY
    
    // Swipe up to continue on forms
    if (deltaY > 50 && document.querySelector('.assessment-step')) {
      const nextBtn = document.querySelector('.btn-next')
      if (nextBtn && !nextBtn.disabled) {
        nextBtn.click()
      }
    }
  }, { passive: true })
}

function setupMobileNavigation() {
  // Hamburger menu functionality
  window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobile-menu')
    const icon = document.querySelector('#mobile-menu-btn i')
    
    if (!menu || !icon) {
      console.warn('Mobile menu elements not found')
      return
    }
    
    if (menu.classList.contains('hidden')) {
      menu.classList.remove('hidden')
      menu.classList.add('animate-slide-down')
      icon.className = 'fas fa-times text-xl'
    } else {
      menu.classList.add('hidden')
      menu.classList.remove('animate-slide-down')
      icon.className = 'fas fa-bars text-xl'
    }
  }
  
  // Close mobile menu on link click
  document.querySelectorAll('#mobile-menu a').forEach(link => {
    link.addEventListener('click', function() {
      const menu = document.getElementById('mobile-menu')
      menu.classList.add('hidden')
      const icon = document.querySelector('#mobile-menu-btn i')
      icon.className = 'fas fa-bars text-xl'
    })
  })
}

function enhanceMobileForms() {
  // Auto-advance on single-choice selections
  document.addEventListener('change', function(e) {
    if (e.target.type === 'radio' && window.innerWidth < 768) {
      // Small delay for better UX
      setTimeout(() => {
        const nextBtn = document.querySelector('.btn-next')
        if (nextBtn && !nextBtn.disabled) {
          // Auto-scroll to next button
          nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Highlight the button briefly
          nextBtn.classList.add('animate-pulse')
          setTimeout(() => nextBtn.classList.remove('animate-pulse'), 1000)
        }
      }, 500)
    }
  })
  
  // Enhanced select dropdowns for mobile
  document.querySelectorAll('select').forEach(select => {
    select.addEventListener('focus', function() {
      this.style.fontSize = '16px' // Prevent zoom on iOS
    })
  })
}

function preventZoomOnInputFocus() {
  // Add viewport meta tag modification for iOS
  const viewport = document.querySelector('meta[name=viewport]')
  
  document.addEventListener('focusin', function(e) {
    if (e.target.matches('input, select, textarea')) {
      if (viewport) {
        viewport.setAttribute('content', viewport.content.replace('user-scalable=no', 'user-scalable=yes'))
      }
    }
  })
  
  document.addEventListener('focusout', function(e) {
    if (viewport) {
      viewport.setAttribute('content', viewport.content.replace('user-scalable=yes', 'user-scalable=no'))
    }
  })
}

// Internationalization (i18n)
function initializeInternationalization() {
  loadTranslations(AppState.currentLanguage)
  detectUserLanguage()
  setupLanguageSwitcher()
}

async function loadTranslations(language) {
  try {
    const response = await fetch(`/api/i18n/translations/${language}`)
    const data = await response.json()
    
    if (data.success) {
      AppState.translations = data.translations
      applyTranslations()
    }
  } catch (error) {
    console.error('Failed to load translations:', error)
  }
}

function applyTranslations() {
  document.querySelectorAll('[data-translate]').forEach(element => {
    const key = element.getAttribute('data-translate')
    if (AppState.translations[key]) {
      element.textContent = AppState.translations[key]
    }
  })
}

async function detectUserLanguage() {
  try {
    const response = await fetch('/api/i18n/detect-language')
    const data = await response.json()
    
    if (data.success && data.detected.language !== AppState.currentLanguage) {
      // Show language suggestion
      showLanguageSuggestion(data.detected.language)
    }
  } catch (error) {
    console.error('Failed to detect language:', error)
  }
}

function showLanguageSuggestion(suggestedLang) {
  const languages = {
    'es': 'Español',
    'fr': 'Français', 
    'de': 'Deutsch',
    'it': 'Italiano'
  }
  
  if (languages[suggestedLang]) {
    const banner = document.createElement('div')
    banner.className = 'fixed top-0 left-0 right-0 bg-blue-600 text-white p-3 text-center z-50'
    banner.innerHTML = `
      <span>Would you like to view this in ${languages[suggestedLang]}?</span>
      <button onclick="changeLanguage('${suggestedLang}')" class="ml-4 px-3 py-1 bg-white text-blue-600 rounded text-sm">Yes</button>
      <button onclick="this.parentElement.remove()" class="ml-2 px-3 py-1 bg-blue-700 rounded text-sm">No</button>
    `
    document.body.prepend(banner)
  }
}

function setupLanguageSwitcher() {
  window.toggleLanguageMenu = function() {
    const menu = document.getElementById('language-menu')
    menu.classList.toggle('hidden')
  }
  
  window.toggleMobileLanguageMenu = function() {
    const menu = document.getElementById('mobile-language-menu')
    menu.classList.toggle('hidden')
  }
  
  window.changeLanguage = async function(language) {
    AppState.currentLanguage = language
    localStorage.setItem('preferred-language', language)
    
    // Update UI
    document.getElementById('language-btn').innerHTML = `<i class="fas fa-globe mr-2"></i>${language.toUpperCase()}<i class="fas fa-chevron-down ml-1 text-sm"></i>`
    
    // Load new translations
    await loadTranslations(language)
    
    // Hide menus
    document.getElementById('language-menu').classList.add('hidden')
    const mobileMenu = document.getElementById('mobile-language-menu')
    if (mobileMenu) mobileMenu.classList.add('hidden')
    
    // Save user preference
    await saveUserPreference('language', language)
  }
  
  // Close language menus when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#language-btn')) {
      document.getElementById('language-menu').classList.add('hidden')
    }
    if (!e.target.closest('#mobile-language-btn')) {
      const mobileMenu = document.getElementById('mobile-language-menu')
      if (mobileMenu) mobileMenu.classList.add('hidden')
    }
  })
}

// PWA Features
function initializePWAFeatures() {
  registerServiceWorker()
  setupInstallPrompt()
  handleAppUpdates()
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered:', registration)
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateAvailable()
            }
          })
        })
      })
      .catch(error => {
        console.log('SW registration failed:', error)
      })
  }
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    AppState.installPromptEvent = e
    
    // Show custom install prompt after user interaction
    setTimeout(() => {
      if (!localStorage.getItem('install-prompt-dismissed')) {
        const installPrompt = document.getElementById('install-prompt')
        if (installPrompt) {
          installPrompt.classList.remove('hidden')
        }
      }
    }, 30000) // Show after 30 seconds
  })
  
  // Handle install button clicks (added in renderer.tsx)
}

function showUpdateAvailable() {
  const updateBanner = document.createElement('div')
  updateBanner.className = 'fixed top-0 left-0 right-0 bg-green-600 text-white p-3 text-center z-50'
  updateBanner.innerHTML = `
    <span>A new version is available!</span>
    <button onclick="location.reload()" class="ml-4 px-3 py-1 bg-white text-green-600 rounded text-sm">Update Now</button>
    <button onclick="this.parentElement.remove()" class="ml-2 px-3 py-1 bg-green-700 rounded text-sm">Later</button>
  `
  document.body.prepend(updateBanner)
}

function handleAppUpdates() {
  // Listen for app updates from service worker
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
      showUpdateAvailable()
    }
  })
}

// Offline Capabilities
function initializeOfflineCapabilities() {
  setupOfflineDetection()
  setupOfflineFormHandling()
}

function setupOfflineDetection() {
  function updateOnlineStatus() {
    AppState.isOffline = !navigator.onLine
    const indicator = document.getElementById('offline-indicator')
    
    if (AppState.isOffline) {
      indicator.classList.remove('hidden')
      // Switch to offline mode
      document.body.classList.add('offline-mode')
    } else {
      indicator.classList.add('hidden')
      document.body.classList.remove('offline-mode')
      // Sync pending data
      syncPendingData()
    }
  }
  
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  
  // Initial check
  updateOnlineStatus()
}

function setupOfflineFormHandling() {
  // Store form data for offline submission
  document.addEventListener('submit', function(e) {
    if (AppState.isOffline && e.target.matches('form')) {
      e.preventDefault()
      storeFormForOfflineSubmission(e.target)
    }
  })
}

function storeFormForOfflineSubmission(form) {
  const formData = new FormData(form)
  const data = {}
  
  for (let [key, value] of formData.entries()) {
    data[key] = value
  }
  
  const submission = {
    id: Date.now(),
    url: form.action || window.location.pathname,
    method: form.method || 'POST',
    data: data,
    timestamp: new Date().toISOString()
  }
  
  // Store in IndexedDB via service worker
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'STORE_FORM_SUBMISSION',
      submission
    })
  }
  
  showOfflineSubmissionConfirmation()
}

function showOfflineSubmissionConfirmation() {
  const toast = document.createElement('div')
  toast.className = 'fixed bottom-20 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg z-50'
  toast.innerHTML = `
    <div class="flex items-center">
      <i class="fas fa-cloud-upload-alt mr-2"></i>
      <span>Form saved. Will submit when online.</span>
    </div>
  `
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.remove()
  }, 3000)
}

function syncPendingData() {
  // Trigger background sync via service worker
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then(registration => {
      return registration.sync.register('background-sync')
    })
  }
}

// Performance Tracking
function initializePerformanceTracking() {
  // Track page load performance
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0]
      if (perfData) {
        trackPerformance('page_load', perfData.loadEventEnd - perfData.fetchStart)
      }
    }, 0)
  })
  
  // Track user interactions
  document.addEventListener('click', (e) => {
    if (e.target.matches('button, a, [onclick]')) {
      trackUserInteraction(e.target)
    }
  })
  
  // Track form completion times
  let formStartTime = null
  document.addEventListener('focusin', (e) => {
    if (e.target.matches('input, select, textarea') && !formStartTime) {
      formStartTime = performance.now()
    }
  })
  
  document.addEventListener('submit', (e) => {
    if (formStartTime) {
      const completionTime = performance.now() - formStartTime
      trackPerformance('form_completion', completionTime)
      formStartTime = null
    }
  })
}

async function trackPerformance(type, value) {
  if (AppState.isOffline) return
  
  try {
    await fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric_type: type,
        metric_value: value,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('Performance tracking failed:', error)
  }
}

function trackUserInteraction(element) {
  const interaction = {
    element: element.tagName,
    text: element.textContent?.substring(0, 50),
    timestamp: new Date().toISOString(),
    page: window.location.pathname
  }
  
  // Store locally and batch send
  const interactions = JSON.parse(localStorage.getItem('user-interactions') || '[]')
  interactions.push(interaction)
  
  // Keep only last 50 interactions
  if (interactions.length > 50) {
    interactions.shift()
  }
  
  localStorage.setItem('user-interactions', JSON.stringify(interactions))
}

// User Preferences
async function loadUserPreferences() {
  try {
    const response = await fetch('/api/i18n/user-preference')
    const data = await response.json()
    
    if (data.success) {
      AppState.userPreferences = data.preferences
      applyUserPreferences()
    }
  } catch (error) {
    console.error('Failed to load user preferences:', error)
  }
}

function applyUserPreferences() {
  const prefs = AppState.userPreferences
  
  if (prefs.language && prefs.language !== AppState.currentLanguage) {
    changeLanguage(prefs.language)
  }
  
  if (prefs.timezone) {
    // Apply timezone for date/time displays
    window.userTimezone = prefs.timezone
  }
}

async function saveUserPreference(key, value) {
  AppState.userPreferences[key] = value
  
  try {
    await fetch('/api/i18n/user-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(AppState.userPreferences)
    })
  } catch (error) {
    console.error('Failed to save user preference:', error)
  }
}

// Advanced Features
function initializeAdvancedFeatures() {
  setupGlobalSearch()
  setupSmartNotifications()
  setupAccessibilityFeatures()
}

function setupGlobalSearch() {
  // Create search overlay
  const searchOverlay = document.createElement('div')
  searchOverlay.id = 'search-overlay'
  searchOverlay.className = 'hidden fixed inset-0 bg-black/50 z-50'
  searchOverlay.innerHTML = `
    <div class="flex items-start justify-center pt-20 px-4">
      <div class="w-full max-w-2xl bg-white rounded-lg shadow-xl">
        <div class="p-4">
          <input type="text" id="global-search" placeholder="Search AssetShield App..." 
                 class="w-full px-4 py-3 border-0 text-lg focus:outline-none">
        </div>
        <div id="search-results" class="border-t max-h-96 overflow-y-auto">
          <!-- Search results will appear here -->
        </div>
      </div>
    </div>
  `
  document.body.appendChild(searchOverlay)
  
  // Global search shortcut (Cmd+K or Ctrl+K)
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      toggleGlobalSearch()
    }
    
    if (e.key === 'Escape') {
      closeGlobalSearch()
    }
  })
}

function toggleGlobalSearch() {
  const overlay = document.getElementById('search-overlay')
  const input = document.getElementById('global-search')
  
  overlay.classList.toggle('hidden')
  if (!overlay.classList.contains('hidden')) {
    input.focus()
  }
}

function closeGlobalSearch() {
  document.getElementById('search-overlay').classList.add('hidden')
}

// Manual initialization function for debugging
window.initAssessmentForm = function() {
  console.log('Manual assessment form initialization...')
  if (window.assessment) {
    console.log('Assessment already exists, reinitializing...')
  }
  window.assessment = new AssessmentForm()
  return window.assessment
}

// Export global functions for use in other scripts
window.AppState = AppState
window.changeLanguage = changeLanguage
window.trackPerformance = trackPerformance
window.saveUserPreference = saveUserPreference
window.AssessmentForm = AssessmentForm  // Export AssessmentForm class globally

console.log('Enhanced AssetShield App features loaded')// AssetShield App JavaScript Application

// Global variables
let currentStep = 1
let assessmentData = {}
let stripe = null

// Initialize Stripe with live publishable key
if (typeof Stripe !== 'undefined') {
  window.stripe = Stripe('pk_live_51QXkclLbdQZrtjifvnPTBiq0y9peuvU6V8vzfhHW4SJ0r04Ahh1a20h223wzj2yt0CXwW1JETfASdPkIGR0zBRfp00WFKlG2fh')
  console.log('Stripe loaded with live keys')
} else {
  console.warn('Stripe.js not loaded')
}

// Assessment form functionality
class AssessmentForm {
  constructor() {
    this.currentStep = 1
    this.maxSteps = 3
    this.data = {}
    this.init()
  }

  init() {
    console.log('Initializing AssessmentForm...')
    
    // Try multiple times to ensure DOM is ready
    const tryInit = (attempts = 0) => {
      const container = document.getElementById('assessment-form')
      if (container) {
        console.log('Assessment container found, loading step 1')
        this.loadStep(1)
        this.updateStepIndicator()
      } else if (attempts < 5) {
        console.log(`Assessment container not found, retrying... (attempt ${attempts + 1})`)
        setTimeout(() => tryInit(attempts + 1), 200)
      } else {
        console.error('Assessment container not found after multiple attempts!')
      }
    }
    
    tryInit()
  }

  loadStep(step) {
    const container = document.getElementById('assessment-form')
    if (!container) return

    const steps = {
      1: this.renderStep1(),
      2: this.renderStep2(),
      3: this.renderStep3()
    }

    container.innerHTML = steps[step] || ''
    this.currentStep = step
    this.updateStepIndicator()
    
    // Add event listeners
    this.attachEventListeners()
  }

  renderStep1() {
    return `
      <div class="space-y-6">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">Basic Information</h3>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">What is your profession?</label>
          <select id="profession" class="form-select" required>
            <option value="">Select your profession</option>
            <option value="doctor">Doctor/Medical Professional</option>
            <option value="lawyer">Lawyer/Attorney</option>
            <option value="business_owner">Business Owner</option>
            <option value="real_estate">Real Estate Professional</option>
            <option value="executive">Corporate Executive</option>
            <option value="consultant">Consultant</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">What is your approximate net worth?</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input type="radio" name="netWorth" value="under_500k" class="form-radio mr-3">
              <span>Under $500,000</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="netWorth" value="500k_1m" class="form-radio mr-3">
              <span>$500,000 - $1,000,000</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="netWorth" value="1m_5m" class="form-radio mr-3">
              <span>$1,000,000 - $5,000,000</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="netWorth" value="5m_10m" class="form-radio mr-3">
              <span>$5,000,000 - $10,000,000</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="netWorth" value="over_10m" class="form-radio mr-3">
              <span>Over $10,000,000</span>
            </label>
          </div>
        </div>

        <div class="flex justify-end">
          <button onclick="assessment.nextStep()" class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            Next Step <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
    `
  }

  renderStep2() {
    return `
      <div class="space-y-6">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">Asset Details</h3>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Do you own real estate?</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input type="radio" name="hasRealEstate" value="true" class="form-radio mr-3">
              <span>Yes</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="hasRealEstate" value="false" class="form-radio mr-3">
              <span>No</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">What percentage of your assets are liquid (cash, stocks, bonds)?</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input type="radio" name="liquidAssetPercentage" value="under_25" class="form-radio mr-3">
              <span>Under 25%</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="liquidAssetPercentage" value="25_50" class="form-radio mr-3">
              <span>25% - 50%</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="liquidAssetPercentage" value="50_75" class="form-radio mr-3">
              <span>50% - 75%</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="liquidAssetPercentage" value="over_75" class="form-radio mr-3">
              <span>Over 75%</span>
            </label>
          </div>
        </div>

        <div class="flex justify-between">
          <button onclick="assessment.prevStep()" class="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors">
            <i class="fas fa-arrow-left mr-2"></i> Previous
          </button>
          <button onclick="assessment.nextStep()" class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            Next Step <i class="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
    `
  }

  renderStep3() {
    return `
      <div class="space-y-6">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">Risk Factors</h3>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-3">Have you experienced any of the following? (Check all that apply)</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input type="checkbox" name="legalHistory" value="lawsuit" class="form-checkbox mr-3">
              <span>Lawsuit or legal dispute</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" name="legalHistory" value="divorce" class="form-checkbox mr-3">
              <span>Divorce or separation</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" name="legalHistory" value="bankruptcy" class="form-checkbox mr-3">
              <span>Bankruptcy</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" name="legalHistory" value="creditor_issues" class="form-checkbox mr-3">
              <span>Creditor issues</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" name="legalHistory" value="none" class="form-checkbox mr-3">
              <span>None of the above</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-3">What asset protection strategies do you currently have? (Check all that apply)</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input type="checkbox" name="currentProtection" value="llc" class="form-checkbox mr-3">
              <span>Limited Liability Company (LLC)</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" name="currentProtection" value="trust" class="form-checkbox mr-3">
              <span>Asset Protection Trust</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" name="currentProtection" value="insurance" class="form-checkbox mr-3">
              <span>Umbrella Insurance</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" name="currentProtection" value="offshore" class="form-checkbox mr-3">
              <span>Offshore Structures</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" name="currentProtection" value="none" class="form-checkbox mr-3">
              <span>None - I need to start protecting my assets</span>
            </label>
          </div>
        </div>

        <div class="flex justify-between">
          <button onclick="assessment.prevStep()" class="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors">
            <i class="fas fa-arrow-left mr-2"></i> Previous
          </button>
          <button onclick="assessment.submitAssessment()" id="submit-btn" class="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105">
            <i class="fas fa-chart-line mr-2"></i> Get My Results
          </button>
        </div>
      </div>
    `
  }



  attachEventListeners() {
    // Handle "none" checkboxes to uncheck others
    const noneCheckboxes = document.querySelectorAll('input[value="none"]')
    noneCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          const name = e.target.name
          const otherCheckboxes = document.querySelectorAll(`input[name="${name}"]:not([value="none"])`)
          otherCheckboxes.forEach(cb => cb.checked = false)
        }
      })
    })

    // Handle other checkboxes to uncheck "none"
    const otherCheckboxes = document.querySelectorAll('input[type="checkbox"]:not([value="none"])')
    otherCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          const name = e.target.name
          const noneCheckbox = document.querySelector(`input[name="${name}"][value="none"]`)
          if (noneCheckbox) noneCheckbox.checked = false
        }
      })
    })
  }

  nextStep() {
    if (this.validateCurrentStep()) {
      this.saveCurrentStepData()
      if (this.currentStep < this.maxSteps) {
        this.loadStep(this.currentStep + 1)
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.loadStep(this.currentStep - 1)
    }
  }

  validateCurrentStep() {
    const step = this.currentStep
    
    if (step === 1) {
      const professionEl = document.getElementById('profession')
      const netWorth = document.querySelector('input[name="netWorth"]:checked')
      
      if (!professionEl) {
        console.warn('Profession element not found')
        return false
      }
      
      const profession = professionEl.value
      if (!profession) {
        alert('Please select your profession')
        return false
      }
      if (!netWorth) {
        alert('Please select your net worth range')
        return false
      }
    }
    
    if (step === 2) {
      const hasRealEstate = document.querySelector('input[name="hasRealEstate"]:checked')
      const liquidAssets = document.querySelector('input[name="liquidAssetPercentage"]:checked')
      
      if (!hasRealEstate) {
        alert('Please indicate if you own real estate')
        return false
      }
      if (!liquidAssets) {
        alert('Please select your liquid asset percentage')
        return false
      }
    }
    

    
    return true
  }

  saveCurrentStepData() {
    const step = this.currentStep
    
    if (step === 1) {
      this.data.profession = document.getElementById('profession').value
      this.data.netWorth = document.querySelector('input[name="netWorth"]:checked').value
    }
    
    if (step === 2) {
      this.data.hasRealEstate = document.querySelector('input[name="hasRealEstate"]:checked').value === 'true'
      this.data.liquidAssetPercentage = document.querySelector('input[name="liquidAssetPercentage"]:checked').value
    }
    
    if (step === 3) {
      this.data.legalHistory = Array.from(document.querySelectorAll('input[name="legalHistory"]:checked')).map(cb => cb.value)
      this.data.currentProtection = Array.from(document.querySelectorAll('input[name="currentProtection"]:checked')).map(cb => cb.value)
      
      // Filter out "none" if other options are selected
      if (this.data.legalHistory.length > 1) {
        this.data.legalHistory = this.data.legalHistory.filter(item => item !== 'none')
      }
      if (this.data.currentProtection.length > 1) {
        this.data.currentProtection = this.data.currentProtection.filter(item => item !== 'none')
      }
    }
    

  }

  updateStepIndicator() {
    const stepIndicator = document.getElementById('step-indicator')
    if (!stepIndicator) return

    const stepElements = stepIndicator.querySelectorAll('.flex.items-center')
    
    stepElements.forEach((stepElement, index) => {
      const stepNumber = index + 1
      const circle = stepElement.querySelector('div')
      const text = stepElement.querySelector('span')
      
      // Add null checks to prevent className errors
      if (!circle || !text) {
        return
      }
      
      if (stepNumber < this.currentStep) {
        // Completed step
        circle.className = 'w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold'
        circle.innerHTML = '<i class="fas fa-check"></i>'
        text.className = 'ml-2 text-sm font-medium text-green-700'
      } else if (stepNumber === this.currentStep) {
        // Current step
        circle.className = 'w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold'
        circle.textContent = stepNumber
        text.className = 'ml-2 text-sm font-medium text-gray-700'
      } else {
        // Future step
        circle.className = 'w-8 h-8 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center font-semibold'
        circle.textContent = stepNumber
        text.className = 'ml-2 text-sm font-medium text-gray-500'
      }
    })
  }

  async submitAssessment() {
    if (!this.validateCurrentStep()) return
    
    this.saveCurrentStepData()
    const submitBtn = document.getElementById('submit-btn')
    submitBtn.classList.add('btn-loading')
    submitBtn.disabled = true
    
    try {
      // Add placeholder contact information for API compatibility
      const assessmentData = {
        ...this.data,
        name: 'Anonymous User',
        email: 'anonymous@example.com',
        phone: ''
      }
      
      const response = await axios.post('/api/assessment/submit', assessmentData)
      
      if (response.data.error) {
        throw new Error(response.data.error)
      }
      
      // Show results
      this.showResults(response.data)
      
    } catch (error) {
      console.error('Assessment submission failed:', error)
      alert('Failed to submit assessment. Please try again.')
      submitBtn.classList.remove('btn-loading')
      submitBtn.disabled = false
    }
  }

  showResults(data) {
    const container = document.getElementById('assessment-container')
    const riskLevelClass = `risk-${data.riskLevel.toLowerCase()}`
    
    container.innerHTML = `
      <div class="text-center space-y-8">
        <div class="mb-8">
          <h2 class="text-3xl font-bold text-gray-800 mb-4">Your Asset Protection Risk Assessment</h2>
          <p class="text-gray-600">Here are your personalized results:</p>
        </div>

        <div class="${riskLevelClass} rounded-xl p-8 border-2">
          <div class="text-center mb-6">
            <div class="text-4xl font-bold mb-2">${data.riskLevel} RISK</div>
            <div class="text-2xl font-semibold">$${data.wealthAtRisk.toLocaleString()} at Risk</div>
            <p class="mt-2 opacity-80">Estimated wealth potentially vulnerable to creditors</p>
          </div>
        </div>

        <div class="bg-gray-50 rounded-xl p-8">
          <h3 class="text-2xl font-bold text-gray-800 mb-6">Recommended Action Steps</h3>
          <div class="space-y-4 text-left">
            ${data.recommendations.map((rec, index) => `
              <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  ${index + 1}
                </div>
                <p class="text-gray-700 flex-1">${rec}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <button onclick="scrollToStrategies()" class="px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            <i class="fas fa-shield-alt mr-2"></i>
            Explore Protection Strategies
          </button>
          <button onclick="scheduleConsultation()" class="px-6 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
            <i class="fas fa-calendar mr-2"></i>
            Schedule Free Consultation
          </button>
        </div>

        <div class="text-sm text-gray-500">
          <p>Assessment ID: ${data.assessmentId} | Generated: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    `
    
    // Scroll to results
    container.scrollIntoView({ behavior: 'smooth' })
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

// Education Center functionality
class EducationCenter {
  constructor() {
    this.loadFeaturedContent()
  }

  async loadFeaturedContent() {
    try {
      const response = await axios.get('/api/education/featured')
      
      if (response.data && response.data.featured) {
        this.renderContent(response.data.featured)
      } else {
        console.warn('Education Center: No featured content found in response')
      }
    } catch (error) {
      console.error('Failed to load education content:', error)
    }
  }

  renderContent(content) {
    const container = document.getElementById('education-content')
    
    if (!container) {
      console.error('Education Center: Container #education-content not found!')
      return
    }
    
    if (!content || !Array.isArray(content) || content.length === 0) {
      console.warn('Education Center: No valid content to render')
      container.innerHTML = '<div class="col-span-full text-center py-8"><p class="text-gray-500">No educational content available at the moment.</p></div>'
      return
    }

    container.innerHTML = content.map(item => `
      <div class="bg-white rounded-xl shadow-lg p-6 card-hover">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
            <i class="fas fa-${this.getIconForType(item.content_type)} text-blue-600 text-xl"></i>
          </div>
          <div>
            <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">${item.content_type}</span>
            ${item.is_premium ? '<span class="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded ml-2">Premium</span>' : ''}
          </div>
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-3">${item.title}</h3>
        <p class="text-gray-600 mb-4">${item.description || ''}</p>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500">
            <i class="fas fa-eye mr-1"></i> ${item.view_count} views
          </span>
          <button onclick="education.viewContent(${item.id})" class="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors">
            ${item.content_type === 'video' ? 'Watch Now' : item.download_url ? 'Download PDF' : 'Read More'}
          </button>
        </div>
      </div>
    `).join('')
  }

  getIconForType(type) {
    const icons = {
      article: 'file-alt',
      guide: 'book',
      case_study: 'briefcase',
      checklist: 'tasks',
      video: 'play-circle'
    }
    return icons[type] || 'file'
  }

  async viewContent(id) {
    try {
      const response = await axios.get(`/api/education/content/${id}`)
      // In a real app, this would open a modal or navigate to content page
      console.log('Content:', response.data.content)
      alert('Content viewing functionality would be implemented here')
    } catch (error) {
      console.error('Failed to load content:', error)
    }
  }
}

// Global functions
function scrollToAssessment() {
  document.getElementById('assessment').scrollIntoView({ behavior: 'smooth' })
}

function scrollToStrategies() {
  document.getElementById('strategies').scrollIntoView({ behavior: 'smooth' })
}

function purchaseService(serviceType) {
  // In a real implementation, this would integrate with Stripe
  alert(`Service purchase for ${serviceType} would be implemented here with Stripe integration`)
}

function requestDemo(tier) {
  // Show demo request modal
  showDemoRequestModal(tier)
}

function showDemoRequestModal(tier) {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-8 max-w-md w-full mx-4">
      <h3 class="text-2xl font-bold text-gray-800 mb-6">Request Demo - ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan</h3>
      
      <form id="demo-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
          <input type="text" name="name" class="form-input" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
          <input type="email" name="email" class="form-input" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <input type="tel" name="phone" class="form-input">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Law Firm Name</label>
          <input type="text" name="firmName" class="form-input">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Practice Size</label>
          <select name="practiceSize" class="form-select">
            <option value="">Select size</option>
            <option value="solo">Solo Practitioner</option>
            <option value="2-5">2-5 Attorneys</option>
            <option value="6-10">6-10 Attorneys</option>
            <option value="11+">11+ Attorneys</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Message</label>
          <textarea name="message" rows="3" class="form-input"></textarea>
        </div>
        
        <div class="flex space-x-3 pt-4">
          <button type="button" onclick="closeDemoModal()" class="flex-1 px-4 py-2 bg-gray-500 text-white font-semibold rounded hover:bg-gray-600 transition-colors">
            Cancel
          </button>
          <button type="submit" class="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors">
            Request Demo
          </button>
        </div>
      </form>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Handle form submission
  document.getElementById('demo-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData.entries())
    data.interestTier = tier
    
    try {
      const response = await axios.post('/api/lawfirm/demo-request', data)
      
      if (response.data.error) {
        throw new Error(response.data.error)
      }
      
      closeDemoModal()
      alert('Demo request submitted successfully! We will contact you within 24 hours.')
      
    } catch (error) {
      console.error('Demo request failed:', error)
      alert('Failed to submit demo request. Please try again.')
    }
  })
}

function closeDemoModal() {
  const modal = document.querySelector('.fixed.inset-0')
  if (modal) {
    modal.remove()
  }
}

function scheduleConsultation() {
  showConsultationModal()
}

function showConsultationModal() {
  const modal = document.createElement('div')
  modal.id = 'consultation-modal'
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-bold text-gray-800">Schedule Free Consultation</h3>
        <button onclick="closeConsultationModal()" class="text-gray-400 hover:text-gray-600 text-2xl">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center">
          <i class="fas fa-calendar-check text-green-600 mr-3"></i>
          <div>
            <h4 class="font-semibold text-green-800">Free 30-Minute Consultation</h4>
            <p class="text-sm text-green-700">Discuss your asset protection needs with our experts</p>
          </div>
        </div>
      </div>
      
      <form id="consultation-form" class="space-y-4">
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
            <input type="text" name="firstName" class="form-input" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
            <input type="text" name="lastName" class="form-input" required>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
          <input type="email" name="email" class="form-input" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
          <input type="tel" name="phone" class="form-input" required placeholder="(555) 123-4567">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Preferred Contact Method</label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input type="radio" name="contactMethod" value="phone" class="form-radio mr-3" checked>
              <span>Phone Call</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="contactMethod" value="email" class="form-radio mr-3">
              <span>Email</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="contactMethod" value="video" class="form-radio mr-3">
              <span>Video Call (Zoom/Teams)</span>
            </label>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Preferred Time</label>
          <select name="preferredTime" class="form-select" required>
            <option value="">Select preferred time</option>
            <option value="morning">Morning (9 AM - 12 PM)</option>
            <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
            <option value="evening">Evening (5 PM - 8 PM)</option>
            <option value="flexible">I'm flexible</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Urgency Level</label>
          <select name="urgency" class="form-select" required>
            <option value="">How soon do you need assistance?</option>
            <option value="urgent">Urgent - Within 48 hours</option>
            <option value="soon">Soon - Within 1 week</option>
            <option value="planning">Planning - Within 1 month</option>
            <option value="exploring">Just exploring options</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Primary Concern</label>
          <select name="primaryConcern" class="form-select" required>
            <option value="">What's your main asset protection concern?</option>
            <option value="lawsuit_protection">Lawsuit Protection</option>
            <option value="creditor_protection">Creditor Protection</option>
            <option value="estate_planning">Estate Planning</option>
            <option value="business_protection">Business Asset Protection</option>
            <option value="divorce_protection">Divorce Asset Protection</option>
            <option value="tax_optimization">Tax Optimization</option>
            <option value="general_consultation">General Consultation</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Additional Details</label>
          <textarea name="message" rows="3" class="form-input" placeholder="Tell us about your specific situation, questions, or concerns..."></textarea>
        </div>
        
        <div class="border-t pt-4 text-sm text-gray-600">
          <p class="mb-2"><strong>What to expect:</strong></p>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li>Free 30-minute consultation with an asset protection specialist</li>
            <li>Review of your current asset protection status</li>
            <li>Personalized recommendations based on your situation</li>
            <li>No obligation - educational consultation only</li>
          </ul>
        </div>
        
        <div class="flex space-x-3 pt-4">
          <button type="button" onclick="closeConsultationModal()" class="flex-1 px-4 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors">
            Cancel
          </button>
          <button type="submit" id="consultation-submit-btn" class="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
            <i class="fas fa-calendar-plus mr-2"></i>
            Schedule Consultation
          </button>
        </div>
      </form>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Handle form submission
  document.getElementById('consultation-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    await submitConsultationRequest(e.target)
  })
}

function closeConsultationModal() {
  const modal = document.getElementById('consultation-modal')
  if (modal) {
    modal.remove()
  }
}

async function submitConsultationRequest(form) {
  const submitBtn = document.getElementById('consultation-submit-btn')
  const originalText = submitBtn.innerHTML
  
  // Show loading state
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Scheduling...'
  submitBtn.disabled = true
  
  try {
    const formData = new FormData(form)
    const data = Object.fromEntries(formData.entries())
    
    // Combine first and last name
    data.name = `${data.firstName} ${data.lastName}`
    delete data.firstName
    delete data.lastName
    
    const response = await axios.post('/api/consultation/schedule', data)
    
    if (response.data.error) {
      throw new Error(response.data.error)
    }
    
    // Close modal and show success message
    closeConsultationModal()
    showConsultationSuccess(response.data)
    
  } catch (error) {
    console.error('Consultation scheduling failed:', error)
    alert('Failed to schedule consultation. Please try again or call us directly.')
    
    // Reset button
    submitBtn.innerHTML = originalText
    submitBtn.disabled = false
  }
}

function showConsultationSuccess(data) {
  const successModal = document.createElement('div')
  successModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  successModal.innerHTML = `
    <div class="bg-white rounded-xl p-8 max-w-md w-full mx-4">
      <div class="text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-check text-green-600 text-2xl"></i>
        </div>
        
        <h3 class="text-2xl font-bold text-gray-800 mb-4">Consultation Scheduled!</h3>
        
        <div class="text-left bg-gray-50 rounded-lg p-4 mb-6">
          <h4 class="font-semibold text-gray-800 mb-2">Next Steps:</h4>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• You'll receive a confirmation email within 15 minutes</li>
            <li>• Our team will contact you within 24 hours to confirm your appointment</li>
            <li>• We'll send you a calendar invite with all the details</li>
            <li>• Prepare any questions about your asset protection needs</li>
          </ul>
        </div>
        
        <div class="text-sm text-gray-500 mb-6">
          <p><strong>Request ID:</strong> ${data.requestId}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="space-y-3">
          <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" class="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
            Perfect! Close This Window
          </button>
          
          <p class="text-xs text-gray-500">
            Need immediate assistance? Call us at <a href="tel:+1-555-PROTECT" class="text-blue-600 hover:underline">+1 (555) PROTECT</a>
          </p>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(successModal)
}

// Authentication functions
function showLoginModal() {
  window.location.href = '/login'
}

async function login(email, password) {
  try {
    const response = await axios.post('/api/auth/login', { email, password })
    
    if (response.data.success) {
      window.location.href = '/dashboard'
    } else {
      throw new Error(response.data.error)
    }
  } catch (error) {
    console.error('Login error:', error)
    alert('Login failed: ' + (error.response?.data?.error || error.message))
  }
}

async function register(formData) {
  try {
    const response = await axios.post('/api/auth/register', formData)
    
    if (response.data.success) {
      alert('Account created successfully! Redirecting to dashboard...')
      window.location.href = '/dashboard'
    } else {
      throw new Error(response.data.error)
    }
  } catch (error) {
    console.error('Registration error:', error)
    alert('Registration failed: ' + (error.response?.data?.error || error.message))
  }
}

async function logout() {
  try {
    await axios.post('/api/auth/logout')
    window.location.href = '/'
  } catch (error) {
    console.error('Logout error:', error)
    window.location.href = '/'
  }
}

async function loadDashboard() {
  try {
    const response = await axios.get('/api/members/dashboard')
    
    if (response.data.success) {
      const { user, services, recentActivity } = response.data
      
      // Update user info
      document.getElementById('user-name').textContent = user.name
      document.getElementById('member-since').textContent = new Date(user.memberSince).toLocaleDateString()
      document.getElementById('active-services').textContent = services.length
      
      // Update services
      renderUserServices(services)
      
      // Update recent activity
      renderRecentActivity(recentActivity)
    }
  } catch (error) {
    console.error('Dashboard load error:', error)
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
  }
}

function renderUserServices(services) {
  const container = document.getElementById('user-services')
  
  if (!services || services.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <i class="fas fa-shield-alt text-gray-300 text-4xl mb-4"></i>
        <p class="text-gray-500 mb-4">No services purchased yet</p>
        <a href="/#strategies" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Browse Services
        </a>
      </div>
    `
    return
  }
  
  container.innerHTML = services.map(service => `
    <div class="border rounded-lg p-4 mb-4 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-semibold text-gray-800 capitalize">${service.type.replace('_', ' ')}</h4>
          <p class="text-sm text-gray-600">Access Level: ${service.accessLevel}</p>
          <p class="text-xs text-gray-500">Purchased: ${new Date(service.purchaseDate).toLocaleDateString()}</p>
        </div>
        <div class="flex items-center space-x-2">
          <span class="px-2 py-1 text-xs rounded ${service.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${service.status}</span>
          <a href="/service/${service.type}" class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
            Access
          </a>
        </div>
      </div>
    </div>
  `).join('')
}

function renderRecentActivity(activities) {
  const container = document.getElementById('recent-activity')
  
  if (!activities || activities.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No recent activity</p>'
    return
  }
  
  container.innerHTML = activities.map(activity => `
    <div class="border-b border-gray-200 py-3 last:border-b-0">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-medium text-gray-800">${activity.title}</h4>
          <p class="text-sm text-gray-600">${new Date(activity.created_at).toLocaleDateString()}</p>
        </div>
        <i class="fas fa-${activity.type === 'assessment' ? 'chart-line' : 'credit-card'} text-blue-600"></i>
      </div>
    </div>
  `).join('')
}

async function loadServiceContent(serviceType) {
  try {
    const response = await axios.get(`/api/members/service/${serviceType}`)
    
    if (response.data.success) {
      const { service } = response.data
      renderServiceContent(service)
    } else {
      document.getElementById('service-content').innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-lock text-red-500 text-4xl mb-4"></i>
          <h2 class="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
          <p class="text-gray-600 mb-6">${response.data.message}</p>
          <a href="/#strategies" class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            View Available Services
          </a>
        </div>
      `
    }
  } catch (error) {
    console.error('Service content error:', error)
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
  }
}

function renderServiceContent(service) {
  const container = document.getElementById('service-content')
  
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-lg p-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-4">${service.content.title}</h1>
        <p class="text-gray-600 mb-6">${service.content.description}</p>
        
        <div class="flex items-center space-x-4 mb-6">
          <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            ${service.accessLevel.toUpperCase()} ACCESS
          </span>
          <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            ${service.status.toUpperCase()}
          </span>
        </div>
      </div>
      
      <div class="grid md:grid-cols-2 gap-8">
        <div>
          <h3 class="text-xl font-semibold text-gray-800 mb-4">What's Included</h3>
          <ul class="space-y-2">
            ${service.content.items.map(item => `
              <li class="flex items-start">
                <i class="fas fa-check text-green-500 mr-3 mt-1"></i>
                <span class="text-gray-700">${item}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        
        <div>
          <h3 class="text-xl font-semibold text-gray-800 mb-4">Downloads</h3>
          <div class="space-y-3">
            ${service.content.downloads.map(download => `
              <a href="${download.url}" class="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <i class="fas fa-file-pdf text-red-500 mr-3"></i>
                <span class="text-gray-700">${download.name}</span>
                <i class="fas fa-download text-gray-400 ml-auto"></i>
              </a>
            `).join('')}
          </div>
        </div>
      </div>
      
      <div class="mt-8 pt-8 border-t">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-semibold text-gray-800">Need Help?</h4>
            <p class="text-sm text-gray-600">Contact our support team for assistance</p>
          </div>
          <button class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            <i class="fas fa-headset mr-2"></i>Get Support
          </button>
        </div>
      </div>
    </div>
  `
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing AssetShield App...')
  
  // Wait a bit longer for all elements to be ready
  setTimeout(() => {
    // Check if assessment container exists
    const assessmentContainer = document.getElementById('assessment-form')
    if (assessmentContainer) {
      console.log('Assessment container found, initializing form...')
      // Initialize assessment form
      window.assessment = new AssessmentForm()
    }
  }, 500)  // Increased delay to ensure all DOM elements are ready
  
  // Check if education content container exists
  const educationContainer = document.getElementById('education-content')
  if (educationContainer) {
    console.log('Education container found, initializing education center...')
    // Initialize education center
    window.education = new EducationCenter()
  }
  
  // Load dashboard data if on dashboard page
  if (window.location.pathname === '/dashboard') {
    loadDashboard()
  }
  
  // Load service content if on service page
  if (window.location.pathname.startsWith('/service/')) {
    const serviceType = window.location.pathname.split('/')[2]
    loadServiceContent(serviceType)
  }
  
  // Load law firm dashboard data if on portal page
  if (window.location.pathname === '/portal') {
    loadDashboardData()
  }
  
  // Handle login form
  const loginForm = document.getElementById('login-form')
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(e.target)
      await login(formData.get('email'), formData.get('password'))
    })
  }
  
  // Handle register form
  const registerForm = document.getElementById('register-form')
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(e.target)
      const data = Object.fromEntries(formData.entries())
      await register(data)
    })
  }
})

// Dashboard functionality for law firm portal
async function loadDashboardData() {
  try {
    // In a real app, you'd get the user ID from authentication
    const userId = 1 // Placeholder
    
    const response = await axios.get(`/api/lawfirm/dashboard/${userId}`)
    const data = response.data
    
    // Update dashboard stats
    document.getElementById('total-leads').textContent = data.analytics.totalLeads
    document.getElementById('monthly-leads').textContent = data.analytics.monthlyLeads
    document.getElementById('conversion-rate').textContent = `${data.analytics.conversionRate}%`
    document.getElementById('revenue').textContent = `$${data.analytics.estimatedRevenue.toLocaleString()}`
    
    // Render recent leads
    renderRecentLeads(data.recentLeads)
    
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
}

function renderRecentLeads(leads) {
  const container = document.getElementById('recent-leads')
  if (!container) return
  
  if (!leads || leads.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No leads yet</p>'
    return
  }
  
  container.innerHTML = leads.map(lead => `
    <div class="border-b border-gray-200 py-3 last:border-b-0">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-semibold text-gray-800">${lead.name}</h4>
          <p class="text-sm text-gray-600">${lead.email}</p>
          <span class="inline-block px-2 py-1 text-xs rounded ${
            lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
            lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
            lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
            lead.status === 'converted' ? 'bg-purple-100 text-purple-800' :
            'bg-gray-100 text-gray-800'
          }">${lead.status}</span>
        </div>
        <div class="text-right text-sm text-gray-500">
          ${new Date(lead.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  `).join('')
}