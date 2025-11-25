'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';

export type DashboardNavLink = {
  label: string;
  href: string;
  icon?: keyof typeof LucideIcons;
  description?: string;
  hidden?: boolean;
  active?: boolean;
};

export function useDashboardConfig() {
  const pathname = usePathname();

  const navLinks: DashboardNavLink[] = useMemo(
    () => [
      {
        label: 'Overview',
        href: '/dashboard',
        icon: 'LayoutDashboard',
        description: 'At-a-glance view of your agents and brand performance.',
      },
      {
        label: 'Agents',
        href: '/dashboard/agents',
        icon: 'Bot',
        description: 'Orchestrate Smokey, Craig, Pops, Ezal, Money Mike, Mrs. Parker, and Deebo.',
      },
      {
        label: 'Playbooks',
        href: '/dashboard/playbooks',
        icon: 'Sparkles',
        description: 'Reusable growth recipes and campaign templates.',
      },
      {
        label: 'Account',
        href: '/account',
        icon: 'Settings',
        description: 'Brand profile, billing, team, and authentication.',
      },
      {
        label: 'Product Locator',
        href: '/product-locator',
        icon: 'MapPin',
        description: 'Where customers can buy your products.',
        hidden: true,
      },
      {
        label: 'Debug & Deebo',
        href: '/debug/playbooks',
        icon: 'Bug',
        description: 'Internal tools, logs, and compliance debugging.',
        hidden: true,
      },
    ],
    []
  );

  const enhancedLinks = useMemo(
    () =>
      navLinks.map((link) => ({
        ...link,
        active:
          link.href === '/'
            ? pathname === '/'
            : pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(`${link.href}/`)),
      })),
    [navLinks, pathname]
  );
  
  const currentLink = enhancedLinks.find((link) => link.active) ?? navLinks[0];

  return {
    navLinks: enhancedLinks,
    currentLink,
  };
}
