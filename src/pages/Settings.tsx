import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthenticated) {
    navigate('/auth');
    return null;
  }

  const handleDeleteAccount = async () => {
    if (!password) {
      setError(t('settings.enterPassword'));
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(t('settings.sessionExpired'));
        return;
      }

      const response = await supabase.functions.invoke('delete-account', {
        body: { password },
      });

      if (response.error || response.data?.error) {
        setError(response.data?.error || t('settings.deleteFailed'));
        return;
      }

      await logout();
      toast.success(t('settings.accountDeleted'));
      navigate('/');
    } catch {
      setError(t('auth.somethingWrong'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-16 p-4">
      <div className="w-full max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-display font-bold">{t('common.settings')}</h1>

        {/* Account Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('settings.account')}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {t('settings.dangerZone')}
            </CardTitle>
            <CardDescription>
              {t('settings.dangerZoneDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setPassword('');
                setError('');
              }
            }}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('settings.deleteAccount')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    {t('settings.deleteAccountTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block" dangerouslySetInnerHTML={{ __html: t('settings.deleteAccountDesc') }} />
                    <span className="block text-sm">
                      {t('settings.enterPasswordConfirm')}
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-2 py-2">
                  <Label htmlFor="delete-password">{t('common.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="delete-password"
                      type="password"
                      placeholder={t('settings.enterPassword')}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      className="pl-10"
                      autoComplete="current-password"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteAccount();
                    }}
                    disabled={isDeleting || !password}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" />
                    ) : (
                      t('settings.deletePermanently')
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
