import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Shirt, Sparkles, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

type AppRole = 'customer' | 'washer';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export default function Auth() {
  const { t } = useTranslation();
  const [role, setRole] = useState<AppRole>('customer');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { login, signup, isLoading, isAuthenticated, role: userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && userRole) {
      navigate(userRole === 'customer' ? '/customer' : '/washer');
    }
  }, [isAuthenticated, userRole, navigate]);

  const getRoleLabel = () => {
    return role === 'customer' ? t('auth.clothesOwner') : t('auth.laundryProvider');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate input
      const validation = authSchema.safeParse({
        email,
        password,
        name: isLogin ? undefined : name,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      if (isLogin) {
        const { error } = await login(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error(t('auth.invalidCredentials'));
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success(t('auth.welcomeBack'));
      } else {
        const { error } = await signup(name, email, password, role);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error(t('auth.emailRegistered'));
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success(t('auth.accountCreated'));
      }
    } catch (error) {
      toast.error(t('auth.somethingWrong'));
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
          <p className="text-muted-foreground mt-2">{t('auth.tagline')}</p>
        </div>

        {/* Role Selection */}
        <div className="mb-6">
          <Tabs value={role} onValueChange={(v) => setRole(v as AppRole)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-14 bg-card">
              <TabsTrigger 
                value="customer" 
                className="h-12 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground font-medium"
              >
                <User className="w-4 h-4 mr-2" />
                {t('auth.customerRole')}
              </TabsTrigger>
              <TabsTrigger 
                value="washer"
                className="h-12 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground font-medium"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t('auth.washerRole')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Auth Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {isLogin ? t('auth.loginTitle') : t('auth.signupTitle')}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? t('auth.loginSubtitle', { role: getRoleLabel() })
                : t('auth.signupSubtitle', { role: getRoleLabel() })
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">{t('auth.fullName')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? t('auth.signIn') : t('auth.createAccount')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {isLogin && (
              <div className="mt-4 text-center">
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? t('auth.noAccount') + ' ' : t('auth.hasAccount') + ' '}
                <span className="font-medium text-primary">
                  {isLogin ? t('common.signUp') : t('common.login')}
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
