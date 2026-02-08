import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Shirt, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Please enter a valid email address');

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      // Always show success to avoid revealing if email exists
      if (error) {
        console.error('Password reset error:', error.message);
      }
      setIsSent(true);
    } catch {
      setIsSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-16 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary shadow-glow mb-4">
            <Shirt className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-gradient">FreshFold</h1>
        </div>

        <Card className="border-0 shadow-lg">
          {isSent ? (
            <>
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-3">
                  <CheckCircle className="w-12 h-12 text-primary" />
                </div>
                <CardTitle className="text-xl">Check your email</CardTitle>
                <CardDescription className="mt-2">
                  If an account exists with that email, you'll receive a password reset link shortly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/auth">
                  <Button variant="outline" className="w-full h-12">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to login
                  </Button>
                </Link>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">Reset your password</CardTitle>
                <CardDescription>
                  Enter your email and we'll send you a reset link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        className="pl-10"
                        required
                        autoComplete="off"
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    to="/auth"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back to login
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
