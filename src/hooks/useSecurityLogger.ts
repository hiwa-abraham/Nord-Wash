/**
 * useSecurityLogger - Hook for logging security events
 * 
 * Provides functions to log various security events to the database.
 * Integrates with the centralized monitoring system for alert generation.
 * 
 * Security: All logged data is sanitized to prevent PII leakage in logs.
 * Emails are masked, and sensitive data is redacted before storage.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { secureLog, maskEmail } from '@/lib/secure-logger';
import { checkAlertThreshold, logAlert, DEFAULT_ALERT_THRESHOLDS } from '@/lib/security-monitoring';

type SecuritySeverity = 'info' | 'warning' | 'error' | 'critical';

interface LogSecurityEventParams {
  eventType: string;
  severity: SecuritySeverity;
  description: string;
  userId?: string;
  metadata?: Record<string, Json>;
}

/**
 * Sanitize metadata before logging to prevent PII storage
 */
function sanitizeMetadata(metadata: Record<string, Json>): Record<string, Json> {
  const sanitized: Record<string, Json> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    
    // Mask email addresses
    if (lowerKey === 'email' && typeof value === 'string') {
      sanitized[key] = maskEmail(value);
    }
    // Redact sensitive fields completely
    else if (
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('credit_card') ||
      lowerKey.includes('cvv')
    ) {
      sanitized[key] = '[REDACTED]';
    }
    // Mask phone numbers
    else if (lowerKey === 'phone' && typeof value === 'string') {
      const digits = value.replace(/\D/g, '');
      sanitized[key] = digits.length >= 4 ? `***-***-${digits.slice(-4)}` : '***';
    }
    // Keep other fields as-is
    else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize description to mask any embedded emails
 */
function sanitizeDescription(description: string): string {
  // Mask any email addresses in the description
  return description.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    (match) => maskEmail(match)
  );
}

export function useSecurityLogger() {
  const logEvent = useCallback(async ({
    eventType,
    severity,
    description,
    userId,
    metadata = {}
  }: LogSecurityEventParams) => {
    try {
      // Sanitize data before logging
      const sanitizedMetadata = sanitizeMetadata(metadata);
      const sanitizedDescription = sanitizeDescription(description);
      
      const { error } = await supabase.rpc('log_security_event', {
        _event_type: eventType,
        _severity: severity,
        _description: sanitizedDescription,
        _user_id: userId || null,
        _ip_address: null,
        _metadata: sanitizedMetadata as Json
      });

      if (error) {
        // Log error without sensitive data
        secureLog.error('Failed to log security event:', error.message);
      }
    } catch (err) {
      secureLog.error('Security logging error');
    }
  }, []);

  const logFailedLogin = useCallback((email: string, reason: string) => {
    // Check alert thresholds for failed logins
    const failedLoginThreshold = DEFAULT_ALERT_THRESHOLDS.find(t => t.type === 'failed_login_threshold');
    const bruteForceThreshold = DEFAULT_ALERT_THRESHOLDS.find(t => t.type === 'brute_force_detected');
    
    if (failedLoginThreshold) {
      const result = checkAlertThreshold('FAILED_LOGIN', failedLoginThreshold);
      if (result.shouldAlert) {
        logAlert('failed_login_threshold', 'warning', 
          `Multiple failed login attempts detected: ${result.count} in window`);
      }
    }
    
    if (bruteForceThreshold) {
      const result = checkAlertThreshold('FAILED_LOGIN', bruteForceThreshold);
      if (result.shouldAlert) {
        logAlert('brute_force_detected', 'critical', 
          `Potential brute force attack: ${result.count} failed attempts`);
      }
    }
    
    return logEvent({
      eventType: 'FAILED_LOGIN',
      severity: 'warning',
      description: `Failed login attempt: ${reason}`,
      metadata: { 
        email_masked: maskEmail(email), 
        reason 
      }
    });
  }, [logEvent]);

  const logSuspiciousActivity = useCallback((userId: string, activity: string, details: Record<string, Json>) => {
    return logEvent({
      eventType: 'SUSPICIOUS_ACTIVITY',
      severity: 'error',
      description: activity,
      userId,
      metadata: details
    });
  }, [logEvent]);

  const logAuthEvent = useCallback((eventType: string, userId: string, details?: Record<string, Json>) => {
    return logEvent({
      eventType,
      severity: 'info',
      description: `Auth event: ${eventType}`,
      userId,
      metadata: details
    });
  }, [logEvent]);

  const logDataAccess = useCallback((userId: string, resource: string, action: string) => {
    return logEvent({
      eventType: 'DATA_ACCESS',
      severity: 'info',
      description: `User accessed ${resource}: ${action}`,
      userId,
      metadata: { resource, action }
    });
  }, [logEvent]);

  const logAdminAction = useCallback((userId: string, action: string, target: string) => {
    return logEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'info',
      description: `Admin action: ${action} on ${target}`,
      userId,
      metadata: { action, target }
    });
  }, [logEvent]);

  return {
    logEvent,
    logFailedLogin,
    logSuspiciousActivity,
    logAuthEvent,
    logDataAccess,
    logAdminAction
  };
}
