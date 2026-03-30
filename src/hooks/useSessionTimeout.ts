/**
 * useSessionTimeout - Session Timeout with Automatic Logout
 * 
 * Monitors user activity and automatically logs out after inactivity.
 * Shows a warning before logout to give users a chance to stay logged in.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { secureLog } from '@/lib/secure-logger';

// Configuration
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity
const WARNING_BEFORE_LOGOUT_MS = 2 * 60 * 1000; // Show warning 2 minutes before logout

// Activity events to track
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'focus',
] as const;

// Storage key for last activity timestamp
const LAST_ACTIVITY_KEY = 'session_last_activity';

interface UseSessionTimeoutOptions {
  /** Timeout in milliseconds (default: 15 minutes) */
  timeout?: number;
  /** Warning time before logout in milliseconds (default: 2 minutes) */
  warningTime?: number;
  /** Callback when warning should be shown */
  onWarning?: (remainingSeconds: number) => void;
  /** Callback when timeout occurs */
  onTimeout?: () => void;
  /** Whether the hook is enabled */
  enabled?: boolean;
}

interface UseSessionTimeoutReturn {
  /** Time remaining before logout (in seconds) */
  remainingTime: number;
  /** Whether the warning is currently active */
  isWarningActive: boolean;
  /** Reset the inactivity timer */
  resetTimer: () => void;
  /** Extend the session */
  extendSession: () => void;
}

export function useSessionTimeout(
  options: UseSessionTimeoutOptions = {}
): UseSessionTimeoutReturn {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    warningTime = WARNING_BEFORE_LOGOUT_MS,
    onWarning,
    onTimeout,
    enabled = true,
  } = options;

  const { isAuthenticated, logout } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [remainingTime, setRemainingTime] = useState<number>(Math.floor(timeout / 1000));
  const [isWarningActive, setIsWarningActive] = useState(false);

  // Get last activity from storage (for cross-tab sync)
  const getLastActivity = useCallback((): number => {
    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
  }, []);

  // Set last activity in storage
  const setLastActivity = useCallback((timestamp: number) => {
    localStorage.setItem(LAST_ACTIVITY_KEY, timestamp.toString());
  }, []);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    secureLog.warn('Session timeout - logging out user due to inactivity');
    clearTimers();
    setIsWarningActive(false);
    
    if (onTimeout) {
      onTimeout();
    }
    
    // Clear session data
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    await logout();
  }, [clearTimers, logout, onTimeout]);

  // Start countdown timer for warning
  const startCountdown = useCallback((endTime: number) => {
    setIsWarningActive(true);
    
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRemainingTime(remaining);
      
      if (onWarning && remaining > 0) {
        onWarning(remaining);
      }
    };
    
    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);
  }, [onWarning]);

  // Reset the inactivity timer
  const resetTimer = useCallback(() => {
    if (!enabled || !isAuthenticated) return;

    clearTimers();
    setIsWarningActive(false);
    setRemainingTime(Math.floor(timeout / 1000));

    const now = Date.now();
    setLastActivity(now);

    // Set warning timer
    const warningDelay = timeout - warningTime;
    warningRef.current = setTimeout(() => {
      const logoutTime = now + timeout;
      startCountdown(logoutTime);
    }, warningDelay);

    // Set logout timer
    timeoutRef.current = setTimeout(handleTimeout, timeout);
  }, [enabled, isAuthenticated, clearTimers, timeout, warningTime, setLastActivity, startCountdown, handleTimeout]);

  // Extend session (user clicked "Stay logged in")
  const extendSession = useCallback(() => {
    secureLog.info('Session extended by user');
    resetTimer();
  }, [resetTimer]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (!isWarningActive) {
      resetTimer();
    }
  }, [isWarningActive, resetTimer]);

  // Check for activity in other tabs
  const checkCrossTabActivity = useCallback(() => {
    const lastActivity = getLastActivity();
    const timeSinceActivity = Date.now() - lastActivity;
    
    if (timeSinceActivity >= timeout) {
      handleTimeout();
    } else if (timeSinceActivity < timeout - warningTime) {
      // Activity in another tab, reset our timer
      if (isWarningActive) {
        resetTimer();
      }
    }
  }, [getLastActivity, timeout, warningTime, isWarningActive, handleTimeout, resetTimer]);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      clearTimers();
      return;
    }

    // Initial timer setup
    resetTimer();

    // Add activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Listen for storage changes (cross-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY) {
        checkCrossTabActivity();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Periodic check for cross-tab activity
    const crossTabInterval = setInterval(checkCrossTabActivity, 10000);

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorage);
      clearInterval(crossTabInterval);
    };
  }, [enabled, isAuthenticated, resetTimer, handleActivity, clearTimers, checkCrossTabActivity]);

  return {
    remainingTime,
    isWarningActive,
    resetTimer,
    extendSession,
  };
}
