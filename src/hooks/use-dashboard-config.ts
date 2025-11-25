
'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export type DashboardNavLink = {
  label: string;
  href: string;
  icon?: string;
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
        description: 'Configure Smokey, Craig, Deebo, and the rest of the crew.',
      },
      {
        label: 'Playbooks',
        href: '/dashboard/playbooks',
        icon: 'Workflow',
        description: 'Automation recipes across email, SMS, menus, and more',
      },
      {
        label: 'Account',
        href: '/account',
        icon: 'Settings',
        description: 'Brand profile, team access, and billing.',
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
    ].map((link) => ({
        ...link,
        active:
          link.href === '/dashboard'
            ? pathname === '/dashboard'
            : !!pathname?.startsWith(link.href),
    })),
    [pathname]
  );

  const currentLink =
    navLinks.find((link) => link.active) ?? navLinks[0];

  return {
    navLinks,
    currentLink,
  };
}
