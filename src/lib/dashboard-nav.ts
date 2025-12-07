
export type DashboardNavItem = {
  key: string;
  label: string;
  href: string;
  icon?: string; // we'll map these to actual icons later
  badge?: 'beta' | 'locked';
  group?: 'core' | 'growth' | 'lifecycle' | 'settings';
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  {
    key: 'overview',
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'layout-dashboard',
    group: 'core',
  },
  {
    key: 'smokey-chat',
    label: 'Smokey Chat',
    href: '/dashboard/smokey',
    icon: 'message-circle',
    group: 'core',
  },
  {
    key: 'sanctum',
    label: 'The Sanctum',
    href: '/dashboard/sanctum',
    icon: 'shield',
    group: 'core',
    badge: 'beta',
  },
  {
    key: 'knowledge-base',
    label: 'Knowledge Base',
    href: '/dashboard/knowledge-base',
    icon: 'book-open',
    group: 'core',
  },
  {
    key: 'growth-engine',
    label: 'Smokey Growth Engine',
    href: '/dashboard/growth',
    icon: 'trending-up',
    group: 'growth',
  },
  {
    key: 'campaigns',
    label: 'Campaigns',
    href: '/dashboard/campaigns',
    icon: 'send',
    group: 'growth',
    badge: 'locked',
  },
  {
    key: 'playbooks',
    label: 'Playbooks',
    href: '/dashboard/playbooks',
    icon: 'sparkles',
    group: 'lifecycle',
  },
  {
    key: 'products',
    label: 'Products',
    href: '/dashboard/products',
    icon: 'package',
    group: 'core',
  },
  {
    key: 'orders',
    label: 'Orders',
    href: '/dashboard/orders',
    icon: 'shopping-cart',
    group: 'core',
  },
  {
    key: 'customers',
    label: 'Customers',
    href: '/dashboard/customers',
    icon: 'users',
    group: 'core',
  },
  {
    key: 'distribution',
    label: 'Distribution',
    href: '/dashboard/distribution',
    icon: 'truck',
    group: 'growth',
  },
  {
    key: 'content',
    label: 'Content AI',
    href: '/dashboard/content',
    icon: 'pen-tool',
    group: 'growth',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: 'bar-chart',
    group: 'growth',
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/dashboard/settings',
    icon: 'settings',
    group: 'settings',
  },
];
