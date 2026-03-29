import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Shirt, Lock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be less than 72 characters')
  .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
  .regex(/[a-z]/, 'Must contain at least 1 lowercase letter')
  .regex(/[0-9]/, 'Must contain at least 1 number');

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  const rules = [
    { label: t('resetPassword.rules.minLength'), test: (v: string) => v.length >= 8 },
    { label: t('resetPassword.rules.uppercase'), test: (v: string) => /[A-Z]/.test(v) },
    { label: t('resetPassword.rules.lowercase'), test: (v: string) => /[a-z]/.test(v) },
    { label: t('resetPassword.rules.number'), test: (v: string) => /[0-9]/.test(v) },
  ];

  useEffect(() => {
    let settled = false;

    const settle = (valid: boolean) => {
      if (settled) return;
      settled = true;
      setIsValidSession(valid);
      setChecking(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        settle(true);
      } else if (event === 'SIGNED_IN' && session) {
        settle(true);
      }
    });

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (data?.session && !error) {
          settle(true);
        }
      });
    }

    const checkSession = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          settle(true);
        }
      });
    };

    checkSession();
    const t1 = setTimeout(checkSession, 1500);
    const t2 = setTimeout(checkSession, 4000);
    const tFinal = setTimeout(() => settle(false), 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(tFinal);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = passwordSchema.safeParse(password);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordsNoMatch'));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
        return;
      }

      await supabase.auth.signOut();
      toast.success(t('resetPassword.passwordResetSuccess'));
      navigate('/auth');
    } catch {
      setError(t('auth.somethingWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-16 flex items-center justify-center p-4">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-16 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{t('resetPassword.invalidLink')}</CardTitle>
            <CardDescription>
              {t('resetPassword.invalidLinkDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full h-12"
              onClick={() => navigate('/forgot-password')}
            >
              {t('resetPassword.requestNewLink')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-16 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary shadow-glow mb-4">
            <Shirt className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-gradient">FreshFold</h1>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">{t('resetPassword.setNewPassword')}</CardTitle>
            <CardDescription>
              {t('resetPassword.setNewPasswordDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('resetPassword.newPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="pl-10"
                    required
                    autoComplete="new-password"
                  />
                </div>

                {password.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {rules.map((rule) => {
                      const passed = rule.test(password);
                      return (
                        <div key={rule.label} className="flex items-center gap-2 text-xs">
                          {passed ? (
                            <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className={passed ? 'text-primary' : 'text-muted-foreground'}>
                            {rule.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('resetPassword.confirmPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    className="pl-10"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  t('resetPassword.resetPassword')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
