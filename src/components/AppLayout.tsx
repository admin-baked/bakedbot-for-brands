
'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import type { ReactNode } from 'react';

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Don't show the main header/footer on dashboard routes, the new homepage, or the pricing page
  const isDashboardPage = pathname?.startsWith('/dashboard');
  const isHomePage = pathname === '/';
  const isPricingPage = pathname === '/pricing';

  if (isDashboardPage || isHomePage || isPricingPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
