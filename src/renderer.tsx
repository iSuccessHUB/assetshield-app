import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <title>AssetShield App - Complete Asset Protection Platform</title>
        <meta name="description" content="Discover your asset protection risk level, explore tailored strategies, and access comprehensive educational resources to safeguard your wealth." />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="AssetShield App" />
        <meta name="apple-mobile-web-app-title" content="AssetShield" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1e40af" />
        <meta name="msapplication-TileColor" content="#1e40af" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Security Headers */}
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.tailwindcss.com cdn.jsdelivr.net js.stripe.com *.googlesyndication.com *.googletagservices.com *.doubleclick.net *.google.com tpc.googlesyndication.com; script-src-elem 'self' 'unsafe-inline' cdn.tailwindcss.com cdn.jsdelivr.net js.stripe.com *.googlesyndication.com *.googletagservices.com *.doubleclick.net *.google.com; style-src 'self' 'unsafe-inline' cdn.tailwindcss.com cdn.jsdelivr.net *.googlesyndication.com; img-src 'self' data: https: *.googlesyndication.com *.doubleclick.net *.google.com; font-src 'self' cdn.jsdelivr.net; connect-src 'self' api.stripe.com nominatim.openstreetmap.org *.googlesyndication.com *.googletagservices.com *.doubleclick.net *.google.com ep1.adtrafficquality.google; frame-src 'self' js.stripe.com *.googlesyndication.com *.doubleclick.net *.google.com;" />
        <meta http-equiv="X-Content-Type-Options" content="nosniff" />
        <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
        <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        
        {/* External Libraries */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{__html: `
          tailwind.config = {
            theme: {
              extend: {
                animation: {
                  'fade-in': 'fadeIn 0.5s ease-in-out',
                  'slide-up': 'slideUp 0.3s ease-out',
                  'pulse-slow': 'pulse 3s infinite',
                }
              }
            }
          }
        `}}></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://js.stripe.com/v3/"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
        
        {/* Custom Styles */}
        <link href="/static/styles.css" rel="stylesheet" />
        
        {/* Custom Styles as fallback */}
        <style dangerouslySetInnerHTML={{__html: `
          * {
            -webkit-tap-highlight-color: transparent;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-font-smoothing: antialiased;
          }

          .form-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            font-size: 1rem;
            transition: all 0.2s;
          }
          
          .form-input:focus {
            outline: none;
            ring: 2px;
            ring-color: #3b82f6;
            border-color: transparent;
          }

          .btn {
            min-height: 44px;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
          .animate-slide-up { animation: slideUp 0.3s ease-out; }
          
          @media (max-width: 768px) {
            .container { padding-left: 1rem; padding-right: 1rem; }
          }
          
          @media (hover: none) and (pointer: coarse) {
            button, .btn, [onclick] { min-height: 44px; min-width: 44px; }
          }
        `}}></style>
      </head>
      <body>
        {/* Loading Screen */}
        <div id="loading-screen" className="fixed inset-0 bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse-slow">
              <i className="fas fa-shield-alt text-white text-2xl"></i>
            </div>
            <div className="text-white text-lg font-semibold">AssetShield App</div>
            <div className="text-blue-200 text-sm mt-2">Loading your protection platform...</div>
          </div>
        </div>
        
        {children}
        
        {/* Offline Indicator */}
        <div id="offline-indicator" className="hidden fixed bottom-4 left-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <i className="fas fa-wifi mr-2"></i>
          <span>You're offline. Data will sync when reconnected.</span>
        </div>
        
        {/* Install Prompt */}
        <div id="install-prompt" className="hidden fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold mb-1">Install AssetShield App</div>
              <div className="text-sm opacity-90">Add to your home screen for quick access</div>
              <div className="mt-3 flex space-x-2">
                <button id="install-yes" className="px-3 py-1 bg-white/20 rounded text-sm">Install</button>
                <button id="install-no" className="px-3 py-1 bg-white/10 rounded text-sm">Later</button>
              </div>
            </div>
            <button id="install-close" className="text-white/80 hover:text-white">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        {/* Service Worker Registration */}
        <script dangerouslySetInnerHTML={{__html: `
          // Register service worker
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                  console.log('SW registered: ', registration);
                })
                .catch(function(registrationError) {
                  console.log('SW registration failed: ', registrationError);
                });
            });
          }
          
          // PWA Install Prompt
          let deferredPrompt;
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('install-prompt').classList.remove('hidden');
          });
          
          document.addEventListener('DOMContentLoaded', function() {
            const installYes = document.getElementById('install-yes');
            const installNo = document.getElementById('install-no');
            const installClose = document.getElementById('install-close');
            
            if (installYes) {
              installYes.addEventListener('click', (e) => {
                document.getElementById('install-prompt').classList.add('hidden');
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                      console.log('User accepted the install prompt');
                    }
                    deferredPrompt = null;
                  });
                }
              });
            }
            
            if (installNo) {
              installNo.addEventListener('click', (e) => {
                document.getElementById('install-prompt').classList.add('hidden');
              });
            }
            
            if (installClose) {
              installClose.addEventListener('click', (e) => {
                document.getElementById('install-prompt').classList.add('hidden');
              });
            }
          });
          
          // Offline/Online Status
          function updateOnlineStatus() {
            const indicator = document.getElementById('offline-indicator');
            if (navigator.onLine) {
              indicator.classList.add('hidden');
            } else {
              indicator.classList.remove('hidden');
            }
          }
          
          window.addEventListener('online', updateOnlineStatus);
          window.addEventListener('offline', updateOnlineStatus);
          
          // Hide loading screen after page load
          window.addEventListener('load', function() {
            setTimeout(function() {
              const loadingScreen = document.getElementById('loading-screen');
              if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(function() {
                  loadingScreen.style.display = 'none';
                }, 300);
              }
            }, 500);
          });
          
          // Prevent zoom on iOS
          document.addEventListener('gesturestart', function (e) {
            e.preventDefault();
          });
        `}}></script>
        
        {/* Custom JavaScript */}
        <script src="/static/app.js"></script>
        
        {/* Google AdSense Integration */}
        <script src="/static/adsense.js"></script>
      </body>
    </html>
  )
})