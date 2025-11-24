
'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import type { ReactNode } from 'react';

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Don't show the main header/footer on dashboard routes
  const isDashboardPage = pathname?.startsWith('/dashboard');

  if (isDashboardPage) {
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
