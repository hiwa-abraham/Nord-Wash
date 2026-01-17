/**
 * Secure Cookie Utilities
 * 
 * Provides secure cookie handling with proper security attributes.
 * All cookies are set with secure defaults to prevent attacks.
 */

export interface CookieOptions {
  /** Cookie expiration in days (default: session cookie) */
  expires?: number;
  /** Path for the cookie (default: '/') */
  path?: string;
  /** Domain for the cookie */
  domain?: string;
  /** SameSite attribute (default: 'Strict') */
  sameSite?: 'Strict' | 'Lax' | 'None';
  /** Whether cookie requires HTTPS (default: true in production) */
  secure?: boolean;
  /** Maximum age in seconds */
  maxAge?: number;
}

const isSecureContext = (): boolean => {
  return window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
};

/**
 * Set a cookie with secure defaults
 */
export function setSecureCookie(
  name: string, 
  value: string, 
  options: CookieOptions = {}
): void {
  const {
    expires,
    path = '/',
    domain,
    sameSite = 'Strict',
    secure = isSecureContext(),
    maxAge,
  } = options;

  // Validate name (no special characters that could cause injection)
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    console.error('[Secure Cookie] Invalid cookie name');
    return;
  }

  // Encode value to prevent injection
  const encodedValue = encodeURIComponent(value);

  let cookieString = `${name}=${encodedValue}`;

  // Set expiration
  if (maxAge !== undefined) {
    cookieString += `; Max-Age=${maxAge}`;
  } else if (expires !== undefined) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expires);
    cookieString += `; Expires=${expirationDate.toUTCString()}`;
  }

  // Set path
  cookieString += `; Path=${path}`;

  // Set domain if provided
  if (domain) {
    cookieString += `; Domain=${domain}`;
  }

  // Set SameSite
  cookieString += `; SameSite=${sameSite}`;

  // Set Secure flag (required for SameSite=None)
  if (secure || sameSite === 'None') {
    cookieString += '; Secure';
  }

  // Set HttpOnly is not possible from JavaScript (must be set server-side)
  // This is a browser security feature

  document.cookie = cookieString;
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const [cookieName, ...cookieValueParts] = cookie.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValueParts.join('='));
    }
  }
  
  return null;
}

/**
 * Delete a cookie by name
 */
export function deleteCookie(name: string, path: string = '/', domain?: string): void {
  let cookieString = `${name}=; Max-Age=0; Path=${path}`;
  
  if (domain) {
    cookieString += `; Domain=${domain}`;
  }
  
  // Also set Expires to past date for older browsers
  cookieString += '; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  document.cookie = cookieString;
}

/**
 * Check if cookies are enabled
 */
export function areCookiesEnabled(): boolean {
  try {
    document.cookie = 'cookietest=1';
    const result = document.cookie.indexOf('cookietest=') !== -1;
    document.cookie = 'cookietest=1; expires=Thu, 01-Jan-1970 00:00:01 GMT';
    return result;
  } catch {
    return false;
  }
}

/**
 * Clear all cookies for the current domain
 */
export function clearAllCookies(): void {
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const cookieName = cookie.split('=')[0].trim();
    if (cookieName) {
      deleteCookie(cookieName);
    }
  }
}

/**
 * Set a secure session cookie (expires when browser closes)
 */
export function setSessionCookie(name: string, value: string): void {
  setSecureCookie(name, value, {
    sameSite: 'Strict',
    secure: isSecureContext(),
  });
}

/**
 * Set a secure persistent cookie with encryption-ready value
 */
export function setSecurePersistentCookie(
  name: string, 
  value: string, 
  days: number = 7
): void {
  setSecureCookie(name, value, {
    expires: days,
    sameSite: 'Strict',
    secure: isSecureContext(),
  });
}
