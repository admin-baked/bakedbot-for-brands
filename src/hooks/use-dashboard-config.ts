
'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import * as LucideIcons from 'lucide-react';

export type DashboardNavLink = {
  href: string;
  label: string;
  description?: string;
  icon: keyof typeof LucideIcons;
  hidden?: boolean;
  active?: boolean;
};

export function useDashboardConfig() {
  const pathname = usePathname();

  const navLinks = useMemo<DashboardNavLink[]>(() => {
    const base: DashboardNavLink[] = [
      {
        href: '/dashboard',
        label: 'Overview',
        icon: 'LayoutDashboard',
        description: 'High-level view of your agents and performance.',
      },
      {
        href: '/dashboard/playbooks',
        label: 'Playbooks',
        icon: 'BotMessageSquare',
        description: 'Reusable workflows your agents can run on demand.',
      },
      {
        href: '/dashboard/products',
        label: 'Products',
        icon: 'Box',
        description: 'Manage your product catalog.',
      },
      {
        href: '/dashboard/orders',
        label: 'Orders',
        icon: 'Package',
        description: 'View and manage incoming online orders.',
      },
      {
        href: '/dashboard/analytics',
        label: 'Analytics',
        icon: 'BarChart3',
        description: 'Explore sales data and product performance.',
      },
      {
        href: '/dashboard/content',
        label: 'Content AI',
        icon: 'PenSquare',
        description: 'Generate descriptions, images, and review summaries.',
      },
      {
        href: '/account',
        label: 'Account Settings',
        icon: 'Settings',
        description: 'Brand profile, billing, users, and preferences.',
        hidden: true, // Hide from sidebar but keep for header logic
      },
      {
        href: '/dashboard/ceo',
        label: 'Admin Console',
        icon: 'Shield',
        description: 'Manage data and AI features.',
      },
    ];

    return base.map((link) => ({
      ...link,
      active:
        link.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname?.startsWith(link.href),
    }));
  }, [pathname]);

  const currentLink =
    navLinks.find((link) => link.active) ?? navLinks[0];

  return {
    navLinks,
    currentLink,
  };
}
