/**
 * useSecurityMonitoring - Real-time security monitoring hook
 * 
 * Provides real-time monitoring of security events with
 * automatic alert generation based on configurable thresholds.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  checkAlertThreshold,
  logAlert,
  calculateRiskScore,
  DEFAULT_ALERT_THRESHOLDS,
  type AlertThreshold,
  type AlertType,
} from '@/lib/security-monitoring';
import { secureLog } from '@/lib/secure-logger';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string;
  user_id?: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface Alert {
  id: string;
  type: AlertType;
  severity: string;
  message: string;
  count: number;
  timestamp: Date;
}

interface MonitoringState {
  events: SecurityEvent[];
  alerts: Alert[];
  riskScore: {
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
  };
  stats: {
    totalEvents: number;
    failedLogins: number;
    permissionDenied: number;
    criticalEvents: number;
  };
  isConnected: boolean;
}

interface UseSecurityMonitoringOptions {
  thresholds?: AlertThreshold[];
  showToasts?: boolean;
  maxEvents?: number;
}

export function useSecurityMonitoring(options: UseSecurityMonitoringOptions = {}) {
  const { 
    thresholds = DEFAULT_ALERT_THRESHOLDS,
    showToasts = true,
    maxEvents = 100,
  } = options;
  
  const { toast } = useToast();
  const alertIdCounter = useRef(0);
  
  const [state, setState] = useState<MonitoringState>({
    events: [],
    alerts: [],
    riskScore: { score: 0, level: 'low', factors: [] },
    stats: {
      totalEvents: 0,
      failedLogins: 0,
      permissionDenied: 0,
      criticalEvents: 0,
    },
    isConnected: false,
  });

  // Process incoming event and check thresholds
  const processEvent = useCallback((event: SecurityEvent) => {
    setState(prev => {
      // Add event to list
      const newEvents = [event, ...prev.events].slice(0, maxEvents);
      
      // Update stats
      const newStats = {
        totalEvents: prev.stats.totalEvents + 1,
        failedLogins: prev.stats.failedLogins + 
          (event.event_type === 'FAILED_LOGIN' ? 1 : 0),
        permissionDenied: prev.stats.permissionDenied + 
          (event.event_type === 'PERMISSION_DENIED' ? 1 : 0),
        criticalEvents: prev.stats.criticalEvents + 
          (event.severity === 'critical' ? 1 : 0),
      };
      
      // Check alert thresholds
      const newAlerts = [...prev.alerts];
      
      for (const threshold of thresholds) {
        // Map event types to alert types
        let shouldCheck = false;
        
        if (threshold.type === 'failed_login_threshold' && event.event_type === 'FAILED_LOGIN') {
          shouldCheck = true;
        } else if (threshold.type === 'brute_force_detected' && event.event_type === 'FAILED_LOGIN') {
          shouldCheck = true;
        } else if (threshold.type === 'permission_denied_spike' && event.event_type === 'PERMISSION_DENIED') {
          shouldCheck = true;
        } else if (threshold.type === 'rate_limit_exceeded' && event.event_type === 'RATE_LIMIT') {
          shouldCheck = true;
        } else if (threshold.type === 'error_spike' && event.severity === 'error') {
          shouldCheck = true;
        }
        
        if (shouldCheck) {
          const result = checkAlertThreshold(event.event_type, threshold);
          
          if (result.shouldAlert) {
            const alert: Alert = {
              id: `alert_${++alertIdCounter.current}`,
              type: threshold.type,
              severity: threshold.severity,
              message: `${threshold.type.replace(/_/g, ' ')}: ${result.count} events in window`,
              count: result.count,
              timestamp: new Date(),
            };
            
            newAlerts.unshift(alert);
            
            // Log alert to backend
            logAlert(threshold.type, threshold.severity, alert.message, {
              event_type: event.event_type,
              count: result.count,
            });
            
            // Show toast notification
            if (showToasts) {
              toast({
                title: `Security Alert: ${threshold.type.replace(/_/g, ' ')}`,
                description: alert.message,
                variant: threshold.severity === 'critical' ? 'destructive' : 'default',
              });
            }
          }
        }
      }
      
      // Calculate new risk score
      const riskScore = calculateRiskScore(newEvents);
      
      return {
        events: newEvents,
        alerts: newAlerts.slice(0, 50), // Keep last 50 alerts
        riskScore,
        stats: newStats,
        isConnected: prev.isConnected,
      };
    });
  }, [thresholds, showToasts, maxEvents, toast]);

  // Fetch initial events
  const fetchInitialEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxEvents);
      
      if (error) throw error;
      
      if (data) {
        const events = data as SecurityEvent[];
        const riskScore = calculateRiskScore(events);
        
        // Calculate initial stats
        const stats = {
          totalEvents: events.length,
          failedLogins: events.filter(e => e.event_type === 'FAILED_LOGIN').length,
          permissionDenied: events.filter(e => e.event_type === 'PERMISSION_DENIED').length,
          criticalEvents: events.filter(e => e.severity === 'critical').length,
        };
        
        setState(prev => ({
          ...prev,
          events,
          riskScore,
          stats,
        }));
      }
    } catch (error) {
      secureLog.error('[SecurityMonitoring] Failed to fetch initial events');
    }
  }, [maxEvents]);

  // Set up real-time subscription
  useEffect(() => {
    fetchInitialEvents();
    
    const channel = supabase
      .channel('security-events-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events',
        },
        (payload) => {
          processEvent(payload.new as SecurityEvent);
        }
      )
      .subscribe((status) => {
        setState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED',
        }));
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialEvents, processEvent]);

  // Dismiss an alert
  const dismissAlert = useCallback((alertId: string) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.filter(a => a.id !== alertId),
    }));
  }, []);

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    setState(prev => ({
      ...prev,
      alerts: [],
    }));
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    fetchInitialEvents();
  }, [fetchInitialEvents]);

  return {
    ...state,
    dismissAlert,
    clearAlerts,
    refresh,
  };
}
