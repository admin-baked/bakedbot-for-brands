
'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { useStore } from '@/hooks/use-store';

export type DashboardNavLink = {
  href: string;
  label: string;
  description: string;
  icon: keyof typeof LucideIcons;
  hidden?: boolean;
};

// Define the navigation structure for different roles
const navConfig: Record<string, DashboardNavLink[]> = {
  brand: [
    { href: '/dashboard', label: 'Dashboard', description: 'An overview of your brand activity.', icon: 'LayoutDashboard' },
    { href: '/dashboard/products', label: 'Products', description: 'Manage your product catalog.', icon: 'Box' },
    { href: '/dashboard/content', label: 'Content AI', description: 'Generate descriptions, images, and review summaries.', icon: 'PenSquare' },
    { href: '/account', label: 'Settings', description: 'Manage brand identity and chatbot configuration.', icon: 'Settings', hidden: true },
  ],
  dispensary: [
    { href: '/dashboard', label: 'Dashboard', description: 'An overview of your dispensary activity.', icon: 'LayoutDashboard' },
    { href: '/dashboard/orders', label: 'Customer Orders', description: 'View and manage incoming online orders.', icon: 'Package' },
    { href: '/account', label: 'Settings', description: 'Manage your dispensary information.', icon: 'Settings', hidden: true },
  ],
  customer: [
    { href: '/account', label: 'My Account', description: 'View your order history and preferences.', icon: 'User', hidden: true },
    { href: '/menu/default', label: 'Start Shopping', description: 'Browse our products and find what you need.', icon: 'ShoppingCart' },
  ],
  // 'owner' role gets access to everything
  owner: [
    { href: '/dashboard', label: 'Dashboard', description: 'An overview of your brand activity.', icon: 'LayoutDashboard' },
    { href: '/dashboard/playbooks', label: 'Playbooks', description: 'Manage your AI agents and automations.', icon: 'BotMessageSquare' },
    { href: '/dashboard/analytics', label: 'Analytics', description: 'Explore sales data and product performance.', icon: 'BarChart3' },
    { href: '/dashboard/products', label: 'Products', description: 'Manage your product catalog.', icon: 'Box' },
    { href: '/dashboard/content', label: 'Content AI', description: 'Generate descriptions, images, and review summaries.', icon: 'PenSquare' },
    { href: '/dashboard/orders', label: 'Customer Orders', description: 'View and manage incoming online orders.', icon: 'Package' },
    { href: '/account', label: 'Account Settings', description: 'Brand profile, billing, users, and preferences.', icon: 'Settings', hidden: true },
    { href: '/dashboard/ceo', label: 'Admin Console', description: 'Manage data and AI features.', icon: 'Shield' },
  ]
};

/**
 * A hook to get the appropriate dashboard configuration (e.g., nav links)
 * based on the current user's role.
 */
export function useDashboardConfig() {
  const { user } = useUser();
  const { isCeoMode } = useStore();
  const pathname = usePathname();
  
  const userRole = (user as any)?.role || 'customer';

  const navLinks = useMemo(() => {
    // A user with the 'owner' role or in 'CEO Mode' gets full access
    let links: DashboardNavLink[];
    if (userRole === 'owner' || isCeoMode) {
        links = navConfig.owner;
    } else {
        links = navConfig[userRole] || navConfig.customer;
    }
    
    // Add the /account link for all authenticated non-customer roles
    if (user && userRole !== 'customer' && !links.some(l => l.href === '/account')) {
        links.push({
            href: '/account',
            label: 'Account Settings',
            icon: 'Settings',
            description: 'Manage your profile and settings.',
            hidden: true,
        });
    }

    return links.map(link => ({
      ...link,
      active: link.href === '/dashboard' ? pathname === '/dashboard' : !!pathname?.startsWith(link.href),
    }));

  }, [userRole, isCeoMode, pathname, user]);

  const currentLink = navLinks.find((link) => link.active) ?? navLinks.find(l => l.href === '/dashboard') ?? navLinks[0];
  
  return {
    navLinks,
    userRole,
    currentLink,
  };
}
