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
        document.getElementById('install-prompt').classList.remove('hidden')
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

// Export global functions for use in other scripts
window.AppState = AppState
window.changeLanguage = changeLanguage
window.trackPerformance = trackPerformance
window.saveUserPreference = saveUserPreference

console.log('Enhanced AssetShield App features loaded')