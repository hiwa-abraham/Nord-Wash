/**
 * Rate Limiting Utilities
 * 
 * Client-side rate limiting for API calls and form submissions.
 * For server-side rate limiting in edge functions, see supabase/functions/_shared/rate-limit.ts
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limits
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default rate limit configuration
const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Check if a request should be rate limited (client-side)
 */
export function isRateLimited(
  key: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS
): { limited: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // No existing entry or expired
  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { limited: false, remaining: maxRequests - 1, resetIn: windowMs };
  }
  
  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return { 
      limited: true, 
      remaining: 0, 
      resetIn: entry.resetAt - now 
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return { 
    limited: false, 
    remaining: maxRequests - entry.count, 
    resetIn: entry.resetAt - now 
  };
}

/**
 * Reset rate limit for a key (e.g., after successful auth)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Rate limit presets for common operations
 */
export const rateLimitPresets = {
  /** Form submissions: 5 per minute */
  formSubmission: (key: string) => isRateLimited(key, 5, 60 * 1000),
  
  /** API calls: 30 per minute */
  apiCall: (key: string) => isRateLimited(key, 30, 60 * 1000),
  
  /** Auth attempts: 5 per 5 minutes */
  authAttempt: (key: string) => isRateLimited(key, 5, 5 * 60 * 1000),
  
  /** Payment operations: 3 per minute */
  paymentOperation: (key: string) => isRateLimited(key, 3, 60 * 1000),
  
  /** Search queries: 20 per minute */
  searchQuery: (key: string) => isRateLimited(key, 20, 60 * 1000),
};

/**
 * Cleanup expired entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
