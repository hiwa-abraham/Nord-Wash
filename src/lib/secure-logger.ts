/**
 * Secure Logger - Prevents sensitive data from leaking to console logs
 * 
 * This utility provides safe logging that:
 * - Masks PII (emails, phones, addresses)
 * - Filters out sensitive tokens
 * - Only logs in development mode
 * - Provides structured logging with severity levels
 */

// Patterns for sensitive data detection
const SENSITIVE_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  jwt: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  uuid: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  apiKey: /(?:api[_-]?key|secret|token|password|auth)[\s:="']+[a-zA-Z0-9_-]{20,}/gi,
};

/**
 * Mask sensitive data in a string
 */
function maskSensitiveData(input: string): string {
  let masked = input;
  
  // Mask emails (keep first 2 chars + domain)
  masked = masked.replace(SENSITIVE_PATTERNS.email, (match) => {
    const [local, domain] = match.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  });
  
  // Mask phone numbers (keep last 4 digits)
  masked = masked.replace(SENSITIVE_PATTERNS.phone, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `***-***-${digits.slice(-4)}`;
    }
    return '***-****';
  });
  
  // Mask credit cards (keep last 4)
  masked = masked.replace(SENSITIVE_PATTERNS.creditCard, (match) => {
    const digits = match.replace(/\D/g, '');
    return `****-****-****-${digits.slice(-4)}`;
  });
  
  // Mask JWTs completely
  masked = masked.replace(SENSITIVE_PATTERNS.jwt, '[REDACTED_TOKEN]');
  
  // Mask API keys
  masked = masked.replace(SENSITIVE_PATTERNS.apiKey, '[REDACTED_KEY]');
  
  return masked;
}

/**
 * Sanitize any value for safe logging
 */
function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  
  if (typeof value === 'string') {
    return maskSensitiveData(value);
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Completely redact known sensitive fields
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('credit_card') ||
        lowerKey.includes('cvv') ||
        lowerKey.includes('ssn')
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (
        lowerKey === 'email' ||
        lowerKey === 'phone' ||
        lowerKey === 'address'
      ) {
        sanitized[key] = typeof val === 'string' ? maskSensitiveData(val) : '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(val);
      }
    }
    return sanitized;
  }
  
  return value;
}

/**
 * Check if we're in development mode
 */
const isDevelopment = import.meta.env.DEV;

/**
 * Secure logger that prevents sensitive data leaks
 */
export const secureLog = {
  /**
   * Debug level - only in development
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args.map(sanitizeValue));
    }
  },

  /**
   * Info level - only in development
   */
  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log('[INFO]', ...args.map(sanitizeValue));
    }
  },

  /**
   * Warning level - always logs but sanitized
   */
  warn: (...args: unknown[]): void => {
    console.warn('[WARN]', ...args.map(sanitizeValue));
  },

  /**
   * Error level - always logs but sanitized
   */
  error: (...args: unknown[]): void => {
    console.error('[ERROR]', ...args.map(sanitizeValue));
  },

  /**
   * Log only in development with no sanitization (for truly non-sensitive data)
   */
  devOnly: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log('[DEV]', ...args);
    }
  },
};

/**
 * Mask an email address for display
 * e.g., "john.doe@example.com" -> "jo***@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Mask a phone number for display
 * e.g., "+1-555-123-4567" -> "***-***-4567"
 */
export function maskPhone(phone: string): string {
  if (!phone) return '***';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `***-***-${digits.slice(-4)}`;
  }
  return '***-****';
}

/**
 * Mask an address for display
 * e.g., "123 Main St, City" -> "*** Main St, City"
 */
export function maskAddress(address: string): string {
  if (!address) return '***';
  // Remove street numbers
  return address.replace(/^\d+\s*/, '*** ');
}

/**
 * Truncate a UUID for logging (show first and last 4 chars)
 * e.g., "550e8400-e29b-41d4-a716-446655440000" -> "550e...0000"
 */
export function truncateId(id: string): string {
  if (!id || id.length < 8) return id || '***';
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}
