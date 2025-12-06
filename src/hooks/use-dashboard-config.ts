
'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Settings } from 'lucide-react';
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
  const rawPathname = usePathname();
  const pathname = rawPathname ?? ''; // Fallback for null
  const { role } = useUserRole();

  const navLinks: DashboardNavLink[] = useMemo(() => {
    // Define all possible navigation links with their role requirements
    const allLinks: DashboardNavLink[] = [
      {
        label: 'Playbooks',
        href: '/dashboard/playbooks',
        icon: 'BookOpen',
        description: 'Manage automation playbooks and workflows.',
        roles: ['brand', 'dispensary', 'owner'],
      },
      {
        label: 'Agents',
        href: '/dashboard/agents',
        icon: 'Bot',
        description: 'Configure and monitor your AI agents.',
        roles: ['brand', 'dispensary', 'owner'],
      },
      {
        label: 'Overview',
        href: '/dashboard',
        icon: 'LayoutDashboard',
        description: 'High-level summary of agents, campaigns, and revenue.',
        roles: ['brand', 'dispensary', 'owner'],
      },
      // Brand-specific links
      {
        label: 'Products',
        href: '/dashboard/products',
        icon: 'Package',
        description: 'Manage your product catalog.',
        roles: ['brand', 'owner'],
      },
      {
        label: 'Distribution',
        href: '/dashboard/distribution',
        icon: 'Map',
        description: 'Visualize SKU coverage and retail partners.',
        roles: ['brand', 'owner'],
      },
      {
        label: 'Content AI',
        href: '/dashboard/content',
        icon: 'PenSquare',
        description: 'Generate product descriptions, social images, and review summaries.',
        roles: ['brand', 'owner'],
      },
      {
        label: 'Analytics',
        href: '/dashboard/analytics',
        icon: 'BarChart3',
        description: 'Explore sales data and product performance.',
        roles: ['brand', 'owner'],
      },
      {
        label: 'Loyalty',
        href: '/dashboard/loyalty',
        icon: 'Crown',
        description: 'Manage rewards, tiers, and VIP automations.',
        roles: ['brand', 'owner'],
      },
      {
        label: 'Leads',
        href: '/dashboard/leads',
        icon: 'UserPlus',
        description: 'Manage captured emails and potential customers.',
        roles: ['brand', 'owner'],
      },
      // Dispensaries
      {
        label: 'Dispensaries',
        href: '/dashboard/dispensaries',
        icon: 'Store',
        description: 'Manage your dispensary partners.',
        roles: ['brand', 'owner'],
      },
      {
        label: 'Promotions',
        href: '/dashboard/promotions/recommendations',
        icon: 'Tag',
        description: 'AI-driven inventory promotions.',
        roles: ['brand', 'owner'],
      },
      {
        label: 'Integrations',
        href: '/dashboard/integrations',
        icon: 'Link', // Or 'Plug' if available, 'Link' is safe
        description: 'Connect POS (Dutchie, Jane) and other tools.',
        roles: ['brand', 'owner', 'dispensary'],
      },
      // Shared Commerce & E-com
      {
        label: 'Orders',
        href: '/dashboard/orders',
        icon: 'ShoppingCart',
        description: 'View and manage customer orders.',
        roles: ['brand', 'dispensary', 'owner'],
      },
      {
        label: 'Menu',
        href: '/dashboard/menu',
        icon: 'Utensils', // or FileSpreadsheet
        description: 'Manage your menu and product listings.',
        roles: ['brand', 'dispensary', 'owner'],
      },
      {
        label: 'CannSchemas', // 'CannMenus Integration' might be too long
        href: '/dashboard/menu-sync',
        icon: 'Database',
        description: 'Sync with CannMenus and other integrations.',
        roles: ['brand', 'dispensary', 'owner'],
      },
      {
        label: 'Ambassadors',
        href: '/dashboard/ambassador',
        icon: 'Megaphone',
        description: 'Manage brand ambassadors and referral programs.',
        roles: ['brand', 'owner'],
      },
      // Dispensary-specific links (Remaining)
      {
        label: 'Customers',
        href: '/dashboard/customers',
        icon: 'Users',
        description: 'Manage your customer base.',
        roles: ['dispensary', 'owner'],
      },
      {
        label: 'Segments',
        href: '/dashboard/segments',
        icon: 'PieChart',
        description: 'Segment customers for targeted campaigns.',
        roles: ['dispensary', 'owner'],
      },
      {
        label: 'App Store',
        href: '/dashboard/apps',
        icon: 'Grid',
        description: 'Connect integrations like Dutchie and Jane.',
        roles: ['dispensary', 'owner'],
      },
      // Owner-specific link
      {
        label: 'Admin Console',
        href: '/dashboard/ceo',
        icon: 'Shield',
        description: 'Manage data and AI features.',
        roles: ['owner'],
      },
      {
        label: 'Settings',
        href: '/dashboard/settings',
        icon: 'Settings',
        description: 'Configure domains, embeds, and integrations.',
        roles: ['brand', 'dispensary', 'owner'],
      },
      // This is not a primary nav item but needed for the settings page to have a description
      {
        label: 'Account',
        href: '/account',
        icon: 'Settings',
        description: 'Manage your profile, brand, and AI settings.',
        roles: ['brand', 'dispensary', 'owner'],
        hidden: true,
      },
    ];

    // Filter links based on user's role
    const normalizedRole = role ? role.toLowerCase() as Role : null;

    const filteredLinks = allLinks.filter(link => {
      // Always show links with no role requirements
      if (!link.roles || link.roles.length === 0) return true;

      // If no role logic is active, hide restricted links
      if (!normalizedRole) return false;

      return link.roles.includes(normalizedRole);
    });

    // Mark active link
    return filteredLinks.map((link) => ({
      ...link,
      active: link.href === '/dashboard' ? pathname === link.href : pathname.startsWith(link.href),
    }));
  }, [pathname, role]);

  const current = navLinks.find((link) => link.active) ?? navLinks[0];

  return { navLinks, current, role };
}
