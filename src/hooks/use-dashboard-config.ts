'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { useUserRole, type Role } from '@/hooks/use-user-role';

export type DashboardNavLink = {
  label: string;
  href: string;
  icon: keyof typeof LucideIcons;
  description: string;
  hidden?: boolean;
  active?: boolean;
  roles?: Role[]; // Roles that can access this link
};

/**
 * Hook for getting role-specific dashboard navigation configuration.
 * Returns different navigation items based on the user's role.
 */
export function useDashboardConfig() {
  const pathname = usePathname();
  const { role } = useUserRole();

  const navLinks: DashboardNavLink[] = useMemo(() => {
    // Define all possible navigation links with their role requirements
    const allLinks: DashboardNavLink[] = [
      {
        label: 'Overview',
        href: '/dashboard',
        icon: 'LayoutDashboard',
        description: 'High-level summary of agents, campaigns, and revenue.',
        roles: ['brand', 'dispensary', 'owner'],
      },
      // Brand-specific links
      {
        label: 'Agents',
        href: '/dashboard/agents',
        icon: 'Bot',
        description: 'Configure and monitor your AI agents.',
        roles: ['brand', 'owner'],
      },
      {
        label: 'Playbooks',
        href: '/dashboard/playbooks',
        icon: 'BookOpen',
        description: 'Manage automation playbooks and workflows.',
        roles: ['brand', 'owner'],
      },
      // Dispensary-specific links
      {
        label: 'Orders',
        href: '/dashboard/orders',
        icon: 'ShoppingCart',
        description: 'View and manage customer orders.',
        roles: ['dispensary', 'owner'],
      },
      {
        label: 'Inventory',
        href: '/dashboard/inventory',
        icon: 'Package',
        description: 'Manage product inventory and stock levels.',
        roles: ['dispensary', 'owner'],
      },
      // Shared links
      {
        label: 'Headless Menu',
        href: '/dashboard/menu',
        icon: 'ShoppingBag',
        description: 'Manage and preview your product catalog.',
        roles: ['brand', 'dispensary', 'owner'],
      },
      {
        label: 'Account',
        href: '/account',
        icon: 'Settings',
        description: 'Profile, billing, and configuration.',
        roles: ['brand', 'dispensary', 'owner'],
      },
    ];

    // Filter links based on user's role
    const filteredLinks = allLinks.filter(link => {
      if (!link.roles || link.roles.length === 0) return true;
      if (!role) return false;
      return link.roles.includes(role);
    });

    // Mark active link
    return filteredLinks.map((link) => ({
      ...link,
      active:
        pathname === link.href ||
        (link.href !== '/' && pathname.startsWith(link.href)),
    }));
  }, [pathname, role]);

  const current = navLinks.find((link) => link.active) ?? navLinks[0];

  return { navLinks, current, role };
}
