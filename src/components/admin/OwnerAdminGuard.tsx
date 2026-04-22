import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TotpEnrollDialog } from './TotpEnrollDialog';
import { TotpChallengeDialog } from './TotpChallengeDialog';

interface Props { children: ReactNode }

/**
 * Triple-gate guard for owner_admin routes:
 *  1. Authenticated AND role = owner_admin
 *  2. MFA factor enrolled (TOTP)
 *  3. Current session at AAL2 (passed TOTP challenge)
 */
export function OwnerAdminGuard({ children }: Props) {
  const { isAuthenticated, isOwnerAdmin, isLoading, user } = useAuth();
  const [aalLoading, setAalLoading] = useState(true);
  const [needsEnroll, setNeedsEnroll] = useState(false);
  const [needsChallenge, setNeedsChallenge] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const checkMfa = async () => {
    setAalLoading(true);
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const { data: factorData } = await supabase.auth.mfa.listFactors();
    const verifiedTotp = factorData?.totp?.find((f) => f.status === 'verified');

    if (!verifiedTotp) {
      setNeedsEnroll(true);
      setNeedsChallenge(false);
      setAuthorized(false);
    } else if (aalData?.currentLevel !== 'aal2') {
      setNeedsEnroll(false);
      setNeedsChallenge(true);
      setAuthorized(false);
    } else {
      setNeedsEnroll(false);
      setNeedsChallenge(false);
      setAuthorized(true);
    }
    setAalLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated && isOwnerAdmin) checkMfa();
    else setAalLoading(false);
  }, [isAuthenticated, isOwnerAdmin, user?.id]);

  if (isLoading || aalLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated → /auth
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  // Authenticated but not owner → 404 (hide existence)
  if (!isOwnerAdmin) return <Navigate to="/" replace />;

  if (needsEnroll) {
    return (
      <div className="px-4 py-8">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Two-factor authentication required</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            As the owner, you must enroll an authenticator app before accessing the admin dashboard.
          </p>
          <TotpEnrollDialog onComplete={checkMfa} />
        </Card>
      </div>
    );
  }

  if (needsChallenge) {
    return (
      <div className="px-4 py-8">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Verify your identity</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app to continue.
          </p>
          <TotpChallengeDialog onComplete={checkMfa} />
        </Card>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="px-4 py-8">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-3">Access denied.</p>
          <Button onClick={checkMfa}>Retry</Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
