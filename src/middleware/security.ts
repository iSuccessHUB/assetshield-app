import { Context, Next } from 'hono'
import type { CloudflareBindings } from '../types'

// Rate limiting middleware
export function rateLimiter(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  const requests = new Map<string, { count: number; resetTime: number }>()
  
  return async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For') || 
               c.req.header('X-Real-IP') || 
               'unknown'
    
    const now = Date.now()
    const key = `rate_limit:${ip}`
    
    let requestData = requests.get(key)
    
    if (!requestData || now > requestData.resetTime) {
      requestData = {
        count: 0,
        resetTime: now + windowMs
      }
    }
    
    requestData.count++
    requests.set(key, requestData)
    
    if (requestData.count > maxRequests) {
      // Log rate limit violation
      console.warn(`Rate limit exceeded for IP: ${ip}`)
      
      return c.json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
      }, 429)
    }
    
    // Add rate limit headers
    c.header('X-RateLimit-Limit', maxRequests.toString())
    c.header('X-RateLimit-Remaining', (maxRequests - requestData.count).toString())
    c.header('X-RateLimit-Reset', new Date(requestData.resetTime).toISOString())
    
    await next()
  }
}

// Security headers middleware
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    await next()
    
    // Security headers
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('X-XSS-Protection', '1; mode=block')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    // HSTS (if HTTPS)
    if (c.req.header('X-Forwarded-Proto') === 'https' || c.req.url.startsWith('https://')) {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }
    
    // CSP
    c.header('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.tailwindcss.com cdn.jsdelivr.net js.stripe.com *.googlesyndication.com *.googletagservices.com *.doubleclick.net tpc.googlesyndication.com",
      "script-src-elem 'self' 'unsafe-inline' cdn.tailwindcss.com cdn.jsdelivr.net js.stripe.com *.googlesyndication.com *.googletagservices.com *.doubleclick.net",
      "style-src 'self' 'unsafe-inline' cdn.tailwindcss.com cdn.jsdelivr.net *.googlesyndication.com",
      "img-src 'self' data: https: *.googlesyndication.com *.doubleclick.net",
      "font-src 'self' cdn.jsdelivr.net",
      "connect-src 'self' api.stripe.com nominatim.openstreetmap.org *.googlesyndication.google *.googlesyndication.com *.googletagservices.com *.doubleclick.net *.google.com ep1.adtrafficquality.google",
      "frame-src 'self' js.stripe.com *.googlesyndication.com *.doubleclick.net",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '))
  }
}

// Input sanitization middleware
export function sanitizeInput() {
  return async (c: Context, next: Next) => {
    // Get request body if it exists
    if (c.req.method === 'POST' || c.req.method === 'PUT' || c.req.method === 'PATCH') {
      try {
        const contentType = c.req.header('Content-Type')
        
        if (contentType?.includes('application/json')) {
          const body = await c.req.json()
          const sanitizedBody = sanitizeObject(body)
          
          // Replace the request body with sanitized version
          c.req.json = () => Promise.resolve(sanitizedBody)
        }
      } catch (error) {
        console.error('Input sanitization error:', error)
      }
    }
    
    await next()
  }
}

// Sanitize object recursively
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  } else if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  } else if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value)
    }
    return sanitized
  }
  return obj
}

// Basic string sanitization
function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str
  
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/on\w+='[^']*'/gi, '') // Remove event handlers (single quotes)
    .trim()
}

// Authentication middleware
export function requireAuth() {
  return async (c: Context, next: Next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') ||
                  c.req.header('Cookie')?.match(/auth_token=([^;]+)/)?.[1]
    
    if (!token) {
      return c.json({ error: 'Authentication required' }, 401)
    }
    
    try {
      // In production, verify JWT token
      // const payload = await verify(token, JWT_SECRET)
      // c.set('user', payload)
      
      // For demo, just check if token exists
      c.set('userId', '1') // Mock user ID
      
      await next()
    } catch (error) {
      return c.json({ error: 'Invalid token' }, 401)
    }
  }
}

// CSRF protection middleware
export function csrfProtection() {
  const tokens = new Map<string, { token: string; expires: number }>()
  
  return async (c: Context, next: Next) => {
    const method = c.req.method
    
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      // Generate CSRF token for safe methods
      const sessionId = c.req.header('Cookie')?.match(/session_id=([^;]+)/)?.[1] || 'anonymous'
      const token = generateCSRFToken()
      const expires = Date.now() + 60 * 60 * 1000 // 1 hour
      
      tokens.set(sessionId, { token, expires })
      c.header('X-CSRF-Token', token)
      
      await next()
      return
    }
    
    // Verify CSRF token for unsafe methods
    const sessionId = c.req.header('Cookie')?.match(/session_id=([^;]+)/)?.[1] || 'anonymous'
    const providedToken = c.req.header('X-CSRF-Token') || c.req.header('Csrf-Token')
    
    const storedData = tokens.get(sessionId)
    
    if (!storedData || Date.now() > storedData.expires) {
      return c.json({ error: 'CSRF token expired' }, 403)
    }
    
    if (!providedToken || providedToken !== storedData.token) {
      return c.json({ error: 'Invalid CSRF token' }, 403)
    }
    
    await next()
  }
}

function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Audit logging middleware
export function auditLogger() {
  return async (c: Context, next: Next) => {
    const startTime = Date.now()
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    const userAgent = c.req.header('User-Agent') || 'unknown'
    const method = c.req.method
    const url = new URL(c.req.url)
    const path = url.pathname
    
    // Log request start
    console.log(`[${new Date().toISOString()}] ${method} ${path} - IP: ${ip}`)
    
    await next()
    
    const duration = Date.now() - startTime
    const statusCode = c.res.status
    
    // Log sensitive operations
    const sensitiveRoutes = ['/api/auth', '/api/payments', '/api/members', '/api/assessment']
    const isSensitive = sensitiveRoutes.some(route => path.startsWith(route))
    
    if (isSensitive || statusCode >= 400) {
      try {
        const env = c.env as CloudflareBindings
        if (env.DB) {
          await env.DB.prepare(`
            INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            c.get('userId') || null,
            `${method} ${path}`,
            JSON.stringify({
              statusCode,
              duration,
              sensitive: isSensitive
            }),
            ip,
            userAgent
          ).run()
        }
      } catch (error) {
        console.error('Audit logging failed:', error)
      }
    }
    
    // Log response
    console.log(`[${new Date().toISOString()}] ${method} ${path} - ${statusCode} (${duration}ms)`)
  }
}

// IP-based blocking middleware
export function ipBlocking(blockedIPs: string[] = []) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For') || 
               c.req.header('X-Real-IP')
    
    if (ip && blockedIPs.includes(ip)) {
      console.warn(`Blocked IP attempted access: ${ip}`)
      return c.json({ error: 'Access denied' }, 403)
    }
    
    await next()
  }
}

// Request size limiter
export function requestSizeLimit(maxBytes: number = 1024 * 1024) { // 1MB default
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header('Content-Length')
    
    if (contentLength && parseInt(contentLength) > maxBytes) {
      return c.json({
        error: 'Request too large',
        maxSize: `${Math.round(maxBytes / 1024)}KB`
      }, 413)
    }
    
    await next()
  }
}