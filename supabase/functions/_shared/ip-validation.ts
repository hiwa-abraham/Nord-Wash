/**
 * IP Validation and Geo-blocking Utilities
 * 
 * Provides IP address validation, suspicious pattern detection,
 * and configurable geo-blocking for edge functions.
 */

export interface IPValidationConfig {
  /** Block Tor exit nodes */
  blockTor?: boolean;
  /** Block known VPN/proxy IPs */
  blockVPN?: boolean;
  /** Block requests from data centers */
  blockDataCenters?: boolean;
  /** Allowed countries (ISO 3166-1 alpha-2 codes) */
  allowedCountries?: string[];
  /** Blocked countries (ISO 3166-1 alpha-2 codes) */
  blockedCountries?: string[];
  /** Custom IP blocklist */
  blockedIPs?: string[];
  /** Custom IP allowlist (bypasses other checks) */
  allowedIPs?: string[];
  /** Block private/internal IPs in production */
  blockPrivateIPs?: boolean;
}

export interface IPValidationResult {
  allowed: boolean;
  reason?: string;
  riskScore: number; // 0-100, higher = more risky
  metadata?: {
    isPrivate: boolean;
    isProxy: boolean;
    isTor: boolean;
    isDataCenter: boolean;
    country?: string;
  };
}

/**
 * Private IP ranges (RFC 1918, RFC 4193, loopback)
 */
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^::1$/,
  /^fc00:/,
  /^fd00:/,
  /^fe80:/,
];

/**
 * Common data center IP ranges (partial list)
 */
const DATA_CENTER_RANGES = [
  /^34\.(64|65|66|67|68|69|70|71|72|73|74|75|76|77|78|79|80|81|82|83|84|85|86|87|88|89|90|91|92|93|94|95)\./,  // Google Cloud
  /^35\./,  // Google Cloud
  /^13\.(52|56|57|58|59|112|113|114|115)\./,  // AWS
  /^52\./,  // AWS
  /^54\./,  // AWS
  /^18\./,  // AWS
  /^3\.(64|65|66|67|68|69|70|71|72|73|74|75|76|77|78|79|80|81|82|83|84|85|86|87|88|89|90|91|92|93|94|95|96|97|98|99|100|101|102|103|104|105|106|107|108|109|110|111)\./,  // AWS
  /^104\.(16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31)\./,  // Cloudflare
  /^40\./,  // Azure
  /^20\./,  // Azure
  /^137\.116\./,  // Azure
  /^23\.96\./,  // Azure
];

/**
 * Known suspicious patterns
 */
const SUSPICIOUS_PATTERNS = {
  rapidRequests: (timestamps: number[], windowMs: number, threshold: number) => {
    const now = Date.now();
    const recentRequests = timestamps.filter(t => now - t < windowMs);
    return recentRequests.length >= threshold;
  },
  unusualHeaders: (headers: Headers) => {
    // Check for missing common headers
    const hasUserAgent = headers.has("user-agent");
    const hasAccept = headers.has("accept");
    
    if (!hasUserAgent || !hasAccept) {
      return true;
    }
    
    // Check for bot-like user agents
    const userAgent = headers.get("user-agent")?.toLowerCase() || "";
    const botPatterns = [
      /curl/i,
      /wget/i,
      /python-requests/i,
      /scrapy/i,
      /bot/i,
      /crawler/i,
      /spider/i,
    ];
    
    return botPatterns.some(p => p.test(userAgent));
  },
};

/**
 * Check if IP is private
 */
function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RANGES.some(pattern => pattern.test(ip));
}

/**
 * Check if IP is from a data center
 */
function isDataCenterIP(ip: string): boolean {
  return DATA_CENTER_RANGES.some(pattern => pattern.test(ip));
}

/**
 * Calculate risk score based on various factors
 */
function calculateRiskScore(
  ip: string,
  headers: Headers,
  metadata: IPValidationResult["metadata"]
): number {
  let score = 0;
  
  // Private IPs get moderate score (could be testing)
  if (metadata?.isPrivate) {
    score += 20;
  }
  
  // Data center IPs are suspicious
  if (metadata?.isDataCenter) {
    score += 30;
  }
  
  // Proxy/VPN adds risk
  if (metadata?.isProxy) {
    score += 25;
  }
  
  // Tor is high risk
  if (metadata?.isTor) {
    score += 50;
  }
  
  // Check for suspicious headers
  if (SUSPICIOUS_PATTERNS.unusualHeaders(headers)) {
    score += 15;
  }
  
  // Missing or suspicious user agent
  const userAgent = headers.get("user-agent");
  if (!userAgent || userAgent.length < 10) {
    score += 10;
  }
  
  return Math.min(100, score);
}

/**
 * Validate an IP address against security rules
 */
export function validateIP(
  ip: string,
  headers: Headers,
  config: IPValidationConfig = {}
): IPValidationResult {
  // Check allowlist first (bypass all other checks)
  if (config.allowedIPs?.includes(ip)) {
    return {
      allowed: true,
      riskScore: 0,
      metadata: {
        isPrivate: isPrivateIP(ip),
        isProxy: false,
        isTor: false,
        isDataCenter: false,
      },
    };
  }
  
  // Check blocklist
  if (config.blockedIPs?.includes(ip)) {
    return {
      allowed: false,
      reason: "IP is blocklisted",
      riskScore: 100,
      metadata: {
        isPrivate: isPrivateIP(ip),
        isProxy: false,
        isTor: false,
        isDataCenter: false,
      },
    };
  }
  
  const isPrivate = isPrivateIP(ip);
  const isDataCenter = isDataCenterIP(ip);
  
  const metadata: IPValidationResult["metadata"] = {
    isPrivate,
    isProxy: false, // Would need external service to detect
    isTor: false,   // Would need Tor exit node list
    isDataCenter,
  };
  
  // Block private IPs in production if configured
  if (config.blockPrivateIPs && isPrivate) {
    const isProduction = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
    if (isProduction) {
      return {
        allowed: false,
        reason: "Private IPs not allowed in production",
        riskScore: 50,
        metadata,
      };
    }
  }
  
  // Block data center IPs if configured
  if (config.blockDataCenters && isDataCenter) {
    return {
      allowed: false,
      reason: "Data center IPs not allowed",
      riskScore: 60,
      metadata,
    };
  }
  
  // Calculate risk score
  const riskScore = calculateRiskScore(ip, headers, metadata);
  
  return {
    allowed: true,
    riskScore,
    metadata,
  };
}

/**
 * Track request history for pattern detection
 */
const requestHistory = new Map<string, number[]>();
const HISTORY_WINDOW_MS = 60000; // 1 minute
const MAX_HISTORY_SIZE = 10000;

/**
 * Clean up old history entries
 */
function cleanupHistory(): void {
  const now = Date.now();
  for (const [key, timestamps] of requestHistory.entries()) {
    const recent = timestamps.filter(t => now - t < HISTORY_WINDOW_MS);
    if (recent.length === 0) {
      requestHistory.delete(key);
    } else {
      requestHistory.set(key, recent);
    }
  }
  
  // If still too large, remove oldest entries
  if (requestHistory.size > MAX_HISTORY_SIZE) {
    const entries = Array.from(requestHistory.entries());
    entries.sort((a, b) => Math.max(...b[1]) - Math.max(...a[1]));
    
    for (let i = MAX_HISTORY_SIZE; i < entries.length; i++) {
      requestHistory.delete(entries[i][0]);
    }
  }
}

/**
 * Track a request from an IP
 */
export function trackRequest(ip: string): { requestCount: number; isAnomalous: boolean } {
  cleanupHistory();
  
  const now = Date.now();
  const timestamps = requestHistory.get(ip) || [];
  timestamps.push(now);
  requestHistory.set(ip, timestamps);
  
  // Check for anomalous patterns
  const isAnomalous = SUSPICIOUS_PATTERNS.rapidRequests(timestamps, 10000, 50); // 50 requests in 10 seconds
  
  return {
    requestCount: timestamps.length,
    isAnomalous,
  };
}

/**
 * Get request statistics for an IP
 */
export function getIPStats(ip: string): {
  requestsInLastMinute: number;
  firstSeen: number | null;
  lastSeen: number | null;
} {
  const timestamps = requestHistory.get(ip) || [];
  
  return {
    requestsInLastMinute: timestamps.length,
    firstSeen: timestamps.length > 0 ? Math.min(...timestamps) : null,
    lastSeen: timestamps.length > 0 ? Math.max(...timestamps) : null,
  };
}

/**
 * Block an IP temporarily
 */
const temporaryBlocks = new Map<string, number>();

export function blockIP(ip: string, durationMs: number = 3600000): void {
  temporaryBlocks.set(ip, Date.now() + durationMs);
}

export function unblockIP(ip: string): void {
  temporaryBlocks.delete(ip);
}

export function isIPBlocked(ip: string): boolean {
  const blockedUntil = temporaryBlocks.get(ip);
  if (!blockedUntil) {
    return false;
  }
  
  if (Date.now() >= blockedUntil) {
    temporaryBlocks.delete(ip);
    return false;
  }
  
  return true;
}
