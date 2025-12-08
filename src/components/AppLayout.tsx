
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
  // Also hide main header for dynamic brand routes as they will use DispensaryHeader
  // Check if pathname starts with a highly likely brand route pattern (first segment is dynamic brand)
  // Simple heuristic: if it's not one of the above reserved routes, and has at least one segment, check if we are in the [brand] route territory.
  // Actually, simpler logic: The [brand] layout will wrap these pages. 
  // But AppLayout wraps everything. We need to identify if we are on a brand page.
  // Since we don't have access to route params here easily without context, we'll rely on regex or exclusion.
  // Current app structure: /dashboard, /, /pricing, /onboarding, /menu (deprecated?), /[brand]

  // Let's hide it for paths that don't match our "platform" pages if we want a custom header for brands.
  // Alternatively, checking if it is NOT one of the known platform routes.
  const isPlatformPage = isDashboardPage || isHomePage || isPricingPage || isOnboardingPage || pathname?.startsWith('/customer-login') || pathname?.startsWith('/brand-login');

  // However, we have many other potential routes (account, checkout). 
  // Let's specifically target the brand pages if possible. 
  // Brand pages usually look like /some-brand ...

  // Best approach for now: if we are in a route that SHOULD have the dispensary header, we hide this one.
  // Actually, the request implies updating the menu for dispensaries. 
  // Let's assume all pages under /[brand] should use the new header.
  // We can try to detect if the first segment is not a known system route.

  const systemRoutes = ['dashboard', 'pricing', 'onboarding', 'customer-login', 'brand-login', 'account', 'checkout', 'api', 'admin', '_next', 'favicon.ico'];
  const firstSegment = pathname?.split('/')[1];
  const isBrandPage = firstSegment && !systemRoutes.includes(firstSegment) && firstSegment !== '';

  if (isDashboardPage || isHomePage || isPricingPage || isOnboardingPage || isBrandPage) {
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
