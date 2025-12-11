
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
  badge?: 'beta' | 'locked' | 'coming-soon';
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
        badge: 'coming-soon',
      },
      {
        label: 'Content AI',
        href: '/dashboard/content',
        icon: 'PenSquare',
        description: 'Generate product descriptions, social images, and review summaries.',
        roles: ['brand', 'owner'],
        badge: 'coming-soon',
      },
      {
        label: 'Analytics',
        href: '/dashboard/analytics',
        icon: 'BarChart3',
        description: 'Explore sales data and product performance.',
        roles: ['brand', 'owner'],
        badge: 'coming-soon',
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
        badge: 'coming-soon',
      },
      {
        label: 'App Store',
        href: '/dashboard/apps',
        icon: 'LayoutGrid',
        description: 'Manage POS and marketing integrations.',
        roles: ['brand', 'owner', 'dispensary'],
        badge: 'coming-soon',
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
        badge: 'coming-soon',
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
        label: 'Menu Bundles',
        href: '/dashboard/bundles',
        icon: 'PackagePlus',
        description: 'Create and manage product bundles.',
        roles: ['dispensary', 'owner'],
      },
      {
        label: 'Carousels',
        href: '/dashboard/carousels',
        icon: 'Images',
        description: 'Manage featured product carousels.',
        roles: ['dispensary', 'owner'],
      },
      {
        label: 'Loyalty',
        href: '/dashboard/loyalty',
        icon: 'Award',
        description: 'Manage loyalty points and tiered rewards.',
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
        label: 'Vision',
        href: '/dashboard/vision',
        icon: 'Eye',
        description: 'Real-time camera analytics and operations monitoring.',
        roles: ['brand', 'dispensary', 'owner'],
        badge: 'coming-soon',
      },
      // Duplicate App Store link removed
      // Owner-specific link
      {
        label: 'Operations',
        href: '/dashboard/ceo/playbooks',
        icon: 'Wand2',
        description: 'Internal agent commands and automation playbooks.',
        roles: ['owner'],
      },
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
