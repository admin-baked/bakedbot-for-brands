'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';

export type DashboardNavLink = {
  label: string;
  href: string;
  icon: keyof typeof LucideIcons;
  description: string;
  hidden?: boolean;
  active?: boolean;
};

export function useDashboardConfig() {
  const pathname = usePathname();

  const navLinks: DashboardNavLink[] = useMemo(() => {
    const links: DashboardNavLink[] = [
      {
        label: 'Overview',
        href: '/dashboard',
        icon: 'LayoutDashboard',
        description: 'High-level summary of agents, campaigns, and revenue.',
      },
      {
        label: 'Agents',
        href: '/dashboard/agents',
        icon: 'Bot',
        description: 'Configure and monitor your AI agents.',
      },
      {
        label: 'Account',
        href: '/account',
        icon: 'Settings',
        description: 'Brand profile, billing, and configuration.',
      },
      // You can add more links here as needed
    ];

    return links.map((link) => ({
      ...link,
      active:
        pathname === link.href ||
        (link.href !== '/' && pathname.startsWith(link.href)),
    }));
  }, [pathname]);

  const current = navLinks.find((link) => link.active) ?? navLinks[0];

  return { navLinks, current };
}
