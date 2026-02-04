/**
 * useSecretsAudit - Hook for running secrets audits
 * 
 * Provides real-time secrets leak detection and audit capabilities.
 * Runs automatically in development and can be triggered manually.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  runSecretsAudit, 
  validateEnvSecurity,
  type SecretLeak 
} from '@/lib/secrets-audit';
import { secureLog } from '@/lib/secure-logger';

interface SecretsAuditResult {
  leaks: SecretLeak[];
  envWarnings: string[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  lastAuditTime: Date | null;
  isAuditing: boolean;
}

interface UseSecretsAuditOptions {
  autoRun?: boolean;
  intervalMs?: number;
}

export function useSecretsAudit(options: UseSecretsAuditOptions = {}) {
  const { autoRun = import.meta.env.DEV, intervalMs = 60000 } = options;
  
  const [result, setResult] = useState<SecretsAuditResult>({
    leaks: [],
    envWarnings: [],
    summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
    lastAuditTime: null,
    isAuditing: false,
  });

  const runAudit = useCallback(() => {
    setResult(prev => ({ ...prev, isAuditing: true }));
    
    try {
      // Run the audit
      const auditResult = runSecretsAudit();
      const envWarnings = validateEnvSecurity();
      
      // Log critical issues
      if (auditResult.summary.critical > 0) {
        secureLog.error(
          `[SecretsAudit] CRITICAL: ${auditResult.summary.critical} potential secret leaks detected!`
        );
      }
      
      if (envWarnings.length > 0) {
        envWarnings.forEach(warning => {
          secureLog.error(`[SecretsAudit] ${warning}`);
        });
      }
      
      setResult({
        leaks: auditResult.leaks,
        envWarnings,
        summary: auditResult.summary,
        lastAuditTime: new Date(),
        isAuditing: false,
      });
      
      return auditResult;
    } catch (error) {
      secureLog.error('[SecretsAudit] Audit failed:', error);
      setResult(prev => ({ ...prev, isAuditing: false }));
      return null;
    }
  }, []);

  // Auto-run in development
  useEffect(() => {
    if (!autoRun) return;
    
    // Initial audit
    runAudit();
    
    // Periodic audit
    const interval = setInterval(runAudit, intervalMs);
    
    return () => clearInterval(interval);
  }, [autoRun, intervalMs, runAudit]);

  return {
    ...result,
    runAudit,
    hasIssues: result.summary.total > 0 || result.envWarnings.length > 0,
    hasCriticalIssues: result.summary.critical > 0 || result.envWarnings.some(w => w.includes('CRITICAL')),
  };
}
