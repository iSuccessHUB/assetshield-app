// Database security utilities for SQL injection prevention and data validation

export interface DatabaseQueryResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Secure database query wrapper with automatic parameter binding
 * Prevents SQL injection by enforcing parameterized queries
 */
export class SecureDatabase {
  private db: D1Database;

  constructor(database: D1Database) {
    this.db = database;
  }

  /**
   * Execute a secure SELECT query with automatic parameter binding
   */
  async secureSelect(
    query: string, 
    params: any[] = [], 
    maxResults: number = 1000
  ): Promise<DatabaseQueryResult> {
    try {
      // Validate query is SELECT only
      const cleanQuery = query.trim().toLowerCase();
      if (!cleanQuery.startsWith('select')) {
        throw new Error('Only SELECT queries allowed in secureSelect');
      }

      // Add LIMIT if not present to prevent resource exhaustion
      if (!cleanQuery.includes('limit')) {
        query += ` LIMIT ${maxResults}`;
      }

      const stmt = this.db.prepare(query);
      const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

      return {
        success: true,
        data: result.results
      };
    } catch (error) {
      console.error('Database SELECT error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database query failed'
      };
    }
  }

  /**
   * Execute a secure INSERT query with validation
   */
  async secureInsert(
    table: string,
    data: Record<string, any>,
    allowedColumns: string[]
  ): Promise<DatabaseQueryResult> {
    try {
      // Validate table name (prevent injection)
      if (!this.isValidTableName(table)) {
        throw new Error('Invalid table name');
      }

      // Filter data to only allowed columns
      const filteredData = this.filterColumns(data, allowedColumns);
      const columns = Object.keys(filteredData);
      const values = Object.values(filteredData);

      if (columns.length === 0) {
        throw new Error('No valid columns to insert');
      }

      // Build parameterized query
      const placeholders = columns.map(() => '?').join(', ');
      const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

      const result = await this.db.prepare(query).bind(...values).run();

      return {
        success: result.success,
        data: { insertId: result.meta?.last_row_id, changes: result.meta?.changes }
      };
    } catch (error) {
      console.error('Database INSERT error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database insert failed'
      };
    }
  }

  /**
   * Execute a secure UPDATE query with validation
   */
  async secureUpdate(
    table: string,
    data: Record<string, any>,
    whereClause: string,
    whereParams: any[],
    allowedColumns: string[]
  ): Promise<DatabaseQueryResult> {
    try {
      // Validate table name
      if (!this.isValidTableName(table)) {
        throw new Error('Invalid table name');
      }

      // Filter data to only allowed columns
      const filteredData = this.filterColumns(data, allowedColumns);
      const columns = Object.keys(filteredData);
      const values = Object.values(filteredData);

      if (columns.length === 0) {
        throw new Error('No valid columns to update');
      }

      // Build parameterized query
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

      const allParams = [...values, ...whereParams];
      const result = await this.db.prepare(query).bind(...allParams).run();

      return {
        success: result.success,
        data: { changes: result.meta?.changes }
      };
    } catch (error) {
      console.error('Database UPDATE error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database update failed'
      };
    }
  }

  /**
   * Validate table name to prevent SQL injection
   */
  private isValidTableName(table: string): boolean {
    // Allow only alphanumeric characters, underscores, and specific known tables
    const validTablePattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    const knownTables = [
      'users', 'risk_assessments', 'consultations', 'payment_transactions',
      'services', 'user_services', 'audit_logs', 'educational_content',
      'demo_sessions', 'service_bundles', 'user_bundle_purchases',
      'demo_activities', 'conversion_analytics', 'lead_scores', 'email_campaigns'
    ];

    return validTablePattern.test(table) && knownTables.includes(table);
  }

  /**
   * Filter object to only include allowed columns
   */
  private filterColumns(data: Record<string, any>, allowedColumns: string[]): Record<string, any> {
    const filtered: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (allowedColumns.includes(key) && value !== undefined) {
        // Basic sanitization
        if (typeof value === 'string') {
          filtered[key] = value.trim().slice(0, 1000); // Limit string length
        } else if (typeof value === 'number' && isFinite(value)) {
          filtered[key] = value;
        } else if (typeof value === 'boolean') {
          filtered[key] = value;
        } else if (value === null) {
          filtered[key] = null;
        }
        // Skip invalid types
      }
    }

    return filtered;
  }
}

/**
 * Input validation utilities
 */
export class InputValidator {
  /**
   * Validate and sanitize email
   */
  static validateEmail(email: string): { valid: boolean; sanitized?: string; error?: string } {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required' };
    }

    const sanitized = email.trim().toLowerCase();
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailPattern.test(sanitized)) {
      return { valid: false, error: 'Invalid email format' };
    }

    if (sanitized.length > 254) {
      return { valid: false, error: 'Email too long' };
    }

    return { valid: true, sanitized };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || typeof password !== 'string') {
      return { valid: false, error: 'Password is required' };
    }

    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long' };
    }

    if (password.length > 128) {
      return { valid: false, error: 'Password too long' };
    }

    // Check for at least one uppercase, lowercase, digit, and special character
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      return { 
        valid: false, 
        error: 'Password must contain uppercase, lowercase, digit, and special character' 
      };
    }

    return { valid: true };
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string, maxLength: number = 255): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .slice(0, maxLength)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }

  /**
   * Validate numeric input
   */
  static validateNumber(
    input: any, 
    min?: number, 
    max?: number
  ): { valid: boolean; value?: number; error?: string } {
    const num = Number(input);

    if (isNaN(num) || !isFinite(num)) {
      return { valid: false, error: 'Invalid number' };
    }

    if (min !== undefined && num < min) {
      return { valid: false, error: `Number must be at least ${min}` };
    }

    if (max !== undefined && num > max) {
      return { valid: false, error: `Number must be at most ${max}` };
    }

    return { valid: true, value: num };
  }
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private static attempts = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check and update rate limit for a key
   */
  static checkLimit(
    key: string, 
    maxAttempts: number = 5, 
    windowMs: number = 15 * 60 * 1000
  ): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    let attemptData = this.attempts.get(key);

    if (!attemptData || now > attemptData.resetTime) {
      attemptData = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    attemptData.count++;
    this.attempts.set(key, attemptData);

    if (attemptData.count > maxAttempts) {
      return {
        allowed: false,
        resetTime: attemptData.resetTime
      };
    }

    return { allowed: true };
  }

  /**
   * Clear rate limit for a key (e.g., after successful operation)
   */
  static clearLimit(key: string): void {
    this.attempts.delete(key);
  }
}

// Add rate limiting method to InputValidator for compatibility
declare module './database-security' {
  namespace InputValidator {
    function checkRateLimit(
      key: string, 
      maxAttempts?: number, 
      windowMs?: number
    ): { allowed: boolean; resetTime?: number };
  }
}

// Extend InputValidator with rate limiting
(InputValidator as any).checkRateLimit = RateLimiter.checkLimit;