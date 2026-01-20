/**
 * SessionManager - Global session timeout management component
 * 
 * Place this component high in the component tree (e.g., in App.tsx)
 * to enable automatic session timeout and logout.
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useAuth } from '@/contexts/AuthContext';
import { SessionTimeoutWarning } from '@/components/SessionTimeoutWarning';
import { useToast } from '@/hooks/use-toast';

interface SessionManagerProps {
  /** Timeout in minutes (default: 15) */
  timeoutMinutes?: number;
  /** Warning time in minutes before logout (default: 2) */
  warningMinutes?: number;
  /** Whether session timeout is enabled */
  enabled?: boolean;
}

export function SessionManager({
  timeoutMinutes = 15,
  warningMinutes = 2,
  enabled = true,
}: SessionManagerProps) {
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);

  const handleWarning = useCallback(() => {
    setShowWarning(true);
  }, []);

  const handleTimeout = useCallback(() => {
    setShowWarning(false);
    toast({
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity.',
      variant: 'destructive',
    });
    navigate('/auth');
  }, [toast, navigate]);

  const { remainingTime, extendSession, isWarningActive } = useSessionTimeout({
    timeout: timeoutMinutes * 60 * 1000,
    warningTime: warningMinutes * 60 * 1000,
    onWarning: () => handleWarning(),
    onTimeout: handleTimeout,
    enabled: enabled && isAuthenticated,
  });

  const handleExtend = useCallback(() => {
    setShowWarning(false);
    extendSession();
    toast({
      title: 'Session Extended',
      description: 'Your session has been extended.',
    });
  }, [extendSession, toast]);

  const handleLogoutNow = useCallback(async () => {
    setShowWarning(false);
    await logout();
    navigate('/auth');
  }, [logout, navigate]);

  // Only show warning when authenticated and warning is active
  if (!isAuthenticated) {
    return null;
  }

  return (
    <SessionTimeoutWarning
      isOpen={showWarning && isWarningActive}
      remainingSeconds={remainingTime}
      onExtend={handleExtend}
      onLogout={handleLogoutNow}
    />
  );
}
