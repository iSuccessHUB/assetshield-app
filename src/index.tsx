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
import { stripeWebhookRoutes } from './routes/stripe-webhooks'
import { platformApiRoutes } from './routes/platform-api'
import { enhancedDemoRoutes } from './routes/enhanced-demo'
import { serviceBundleRoutes } from './routes/service-bundles'
import { salesAnalyticsRoutes } from './routes/sales-analytics'
import { securityRoutes } from './routes/security'
import { domainMapping, generateWhiteLabelCSS, generateWhiteLabelManifest } from './middleware/domain-mapping'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Apply security middlewares globally
app.use('*', securityHeaders())
app.use('*', auditLogger())
app.use('*', requestSizeLimit())

// Apply domain mapping middleware for white-label support
app.use('*', domainMapping())

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

// Serve PWA files from root with white-label support
app.get('/manifest.json', async (c) => {
  const whiteLabelConfig = c.get('whiteLabelConfig');
  const manifest = generateWhiteLabelManifest(whiteLabelConfig);
  
  // Add shortcuts for risk assessment
  manifest.shortcuts = [
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
  ];
  
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
import { enhancedDemoRoutes } from './routes/enhanced-demo'
import { serviceBundleRoutes } from './routes/service-bundles'
import { salesAnalyticsRoutes } from './routes/sales-analytics'
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
app.route('/api/enhanced-demo', enhancedDemoRoutes)
app.route('/api/service-bundles', serviceBundleRoutes)
app.route('/api/sales-analytics', salesAnalyticsRoutes)

// Security monitoring routes
app.route('/api/security', securityRoutes)
app.route('/dashboard', dashboardRoutes) 
app.route('/offices', officesRoutes)
app.route('/integrations', integrationsRoutes)
app.route('/provisioning', provisioningRoutes)
app.route('/stripe-checkout', stripeCheckoutRoutes)
app.route('/stripe-webhooks', stripeWebhookRoutes)
app.route('/api/platform', platformApiRoutes)

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
        /* Professional Payment Modal Styles */
        #payment-modal {
            animation: modalFadeIn 0.3s ease-out;
        }
        
        #payment-modal > div {
            animation: modalSlideIn 0.3s ease-out;
            transform-origin: center;
        }
        
        @keyframes modalFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes modalSlideIn {
            from { 
                opacity: 0; 
                transform: scale(0.9) translateY(-20px); 
            }
            to { 
                opacity: 1; 
                transform: scale(1) translateY(0); 
            }
        }
        
        .form-input-focused {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .payment-button-loading {
            background: linear-gradient(90deg, #3b82f6, #6366f1, #3b82f6);
            background-size: 200% 100%;
            animation: shimmer 1.5s ease-in-out infinite;
        }
        
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }

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

// Main landing page with white-label support
app.get('/', (c) => {
  const whiteLabelConfig = c.get('whiteLabelConfig');
  const isWhiteLabel = whiteLabelConfig !== null;
  
  // Generate white-label CSS if needed
  const customCSS = isWhiteLabel ? generateWhiteLabelCSS(whiteLabelConfig) : '';
  
  return c.render(
    <div>
      {/* White-label CSS injection */}
      {isWhiteLabel && (
        <style dangerouslySetInnerHTML={{__html: customCSS}} />
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
        {/* Header */}
        <nav className="px-4 sm:px-6 py-4 bg-white/10 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isWhiteLabel && whiteLabelConfig?.logoUrl ? (
                <img src={whiteLabelConfig.logoUrl} alt={whiteLabelConfig.firmName} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain" />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-shield-alt text-white text-lg sm:text-xl"></i>
                </div>
              )}
              <h1 className="text-lg sm:text-2xl font-bold text-white">
                {isWhiteLabel ? whiteLabelConfig?.firmName : 'AssetShield App'}
              </h1>
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
              <button onclick="showLoginModal()" className="w-full py-3 bg-white/10 backdrop-blur-md text-white font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-all">
                <i className="fas fa-user mr-2"></i>Login
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="px-4 sm:px-6 py-12 sm:py-20">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              {isWhiteLabel ? whiteLabelConfig?.heroTitle : 'Complete Asset Protection Platform'}
            </h1>
            <p className="text-lg sm:text-xl text-blue-100 mb-8 sm:mb-12 max-w-3xl mx-auto">
              {isWhiteLabel ? whiteLabelConfig?.heroSubtitle : 'Discover your asset protection risk level, explore tailored strategies, and access comprehensive educational resources to safeguard your wealth.'}
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 mb-8 sm:mb-12 text-blue-200">
              <div className="flex items-center">
                <i className="fas fa-shield-alt mr-2"></i>
                <span className="text-sm sm:text-base">
                  {isWhiteLabel ? 'Professional Protection' : 'Bank-Level Security'}
                </span>
              </div>
              <div className="flex items-center">
                <i className="fas fa-users mr-2"></i>
                <span className="text-sm sm:text-base">
                  {isWhiteLabel ? 'Experienced Legal Team' : '10,000+ Clients Protected'}
                </span>
              </div>
              <div className="flex items-center">
                <i className="fas fa-globe mr-2"></i>
                <span className="text-sm sm:text-base">
                  {isWhiteLabel ? 'Comprehensive Coverage' : 'Global Coverage'}
                </span>
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

        {/* Risk Assessment Section - Professional Multi-Step Form */}
        <section id="assessment" className="px-6 py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-800 mb-4" data-translate="assessment.title">
                Asset Protection Risk Assessment
              </h2>
              <p className="text-xl text-gray-600" data-translate="assessment.subtitle">
                Evaluate your current protection level in just 5 minutes
              </p>
              <div className="mt-6 flex justify-center space-x-8 text-sm text-gray-500">
                <div className="flex items-center">
                  <i className="fas fa-shield-alt text-blue-600 mr-2"></i>
                  <span>100% Confidential</span>
                </div>
                <div className="flex items-center">
                  <i className="fas fa-clock text-blue-600 mr-2"></i>
                  <span>5 Minutes</span>
                </div>
                <div className="flex items-center">
                  <i className="fas fa-chart-line text-blue-600 mr-2"></i>
                  <span>Instant Results</span>
                </div>
              </div>
            </div>

            <div id="assessment-container" className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Professional Progress Bar */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <h3 className="text-lg font-semibold">Risk Assessment Progress</h3>
                    <p className="text-blue-100 text-sm">Complete all steps for your personalized report</p>
                  </div>
                  <div className="text-right text-white">
                    <div className="text-2xl font-bold">
                      <span id="current-step">1</span><span className="text-blue-200">/4</span>
                    </div>
                    <div className="text-xs text-blue-200">Steps Complete</div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4 bg-blue-500/30 rounded-full h-2">
                  <div id="progress-bar" className="bg-white rounded-full h-2 transition-all duration-500 ease-out" style="width: 25%"></div>
                </div>
              </div>

              {/* Dynamic Step Indicator */}
              <div className="px-8 py-6 bg-gray-50 border-b">
                <div id="step-indicator" className="flex justify-between">
                  <div className="flex items-center step-item active" data-step="1">
                    <div className="step-circle w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mr-3">
                      <i className="fas fa-user"></i>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Basic Information</div>
                      <div className="text-xs text-gray-500">Your profession & background</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center step-item" data-step="2">
                    <div className="step-circle w-10 h-10 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center font-semibold mr-3">
                      <i className="fas fa-dollar-sign"></i>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-500">Assets & Wealth</div>
                      <div className="text-xs text-gray-400">Net worth & holdings</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center step-item" data-step="3">
                    <div className="step-circle w-10 h-10 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center font-semibold mr-3">
                      <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-500">Risk Factors</div>
                      <div className="text-xs text-gray-400">Current threats & exposure</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center step-item" data-step="4">
                    <div className="step-circle w-10 h-10 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center font-semibold mr-3">
                      <i className="fas fa-chart-line"></i>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-500">Results</div>
                      <div className="text-xs text-gray-400">Your risk analysis</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Form Content */}
              <div id="assessment-form" className="p-8">
                {/* Content will be loaded dynamically */}
              </div>
            </div>
            
            {/* Professional Multi-Step Assessment System */}
            <script dangerouslySetInnerHTML={{__html: `
                // Professional Risk Assessment System - Multi-Step Dynamic Form
                class RiskAssessment {
                  constructor() {
                    this.currentStep = 1;
                    this.totalSteps = 4;
                    this.assessmentData = {};
                    this.init();
                  }
                  
                  init() {
                    console.log('🎯 Initializing Professional Risk Assessment System');
                    this.showStep(1);
                    this.updateProgress();
                  }
                  
                  updateProgress() {
                    const progress = (this.currentStep / this.totalSteps) * 100;
                    const progressBar = document.getElementById('progress-bar');
                    const currentStepEl = document.getElementById('current-step');
                    
                    if (progressBar) {
                      progressBar.style.width = progress + '%';
                    }
                    
                    if (currentStepEl) {
                      currentStepEl.textContent = this.currentStep;
                    }
                    
                    // Update step indicators
                    document.querySelectorAll('.step-item').forEach((item, index) => {
                      const stepNum = index + 1;
                      const circle = item.querySelector('.step-circle');
                      const texts = item.querySelectorAll('div');
                      
                      if (stepNum <= this.currentStep) {
                        item.classList.add('active');
                        circle.classList.remove('bg-gray-300', 'text-gray-500');
                        circle.classList.add('bg-blue-600', 'text-white');
                        texts.forEach(text => {
                          text.classList.remove('text-gray-500', 'text-gray-400');
                          text.classList.add('text-gray-800');
                        });
                      } else {
                        item.classList.remove('active');
                        circle.classList.remove('bg-blue-600', 'text-white');
                        circle.classList.add('bg-gray-300', 'text-gray-500');
                      }
                    });
                  }
                  
                  showStep(step) {
                    console.log('📍 Risk Assessment showStep called:', step);
                    this.currentStep = step;
                    const container = document.getElementById('assessment-form');
                    
                    if (!container) {
                      console.log('❌ Assessment form container not found');
                      return;
                    }
                    
                    console.log('✅ Container found, rendering step', step);
                    
                    let content = '';
                    
                    switch(step) {
                      case 1:
                        content = this.getStep1Content();
                        break;
                      case 2:
                        content = this.getStep2Content();
                        break;
                      case 3:
                        content = this.getStep3Content();
                        break;
                      case 4:
                        content = this.getStep4Content();
                        break;
                    }
                    
                    // Animate content change
                    container.style.opacity = '0';
                    container.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                      container.innerHTML = content;
                      container.style.opacity = '1';
                      container.style.transform = 'translateY(0)';
                      this.updateProgress();
                      
                      // Add event listeners for new content
                      this.attachEventListeners();
                    }, 200);
                  }
                  
                  getStep1Content() {
                    return \`
                      <div class="assessment-step">
                        <div class="text-center mb-8">
                          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-user text-blue-600 text-2xl"></i>
                          </div>
                          <h3 class="text-2xl font-bold text-gray-800 mb-2">Tell Us About Yourself</h3>
                          <p class="text-gray-600">Help us understand your professional background</p>
                        </div>
                        
                        <div class="max-w-2xl mx-auto space-y-6">
                          <!-- Contact Information -->
                          <div class="grid md:grid-cols-2 gap-4 mb-6">
                            <div>
                              <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="fas fa-user mr-2 text-blue-600"></i>Your Name
                              </label>
                              <input type="text" name="name" id="assessment-name" placeholder="John Doe" 
                                     class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors" required>
                            </div>
                            <div>
                              <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="fas fa-envelope mr-2 text-blue-600"></i>Email Address
                              </label>
                              <input type="email" name="email" id="assessment-email" placeholder="john@example.com" 
                                     class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors" required>
                            </div>
                          </div>
                          
                          <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-3">
                              <i class="fas fa-briefcase mr-2 text-blue-600"></i>What is your profession?
                            </label>
                            <div class="grid md:grid-cols-2 gap-3">
                              <label class="profession-option flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                                <input type="radio" name="profession" value="doctor" class="w-5 h-5 text-blue-600 mr-3">
                                <div>
                                  <div class="font-semibold text-gray-800">Doctor/Medical</div>
                                  <div class="text-sm text-gray-500">Healthcare professional</div>
                                </div>
                              </label>
                              <label class="profession-option flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                                <input type="radio" name="profession" value="lawyer" class="w-5 h-5 text-blue-600 mr-3">
                                <div>
                                  <div class="font-semibold text-gray-800">Lawyer/Attorney</div>
                                  <div class="text-sm text-gray-500">Legal professional</div>
                                </div>
                              </label>
                              <label class="profession-option flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                                <input type="radio" name="profession" value="business_owner" class="w-5 h-5 text-blue-600 mr-3">
                                <div>
                                  <div class="font-semibold text-gray-800">Business Owner</div>
                                  <div class="text-sm text-gray-500">Entrepreneur/Executive</div>
                                </div>
                              </label>
                              <label class="profession-option flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                                <input type="radio" name="profession" value="real_estate" class="w-5 h-5 text-blue-600 mr-3">
                                <div>
                                  <div class="font-semibold text-gray-800">Real Estate</div>
                                  <div class="text-sm text-gray-500">Property professional</div>
                                </div>
                              </label>
                              <label class="profession-option flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                                <input type="radio" name="profession" value="executive" class="w-5 h-5 text-blue-600 mr-3">
                                <div>
                                  <div class="font-semibold text-gray-800">Corporate Executive</div>
                                  <div class="text-sm text-gray-500">C-level/Management</div>
                                </div>
                              </label>
                              <label class="profession-option flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                                <input type="radio" name="profession" value="other" class="w-5 h-5 text-blue-600 mr-3">
                                <div>
                                  <div class="font-semibold text-gray-800">Other</div>
                                  <div class="text-sm text-gray-500">Different profession</div>
                                </div>
                              </label>
                            </div>
                          </div>
                          
                          <div class="flex justify-center pt-6">
                            <button id="step1-next" class="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                              <span>Continue to Assets</span>
                              <i class="fas fa-arrow-right ml-2"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    \`;
                  }
                  
                  getStep2Content() {
                    return \`
                      <div class="assessment-step">
                        <div class="text-center mb-8">
                          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-dollar-sign text-green-600 text-2xl"></i>
                          </div>
                          <h3 class="text-2xl font-bold text-gray-800 mb-2">Your Assets & Wealth</h3>
                          <p class="text-gray-600">Help us understand your financial position</p>
                        </div>
                        
                        <div class="max-w-2xl mx-auto space-y-6">
                          <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-3">
                              <i class="fas fa-chart-line mr-2 text-green-600"></i>What is your approximate net worth?
                            </label>
                            <div class="space-y-3">
                              <label class="networth-option flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 cursor-pointer transition-all">
                                <div class="flex items-center">
                                  <input type="radio" name="netWorth" value="under_500k" class="w-5 h-5 text-green-600 mr-4">
                                  <div>
                                    <div class="font-semibold text-gray-800">Under $500,000</div>
                                    <div class="text-sm text-gray-500">Getting started with wealth building</div>
                                  </div>
                                </div>
                                <div class="text-green-600 font-bold">$0 - $500K</div>
                              </label>
                              
                              <label class="networth-option flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 cursor-pointer transition-all">
                                <div class="flex items-center">
                                  <input type="radio" name="netWorth" value="500k_1m" class="w-5 h-5 text-green-600 mr-4">
                                  <div>
                                    <div class="font-semibold text-gray-800">$500,000 - $1,000,000</div>
                                    <div class="text-sm text-gray-500">Building substantial wealth</div>
                                  </div>
                                </div>
                                <div class="text-green-600 font-bold">$500K - $1M</div>
                              </label>
                              
                              <label class="networth-option flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 cursor-pointer transition-all">
                                <div class="flex items-center">
                                  <input type="radio" name="netWorth" value="1m_5m" class="w-5 h-5 text-green-600 mr-4">
                                  <div>
                                    <div class="font-semibold text-gray-800">$1,000,000 - $5,000,000</div>
                                    <div class="text-sm text-gray-500">High net worth individual</div>
                                  </div>
                                </div>
                                <div class="text-green-600 font-bold">$1M - $5M</div>
                              </label>
                              
                              <label class="networth-option flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 cursor-pointer transition-all">
                                <div class="flex items-center">
                                  <input type="radio" name="netWorth" value="5m_10m" class="w-5 h-5 text-green-600 mr-4">
                                  <div>
                                    <div class="font-semibold text-gray-800">$5,000,000 - $10,000,000</div>
                                    <div class="text-sm text-gray-500">Very high net worth individual</div>
                                  </div>
                                </div>
                                <div class="text-green-600 font-bold">$5M - $10M</div>
                              </label>
                              
                              <label class="networth-option flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 cursor-pointer transition-all">
                                <div class="flex items-center">
                                  <input type="radio" name="netWorth" value="over_10m" class="w-5 h-5 text-green-600 mr-4">
                                  <div>
                                    <div class="font-semibold text-gray-800">Over $10,000,000</div>
                                    <div class="text-sm text-gray-500">Ultra high net worth individual</div>
                                  </div>
                                </div>
                                <div class="text-green-600 font-bold">$10M+</div>
                              </label>
                            </div>
                          </div>
                          
                          <div class="flex justify-between pt-6">
                            <button id="step2-back" class="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                              <i class="fas fa-arrow-left mr-2"></i>Back
                            </button>
                            <button id="step2-next" class="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                              <span>Continue to Risk Factors</span>
                              <i class="fas fa-arrow-right ml-2"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    \`;
                  }
                  
                  getStep3Content() {
                    return \`
                      <div class="assessment-step">
                        <div class="text-center mb-8">
                          <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-exclamation-triangle text-yellow-600 text-2xl"></i>
                          </div>
                          <h3 class="text-2xl font-bold text-gray-800 mb-2">Risk Factors Assessment</h3>
                          <p class="text-gray-600">Help us identify your current exposure levels</p>
                        </div>
                        
                        <div class="max-w-2xl mx-auto space-y-6">
                          <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-3">
                              <i class="fas fa-balance-scale mr-2 text-yellow-600"></i>Are you currently facing any legal threats or lawsuits?
                            </label>
                            <div class="space-y-3">
                              <label class="legal-threat-option flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 cursor-pointer transition-all">
                                <input type="radio" name="legalThreats" value="none" class="w-5 h-5 text-yellow-600 mr-4">
                                <div class="flex-1">
                                  <div class="flex items-center justify-between">
                                    <div class="font-semibold text-gray-800">No Current Threats</div>
                                    <div class="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">Low Risk</div>
                                  </div>
                                  <div class="text-sm text-gray-500 mt-1">No known legal issues or potential litigation</div>
                                </div>
                              </label>
                              
                              <label class="legal-threat-option flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 cursor-pointer transition-all">
                                <input type="radio" name="legalThreats" value="potential" class="w-5 h-5 text-yellow-600 mr-4">
                                <div class="flex-1">
                                  <div class="flex items-center justify-between">
                                    <div class="font-semibold text-gray-800">Potential Threats</div>
                                    <div class="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Medium Risk</div>
                                  </div>
                                  <div class="text-sm text-gray-500 mt-1">Possible future legal challenges or industry risks</div>
                                </div>
                              </label>
                              
                              <label class="legal-threat-option flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 cursor-pointer transition-all">
                                <input type="radio" name="legalThreats" value="active" class="w-5 h-5 text-yellow-600 mr-4">
                                <div class="flex-1">
                                  <div class="flex items-center justify-between">
                                    <div class="font-semibold text-gray-800">Active Litigation</div>
                                    <div class="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-full">High Risk</div>
                                  </div>
                                  <div class="text-sm text-gray-500 mt-1">Currently facing lawsuits or legal proceedings</div>
                                </div>
                              </label>
                            </div>
                          </div>
                          
                          <div class="flex justify-between pt-6">
                            <button id="step3-back" class="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                              <i class="fas fa-arrow-left mr-2"></i>Back
                            </button>
                            <button id="step3-next" class="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                              <span>Get My Results</span>
                              <i class="fas fa-chart-line ml-2"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    \`;
                  }
                  
                  getStep4Content() {
                    // This will be filled with results after API call
                    return \`
                      <div class="assessment-step text-center">
                        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i class="fas fa-spinner fa-spin text-blue-600 text-2xl"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800 mb-2">Analyzing Your Risk Profile</h3>
                        <p class="text-gray-600">Please wait while we calculate your personalized assessment...</p>
                      </div>
                    \`;
                  }
                  
                  attachEventListeners() {
                    // Step 1 listeners
                    const step1Next = document.getElementById('step1-next');
                    const professionInputs = document.querySelectorAll('input[name="profession"]');
                    const nameInput = document.getElementById('assessment-name');
                    const emailInput = document.getElementById('assessment-email');
                    
                    // Validation function for step 1
                    const validateStep1 = () => {
                      const selectedProfession = document.querySelector('input[name="profession"]:checked');
                      const hasName = nameInput && nameInput.value.trim().length > 0;
                      const hasEmail = emailInput && emailInput.value.trim().length > 0 && emailInput.value.includes('@');
                      
                      if (step1Next) {
                        step1Next.disabled = !(selectedProfession && hasName && hasEmail);
                      }
                    };
                    
                    if (professionInputs.length > 0) {
                      professionInputs.forEach(input => {
                        input.addEventListener('change', () => {
                          // Add visual feedback
                          document.querySelectorAll('.profession-option').forEach(option => {
                            option.classList.remove('border-blue-500', 'bg-blue-50');
                          });
                          input.closest('.profession-option').classList.add('border-blue-500', 'bg-blue-50');
                          validateStep1();
                        });
                      });
                    }
                    
                    // Add listeners for name and email inputs
                    if (nameInput) {
                      nameInput.addEventListener('input', validateStep1);
                    }
                    if (emailInput) {
                      emailInput.addEventListener('input', validateStep1);
                    }
                    
                    if (step1Next) {
                      step1Next.addEventListener('click', () => {
                        const selectedProfession = document.querySelector('input[name="profession"]:checked');
                        const name = nameInput ? nameInput.value.trim() : '';
                        const email = emailInput ? emailInput.value.trim() : '';
                        
                        if (selectedProfession && name && email) {
                          this.assessmentData.profession = selectedProfession.value;
                          this.assessmentData.name = name;
                          this.assessmentData.email = email;
                          this.showStep(2);
                        }
                      });
                    }
                    
                    // Step 2 listeners
                    const step2Next = document.getElementById('step2-next');
                    const step2Back = document.getElementById('step2-back');
                    const networthInputs = document.querySelectorAll('input[name="netWorth"]');
                    
                    if (networthInputs.length > 0) {
                      networthInputs.forEach(input => {
                        input.addEventListener('change', () => {
                          if (step2Next) {
                            step2Next.disabled = false;
                            // Add visual feedback
                            document.querySelectorAll('.networth-option').forEach(option => {
                              option.classList.remove('border-green-500', 'bg-green-50');
                            });
                            input.closest('.networth-option').classList.add('border-green-500', 'bg-green-50');
                          }
                        });
                      });
                    }
                    
                    if (step2Next) {
                      step2Next.addEventListener('click', () => {
                        const selectedNetWorth = document.querySelector('input[name="netWorth"]:checked');
                        if (selectedNetWorth) {
                          this.assessmentData.netWorth = selectedNetWorth.value;
                          this.showStep(3);
                        }
                      });
                    }
                    
                    if (step2Back) {
                      step2Back.addEventListener('click', () => this.showStep(1));
                    }
                    
                    // Step 3 listeners
                    const step3Next = document.getElementById('step3-next');
                    const step3Back = document.getElementById('step3-back');
                    const legalThreatInputs = document.querySelectorAll('input[name="legalThreats"]');
                    
                    if (legalThreatInputs.length > 0) {
                      legalThreatInputs.forEach(input => {
                        input.addEventListener('change', () => {
                          if (step3Next) {
                            step3Next.disabled = false;
                            // Add visual feedback
                            document.querySelectorAll('.legal-threat-option').forEach(option => {
                              option.classList.remove('border-yellow-500', 'bg-yellow-50');
                            });
                            input.closest('.legal-threat-option').classList.add('border-yellow-500', 'bg-yellow-50');
                          }
                        });
                      });
                    }
                    
                    if (step3Next) {
                      step3Next.addEventListener('click', () => {
                        const selectedLegalThreats = document.querySelector('input[name="legalThreats"]:checked');
                        if (selectedLegalThreats) {
                          this.assessmentData.legalThreats = selectedLegalThreats.value;
                          this.showStep(4);
                          this.submitAssessment();
                        }
                      });
                    }
                    
                    if (step3Back) {
                      step3Back.addEventListener('click', () => this.showStep(2));
                    }
                  }
                  
                  async submitAssessment() {
                    try {
                      console.log('🚀 Submitting professional assessment:', this.assessmentData);
                      
                      const assessmentData = {
                        ...this.assessmentData
                      };
                      
                      const response = await fetch('/api/assessment/submit', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(assessmentData)
                      });
                      
                      const result = await response.json();
                      
                      if (result.success) {
                        this.showResults(result);
                      } else {
                        throw new Error(result.error || 'Assessment failed');
                      }
                      
                    } catch (error) {
                      console.error('Assessment submission failed:', error);
                      this.showError(error.message);
                    }
                  }
                  
                  showResults(data) {
                    const container = document.getElementById('assessment-form');
                    const riskColorClass = data.riskLevel === 'HIGH' ? 'text-red-600' : 
                                         data.riskLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600';
                    const riskBgClass = data.riskLevel === 'HIGH' ? 'bg-red-50 border-red-200' : 
                                       data.riskLevel === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';
                    
                    container.innerHTML = \`
                      <div class="assessment-step text-center">
                        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <i class="fas fa-check-circle text-green-600 text-3xl"></i>
                        </div>
                        <h3 class="text-3xl font-bold text-gray-800 mb-4">Assessment Complete!</h3>
                        <p class="text-gray-600 mb-8">Here's your personalized risk analysis and recommendations</p>
                        
                        <div class="max-w-3xl mx-auto">
                          <!-- Risk Level Card -->
                          <div class="mb-8 p-6 \${riskBgClass} border-2 rounded-xl">
                            <div class="flex items-center justify-center mb-4">
                              <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mr-4">
                                <i class="fas fa-shield-alt \${riskColorClass} text-2xl"></i>
                              </div>
                              <div class="text-left">
                                <div class="text-sm text-gray-600">Your Risk Level</div>
                                <div class="text-3xl font-bold \${riskColorClass}">\${data.riskLevel}</div>
                              </div>
                            </div>
                          </div>
                          
                          <!-- Wealth at Risk -->
                          <div class="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-xl">
                            <div class="flex items-center justify-center mb-2">
                              <i class="fas fa-exclamation-triangle text-red-600 text-xl mr-3"></i>
                              <h4 class="text-lg font-semibold text-gray-800">Estimated Wealth at Risk</h4>
                            </div>
                            <div class="text-4xl font-bold text-red-600 mb-2">$\${data.wealthAtRisk.toLocaleString()}</div>
                            <p class="text-sm text-red-700">Amount potentially vulnerable to creditors or litigation</p>
                          </div>
                          
                          <!-- Recommendations -->
                          <div class="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl text-left">
                            <h4 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                              <i class="fas fa-lightbulb text-blue-600 mr-3"></i>
                              Recommended Action Items
                            </h4>
                            <ul class="space-y-3">
                              \${data.recommendations.map(rec => \`
                                <li class="flex items-start">
                                  <i class="fas fa-check-circle text-green-500 mr-3 mt-1 flex-shrink-0"></i>
                                  <span class="text-gray-700">\${rec}</span>
                                </li>
                              \`).join('')}
                            </ul>
                          </div>
                          
                          <!-- Action Buttons -->
                          <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onclick="location.reload()" class="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                              <i class="fas fa-redo mr-2"></i>Take Assessment Again
                            </button>
                            <button onclick="window.scrollToPricing()" class="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg">
                              <i class="fas fa-shield-alt mr-2"></i>Get Professional Protection
                            </button>
                          </div>
                        </div>
                      </div>
                    \`;
                  }
                  
                  showError(message) {
                    const container = document.getElementById('assessment-form');
                    container.innerHTML = \`
                      <div class="assessment-step text-center">
                        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800 mb-4">Assessment Error</h3>
                        <p class="text-gray-600 mb-6">\${message}</p>
                        <button onclick="location.reload()" class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                          <i class="fas fa-redo mr-2"></i>Try Again
                        </button>
                      </div>
                    \`;
                  }
                }
                
                // Initialize the assessment system
                let riskAssessment;
                document.addEventListener('DOMContentLoaded', function() {
                  console.log('🎯 DOM Loaded - Starting Professional Risk Assessment System');
                  
                  // Check if assessment container exists
                  const container = document.getElementById('assessment-form');
                  if (container) {
                    console.log('✅ Assessment container found, initializing...');
                    riskAssessment = new RiskAssessment();
                  } else {
                    console.log('❌ Assessment container not found');
                    setTimeout(() => {
                      const delayedContainer = document.getElementById('assessment-form');
                      if (delayedContainer) {
                        console.log('✅ Assessment container found after delay, initializing...');
                        riskAssessment = new RiskAssessment();
                      } else {
                        console.log('❌ Assessment container still not found after delay');
                      }
                    }, 1000);
                  }
                });
                
                // Global function for scrolling to pricing
                window.scrollToPricing = function() {
                  const pricingSection = document.getElementById('pricing');
                  if (pricingSection) {
                    pricingSection.scrollIntoView({ behavior: 'smooth' });
                  }
                };
              `}}></script>
            
            {/* Continuing JavaScript for navigation and other functions */}
            <script dangerouslySetInnerHTML={{__html: `
                // Mobile menu toggle function
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
                
                console.log('Mobile navigation functions defined successfully');
                
                // Initialize Assessment Form when container is available
                window.nextAssessmentStep = function() {
                  console.log('nextAssessmentStep called...');
                  if (window.assessment && window.assessment.nextStep) {
                    console.log('Using existing assessment instance');
                    window.assessment.nextStep();
                  } else if (window.initAssessmentForm) {
                    console.log('Initializing new AssessmentForm...');
                    window.assessment = window.initAssessmentForm();
                    if (window.assessment && window.assessment.nextStep) {
                      window.assessment.nextStep();
                    }
                  } else {
                    console.error('AssessmentForm not loaded yet');
                    alert('Loading assessment system...');
                  }
                };
                
                // Define functions immediately and globally - GUARANTEED TO LOAD
                (function() {
                  console.log('Defining assessment functions immediately...');
                  
                  // Simple direct assessment submission - WORKING IMPLEMENTATION
                  window.submitDirectAssessment = function() {
                    console.log('Direct assessment submission starting...');
                    
                    const profession = document.getElementById('assessment-profession')?.value;
                    const netWorth = document.querySelector('input[name="assessmentNetWorth"]:checked')?.value;
                    const legalThreats = document.querySelector('input[name="assessmentLegalThreats"]:checked')?.value;
                    
                    // Validation
                    if (!profession) {
                      alert('Please select your profession');
                      return;
                    }
                    if (!netWorth) {
                      alert('Please select your net worth range');
                      return;
                    }
                    if (!legalThreats) {
                      alert('Please indicate your legal threat status');
                      return;
                    }
                    
                    // Show loading state
                    const button = event.target;
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
                    button.disabled = true;
                    
                    // Prepare assessment data
                    const assessmentData = {
                      name: 'Anonymous User',
                      email: 'anonymous@example.com',
                      profession,
                      netWorth,
                      legalThreats
                    };
                    
                    console.log('Submitting assessment data:', assessmentData);
                    
                    // Submit to API using fetch (always available)
                    fetch('/api/assessment/submit', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(assessmentData)
                    })
                    .then(response => response.json())
                    .then(data => {
                      console.log('Assessment submitted successfully:', data);
                      if (data.success) {
                        window.showDirectAssessmentResults(data);
                      } else {
                        throw new Error(data.error || 'Assessment failed');
                      }
                    })
                    .catch(error => {
                      console.error('Assessment submission failed:', error);
                      button.innerHTML = originalText;
                      button.disabled = false;
                      alert('Failed to submit assessment. Please try again.');
                    });
                  };
                  
                  // Show assessment results - WORKING IMPLEMENTATION
                  window.showDirectAssessmentResults = function(data) {
                    console.log('Displaying assessment results:', data);
                    
                    const container = document.getElementById('assessment-form');
                    if (container) {
                      const riskColorClass = data.riskLevel === 'HIGH' ? 'text-red-600' : 
                                           data.riskLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600';
                      
                      container.innerHTML = \`
                        <div class="text-center py-8">
                          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-check-circle text-green-600 text-2xl"></i>
                          </div>
                          <h3 class="text-2xl font-bold text-gray-800 mb-4">Assessment Complete!</h3>
                          <div class="bg-gray-50 rounded-lg p-6 mb-6 text-left max-w-2xl mx-auto">
                            <h4 class="font-semibold text-lg mb-2">
                              Risk Level: <span class="\${riskColorClass}">\${data.riskLevel}</span>
                            </h4>
                            <p class="text-gray-700 mb-4">
                              Estimated Wealth at Risk: <strong class="text-red-600">$\${data.wealthAtRisk.toLocaleString()}</strong>
                            </p>
                            <h5 class="font-semibold mb-2 text-gray-800">Recommended Actions:</h5>
                            <ul class="list-disc list-inside space-y-1">
                              \${data.recommendations.map(rec => \`<li class="text-gray-700">\${rec}</li>\`).join('')}
                            </ul>
                          </div>
                          <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onclick="location.reload()" class="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors">
                              Take Assessment Again
                            </button>
                            <button onclick="window.scrollToPricing()" class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                              Get Professional Help
                            </button>
                          </div>
                        </div>
                      \`;
                    }
                  };
                  
                  // Scroll to pricing section
                  window.scrollToPricing = function() {
                    const pricingSection = document.getElementById('pricing');
                    if (pricingSection) {
                      pricingSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  };
                  
                  console.log('Assessment functions defined successfully!');
                })();
                
                // Add event listener to the assessment button - FIXED IMPLEMENTATION
                document.addEventListener('DOMContentLoaded', function() {
                  const submitBtn = document.getElementById('submit-assessment-btn');
                  if (submitBtn) {
                    submitBtn.addEventListener('click', function() {
                      if (window.submitDirectAssessment) {
                        window.submitDirectAssessment();
                      } else {
                        console.error('submitDirectAssessment function not found');
                        alert('Assessment system not ready. Please refresh the page.');
                      }
                    });
                    console.log('✅ Assessment button click handler attached successfully');
                  } else {
                    console.error('❌ Assessment submit button not found - ID: submit-assessment-btn');
                  }
                });
                
                // Enhanced language changing functionality - Always define
                window.changeLanguage = function(lang) {
                    console.log('Changing language to:', lang);
                    
                    // Store language preference in localStorage
                    localStorage.setItem('assetshield-language', lang);
                    
                    // Update language display in navigation
                    const languageBtn = document.getElementById('language-btn');
                    const mobileLanguageBtn = document.getElementById('mobile-language-btn');
                    
                    const languageNames = {
                      'en': 'EN',
                      'es': 'ES',
                      'fr': 'FR',
                      'de': 'DE'
                    };
                    
                    const fullLanguageNames = {
                      'en': 'English',
                      'es': 'Español',
                      'fr': 'Français',
                      'de': 'Deutsch'
                    };
                    
                    if (languageBtn) {
                      languageBtn.innerHTML = '<i class="fas fa-globe mr-2"></i>' + languageNames[lang] + '<i class="fas fa-chevron-down ml-1 text-sm"></i>';
                    }
                    if (mobileLanguageBtn) {
                      mobileLanguageBtn.innerHTML = '<i class="fas fa-globe mr-2"></i>' + fullLanguageNames[lang] + '<i class="fas fa-chevron-down ml-1 text-sm"></i>';
                    }
                    
                    // Close the language menu
                    const menu = document.getElementById('language-menu');
                    const mobileMenu = document.getElementById('mobile-language-menu');
                    if (menu) menu.classList.add('hidden');
                    if (mobileMenu) mobileMenu.classList.add('hidden');
                    
                    // Basic translation system with fallback content
                    const translations = {
                      'en': {
                        'hero.title': 'Complete Asset Protection Platform',
                        'hero.subtitle': 'Discover your asset protection risk level, explore tailored strategies, and access comprehensive educational resources to safeguard your wealth.',
                        'nav.riskAssessment': 'Risk Assessment',
                        'nav.strategies': 'Strategies',
                        'nav.education': 'Education',
                        'nav.forLawFirms': 'For Law Firms',
                        'assessment.title': 'Asset Protection Risk Assessment',
                        'assessment.subtitle': 'Evaluate your current protection level in just 5 minutes',
                        'strategies.title': 'Asset Protection Strategies',
                        'strategies.subtitle': 'Comprehensive strategies to protect your wealth from creditors, lawsuits, and financial threats',
                        'education.title': 'Asset Protection Education Center',
                        'education.subtitle': 'Comprehensive resources to help you make informed decisions'
                      },
                      'es': {
                        'hero.title': 'Plataforma Completa de Protección de Activos',
                        'hero.subtitle': 'Descubra su nivel de riesgo de protección de activos, explore estrategias personalizadas y acceda a recursos educativos integrales para proteger su riqueza.',
                        'nav.riskAssessment': 'Evaluación de Riesgo',
                        'nav.strategies': 'Estrategias',
                        'nav.education': 'Educación',
                        'nav.forLawFirms': 'Para Bufetes',
                        'assessment.title': 'Evaluación de Riesgo de Protección de Activos',
                        'assessment.subtitle': 'Evalúe su nivel de protección actual en solo 5 minutos',
                        'strategies.title': 'Estrategias de Protección de Activos',
                        'strategies.subtitle': 'Estrategias integrales para proteger su riqueza de acreedores, demandas y amenazas financieras',
                        'education.title': 'Centro de Educación de Protección de Activos',
                        'education.subtitle': 'Recursos integrales para ayudarle a tomar decisiones informadas'
                      },
                      'fr': {
                        'hero.title': 'Plateforme Complète de Protection d\'Actifs',
                        'hero.subtitle': 'Découvrez votre niveau de risque de protection d\'actifs, explorez des stratégies sur mesure et accédez à des ressources éducatives complètes pour protéger votre patrimoine.',
                        'nav.riskAssessment': 'Évaluation des Risques',
                        'nav.strategies': 'Stratégies',
                        'nav.education': 'Éducation',
                        'nav.forLawFirms': 'Pour Cabinets',
                        'assessment.title': 'Évaluation des Risques de Protection d\'Actifs',
                        'assessment.subtitle': 'Évaluez votre niveau de protection actuel en seulement 5 minutes',
                        'strategies.title': 'Stratégies de Protection d\'Actifs',
                        'strategies.subtitle': 'Stratégies complètes pour protéger votre patrimoine des créanciers, poursuites et menaces financières',
                        'education.title': 'Centre d\'Éducation de Protection d\'Actifs',
                        'education.subtitle': 'Ressources complètes pour vous aider à prendre des décisions éclairées'
                      },
                      'de': {
                        'hero.title': 'Vollständige Vermögensschutz-Plattform',
                        'hero.subtitle': 'Entdecken Sie Ihr Risiko für den Vermögensschutz, erkunden Sie maßgeschneiderte Strategien und nutzen Sie umfassende Bildungsressourcen zum Schutz Ihres Vermögens.',
                        'nav.riskAssessment': 'Risikobewertung',
                        'nav.strategies': 'Strategien',
                        'nav.education': 'Bildung',
                        'nav.forLawFirms': 'Für Kanzleien',
                        'assessment.title': 'Risikobewertung für Vermögensschutz',
                        'assessment.subtitle': 'Bewerten Sie Ihr aktuelles Schutzniveau in nur 5 Minuten',
                        'strategies.title': 'Vermögensschutz-Strategien',
                        'strategies.subtitle': 'Umfassende Strategien zum Schutz Ihres Vermögens vor Gläubigern, Klagen und finanziellen Bedrohungen',
                        'education.title': 'Bildungszentrum für Vermögensschutz',
                        'education.subtitle': 'Umfassende Ressourcen für fundierte Entscheidungen'
                      }
                    };
                    
                    // Apply translations to elements with data-translate attribute
                    console.log('Applying translations for language:', lang);
                    const elementsToTranslate = document.querySelectorAll('[data-translate]');
                    console.log('Found elements to translate:', elementsToTranslate.length);
                    
                    elementsToTranslate.forEach((element, index) => {
                      const key = element.getAttribute('data-translate');
                      console.log('Element ' + index + ': key="' + key + '", current text="' + element.textContent + '"');
                      
                      if (translations[lang] && translations[lang][key]) {
                        const newText = translations[lang][key];
                        element.textContent = newText;
                        console.log('Updated to: "' + newText + '"');
                      } else {
                        console.log('No translation found for key: ' + key + ' in language: ' + lang);
                      }
                    });
                    
                    // Force a visual update
                    document.body.style.opacity = '0.99';
                    setTimeout(() => {
                      document.body.style.opacity = '1';
                    }, 50);
                    
                    // Show confirmation message
                    const message = {
                      'en': 'Language changed to English',
                      'es': 'Idioma cambiado a Español', 
                      'fr': 'Langue changée en Français',
                      'de': 'Sprache geändert auf Deutsch'
                    };
                    
                    // Create a temporary notification
                    const notification = document.createElement('div');
                    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
                    notification.textContent = message[lang] || message['en'];
                    document.body.appendChild(notification);
                    
                    // Remove notification after 3 seconds
                    setTimeout(() => {
                      notification.style.opacity = '0';
                      setTimeout(() => {
                        if (notification.parentNode) {
                          document.body.removeChild(notification);
                        }
                      }, 300);
                    }, 3000);
                };
                
                // Always define toggle functions
                window.toggleLanguageMenu = function() {
                  const menu = document.getElementById('language-menu');
                  if (menu) menu.classList.toggle('hidden');
                };
                
                window.toggleMobileLanguageMenu = function() {
                  const menu = document.getElementById('mobile-language-menu');
                  if (menu) menu.classList.toggle('hidden');
                };
                
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
                
                // Assessment form ready
                console.log('Assessment system initialized successfully');
                

              `}}></script>
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

        {/* Asset Protection Strategies */}
        <section id="strategies" className="px-6 py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Asset Protection Strategies
              </h2>
              <p className="text-xl text-gray-600">
                Comprehensive strategies to protect your wealth from creditors, lawsuits, and financial threats
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 mb-12">
              {/* Domestic Protection */}
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all transform hover:scale-105">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-home text-blue-600 text-2xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Domestic Protection</h3>
                  <p className="text-gray-600">U.S.-based asset protection structures</p>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <i className="fas fa-shield-alt text-green-500 mr-3 mt-1"></i>
                    <div>
                      <strong className="text-gray-800">Limited Liability Companies (LLCs)</strong>
                      <p className="text-gray-600 text-sm">Multi-member LLCs with charging order protection</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-users text-green-500 mr-3 mt-1"></i>
                    <div>
                      <strong className="text-gray-800">Family Limited Partnerships</strong>
                      <p className="text-gray-600 text-sm">Centralized family wealth management</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-landmark text-green-500 mr-3 mt-1"></i>
                    <div>
                      <strong className="text-gray-800">Domestic Asset Protection Trusts</strong>
                      <p className="text-gray-600 text-sm">Self-settled spendthrift trusts in favorable states</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-university text-green-500 mr-3 mt-1"></i>
                    <div>
                      <strong className="text-gray-800">Homestead Exemptions</strong>
                      <p className="text-gray-600 text-sm">Primary residence protection strategies</p>
                    </div>
                  </li>
                </ul>
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <i className="fas fa-info-circle mr-2"></i>
                    <strong>Best for:</strong> Moderate risk exposure, cost-effective solutions, U.S. tax compliance
                  </p>
                </div>
              </div>

              {/* Offshore Protection */}
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all transform hover:scale-105">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-globe text-purple-600 text-2xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Offshore Protection</h3>
                  <p className="text-gray-600">International asset protection structures</p>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <i className="fas fa-island-tropical text-green-500 mr-3 mt-1"></i>
                    <div>
                      <strong className="text-gray-800">Cook Islands Trusts</strong>
                      <p className="text-gray-600 text-sm">World's strongest asset protection jurisdiction</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-mountain text-green-500 mr-3 mt-1"></i>
                    <div>
                      <strong className="text-gray-800">Nevis LLCs</strong>
                      <p className="text-gray-600 text-sm">Creditor-proof offshore entities</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-coins text-green-500 mr-3 mt-1"></i>
                    <div>
                      <strong className="text-gray-800">Offshore Banking</strong>
                      <p className="text-gray-600 text-sm">International banking relationships</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-balance-scale text-green-500 mr-3 mt-1"></i>
                    <div>
                      <strong className="text-gray-800">Foreign Judgments Protection</strong>
                      <p className="text-gray-600 text-sm">Barriers to U.S. judgment enforcement</p>
                    </div>
                  </li>
                </ul>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-800">
                    <i className="fas fa-info-circle mr-2"></i>
                    <strong>Best for:</strong> High-risk professionals, substantial assets, maximum protection
                  </p>
                </div>
              </div>

              {/* Business Protection */}
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all transform hover:scale-105">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-building text-green-600 text-2xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Business Protection</h3>
                  <p className="text-gray-600">Protecting business assets and operations</p>
                </div>
                
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <i className="fas fa-layer-group text-green-500 mr-3 mt-1"></i>
                    <div>
                      <strong className="text-gray-800">Corporate Structures</strong>
                      <p className="text-gray-600 text-sm">Multi-entity business organization</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-file-contract text-green-500 mr-3 mt-1"></i>
                    <div>
                      <strong className="text-gray-800">Operating Agreements</strong>
                      <p className="text-gray-600 text-sm">Creditor-resistant business documents</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-umbrella text-green-500 mr-3 mt-1"></i>
                    <div>
                      <strong className="text-gray-800">Insurance Strategies</strong>
                      <p className="text-gray-600 text-sm">Liability insurance optimization</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-handshake text-green-500 mr-3 mt-1"></i>
                    <div>
                      <strong className="text-gray-800">Management Agreements</strong>
                      <p className="text-gray-600 text-sm">Independent management structures</p>
                    </div>
                  </li>
                </ul>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <i className="fas fa-info-circle mr-2"></i>
                    <strong>Best for:</strong> Business owners, professional practices, operational continuity
                  </p>
                </div>
              </div>
            </div>

            {/* Strategy Selection Guide */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Choose the Right Strategy</h3>
                <p className="text-gray-600">Our assessment helps you identify the optimal protection approach for your situation</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-6 bg-yellow-50 rounded-lg">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-2">Low Risk</h4>
                  <p className="text-sm text-gray-600">Basic domestic protection, insurance optimization, simple entity structures</p>
                </div>
                
                <div className="text-center p-6 bg-orange-50 rounded-lg">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-shield-alt text-orange-600 text-xl"></i>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-2">Medium Risk</h4>
                  <p className="text-sm text-gray-600">Domestic trusts, advanced LLCs, multi-entity structures, enhanced insurance</p>
                </div>
                
                <div className="text-center p-6 bg-red-50 rounded-lg">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-fort-awesome text-red-600 text-xl"></i>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-2">High Risk</h4>
                  <p className="text-sm text-gray-600">Offshore trusts, international entities, comprehensive asset protection plans</p>
                </div>
              </div>
              
              <div className="text-center">
                <button onClick="navigateToSection('assessment')" className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  <i className="fas fa-clipboard-list mr-2"></i>
                  Start Risk Assessment
                </button>
                <p className="text-sm text-gray-500 mt-2">Get personalized strategy recommendations in 5 minutes</p>
              </div>
            </div>
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
                Start your 14-day risk-free trial today - pay the setup fee now, monthly billing begins after trial
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
                  <p className="text-gray-500 mb-1">Setup fee (includes 14-day trial)</p>
                  <div className="text-lg text-gray-600">Then $500<span className="text-sm text-gray-500">/month</span></div>
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
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-rocket mr-2"></i>
                  Start 14-Day Trial
                  <div className="text-xs opacity-90 mt-1">Pay $5,000 • Cancel Anytime During Trial</div>
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
                  <p className="text-blue-100 mb-1">Setup fee (includes 14-day trial)</p>
                  <div className="text-xl text-blue-100">Then $1,200<span className="text-lg text-blue-200">/month</span></div>
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
                  className="w-full py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-white"
                >
                  <i className="fas fa-crown mr-2 text-yellow-500"></i>
                  Start 14-Day Trial
                  <div className="text-xs opacity-80 mt-1">Pay $10,000 • Cancel Anytime During Trial</div>
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
                  <p className="text-gray-500 mb-1">Setup fee (includes 14-day trial)</p>
                  <div className="text-lg text-gray-600">Then $2,500<span className="text-sm text-gray-500">/month</span></div>
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
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-rocket mr-2"></i>
                  Start 14-Day Trial
                  <div className="text-xs opacity-90 mt-1">Pay $25,000 • Cancel Anytime During Trial</div>
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
                onClick="showDemoModal()"
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
                \`Please try again or contact support at support@isuccesshub.com\\n\\n\` +
                \`Error: \${error.message}\`
              );
              
              // Reset button
              button.innerHTML = originalText;
              button.disabled = false;
            }
          });
          
          // Enhanced payment modal system for lawyers
          window.purchasePlatform = function(tier, setupFee, monthlyFee) {
            showProfessionalPaymentModal(tier, setupFee, monthlyFee);
          };
          
          function showProfessionalPaymentModal(tier, setupFee, monthlyFee) {
            const tierNames = {
              'starter': 'Starter',
              'professional': 'Professional', 
              'enterprise': 'Enterprise'
            };
            
            const tierName = tierNames[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
            
            // Create professional payment modal
            const modalHTML = \`
              <div id="payment-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style="z-index: 10000 !important;">
                <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <!-- Modal Header -->
                  <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-t-2xl">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center">
                        <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                          <i class="fas fa-shield-alt text-2xl"></i>
                        </div>
                        <div>
                          <h2 class="text-2xl font-bold">AssetShield \${tierName} Platform</h2>
                          <p class="text-blue-100">Professional Asset Protection Software</p>
                        </div>
                      </div>
                      <button onclick="closeProfessionalModal()" class="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                        <i class="fas fa-times text-xl"></i>
                      </button>
                    </div>
                  </div>
                  
                  <!-- Modal Content -->
                  <div class="p-8">
                    <!-- Pricing Summary -->
                    <div class="bg-gray-50 rounded-xl p-6 mb-6">
                      <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-credit-card text-blue-600 mr-3"></i>
                        Payment Details
                      </h3>
                      <div class="bg-white rounded-lg p-6 border border-blue-200">
                        <div class="flex items-center justify-between mb-4">
                          <div>
                            <div class="text-lg font-bold text-gray-800">Setup Fee (Pay Today)</div>
                            <div class="text-sm text-gray-600">Includes platform setup & 14-day trial</div>
                          </div>
                          <div class="text-3xl font-bold text-blue-600">$\${setupFee.toLocaleString()}</div>
                        </div>
                        <div class="bg-blue-50 rounded-lg p-4">
                          <div class="flex items-center text-blue-800">
                            <i class="fas fa-info-circle mr-2"></i>
                            <div class="text-sm">
                              <div class="font-semibold">Then $\${monthlyFee.toLocaleString()}/month after your 14-day trial</div>
                              <div class="text-blue-600">Cancel anytime during trial at no charge</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Value Proposition -->
                    <div class="mb-6">
                      <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-star text-yellow-500 mr-3"></i>
                        What You Get Instantly
                      </h3>
                      <div class="grid md:grid-cols-2 gap-3">
                        <div class="flex items-center p-3 bg-green-50 rounded-lg">
                          <i class="fas fa-check-circle text-green-600 mr-3"></i>
                          <span class="text-gray-700">Complete white-label branding</span>
                        </div>
                        <div class="flex items-center p-3 bg-green-50 rounded-lg">
                          <i class="fas fa-check-circle text-green-600 mr-3"></i>
                          <span class="text-gray-700">Advanced risk assessment tool</span>
                        </div>
                        <div class="flex items-center p-3 bg-green-50 rounded-lg">
                          <i class="fas fa-check-circle text-green-600 mr-3"></i>
                          <span class="text-gray-700">Automated lead capture system</span>
                        </div>
                        <div class="flex items-center p-3 bg-green-50 rounded-lg">
                          <i class="fas fa-check-circle text-green-600 mr-3"></i>
                          <span class="text-gray-700">Professional client portal</span>
                        </div>
                        <div class="flex items-center p-3 bg-green-50 rounded-lg">
                          <i class="fas fa-check-circle text-green-600 mr-3"></i>
                          <span class="text-gray-700">24/7 instant deployment</span>
                        </div>
                        <div class="flex items-center p-3 bg-green-50 rounded-lg">
                          <i class="fas fa-check-circle text-green-600 mr-3"></i>
                          <span class="text-gray-700">Educational content library</span>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Contact Form -->
                    <form id="lawyer-info-form" class="space-y-4 mb-6">
                      <div class="grid md:grid-cols-2 gap-4">
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-user mr-2"></i>Attorney Name *
                          </label>
                          <input type="text" id="lawyer-name" required 
                                 class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                 placeholder="Your full name">
                        </div>
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-building mr-2"></i>Law Firm Name *
                          </label>
                          <input type="text" id="firm-name" required 
                                 class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                 placeholder="Your law firm name">
                        </div>
                      </div>
                      
                      <div class="grid md:grid-cols-2 gap-4">
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-envelope mr-2"></i>Email Address *
                          </label>
                          <input type="email" id="lawyer-email" required 
                                 class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                 placeholder="attorney@lawfirm.com">
                        </div>
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-phone mr-2"></i>Phone Number
                          </label>
                          <input type="tel" id="lawyer-phone" 
                                 class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                 placeholder="(555) 123-4567">
                        </div>
                      </div>
                    </form>
                    
                    <!-- Security & Guarantee -->
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div class="flex items-center mb-2">
                        <i class="fas fa-shield-check text-green-600 text-xl mr-3"></i>
                        <h4 class="font-bold text-green-800">14-Day Risk-Free Trial</h4>
                      </div>
                      <p class="text-green-700 text-sm">
                        🔒 Secure Stripe payment • ⚡ Instant platform activation • 📞 Cancel anytime during trial • 💯 Full setup included
                      </p>
                    </div>
                  </div>
                  
                  <!-- Modal Footer -->
                  <div class="bg-gray-50 px-8 py-6 rounded-b-2xl border-t border-gray-200">
                    <div class="flex flex-col sm:flex-row gap-4">
                      <button type="button" onclick="closeProfessionalModal()" 
                              class="flex-1 py-3 px-6 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Pricing
                      </button>
                      <button type="button" onclick="processLawyerPurchase('\${tier}', \${setupFee}, \${monthlyFee})" 
                              class="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-blue-700 transition-all transform hover:scale-105">
                        <i class="fas fa-credit-card mr-2"></i>Start 14-Day Trial - Pay $\${setupFee.toLocaleString()}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            \`;
            
            // Add modal to DOM
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Prevent background scrolling
            document.body.style.overflow = 'hidden';
            
            // Focus first input
            setTimeout(() => {
              document.getElementById('lawyer-name')?.focus();
            }, 100);
          }
          
          window.closeProfessionalModal = function() {
            console.log('🔄 Closing payment modal...');
            const modal = document.getElementById('payment-modal');
            if (modal) {
              // Force immediate removal with better cleanup
              modal.style.display = 'none !important';
              modal.style.visibility = 'hidden !important';
              modal.style.opacity = '0 !important';
              modal.style.pointerEvents = 'none !important';
              
              // Remove from DOM immediately
              setTimeout(() => {
                if (modal.parentNode) {
                  modal.parentNode.removeChild(modal);
                }
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                console.log('✅ Payment modal closed and removed');
              }, 10);
            } else {
              console.log('⚠️ Payment modal not found');
            }
          };
          
          window.processLawyerPurchase = async function(tier, setupFee, monthlyFee) {
            // Validate form
            const lawyerName = document.getElementById('lawyer-name')?.value.trim();
            const firmName = document.getElementById('firm-name')?.value.trim();
            const lawyerEmail = document.getElementById('lawyer-email')?.value.trim();
            const lawyerPhone = document.getElementById('lawyer-phone')?.value.trim() || '';
            
            if (!lawyerName) {
              alert('Please enter your full name.');
              document.getElementById('lawyer-name')?.focus();
              return;
            }
            
            if (!firmName) {
              alert('Please enter your law firm name.');
              document.getElementById('firm-name')?.focus();
              return;
            }
            
            if (!lawyerEmail || !lawyerEmail.includes('@')) {
              alert('Please enter a valid email address.');
              document.getElementById('lawyer-email')?.focus();
              return;
            }
            
            // Show loading state
            const button = event.target;
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating Secure Checkout...';
            button.disabled = true;
            
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
              
              if (result.success && result.checkoutUrl) {
                console.log('✅ Checkout session created:', result.sessionId);
                console.log('🔗 Opening checkout URL:', result.checkoutUrl);
                
                // Close modal immediately
                closeProfessionalModal();
                
                // Force show success message first
                showCheckoutSuccessMessage();
                
                // Then try to open the checkout
                setTimeout(() => {
                  const opened = window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
                  console.log('🆕 New tab opened:', opened ? 'Success' : 'Blocked by popup blocker');
                  
                  if (!opened) {
                    // Show fallback message if popup was blocked
                    showPopupBlockedMessage(result.checkoutUrl);
                  }
                }, 200);
              } else if (result.success && !result.checkoutUrl) {
                throw new Error('Checkout session created but no URL returned');
              } else {
                throw new Error(result.error || 'Failed to create checkout session');
              }
              
            } catch (error) {
              console.error('Purchase error:', error);
              
              // Reset button
              button.innerHTML = originalHTML;
              button.disabled = false;
              
              // Show professional error modal
              showErrorModal(
                'Purchase Error',
                \`We encountered an error processing your purchase request. Please try again or contact our support team.\\n\\nError: \${error.message}\`,
                'support@isuccesshub.com'
              );
            }
          };
          
          function showCheckoutSuccessMessage() {
            console.log('📢 Showing checkout success message...');
            
            // Remove any existing success messages first
            const existingMessages = document.querySelectorAll('.checkout-success-message');
            existingMessages.forEach(msg => msg.remove());
            
            // Create a prominent success message with better positioning
            const successDiv = document.createElement('div');
            successDiv.className = 'checkout-success-message';
            successDiv.style.cssText = 'position: fixed !important; top: 20px !important; right: 20px !important; z-index: 999999 !important; background: linear-gradient(135deg, #10b981, #059669) !important; color: white !important; padding: 16px 24px !important; border-radius: 12px !important; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important; display: flex !important; align-items: center !important; font-family: system-ui, -apple-system, sans-serif !important; font-size: 14px !important; max-width: 350px !important; transform: translateX(100%) !important; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;';
            
            successDiv.innerHTML = \`
              <div style="margin-right: 12px; font-size: 20px;">
                <i class="fas fa-external-link-alt"></i>
              </div>
              <div>
                <div style="font-weight: 600; margin-bottom: 4px;">Payment Tab Opened!</div>
                <div style="font-size: 12px; opacity: 0.9;">Complete your secure checkout in the new tab</div>
              </div>
            \`;
            
            document.body.appendChild(successDiv);
            
            // Animate in with a slight delay
            setTimeout(() => {
              successDiv.style.transform = 'translateX(0) !important';
              console.log('✅ Success message displayed and animated in');
            }, 50);
            
            // Auto-remove after 8 seconds
            setTimeout(() => {
              if (successDiv && successDiv.parentNode) {
                successDiv.style.transform = 'translateX(100%) !important';
                setTimeout(() => {
                  if (successDiv.parentNode) {
                    successDiv.remove();
                    console.log('🗑️ Success message removed');
                  }
                }, 400);
              }
            }, 8000);
          }
          
          function showPopupBlockedMessage(checkoutUrl) {
            console.log('🚫 Popup blocked, showing manual link...');
            
            // Remove any existing messages first
            const existingMessages = document.querySelectorAll('.popup-blocked-message');
            existingMessages.forEach(msg => msg.remove());
            
            // Create popup blocked message with manual link
            const blockedDiv = document.createElement('div');
            blockedDiv.className = 'popup-blocked-message fixed top-4 right-4 bg-yellow-500 text-white px-6 py-4 rounded-lg shadow-2xl z-[9999] max-w-sm';
            blockedDiv.style.cssText = 'position: fixed !important; top: 1rem !important; right: 1rem !important; z-index: 9999 !important;';
            blockedDiv.innerHTML = \`
              <div class="flex items-start">
                <i class="fas fa-exclamation-triangle mr-3 text-xl mt-1"></i>
                <div class="flex-1">
                  <div class="font-semibold mb-2">Popup Blocked</div>
                  <div class="text-sm text-yellow-100 mb-3">Your browser blocked the payment window. Click below to complete your purchase:</div>
                  <a href="\${checkoutUrl}" target="_blank" 
                     class="inline-block bg-white text-yellow-600 px-4 py-2 rounded font-semibold text-sm hover:bg-yellow-50 transition-colors">
                    <i class="fas fa-external-link-alt mr-2"></i>Open Payment Page
                  </a>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-yellow-200 hover:text-white">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            \`;
            
            document.body.appendChild(blockedDiv);
            console.log('⚠️ Popup blocked message displayed');
            
            // Auto-remove after 15 seconds (longer than success message)
            setTimeout(() => {
              if (blockedDiv.parentNode) {
                blockedDiv.style.opacity = '0';
                blockedDiv.style.transition = 'opacity 0.3s ease-out';
                setTimeout(() => {
                  blockedDiv.remove();
                  console.log('🗑️ Popup blocked message removed');
                }, 300);
              }
            }, 15000);
          }
          
          function showErrorModal(title, message, contactEmail) {
            // Close any underlying modals first and restore body scroll
            const paymentModal = document.getElementById('payment-modal');
            const demoModal = document.getElementById('demo-modal');
            if (paymentModal) {
              paymentModal.remove();
              console.log('🔄 Closed payment modal before showing error');
            }
            if (demoModal) {
              demoModal.remove();
              console.log('🔄 Closed demo modal before showing error');
            }
            
            // Keep body overflow hidden for error modal
            document.body.style.overflow = 'hidden';
            
            const errorModalHTML = \`
              <div id="error-modal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" style="z-index: 20000 !important;">
                <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                  <div class="bg-red-600 text-white p-6 rounded-t-2xl">
                    <div class="flex items-center">
                      <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-4">
                        <i class="fas fa-exclamation-triangle text-xl"></i>
                      </div>
                      <h3 class="text-xl font-bold">\${title}</h3>
                    </div>
                  </div>
                  <div class="p-6">
                    <p class="text-gray-700 mb-4">\${message}</p>
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p class="text-sm text-blue-700">
                        <i class="fas fa-phone mr-2"></i>Need immediate help? Contact us:
                      </p>
                      <p class="font-semibold text-blue-800">\${contactEmail}</p>
                    </div>
                    <div class="flex gap-3">
                      <button onclick="closeErrorModal()" class="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                        Close
                      </button>
                      <button onclick="closeErrorModal(); showProfessionalPaymentModal()" class="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            \`;
            
            document.body.insertAdjacentHTML('beforeend', errorModalHTML);
          }
          
          window.closeErrorModal = function() {
            const modal = document.getElementById('error-modal');
            if (modal) {
              modal.remove();
              document.body.style.overflow = '';
              console.log('✅ Error modal closed, body scroll restored');
            }
          };
          
          function showSuccessModal(title, message, onConfirm) {
            // Close any underlying modals first and restore body scroll
            const paymentModal = document.getElementById('payment-modal');
            const demoModal = document.getElementById('demo-modal');
            if (paymentModal) {
              paymentModal.remove();
              console.log('🔄 Closed payment modal before showing success');
            }
            if (demoModal) {
              demoModal.remove();
              console.log('🔄 Closed demo modal before showing success');
            }
            
            // Keep body overflow hidden for success modal
            document.body.style.overflow = 'hidden';
            
            const successModalHTML = \`
              <div id="success-modal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" style="z-index: 20000 !important;">
                <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                  <div class="bg-green-600 text-white p-6 rounded-t-2xl">
                    <div class="flex items-center">
                      <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-4">
                        <i class="fas fa-check text-xl"></i>
                      </div>
                      <h3 class="text-xl font-bold">\${title}</h3>
                    </div>
                  </div>
                  <div class="p-6">
                    <p class="text-gray-700 mb-6 whitespace-pre-line">\${message}</p>
                    <div class="flex gap-3">
                      <button onclick="closeSuccessModal()" class="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                        Close
                      </button>
                      <button onclick="closeSuccessModal(); \${onConfirm ? '(' + onConfirm + ')()' : ''}" class="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            \`;
            
            document.body.insertAdjacentHTML('beforeend', successModalHTML);
          }
          
          window.closeSuccessModal = function() {
            const modal = document.getElementById('success-modal');
            if (modal) {
              modal.remove();
              document.body.style.overflow = '';
              console.log('✅ Success modal closed, body scroll restored');
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
          
          // Professional Demo Modal System
          window.showDemoModal = function() {
            console.log('🎯 Opening Professional Demo Modal');
            
            // Remove any existing modals
            const existingModal = document.getElementById('demo-modal');
            if (existingModal) {
              existingModal.remove();
            }
            
            const modalHTML = \`
              <div id="demo-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style="z-index: 10000 !important;">
                <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
                  <!-- Modal Header -->
                  <div class="bg-gradient-to-r from-green-600 to-blue-600 rounded-t-2xl p-6">
                    <div class="flex justify-between items-center text-white">
                      <div class="flex items-center">
                        <i class="fas fa-rocket text-2xl mr-4"></i>
                        <div>
                          <h2 class="text-2xl font-bold">Try AssetShield Pro Demo</h2>
                          <p class="text-green-100">14-Day Free Trial • No Credit Card Required</p>
                        </div>
                      </div>
                      <button onclick="closeDemoModal()" class="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                        <i class="fas fa-times text-xl"></i>
                      </button>
                    </div>
                  </div>
                  
                  <!-- Modal Content -->
                  <div class="p-8">
                    <!-- Demo Benefits -->
                    <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-6 border border-green-200">
                      <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-star text-green-600 mr-3"></i>
                        What's Included in Your Demo
                      </h3>
                      <div class="grid md:grid-cols-2 gap-4">
                        <div class="flex items-start">
                          <i class="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                          <div>
                            <strong class="text-gray-800">Full Platform Access</strong>
                            <p class="text-gray-600 text-sm">Complete AssetShield Pro functionality</p>
                          </div>
                        </div>
                        <div class="flex items-start">
                          <i class="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                          <div>
                            <strong class="text-gray-800">Sample Client Data</strong>
                            <p class="text-gray-600 text-sm">Real workflows and analytics</p>
                          </div>
                        </div>
                        <div class="flex items-start">
                          <i class="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                          <div>
                            <strong class="text-gray-800">Live Support</strong>
                            <p class="text-gray-600 text-sm">Personal onboarding assistance</p>
                          </div>
                        </div>
                        <div class="flex items-start">
                          <i class="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                          <div>
                            <strong class="text-gray-800">No Commitments</strong>
                            <p class="text-gray-600 text-sm">Cancel anytime during trial</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Demo Form -->
                    <div class="space-y-4">
                      <div class="grid md:grid-cols-2 gap-4">
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-user text-blue-600 mr-2"></i>Attorney Name *
                          </label>
                          <input type="text" id="demo-attorney-name" 
                                 class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                                 placeholder="Enter your full name" required />
                        </div>
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-building text-blue-600 mr-2"></i>Law Firm Name *
                          </label>
                          <input type="text" id="demo-firm-name" 
                                 class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                                 placeholder="Enter your firm name" required />
                        </div>
                      </div>
                      
                      <div class="grid md:grid-cols-2 gap-4">
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-envelope text-blue-600 mr-2"></i>Professional Email *
                          </label>
                          <input type="email" id="demo-email" 
                                 class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                                 placeholder="your@lawfirm.com" required />
                        </div>
                        <div>
                          <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-id-badge text-blue-600 mr-2"></i>State Bar Number
                          </label>
                          <input type="text" id="demo-bar-number" 
                                 class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                                 placeholder="Optional" />
                        </div>
                      </div>
                    </div>
                    
                    <!-- Security Notice -->
                    <div class="bg-blue-50 rounded-lg p-4 mt-6">
                      <div class="flex items-center">
                        <i class="fas fa-shield-alt text-blue-600 text-xl mr-3"></i>
                        <div>
                          <h4 class="font-bold text-blue-800">Secure Professional Demo</h4>
                          <p class="text-blue-700 text-sm">
                            🔒 Your information is secure • ⚡ Instant access • 📞 Live support included
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Modal Footer -->
                  <div class="bg-gray-50 px-8 py-6 rounded-b-2xl border-t border-gray-200">
                    <div class="flex flex-col sm:flex-row gap-4">
                      <button type="button" onclick="closeDemoModal()" 
                              class="flex-1 py-3 px-6 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Page
                      </button>
                      <button type="button" onclick="processLiveDemoStart()" 
                              class="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-blue-700 transition-all transform hover:scale-105">
                        <i class="fas fa-rocket mr-2"></i>Start Demo - Free 14 Days
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            \`;
            
            // Add modal to DOM
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Prevent background scrolling
            document.body.style.overflow = 'hidden';
            
            // Focus first input
            setTimeout(() => {
              document.getElementById('demo-attorney-name')?.focus();
            }, 100);
          };
          
          window.closeDemoModal = function() {
            console.log('🔄 Closing demo modal...');
            const modal = document.getElementById('demo-modal');
            if (modal) {
              modal.style.display = 'none';
              setTimeout(() => {
                modal.remove();
                document.body.style.overflow = '';
                console.log('✅ Demo modal closed and removed');
              }, 50);
            }
          };
          
          window.processLiveDemoStart = function() {
            // Collect demo form data
            const demoForm = {
              attorneyName: document.getElementById('demo-attorney-name')?.value || '',
              firmName: document.getElementById('demo-firm-name')?.value || '',
              email: document.getElementById('demo-email')?.value || '',
              barNumber: document.getElementById('demo-bar-number')?.value || ''
            };
            
            // Professional validation with modal error display
            if (!demoForm.attorneyName || !demoForm.email || !demoForm.firmName) {
              showErrorModal(
                'Required Information Missing',
                'Please fill in your name, firm name, and email address to start the demo.',
                null
              );
              return;
            }
            
            // Email validation
            const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
            if (!emailRegex.test(demoForm.email)) {
              showErrorModal(
                'Invalid Email Address',
                'Please enter a valid professional email address to continue.',
                null
              );
              return;
            }
            
            // Show loading state
            const button = document.querySelector('[onclick="processLiveDemoStart()"]');
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Launching Demo Platform...';
            button.disabled = true;
            

            
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
                // Close demo modal
                closeDemoModal();
                
                // Show professional success modal
                showSuccessModal(
                  'Demo Platform Ready!',
                  \`Welcome to AssetShield Pro, \${demoForm.attorneyName}!\\n\\nYour 14-day free trial is now active for \${demoForm.firmName}.\\n\\nYou'll be redirected to your demo platform with:\\n• Sample client data and workflows\\n• Full platform functionality\\n• Live analytics dashboard\\n• Complete asset protection tools\\n\\nDemo ID: \${data.demoId}\\nTrial expires: \${new Date(data.expiresAt).toLocaleDateString()}\\n\\nA confirmation email has been sent to \${demoForm.email}\`,
                  () => {
                    // Redirect to demo dashboard
                    window.open(data.loginUrl, '_blank');
                  }
                );
              } else {
                throw new Error(data.error || 'Failed to start demo');
              }
            })
            .catch(error => {
              console.error('Demo start error:', error);
              
              // Reset button
              button.innerHTML = originalHTML;
              button.disabled = false;
              
              // Show professional error modal
              showErrorModal(
                'Demo Setup Error',
                \`Demo setup failed: \${error.message}\\n\\nAs a fallback, you can explore the platform features below or contact our team directly.\\n\\nWe apologize for the inconvenience and will resolve this issue quickly.\`,
                'support@isuccesshub.com'
              );
            })
            .finally(() => {
              // Reset form after slight delay (only if modal still exists)
              setTimeout(() => {
                const modal = document.getElementById('demo-modal');
                if (modal) {
                  document.getElementById('demo-attorney-name').value = '';
                  document.getElementById('demo-firm-name').value = '';
                  document.getElementById('demo-email').value = '';
                  document.getElementById('demo-bar-number').value = '';
                  
                  // Reset button
                  if (button && !button.disabled) {
                    button.innerHTML = originalHTML;
                    button.disabled = false;
                  }
                }
              }, 1000);
            });
          };
          
          // Legacy function for backward compatibility
          window.startLiveDemo = function() {
            // Check if we're in a modal context or regular page context
            const demoInputs = document.querySelectorAll('#demo-attorney-name, #demo-firm-name, #demo-email');
            const hasVisibleInputs = Array.from(demoInputs).some(input => input.offsetParent !== null);
            
            if (hasVisibleInputs) {
              // We have visible demo inputs, process directly
              processLiveDemoStart();
            } else {
              // No visible inputs, show the professional modal
              showDemoModal();
            }
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