/**
 * Static Application Security Testing (SAST) Scanner
 * 
 * Detects common security vulnerabilities in code patterns.
 * Runs client-side for real-time feedback during development.
 */

export interface SASTFinding {
  id: string;
  category: SASTCategory;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  location?: string;
  lineNumber?: number;
  codeSnippet?: string;
  recommendation: string;
  cwe?: string;
  owasp?: string;
}

export type SASTCategory = 
  | 'injection'
  | 'xss'
  | 'authentication'
  | 'authorization'
  | 'cryptography'
  | 'sensitive-data'
  | 'configuration'
  | 'validation';

interface SASTRule {
  id: string;
  category: SASTCategory;
  severity: SASTFinding['severity'];
  title: string;
  description: string;
  pattern: RegExp;
  recommendation: string;
  cwe?: string;
  owasp?: string;
  // If true, the pattern indicates safe code (used for positive patterns)
  isPositive?: boolean;
}

// SAST rules for detecting vulnerabilities
const SAST_RULES: SASTRule[] = [
  // Injection vulnerabilities
  {
    id: 'SQL_INJECTION',
    category: 'injection',
    severity: 'critical',
    title: 'Potential SQL Injection',
    description: 'String concatenation in SQL queries can lead to SQL injection attacks',
    pattern: /(?:query|execute|sql)\s*\(\s*[`'"].*\$\{.*\}.*[`'"]\s*\)/gi,
    recommendation: 'Use parameterized queries or prepared statements instead of string interpolation',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
  },
  {
    id: 'COMMAND_INJECTION',
    category: 'injection',
    severity: 'critical',
    title: 'Potential Command Injection',
    description: 'Executing shell commands with user input can lead to command injection',
    pattern: /(?:exec|spawn|execSync|spawnSync)\s*\([^)]*\$\{/gi,
    recommendation: 'Avoid executing shell commands with user input. Use safe APIs instead',
    cwe: 'CWE-78',
    owasp: 'A03:2021',
  },
  {
    id: 'EVAL_USAGE',
    category: 'injection',
    severity: 'critical',
    title: 'Dangerous eval() Usage',
    description: 'eval() can execute arbitrary code and should be avoided',
    pattern: /\beval\s*\(/gi,
    recommendation: 'Remove eval() usage. Use JSON.parse() for JSON or other safe alternatives',
    cwe: 'CWE-95',
    owasp: 'A03:2021',
  },
  {
    id: 'FUNCTION_CONSTRUCTOR',
    category: 'injection',
    severity: 'high',
    title: 'Function Constructor Usage',
    description: 'new Function() can execute arbitrary code similar to eval()',
    pattern: /new\s+Function\s*\(/gi,
    recommendation: 'Avoid using Function constructor. Use regular functions instead',
    cwe: 'CWE-95',
    owasp: 'A03:2021',
  },
  
  // XSS vulnerabilities
  {
    id: 'DANGEROUS_HTML',
    category: 'xss',
    severity: 'high',
    title: 'Dangerous HTML Injection',
    description: 'dangerouslySetInnerHTML can lead to XSS if content is not sanitized',
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/gi,
    recommendation: 'Sanitize HTML content using DOMPurify before rendering',
    cwe: 'CWE-79',
    owasp: 'A03:2021',
  },
  {
    id: 'DOCUMENT_WRITE',
    category: 'xss',
    severity: 'high',
    title: 'document.write Usage',
    description: 'document.write can introduce XSS vulnerabilities',
    pattern: /document\.write\s*\(/gi,
    recommendation: 'Use DOM manipulation methods instead of document.write',
    cwe: 'CWE-79',
    owasp: 'A03:2021',
  },
  {
    id: 'INNERHTML_ASSIGNMENT',
    category: 'xss',
    severity: 'medium',
    title: 'innerHTML Assignment',
    description: 'Direct innerHTML assignment can lead to XSS',
    pattern: /\.innerHTML\s*=\s*[^;]+;/gi,
    recommendation: 'Use textContent for plain text or sanitize HTML with DOMPurify',
    cwe: 'CWE-79',
    owasp: 'A03:2021',
  },
  
  // Authentication issues
  {
    id: 'HARDCODED_PASSWORD',
    category: 'authentication',
    severity: 'critical',
    title: 'Hardcoded Password',
    description: 'Passwords should never be hardcoded in source code',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/gi,
    recommendation: 'Use environment variables or secure vault for credentials',
    cwe: 'CWE-798',
    owasp: 'A07:2021',
  },
  {
    id: 'HARDCODED_API_KEY',
    category: 'authentication',
    severity: 'high',
    title: 'Hardcoded API Key',
    description: 'API keys should not be hardcoded in source code',
    pattern: /(?:api[_-]?key|apikey|api_secret)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
    recommendation: 'Use environment variables for API keys',
    cwe: 'CWE-798',
    owasp: 'A07:2021',
  },
  {
    id: 'JWT_SECRET_HARDCODED',
    category: 'authentication',
    severity: 'critical',
    title: 'Hardcoded JWT Secret',
    description: 'JWT secrets must never be hardcoded',
    pattern: /(?:jwt[_-]?secret|secret[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    recommendation: 'Use environment variables for JWT secrets',
    cwe: 'CWE-798',
    owasp: 'A07:2021',
  },
  
  // Cryptography issues
  {
    id: 'WEAK_HASH_MD5',
    category: 'cryptography',
    severity: 'high',
    title: 'Weak Hash Algorithm (MD5)',
    description: 'MD5 is cryptographically broken and should not be used for security',
    pattern: /(?:createHash|hash)\s*\(\s*['"]md5['"]\s*\)/gi,
    recommendation: 'Use SHA-256 or stronger algorithms for hashing',
    cwe: 'CWE-327',
    owasp: 'A02:2021',
  },
  {
    id: 'WEAK_HASH_SHA1',
    category: 'cryptography',
    severity: 'medium',
    title: 'Weak Hash Algorithm (SHA-1)',
    description: 'SHA-1 is considered weak and should not be used for security-critical applications',
    pattern: /(?:createHash|hash)\s*\(\s*['"]sha1['"]\s*\)/gi,
    recommendation: 'Use SHA-256 or stronger algorithms for hashing',
    cwe: 'CWE-327',
    owasp: 'A02:2021',
  },
  {
    id: 'MATH_RANDOM_CRYPTO',
    category: 'cryptography',
    severity: 'high',
    title: 'Insecure Random Number Generation',
    description: 'Math.random() is not cryptographically secure',
    pattern: /Math\.random\s*\(\s*\)/g,
    recommendation: 'Use crypto.getRandomValues() or crypto.randomUUID() for security-sensitive operations',
    cwe: 'CWE-338',
    owasp: 'A02:2021',
  },
  
  // Sensitive data exposure
  {
    id: 'CONSOLE_LOG_SENSITIVE',
    category: 'sensitive-data',
    severity: 'medium',
    title: 'Sensitive Data in Console',
    description: 'Logging sensitive data can expose it in browser developer tools',
    pattern: /console\.(?:log|info|debug|warn)\s*\([^)]*(?:password|secret|token|key|credential)[^)]*\)/gi,
    recommendation: 'Remove sensitive data from console logs in production',
    cwe: 'CWE-532',
    owasp: 'A09:2021',
  },
  {
    id: 'LOCALSTORAGE_SENSITIVE',
    category: 'sensitive-data',
    severity: 'high',
    title: 'Sensitive Data in localStorage',
    description: 'localStorage is accessible via JavaScript and should not store sensitive data',
    pattern: /localStorage\.setItem\s*\(\s*['"][^'"]*(?:password|secret|token|key|credential)[^'"]*['"]/gi,
    recommendation: 'Use secure, httpOnly cookies for sensitive data',
    cwe: 'CWE-922',
    owasp: 'A01:2021',
  },
  
  // Configuration issues
  {
    id: 'CORS_WILDCARD',
    category: 'configuration',
    severity: 'medium',
    title: 'Overly Permissive CORS',
    description: 'Access-Control-Allow-Origin: * allows any origin',
    pattern: /Access-Control-Allow-Origin['":\s]+\*/gi,
    recommendation: 'Restrict CORS to specific trusted origins',
    cwe: 'CWE-942',
    owasp: 'A05:2021',
  },
  {
    id: 'DEBUG_MODE',
    category: 'configuration',
    severity: 'medium',
    title: 'Debug Mode Enabled',
    description: 'Debug mode should be disabled in production',
    pattern: /(?:debug|DEBUG)\s*[:=]\s*true/gi,
    recommendation: 'Disable debug mode before deploying to production',
    cwe: 'CWE-489',
    owasp: 'A05:2021',
  },
  
  // Validation issues
  {
    id: 'UNSAFE_REGEX',
    category: 'validation',
    severity: 'medium',
    title: 'Potentially Unsafe Regular Expression',
    description: 'Complex regex patterns can cause ReDoS (Regular Expression Denial of Service)',
    pattern: /new\s+RegExp\s*\([^)]+\+[^)]+\)/gi,
    recommendation: 'Validate regex patterns for catastrophic backtracking',
    cwe: 'CWE-1333',
    owasp: 'A03:2021',
  },
  {
    id: 'MISSING_INPUT_VALIDATION',
    category: 'validation',
    severity: 'info',
    title: 'Direct User Input Usage',
    description: 'User input should be validated before use',
    pattern: /(?:req|request)\.(?:body|query|params)\.[a-zA-Z]+(?!\s*\?\.|\.validate|\.parse)/gi,
    recommendation: 'Validate and sanitize all user input using Zod or similar',
    cwe: 'CWE-20',
    owasp: 'A03:2021',
  },
];

/**
 * Scan code for security vulnerabilities
 */
export function scanCode(code: string, filename?: string): SASTFinding[] {
  const findings: SASTFinding[] = [];
  const lines = code.split('\n');
  
  for (const rule of SAST_RULES) {
    // Skip positive patterns (they indicate safe code)
    if (rule.isPositive) continue;
    
    // Check each line
    lines.forEach((line, index) => {
      if (rule.pattern.test(line)) {
        findings.push({
          id: rule.id,
          category: rule.category,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          location: filename,
          lineNumber: index + 1,
          codeSnippet: line.trim().substring(0, 100),
          recommendation: rule.recommendation,
          cwe: rule.cwe,
          owasp: rule.owasp,
        });
      }
    });
    
    // Reset regex lastIndex
    rule.pattern.lastIndex = 0;
  }
  
  return findings;
}

/**
 * Get severity weight for scoring
 */
function getSeverityWeight(severity: SASTFinding['severity']): number {
  const weights: Record<SASTFinding['severity'], number> = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
    info: 1,
  };
  return weights[severity];
}

/**
 * Calculate security score from findings
 */
export function calculateSASTScore(findings: SASTFinding[]): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: Record<SASTCategory, number>;
} {
  let totalDeductions = 0;
  const breakdown: Record<SASTCategory, number> = {
    injection: 0,
    xss: 0,
    authentication: 0,
    authorization: 0,
    cryptography: 0,
    'sensitive-data': 0,
    configuration: 0,
    validation: 0,
  };
  
  for (const finding of findings) {
    const weight = getSeverityWeight(finding.severity);
    totalDeductions += weight;
    breakdown[finding.category] += weight;
  }
  
  const score = Math.max(0, 100 - totalDeductions);
  const grade: 'A' | 'B' | 'C' | 'D' | 'F' = 
    score >= 90 ? 'A' :
    score >= 80 ? 'B' :
    score >= 70 ? 'C' :
    score >= 60 ? 'D' : 'F';
  
  return { score, grade, breakdown };
}

/**
 * Get OWASP Top 10 2021 mapping
 */
export const OWASP_TOP_10_2021 = {
  'A01:2021': 'Broken Access Control',
  'A02:2021': 'Cryptographic Failures',
  'A03:2021': 'Injection',
  'A04:2021': 'Insecure Design',
  'A05:2021': 'Security Misconfiguration',
  'A06:2021': 'Vulnerable and Outdated Components',
  'A07:2021': 'Identification and Authentication Failures',
  'A08:2021': 'Software and Data Integrity Failures',
  'A09:2021': 'Security Logging and Monitoring Failures',
  'A10:2021': 'Server-Side Request Forgery',
};

/**
 * Group findings by OWASP category
 */
export function groupByOWASP(findings: SASTFinding[]): Map<string, SASTFinding[]> {
  const grouped = new Map<string, SASTFinding[]>();
  
  for (const finding of findings) {
    const owasp = finding.owasp || 'Uncategorized';
    const existing = grouped.get(owasp) || [];
    existing.push(finding);
    grouped.set(owasp, existing);
  }
  
  return grouped;
}
