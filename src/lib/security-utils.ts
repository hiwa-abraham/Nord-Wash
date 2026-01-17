/**
 * Security Utilities
 * 
 * Central security utilities combining XSS, CSRF, and other protections.
 * Import this single module for all security-related operations.
 */

export * from './xss-protection';
export * from './csrf-protection';
export * from './secure-cookies';

/**
 * Check if the current context is secure (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
  return window.isSecureContext || 
         window.location.protocol === 'https:' ||
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}

/**
 * Validate that no secrets are exposed in the window object
 */
export function auditWindowForSecrets(): string[] {
  const warnings: string[] = [];
  const sensitivePatterns = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /token(?!ize)/i,
    /private[_-]?key/i,
    /auth[_-]?token/i,
  ];
  
  // Only run in development
  if (!import.meta.env.DEV) {
    return warnings;
  }
  
  const checkObject = (obj: Record<string, unknown>, path: string) => {
    for (const key of Object.keys(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      
      // Check if key name suggests sensitive data
      for (const pattern of sensitivePatterns) {
        if (pattern.test(key)) {
          warnings.push(`Potential secret at window.${fullPath}`);
        }
      }
      
      // Check string values for API key patterns
      const value = obj[key];
      if (typeof value === 'string' && value.length > 20) {
        // Check for JWT pattern
        if (/^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(value)) {
          warnings.push(`JWT token found at window.${fullPath}`);
        }
        // Check for API key pattern
        if (/^sk_|^pk_|^api_|^key_/i.test(value)) {
          warnings.push(`API key pattern found at window.${fullPath}`);
        }
      }
    }
  };
  
  try {
    // Check custom properties on window
    const windowObj = window as unknown as Record<string, unknown>;
    const windowKeys = Object.keys(window).filter(key => 
      !key.startsWith('webkit') && 
      !key.startsWith('on') &&
      typeof windowObj[key] !== 'function'
    );
    
    for (const key of windowKeys) {
      const value = windowObj[key];
      if (value && typeof value === 'object' && value !== window) {
        try {
          checkObject(value as Record<string, unknown>, key);
        } catch {
          // Skip objects that throw on access
        }
      }
    }
  } catch {
    // Ignore access errors
  }
  
  return warnings;
}

/**
 * Generate a nonce for inline scripts (for CSP)
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Validate external URL before navigation
 */
export function isSafeExternalUrl(url: string, allowedDomains: string[] = []): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // If allowed domains specified, check against them
    if (allowedDomains.length > 0) {
      return allowedDomains.some(domain => 
        parsed.hostname === domain || 
        parsed.hostname.endsWith(`.${domain}`)
      );
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe window.open with security features
 */
export function safeWindowOpen(
  url: string, 
  target: string = '_blank',
  allowedDomains: string[] = []
): Window | null {
  if (!isSafeExternalUrl(url, allowedDomains)) {
    console.warn('[Security] Blocked unsafe URL:', url);
    return null;
  }
  
  // Use noopener and noreferrer for security
  return window.open(url, target, 'noopener,noreferrer');
}

/**
 * Initialize security checks on app startup
 */
export function initSecurityChecks(): void {
  if (import.meta.env.DEV) {
    // Audit window object for exposed secrets
    const warnings = auditWindowForSecrets();
    if (warnings.length > 0) {
      console.warn('[Security Audit] Potential secrets exposed:');
      warnings.forEach(w => console.warn(`  - ${w}`));
    }
    
    // Check if running in secure context
    if (!isSecureContext()) {
      console.warn('[Security] Running in insecure context (not HTTPS)');
    }
  }
  
  // Prevent clickjacking by checking if framed
  if (window.self !== window.top) {
    try {
      // Check if parent is allowed
      const allowedParents = [
        'lovable.dev',
        'lovable.app',
      ];
      
      const parentUrl = document.referrer;
      const isAllowed = allowedParents.some(domain => 
        parentUrl.includes(domain)
      );
      
      if (!isAllowed && import.meta.env.PROD) {
        console.warn('[Security] Framed by unauthorized parent');
      }
    } catch {
      // Cross-origin access denied - this is expected
    }
  }
}

/**
 * Rate limiting for form submissions (client-side)
 */
const formSubmissions = new Map<string, { count: number; resetAt: number }>();

export function checkFormRateLimit(
  formId: string, 
  maxSubmissions: number = 5, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = formSubmissions.get(formId);
  
  if (!entry || now >= entry.resetAt) {
    formSubmissions.set(formId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxSubmissions - 1, resetAt: now + windowMs };
  }
  
  if (entry.count >= maxSubmissions) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  
  entry.count++;
  return { allowed: true, remaining: maxSubmissions - entry.count, resetAt: entry.resetAt };
}

/**
 * Clean up rate limit entries periodically
 */
export function cleanupRateLimitEntries(): void {
  const now = Date.now();
  for (const [key, entry] of formSubmissions) {
    if (now >= entry.resetAt) {
      formSubmissions.delete(key);
    }
  }
}
