import { Header } from '@/components/Header';

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
    </div>
  );
}
