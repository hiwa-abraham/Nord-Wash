/**
 * Security Middleware for Edge Functions
 * 
 * Provides zero-trust security, request validation, and DDoS protection.
 * Use this middleware for all edge functions to enforce consistent security.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { rateLimit, rateLimitPresets, rateLimitedResponse, RateLimitConfig } from "./rate-limit.ts";

// Use a more flexible type for the Supabase client
// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// CORS headers for all responses
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Security headers for all responses
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "Pragma": "no-cache",
};

// Combine all headers
export const allHeaders = {
  ...corsHeaders,
  ...securityHeaders,
  "Content-Type": "application/json",
};

export interface SecurityConfig {
  /** Require authentication (JWT validation) */
  requireAuth?: boolean;
  /** Required user role(s) */
  requiredRoles?: string[];
  /** Rate limit configuration */
  rateLimit?: RateLimitConfig | keyof typeof rateLimitPresets;
  /** Allowed HTTP methods */
  allowedMethods?: string[];
  /** Validate request origin */
  validateOrigin?: boolean;
  /** Allowed origins (if validateOrigin is true) */
  allowedOrigins?: string[];
  /** Skip rate limiting for certain paths */
  skipRateLimitPaths?: string[];
  /** Maximum request body size in bytes */
  maxBodySize?: number;
}

export interface SecurityContext {
  userId: string | null;
  userRole: string | null;
  supabaseClient: AnySupabaseClient;
  requestId: string;
  ipAddress: string;
}

export interface SecurityResult {
  allowed: boolean;
  context?: SecurityContext;
  error?: Response;
}

/**
 * Default allowed origins (production-safe)
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://lovable.dev",
  "https://lovable.app",
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovable\.dev$/,
  // Allow localhost for development
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
];

/**
 * Extract client IP from request headers
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  
  return "unknown";
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Validate request origin
 */
function isOriginAllowed(origin: string | null, allowedOrigins: (string | RegExp)[]): boolean {
  if (!origin) {
    return false;
  }
  
  for (const allowed of allowedOrigins) {
    if (typeof allowed === "string") {
      if (origin === allowed) {
        return true;
      }
    } else if (allowed instanceof RegExp) {
      if (allowed.test(origin)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Validate JWT and extract user info
 */
async function validateJWT(
  req: Request,
  supabaseClient: AnySupabaseClient
): Promise<{ userId: string | null; userRole: string | null }> {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { userId: null, userRole: null };
  }
  
  const token = authHeader.replace("Bearer ", "");
  
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      return { userId: null, userRole: null };
    }
    
    // Fetch user role from database
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single() as { data: { role: string } | null };
    
    return {
      userId: user.id,
      userRole: roleData?.role || null,
    };
  } catch {
    return { userId: null, userRole: null };
  }
}

/**
 * Create security middleware response
 */
function securityError(status: number, message: string, requestId: string): Response {
  return new Response(
    JSON.stringify({
      error: message,
      requestId,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: allHeaders,
    }
  );
}

/**
 * Apply security middleware to a request
 * 
 * @example
 * const result = await applySecurityMiddleware(req, {
 *   requireAuth: true,
 *   requiredRoles: ['admin'],
 *   rateLimit: 'strict',
 * });
 * 
 * if (!result.allowed) {
 *   return result.error;
 * }
 * 
 * const { userId, supabaseClient } = result.context;
 */
export async function applySecurityMiddleware(
  req: Request,
  config: SecurityConfig = {}
): Promise<SecurityResult> {
  const requestId = req.headers.get("x-request-id") || generateRequestId();
  const ipAddress = getClientIP(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return {
      allowed: false,
      error: new Response(null, {
        status: 204,
        headers: corsHeaders,
      }),
    };
  }
  
  // Check allowed methods
  const allowedMethods = config.allowedMethods || ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
  if (!allowedMethods.includes(req.method)) {
    return {
      allowed: false,
      error: securityError(405, `Method ${req.method} not allowed`, requestId),
    };
  }
  
  // Validate origin (if enabled)
  if (config.validateOrigin !== false) {
    const origin = req.headers.get("origin");
    const allowedOrigins = config.allowedOrigins?.length
      ? config.allowedOrigins.map(o => typeof o === "string" ? o : new RegExp(o))
      : DEFAULT_ALLOWED_ORIGINS;
    
    // Only enforce origin check for non-GET requests in production
    if (req.method !== "GET" && origin && !isOriginAllowed(origin, allowedOrigins as (string | RegExp)[])) {
      console.warn(`[Security] Blocked request from unauthorized origin: ${origin}`);
      return {
        allowed: false,
        error: securityError(403, "Origin not allowed", requestId),
      };
    }
  }
  
  // Apply rate limiting
  if (config.rateLimit) {
    const rateLimitConfig = typeof config.rateLimit === "string"
      ? rateLimitPresets[config.rateLimit]
      : config.rateLimit;
    
    const rateLimitResult = rateLimit(req, rateLimitConfig);
    
    if (!rateLimitResult.allowed) {
      console.warn(`[Security] Rate limit exceeded for IP: ${ipAddress}`);
      return {
        allowed: false,
        error: rateLimitedResponse(rateLimitResult, corsHeaders),
      };
    }
  }
  
  // Check request body size (for POST/PUT/PATCH)
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const contentLength = req.headers.get("content-length");
    const maxBodySize = config.maxBodySize || 1024 * 1024; // Default 1MB
    
    if (contentLength && parseInt(contentLength) > maxBodySize) {
      return {
        allowed: false,
        error: securityError(413, "Request body too large", requestId),
      };
    }
  }
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  // Validate JWT and get user info
  const { userId, userRole } = await validateJWT(req, supabaseClient);
  
  // Check authentication requirement
  if (config.requireAuth && !userId) {
    return {
      allowed: false,
      error: securityError(401, "Authentication required", requestId),
    };
  }
  
  // Check role requirement
  if (config.requiredRoles?.length && userId) {
    if (!userRole || !config.requiredRoles.includes(userRole)) {
      console.warn(`[Security] Access denied for user ${userId} with role ${userRole}`);
      return {
        allowed: false,
        error: securityError(403, "Insufficient permissions", requestId),
      };
    }
  }
  
  // All checks passed
  return {
    allowed: true,
    context: {
      userId,
      userRole,
      supabaseClient,
      requestId,
      ipAddress,
    },
  };
}

/**
 * Log security event to database
 */
export async function logSecurityEvent(
  supabaseClient: AnySupabaseClient,
  event: {
    eventType: string;
    description: string;
    severity: "info" | "warning" | "error" | "critical";
    userId?: string | null;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabaseClient.rpc("log_security_event", {
      _event_type: event.eventType,
      _description: event.description,
      _severity: event.severity,
      _user_id: event.userId || null,
      _ip_address: event.ipAddress || null,
      _metadata: event.metadata || null,
    } as Record<string, unknown>);
  } catch (error) {
    console.error("[Security] Failed to log security event:", error);
  }
}

/**
 * Create a secure JSON response
 */
export function secureResponse(
  data: unknown,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...allHeaders,
      ...additionalHeaders,
    },
  });
}

/**
 * Validate and sanitize request body
 */
export async function parseSecureBody<T>(
  req: Request,
  validator?: (body: unknown) => T | null
): Promise<{ data: T | null; error: string | null }> {
  try {
    const contentType = req.headers.get("content-type");
    
    if (!contentType?.includes("application/json")) {
      return { data: null, error: "Content-Type must be application/json" };
    }
    
    const body = await req.json();
    
    if (validator) {
      const validated = validator(body);
      if (!validated) {
        return { data: null, error: "Invalid request body" };
      }
      return { data: validated, error: null };
    }
    
    return { data: body as T, error: null };
  } catch {
    return { data: null, error: "Failed to parse request body" };
  }
}
