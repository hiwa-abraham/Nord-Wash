/**
 * useReauthentication - Re-authentication for Sensitive Operations
 * 
 * Provides a mechanism to require password re-entry before performing
 * sensitive operations like payments, profile changes, or admin actions.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { secureLog } from '@/lib/secure-logger';

// How long re-authentication is valid (5 minutes)
const REAUTH_VALIDITY_MS = 5 * 60 * 1000;

// Storage key for last re-authentication time
const LAST_REAUTH_KEY = 'session_last_reauth';

// Types of sensitive operations that require re-authentication
export type SensitiveOperation = 
  | 'payment'
  | 'profile_update'
  | 'password_change'
  | 'email_change'
  | 'account_delete'
  | 'admin_action'
  | 'order_cancel'
  | 'withdrawal';

// Configuration for how strict re-auth should be per operation
const OPERATION_CONFIG: Record<SensitiveOperation, { 
  alwaysRequire: boolean; 
  maxAgeMs: number;
}> = {
  payment: { alwaysRequire: false, maxAgeMs: REAUTH_VALIDITY_MS },
  profile_update: { alwaysRequire: false, maxAgeMs: REAUTH_VALIDITY_MS * 2 },
  password_change: { alwaysRequire: true, maxAgeMs: 0 },
  email_change: { alwaysRequire: true, maxAgeMs: 0 },
  account_delete: { alwaysRequire: true, maxAgeMs: 0 },
  admin_action: { alwaysRequire: false, maxAgeMs: REAUTH_VALIDITY_MS / 2 },
  order_cancel: { alwaysRequire: false, maxAgeMs: REAUTH_VALIDITY_MS },
  withdrawal: { alwaysRequire: true, maxAgeMs: 0 },
};

interface UseReauthenticationReturn {
  /** Whether re-authentication is currently in progress */
  isReauthenticating: boolean;
  /** Error message if re-authentication failed */
  error: string | null;
  /** Check if re-authentication is needed for an operation */
  needsReauth: (operation: SensitiveOperation) => boolean;
  /** Perform re-authentication with password */
  reauthenticate: (password: string) => Promise<boolean>;
  /** Execute a sensitive operation with optional re-auth */
  withReauth: <T>(
    operation: SensitiveOperation,
    action: () => Promise<T>,
    onNeedReauth: () => void
  ) => Promise<T | null>;
  /** Clear the last re-authentication (force re-auth on next sensitive op) */
  clearReauth: () => void;
  /** Mark that re-auth was just completed (for external auth flows) */
  markReauthComplete: () => void;
}

export function useReauthentication(): UseReauthenticationReturn {
  const { user } = useAuth();
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingActionRef = useRef<(() => Promise<unknown>) | null>(null);

  // Get last re-authentication timestamp
  const getLastReauth = useCallback((): number | null => {
    const stored = localStorage.getItem(LAST_REAUTH_KEY);
    return stored ? parseInt(stored, 10) : null;
  }, []);

  // Set last re-authentication timestamp
  const setLastReauth = useCallback((timestamp: number) => {
    localStorage.setItem(LAST_REAUTH_KEY, timestamp.toString());
  }, []);

  // Clear re-authentication
  const clearReauth = useCallback(() => {
    localStorage.removeItem(LAST_REAUTH_KEY);
  }, []);

  // Mark re-auth as complete
  const markReauthComplete = useCallback(() => {
    setLastReauth(Date.now());
    setError(null);
  }, [setLastReauth]);

  // Check if re-authentication is needed
  const needsReauth = useCallback((operation: SensitiveOperation): boolean => {
    const config = OPERATION_CONFIG[operation];
    
    // Always require re-auth for certain operations
    if (config.alwaysRequire) {
      return true;
    }

    const lastReauth = getLastReauth();
    
    // No previous re-auth, require it
    if (!lastReauth) {
      return true;
    }

    // Check if re-auth has expired
    const timeSinceReauth = Date.now() - lastReauth;
    return timeSinceReauth > config.maxAgeMs;
  }, [getLastReauth]);

  // Perform re-authentication
  const reauthenticate = useCallback(async (password: string): Promise<boolean> => {
    if (!user?.email) {
      setError('No user email found');
      return false;
    }

    setIsReauthenticating(true);
    setError(null);

    try {
      // Re-authenticate by signing in again
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (authError) {
        secureLog.warn('Re-authentication failed');
        setError('Invalid password. Please try again.');
        return false;
      }

      // Mark successful re-auth
      setLastReauth(Date.now());
      secureLog.info('Re-authentication successful');
      return true;
    } catch (err) {
      secureLog.error('Re-authentication error');
      setError('An error occurred. Please try again.');
      return false;
    } finally {
      setIsReauthenticating(false);
    }
  }, [user?.email, setLastReauth]);

  // Execute sensitive operation with re-auth check
  const withReauth = useCallback(async <T>(
    operation: SensitiveOperation,
    action: () => Promise<T>,
    onNeedReauth: () => void
  ): Promise<T | null> => {
    if (needsReauth(operation)) {
      // Store the action for later execution
      pendingActionRef.current = action as () => Promise<unknown>;
      onNeedReauth();
      return null;
    }

    // Re-auth not needed, execute action directly
    try {
      return await action();
    } catch (err) {
      secureLog.error('Sensitive operation failed');
      throw err;
    }
  }, [needsReauth]);

  return {
    isReauthenticating,
    error,
    needsReauth,
    reauthenticate,
    withReauth,
    clearReauth,
    markReauthComplete,
  };
}
