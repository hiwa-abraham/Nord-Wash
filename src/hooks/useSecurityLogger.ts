/**
 * useSecurityLogger - Hook for logging security events
 * 
 * Provides functions to log various security events to the database.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

type SecuritySeverity = 'info' | 'warning' | 'error' | 'critical';

interface LogSecurityEventParams {
  eventType: string;
  severity: SecuritySeverity;
  description: string;
  userId?: string;
  metadata?: Record<string, Json>;
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
      const { error } = await supabase.rpc('log_security_event', {
        _event_type: eventType,
        _severity: severity,
        _description: description,
        _user_id: userId || null,
        _ip_address: null,
        _metadata: metadata as Json
      });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (err) {
      console.error('Security logging error:', err);
    }
  }, []);

  const logFailedLogin = useCallback((email: string, reason: string) => {
    return logEvent({
      eventType: 'FAILED_LOGIN',
      severity: 'warning',
      description: `Failed login attempt for ${email}: ${reason}`,
      metadata: { email, reason }
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
