import { Header } from '@/components/Header';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <Header />
      <main className="pt-14">
        {children}
      </main>
      {/* Global floating language switcher - visible on every route */}
      <div className="fixed bottom-4 right-4 z-[100]">
        <div className="rounded-full bg-background/95 backdrop-blur-md border border-border/60 shadow-lg">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
