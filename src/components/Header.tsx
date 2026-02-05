import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  User, 
  DollarSign, 
  Droplets, 
  History, 
  HelpCircle,
  Menu,
  Home,
  LogOut,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const menuItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Services', href: '/services', icon: DollarSign },
  { label: 'Orders', href: '/orders', icon: History },
  { label: 'Help', href: '/help', icon: HelpCircle },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, logout, user, isAdmin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    navigate(href);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left Section: Logo + Navigation */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-sm">
                <Droplets className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg hidden sm:block">NordWash</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Button
                    key={item.label}
                    variant="ghost"
                    size="sm"
                    className={`text-sm font-medium transition-colors ${
                      isActive 
                        ? 'text-foreground bg-muted' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                    onClick={() => handleNavClick(item.href)}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Right Section: Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* Profile Dropdown or Sign In */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-muted">
                    <Avatar className="h-9 w-9 ring-2 ring-border">
                      <AvatarImage src="" alt="Profile" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-card border border-border shadow-lg" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal px-3 py-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold">{t('common.profile')}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email || 'user@example.com'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/customer')} className="cursor-pointer px-3">
                    <User className="mr-3 h-4 w-4 text-muted-foreground" />
                    <span>{t('common.profile')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/orders')} className="cursor-pointer px-3">
                    <History className="mr-3 h-4 w-4 text-muted-foreground" />
                    <span>{t('nav.orderHistory')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/help')} className="cursor-pointer px-3">
                    <HelpCircle className="mr-3 h-4 w-4 text-muted-foreground" />
                    <span>{t('nav.helpSupport')}</span>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin/security')} className="cursor-pointer px-3">
                        <Shield className="mr-3 h-4 w-4 text-muted-foreground" />
                        <span>Security Dashboard</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer px-3 text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>{t('common.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                size="sm" 
                className="bg-gradient-primary hover:opacity-90 shadow-sm font-medium"
                onClick={() => navigate('/auth')}
              >
                {t('common.login')}
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <div className="flex items-center gap-3 p-4 border-b border-border">
                    <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                      <Droplets className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-display font-bold">NordWash</p>
                      <p className="text-xs text-muted-foreground">Laundry Service</p>
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="flex-1 p-4 space-y-1">
                    {menuItems.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Button
                          key={item.label}
                          variant={isActive ? "secondary" : "ghost"}
                          className={`w-full justify-start h-12 ${
                            isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                          }`}
                          onClick={() => handleNavClick(item.href)}
                        >
                          <item.icon className="w-5 h-5 mr-3" />
                          {item.label}
                        </Button>
                      );
                    })}
                    
                    {isAuthenticated && (
                      <>
                        <div className="pt-4 pb-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3">Account</p>
                        </div>
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12 text-muted-foreground"
                          onClick={() => handleNavClick('/customer')}
                        >
                          <User className="w-5 h-5 mr-3" />
                          Profile
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-12 text-muted-foreground"
                            onClick={() => handleNavClick('/admin/security')}
                          >
                            <Shield className="w-5 h-5 mr-3" />
                            Security
                          </Button>
                        )}
                      </>
                    )}
                  </nav>

                  {/* Mobile Footer */}
                  <div className="p-4 border-t border-border space-y-3">
                    <div className="sm:hidden">
                      <LanguageSwitcher />
                    </div>
                    {isAuthenticated ? (
                      <Button 
                        variant="outline" 
                        className="w-full h-12" 
                        onClick={() => {
                          logout();
                          setIsOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Log out
                      </Button>
                    ) : (
                      <Button 
                        className="w-full h-12 bg-gradient-primary hover:opacity-90"
                        onClick={() => {
                          navigate('/auth');
                          setIsOpen(false);
                        }}
                      >
                        Sign In
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
