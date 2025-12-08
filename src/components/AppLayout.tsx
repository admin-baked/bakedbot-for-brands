
'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import type { ReactNode } from 'react';

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Don't show the main header/footer on dashboard routes, the new homepage, pricing page, or onboarding
  const isDashboardPage = pathname?.startsWith('/dashboard');
  const isHomePage = pathname === '/';
  const isPricingPage = pathname === '/pricing';
  const isOnboardingPage = pathname?.startsWith('/onboarding');

  if (isDashboardPage || isHomePage || isPricingPage || isOnboardingPage) {
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
