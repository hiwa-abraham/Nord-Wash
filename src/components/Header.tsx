import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  User, 
  Droplets, 
  History, 
  HelpCircle,
  Menu,
  Home,
  LogOut,
  Shield,
  Sparkles,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { BackButton } from '@/components/BackButton';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, logout, user, isAdmin, isOwnerAdmin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: t('common.home'), href: '/', icon: Home },
    { label: t('common.services'), href: '/services', icon: Sparkles },
    { label: t('common.orders'), href: '/orders', icon: History },
    { label: t('common.help'), href: '/help', icon: HelpCircle },
    { label: t('common.settings'), href: '/settings', icon: Settings, requiresAuth: true },
  ];

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    navigate(href);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-0.5 shrink-0">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 gap-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
                <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-lg">NordWash</span>
              </div>

              {isAuthenticated && (
                <div className="px-4 py-3 border-b border-border/30">
                  <button 
                    onClick={() => handleNavClick('/customer')}
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/60 transition-colors"
                  >
                    <Avatar className="h-9 w-9 ring-1 ring-border/50">
                      <AvatarImage src="" alt="Profile" />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                </div>
              )}

              <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                {menuItems
                  .filter((item) => !item.requiresAuth || isAuthenticated)
                  .map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <button
                      key={item.href}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`}
                      onClick={() => handleNavClick(item.href)}
                    >
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                {(isAdmin || isOwnerAdmin) && (
                  <>
                    <Separator className="my-2" />
                    <p className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('common.admin')}
                    </p>
                    {isOwnerAdmin && (
                      <button
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          location.pathname === '/admin'
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        }`}
                        onClick={() => handleNavClick('/admin')}
                      >
                        <Shield className="w-[18px] h-[18px] shrink-0" />
                        <span>Owner Dashboard</span>
                      </button>
                    )}
                    <button
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        location.pathname === '/admin/security'
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`}
                      onClick={() => handleNavClick('/admin/security')}
                    >
                      <Shield className="w-[18px] h-[18px] shrink-0" />
                      <span>{t('common.security')}</span>
                    </button>
                  </>
                )}
              </nav>

              <div className="px-3 pb-4 pt-2 border-t border-border/40 space-y-2">
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-[18px] h-[18px] shrink-0" />
                    <span>{t('common.logout')}</span>
                  </button>
                ) : (
                  <Button
                    className="w-full bg-gradient-primary hover:opacity-90"
                    onClick={() => handleNavClick('/auth')}
                  >
                    {t('common.login')}
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
          </Sheet>
          <BackButton />
        </div>

        <Link to="/" className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Droplets className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-base">NordWash</span>
        </Link>

        {isAuthenticated ? (
          <button onClick={() => navigate('/customer')} className="h-9 w-9 shrink-0">
            <Avatar className="h-8 w-8 ring-1 ring-border/50">
              <AvatarImage src="" alt="Profile" />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-sm font-medium"
            onClick={() => navigate('/auth')}
          >
            {t('common.login')}
          </Button>
        )}
      </div>
    </header>
  );
}
