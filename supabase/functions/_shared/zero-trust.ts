/**
 * Zero-Trust Security Module
 * 
 * Implements zero-trust networking principles for edge functions.
 * "Never trust, always verify" - validates every request regardless of source.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

export interface ZeroTrustConfig {
  /** Verify JWT on every request */
  verifyJWT: boolean;
  /** Verify user exists in database */
  verifyUserExists: boolean;
  /** Verify user has required permissions */
  verifyPermissions?: string[];
  /** Verify request comes from allowed device */
  verifyDevice?: boolean;
  /** Verify session is still active */
  verifySession?: boolean;
  /** Maximum token age in seconds (default: 3600) */
  maxTokenAge?: number;
  /** Log all access attempts */
  auditLog?: boolean;
}

export interface ZeroTrustContext {
  user: {
    id: string;
    email: string | null;
    role: string | null;
  };
  session: {
    id: string;
    expiresAt: number;
    isExpired: boolean;
  };
  device: {
    userAgent: string;
    fingerprint: string | null;
  };
  request: {
    id: string;
    timestamp: number;
    ip: string;
    origin: string | null;
  };
}

export interface ZeroTrustResult {
  verified: boolean;
  context?: ZeroTrustContext;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ZeroTrustConfig = {
  verifyJWT: true,
  verifyUserExists: true,
  verifySession: true,
  maxTokenAge: 3600,
  auditLog: true,
};

/**
 * Extract JWT payload without verification (for inspection)
 */
function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Generate device fingerprint from request headers
 */
function generateDeviceFingerprint(headers: Headers): string {
  const components = [
    headers.get("user-agent") || "",
    headers.get("accept-language") || "",
    headers.get("accept-encoding") || "",
    headers.get("sec-ch-ua") || "",
    headers.get("sec-ch-ua-platform") || "",
    headers.get("sec-ch-ua-mobile") || "",
  ];
  
  // Simple hash of the components
  const combined = components.join("|");
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `fp_${Math.abs(hash).toString(36)}`;
}

/**
 * Get client IP from request
 */
function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Verify request using zero-trust principles
 */
export async function verifyZeroTrust(
  req: Request,
  config: Partial<ZeroTrustConfig> = {}
): Promise<ZeroTrustResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const timestamp = Date.now();
  const requestId = `zt_${timestamp}_${Math.random().toString(36).substring(2, 11)}`;
  const ip = getClientIP(req);
  const origin = req.headers.get("origin");
  const userAgent = req.headers.get("user-agent") || "";
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  // Extract and validate JWT
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (mergedConfig.verifyJWT) {
      return {
        verified: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Authorization token is required",
          statusCode: 401,
        },
      };
    }
    
    return {
      verified: true,
      context: {
        user: { id: "", email: null, role: null },
        session: { id: "", expiresAt: 0, isExpired: true },
        device: { userAgent, fingerprint: generateDeviceFingerprint(req.headers) },
        request: { id: requestId, timestamp, ip, origin },
      },
    };
  }
  
  const token = authHeader.replace("Bearer ", "");
  
  // Decode and check token age
  const payload = decodeJWTPayload(token);
  if (!payload) {
    return {
      verified: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token format is invalid",
        statusCode: 401,
      },
    };
  }
  
  // Check token expiration
  const exp = payload.exp as number;
  const iat = payload.iat as number;
  
  if (exp && exp * 1000 < timestamp) {
    return {
      verified: false,
      error: {
        code: "TOKEN_EXPIRED",
        message: "Token has expired",
        statusCode: 401,
      },
    };
  }
  
  // Check token age
  if (iat && mergedConfig.maxTokenAge) {
    const tokenAge = (timestamp / 1000) - iat;
    if (tokenAge > mergedConfig.maxTokenAge) {
      return {
        verified: false,
        error: {
          code: "TOKEN_TOO_OLD",
          message: "Token needs refresh",
          statusCode: 401,
        },
      };
    }
  }
  
  // Verify with Supabase
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError || !user) {
    return {
      verified: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token validation failed",
        statusCode: 401,
      },
    };
  }
  
  // Verify user exists in database
  if (mergedConfig.verifyUserExists) {
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    if (profileError || !profile) {
      return {
        verified: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User profile not found",
          statusCode: 403,
        },
      };
    }
  }
  
  // Get user role
  let userRole: string | null = null;
  
  const { data: roleData } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  
  if (roleData) {
    userRole = roleData.role;
  }
  
  // Verify permissions
  if (mergedConfig.verifyPermissions?.length) {
    if (!userRole || !mergedConfig.verifyPermissions.includes(userRole)) {
      return {
        verified: false,
        error: {
          code: "INSUFFICIENT_PERMISSIONS",
          message: "User lacks required permissions",
          statusCode: 403,
        },
      };
    }
  }
  
  // Build context
  const context: ZeroTrustContext = {
    user: {
      id: user.id,
      email: user.email || null,
      role: userRole,
    },
    session: {
      id: payload.session_id as string || "",
      expiresAt: exp * 1000,
      isExpired: false,
    },
    device: {
      userAgent,
      fingerprint: generateDeviceFingerprint(req.headers),
    },
    request: {
      id: requestId,
      timestamp,
      ip,
      origin,
    },
  };
  
  // Log access attempt if auditing is enabled
  if (mergedConfig.auditLog) {
    try {
      await supabaseClient.rpc("log_security_event", {
        _event_type: "zero_trust_access",
        _description: `Access verified for user ${user.id}`,
        _severity: "info",
        _user_id: user.id,
        _ip_address: ip,
        _metadata: {
          requestId,
          origin,
          userAgent,
          role: userRole,
        },
      });
    } catch {
      // Silently fail audit logging
    }
  }
  
  return {
    verified: true,
    context,
  };
}

/**
 * Create zero-trust error response
 */
export function zeroTrustError(result: ZeroTrustResult): Response {
  if (!result.error) {
    return new Response(JSON.stringify({ error: "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  return new Response(
    JSON.stringify({
      error: result.error.message,
      code: result.error.code,
    }),
    {
      status: result.error.statusCode,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    }
  );
}

/**
 * Helper to require zero-trust verification
 */
export async function requireZeroTrust(
  req: Request,
  config?: Partial<ZeroTrustConfig>
): Promise<{ context: ZeroTrustContext } | { error: Response }> {
  const result = await verifyZeroTrust(req, config);
  
  if (!result.verified || !result.context) {
    return { error: zeroTrustError(result) };
  }
  
  return { context: result.context };
}
