import { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning={true}>
      <Header />
      <main className="pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
