'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import * as LucideIcons from 'lucide-react';
import { useCookieStore } from '@/lib/cookie-storage';

export type NavLink = {
  href: string;
  label: string;
  icon: keyof typeof LucideIcons;
  hidden?: boolean;
};

// Define the navigation structure for different roles
const navConfig: Record<string, NavLink[]> = {
  brand: [
    { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { href: '/dashboard/orders', label: 'Orders', icon: 'Package' },
    { href: '/dashboard/content', label: 'Content AI', icon: 'PenSquare' },
    { href: '/dashboard/settings', label: 'Settings', icon: 'Settings' },
  ],
  dispensary: [
    { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { href: '/dashboard/orders', label: 'Customer Orders', icon: 'Package' },
    { href: '/dashboard/settings', label: 'Settings', icon: 'Settings' },
  ],
  customer: [
    { href: '/account/dashboard', label: 'My Dashboard', icon: 'User' },
    { href: '/menu/default', label: 'Start Shopping', icon: 'ShoppingCart' },
  ],
  // 'owner' or 'admin' role
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', hidden: false },
    { href: '/dashboard/orders', label: 'Orders', icon: 'Package', hidden: false },
    { href: '/dashboard/products', label: 'Products', icon: 'Box', hidden: false },
    { href: '/dashboard/content', label: 'Content AI', icon: 'PenSquare', hidden: false },
    { href: '/dashboard/reviews', label: 'Reviews', icon: 'Star', hidden: false },
    { href: '/dashboard/locations', label: 'Retailers', icon: 'MapPin', hidden: false },
    { href: '/dashboard/settings', label: 'Settings', icon: 'Settings', hidden: false },
    { href: '/dashboard/ceo/import-demo-data', label: 'Data Manager', icon: 'Database', hidden: false },
    { href: '/dashboard/ceo/initialize-embeddings', label: 'AI Search Index', icon: 'BrainCircuit', hidden: false },
  ]
};

/**
 * A hook to get the appropriate dashboard configuration (e.g., nav links)
 * based on the current user's role.
 */
export function useDashboardConfig() {
  const { user } = useUser();
  const { isCeoMode } = useCookieStore();
  
  const userRole = (user as any)?.customClaims?.role || 'customer';

  const navLinks = useMemo(() => {
    // CEO mode grants admin-level navigation
    if (isCeoMode) {
        return navConfig.admin;
    }
    return navConfig[userRole] || navConfig.customer;
  }, [userRole, isCeoMode]);
  
  return {
    navLinks,
    userRole,
  };
}
