/**
 * XSS Protection Utilities
 * 
 * Provides functions to sanitize user input and prevent cross-site scripting attacks.
 * React already escapes content by default, but these utilities are for edge cases
 * where manual sanitization is needed.
 */

/**
 * HTML entities that need to be escaped
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize a string for safe use in URLs
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }
  
  // Allow only http, https, mailto, tel, and relative URLs
  const allowedProtocols = ['http://', 'https://', 'mailto:', 'tel:'];
  const isAbsolute = allowedProtocols.some(p => trimmed.startsWith(p));
  const isRelative = trimmed.startsWith('/') || trimmed.startsWith('#') || !trimmed.includes(':');
  
  if (!isAbsolute && !isRelative) {
    return '';
  }
  
  return url;
}

/**
 * Sanitize input for use in external API calls (e.g., WhatsApp, SMS)
 */
export function sanitizeForExternalApi(input: string, maxLength: number = 500): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .slice(0, maxLength)
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Validate and sanitize CSS values (for dynamic styles)
 */
export function sanitizeCssValue(value: string): string {
  if (typeof value !== 'string') {
    return '';
  }
  
  // Remove any potential CSS injection attempts
  const dangerous = [
    'expression', 'javascript:', 'url(', '@import', 'behavior:', 
    '-moz-binding', '</style>', '<script>', 'data:'
  ];
  
  const lower = value.toLowerCase();
  for (const pattern of dangerous) {
    if (lower.includes(pattern)) {
      return '';
    }
  }
  
  // Allow only safe characters for CSS values
  return value.replace(/[^a-zA-Z0-9#%(),.\-\s]/g, '');
}

/**
 * Sanitize object keys and string values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = escapeHtml(key);
    
    if (typeof value === 'string') {
      result[sanitizedKey] = escapeHtml(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[sanitizedKey] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[sanitizedKey] = value.map(item => 
        typeof item === 'string' ? escapeHtml(item) : 
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) : 
        item
      );
    } else {
      result[sanitizedKey] = value;
    }
  }
  
  return result as T;
}

/**
 * Check if content contains potential XSS patterns
 */
export function containsXssPatterns(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  const xssPatterns = [
    /<script[\s>]/i,
    /javascript:/i,
    /on\w+\s*=/i,  // onclick=, onerror=, etc.
    /<\s*iframe/i,
    /<\s*object/i,
    /<\s*embed/i,
    /<\s*svg[\s>]/i,
    /expression\s*\(/i,
    /url\s*\(\s*["']?\s*data:/i,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Log potential XSS attempt (development only)
 */
export function logXssAttempt(input: string, context: string): void {
  if (import.meta.env.DEV && containsXssPatterns(input)) {
    console.warn(`[XSS Protection] Potential XSS pattern detected in ${context}`);
  }
}
