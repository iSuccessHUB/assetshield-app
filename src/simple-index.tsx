import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// Health check API
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.6'
  })
})

// PWA Manifest
app.get('/manifest.json', (c) => {
  const manifest = {
    "name": "AssetShield App",
    "short_name": "AssetShield",
    "description": "Asset protection platform",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#1e40af",
    "theme_color": "#1e40af",
    "icons": [
      {
        "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "sizes": "192x192",
        "type": "image/png"
      }
    ]
  }
  
  c.header('Content-Type', 'application/json')
  return c.json(manifest)
})

// Service Worker
app.get('/sw.js', (c) => {
  c.header('Content-Type', 'text/javascript')
  return c.text(`
const CACHE_NAME = 'assetshield-v1'
self.addEventListener('install', (event) => {
  console.log('Service Worker installed')
})
self.addEventListener('fetch', (event) => {
  // Basic fetch handling
})
  `)
})

// Main homepage with embedded styles
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AssetShield App - Asset Protection Platform</title>
        <meta name="description" content="Complete asset protection platform">
        <meta name="theme-color" content="#1e40af">
        <link rel="manifest" href="/manifest.json">
        
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
                min-height: 100vh;
                color: white;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
            }
            
            .header {
                text-align: center;
                padding: 80px 0;
            }
            
            .title {
                font-size: 3.5rem;
                font-weight: bold;
                margin-bottom: 1rem;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            
            .subtitle {
                font-size: 1.5rem;
                margin-bottom: 2rem;
                color: #a5b4fc;
            }
            
            .description {
                font-size: 1.1rem;
                margin-bottom: 3rem;
                max-width: 600px;
                margin-left: auto;
                margin-right: auto;
                line-height: 1.8;
            }
            
            .features {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 2rem;
                margin: 4rem 0;
            }
            
            .feature-card {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 2rem;
                text-align: center;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .feature-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            
            .feature-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                display: block;
            }
            
            .feature-title {
                font-size: 1.3rem;
                font-weight: 600;
                margin-bottom: 1rem;
            }
            
            .feature-description {
                color: #a5b4fc;
                line-height: 1.6;
            }
            
            .cta-section {
                text-align: center;
                margin: 4rem 0;
            }
            
            .cta-button {
                background: #2563eb;
                color: white;
                padding: 15px 40px;
                font-size: 1.1rem;
                font-weight: 600;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-block;
                box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
            }
            
            .cta-button:hover {
                background: #1d4ed8;
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
            }
            
            .shield-icon {
                color: #60a5fa;
                margin-right: 0.5rem;
            }
            
            @media (max-width: 768px) {
                .title {
                    font-size: 2.5rem;
                }
                
                .container {
                    padding: 0 15px;
                }
                
                .features {
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                }
                
                .header {
                    padding: 60px 0;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="title">
                    <span class="shield-icon">🛡️</span>
                    AssetShield App
                </h1>
                <p class="subtitle">Complete Asset Protection Platform</p>
                <p class="description">
                    Discover your asset protection risk level, explore tailored strategies, 
                    and access comprehensive educational resources to safeguard your wealth.
                </p>
            </div>
            
            <div class="features">
                <div class="feature-card">
                    <span class="feature-icon">📊</span>
                    <h3 class="feature-title">Risk Assessment</h3>
                    <p class="feature-description">Comprehensive risk evaluation system</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">🎓</span>
                    <h3 class="feature-title">Education Center</h3>
                    <p class="feature-description">Expert knowledge and resources</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">👥</span>
                    <h3 class="feature-title">Professional Network</h3>
                    <p class="feature-description">Connect with asset protection experts</p>
                </div>
            </div>
            
            <div class="cta-section">
                <button class="cta-button" onclick="handleGetStarted()">
                    Get Started
                </button>
            </div>
        </div>
        
        <script>
            function handleGetStarted() {
                alert('Risk assessment system will be loaded here in the full version!');
            }
            
            // Register service worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => console.log('SW registered:', registration))
                    .catch(error => console.log('SW registration failed:', error));
            }
            
            console.log('AssetShield App loaded successfully!');
        </script>
    </body>
    </html>
  `)
})

export default app