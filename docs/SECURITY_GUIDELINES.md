# Security Development Guidelines

This document outlines the security practices and guidelines that must be followed when developing this application.

## Table of Contents

1. [Code Review Requirements](#code-review-requirements)
2. [Dependency Management](#dependency-management)
3. [Static Analysis (SAST)](#static-analysis-sast)
4. [Database Access Controls](#database-access-controls)
5. [Security Testing](#security-testing)
6. [Security Training](#security-training)

---

## Code Review Requirements

### MUST - All Code Reviews Must Include

1. **Security Checklist Review**
   - [ ] No hardcoded credentials or API keys
   - [ ] Input validation on all user inputs
   - [ ] Output encoding to prevent XSS
   - [ ] Proper error handling (no stack traces exposed)
   - [ ] Authentication/authorization checks in place
   - [ ] SQL injection prevention (parameterized queries)
   - [ ] CSRF protection on state-changing operations

2. **Two-Person Rule**
   - All changes to authentication, authorization, or payment code require review by at least two developers
   - Security-sensitive changes must be reviewed by a security-focused team member

3. **Automated Checks**
   - All PRs must pass SAST scanning
   - All PRs must pass dependency vulnerability checks
   - All PRs must pass linting with security rules

### Code Review Questions to Ask

- Does this code handle user input safely?
- Are there any new attack surfaces?
- Could this code leak sensitive information?
- Does this follow the principle of least privilege?

---

## Dependency Management

### MUST - Dependency Security

1. **Before Adding Dependencies**
   ```typescript
   import { checkDependency, checkForbiddenPackage } from '@/lib/dependency-scanner';
   
   // Check if package is forbidden in frontend
   const check = checkForbiddenPackage('some-package');
   if (check.forbidden) {
     console.error(check.reason);
   }
   
   // Check for known vulnerabilities
   const vuln = checkDependency('lodash', '4.17.21');
   if (vuln) {
     console.error(vuln.recommendation);
   }
   ```

2. **Dependency Rules**
   - Pin exact versions in package.json
   - Run `npm audit` before every deployment
   - Update dependencies with security patches within 48 hours
   - Never use deprecated packages

3. **Forbidden Frontend Packages**
   - `dotenv` - Use Vite env variables
   - `bcrypt` - Hash server-side only
   - `pg`, `mysql`, `mongodb` - No direct DB access
   - `fs`, `child_process` - Node.js only

### SHOULD - Dependency Best Practices

- Review new dependencies for maintenance status
- Prefer packages with TypeScript support
- Minimize total dependency count
- Use tree-shaking friendly packages

---

## Static Analysis (SAST)

### MUST - SAST Rules

All code must pass static analysis checks. Use the built-in scanner:

```typescript
import { scanCode, calculateSASTScore } from '@/lib/sast-scanner';

const findings = scanCode(sourceCode, 'MyComponent.tsx');
const { score, grade } = calculateSASTScore(findings);

if (grade === 'F') {
  // Block deployment
  throw new Error('Security score too low');
}
```

### Critical Rules (Block Deployment)

| Rule ID | Description |
|---------|-------------|
| SQL_INJECTION | No string concatenation in queries |
| COMMAND_INJECTION | No shell execution with user input |
| EVAL_USAGE | Never use eval() |
| HARDCODED_PASSWORD | No passwords in code |
| JWT_SECRET_HARDCODED | JWT secrets in env only |

### High Severity Rules

| Rule ID | Description |
|---------|-------------|
| DANGEROUS_HTML | Sanitize dangerouslySetInnerHTML |
| MATH_RANDOM_CRYPTO | Use crypto.getRandomValues() |
| LOCALSTORAGE_SENSITIVE | No secrets in localStorage |
| WEAK_HASH_MD5 | Use SHA-256 or stronger |

### OWASP Top 10 Mapping

Our SAST rules map to OWASP Top 10 2021:

- A01:2021 - Broken Access Control
- A02:2021 - Cryptographic Failures
- A03:2021 - Injection
- A05:2021 - Security Misconfiguration
- A07:2021 - Identification and Authentication Failures
- A09:2021 - Security Logging and Monitoring Failures

---

## Database Access Controls

### MUST - No Direct Production Access

1. **Use Secure Database Layer**
   ```typescript
   import { safeQuery, maskSensitiveData } from '@/lib/secure-db-access';
   
   // Wrapped queries with logging
   const { data, error } = await safeQuery('select', 'orders', () =>
     supabase.from('orders').select('*')
   );
   
   // Mask sensitive data before logging
   const safeData = maskSensitiveData(userData);
   console.log(safeData);
   ```

2. **Access Control Rules**
   - All database access through RLS policies
   - Users can only access their own data
   - Admin access requires explicit role check
   - No direct Supabase service role usage in frontend

3. **Query Safety**
   - Always use parameterized queries
   - Validate table/column names
   - Implement pagination for large datasets
   - Never expose raw database errors to users

### Column Allowlists

Define which columns can be accessed per table:

```typescript
const COLUMN_ALLOWLIST: Record<string, string[]> = {
  profiles: ['id', 'full_name', 'avatar_url'],
  orders: ['id', 'status', 'created_at'],
};
```

### Sensitive Data Masking

These columns are automatically masked in logs:

- password, password_hash
- token, api_key, secret
- email, phone, address
- credit_card, ssn

---

## Security Testing

### MUST - Automated Testing

1. **Unit Tests for Security Functions**
   - Input validation functions
   - Sanitization functions
   - Authentication checks
   - Authorization checks

2. **Integration Tests**
   - RLS policy verification
   - API endpoint authorization
   - Rate limiting verification

### SHOULD - Manual Testing

1. **Dynamic Application Security Testing (DAST)**
   - Run OWASP ZAP or similar tools monthly
   - Test for XSS, CSRF, injection vulnerabilities
   - Verify security headers

2. **Penetration Testing**
   - Annual third-party penetration test
   - Test after major security changes
   - Document and remediate all findings

### Security Test Checklist

```markdown
- [ ] Authentication bypass attempts
- [ ] Authorization boundary testing
- [ ] Input fuzzing
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] CSRF testing
- [ ] Rate limit testing
- [ ] Session management testing
```

---

## Security Training

### SHOULD - Developer Security Training

1. **Required Training Topics**
   - OWASP Top 10 vulnerabilities
   - Secure coding practices
   - Incident response procedures
   - Data handling and privacy

2. **Ongoing Education**
   - Monthly security newsletter
   - Quarterly security workshops
   - Annual refresher training

3. **Resources**
   - [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
   - [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
   - Internal security documentation

---

## Quick Reference

### Before Every Commit

```bash
# Run SAST scan
npm run security:scan

# Check dependencies
npm audit

# Run tests
npm test
```

### Security Contacts

- Security Issues: Report via internal security channel
- Incident Response: Follow incident response playbook
- Questions: Consult with security team lead

---

## Appendix: Security Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| dependency-scanner.ts | Dependency vulnerabilities | Build pipeline |
| sast-scanner.ts | Static code analysis | Pre-commit, CI |
| secure-db-access.ts | Database access control | Runtime |
| secrets-audit.ts | Secret leak detection | Development |
| security-monitoring.ts | Runtime threat detection | Production |
