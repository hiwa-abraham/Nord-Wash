import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const menuItems = [
  { label: 'NordWash', href: '/', icon: Droplets },
  { label: 'Service & Pricing', href: '/services', icon: DollarSign },
  { label: 'Profile', href: '/customer', icon: User },
  { label: 'Billing', href: '/customer', icon: CreditCard },
  { label: 'Order History', href: '/orders', icon: History },
  { label: 'Help', href: '/help', icon: HelpCircle },
];

// Route to readable name mapping
const routeNames: Record<string, string> = {
  '': 'Home',
  'services': 'Services & Pricing',
  'customer': 'Customer Dashboard',
  'washer': 'Washer Dashboard',
  'washer-earnings': 'Washer Earnings',
  'orders': 'Order History',
  'schedule': 'Schedule Pickup',
  'help': 'Help & Support',
  'auth': 'Sign In',
  'privacy': 'Privacy Policy',
  'terms': 'Terms of Service',
};

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on the home page - don't show back button there
  const isHomePage = location.pathname === '/';
  
  // Generate breadcrumbs from current path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const name = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    return { path, name };
  });
  
  const handleBack = () => {
    navigate(-1);
  };

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
        <div className="flex items-center h-16 gap-4">
          {/* Mobile Menu - Now on LEFT */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
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

          {/* Back Button */}
          {!isHomePage && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}

          {/* Breadcrumb Navigation */}
          <div className="flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  {isHomePage ? (
                    <BreadcrumbPage className="flex items-center gap-1">
                      <Home className="w-4 h-4" />
                      <span className="hidden sm:inline">Home</span>
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to="/" className="flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        <span className="hidden sm:inline">Home</span>
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {breadcrumbs.map((crumb, index) => (
                  <BreadcrumbItem key={crumb.path}>
                    <BreadcrumbSeparator>
                      <ChevronRight className="w-4 h-4" />
                    </BreadcrumbSeparator>
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage className="truncate max-w-[150px] sm:max-w-none">
                        {crumb.name}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.path} className="truncate max-w-[100px] sm:max-w-none">
                          {crumb.name}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Logo - Desktop only, right side */}
          <Link to="/" className="hidden md:flex items-center gap-2 shrink-0">
            <Droplets className="w-8 h-8 text-primary" />
            <span className="font-display font-bold text-xl">NordWash</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {menuItems.slice(1).map((item) => (
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
          <div className="hidden md:flex items-center gap-2 shrink-0">
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
        </div>
      </div>
    </header>
  );
}
