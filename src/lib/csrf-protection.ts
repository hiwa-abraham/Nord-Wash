/**
 * CSRF Protection Utilities
 * 
 * Provides client-side CSRF protection mechanisms.
 * Note: Supabase already handles CSRF protection with its authentication tokens,
 * but these utilities provide additional protection for custom endpoints.
 */

// CSRF token storage key
const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_TOKEN_EXPIRY_KEY = 'csrf_token_expiry';
const TOKEN_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or generate a CSRF token
 */
export function getCsrfToken(): string {
  const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  const expiry = sessionStorage.getItem(CSRF_TOKEN_EXPIRY_KEY);
  
  // Check if token exists and is not expired
  if (storedToken && expiry && Date.now() < parseInt(expiry, 10)) {
    return storedToken;
  }
  
  // Generate new token
  const newToken = generateSecureToken();
  const newExpiry = (Date.now() + TOKEN_VALIDITY_MS).toString();
  
  sessionStorage.setItem(CSRF_TOKEN_KEY, newToken);
  sessionStorage.setItem(CSRF_TOKEN_EXPIRY_KEY, newExpiry);
  
  return newToken;
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(token: string): boolean {
  const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  const expiry = sessionStorage.getItem(CSRF_TOKEN_EXPIRY_KEY);
  
  if (!storedToken || !expiry) {
    return false;
  }
  
  if (Date.now() >= parseInt(expiry, 10)) {
    // Token expired, clear it
    clearCsrfToken();
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  return constantTimeCompare(token, storedToken);
}

/**
 * Clear the CSRF token (e.g., on logout)
 */
export function clearCsrfToken(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
  sessionStorage.removeItem(CSRF_TOKEN_EXPIRY_KEY);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Add CSRF token to request headers
 */
export function withCsrfHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCsrfToken();
  return {
    ...headers,
    'X-CSRF-Token': token,
  };
}

/**
 * Create a hidden CSRF input for forms
 */
export function createCsrfInput(): { name: string; value: string } {
  return {
    name: '_csrf',
    value: getCsrfToken(),
  };
}

/**
 * Validate origin for same-origin requests
 */
export function validateRequestOrigin(allowedOrigins: string[]): boolean {
  const currentOrigin = window.location.origin;
  return allowedOrigins.includes(currentOrigin);
}

/**
 * Refresh CSRF token (call periodically or after sensitive operations)
 */
export function refreshCsrfToken(): string {
  clearCsrfToken();
  return getCsrfToken();
}
