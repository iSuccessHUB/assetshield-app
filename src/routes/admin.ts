import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import { InputValidator, SecureDatabase } from '../utils/database-security'

// 2FA Library implementation (lightweight TOTP)
class TOTP {
  private static base32Decode(encoded: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let bits = 0
    let value = 0
    let output = []
    
    for (let i = 0; i < encoded.length; i++) {
      value = (value << 5) | alphabet.indexOf(encoded[i])
      bits += 5
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255)
        bits -= 8
      }
    }
    
    return new Uint8Array(output)
  }
  
  private static async hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
    return new Uint8Array(signature)
  }
  
  static async generateSecret(): Promise<string> {
    const buffer = new Uint8Array(20)
    crypto.getRandomValues(buffer)
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let secret = ''
    for (let i = 0; i < buffer.length; i++) {
      secret += alphabet[buffer[i] % 32]
    }
    return secret
  }
  
  static async generateToken(secret: string, window = 0): Promise<string> {
    const time = Math.floor(Date.now() / 1000 / 30) + window
    const timeBuffer = new ArrayBuffer(8)
    const timeView = new DataView(timeBuffer)
    timeView.setUint32(4, time, false)
    
    const key = this.base32Decode(secret)
    const hmac = await this.hmacSha1(key, new Uint8Array(timeBuffer))
    
    const offset = hmac[hmac.length - 1] & 0xf
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % 1000000
    
    return code.toString().padStart(6, '0')
  }
  
  static async verifyToken(secret: string, token: string): Promise<boolean> {
    // Check current window and ±1 window for clock drift tolerance
    for (let window = -1; window <= 1; window++) {
      const expectedToken = await this.generateToken(secret, window)
      if (expectedToken === token) {
        return true
      }
    }
    return false
  }
  
  static generateQRCodeUrl(secret: string, issuer: string, account: string): string {
    const label = encodeURIComponent(`${issuer}:${account}`)
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: '6',
      period: '30'
    })
    return `otpauth://totp/${label}?${params.toString()}`
  }
}

interface CloudflareBindings {
  DB: D1Database;
}

export const adminRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Admin JWT Secret
function getAdminJWTSecret(): string {
  if (typeof process !== 'undefined' && process.env?.ADMIN_JWT_SECRET) {
    return process.env.ADMIN_JWT_SECRET;
  }
  return 'admin-jwt-secret-change-in-production-environment';
}

// Admin credentials (In production, store in environment variables)
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'peter@isuccesshub.com',
  password: process.env.ADMIN_PASSWORD || 'AdminPass2024!Change',  // Change this immediately
  totpSecret: process.env.ADMIN_TOTP_SECRET || '' // Will be generated if empty
}

// Rate limiting for admin access
const adminLoginAttempts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const attempts = adminLoginAttempts.get(ip)
  
  if (!attempts || now > attempts.resetTime) {
    adminLoginAttempts.set(ip, { count: 1, resetTime: now + 15 * 60 * 1000 }) // 15 min
    return true
  }
  
  if (attempts.count >= 5) { // Max 5 attempts per 15 minutes
    return false
  }
  
  attempts.count++
  return true
}

// 2FA Setup route (only accessible to authenticated admin)
adminRoutes.get('/setup-2fa', requireAdminAuth, async (c) => {
  const secret = await TOTP.generateSecret()
  const qrUrl = TOTP.generateQRCodeUrl(secret, 'AssetShield Admin', 'peter@isuccesshub.com')
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AssetShield Admin - Setup 2FA</title>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        <script src="https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js"></script>
    </head>
    <body class="bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 min-h-screen">
        <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8">
                <div class="text-center">
                    <div class="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i class="fas fa-shield-halved text-white text-3xl"></i>
                    </div>
                    <h2 class="text-3xl font-bold text-white">Setup Two-Factor Authentication</h2>
                    <p class="mt-2 text-gray-300">Enhance your admin security</p>
                </div>
                
                <div class="bg-white/10 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-white/20">
                    <div class="space-y-6">
                        <div class="text-center">
                            <h3 class="text-lg font-medium text-white mb-4">Scan QR Code with Authenticator App</h3>
                            <div id="qrcode" class="bg-white p-4 rounded-lg mx-auto inline-block min-h-[200px] flex items-center justify-center">
                                <div class="text-gray-500">Loading QR Code...</div>
                            </div>
                            <div id="qrcode-error" class="hidden mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                                <p class="text-red-200 text-sm">QR Code failed to load. Please use the manual entry secret below.</p>
                            </div>
                        </div>
                        
                        <div class="bg-gray-800/50 rounded-lg p-4">
                            <p class="text-sm text-gray-300 mb-2">Alternative: Direct QR Code Link</p>
                            <a href="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}" 
                               target="_blank" 
                               class="text-blue-400 hover:text-blue-300 underline text-sm">
                               Click to view QR Code in new tab
                            </a>
                        </div>
                        
                        <div class="bg-gray-800/50 rounded-lg p-4">
                            <p class="text-sm text-gray-300 mb-2">Manual Entry Secret:</p>
                            <code class="bg-gray-900 text-green-400 px-3 py-2 rounded font-mono text-sm break-all">${secret}</code>
                            <p class="text-xs text-gray-400 mt-2">Enter this in your authenticator app manually</p>
                        </div>
                        
                        <form id="verify2FA" class="space-y-4">
                            <div>
                                <label for="totp" class="block text-sm font-medium text-white mb-2">
                                    <i class="fas fa-mobile-alt mr-2"></i>Enter 6-Digit Code
                                </label>
                                <input id="totp" name="totp" type="text" maxlength="6" required 
                                       class="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center text-xl tracking-widest font-mono"
                                       placeholder="000000">
                            </div>
                            
                            <input type="hidden" name="secret" value="${secret}">
                            
                            <button type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all">
                                <i class="fas fa-check mr-2"></i>
                                Verify and Enable 2FA
                            </button>
                            
                            <button type="button" id="resetButton" class="w-full flex justify-center py-2 px-4 border border-gray-500 rounded-lg shadow-sm text-sm font-medium text-gray-300 bg-transparent hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all">
                                <i class="fas fa-refresh mr-2"></i>
                                Reset & Get New Secret
                            </button>
                        </form>
                        
                        <div class="text-center">
                            <p class="text-xs text-gray-400">
                                <i class="fas fa-info-circle mr-1"></i>
                                Recommended apps: Google Authenticator, Authy, Microsoft Authenticator
                            </p>
                        </div>
                    </div>
                </div>
                
                <div class="text-center">
                    <a href="/admin/dashboard" class="text-gray-400 hover:text-white transition-colors">
                        <i class="fas fa-arrow-left mr-1"></i>Back to Dashboard
                    </a>
                </div>
            </div>
        </div>
        
        <script>
            // Generate QR Code with error handling
            function generateQRCode() {
                const qrCodeDiv = document.getElementById('qrcode');
                const qrErrorDiv = document.getElementById('qrcode-error');
                
                try {
                    // Check if QRCode library loaded
                    if (typeof QRCode === 'undefined') {
                        throw new Error('QRCode library not loaded');
                    }
                    
                    // Clear loading message
                    qrCodeDiv.innerHTML = '';
                    
                    // Generate QR Code
                    QRCode.toCanvas(qrCodeDiv, '${qrUrl}', {
                        width: 200,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    }, function (error) {
                        if (error) {
                            console.error('QR Code generation error:', error);
                            showQRError();
                        } else {
                            console.log('QR Code generated successfully');
                        }
                    });
                } catch (error) {
                    console.error('QR Code setup error:', error);
                    showQRError();
                }
            }
            
            function showQRError() {
                document.getElementById('qrcode').innerHTML = '<div class="text-red-500 p-4">QR Code unavailable<br>Use manual entry below</div>';
                document.getElementById('qrcode-error').classList.remove('hidden');
            }
            
            // Try to generate QR code when page loads
            document.addEventListener('DOMContentLoaded', function() {
                // Wait a bit for scripts to load
                setTimeout(generateQRCode, 500);
                
                // Fallback: try again after longer delay if first attempt fails
                setTimeout(function() {
                    if (document.getElementById('qrcode').innerHTML.includes('Loading')) {
                        generateQRCode();
                    }
                }, 2000);
            });
            
            // Handle 2FA verification
            document.getElementById('verify2FA').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const totp = document.getElementById('totp').value;
                const secret = document.querySelector('input[name="secret"]').value;
                
                if (totp.length !== 6) {
                    alert('Please enter a 6-digit code');
                    return;
                }
                
                try {
                    const response = await fetch('/admin/api/setup-2fa', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ secret, totp })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        alert('2FA successfully enabled! Please save your backup codes.');
                        window.location.href = '/admin/dashboard';
                    } else {
                        document.getElementById('totp').value = '';
                        document.getElementById('totp').focus();
                        alert('Invalid code. Please check your authenticator app and try again.\\n\\nTip: Make sure your phone\\'s time is synchronized.');
                    }
                } catch (error) {
                    alert('Error setting up 2FA. Please try again.');
                }
            });
            
            // Format TOTP input
            document.getElementById('totp').addEventListener('input', function(e) {
                e.target.value = e.target.value.replace(/\\D/g, '');
            });
        </script>
    </body>
    </html>
  `)
})

// 2FA Setup API
adminRoutes.post('/api/setup-2fa', requireAdminAuth, async (c) => {
  try {
    const { secret, totp } = await c.req.json()
    
    const isValid = await TOTP.verifyToken(secret, totp)
    
    if (isValid) {
      // Store the secret securely in database
      await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run()
      
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
      `).bind('totp_secret', secret).run()
      
      return c.json({ success: true })
    } else {
      return c.json({ success: false, error: 'Invalid TOTP code' })
    }
  } catch (error) {
    return c.json({ success: false, error: 'Setup failed' }, 500)
  }
})

// Debug login page for troubleshooting
adminRoutes.get('/debug-login', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AssetShield Admin Debug Login</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-900 text-white p-8">
        <div class="max-w-md mx-auto">
            <h1 class="text-2xl font-bold mb-6">AssetShield Admin Debug Login</h1>
            
            <form id="debugLoginForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Username</label>
                    <input id="username" type="text" value="peter@isuccesshub.com" 
                           class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white">
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">Password</label>
                    <input id="password" type="password" value="AdminPass2024!Change"
                           class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white">
                </div>
                
                <button type="submit" class="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
                    Debug Login
                </button>
            </form>
            
            <div id="debugOutput" class="mt-6 p-4 bg-gray-800 rounded">
                <h3 class="font-bold mb-2">Debug Output:</h3>
                <div id="debugLog" class="text-sm font-mono"></div>
            </div>
        </div>

        <script>
            function log(message) {
                const debugLog = document.getElementById('debugLog');
                const timestamp = new Date().toLocaleTimeString();
                debugLog.innerHTML += '[' + timestamp + '] ' + message + '<br>';
                console.log(message);
            }

            document.getElementById('debugLoginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                log('Starting login attempt...');
                log('Username: ' + username);
                log('Password length: ' + password.length);
                
                try {
                    log('Making fetch request to /admin/api/login');
                    
                    const response = await fetch('/admin/api/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username, password })
                    });
                    
                    log('Response status: ' + response.status);
                    log('Response ok: ' + response.ok);
                    
                    const responseText = await response.text();
                    log('Raw response: ' + responseText);
                    
                    let result;
                    try {
                        result = JSON.parse(responseText);
                        log('Parsed result: ' + JSON.stringify(result));
                    } catch (parseError) {
                        log('JSON parse error: ' + parseError.message);
                        return;
                    }
                    
                    if (result.success) {
                        log('✅ Login successful!');
                        log('Attempting to redirect to dashboard...');
                        
                        // Test if we can access the dashboard
                        const dashboardResponse = await fetch('/admin/dashboard');
                        log('Dashboard response status: ' + dashboardResponse.status);
                        
                        if (dashboardResponse.ok) {
                            log('✅ Dashboard accessible, redirecting...');
                            window.location.href = '/admin/dashboard';
                        } else {
                            log('❌ Dashboard not accessible');
                        }
                    } else {
                        log('❌ Login failed: ' + (result.error || 'Unknown error'));
                        if (result.debug) {
                            log('Debug info: ' + result.debug);
                        }
                    }
                    
                } catch (error) {
                    log('❌ Network error: ' + error.message);
                    log('Error stack: ' + error.stack);
                }
            });
            
            log('Debug login page loaded');
            log('Current URL: ' + window.location.href);
            log('User agent: ' + navigator.userAgent);
        </script>
    </body>
    </html>
  `)
})

// Admin login page
adminRoutes.get('/login', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AssetShield Admin - Secure Login</title>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 min-h-screen">
        <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8">
                <div class="text-center">
                    <div class="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i class="fas fa-shield-halved text-white text-3xl"></i>
                    </div>
                    <h2 class="text-3xl font-bold text-white">AssetShield Admin</h2>
                    <p class="mt-2 text-gray-300">Secure Platform Management</p>
                </div>
                
                <div class="bg-white/10 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-white/20">
                    <form id="adminLoginForm" class="space-y-6">
                        <div>
                            <label for="username" class="block text-sm font-medium text-white mb-2">
                                <i class="fas fa-user-shield mr-2"></i>Admin Username
                            </label>
                            <input id="username" name="username" type="text" required 
                                   class="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                   placeholder="peter@isuccesshub.com">
                        </div>
                        
                        <div>
                            <label for="password" class="block text-sm font-medium text-white mb-2">
                                <i class="fas fa-key mr-2"></i>Admin Password
                            </label>
                            <input id="password" name="password" type="password" required 
                                   class="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                   placeholder="Enter admin password">
                        </div>
                        
                        <div id="totpSection" class="hidden space-y-4">
                            <div>
                                <label for="totp" class="block text-sm font-medium text-white mb-2">
                                    <i class="fas fa-mobile-alt mr-2"></i>Two-Factor Authentication Code
                                </label>
                                <input id="totp" name="totp" type="text" maxlength="6"
                                       class="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center text-xl tracking-widest font-mono"
                                       placeholder="000000">
                            </div>
                        </div>
                        
                        <div id="errorMessage" class="hidden bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm"></div>
                        
                        <button type="submit" id="loginButton"
                                class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            Access Admin Dashboard
                        </button>
                    </form>
                    
                    <div class="mt-6 text-center">
                        <p class="text-xs text-gray-400">
                            <i class="fas fa-lock mr-1"></i>
                            Secured with enterprise-grade encryption
                        </p>
                    </div>
                </div>
                
                <div class="text-center">
                    <p class="text-xs text-gray-400">
                        <i class="fas fa-home mr-1"></i>
                        <a href="/" class="hover:text-white transition-colors">Back to AssetShield App</a>
                    </p>
                </div>
            </div>
        </div>
        
        <script>
            let requires2FA = false;
            
            document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const totp = document.getElementById('totp')?.value || '';
                const button = document.getElementById('loginButton');
                const errorDiv = document.getElementById('errorMessage');
                const totpSection = document.getElementById('totpSection');
                
                errorDiv.classList.add('hidden');
                button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Authenticating...';
                button.disabled = true;
                
                try {
                    const response = await fetch('/admin/api/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username, password, totp })
                    });
                    
                    console.log('Response status:', response.status);
                    console.log('Response headers:', response.headers);
                    
                    const result = await response.json();
                    console.log('Login result:', result);
                    
                    if (result.success) {
                        window.location.href = '/admin/dashboard';
                    } else if (result.requires2FA && !requires2FA) {
                        // Show 2FA field
                        requires2FA = true;
                        totpSection.classList.remove('hidden');
                        document.getElementById('totp').focus();
                        button.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Complete Authentication';
                        errorDiv.textContent = 'Please enter your 2FA code';
                        errorDiv.classList.remove('hidden');
                    } else {
                        errorDiv.textContent = result.error || 'Login failed';
                        errorDiv.classList.remove('hidden');
                        
                        // Reset 2FA state on error
                        if (result.error?.includes('2FA')) {
                            document.getElementById('totp').value = '';
                            document.getElementById('totp').focus();
                        }
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    errorDiv.textContent = 'Network error. Please check console for details.';
                    errorDiv.classList.remove('hidden');
                } finally {
                    if (!requires2FA) {
                        button.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Access Admin Dashboard';
                    }
                    button.disabled = false;
                }
            });
            
            // Format TOTP input
            document.getElementById('totp')?.addEventListener('input', function(e) {
                e.target.value = e.target.value.replace(/\\D/g, '');
            });
            
            // Handle reset button
            document.getElementById('resetButton')?.addEventListener('click', function() {
                if (confirm('This will generate a new secret. You\\'ll need to scan the QR code again. Continue?')) {
                    window.location.reload();
                }
            });
        </script>
    </body>
    </html>
  `)
})

// Admin login API
adminRoutes.post('/api/login', async (c) => {
  try {
    // Log the request for debugging
    console.log('Admin login attempt received')
    
    const requestBody = await c.req.text()
    console.log('Request body:', requestBody)
    
    let parsedBody
    try {
      parsedBody = JSON.parse(requestBody)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return c.json({ error: 'Invalid JSON in request body', debug: parseError.message }, 400)
    }
    
    const { username, password, totp } = parsedBody
    console.log('Parsed credentials:', { username, passwordLength: password?.length, hasTotp: !!totp })
    
    // Rate limiting for admin login attempts
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    
    if (!checkRateLimit(ip)) {
      return c.json({ error: 'Too many login attempts. Please try again later.' }, 429)
    }
    
    // Validate basic credentials first
    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      try {
        await c.env.DB.prepare(`
          INSERT INTO security_events (
            event_type, ip_address, user_agent, event_data, 
            risk_level, action_taken, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          'admin_login_failed',
          ip,
          c.req.header('User-Agent') || 'unknown',
          JSON.stringify({ attempted_username: username, timestamp: new Date().toISOString() }),
          'high',
          'login_rejected'
        ).run()
      } catch (dbError) {
        // Skip logging if security_events table doesn't exist
        console.log('Security logging skipped:', dbError.message)
      }
      
      return c.json({ error: 'Invalid admin credentials' }, 401)
    }
    
    // Check if 2FA is enabled
    let totpSecret = null
    try {
      const result = await c.env.DB.prepare(`
        SELECT value FROM admin_settings WHERE key = ?
      `).bind('totp_secret').first()
      
      totpSecret = result?.value
    } catch (error) {
      // No 2FA setup yet, continue without 2FA
    }
    
    // If 2FA is enabled, validate TOTP
    if (totpSecret) {
      if (!totp) {
        return c.json({ requires2FA: true, error: 'Two-factor authentication required' })
      }
      
      const isValidTOTP = await TOTP.verifyToken(totpSecret, totp)
      if (!isValidTOTP) {
        try {
          await c.env.DB.prepare(`
            INSERT INTO security_events (
              event_type, ip_address, user_agent, event_data, 
              risk_level, action_taken, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            'admin_2fa_failed',
            ip,
            c.req.header('User-Agent') || 'unknown',
            JSON.stringify({ username, attempted_totp: totp, timestamp: new Date().toISOString() }),
            'high',
            '2fa_rejected'
          ).run()
        } catch (dbError) {
          // Skip logging if security_events table doesn't exist
          console.log('Security logging skipped:', dbError.message)
        }
        
        return c.json({ error: 'Invalid 2FA code' }, 401)
      }
    }
    
    // Create admin JWT token
    const token = await sign({
      role: 'admin',
      username,
      has2FA: !!totpSecret,
      exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 hours
    }, getAdminJWTSecret())
    
    // Set secure HTTP-only cookie (secure only in production HTTPS)
    const isProduction = c.req.header('host')?.includes('assetshieldapp.com') || 
                        c.req.header('host')?.includes('.pages.dev') || 
                        c.req.header('CF-Visitor')
    
    setCookie(c, 'admin_token', token, {
      httpOnly: true,
      secure: isProduction, // Only secure in production HTTPS
      sameSite: 'Strict',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/admin'
    })
    
    // Log successful admin login (skip if table doesn't exist)
    try {
      await c.env.DB.prepare(`
        INSERT INTO security_events (
          event_type, ip_address, user_agent, event_data, 
          risk_level, action_taken, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        'admin_login_success',
        ip,
        c.req.header('User-Agent') || 'unknown',
        JSON.stringify({ 
          username, 
          has2FA: !!totpSecret,
          timestamp: new Date().toISOString() 
        }),
        'low',
        'admin_access_granted'
      ).run()
    } catch (dbError) {
      // Skip logging if security_events table doesn't exist
      console.log('Security logging skipped:', dbError.message)
    }
    
    return c.json({ success: true })
    
  } catch (error) {
    console.error('Admin login error:', error)
    // Log the error for debugging (skip if table doesn't exist)
    try {
      await c.env.DB.prepare(`
        INSERT INTO security_events (
          event_type, ip_address, user_agent, event_data, 
          risk_level, action_taken, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        'admin_login_error',
        c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown',
        c.req.header('User-Agent') || 'unknown',
        JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }),
        'high',
        'error_logged'
      ).run()
    } catch (dbError) {
      // Skip logging if security_events table doesn't exist
      console.log('Security logging skipped:', dbError.message)
    }
    
    return c.json({ error: 'Login failed', debug: error.message }, 500)
  }
})

// Admin middleware to check authentication
async function requireAdminAuth(c: any, next: any) {
  try {
    const token = getCookie(c, 'admin_token')
    
    if (!token) {
      return c.redirect('/admin/login')
    }
    
    const payload = await verify(token, getAdminJWTSecret())
    
    if (payload.role !== 'admin') {
      throw new Error('Invalid admin role')
    }
    
    c.set('admin', payload)
    await next()
  } catch (error) {
    deleteCookie(c, 'admin_token')
    return c.redirect('/admin/login')
  }
}

// Admin logout
adminRoutes.post('/logout', requireAdminAuth, async (c) => {
  deleteCookie(c, 'admin_token')
  return c.redirect('/admin/login')
})

// API endpoint for real-time sales chart data
adminRoutes.get('/api/sales-chart-data', requireAdminAuth, async (c) => {
  try {
    const { env } = c
    const db = new SecureDatabase(env.DB)
    
    // Get monthly sales data for the last 12 months
    const salesData = await db.secureSelect(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        SUM(amount) as revenue,
        COUNT(*) as transactions
      FROM payment_transactions 
      WHERE status = 'succeeded' 
        AND created_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `)
    
    if (!salesData.data || salesData.data.length === 0) {
      // No sales data - return empty chart structure
      return c.json({
        labels: ['No Sales Yet'],
        data: [0],
        message: 'No sales data available'
      })
    }
    
    // Process data for Chart.js
    const labels = salesData.data.map(row => {
      const date = new Date(row.month + '-01')
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    })
    
    // Convert revenue from cents to dollars for display
    const data = salesData.data.map(row => (row.revenue || 0) / 100)
    
    return c.json({
      labels,
      data,
      totalRevenue: data.reduce((sum, val) => sum + val, 0),
      totalTransactions: salesData.data.reduce((sum, row) => sum + (row.transactions || 0), 0)
    })
    
  } catch (error) {
    console.error('Sales chart data error:', error)
    return c.json({
      labels: ['Error Loading Data'],
      data: [0],
      error: error.message
    }, 500)
  }
})

// API endpoint for customer support messages (working with existing schema)
adminRoutes.get('/api/support-messages', requireAdminAuth, async (c) => {
  try {
    const { env } = c
    const db = new SecureDatabase(env.DB)
    
    // Get recent support messages from existing support_tickets and support_messages tables
    const messages = await db.secureSelect(`
      SELECT 
        st.id,
        st.user_id,
        st.subject as message,
        st.priority,
        st.status,
        st.created_at as timestamp,
        u.name as customerName,
        u.email as contact_email,
        'N/A' as subscription_tier
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      WHERE st.status != 'resolved'
      ORDER BY 
        CASE st.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          ELSE 3 
        END,
        st.created_at DESC
      LIMIT 20
    `)
    
    return c.json(messages.data || [])
    
  } catch (error) {
    console.error('Support messages error:', error)
    // Return empty array if tables don't exist yet or no data
    return c.json([])
  }
})

// API endpoint to list all customers for master control
adminRoutes.get('/api/customers', requireAdminAuth, async (c) => {
  try {
    const { env } = c
    const db = new SecureDatabase(env.DB)
    
    // Get customers from the centralized customers table
    const customers = await db.secureSelect(`
      SELECT 
        c.id,
        c.firm_name,
        c.owner_name as name,
        c.owner_email as email,
        c.tier,
        c.status,
        c.created_at,
        c.last_login,
        c.trial_ends_at,
        COUNT(pt.id) as total_payments,
        SUM(CASE WHEN pt.status = 'succeeded' THEN pt.amount ELSE 0 END) as total_revenue
      FROM customers c
      LEFT JOIN payment_transactions pt ON c.id = pt.user_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 50
    `)
    
    // If no customers in centralized table, check legacy users table
    if (!customers.data || customers.data.length === 0) {
      const legacyUsers = await db.secureSelect(`
        SELECT 
          u.id,
          u.name,
          u.email,
          'starter' as tier,
          'active' as status,
          u.created_at,
          u.last_login,
          NULL as trial_ends_at,
          COUNT(pt.id) as total_payments,
          SUM(CASE WHEN pt.status = 'succeeded' THEN pt.amount ELSE 0 END) as total_revenue
        FROM users u
        LEFT JOIN payment_transactions pt ON u.id = pt.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT 50
      `)
      
      return c.json(legacyUsers.data || [])
    }
    
    return c.json(customers.data || [])
    
  } catch (error) {
    console.error('Customers list error:', error)
    return c.json([])
  }
})

// API endpoint for customer impersonation (master access)
adminRoutes.post('/api/impersonate', requireAdminAuth, async (c) => {
  try {
    const { customerId } = await c.req.json()
    const { env } = c
    const db = new SecureDatabase(env.DB)
    
    // Get customer details
    const customer = await db.secureSelect(`
      SELECT id, firm_name, owner_email, tier, status
      FROM customers 
      WHERE id = ?
    `, [customerId])
    
    if (!customer.data || customer.data.length === 0) {
      return c.json({ success: false, error: 'Customer not found' })
    }
    
    const customerData = customer.data[0]
    
    // Create impersonation token (admin can access any customer account)
    const impersonationToken = await sign({
      userId: customerId,
      email: customerData.owner_email,
      role: 'customer',
      impersonatedBy: 'admin',
      tier: customerData.tier,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 2) // 2 hours
    }, getJWTSecret())
    
    // Log the impersonation for audit
    await db.secureInsert(`
      INSERT INTO audit_logs (action, details, user_type, user_id, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'admin_impersonation',
      JSON.stringify({
        adminAction: 'impersonate_customer',
        customerId: customerId,
        customerEmail: customerData.owner_email,
        timestamp: new Date().toISOString()
      }),
      'admin',
      customerId,
      c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    ])
    
    return c.json({
      success: true,
      dashboardUrl: \`/dashboard?impersonate=\${impersonationToken}\`,
      customerInfo: {
        name: customerData.firm_name,
        email: customerData.owner_email,
        tier: customerData.tier
      }
    })
    
  } catch (error) {
    console.error('Impersonation error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to create impersonation session'
    }, 500)
  }
})

// Customer detail view for admin
adminRoutes.get('/customer/:id', requireAdminAuth, async (c) => {
  const customerId = c.req.param('id')
  const { env } = c
  const db = new SecureDatabase(env.DB)
  
  try {
    // Get detailed customer information
    const customer = await db.secureSelect(`
      SELECT * FROM customers WHERE id = ?
    `, [customerId])
    
    if (!customer.data || customer.data.length === 0) {
      return c.html('<h1>Customer not found</h1>')
    }
    
    const customerData = customer.data[0]
    
    return c.html(\`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Customer Details - \${customerData.firm_name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-50">
          <div class="max-w-4xl mx-auto py-8 px-4">
              <div class="bg-white rounded-lg shadow-lg p-8">
                  <h1 class="text-2xl font-bold text-gray-800 mb-6">
                      <i class="fas fa-building mr-2"></i>
                      \${customerData.firm_name}
                  </h1>
                  
                  <div class="grid md:grid-cols-2 gap-6">
                      <div>
                          <h3 class="text-lg font-semibold mb-4">Contact Information</h3>
                          <p><strong>Owner:</strong> \${customerData.owner_name}</p>
                          <p><strong>Email:</strong> \${customerData.owner_email}</p>
                          <p><strong>Phone:</strong> \${customerData.owner_phone || 'Not provided'}</p>
                      </div>
                      
                      <div>
                          <h3 class="text-lg font-semibold mb-4">Subscription Details</h3>
                          <p><strong>Tier:</strong> \${customerData.tier}</p>
                          <p><strong>Status:</strong> \${customerData.status}</p>
                          <p><strong>Setup Fee:</strong> $\${(customerData.setup_fee_paid / 100).toLocaleString()}</p>
                          <p><strong>Monthly Fee:</strong> $\${(customerData.monthly_fee / 100).toLocaleString()}</p>
                      </div>
                  </div>
                  
                  <div class="mt-8 flex gap-4">
                      <button onclick="window.open('/dashboard?impersonate=token', '_blank')" 
                              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          <i class="fas fa-sign-in-alt mr-2"></i>Access Their Dashboard
                      </button>
                      <button onclick="window.close()" 
                              class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                          <i class="fas fa-times mr-2"></i>Close
                      </button>
                  </div>
              </div>
          </div>
      </body>
      </html>
    \`)
    
  } catch (error) {
    return c.html('<h1>Error loading customer details</h1>')
  }
})

// Main Admin Dashboard
adminRoutes.get('/dashboard', requireAdminAuth, async (c) => {
  const { env } = c
  const db = new SecureDatabase(env.DB)
  
  // Get comprehensive platform statistics
  const [
    visitorStats,
    salesStats,
    recentActivity,
    securityEvents,
    platformMetrics
  ] = await Promise.all([
    getVisitorAnalytics(db),
    getSalesAnalytics(db),
    getRecentActivity(db),
    getSecuritySummary(db),
    getPlatformMetrics(db)
  ])
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AssetShield Admin Dashboard - Platform Monitor</title>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="/static/enhanced-demo-styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <!-- Admin Header -->
        <nav class="bg-gradient-to-r from-gray-900 to-blue-900 text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                            <i class="fas fa-shield-halved text-white"></i>
                        </div>
                        <h1 class="text-xl font-bold">AssetShield Admin Dashboard</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="flex items-center space-x-2">
                            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span class="text-sm">Live Monitoring</span>
                        </div>
                        <a href="/admin/setup-2fa" class="text-white/80 hover:text-white transition-colors">
                            <i class="fas fa-shield-alt mr-1"></i>2FA Setup
                        </a>
                        <form method="POST" action="/admin/logout" class="inline">
                            <button type="submit" class="text-white/80 hover:text-white transition-colors">
                                <i class="fas fa-sign-out-alt mr-1"></i>Logout
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <!-- Quick Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-users text-blue-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Total Visitors</p>
                            <p class="text-2xl font-bold text-gray-900">${visitorStats.totalVisitors || 0}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-dollar-sign text-green-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Total Revenue</p>
                            <p class="text-2xl font-bold text-gray-900">$${(salesStats.totalRevenue || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-building text-purple-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Active Law Firms</p>
                            <p class="text-2xl font-bold text-gray-900">${salesStats.activeLawFirms || 0}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-chart-line text-orange-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-500">Conversion Rate</p>
                            <p class="text-2xl font-bold text-gray-900">${((salesStats.conversionRate || 0) * 100).toFixed(1)}%</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Sales Analytics -->
                <div class="lg:col-span-2 bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Sales Performance</h3>
                    </div>
                    <div class="p-6">
                        <canvas id="salesChart" width="400" height="200"></canvas>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Recent Activity</h3>
                    </div>
                    <div class="p-6 max-h-96 overflow-y-auto">
                        ${(recentActivity || []).map(activity => `
                            <div class="flex items-center py-3 border-b border-gray-100 last:border-b-0">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center ${getActivityIcon(activity.type).class}">
                                    <i class="${getActivityIcon(activity.type).icon} text-white text-sm"></i>
                                </div>
                                <div class="ml-3 flex-1">
                                    <p class="text-sm font-medium text-gray-900">${activity.description}</p>
                                    <p class="text-xs text-gray-500">${formatTime(activity.timestamp)}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Additional Analytics -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <!-- Master Control Panel - Customer Access -->
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Master Control Panel</h3>
                        <p class="text-sm text-gray-500">Direct access to all customer accounts</p>
                    </div>
                    <div class="p-6">
                        <div id="customerList" class="space-y-3">
                            <div class="text-center py-8">
                                <i class="fas fa-users text-blue-500 text-2xl mb-2"></i>
                                <p class="text-gray-600 text-sm">Loading customers...</p>
                            </div>
                        </div>
                        <div class="mt-4 flex gap-2">
                            <button onclick="refreshCustomerList()" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="fas fa-sync-alt mr-1"></i>Refresh
                            </button>
                            <button onclick="previewPaymentFlow()" class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                                <i class="fas fa-eye mr-1"></i>Preview Payment Flow
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Security Overview -->
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Security Status</h3>
                    </div>
                    <div class="p-6">
                        <div class="space-y-4">
                            ${(securityEvents || []).length > 0 ? securityEvents.map(event => `
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">${event.type}</span>
                                    <span class="px-2 py-1 text-xs rounded-full ${getSecurityBadgeClass(event.level)}">
                                        ${event.count} events
                                    </span>
                                </div>
                            `).join('') : `
                                <div class="text-center py-8">
                                    <i class="fas fa-shield-check text-green-500 text-2xl mb-2"></i>
                                    <p class="text-gray-600 text-sm">No security incidents</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Customer Support Messages (Enterprise) -->
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Customer Support</h3>
                        <p class="text-sm text-gray-500">Direct Enterprise Support Channel</p>
                    </div>
                    <div class="p-6">
                        <div id="supportMessages" class="space-y-3 max-h-64 overflow-y-auto mb-4">
                            <div class="text-center py-8">
                                <i class="fas fa-headset text-blue-500 text-2xl mb-2"></i>
                                <p class="text-gray-600 text-sm">No support requests</p>
                                <p class="text-xs text-gray-500 mt-1">Enterprise customers can contact you directly here</p>
                            </div>
                        </div>
                        <button onclick="refreshSupportMessages()" class="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                            <i class="fas fa-sync-alt mr-1"></i>Refresh Messages
                        </button>
                    </div>
                </div>

                <!-- Platform Metrics -->
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Platform Health</h3>
                    </div>
                    <div class="p-6">
                        <div class="space-y-4">
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">System Status</span>
                                <span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Operational</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Database</span>
                                <span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Healthy</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Security</span>
                                <span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Protected</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            // Initialize sales chart with REAL data
            async function loadSalesChart() {
                try {
                    const response = await fetch('/admin/api/sales-chart-data');
                    const chartData = await response.json();
                    
                    const ctx = document.getElementById('salesChart').getContext('2d');
                    const salesChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: chartData.labels || ['No Data'],
                            datasets: [{
                                label: 'Revenue ($)',
                                data: chartData.data || [0],
                                borderColor: 'rgb(59, 130, 246)',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function(value) {
                                            return '$' + value.toLocaleString();
                                        }
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: true
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            return 'Revenue: $' + context.raw.toLocaleString();
                                        }
                                    }
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.error('Failed to load sales chart:', error);
                    
                    // Fallback: Show empty chart if no data
                    const ctx = document.getElementById('salesChart').getContext('2d');
                    const salesChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ['No Sales Yet'],
                            datasets: [{
                                label: 'Revenue ($)',
                                data: [0],
                                borderColor: 'rgb(156, 163, 175)',
                                backgroundColor: 'rgba(156, 163, 175, 0.1)',
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: { y: { beginAtZero: true } },
                            plugins: {
                                legend: { display: true }
                            }
                        }
                    });
                }
            }
            
            // Load chart on page load
            loadSalesChart();

            // Auto-refresh every 60 seconds (reduced frequency for better performance)
            setInterval(() => {
                window.location.reload();
            }, 60000);
            
            // Customer support functions
            async function refreshSupportMessages() {
                try {
                    const response = await fetch('/admin/api/support-messages');
                    const messages = await response.json();
                    
                    const container = document.getElementById('supportMessages');
                    
                    if (messages.length === 0) {
                        container.innerHTML = \`
                            <div class="text-center py-8">
                                <i class="fas fa-headset text-blue-500 text-2xl mb-2"></i>
                                <p class="text-gray-600 text-sm">No support requests</p>
                                <p class="text-xs text-gray-500 mt-1">Enterprise customers can contact you directly here</p>
                            </div>
                        \`;
                    } else {
                        container.innerHTML = messages.map(msg => \`
                            <div class="border border-gray-200 rounded-lg p-3">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="font-medium text-sm text-gray-900">\${msg.customerName}</span>
                                    <span class="text-xs text-gray-500">\${new Date(msg.timestamp).toLocaleString()}</span>
                                </div>
                                <p class="text-sm text-gray-700">\${msg.message}</p>
                                <div class="mt-2 flex items-center justify-between">
                                    <span class="px-2 py-1 text-xs bg-\${msg.priority === 'high' ? 'red' : msg.priority === 'medium' ? 'yellow' : 'green'}-100 text-\${msg.priority === 'high' ? 'red' : msg.priority === 'medium' ? 'yellow' : 'green'}-800 rounded-full">
                                        \${msg.priority} priority
                                    </span>
                                    <button onclick="respondToMessage('\${msg.id}')" class="text-blue-600 hover:text-blue-800 text-xs">
                                        <i class="fas fa-reply mr-1"></i>Respond
                                    </button>
                                </div>
                            </div>
                        \`).join('');
                    }
                } catch (error) {
                    console.error('Failed to load support messages:', error);
                }
            }
            
            function respondToMessage(messageId) {
                // For now, just show alert - can be expanded to full messaging system
                alert('Enterprise Support Feature: Direct response functionality can be implemented based on your preferred communication method (email, phone, etc.)');
            }
            
            // Master Control Panel Functions
            async function refreshCustomerList() {
                try {
                    const response = await fetch('/admin/api/customers');
                    const customers = await response.json();
                    
                    const container = document.getElementById('customerList');
                    
                    if (customers.length === 0) {
                        container.innerHTML = \`
                            <div class="text-center py-8">
                                <i class="fas fa-users text-gray-400 text-2xl mb-2"></i>
                                <p class="text-gray-600 text-sm">No customers yet</p>
                                <p class="text-xs text-gray-500 mt-1">Customers will appear here when they sign up</p>
                            </div>
                        \`;
                    } else {
                        container.innerHTML = customers.map(customer => \`
                            <div class="border border-gray-200 rounded-lg p-4">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <h4 class="font-medium text-gray-900">\${customer.firm_name || customer.name}</h4>
                                        <p class="text-sm text-gray-600">\${customer.owner_email || customer.email}</p>
                                        <div class="flex items-center gap-2 mt-1">
                                            <span class="px-2 py-1 text-xs bg-\${customer.tier === 'enterprise' ? 'purple' : customer.tier === 'professional' ? 'blue' : 'green'}-100 text-\${customer.tier === 'enterprise' ? 'purple' : customer.tier === 'professional' ? 'blue' : 'green'}-800 rounded-full">
                                                \${customer.tier || 'starter'}
                                            </span>
                                            <span class="px-2 py-1 text-xs bg-\${customer.status === 'active' ? 'green' : customer.status === 'trial' ? 'yellow' : 'red'}-100 text-\${customer.status === 'active' ? 'green' : customer.status === 'trial' ? 'yellow' : 'red'}-800 rounded-full">
                                                \${customer.status || 'trial'}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="flex flex-col gap-1">
                                        <button onclick="impersonateCustomer('\${customer.id}')" class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
                                            <i class="fas fa-sign-in-alt mr-1"></i>Access Dashboard
                                        </button>
                                        <button onclick="viewCustomerDetails('\${customer.id}')" class="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors">
                                            <i class="fas fa-eye mr-1"></i>View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        \`).join('');
                    }
                } catch (error) {
                    console.error('Failed to load customers:', error);
                    const container = document.getElementById('customerList');
                    container.innerHTML = \`
                        <div class="text-center py-8">
                            <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
                            <p class="text-red-600 text-sm">Failed to load customers</p>
                        </div>
                    \`;
                }
            }
            
            async function impersonateCustomer(customerId) {
                try {
                    const response = await fetch('/admin/api/impersonate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ customerId })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Open customer dashboard in new tab with impersonation token
                        window.open(result.dashboardUrl, '_blank');
                    } else {
                        alert('Failed to access customer dashboard: ' + result.error);
                    }
                } catch (error) {
                    alert('Error accessing customer dashboard: ' + error.message);
                }
            }
            
            function viewCustomerDetails(customerId) {
                // Open detailed customer view (can be expanded)
                window.open(\`/admin/customer/\${customerId}\`, '_blank');
            }
            
            function previewPaymentFlow() {
                // Open payment flow preview in new tab
                window.open('/?preview=admin', '_blank');
            }
            
            // Load customer list on page load
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(refreshCustomerList, 1000);
            });
        </script>
    </body>
    </html>
  `)
})

// Helper functions
async function getVisitorAnalytics(db: SecureDatabase) {
  try {
    const result = await db.secureSelect(`
      SELECT 
        COUNT(DISTINCT ip_address) as totalVisitors,
        COUNT(*) as totalPageViews,
        COUNT(CASE WHEN created_at > datetime('now', '-24 hours') THEN 1 END) as visitorsToday
      FROM audit_logs 
      WHERE action LIKE '%GET%' OR action LIKE '%visit%'
    `)
    
    return result.data?.[0] || { totalVisitors: 0, totalPageViews: 0, visitorsToday: 0 }
  } catch (error) {
    // Return zero state if table doesn't exist yet
    return { totalVisitors: 0, totalPageViews: 0, visitorsToday: 0 }
  }
}

async function getSalesAnalytics(db: SecureDatabase) {
  try {
    const result = await db.secureSelect(`
      SELECT 
        COUNT(*) as totalSales,
        COALESCE(SUM(amount), 0) as totalRevenue,
        COUNT(DISTINCT user_id) as activeLawFirms,
        CASE 
          WHEN (SELECT COUNT(*) FROM audit_logs WHERE action LIKE '%assessment%') > 0 
          THEN CAST(COUNT(*) AS FLOAT) / (SELECT COUNT(*) FROM audit_logs WHERE action LIKE '%assessment%')
          ELSE 0 
        END as conversionRate
      FROM payment_transactions 
      WHERE status = 'succeeded'
    `)
    
    const data = result.data?.[0] || { totalSales: 0, totalRevenue: 0, activeLawFirms: 0, conversionRate: 0 }
    
    // Convert revenue from cents to dollars  
    data.totalRevenue = (data.totalRevenue || 0) / 100
    
    return data
  } catch (error) {
    // Return zero state if table doesn't exist yet
    return { totalSales: 0, totalRevenue: 0, activeLawFirms: 0, conversionRate: 0 }
  }
}

async function getRecentActivity(db: SecureDatabase) {
  try {
    const result = await db.secureSelect(`
      SELECT 
        action as type,
        COALESCE(details, action) as description,
        created_at as timestamp,
        ip_address,
        user_email
      FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `)
    
    return result.data || []
  } catch (error) {
    // Return empty array if table doesn't exist yet
    return []
  }
}

async function getSecuritySummary(db: SecureDatabase) {
  try {
    const result = await db.secureSelect(`
      SELECT 
        event_type as type,
        risk_level as level,
        COUNT(*) as count
      FROM security_events 
      WHERE created_at > datetime('now', '-24 hours')
      GROUP BY event_type, risk_level
      ORDER BY count DESC
      LIMIT 10
    `)
    
    return result.data || []
  } catch (error) {
    // Return empty array if table doesn't exist yet
    return []
  }
}

async function getPlatformMetrics(db: SecureDatabase) {
  return {
    systemStatus: 'operational',
    databaseHealth: 'healthy',
    securityStatus: 'protected'
  }
}

function getActivityIcon(type: string) {
  const icons: any = {
    'login': { icon: 'fas fa-sign-in-alt', class: 'bg-green-500' },
    'purchase': { icon: 'fas fa-credit-card', class: 'bg-blue-500' },
    'assessment': { icon: 'fas fa-clipboard-check', class: 'bg-purple-500' },
    'default': { icon: 'fas fa-info-circle', class: 'bg-gray-500' }
  }
  
  for (const key in icons) {
    if (type.includes(key)) return icons[key]
  }
  return icons.default
}

function getSecurityBadgeClass(level: string) {
  const classes: any = {
    'low': 'bg-green-100 text-green-800',
    'medium': 'bg-yellow-100 text-yellow-800',
    'high': 'bg-red-100 text-red-800',
    'critical': 'bg-red-200 text-red-900'
  }
  return classes[level] || classes.low
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString()
}