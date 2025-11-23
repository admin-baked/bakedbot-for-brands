
'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import * as LucideIcons from 'lucide-react';
import { useStore } from '@/hooks/use-store';

export type NavLink = {
  href: string;
  label: string;
  description: string;
  icon: keyof typeof LucideIcons;
  hidden?: boolean;
};

// Define the navigation structure for different roles
const navConfig: Record<string, NavLink[]> = {
  brand: [
    { href: '/dashboard', label: 'Dashboard', description: 'An overview of your brand activity.', icon: 'LayoutDashboard' },
    { href: '/dashboard/products', label: 'Products', description: 'Manage your product catalog.', icon: 'Box' },
    { href: '/dashboard/content', label: 'Content AI', description: 'Generate descriptions, images, and review summaries.', icon: 'PenSquare', hidden: true }, // Hidden for now
    { href: '/account', label: 'Brand Settings', description: 'Manage brand identity and chatbot configuration.', icon: 'Settings' },
  ],
  dispensary: [
    { href: '/dashboard', label: 'Dashboard', description: 'An overview of your dispensary activity.', icon: 'LayoutDashboard' },
    { href: '/dashboard/orders', label: 'Customer Orders', description: 'View and manage incoming online orders.', icon: 'Package' },
    { href: '/account', label: 'Account Settings', description: 'Manage your dispensary information.', icon: 'Settings' },
  ],
  customer: [
    { href: '/account', label: 'My Account', description: 'View your order history and preferences.', icon: 'User' },
    { href: '/menu/default', label: 'Start Shopping', description: 'Browse our products and find what you need.', icon: 'ShoppingCart' },
  ],
  // 'owner' or 'admin' role has access to all features
  owner: [
    { href: '/dashboard', label: 'Dashboard', description: 'An overview of your brand activity.', icon: 'LayoutDashboard' },
    { href: '/dashboard/playbooks', label: 'Playbooks', description: 'Manage your AI agents and automations.', icon: 'BotMessageSquare' },
    { href: '/dashboard/analytics', label: 'Analytics', description: 'Explore sales data and product performance.', icon: 'BarChart3' },
    { href: '/dashboard/products', label: 'Products', description: 'Manage your product catalog.', icon: 'Box' },
    { href: '/dashboard/content', label: 'Content AI', description: 'Generate descriptions, images, and review summaries.', icon: 'PenSquare' },
    { href: '/dashboard/orders', label: 'Customer Orders', description: 'View and manage incoming online orders.', icon: 'Package' },
    { href: '/account', label: 'Account Settings', description: 'Manage brand identity and chatbot configuration.', icon: 'Settings' },
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
  
  const userRole = (user as any)?.role || 'customer';

  const navLinks = useMemo(() => {
    // A user with the 'owner' role or in 'CEO Mode' gets full access
    if (userRole === 'owner' || isCeoMode) {
        return navConfig.owner;
    }
    return navConfig[userRole] || navConfig.customer;
  }, [userRole, isCeoMode]);
  
  return {
    navLinks,
    userRole,
  };
}
