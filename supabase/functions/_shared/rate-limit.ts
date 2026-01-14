/**
 * Rate Limiting Middleware for Edge Functions
 * 
 * Server-side rate limiting using in-memory storage.
 * For production, consider using Redis or Supabase tables.
 * 
 * Usage:
 * import { rateLimit, RateLimitConfig } from '../_shared/rate-limit.ts';
 * 
 * const config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 };
 * const result = rateLimit(req, config);
 * if (!result.allowed) {
 *   return new Response('Too Many Requests', { status: 429, headers: result.headers });
 * }
 */

export interface RateLimitConfig {
  /** Maximum requests allowed in window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Custom key generator (defaults to IP) */
  keyGenerator?: (req: Request) => string;
  /** Skip rate limiting for certain requests */
  skip?: (req: Request) => boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  headers: Record<string, string>;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on function cold start)
// For production, use Redis or database
const store = new Map<string, RateLimitEntry>();

// Cleanup interval
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60000; // 1 minute

/**
 * Get client identifier from request
 */
function getClientKey(req: Request): string {
  // Try X-Forwarded-For first (behind proxy/load balancer)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Fall back to X-Real-IP
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Use a hash of user agent as last resort
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return `ua_${hashString(userAgent)}`;
}

/**
 * Simple string hash
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Cleanup expired entries
 */
function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Rate limit preset configurations
 */
export const rateLimitPresets = {
  /** Standard API: 60 requests per minute */
  standard: { maxRequests: 60, windowMs: 60000 },
  
  /** Strict: 10 requests per minute */
  strict: { maxRequests: 10, windowMs: 60000 },
  
  /** Auth: 5 attempts per 5 minutes */
  auth: { maxRequests: 5, windowMs: 300000 },
  
  /** Payment: 5 requests per minute */
  payment: { maxRequests: 5, windowMs: 60000 },
  
  /** Webhook: 100 requests per minute */
  webhook: { maxRequests: 100, windowMs: 60000 },
};

/**
 * Check rate limit for a request
 */
export function rateLimit(
  req: Request,
  config: RateLimitConfig
): RateLimitResult {
  // Run cleanup periodically
  cleanup();
  
  // Check if should skip
  if (config.skip?.(req)) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: Date.now() + config.windowMs,
      headers: {},
    };
  }
  
  // Get client key
  const keyGenerator = config.keyGenerator || getClientKey;
  const clientKey = keyGenerator(req);
  const now = Date.now();
  
  // Get or create entry
  let entry = store.get(clientKey);
  
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }
  
  // Increment count
  entry.count++;
  store.set(clientKey, entry);
  
  // Check if over limit
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  
  // Build headers
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
  };
  
  if (!allowed) {
    headers['Retry-After'] = String(Math.ceil((entry.resetAt - now) / 1000));
  }
  
  return { allowed, remaining, resetAt: entry.resetAt, headers };
}

/**
 * Rate limit by user ID (for authenticated requests)
 */
export function rateLimitByUser(
  userId: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();
  
  const now = Date.now();
  const clientKey = `user_${userId}`;
  
  let entry = store.get(clientKey);
  
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs };
  }
  
  entry.count++;
  store.set(clientKey, entry);
  
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  
  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    headers: {
      'X-RateLimit-Limit': String(config.maxRequests),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
    },
  };
}

/**
 * Create rate-limited response
 */
export function rateLimitedResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
        ...result.headers,
      },
    }
  );
}
