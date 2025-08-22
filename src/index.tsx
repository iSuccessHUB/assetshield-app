import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'
import { securityHeaders, rateLimiter, sanitizeInput, auditLogger, requestSizeLimit } from './middleware/security'
import type { CloudflareBindings } from './types'
import { assessmentRoutes } from './routes/assessment'
import { paymentRoutes } from './routes/payments'
import { lawFirmRoutes } from './routes/lawfirm'
import { educationRoutes } from './routes/education'
import { consultationRoutes } from './routes/consultation'
import { authRoutes } from './routes/auth'
import { membersRoutes } from './routes/members'
import { globalRoutes } from './routes/global'
import { complianceRoutes } from './routes/compliance'
import { analyticsRoutes } from './routes/analytics'
import { documentsRoutes } from './routes/documents'
import { i18nRoutes } from './routes/i18n'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Apply security middlewares globally
app.use('*', securityHeaders())
app.use('*', auditLogger())
app.use('*', requestSizeLimit())

// Enable CORS for API routes with security configurations
app.use('/api/*', cors({
  origin: ['https://assetshieldapp.com', 'https://*.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true
}))

// Apply API-specific security middlewares
app.use('/api/*', rateLimiter(100, 15 * 60 * 1000)) // 100 requests per 15 minutes
app.use('/api/*', sanitizeInput())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Serve PWA files from root
app.get('/manifest.json', async (c) => {
  const manifest = {
    "name": "AssetShield App - Asset Protection Platform",
    "short_name": "AssetShield",
    "description": "Complete asset protection platform for individuals and law firms",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#1e40af",
    "theme_color": "#1e40af",
    "orientation": "portrait",
    "categories": ["business", "finance", "productivity"],
    "lang": "en",
    "dir": "ltr",
    "icons": [
      {
        "src": "/static/icons/icon-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "maskable any"
      },
      {
        "src": "/static/icons/icon-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "maskable any"
      }
    ],
    "shortcuts": [
      {
        "name": "Risk Assessment",
        "short_name": "Assessment",
        "description": "Start a new risk assessment",
        "url": "/#assessment",
        "icons": [
          {
            "src": "/static/icons/assessment-shortcut.png",
            "sizes": "96x96"
          }
        ]
      }
    ]
  }
  
  c.header('Content-Type', 'application/json')
  return c.json(manifest)
})

app.get('/sw.js', (c) => {
  c.header('Content-Type', 'text/javascript')
  c.header('Service-Worker-Allowed', '/')
  return c.text(`
// Service Worker for AssetShield App
const CACHE_NAME = 'assetshield-v1.0.0'
const OFFLINE_URL = '/offline.html'

// Files to cache for offline functionality
const CACHE_FILES = [
  '/',
  '/static/app.js',
  '/static/styles.css',
  '/login',
  '/register',
  '/dashboard'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(CACHE_FILES)
      })
      .then(() => {
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response
        }
        
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }
            
            const responseToCache = response.clone()
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache)
              })
            
            return response
          })
          .catch(() => {
            if (event.request.headers.get('Accept').includes('text/html')) {
              return caches.match('/offline.html')
            }
          })
      })
  )
})
  `)
})

app.get('/offline.html', (c) => {
  c.header('Content-Type', 'text/html')
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AssetShield App - Offline</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 0;
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                text-align: center;
            }
            .offline-container { max-width: 400px; padding: 2rem; }
            .icon { width: 80px; height: 80px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; font-size: 2rem; }
            h1 { font-size: 1.5rem; margin-bottom: 1rem; font-weight: 600; }
            p { font-size: 1rem; line-height: 1.5; opacity: 0.9; margin-bottom: 2rem; }
            button { background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.3); color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <div class="icon">📡</div>
            <h1>You're Offline</h1>
            <p>AssetShield App works offline! Your data is safely stored and will sync when you're back online.</p>
            <button onclick="window.location.reload()">Try Again</button>
        </div>
        <script>
            window.addEventListener('online', function() {
                window.location.href = '/';
            });
        </script>
    </body>
    </html>
  `)
})

// Use JSX renderer for HTML pages
app.use(renderer)

// API Routes
app.route('/api/assessment', assessmentRoutes)
app.route('/api/payments', paymentRoutes)
app.route('/api/lawfirm', lawFirmRoutes)
app.route('/api/education', educationRoutes)
app.route('/api/consultation', consultationRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/members', membersRoutes)
app.route('/api/global', globalRoutes)
app.route('/api/compliance', complianceRoutes)
app.route('/api/analytics', analyticsRoutes)
app.route('/api/documents', documentsRoutes)
app.route('/api/i18n', i18nRoutes)

// Main landing page
app.get('/', (c) => {
  return c.render(
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
        {/* Header */}
        <nav className="px-4 sm:px-6 py-4 bg-white/10 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-shield-alt text-white text-lg sm:text-xl"></i>
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-white">AssetShield App</h1>
            </div>
            
            {/* Mobile Menu Button */}
            <button id="mobile-menu-btn" className="md:hidden text-white p-2" onclick="toggleMobileMenu()">
              <i className="fas fa-bars text-xl"></i>
            </button>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="#assessment" className="text-white/90 hover:text-white transition-colors">Risk Assessment</a>
              <a href="#strategies" className="text-white/90 hover:text-white transition-colors">Strategies</a>
              <a href="#education" className="text-white/90 hover:text-white transition-colors">Education</a>
              <a href="#law-firms" className="text-white/90 hover:text-white transition-colors">For Law Firms</a>
              <div className="relative">
                <button id="language-btn" onclick="toggleLanguageMenu()" className="text-white/90 hover:text-white transition-colors flex items-center">
                  <i className="fas fa-globe mr-2"></i>EN
                  <i className="fas fa-chevron-down ml-1 text-sm"></i>
                </button>
                <div id="language-menu" className="hidden absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg py-2 z-50">
                  <button onclick="changeLanguage('en')" className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100">English</button>
                  <button onclick="changeLanguage('es')" className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100">Español</button>
                  <button onclick="changeLanguage('fr')" className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100">Français</button>
                  <button onclick="changeLanguage('de')" className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100">Deutsch</button>
                </div>
              </div>
              <button onclick="showLoginModal()" className="px-4 py-2 bg-white/10 backdrop-blur-md text-white font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-all">
                <i className="fas fa-user mr-2"></i>Login
              </button>
            </div>
          </div>
          
          {/* Mobile Navigation */}
          <div id="mobile-menu" className="hidden md:hidden mt-4 pb-4 border-t border-white/20">
            <div className="flex flex-col space-y-3 mt-4">
              <a href="#assessment" className="text-white/90 hover:text-white transition-colors py-2">Risk Assessment</a>
              <a href="#strategies" className="text-white/90 hover:text-white transition-colors py-2">Strategies</a>
              <a href="#education" className="text-white/90 hover:text-white transition-colors py-2">Education</a>
              <a href="#law-firms" className="text-white/90 hover:text-white transition-colors py-2">For Law Firms</a>
              <div className="flex items-center justify-between py-2">
                <button id="mobile-language-btn" onclick="toggleMobileLanguageMenu()" className="text-white/90 hover:text-white transition-colors flex items-center">
                  <i className="fas fa-globe mr-2"></i>English
                  <i className="fas fa-chevron-down ml-1 text-sm"></i>
                </button>
                <div id="mobile-language-menu" className="hidden absolute right-4 bg-white rounded-lg shadow-lg py-2 z-50">
                  <button onclick="changeLanguage('en')" className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 text-sm">English</button>
                  <button onclick="changeLanguage('es')" className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 text-sm">Español</button>
                  <button onclick="changeLanguage('fr')" className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 text-sm">Français</button>
                  <button onclick="changeLanguage('de')" className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 text-sm">Deutsch</button>
                </div>
              </div>
              <button onclick="showLoginModal()" className="w-full py-3 bg-white/10 backdrop-blur-md text-white font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-all">
                <i className="fas fa-user mr-2"></i>Login
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="px-4 sm:px-6 py-12 sm:py-20">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight" data-translate="hero.title">
              Complete Asset Protection Platform
            </h1>
            <p className="text-lg sm:text-xl text-blue-100 mb-8 sm:mb-12 max-w-3xl mx-auto" data-translate="hero.subtitle">
              Discover your asset protection risk level, explore tailored strategies, and access comprehensive educational resources to safeguard your wealth.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mb-8 sm:mb-12 text-blue-200">
              <div className="flex items-center">
                <i className="fas fa-shield-alt mr-2"></i>
                <span className="text-sm sm:text-base">Bank-Level Security</span>
              </div>
              <div className="flex items-center">
                <i className="fas fa-users mr-2"></i>
                <span className="text-sm sm:text-base">10,000+ Clients Protected</span>
              </div>
              <div className="flex items-center">
                <i className="fas fa-globe mr-2"></i>
                <span className="text-sm sm:text-base">Global Coverage</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onclick="scrollToAssessment()" 
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-xl text-sm sm:text-base"
              >
                <i className="fas fa-chart-line mr-2"></i>
                <span data-translate="hero.start_assessment">Start Risk Assessment</span>
              </button>
              <button 
                onclick="scrollToStrategies()" 
                className="px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-md text-white font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-all text-sm sm:text-base"
              >
                <i className="fas fa-info-circle mr-2"></i>
                <span data-translate="hero.learn_more">Learn More</span>
              </button>
              <button 
                onclick="showConsultationModal()" 
                className="px-6 sm:px-8 py-3 sm:py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all text-sm sm:text-base"
              >
                <i className="fas fa-calendar mr-2"></i>
                <span data-translate="consultation.schedule">Free Consultation</span>
              </button>
            </div>
          </div>
        </section>

        {/* Risk Assessment Section */}
        <section id="assessment" className="px-6 py-20 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Discover Your Asset Protection Risk Level
              </h2>
              <p className="text-xl text-gray-600">
                Complete our comprehensive assessment to receive personalized recommendations
              </p>
            </div>

            <div id="assessment-container" className="bg-white rounded-2xl shadow-2xl p-8">
              <div id="step-indicator" className="flex justify-between mb-8">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">1</div>
                  <span className="ml-2 text-sm font-medium text-gray-700">Basic Info</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center font-semibold">2</div>
                  <span className="ml-2 text-sm font-medium text-gray-500">Assets</span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center font-semibold">3</div>
                  <span className="ml-2 text-sm font-medium text-gray-500">Risk Factors</span>
                </div>
              </div>

              <div id="assessment-form">
                {/* Assessment form will be loaded dynamically */}
                <div id="assessment-loading" className="text-center py-12">
                  <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                  <p className="text-gray-600">Loading assessment...</p>
                </div>
              </div>
              
              <script dangerouslySetInnerHTML={{__html: `
                // Immediate assessment form initialization - fallback if main app.js fails
                setTimeout(function() {
                  const container = document.getElementById('assessment-form');
                  const loading = document.getElementById('assessment-loading');
                  if (container && loading && loading.parentNode === container) {
                    console.log('Fallback: Direct assessment form initialization...');
                    container.innerHTML = \`
                      <div class="space-y-6">
                        <h3 class="text-2xl font-bold text-gray-800 mb-6">Basic Information</h3>
                        
                        <div>
                          <label class="block text-sm font-medium text-gray-700 mb-2">What is your profession?</label>
                          <select id="profession" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
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
                              <input type="radio" name="netWorth" value="under_500k" class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-3">
                              <span>Under $500,000</span>
                            </label>
                            <label class="flex items-center">
                              <input type="radio" name="netWorth" value="500k_1m" class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-3">
                              <span>$500,000 - $1,000,000</span>
                            </label>
                            <label class="flex items-center">
                              <input type="radio" name="netWorth" value="1m_5m" class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-3">
                              <span>$1,000,000 - $5,000,000</span>
                            </label>
                            <label class="flex items-center">
                              <input type="radio" name="netWorth" value="5m_10m" class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-3">
                              <span>$5,000,000 - $10,000,000</span>
                            </label>
                            <label class="flex items-center">
                              <input type="radio" name="netWorth" value="over_10m" class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-3">
                              <span>Over $10,000,000</span>
                            </label>
                          </div>
                        </div>

                        <div class="flex justify-end">
                          <button onclick="nextAssessmentStep()" class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                            Next Step <i class="fas fa-arrow-right ml-2"></i>
                          </button>
                        </div>
                      </div>
                    \`;
                  }
                }, 2000);
                
                // Simple next step function as fallback
                if (!window.nextAssessmentStep) {
                  window.nextAssessmentStep = function() {
                    alert('Assessment Step 2 would load here. The full assessment system is being loaded...');
                  };
                }
                
                // Ensure basic functions are available globally
                if (!window.changeLanguage) {
                  window.changeLanguage = function(lang) {
                    console.log('Language change to:', lang);
                    // Basic implementation until full app loads
                  };
                }
                
                if (!window.toggleLanguageMenu) {
                  window.toggleLanguageMenu = function() {
                    const menu = document.getElementById('language-menu');
                    if (menu) menu.classList.toggle('hidden');
                  };
                }
                
                if (!window.toggleMobileLanguageMenu) {
                  window.toggleMobileLanguageMenu = function() {
                    const menu = document.getElementById('mobile-language-menu');
                    if (menu) menu.classList.toggle('hidden');
                  };
                }
                
                if (!window.toggleMobileMenu) {
                  window.toggleMobileMenu = function() {
                    const menu = document.getElementById('mobile-menu');
                    const icon = document.querySelector('#mobile-menu-btn i');
                    if (menu && icon) {
                      if (menu.classList.contains('hidden')) {
                        menu.classList.remove('hidden');
                        icon.className = 'fas fa-times text-xl';
                      } else {
                        menu.classList.add('hidden');
                        icon.className = 'fas fa-bars text-xl';
                      }
                    }
                  };
                }
                
                if (!window.showLoginModal) {
                  window.showLoginModal = function() {
                    alert('Login functionality is being loaded...');
                  };
                }
                
                if (!window.scrollToAssessment) {
                  window.scrollToAssessment = function() {
                    document.getElementById('assessment').scrollIntoView({ behavior: 'smooth' });
                  };
                }
                
                if (!window.scrollToStrategies) {
                  window.scrollToStrategies = function() {
                    document.getElementById('strategies').scrollIntoView({ behavior: 'smooth' });
                  };
                }
                
                if (!window.showConsultationModal) {
                  window.showConsultationModal = function() {
                    alert('Consultation booking functionality is being loaded...');
                  };
                }
              `}}></script>
            </div>
          </div>
        </section>

        {/* Asset Protection Strategies */}
        <section id="strategies" className="px-6 py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Asset Protection Strategies
              </h2>
              <p className="text-xl text-gray-600">
                Explore our comprehensive protection solutions tailored to your needs
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <i className="fas fa-building text-blue-600 text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Limited Liability Company</h3>
                <p className="text-gray-600 mb-6">Protect your personal assets from business liabilities with a properly structured LLC.</p>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-bold text-blue-600">$5,000</span>
                  <span className="text-sm text-gray-500">Starting price</span>
                </div>
                <ul className="space-y-2 mb-8">
                  <li className="flex items-center text-gray-600">
                    <i className="fas fa-check text-green-500 mr-2"></i>
                    Personal asset protection
                  </li>
                  <li className="flex items-center text-gray-600">
                    <i className="fas fa-check text-green-500 mr-2"></i>
                    Tax benefits
                  </li>
                  <li className="flex items-center text-gray-600">
                    <i className="fas fa-check text-green-500 mr-2"></i>
                    Business flexibility
                  </li>
                </ul>
                <button 
                  onclick="purchaseService('llc')" 
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Learn More
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow border-2 border-orange-200">
                <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
                  <i className="fas fa-university text-orange-600 text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Domestic Asset Protection Trust</h3>
                <p className="text-gray-600 mb-6">Advanced trust structures for high-net-worth individuals seeking maximum protection.</p>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-bold text-orange-600">$15,000</span>
                  <span className="text-sm text-gray-500">Starting price</span>
                </div>
                <ul className="space-y-2 mb-8">
                  <li className="flex items-center text-gray-600">
                    <i className="fas fa-check text-green-500 mr-2"></i>
                    Creditor protection
                  </li>
                  <li className="flex items-center text-gray-600">
                    <i className="fas fa-check text-green-500 mr-2"></i>
                    Estate planning benefits
                  </li>
                  <li className="flex items-center text-gray-600">
                    <i className="fas fa-check text-green-500 mr-2"></i>
                    Tax optimization
                  </li>
                </ul>
                <button 
                  onclick="purchaseService('trust')" 
                  className="w-full py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Learn More
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                  <i className="fas fa-globe text-green-600 text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Offshore Asset Protection</h3>
                <p className="text-gray-600 mb-6">International structures for ultimate asset protection and privacy.</p>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-bold text-green-600">$25,000</span>
                  <span className="text-sm text-gray-500">Starting price</span>
                </div>
                <ul className="space-y-2 mb-8">
                  <li className="flex items-center text-gray-600">
                    <i className="fas fa-check text-green-500 mr-2"></i>
                    Maximum protection
                  </li>
                  <li className="flex items-center text-gray-600">
                    <i className="fas fa-check text-green-500 mr-2"></i>
                    International privacy
                  </li>
                  <li className="flex items-center text-gray-600">
                    <i className="fas fa-check text-green-500 mr-2"></i>
                    Diversification benefits
                  </li>
                </ul>
                <button 
                  onclick="purchaseService('offshore')" 
                  className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Premium Upgrade Section */}
        <section className="px-6 py-20 bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900">
          <div className="max-w-6xl mx-auto text-center">
            <div className="mb-12">
              <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-crown text-white text-3xl"></i>
              </div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Tired of Ads? Go Premium! ✨
              </h2>
              <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto">
                Remove all advertisements and unlock exclusive premium features for the ultimate AssetShield experience.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-6">
                  <i className="fas fa-ban text-red-400 mr-3"></i>
                  With Ads (Free Version)
                </h3>
                <ul className="space-y-3 text-purple-100">
                  <li className="flex items-center">
                    <i className="fas fa-times text-red-400 mr-3"></i>
                    Advertisements throughout the platform
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-times text-red-400 mr-3"></i>
                    Distracting banner and sidebar ads
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-times text-red-400 mr-3"></i>
                    Limited access to premium features
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-times text-red-400 mr-3"></i>
                    Standard support response time
                  </li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 backdrop-blur-md rounded-xl p-8 border-2 border-yellow-400/50 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                  PREMIUM
                </div>
                <h3 className="text-2xl font-bold text-white mb-6">
                  <i className="fas fa-crown text-yellow-400 mr-3"></i>
                  Ad-Free Premium Experience
                </h3>
                <ul className="space-y-3 text-purple-100">
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    Complete removal of all advertisements
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    Clean, distraction-free interface
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    Exclusive premium features & content
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    Priority customer support
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    Advanced legal document templates
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    Direct attorney consultation access
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-4">Ready to Upgrade?</h3>
              <p className="text-purple-100 mb-6">
                Join thousands of professionals who've upgraded to our ad-free premium experience.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onclick="showAdFreeUpgrade()" 
                  className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold rounded-lg hover:from-yellow-500 hover:to-orange-600 transition-all transform hover:scale-105 shadow-xl"
                >
                  <i className="fas fa-crown mr-2"></i>
                  Remove Ads Now - Starting at $29.99
                </button>
                <button 
                  onclick="document.querySelector('#assessment').scrollIntoView({behavior: 'smooth'})" 
                  className="px-8 py-4 bg-white/20 backdrop-blur-md text-white font-semibold rounded-lg border border-white/30 hover:bg-white/30 transition-all"
                >
                  Continue with Ads
                </button>
              </div>
              
              <div className="mt-6 text-sm text-purple-200">
                <i className="fas fa-lock mr-2"></i>
                Secure payment powered by Stripe • 30-day money-back guarantee
              </div>
            </div>
          </div>
        </section>

        {/* Education Center */}
        <section id="education" className="px-6 py-20 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Asset Protection Education Center
              </h2>
              <p className="text-xl text-gray-600">
                Comprehensive resources to help you make informed decisions
              </p>
            </div>

            <div id="education-content" className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Education content will be loaded dynamically */}
            </div>
          </div>
        </section>

        {/* Law Firm Section */}
        <section id="law-firms" className="px-6 py-20 bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">
                AssetShield App for Law Firms
              </h2>
              <p className="text-xl text-gray-300">
                Transform your practice with our complete lead generation and client management platform
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="bg-gray-800 rounded-xl p-8">
                <h3 className="text-2xl font-bold mb-4">Professional</h3>
                <div className="text-4xl font-bold text-blue-400 mb-6">$5,000</div>
                <p className="text-gray-300 mb-6">One-time setup fee</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    Risk Assessment Tool
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    Lead Capture
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    Basic Analytics
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    Email Integration
                  </li>
                </ul>
                <button 
                  onclick="requestDemo('professional')" 
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Schedule Demo
                </button>
              </div>

              <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-8 transform scale-105">
                <div className="text-center mb-4">
                  <span className="bg-white text-orange-600 px-3 py-1 rounded-full text-sm font-bold">Most Popular</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">Enterprise</h3>
                <div className="text-4xl font-bold mb-6">$10,000</div>
                <p className="text-orange-100 mb-6">One-time setup fee</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <i className="fas fa-check text-white mr-3"></i>
                    All Professional features
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-white mr-3"></i>
                    Calendar Booking
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-white mr-3"></i>
                    PDF Report Generation
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-white mr-3"></i>
                    Email Automation
                  </li>
                </ul>
                <button 
                  onclick="requestDemo('enterprise')" 
                  className="w-full py-3 bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Schedule Demo
                </button>
              </div>

              <div className="bg-gray-800 rounded-xl p-8">
                <h3 className="text-2xl font-bold mb-4">Custom</h3>
                <div className="text-4xl font-bold text-green-400 mb-6">$15,000+</div>
                <p className="text-gray-300 mb-6">Custom development</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    All Enterprise features
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    CRM Integration
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    White-label Licensing
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-400 mr-3"></i>
                    Dedicated Support
                  </li>
                </ul>
                <button 
                  onclick="requestDemo('custom')" 
                  className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  Schedule Demo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-800 text-gray-300 px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                    <i className="fas fa-shield-alt text-white"></i>
                  </div>
                  <span className="text-xl font-bold text-white">AssetShield App</span>
                </div>
                <p className="text-gray-400">
                  Complete asset protection platform for individuals and law firms.
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Services</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white transition-colors">Risk Assessment</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">LLC Formation</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Asset Protection Trusts</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Offshore Protection</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Education</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white transition-colors">Articles</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Guides</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Checklists</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Law Firms</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white transition-colors">Platform Overview</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Schedule Demo</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-700 mt-8 pt-8 text-center">
              <p>&copy; {new Date().getFullYear()} AssetShield App. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
})

// Law Firm Portal
app.get('/portal', (c) => {
  return c.render(
    <div>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-shield-alt text-white"></i>
              </div>
              <span className="text-xl font-bold text-gray-800">AssetShield App</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Law Firm Portal</span>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
            <p className="text-gray-600">Manage your leads, analytics, and client education tools</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Leads</p>
                  <p className="text-3xl font-bold text-blue-600" id="total-leads">0</p>
                </div>
                <i className="fas fa-users text-blue-600 text-2xl"></i>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">This Month</p>
                  <p className="text-3xl font-bold text-green-600" id="monthly-leads">0</p>
                </div>
                <i className="fas fa-chart-line text-green-600 text-2xl"></i>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Conversion Rate</p>
                  <p className="text-3xl font-bold text-orange-600" id="conversion-rate">0%</p>
                </div>
                <i className="fas fa-percentage text-orange-600 text-2xl"></i>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Revenue</p>
                  <p className="text-3xl font-bold text-purple-600" id="revenue">$0</p>
                </div>
                <i className="fas fa-dollar-sign text-purple-600 text-2xl"></i>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Recent Leads</h3>
              </div>
              <div className="p-6">
                <div id="recent-leads">
                  <p className="text-gray-500 text-center py-8">No leads yet</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Analytics</h3>
              </div>
              <div className="p-6">
                <canvas id="analytics-chart" width="400" height="200"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// Login Page
app.get('/login', (c) => {
  return c.render(
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-shield-alt text-white text-2xl"></i>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h1>
              <p className="text-gray-600">Sign in to your AssetShield App account</p>
            </div>
            
            <form id="login-form" className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input type="email" name="email" required className="form-input" placeholder="your@email.com" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" name="password" required className="form-input" placeholder="Enter your password" />
              </div>
              
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all">
                <i className="fas fa-sign-in-alt mr-2"></i>Sign In
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-gray-600">Don't have an account? 
                <a href="/register" className="text-blue-600 hover:underline ml-1">Create one here</a>
              </p>
            </div>
            
            <div className="mt-4 text-center">
              <a href="/" className="text-gray-500 hover:text-gray-700 text-sm">
                <i className="fas fa-arrow-left mr-1"></i>Back to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// Register Page
app.get('/register', (c) => {
  return c.render(
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-shield-alt text-white text-2xl"></i>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Create Account</h1>
              <p className="text-gray-600">Join AssetShield App today</p>
            </div>
            
            <form id="register-form" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input type="text" name="firstName" required className="form-input" placeholder="John" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input type="text" name="lastName" required className="form-input" placeholder="Doe" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input type="email" name="email" required className="form-input" placeholder="your@email.com" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input type="tel" name="phone" className="form-input" placeholder="(555) 123-4567" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" name="password" required className="form-input" placeholder="Create a secure password" />
              </div>
              
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-blue-700 transition-all">
                <i className="fas fa-user-plus mr-2"></i>Create Account
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-gray-600">Already have an account? 
                <a href="/login" className="text-blue-600 hover:underline ml-1">Sign in here</a>
              </p>
            </div>
            
            <div className="mt-4 text-center">
              <a href="/" className="text-gray-500 hover:text-gray-700 text-sm">
                <i className="fas fa-arrow-left mr-1"></i>Back to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// Member Dashboard
app.get('/dashboard', (c) => {
  return c.render(
    <div>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-shield-alt text-white"></i>
              </div>
              <span className="text-xl font-bold text-gray-800">AssetShield App</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600" id="user-name">Loading...</span>
              <button onclick="logout()" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <i className="fas fa-sign-out-alt mr-2"></i>Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Member Dashboard</h1>
            <p className="text-gray-600">Welcome to your AssetShield App member area</p>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Services</p>
                  <p className="text-3xl font-bold text-blue-600" id="active-services">0</p>
                </div>
                <i className="fas fa-shield-alt text-blue-600 text-2xl"></i>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Member Since</p>
                  <p className="text-lg font-semibold text-green-600" id="member-since">Loading...</p>
                </div>
                <i className="fas fa-calendar text-green-600 text-2xl"></i>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Downloads</p>
                  <p className="text-3xl font-bold text-orange-600" id="download-count">0</p>
                </div>
                <i className="fas fa-download text-orange-600 text-2xl"></i>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Support Tickets</p>
                  <p className="text-3xl font-bold text-purple-600">0</p>
                </div>
                <i className="fas fa-headset text-purple-600 text-2xl"></i>
              </div>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Your Services</h3>
              </div>
              <div className="p-6">
                <div id="user-services">
                  <p className="text-gray-500 text-center py-8">Loading your services...</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div id="recent-activity">
                  <p className="text-gray-500 text-center py-8">Loading activity...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// Service Detail Pages
app.get('/service/:type', (c) => {
  const serviceType = c.req.param('type')
  
  return c.render(
    <div>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-shield-alt text-white"></i>
              </div>
              <span className="text-xl font-bold text-gray-800">AssetShield App</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-blue-600 hover:underline">
                <i className="fas fa-arrow-left mr-1"></i>Back to Dashboard
              </a>
              <button onclick="logout()" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <i className="fas fa-sign-out-alt mr-2"></i>Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto p-6">
          <div id="service-content">
            <div className="text-center py-12">
              <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
              <p className="text-gray-600">Loading service details...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default app