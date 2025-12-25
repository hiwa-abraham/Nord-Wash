import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  User, 
  DollarSign, 
  Droplets, 
  CreditCard, 
  History, 
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { label: 'NordWash', href: '/', icon: Droplets },
  { label: 'Service & Pricing', href: '/services', icon: DollarSign },
  { label: 'Profile', href: '/customer', icon: User },
  { label: 'Billing', href: '/customer', icon: CreditCard },
  { label: 'Order History', href: '/customer', icon: History },
  { label: 'Help', href: '/help', icon: HelpCircle },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    if (href.includes('#')) {
      const [path, hash] = href.split('#');
      if (window.location.pathname === path || path === '/') {
        const element = document.getElementById(hash);
        element?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate(path);
        setTimeout(() => {
          const element = document.getElementById(hash);
          element?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else {
      navigate(href);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Droplets className="w-8 h-8 text-primary" />
            <span className="font-display font-bold text-xl">NordWash</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {menuItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => handleNavClick(item.href)}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={logout}>
                Log out
              </Button>
            ) : (
              <Button 
                size="sm" 
                className="bg-gradient-primary hover:opacity-90"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-6 h-6 text-primary" />
                    <span className="font-display font-bold">NordWash</span>
                  </div>
                </div>

                <nav className="flex flex-col gap-1">
                  {menuItems.map((item) => (
                    <Button
                      key={item.label}
                      variant="ghost"
                      className="justify-start text-muted-foreground hover:text-foreground"
                      onClick={() => handleNavClick(item.href)}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </Button>
                  ))}
                </nav>

                <div className="mt-auto pt-4 border-t border-border">
                  {isAuthenticated ? (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                    >
                      Log out
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-gradient-primary hover:opacity-90"
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
    </header>
  );
}
