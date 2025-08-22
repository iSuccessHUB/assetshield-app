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
// Import new routes
import { demoRoutes } from './routes/demo'
import { dashboardRoutes } from './routes/dashboard'
import { officesRoutes } from './routes/offices'
import { integrationsRoutes } from './routes/integrations'
import { provisioningRoutes } from './routes/provisioning'
import { stripeCheckoutRoutes } from './routes/stripe-checkout'

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

// New feature routes
app.route('/demo', demoRoutes)
app.route('/dashboard', dashboardRoutes) 
app.route('/offices', officesRoutes)
app.route('/integrations', integrationsRoutes)
app.route('/provisioning', provisioningRoutes)
app.route('/stripe-checkout', stripeCheckoutRoutes)

// Automated purchase success routes
app.get('/purchase-success', (c) => c.redirect('/stripe-checkout/purchase-success?' + c.req.url.split('?')[1]))
app.get('/demo-checkout', (c) => c.redirect('/stripe-checkout/demo-checkout?' + c.req.url.split('?')[1]))

// Test route for modal formatting
app.get('/test-modal', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Modal Formatting</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* CSS styling from renderer.tsx */
        .article-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.7;
            color: #374151;
            max-width: none;
        }

        .article-content h1 {
            font-size: 2.5rem;
            font-weight: 800;
            color: #1f2937;
            margin-bottom: 1.5rem;
            line-height: 1.2;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 0.75rem;
        }

        .article-content h2 {
            font-size: 2rem;
            font-weight: 700;
            color: #1f2937;
            margin-top: 2.5rem;
            margin-bottom: 1.25rem;
            line-height: 1.3;
            border-left: 4px solid #3b82f6;
            padding-left: 1rem;
        }

        .article-content h3 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #374151;
            margin-top: 2rem;
            margin-bottom: 1rem;
            line-height: 1.4;
        }

        .article-content p {
            margin-bottom: 1.25rem;
            font-size: 1.125rem;
            line-height: 1.7;
        }

        .article-content ul, .article-content ol {
            margin-bottom: 1.5rem;
            padding-left: 1.5rem;
        }

        .article-content li {
            margin-bottom: 0.75rem;
            font-size: 1.125rem;
            line-height: 1.6;
        }

        .article-content li strong {
            color: #1f2937;
            font-weight: 600;
        }

        /* Modal styles */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .modal-content {
            background: white;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
            padding: 2rem;
            border-radius: 0.5rem;
            position: relative;
        }

        .close-button {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: #ef4444;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.25rem;
            cursor: pointer;
        }
    </style>
</head>
<body class="bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-6">Test Modal Content Formatting</h1>
        
        <button id="testButton" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            Test Modal with Article Content
        </button>

        <div class="mt-4">
            <a href="/" class="text-blue-600 hover:underline">← Back to main app</a>
        </div>

        <div id="testModal" class="modal" style="display: none;">
            <div class="modal-content">
                <button class="close-button" onclick="closeModal()">Close</button>
                <div id="modalContent" class="article-content">
                    <!-- Content will be loaded here -->
                </div>
            </div>
        </div>
    </div>

    <script>
        async function loadArticleContent() {
            try {
                const response = await fetch('/api/education/content/1');
                const data = await response.json();
                
                if (data.content) {
                    document.getElementById('modalContent').innerHTML = data.content.content;
                    document.getElementById('testModal').style.display = 'flex';
                } else {
                    alert('Failed to load article content');
                }
            } catch (error) {
                console.error('Error loading article:', error);
                alert('Error loading article content');
            }
        }

        function closeModal() {
            document.getElementById('testModal').style.display = 'none';
        }

        document.getElementById('testButton').addEventListener('click', loadArticleContent);

        // Close modal when clicking outside
        document.getElementById('testModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    </script>
</body>
</html>`)
})

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
              <a href="#pricing" className="text-white/90 hover:text-white transition-colors" onClick="navigateToSection('pricing')">For Law Firms</a>
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
              <a href="#pricing" className="text-white/90 hover:text-white transition-colors py-2" onClick="navigateToSection('pricing')">For Law Firms</a>
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
            
            <div className="flex justify-center">
              <button 
                onclick="scrollToAssessment()" 
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-xl text-lg"
              >
                <i className="fas fa-chart-line mr-2"></i>
                <span data-translate="hero.start_assessment">Start Risk Assessment</span>
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
                

              `}}></script>
            </div>
          </div>
        </section>



        {/* Premium Upgrade Section */}


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
            
            <script dangerouslySetInnerHTML={{__html: `
              // Initialize education center immediately when this section loads
              document.addEventListener('DOMContentLoaded', function() {
                setTimeout(function() {
                  const educationContainer = document.getElementById('education-content');
                  if (educationContainer && !window.educationLoaded) {
                    window.educationLoaded = true;
                    console.log('Initializing Education Center...');
                    
                    // Load education content immediately
                    fetch('/api/education/featured')
                      .then(response => response.json())
                      .then(data => {
                        if (data && data.featured) {
                          renderEducationContent(data.featured);
                        }
                      })
                      .catch(error => {
                        console.error('Failed to load education content:', error);
                        // Show fallback message
                        educationContainer.innerHTML = '<div class="col-span-full text-center py-8"><p class="text-gray-500">Loading educational content...</p></div>';
                      });
                  }
                }, 1000);
              });
              
              function renderEducationContent(content) {
                const container = document.getElementById('education-content');
                if (!container || !content || content.length === 0) return;
                
                const getIconForType = (type) => {
                  const icons = {
                    article: 'file-alt',
                    guide: 'book',
                    video: 'play-circle',
                    checklist: 'list-check',
                    'case-study': 'briefcase'
                  };
                  return icons[type] || 'file';
                };
                
                const getDifficultyColor = (level) => {
                  const colors = {
                    beginner: 'green',
                    intermediate: 'blue',
                    advanced: 'red'
                  };
                  return colors[level] || 'gray';
                };
                
                container.innerHTML = content.map(item => \`
                  <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                    <div class="flex items-center mb-4">
                      <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <i class="fas fa-\${getIconForType(item.content_type)} text-blue-600 text-xl"></i>
                      </div>
                      <div>
                        <span class="inline-block px-2 py-1 bg-\${getDifficultyColor(item.difficulty_level)}-100 text-\${getDifficultyColor(item.difficulty_level)}-800 text-xs rounded-full mb-1">
                          \${item.difficulty_level || 'Beginner'}
                        </span>
                        <p class="text-sm text-gray-500">By \${item.author}</p>
                      </div>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">\${item.title}</h3>
                    <p class="text-gray-600 mb-4">\${item.description || ''}</p>
                    <div class="flex items-center justify-between mb-4">
                      <span class="text-sm text-gray-500">
                        <i class="fas fa-clock mr-1"></i> \${item.reading_time} min read
                      </span>
                      <span class="text-sm text-gray-500">
                        <i class="fas fa-eye mr-1"></i> \${item.view_count} views
                      </span>
                    </div>
                    <button onclick="viewEducationContent(\${item.id})" class="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                      <i class="fas fa-arrow-right mr-2"></i>
                      \${item.content_type === 'video' ? 'Watch Now' : 'Read Article'}
                    </button>
                  </div>
                \`).join('');
              }
              
              async function viewEducationContent(id) {
                try {
                  // Show loading state
                  const modal = document.getElementById('educationModal');
                  const modalTitle = document.getElementById('modalTitle');
                  const modalContent = document.getElementById('modalContent');
                  const loadingState = document.getElementById('modalLoading');
                  
                  // Reset modal state
                  modalTitle.textContent = 'Loading...';
                  modalContent.style.display = 'none';
                  loadingState.style.display = 'block';
                  modal.style.display = 'flex';
                  document.body.style.overflow = 'hidden';
                  
                  // Fetch the full article content
                  const response = await fetch('/api/education/content/' + id);
                  const data = await response.json();
                  
                  if (data.content) {
                    // Update modal with content
                    modalTitle.textContent = data.content.title;
                    modalContent.innerHTML = data.content.content;
                    
                    // Show content, hide loading
                    loadingState.style.display = 'none';
                    modalContent.style.display = 'block';
                  } else {
                    throw new Error('Content not found');
                  }
                } catch (error) {
                  console.error('Error loading content:', error);
                  const modalContent = document.getElementById('modalContent');
                  const loadingState = document.getElementById('modalLoading');
                  
                  loadingState.style.display = 'none';
                  modalContent.style.display = 'block';
                  modalContent.innerHTML = '<p class="text-red-600">Error loading content. Please try again later.</p>';
                }
              }
              
              function closeEducationModal() {
                const modal = document.getElementById('educationModal');
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
              }
              
              // Navigation function for footer links
              function navigateToSection(sectionId) {
                const targetSection = document.getElementById(sectionId);
                if (targetSection) {
                  targetSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                  
                  // Update URL hash without triggering page reload
                  history.pushState(null, null, '#' + sectionId);
                  
                  // Add a slight delay to ensure smooth scroll completes
                  setTimeout(() => {
                    // Trigger any section-specific initialization if needed
                    if (sectionId === 'education') {
                      // Ensure education content is loaded
                      const educationContainer = document.getElementById('education-content');
                      if (educationContainer && !window.educationLoaded) {
                        window.educationLoaded = true;
                        fetch('/api/education/featured')
                          .then(response => response.json())
                          .then(data => {
                            if (data && data.featured) {
                              renderEducationContent(data.featured);
                            }
                          })
                          .catch(error => console.error('Failed to load education content:', error));
                      }
                    }
                  }, 500);
                } else {
                  console.warn('Section not found:', sectionId);
                }
              }
              
              // Close modal when clicking outside
              document.addEventListener('DOMContentLoaded', function() {
                const modal = document.getElementById('educationModal');
                modal.addEventListener('click', function(e) {
                  if (e.target === modal) {
                    closeEducationModal();
                  }
                });
              });
            `}}></script>
          </div>
        </section>

        {/* Platform Pricing for Law Firms */}
        <section id="pricing" className="px-6 py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                White-Label Platform Pricing
              </h2>
              <p className="text-xl text-gray-600">
                Transform your practice with our complete asset protection platform - fully branded for your law firm
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 mb-16">
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-rocket text-blue-600 text-2xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Starter</h3>
                  <p className="text-gray-600">Perfect for solo practitioners</p>
                </div>
                
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">$5,000</div>
                  <p className="text-gray-500 mb-1">One-time setup fee</p>
                  <div className="text-2xl font-bold text-gray-800">$500<span className="text-lg text-gray-500">/month</span></div>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Complete white-label branding</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Risk assessment tool</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Lead capture & management</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Educational content library</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Basic analytics dashboard</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Up to 100 clients/month</span>
                  </li>
                </ul>

                <button 
                  onClick="purchasePlatform('starter', 5000, 500)"
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-credit-card mr-2"></i>
                  Buy Now - Instant Access
                </button>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 transform scale-105 text-white relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold">Most Popular</span>
                </div>
                
                <div className="text-center mb-6 mt-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-building text-white text-2xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Professional</h3>
                  <p className="text-blue-100">For growing law firms</p>
                </div>
                
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold mb-2">$10,000</div>
                  <p className="text-blue-100 mb-1">One-time setup fee</p>
                  <div className="text-2xl font-bold">$1,200<span className="text-lg text-blue-100">/month</span></div>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <i className="fas fa-check text-white mr-3"></i>
                    <span className="text-white">Everything in Starter</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-white mr-3"></i>
                    <span className="text-white">Advanced customization</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-white mr-3"></i>
                    <span className="text-white">Multiple attorney accounts</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-white mr-3"></i>
                    <span className="text-white">Document automation</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-white mr-3"></i>
                    <span className="text-white">Advanced analytics & reporting</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-white mr-3"></i>
                    <span className="text-white">Up to 500 clients/month</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-white mr-3"></i>
                    <span className="text-white">Priority support</span>
                  </li>
                </ul>

                <button 
                  onClick="purchasePlatform('professional', 10000, 1200)"
                  className="w-full py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <i className="fas fa-credit-card mr-2"></i>
                  Buy Now - Instant Access
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-crown text-purple-600 text-2xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Enterprise</h3>
                  <p className="text-gray-600">For large firms & networks</p>
                </div>
                
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">$25,000</div>
                  <p className="text-gray-500 mb-1">One-time setup fee</p>
                  <div className="text-2xl font-bold text-gray-800">$2,500<span className="text-lg text-gray-500">/month</span></div>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Everything in Professional</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Multi-office deployment</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Custom integrations</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">White-label mobile app</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Unlimited clients</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">Dedicated account manager</span>
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    <span className="text-gray-700">24/7 priority support</span>
                  </li>
                </ul>

                <button 
                  onClick="purchasePlatform('enterprise', 25000, 2500)"
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-credit-card mr-2"></i>
                  Buy Now - Instant Access
                </button>
              </div>
            </div>

            {/* Live Demo Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 mb-16 text-white">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold mb-4">Try a Live Demo with Real Data</h3>
                <p className="text-xl text-blue-100">Experience the platform exactly as your clients will - see how leads are captured, managed, and converted</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h4 className="text-xl font-bold mb-6">What You'll Experience:</h4>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-4">
                        <i className="fas fa-user-plus text-white text-sm"></i>
                      </div>
                      <span>Real client data and lead generation</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-4">
                        <i className="fas fa-chart-line text-white text-sm"></i>
                      </div>
                      <span>Live analytics dashboard with actual metrics</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-4">
                        <i className="fas fa-file-alt text-white text-sm"></i>
                      </div>
                      <span>Document generation and automation</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-4">
                        <i className="fas fa-mobile-alt text-white text-sm"></i>
                      </div>
                      <span>Full mobile experience (Enterprise)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-4">
                        <i className="fas fa-building text-white text-sm"></i>
                      </div>
                      <span>Multi-office management (Enterprise)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-lg p-6 border border-white/20">
                  <form id="demoRequestForm" className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">Your Name</label>
                      <input type="text" name="lawyerName" required className="w-full p-3 border border-white/30 rounded-lg bg-white/20 placeholder-white/80 text-white focus:bg-white/30 focus:ring-2 focus:ring-white/50 focus:border-transparent" placeholder="Enter your full name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">Email Address</label>
                      <input type="email" name="lawyerEmail" required className="w-full p-3 border border-white/30 rounded-lg bg-white/20 placeholder-white/80 text-white focus:bg-white/30 focus:ring-2 focus:ring-white/50 focus:border-transparent" placeholder="your@lawfirm.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">Phone Number</label>
                      <input type="tel" name="lawyerPhone" className="w-full p-3 border border-white/30 rounded-lg bg-white/20 placeholder-white/80 text-white focus:bg-white/30 focus:ring-2 focus:ring-white/50 focus:border-transparent" placeholder="(555) 123-4567" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">Law Firm Name</label>
                      <input type="text" name="firmName" required className="w-full p-3 border border-white/30 rounded-lg bg-white/20 placeholder-white/80 text-white focus:bg-white/30 focus:ring-2 focus:ring-white/50 focus:border-transparent" placeholder="Your Law Firm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">Interested Tier</label>
                      <select name="interestedTier" className="w-full p-3 border border-white/30 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                        <option value="starter" className="bg-white text-gray-800 py-2">Starter ($5K + $500/month)</option>
                        <option value="professional" selected className="bg-white text-gray-800 py-2">Professional ($10K + $1,200/month)</option>
                        <option value="enterprise" className="bg-white text-gray-800 py-2">Enterprise ($25K + $2,500/month)</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                      <i className="fas fa-play mr-2"></i>Start Live Demo (Free 14 Days)
                    </button>
                  </form>
                  
                  <div className="mt-4 text-center text-sm text-white/80">
                    <i className="fas fa-shield-alt mr-1"></i>
                    No credit card required • Full access • Real data experience
                  </div>
                </div>
              </div>
            </div>

            {/* ROI Calculator Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-16">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-800 mb-4">Calculate Your ROI</h3>
                <p className="text-xl text-gray-600">See how quickly the platform pays for itself</p>
              </div>

              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h4 className="text-xl font-bold text-gray-800 mb-6">Typical Law Firm Results:</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="font-semibold text-gray-700">Average client fee:</span>
                      <span className="text-2xl font-bold text-blue-600">$7,500</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="font-semibold text-gray-700">New clients per month:</span>
                      <span className="text-2xl font-bold text-blue-600">15-25</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <span className="font-semibold text-gray-700">Monthly revenue increase:</span>
                      <span className="text-2xl font-bold text-green-600">$112K - $187K</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <span className="font-semibold text-gray-700">ROI Timeline:</span>
                      <span className="text-2xl font-bold text-blue-600">2-4 weeks</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl p-8 text-white">
                  <h4 className="text-2xl font-bold mb-6">Why Law Firms Choose Us:</h4>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <i className="fas fa-chart-line text-green-200 mr-3 mt-1"></i>
                      <span>300% average increase in qualified leads</span>
                    </li>
                    <li className="flex items-start">
                      <i className="fas fa-clock text-green-200 mr-3 mt-1"></i>
                      <span>75% reduction in client intake time</span>
                    </li>
                    <li className="flex items-start">
                      <i className="fas fa-dollar-sign text-green-200 mr-3 mt-1"></i>
                      <span>Average fee increase of 40%</span>
                    </li>
                    <li className="flex items-start">
                      <i className="fas fa-users text-green-200 mr-3 mt-1"></i>
                      <span>95% client satisfaction rate</span>
                    </li>
                    <li className="flex items-start">
                      <i className="fas fa-shield-alt text-green-200 mr-3 mt-1"></i>
                      <span>Your brand, your clients, your success</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Ready to Transform Your Practice?</h3>
              <p className="text-xl text-gray-600 mb-8">
                Try our live demo instantly and see how our platform can work for your firm
              </p>
              <button 
                onClick="startLiveDemo()"
                className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <i className="fas fa-play mr-2"></i>
                Try the Demo
              </button>
            </div>
          </div>
        </section>

        {/* Live Demo Section */}
        <section id="consultation" className="px-6 py-20 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Try Our Live Demo Platform
              </h2>
              <p className="text-xl text-gray-600">
                Experience our white-label platform instantly with real data and full functionality
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Your Live Demo Includes:</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <i className="fas fa-desktop text-blue-600 text-xl"></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Full Platform Access</h4>
                      <p className="text-gray-600">Experience the complete platform with real client data, forms, and workflows immediately.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <i className="fas fa-users text-blue-600 text-xl"></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Sample Client Portfolio</h4>
                      <p className="text-gray-600">Test the system with realistic client scenarios and asset protection cases.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <i className="fas fa-chart-line text-blue-600 text-xl"></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Live Analytics Dashboard</h4>
                      <p className="text-gray-600">See real-time metrics, conversion tracking, and revenue analytics in action.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-6">
                  <div className="flex items-center mb-4">
                    <i className="fas fa-rocket text-green-600 text-2xl mr-3"></i>
                    <h4 className="text-lg font-semibold text-gray-800">Instant Access - No Waiting</h4>
                  </div>
                  <p className="text-gray-600">Start exploring immediately with our 14-day free trial. Experience the full platform with no setup delays.</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Start Your Free Trial</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attorney Name</label>
                    <input type="text" id="demo-attorney-name" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter your full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Law Firm Name</label>
                    <input type="text" id="demo-firm-name" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter your firm name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Professional Email</label>
                    <input type="email" id="demo-email" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter your professional email" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State Bar Number (Optional)</label>
                    <input type="text" id="demo-bar-number" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter your state bar number" />
                  </div>
                  <button 
                    onClick="startLiveDemo()"
                    className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <i className="fas fa-play mr-2"></i>
                    Try the Demo - Free 14 Days
                  </button>
                </div>
                
                <div className="mt-6 text-center text-sm text-gray-500">
                  <i className="fas fa-shield-alt mr-1"></i>
                  No credit card required • Instant access • Full platform features
                </div>
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
                <h4 className="text-white font-semibold mb-4">Platform Features</h4>
                <ul className="space-y-2">
                  <li><a href="#assessment" className="hover:text-white transition-colors cursor-pointer" onClick="navigateToSection('assessment')">Risk Assessment</a></li>
                  <li><a href="#strategies" className="hover:text-white transition-colors cursor-pointer" onClick="navigateToSection('strategies')">Protection Strategies</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors cursor-pointer" onClick="navigateToSection('pricing')">White-Label Licensing</a></li>
                  <li><a href="#education" className="hover:text-white transition-colors cursor-pointer" onClick="navigateToSection('education')">Client Education Tools</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Education</h4>
                <ul className="space-y-2">
                  <li><a href="#education" className="hover:text-white transition-colors cursor-pointer" onClick="navigateToSection('education')">Articles</a></li>
                  <li><a href="#education" className="hover:text-white transition-colors cursor-pointer" onClick="navigateToSection('education')">Guides</a></li>
                  <li><a href="#education" className="hover:text-white transition-colors cursor-pointer" onClick="navigateToSection('education')">Case Studies</a></li>
                  <li><a href="#education" className="hover:text-white transition-colors cursor-pointer" onClick="navigateToSection('education')">Checklists</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Law Firms</h4>
                <ul className="space-y-2">
                  <li><a href="/portal" className="hover:text-white transition-colors cursor-pointer">Platform Overview</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors cursor-pointer" onClick="navigateToSection('pricing')">Pricing</a></li>
                  <li><a href="#consultation" className="hover:text-white transition-colors cursor-pointer" onClick="navigateToSection('consultation')">Schedule Demo</a></li>
                  <li><a href="mailto:support@isuccesshub.com" className="hover:text-white transition-colors cursor-pointer">Support</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-700 mt-8 pt-8 text-center">
              <p>&copy; 2025 The iSuccessHUB Group, LLC. All Rights Reserved</p>
            </div>
          </div>
        </footer>
        
        {/* Global Navigation Script */}
        <script dangerouslySetInnerHTML={{__html: `
          // Global navigation function for footer and header links
          window.navigateToSection = function(sectionId) {
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
              targetSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
              });
              
              // Update URL hash without triggering page reload
              history.pushState(null, null, '#' + sectionId);
              
              // Add a slight delay to ensure smooth scroll completes
              setTimeout(() => {
                // Trigger any section-specific initialization if needed
                if (sectionId === 'education') {
                  // Ensure education content is loaded
                  const educationContainer = document.getElementById('education-content');
                  if (educationContainer && !window.educationLoaded) {
                    window.educationLoaded = true;
                    fetch('/api/education/featured')
                      .then(response => response.json())
                      .then(data => {
                        if (data && data.featured) {
                          renderEducationContent(data.featured);
                        }
                      })
                      .catch(error => console.error('Failed to load education content:', error));
                  }
                }
              }, 500);
            } else {
              console.warn('Section not found:', sectionId);
            }
          };
          
          // Handle live demo form submission
          document.getElementById('demoRequestForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const demoData = Object.fromEntries(formData);
            
            // Show loading state
            const button = e.target.querySelector('button[type="submit"]');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Setting Up Your Demo...';
            button.disabled = true;
            
            try {
              const response = await fetch('/demo/start', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(demoData)
              });
              
              const result = await response.json();
              
              if (result.success) {
                // Success - redirect to demo dashboard
                alert(
                  \`🎉 Your live demo is ready!\\n\\n\` +
                  \`Demo ID: \${result.demoId}\\n\` +
                  \`Expires: \${new Date(result.expiresAt).toLocaleDateString()}\\n\\n\` +
                  \`You'll now see the platform with real data to explore all features.\\n\` +
                  \`This includes lead management, analytics, and document generation.\`
                );
                
                // Redirect to demo dashboard
                window.location.href = result.loginUrl;
              } else {
                throw new Error(result.error || 'Failed to create demo');
              }
              
            } catch (error) {
              console.error('Demo creation error:', error);
              alert(
                \`Sorry, there was an error setting up your demo.\\n\\n\` +
                \`Please try again or contact support at demo@assetshield.app\\n\\n\` +
                \`Error: \${error.message}\`
              );
              
              // Reset button
              button.innerHTML = originalText;
              button.disabled = false;
            }
          });
          
          // Handle platform purchases with Stripe checkout
          window.purchasePlatform = async function(tier, setupFee, monthlyFee) {
            // Show purchase confirmation modal
            const confirmPurchase = confirm(
              \`Purchase AssetShield \${tier.charAt(0).toUpperCase() + tier.slice(1)} Platform?\\n\\n\` +
              \`💰 Setup Fee: $\${setupFee.toLocaleString()}\\n\` +
              \`📅 Monthly: $\${monthlyFee.toLocaleString()}/month\\n\\n\` +
              \`✅ Instant platform activation\\n\` +
              \`✅ Full white-label branding\\n\` +
              \`✅ 24/7 automated delivery\\n\` +
              \`✅ No human interaction required\\n\\n\` +
              \`Click OK to proceed to secure checkout.\`
            );
            
            if (!confirmPurchase) return;
            
            // Get firm information from user
            const firmName = prompt('Enter your law firm name:');
            if (!firmName) return;
            
            const lawyerName = prompt('Enter your full name:');
            if (!lawyerName) return;
            
            const lawyerEmail = prompt('Enter your email address:');
            if (!lawyerEmail || !lawyerEmail.includes('@')) {
              alert('Please enter a valid email address.');
              return;
            }
            
            const lawyerPhone = prompt('Enter your phone number (optional):') || '';
            
            try {
              // Create Stripe checkout session
              const response = await fetch(\`/stripe-checkout/create-checkout/\${tier}\`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  lawyerName,
                  lawyerEmail,
                  lawyerPhone,
                  firmName,
                  setupFee,
                  monthlyFee
                })
              });
              
              const result = await response.json();
              
              if (result.success) {
                // Redirect to Stripe checkout
                window.location.href = result.checkoutUrl;
              } else {
                throw new Error(result.error || 'Failed to create checkout session');
              }
              
            } catch (error) {
              console.error('Purchase error:', error);
              alert(
                \`Sorry, there was an error processing your purchase.\\n\\n\` +
                \`Please try again or contact support at sales@assetshield.com\\n\\n\` +
                \`Error: \${error.message}\`
              );
            }
          };

          // Handle demo requests for different platform tiers (legacy)
          window.requestDemo = function(planType) {
            const planNames = {
              'starter': 'Starter Platform ($5,000 setup + $500/month)',
              'professional': 'Professional Platform ($10,000 setup + $1,200/month)',
              'enterprise': 'Enterprise Platform ($25,000 setup + $2,500/month)'
            };
            
            const planName = planNames[planType] || planType;
            
            // Show confirmation modal with plan details
            const confirmed = confirm(
              \`Request a demo of the \${planName}?\\n\\n\` +
              \`Click OK to schedule your personalized demo where we'll:\\n\` +
              \`• Show the complete platform with your firm's branding\\n\` +
              \`• Calculate ROI specific to your practice\\n\` +
              \`• Provide implementation timeline and support\\n\\n\` +
              \`This demo is completely free with no obligation.\`
            );
            
            if (confirmed) {
              // Navigate to demo section with plan pre-selected
              window.selectedPlatformTier = { type: planType, name: planName };
              navigateToSection('consultation');
              
              // Pre-fill demo form if elements exist
              setTimeout(() => {
                const descriptionField = document.querySelector('textarea[placeholder*=\"practice size\"]');
                if (descriptionField && window.selectedPlatformTier) {
                  descriptionField.value = \`I'm interested in the \${window.selectedPlatformTier.name}. I'd like to see how this would work for my law firm and understand the implementation process.\`;
                  descriptionField.focus();
                }
              }, 1000);
            }
          };
          
          // Handle demo request form submission
          window.submitDemoRequest = function() {
            const form = {
              name: document.querySelector('input[placeholder*="full name"]')?.value || '',
              firmName: document.querySelector('input[placeholder*="firm name"]')?.value || '',
              email: document.querySelector('input[placeholder*="email"]')?.value || '',
              phone: document.querySelector('input[placeholder*="phone"]')?.value || '',
              description: document.querySelector('textarea[placeholder*="practice size"]')?.value || ''
            };
            
            // Basic validation
            if (!form.name || !form.email || !form.firmName) {
              alert('Please fill in your name, firm name, and email address to continue.');
              return;
            }
            
            // Email validation
            const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
            if (!emailRegex.test(form.email)) {
              alert('Please enter a valid email address.');
              return;
            }
            
            // Prepare demo request data
            const demoData = {
              ...form,
              selectedPlatformTier: window.selectedPlatformTier || null,
              timestamp: new Date().toISOString(),
              source: 'platform_pricing_page'
            };
            
            // Show loading state
            const button = document.querySelector('button[onclick="submitDemoRequest()"]');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Scheduling...';
            button.disabled = true;
            
            // Simulate API call (replace with actual API endpoint)
            setTimeout(() => {
              // Success message
              alert(
                \`Thank you, \${form.name}! Your demo request has been received.\\n\\n\` +
                \`We'll contact you within 24 hours at \${form.email} to schedule your personalized platform demo.\\n\\n\` +
                \`During your 30-minute demo, we'll:\\n\` +
                \`• Show the complete platform with \${form.firmName}'s branding\\n\` +
                \`• Calculate specific ROI projections for your practice\\n\` +
                \`• Provide implementation timeline and next steps\` +
                (window.selectedPlatformTier ? \`\\n• Focus on the \${window.selectedPlatformTier.name} features\` : '')
              );
              
              // Reset form
              document.querySelector('input[placeholder*="full name"]').value = '';
              document.querySelector('input[placeholder*="firm name"]').value = '';
              document.querySelector('input[placeholder*="email"]').value = '';
              document.querySelector('input[placeholder*="phone"]').value = '';
              document.querySelector('textarea[placeholder*="practice size"]').value = '';
              
              // Reset button
              button.innerHTML = originalText;
              button.disabled = false;
              
              // Clear selected platform tier
              window.selectedPlatformTier = null;
              
            }, 2000); // Simulate network delay
          };
          
          // Handle live demo launch
          window.startLiveDemo = function() {
            // Collect demo form data
            const demoForm = {
              attorneyName: document.getElementById('demo-attorney-name')?.value || '',
              firmName: document.getElementById('demo-firm-name')?.value || '',
              email: document.getElementById('demo-email')?.value || '',
              barNumber: document.getElementById('demo-bar-number')?.value || ''
            };
            
            // Basic validation for required fields
            if (!demoForm.attorneyName || !demoForm.email || !demoForm.firmName) {
              alert('Please fill in your name, firm name, and email address to start the demo.');
              return;
            }
            
            // Email validation
            const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
            if (!emailRegex.test(demoForm.email)) {
              alert('Please enter a valid email address.');
              return;
            }
            
            // Show loading state
            const buttons = document.querySelectorAll('button[onclick="startLiveDemo()"]');
            buttons.forEach(button => {
              button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Launching Demo...';
              button.disabled = true;
            });
            
            // Prepare demo session data
            const demoSessionId = 'demo_' + Date.now() + '_' + Math.random().toString(36).substring(7);
            const demoData = {
              sessionId: demoSessionId,
              ...demoForm,
              timestamp: new Date().toISOString(),
              demoType: 'live_platform_trial',
              trialDuration: 14 // 14-day free trial
            };
            
            // Store demo session data for the demo environment
            localStorage.setItem('assetshield_demo_session', JSON.stringify(demoData));
            
            // Submit demo request to backend
            fetch('/demo/start', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                lawyerName: demoForm.attorneyName,
                lawyerEmail: demoForm.email,
                firmName: demoForm.firmName,
                practiceAreas: ['Asset Protection'],
                interestedTier: 'professional'
              })
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                // Show success message
                alert(
                  \`Welcome to AssetShield Pro, \${demoForm.attorneyName}!\\n\\n\` +
                  \`Your 14-day free trial is now active for \${demoForm.firmName}.\\n\\n\` +
                  \`You'll be redirected to your demo platform with:\\n\` +
                  \`• Sample client data and workflows\\n\` +
                  \`• Full platform functionality\\n\` +
                  \`• Live analytics dashboard\\n\` +
                  \`• Complete asset protection tools\\n\\n\` +
                  \`Demo ID: \${data.demoId}\\n\` +
                  \`Trial expires: \${new Date(data.expiresAt).toLocaleDateString()}\\n\\n\` +
                  \`A confirmation email has been sent to \${demoForm.email}\`
                );
                
                // Redirect to demo dashboard
                window.open(data.loginUrl, '_blank');
              } else {
                throw new Error(data.error || 'Failed to start demo');
              }
            })
            .catch(error => {
              console.error('Demo start error:', error);
              alert(
                \`Demo setup failed: \${error.message}\\n\\n\` +
                \`As a fallback, you can explore the platform features below or contact our team directly.\\n\\n\` +
                \`We apologize for the inconvenience and will resolve this issue quickly.\`
              );
            })
            .finally(() => {
              
              // Reset form after slight delay
              setTimeout(() => {
                document.getElementById('demo-attorney-name').value = '';
                document.getElementById('demo-firm-name').value = '';
                document.getElementById('demo-email').value = '';
                document.getElementById('demo-bar-number').value = '';
                
                // Reset buttons
                buttons.forEach(button => {
                  button.innerHTML = '<i class="fas fa-play mr-2"></i>Try the Demo - Free 14 Days';
                  button.disabled = false;
                });
              }, 1000);
              
            }, 2500); // Simulate platform setup time
          };
          
          // Handle initial page load with hash
          document.addEventListener('DOMContentLoaded', function() {
            if (window.location.hash) {
              const sectionId = window.location.hash.substring(1);
              setTimeout(() => {
                window.navigateToSection(sectionId);
              }, 1000); // Delay to ensure page is fully loaded
            }
          });
        `}}></script>

        {/* Education Content Modal */}
        <div id="educationModal" className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" style={{display: 'none'}}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 id="modalTitle" className="text-2xl font-bold text-gray-800">Article Title</h2>
              <button onClick="closeEducationModal()" className="text-gray-500 hover:text-gray-700 text-2xl">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div id="modalLoading" className="text-center py-12">
                <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                <p className="text-gray-600">Loading article...</p>
              </div>
              
              <div id="modalContent" className="article-content" style={{display: 'none'}}>
                {/* Article content will be loaded here */}
              </div>
            </div>
            
            <div className="border-t border-gray-200 p-6">
              <button onClick="closeEducationModal()" className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                <i className="fas fa-times mr-2"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// Portal routes are now handled by the dashboard module

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