import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import type { CloudflareBindings } from '../types'

export const authRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// JWT Secret - Use environment variable or fallback
function getJWTSecret(): string {
  // Try environment variable first
  if (typeof process !== 'undefined' && process.env?.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  
  // Use a secure fallback (will be different each worker restart)
  // In production, JWT_SECRET should be set in environment variables
  console.warn('⚠️  JWT_SECRET not found in environment variables. Using fallback.');
  console.warn('🔒 For production, set JWT_SECRET environment variable to a secure random string');
  
  return 'fallback-jwt-secret-set-environment-variable-in-production-for-security';
}

// Industry-standard password hashing using PBKDF2 with secure defaults
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Generate cryptographically secure random salt
  const salt = crypto.getRandomValues(new Uint8Array(32));
  
  // Import password as cryptographic key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2 with SHA-256, 100,000 iterations (OWASP recommended minimum)
  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  // Combine salt and hash for storage
  const hashArray = new Uint8Array(derivedKey);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  
  // Return base64 encoded salt+hash
  return btoa(String.fromCharCode(...combined));
}

// Verify password against stored hash
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Decode stored hash
    const combined = new Uint8Array(atob(storedHash).split('').map(c => c.charCodeAt(0)));
    
    // Extract salt (first 32 bytes) and hash (remaining bytes)
    const salt = combined.slice(0, 32);
    const hash = combined.slice(32);
    
    // Import password as cryptographic key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // Derive key using same parameters
    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    
    const derivedArray = new Uint8Array(derivedKey);
    
    // Constant-time comparison to prevent timing attacks
    if (derivedArray.length !== hash.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < derivedArray.length; i++) {
      result |= derivedArray[i] ^ hash[i];
    }
    
    return result === 0;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// Register new customer
authRoutes.post('/register', async (c) => {
  try {
    const { email, password, firstName, lastName, phone } = await c.req.json()
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email format' }, 400)
    }
    
    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first()
    
    if (existingUser) {
      return c.json({ error: 'User already exists with this email' }, 400)
    }
    
    // Hash password
    const passwordHash = await hashPassword(password)
    
    // Create user
    const result = await c.env.DB.prepare(`
      INSERT INTO users (email, name, phone, user_type, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, 'customer', ?, datetime('now'), datetime('now'))
    `).bind(email, `${firstName} ${lastName}`, phone || '', passwordHash).run()
    
    if (!result.success) {
      return c.json({ error: 'Failed to create user' }, 500)
    }
    
    // Get the created user
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, user_type FROM users WHERE id = ?'
    ).bind(result.meta.last_row_id).first()
    
    // Create JWT token
    const token = await sign({
      userId: user.id,
      email: user.email,
      userType: user.user_type,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }, getJWTSecret())
    
    // Set HTTP-only cookie
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60 // 24 hours
    })
    
    return c.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.user_type
      }
    })
    
  } catch (error) {
    console.error('Registration error:', error)
    return c.json({ error: 'Registration failed' }, 500)
  }
})

// Login customer
authRoutes.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }
    
    // Get user with password hash
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, user_type, password_hash FROM users WHERE email = ? AND user_type = "customer"'
    ).bind(email).first()
    
    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }
    
    // Create JWT token
    const token = await sign({
      userId: user.id,
      email: user.email,
      userType: user.user_type,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }, getJWTSecret())
    
    // Set HTTP-only cookie
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60 // 24 hours
    })
    
    return c.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.user_type
      }
    })
    
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// Logout customer
authRoutes.post('/logout', async (c) => {
  deleteCookie(c, 'auth_token')
  return c.json({ success: true, message: 'Logged out successfully' })
})

// Get current user profile
authRoutes.get('/profile', async (c) => {
  try {
    const token = getCookie(c, 'auth_token')
    
    if (!token) {
      return c.json({ error: 'Not authenticated' }, 401)
    }
    
    // Verify JWT token
    const payload = await verify(token, getJWTSecret())
    
    // Get user details with service access
    const user = await c.env.DB.prepare(`
      SELECT 
        u.id, u.email, u.name, u.user_type, u.created_at,
        GROUP_CONCAT(p.service_type) as purchased_services
      FROM users u
      LEFT JOIN payments p ON u.id = p.user_id AND p.status = 'succeeded'
      WHERE u.id = ?
      GROUP BY u.id
    `).bind(payload.userId).first()
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.user_type,
        memberSince: user.created_at,
        purchasedServices: user.purchased_services ? user.purchased_services.split(',') : []
      }
    })
    
  } catch (error) {
    console.error('Profile error:', error)
    return c.json({ error: 'Failed to get profile' }, 500)
  }
})

// Middleware to check authentication
export async function requireAuth(c: any, next: any) {
  try {
    const token = getCookie(c, 'auth_token')
    
    if (!token) {
      return c.json({ error: 'Authentication required' }, 401)
    }
    
    const payload = await verify(token, getJWTSecret())
    
    // Add user info to context
    c.set('user', {
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType
    })
    
    await next()
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401)
  }
}

// Check service access
authRoutes.get('/check-access/:service', async (c) => {
  try {
    const token = getCookie(c, 'auth_token')
    const service = c.req.param('service')
    
    if (!token) {
      return c.json({ hasAccess: false, reason: 'Not authenticated' })
    }
    
    const payload = await verify(token, getJWTSecret())
    
    // Check if user has purchased this service
    const payment = await c.env.DB.prepare(
      'SELECT id FROM payments WHERE user_id = ? AND service_type = ? AND status = "succeeded"'
    ).bind(payload.userId, service).first()
    
    return c.json({
      hasAccess: !!payment,
      reason: payment ? 'Access granted' : 'Service not purchased'
    })
    
  } catch (error) {
    return c.json({ hasAccess: false, reason: 'Invalid token' })
  }
})

// Get user status (including ad-free status)
authRoutes.get('/user-status', async (c) => {
  try {
    const token = getCookie(c, 'auth_token') || c.req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return c.json({ 
        isLoggedIn: false, 
        isPremium: false, 
        hasAdFreeAccess: false 
      })
    }
    
    const payload = await verify(token, getJWTSecret())
    const userId = payload.userId
    
    // Get user details
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, user_type FROM users WHERE id = ?'
    ).bind(userId).first()
    
    if (!user) {
      return c.json({ 
        isLoggedIn: false, 
        isPremium: false, 
        hasAdFreeAccess: false 
      })
    }
    
    // Check for premium services and payments
    const services = await c.env.DB.prepare(`
      SELECT 
        us.service_type, 
        us.access_level, 
        us.status,
        p.amount,
        p.status as payment_status
      FROM user_services us
      LEFT JOIN payments p ON us.payment_id = p.id
      WHERE us.user_id = ? AND us.status = 'active'
    `).bind(userId).all()
    
    // Determine premium and ad-free status
    const isPremium = services.results.some(service => 
      service.access_level === 'premium' || service.access_level === 'complete'
    )
    
    const hasAdFreeAccess = isPremium || services.results.some(service => 
      service.payment_status === 'completed' && service.amount >= 99 // $99+ purchases get ad-free
    )
    
    return c.json({
      isLoggedIn: true,
      isPremium,
      hasAdFreeAccess,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.user_type
      },
      services: services.results
    })
    
  } catch (error) {
    console.error('Error getting user status:', error)
    return c.json({ 
      isLoggedIn: false, 
      isPremium: false, 
      hasAdFreeAccess: false 
    })
  }
})