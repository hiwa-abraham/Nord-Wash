/**
 * ReauthenticationDialog - Password confirmation for sensitive operations
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { useReauthentication, SensitiveOperation } from '@/hooks/useReauthentication';

interface ReauthenticationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  operation: SensitiveOperation;
  title?: string;
  description?: string;
}

const OPERATION_DESCRIPTIONS: Record<SensitiveOperation, string> = {
  payment: 'confirm this payment',
  profile_update: 'update your profile',
  password_change: 'change your password',
  email_change: 'change your email address',
  account_delete: 'delete your account',
  admin_action: 'perform this admin action',
  order_cancel: 'cancel this order',
  withdrawal: 'process this withdrawal',
};

export function ReauthenticationDialog({
  isOpen,
  onClose,
  onSuccess,
  operation,
  title,
  description,
}: ReauthenticationDialogProps) {
  const [password, setPassword] = useState('');
  const { reauthenticate, isReauthenticating, error } = useReauthentication();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await reauthenticate(password);
    
    if (success) {
      setPassword('');
      onSuccess();
    }
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {title || 'Confirm Your Identity'}
          </DialogTitle>
          <DialogDescription>
            {description || `Please enter your password to ${OPERATION_DESCRIPTIONS[operation]}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reauth-password">Password</Label>
            <Input
              id="reauth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isReauthenticating}
              required
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isReauthenticating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isReauthenticating || !password}
              className="gap-2"
            >
              {isReauthenticating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
