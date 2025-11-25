'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

export type DashboardNavLink = {
  href: string;
  label: string;
  active?: boolean;
};

export function useDashboardConfig() {
  const pathname = usePathname();

  const navLinks = useMemo<DashboardNavLink[]>(
    () =>
      [
        { href: '/dashboard', label: 'Overview' },
        { href: '/agents', label: 'Agents' },
        { href: '/playbooks', label: 'Playbooks' },
        { href: '/account', label: 'Account' },
      ].map((link) => ({
        ...link,
        active:
          link.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname?.startsWith(link.href),
      })),
    [pathname],
  );

  return { navLinks };
}
