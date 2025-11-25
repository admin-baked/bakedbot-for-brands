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
        label: 'Playbooks',
        href: '/dashboard/playbooks',
        icon: 'Workflow',
        description: 'Automation recipes across email, SMS, menus, and more',
      },
       {
        label: 'Products',
        href: '/dashboard/products',
        icon: 'Box',
        description: 'Manage your product catalog.',
      },
       {
        label: 'Content AI',
        href: '/dashboard/content',
        icon: 'PenSquare',
        description: 'Generate descriptions, images, and review summaries.',
      },
       {
        label: 'Customer Orders',
        href: '/dashboard/orders',
        icon: 'Package',
        description: 'View and manage incoming online orders.',
      },
       {
        label: 'Analytics',
        href: '/dashboard/analytics',
        icon: 'BarChart3',
        description: 'Explore sales data and product performance.',
      },
       {
        label: 'Account',
        href: '/account',
        icon: 'Settings',
        description: 'Brand profile, team access, and billing.',
      },
       {
        label: 'Admin Console',
        href: '/dashboard/ceo',
        icon: 'Shield',
        description: 'Manage data and AI features.',
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
          link.href === '/dashboard'
            ? pathname === '/dashboard'
            : !!pathname?.startsWith(link.href),
      })),
    [navLinks, pathname]
  );
  
  const currentLink = enhancedLinks.find((link) => link.active) ?? navLinks[0];

  return {
    navLinks: enhancedLinks,
    currentLink,
  };
}
