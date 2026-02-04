/**
 * Security Monitoring & Alerting
 * 
 * Centralized monitoring for security events, authentication,
 * errors, and traffic patterns with configurable alert thresholds.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

// Alert types
export type AlertType = 
  | 'failed_login_threshold'
  | 'permission_denied_spike'
  | 'traffic_spike'
  | 'brute_force_detected'
  | 'suspicious_activity'
  | 'rate_limit_exceeded'
  | 'anomaly_detected'
  | 'error_spike';

// Alert configuration
export interface AlertThreshold {
  type: AlertType;
  threshold: number;
  windowMs: number;
  severity: AlertSeverity;
  cooldownMs: number;
}

// Default alert thresholds
export const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
  {
    type: 'failed_login_threshold',
    threshold: 5,           // 5 failed logins
    windowMs: 5 * 60 * 1000, // in 5 minutes
    severity: 'warning',
    cooldownMs: 15 * 60 * 1000, // 15 min cooldown
  },
  {
    type: 'brute_force_detected',
    threshold: 10,          // 10 failed logins
    windowMs: 5 * 60 * 1000, // in 5 minutes
    severity: 'critical',
    cooldownMs: 30 * 60 * 1000,
  },
  {
    type: 'permission_denied_spike',
    threshold: 10,          // 10 permission errors
    windowMs: 10 * 60 * 1000, // in 10 minutes
    severity: 'error',
    cooldownMs: 30 * 60 * 1000,
  },
  {
    type: 'traffic_spike',
    threshold: 1000,        // 1000 requests
    windowMs: 60 * 1000,    // in 1 minute
    severity: 'warning',
    cooldownMs: 5 * 60 * 1000,
  },
  {
    type: 'rate_limit_exceeded',
    threshold: 50,          // 50 rate limit hits
    windowMs: 5 * 60 * 1000, // in 5 minutes
    severity: 'warning',
    cooldownMs: 15 * 60 * 1000,
  },
  {
    type: 'error_spike',
    threshold: 20,          // 20 errors
    windowMs: 5 * 60 * 1000, // in 5 minutes
    severity: 'error',
    cooldownMs: 15 * 60 * 1000,
  },
];

// Event counters for threshold tracking
interface EventCounter {
  count: number;
  windowStart: number;
  lastAlertTime: number;
}

const eventCounters = new Map<string, EventCounter>();

/**
 * Check if an alert should be triggered based on thresholds
 */
export function checkAlertThreshold(
  eventType: string,
  threshold: AlertThreshold
): { shouldAlert: boolean; count: number } {
  const now = Date.now();
  const key = `${threshold.type}:${eventType}`;
  
  let counter = eventCounters.get(key);
  
  if (!counter || now - counter.windowStart >= threshold.windowMs) {
    // Start new window
    counter = { count: 1, windowStart: now, lastAlertTime: 0 };
    eventCounters.set(key, counter);
    return { shouldAlert: false, count: 1 };
  }
  
  counter.count++;
  
  // Check if threshold exceeded and not in cooldown
  const inCooldown = now - counter.lastAlertTime < threshold.cooldownMs;
  const thresholdExceeded = counter.count >= threshold.threshold;
  
  if (thresholdExceeded && !inCooldown) {
    counter.lastAlertTime = now;
    return { shouldAlert: true, count: counter.count };
  }
  
  return { shouldAlert: false, count: counter.count };
}

/**
 * Get current event counts for monitoring dashboard
 */
export function getEventCounts(): Record<string, { count: number; windowStart: Date }> {
  const counts: Record<string, { count: number; windowStart: Date }> = {};
  
  for (const [key, counter] of eventCounters) {
    counts[key] = {
      count: counter.count,
      windowStart: new Date(counter.windowStart),
    };
  }
  
  return counts;
}

/**
 * Reset event counters (for testing or manual reset)
 */
export function resetEventCounters(): void {
  eventCounters.clear();
}

// Anomaly detection patterns
interface AnomalyPattern {
  type: string;
  description: string;
  detect: (events: SecurityEvent[]) => boolean;
}

interface SecurityEvent {
  event_type: string;
  severity: string;
  created_at: string;
  user_id?: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
}

export const ANOMALY_PATTERNS: AnomalyPattern[] = [
  {
    type: 'geographic_anomaly',
    description: 'Login from unusual location',
    detect: (events) => {
      // Check for logins from multiple countries in short time
      const loginEvents = events.filter(e => e.event_type === 'LOGIN_SUCCESS');
      const uniqueCountries = new Set(
        loginEvents
          .map(e => (e.metadata as Record<string, unknown>)?.country as string)
          .filter(Boolean)
      );
      return uniqueCountries.size > 2;
    },
  },
  {
    type: 'time_anomaly',
    description: 'Activity at unusual hours',
    detect: (events) => {
      // Check for activity between 2-5 AM local time
      const unusualHourEvents = events.filter(e => {
        const hour = new Date(e.created_at).getHours();
        return hour >= 2 && hour <= 5;
      });
      return unusualHourEvents.length > 5;
    },
  },
  {
    type: 'velocity_anomaly',
    description: 'Unusually high activity rate',
    detect: (events) => {
      // Check for more than 100 events in a minute
      if (events.length < 100) return false;
      
      const sortedEvents = [...events].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      for (let i = 0; i < sortedEvents.length - 100; i++) {
        const startTime = new Date(sortedEvents[i].created_at).getTime();
        const endTime = new Date(sortedEvents[i + 99].created_at).getTime();
        if (endTime - startTime < 60000) {
          return true;
        }
      }
      return false;
    },
  },
  {
    type: 'privilege_escalation',
    description: 'Attempted privilege escalation',
    detect: (events) => {
      // Check for multiple permission denied followed by success
      const permissionEvents = events.filter(
        e => e.event_type === 'PERMISSION_DENIED' || e.event_type === 'ADMIN_ACTION'
      );
      
      let deniedCount = 0;
      for (const event of permissionEvents) {
        if (event.event_type === 'PERMISSION_DENIED') {
          deniedCount++;
        } else if (event.event_type === 'ADMIN_ACTION' && deniedCount >= 3) {
          return true;
        }
      }
      return false;
    },
  },
];

/**
 * Run anomaly detection on recent events
 */
export function detectAnomalies(events: SecurityEvent[]): {
  detected: boolean;
  anomalies: { type: string; description: string }[];
} {
  const detectedAnomalies: { type: string; description: string }[] = [];
  
  for (const pattern of ANOMALY_PATTERNS) {
    try {
      if (pattern.detect(events)) {
        detectedAnomalies.push({
          type: pattern.type,
          description: pattern.description,
        });
      }
    } catch {
      // Pattern detection failed, skip
    }
  }
  
  return {
    detected: detectedAnomalies.length > 0,
    anomalies: detectedAnomalies,
  };
}

/**
 * Log an alert to security events
 */
export async function logAlert(
  alertType: AlertType,
  severity: AlertSeverity,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.rpc('log_security_event', {
      _event_type: `ALERT_${alertType.toUpperCase()}`,
      _severity: severity,
      _description: description,
      _user_id: null,
      _ip_address: null,
      _metadata: {
        ...metadata,
        alert_type: alertType,
        triggered_at: new Date().toISOString(),
      } as Json,
    });
  } catch (error) {
    console.error('[SecurityMonitoring] Failed to log alert:', error);
  }
}

/**
 * SIEM-compatible log format (JSON Lines)
 */
export interface SIEMLogEntry {
  timestamp: string;
  event_type: string;
  severity: string;
  source: string;
  user_id?: string;
  ip_address?: string;
  description: string;
  metadata: Record<string, unknown>;
  tags: string[];
}

/**
 * Format security event for SIEM export
 */
export function formatForSIEM(event: {
  created_at: string;
  event_type: string;
  severity: string;
  user_id?: string;
  ip_address?: string;
  description: string;
  metadata?: Record<string, unknown>;
}): SIEMLogEntry {
  const tags: string[] = [];
  
  // Add tags based on event type
  if (event.event_type.includes('LOGIN')) tags.push('authentication');
  if (event.event_type.includes('PERMISSION')) tags.push('authorization');
  if (event.event_type.includes('ALERT')) tags.push('alert');
  if (event.severity === 'critical') tags.push('critical');
  if (event.severity === 'error') tags.push('security-incident');
  
  return {
    timestamp: event.created_at,
    event_type: event.event_type,
    severity: event.severity,
    source: 'lovable-app',
    user_id: event.user_id,
    ip_address: event.ip_address,
    description: event.description,
    metadata: event.metadata || {},
    tags,
  };
}

/**
 * Export events in SIEM-compatible JSON Lines format
 */
export function exportToSIEMFormat(events: Array<{
  created_at: string;
  event_type: string;
  severity: string;
  user_id?: string;
  ip_address?: string;
  description: string;
  metadata?: Record<string, unknown>;
}>): string {
  return events
    .map(event => JSON.stringify(formatForSIEM(event)))
    .join('\n');
}

/**
 * Calculate risk score based on recent events
 */
export function calculateRiskScore(events: SecurityEvent[]): {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];
  
  // Count event types
  const failedLogins = events.filter(e => e.event_type === 'FAILED_LOGIN').length;
  const permissionDenied = events.filter(e => e.event_type === 'PERMISSION_DENIED').length;
  const suspiciousActivity = events.filter(e => e.event_type === 'SUSPICIOUS_ACTIVITY').length;
  const criticalEvents = events.filter(e => e.severity === 'critical').length;
  const errorEvents = events.filter(e => e.severity === 'error').length;
  
  // Calculate score
  if (failedLogins > 5) {
    score += Math.min(failedLogins * 2, 20);
    factors.push(`${failedLogins} failed login attempts`);
  }
  
  if (permissionDenied > 3) {
    score += Math.min(permissionDenied * 3, 25);
    factors.push(`${permissionDenied} permission denied events`);
  }
  
  if (suspiciousActivity > 0) {
    score += suspiciousActivity * 10;
    factors.push(`${suspiciousActivity} suspicious activities detected`);
  }
  
  if (criticalEvents > 0) {
    score += criticalEvents * 15;
    factors.push(`${criticalEvents} critical security events`);
  }
  
  if (errorEvents > 5) {
    score += Math.min(errorEvents * 2, 15);
    factors.push(`${errorEvents} error events`);
  }
  
  // Run anomaly detection
  const anomalyResult = detectAnomalies(events);
  if (anomalyResult.detected) {
    score += anomalyResult.anomalies.length * 10;
    factors.push(...anomalyResult.anomalies.map(a => a.description));
  }
  
  // Normalize score
  score = Math.min(100, score);
  
  // Determine level
  let level: 'low' | 'medium' | 'high' | 'critical';
  if (score >= 75) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';
  else level = 'low';
  
  return { score, level, factors };
}
