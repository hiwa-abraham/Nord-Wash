import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, Ban } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, isOwnerAdmin, logout } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.from('admin_settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
      if (!cancelled) setMaintenance(data?.value === true);

      if (user?.id) {
        const { data: s } = await supabase.from('suspended_users').select('user_id').eq('user_id', user.id).maybeSingle();
        if (!cancelled) setSuspended(!!s);
      } else if (!cancelled) {
        setSuspended(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user?.id]);

  // Suspended users: hard block
  if (suspended && !isOwnerAdmin) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto flex items-center justify-center p-6">
        <Card className="p-6 space-y-4 text-center">
          <Ban className="w-10 h-10 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold">Account suspended</h1>
          <p className="text-sm text-muted-foreground">Your account has been suspended. Contact support for assistance.</p>
          <Button variant="outline" onClick={logout}>Sign out</Button>
        </Card>
      </div>
    );
  }

  // Maintenance mode: only owner can access
  if (maintenance && !isOwnerAdmin) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto flex items-center justify-center p-6">
        <Card className="p-6 space-y-4 text-center">
          <Wrench className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-lg font-semibold">We'll be right back</h1>
          <p className="text-sm text-muted-foreground">NordWash is undergoing scheduled maintenance. Please check back shortly.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <Header />
      <main className="pt-14">
        {children}
      </main>
      <div className="fixed bottom-4 right-4 z-[100]">
        <div className="rounded-full bg-background/95 backdrop-blur-md border border-border/60 shadow-lg">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
