/**
 * Secrets Audit Utilities
 * 
 * Detects potential secret leaks in frontend code, logs, and DOM.
 * Provides utilities for secret validation and rotation tracking.
 */

// Patterns that indicate potential secrets
const SECRET_PATTERNS = {
  // API Keys
  genericApiKey: /(?:api[_-]?key|apikey)[\s:="']+[a-zA-Z0-9_-]{20,}/gi,
  
  // AWS
  awsAccessKey: /AKIA[0-9A-Z]{16}/g,
  awsSecretKey: /(?:aws)?[_-]?secret[_-]?(?:access)?[_-]?key[\s:="']+[A-Za-z0-9/+=]{40}/gi,
  
  // Stripe
  stripeSecretKey: /sk_(?:live|test)_[a-zA-Z0-9]{24,}/g,
  stripeRestrictedKey: /rk_(?:live|test)_[a-zA-Z0-9]{24,}/g,
  
  // GitHub
  githubToken: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
  githubOldToken: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g,
  
  // Google
  googleApiKey: /AIza[0-9A-Za-z_-]{35}/g,
  
  // Private Keys
  privateKey: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  
  // JWT tokens (long ones are suspicious)
  jwtToken: /eyJ[a-zA-Z0-9_-]{50,}\.eyJ[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{50,}/g,
  
  // Database URLs with credentials
  dbUrl: /(?:postgres|mysql|mongodb|redis):\/\/[^:]+:[^@]+@/gi,
  
  // Generic secrets
  genericSecret: /(?:password|passwd|pwd|secret|token|auth)[\s:="']+[^\s"']{8,}/gi,
  
  // Supabase service role (should never be in frontend)
  supabaseServiceKey: /eyJ[a-zA-Z0-9_-]+\.eyJ[^.]+service_role[^.]+\.[a-zA-Z0-9_-]+/g,
};

// Known safe patterns to exclude (like Supabase anon key which is meant to be public)
const SAFE_PATTERNS = [
  // Supabase anon keys are meant to be public
  /eyJ[a-zA-Z0-9_-]+\.eyJ[^}]+"role":"anon"[^}]+\.[a-zA-Z0-9_-]+/,
  // Stripe publishable keys are meant to be public
  /pk_(?:live|test)_[a-zA-Z0-9]{24,}/,
];

export interface SecretLeak {
  type: string;
  location: string;
  snippet: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

/**
 * Check if a match is a known safe pattern
 */
function isSafePattern(match: string): boolean {
  return SAFE_PATTERNS.some(pattern => pattern.test(match));
}

/**
 * Get severity based on secret type
 */
function getSeverity(type: string): SecretLeak['severity'] {
  const criticalTypes = ['awsSecretKey', 'stripeSecretKey', 'privateKey', 'supabaseServiceKey', 'dbUrl'];
  const highTypes = ['awsAccessKey', 'githubToken', 'githubOldToken'];
  const mediumTypes = ['googleApiKey', 'jwtToken', 'stripeRestrictedKey'];
  
  if (criticalTypes.includes(type)) return 'critical';
  if (highTypes.includes(type)) return 'high';
  if (mediumTypes.includes(type)) return 'medium';
  return 'low';
}

/**
 * Get recommendation based on secret type
 */
function getRecommendation(type: string): string {
  const recommendations: Record<string, string> = {
    awsAccessKey: 'Rotate AWS credentials immediately and use IAM roles instead',
    awsSecretKey: 'CRITICAL: Rotate AWS secret key immediately. Never expose in frontend',
    stripeSecretKey: 'CRITICAL: Rotate Stripe secret key. Use edge functions for payment processing',
    stripeRestrictedKey: 'Rotate restricted key. Consider using more limited scopes',
    githubToken: 'Revoke and regenerate GitHub token. Use fine-grained tokens with minimal permissions',
    googleApiKey: 'Restrict API key to specific domains and APIs in Google Cloud Console',
    privateKey: 'CRITICAL: Private key exposed. Regenerate immediately and never include in frontend',
    jwtToken: 'Check if this is a long-lived token. Use short-lived tokens and refresh mechanism',
    dbUrl: 'CRITICAL: Database credentials exposed. Rotate password and use connection pooling',
    supabaseServiceKey: 'CRITICAL: Service role key must never be in frontend. Use edge functions',
    genericSecret: 'Review if this secret should be exposed. Consider moving to backend',
    genericApiKey: 'Verify if this API key should be public. Restrict permissions if needed',
  };
  
  return recommendations[type] || 'Review if this value should be exposed in the frontend';
}

/**
 * Audit a string for potential secrets
 */
export function auditString(content: string, location: string): SecretLeak[] {
  const leaks: SecretLeak[] = [];
  
  for (const [type, pattern] of Object.entries(SECRET_PATTERNS)) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Skip if it's a known safe pattern
        if (isSafePattern(match)) continue;
        
        // Create a safe snippet (mask most of the secret)
        const maskedSnippet = match.length > 10 
          ? match.substring(0, 6) + '...' + match.substring(match.length - 4)
          : '***';
        
        leaks.push({
          type,
          location,
          snippet: maskedSnippet,
          severity: getSeverity(type),
          recommendation: getRecommendation(type),
        });
      }
    }
  }
  
  return leaks;
}

/**
 * Audit the window object for exposed secrets
 */
export function auditWindowObject(): SecretLeak[] {
  const leaks: SecretLeak[] = [];
  
  if (typeof window === 'undefined') return leaks;
  
  const checkObject = (obj: unknown, path: string, depth = 0): void => {
    // Limit recursion depth
    if (depth > 3) return;
    if (!obj || typeof obj !== 'object') return;
    
    try {
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        const value = (obj as Record<string, unknown>)[key];
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string') {
          const stringLeaks = auditString(value, `window.${currentPath}`);
          leaks.push(...stringLeaks);
        } else if (typeof value === 'object' && value !== null && value !== window) {
          checkObject(value, currentPath, depth + 1);
        }
      }
    } catch {
      // Ignore access errors
    }
  };
  
  // Check common locations
  const locationsToCheck = ['__INITIAL_STATE__', 'config', 'CONFIG', 'env', 'ENV', 'settings'];
  
  for (const location of locationsToCheck) {
    const windowObj = window as unknown as Record<string, unknown>;
    if (windowObj[location]) {
      checkObject(windowObj[location], location);
    }
  }
  
  return leaks;
}

/**
 * Audit localStorage and sessionStorage for secrets
 */
export function auditStorage(): SecretLeak[] {
  const leaks: SecretLeak[] = [];
  
  if (typeof window === 'undefined') return leaks;
  
  const checkStorage = (storage: Storage, name: string) => {
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          const value = storage.getItem(key);
          if (value) {
            const storageLeaks = auditString(value, `${name}["${key}"]`);
            leaks.push(...storageLeaks);
          }
        }
      }
    } catch {
      // Storage access may be blocked
    }
  };
  
  checkStorage(localStorage, 'localStorage');
  checkStorage(sessionStorage, 'sessionStorage');
  
  return leaks;
}

/**
 * Audit current page DOM for exposed secrets
 */
export function auditDOM(): SecretLeak[] {
  const leaks: SecretLeak[] = [];
  
  if (typeof document === 'undefined') return leaks;
  
  // Check meta tags
  const metaTags = document.querySelectorAll('meta');
  metaTags.forEach((meta) => {
    const content = meta.getAttribute('content');
    if (content) {
      const metaLeaks = auditString(content, `meta[name="${meta.getAttribute('name') || meta.getAttribute('property')}"]`);
      leaks.push(...metaLeaks);
    }
  });
  
  // Check script tags for inline secrets
  const scripts = document.querySelectorAll('script:not([src])');
  scripts.forEach((script, index) => {
    if (script.textContent) {
      const scriptLeaks = auditString(script.textContent, `inline-script[${index}]`);
      leaks.push(...scriptLeaks);
    }
  });
  
  // Check data attributes
  const elementsWithData = document.querySelectorAll('[data-api-key], [data-secret], [data-token]');
  elementsWithData.forEach((el) => {
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-')) {
        const attrLeaks = auditString(attr.value, `${el.tagName.toLowerCase()}[${attr.name}]`);
        leaks.push(...attrLeaks);
      }
    }
  });
  
  return leaks;
}

/**
 * Run full secrets audit
 */
export function runSecretsAudit(): {
  leaks: SecretLeak[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
} {
  const allLeaks: SecretLeak[] = [
    ...auditWindowObject(),
    ...auditStorage(),
    ...auditDOM(),
  ];
  
  // Deduplicate by type + location
  const uniqueLeaks = allLeaks.filter((leak, index, self) =>
    index === self.findIndex(l => l.type === leak.type && l.location === leak.location)
  );
  
  return {
    leaks: uniqueLeaks,
    summary: {
      total: uniqueLeaks.length,
      critical: uniqueLeaks.filter(l => l.severity === 'critical').length,
      high: uniqueLeaks.filter(l => l.severity === 'high').length,
      medium: uniqueLeaks.filter(l => l.severity === 'medium').length,
      low: uniqueLeaks.filter(l => l.severity === 'low').length,
    },
  };
}

/**
 * Environment variable validation
 */
export function validateEnvSecurity(): string[] {
  const warnings: string[] = [];
  
  // Check for common misconfigurations
  const dangerousEnvVars = [
    'VITE_SECRET',
    'VITE_PRIVATE_KEY',
    'VITE_SERVICE_ROLE',
    'VITE_ADMIN_PASSWORD',
    'VITE_DB_PASSWORD',
    'VITE_AWS_SECRET',
  ];
  
  for (const varName of dangerousEnvVars) {
    if (import.meta.env[varName]) {
      warnings.push(`CRITICAL: ${varName} should not be exposed in frontend. Use edge functions instead.`);
    }
  }
  
  // Check if service role key is accidentally exposed
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (anonKey && anonKey.includes('service_role')) {
    warnings.push('CRITICAL: Service role key exposed as anon key. This is a severe security risk.');
  }
  
  return warnings;
}
