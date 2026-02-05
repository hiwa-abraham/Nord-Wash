/**
 * Dependency Security Scanner
 * 
 * Scans project dependencies for known vulnerabilities and security issues.
 * Provides utilities for checking dependency health and security advisories.
 */

export interface DependencyVulnerability {
  package: string;
  version: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  cwe?: string;
  cvss?: number;
}

export interface DependencyScanResult {
  scannedAt: Date;
  totalDependencies: number;
  vulnerabilities: DependencyVulnerability[];
  outdatedPackages: OutdatedPackage[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    outdated: number;
  };
}

export interface OutdatedPackage {
  package: string;
  currentVersion: string;
  latestVersion: string;
  isSecurityUpdate: boolean;
}

// Known vulnerable patterns to check against
const KNOWN_VULNERABLE_PATTERNS: Array<{
  pattern: RegExp;
  severity: DependencyVulnerability['severity'];
  title: string;
  description: string;
  recommendation: string;
}> = [
  {
    pattern: /^lodash@[0-3]\./,
    severity: 'high',
    title: 'Prototype Pollution in lodash',
    description: 'Versions before 4.17.21 are vulnerable to Prototype Pollution',
    recommendation: 'Upgrade to lodash@4.17.21 or later',
  },
  {
    pattern: /^axios@0\.(1[0-8]|[0-9])\./,
    severity: 'medium',
    title: 'Server-Side Request Forgery in axios',
    description: 'Versions before 0.21.1 may be vulnerable to SSRF',
    recommendation: 'Upgrade to axios@0.21.1 or later',
  },
  {
    pattern: /^minimist@[0-1]\.[0-1]\./,
    severity: 'critical',
    title: 'Prototype Pollution in minimist',
    description: 'Versions before 1.2.6 are vulnerable to Prototype Pollution',
    recommendation: 'Upgrade to minimist@1.2.6 or later',
  },
  {
    pattern: /^node-fetch@[0-2]\.[0-5]\./,
    severity: 'high',
    title: 'Exposure of Sensitive Information in node-fetch',
    description: 'Versions before 2.6.7 may expose sensitive headers',
    recommendation: 'Upgrade to node-fetch@2.6.7 or later',
  },
  {
    pattern: /^jsonwebtoken@[0-8]\./,
    severity: 'high',
    title: 'Algorithm Confusion in jsonwebtoken',
    description: 'Versions before 9.0.0 may be vulnerable to algorithm confusion attacks',
    recommendation: 'Upgrade to jsonwebtoken@9.0.0 or later',
  },
];

// Packages that should never be in production frontend
const FORBIDDEN_FRONTEND_PACKAGES = [
  { name: 'dotenv', reason: 'Environment management should not be in frontend bundle' },
  { name: 'bcrypt', reason: 'Password hashing must happen server-side' },
  { name: 'crypto', reason: 'Use Web Crypto API instead of Node crypto' },
  { name: 'fs', reason: 'File system access not available in browser' },
  { name: 'child_process', reason: 'Process spawning not available in browser' },
  { name: 'pg', reason: 'Direct database access must be server-side only' },
  { name: 'mysql', reason: 'Direct database access must be server-side only' },
  { name: 'mongodb', reason: 'Direct database access must be server-side only' },
];

/**
 * Check a dependency string against known vulnerabilities
 */
export function checkDependency(packageName: string, version: string): DependencyVulnerability | null {
  const fullName = `${packageName}@${version}`;
  
  for (const vuln of KNOWN_VULNERABLE_PATTERNS) {
    if (vuln.pattern.test(fullName)) {
      return {
        package: packageName,
        version,
        severity: vuln.severity,
        title: vuln.title,
        description: vuln.description,
        recommendation: vuln.recommendation,
      };
    }
  }
  
  return null;
}

/**
 * Check if a package is forbidden in frontend code
 */
export function checkForbiddenPackage(packageName: string): { forbidden: boolean; reason?: string } {
  const forbidden = FORBIDDEN_FRONTEND_PACKAGES.find(p => p.name === packageName);
  return forbidden 
    ? { forbidden: true, reason: forbidden.reason }
    : { forbidden: false };
}

/**
 * Validate import statement for security issues
 */
export function validateImport(importPath: string): { safe: boolean; warning?: string } {
  // Check for forbidden packages
  const packageName = importPath.split('/')[0].replace(/^@/, '');
  const forbiddenCheck = checkForbiddenPackage(packageName);
  
  if (forbiddenCheck.forbidden) {
    return { safe: false, warning: forbiddenCheck.reason };
  }
  
  // Check for direct file system access patterns
  if (/\.(env|pem|key|crt|pfx)$/.test(importPath)) {
    return { safe: false, warning: 'Importing sensitive file types is not allowed' };
  }
  
  // Check for relative imports going too far up
  if (/\.\.\/\.\.\/\.\.\/\.\.\//.test(importPath)) {
    return { safe: false, warning: 'Deep relative imports may indicate path traversal issues' };
  }
  
  return { safe: true };
}

/**
 * Security recommendations for dependency management
 */
export const DEPENDENCY_SECURITY_GUIDELINES = {
  general: [
    'Pin exact versions in package.json for reproducible builds',
    'Use package-lock.json or yarn.lock for dependency locking',
    'Regularly update dependencies to get security patches',
    'Remove unused dependencies to reduce attack surface',
    'Use npm audit or yarn audit before deployments',
  ],
  frontend: [
    'Minimize bundle size by using tree-shaking friendly packages',
    'Avoid packages that require polyfills for sensitive Node.js APIs',
    'Check if package is actively maintained before adding',
    'Prefer packages with TypeScript support for better security',
  ],
  backend: [
    'Use parameterized queries for database access',
    'Validate all input from external sources',
    'Use environment variables for sensitive configuration',
    'Implement rate limiting for all public endpoints',
  ],
};

/**
 * Get security score for dependencies
 */
export function calculateSecurityScore(scanResult: DependencyScanResult): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
} {
  let score = 100;
  const recommendations: string[] = [];
  
  // Deduct points for vulnerabilities
  score -= scanResult.summary.critical * 25;
  score -= scanResult.summary.high * 15;
  score -= scanResult.summary.medium * 5;
  score -= scanResult.summary.low * 2;
  
  // Deduct for outdated packages
  score -= Math.min(scanResult.summary.outdated * 2, 20);
  
  // Add recommendations
  if (scanResult.summary.critical > 0) {
    recommendations.push('URGENT: Fix critical vulnerabilities immediately');
  }
  if (scanResult.summary.high > 0) {
    recommendations.push('Update packages with high-severity vulnerabilities');
  }
  if (scanResult.summary.outdated > 5) {
    recommendations.push('Consider updating outdated dependencies');
  }
  
  // Calculate grade
  const grade: 'A' | 'B' | 'C' | 'D' | 'F' = 
    score >= 90 ? 'A' :
    score >= 80 ? 'B' :
    score >= 70 ? 'C' :
    score >= 60 ? 'D' : 'F';
  
  return {
    score: Math.max(0, Math.min(100, score)),
    grade,
    recommendations,
  };
}
