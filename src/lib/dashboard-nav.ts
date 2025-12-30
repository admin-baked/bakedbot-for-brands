
export type DashboardNavItem = {
  key: string;
  label: string;
  href: string;
  icon?: string; // we'll map these to actual icons later
  badge?: 'beta' | 'locked' | 'coming-soon';
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
    badge: 'coming-soon',
  },
  {
    key: 'knowledge-base',
    label: 'Knowledge Base',
    href: '/dashboard/knowledge-base',
    icon: 'book-open',
    group: 'core',
  },
  {
    key: 'research',
    label: 'Deep Research',
    href: '/dashboard/research',
    icon: 'globe',
    group: 'core',
    badge: 'beta',
  },
  {
    key: 'projects',
    label: 'Projects',
    href: '/dashboard/projects',
    icon: 'folder-kanban',
    group: 'core',
  },
  {
    key: 'growth-engine',
    label: 'Smokey Growth Engine',
    href: '/dashboard/growth',
    icon: 'trending-up',
    group: 'growth',
    badge: 'coming-soon',
  },
  {
    key: 'campaigns',
    label: 'Campaigns',
    href: '/dashboard/campaigns',
    icon: 'send',
    group: 'growth',
    badge: 'coming-soon',
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
    badge: 'coming-soon',
  },
  {
    key: 'content',
    label: 'Content AI',
    href: '/dashboard/content',
    icon: 'pen-tool',
    group: 'growth',
    badge: 'coming-soon',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: 'bar-chart',
    group: 'growth',
    badge: 'coming-soon',
  },
  {
    key: 'menu-bundles',
    label: 'Menu Bundles',
    href: '/dashboard/bundles',
    icon: 'package-plus',
    group: 'growth',
  },
  {
    key: 'carousels',
    label: 'Carousels',
    href: '/dashboard/carousels',
    icon: 'images',
    group: 'growth',
  },
  {
    key: 'loyalty',
    label: 'Loyalty',
    href: '/dashboard/loyalty',
    icon: 'award',
    group: 'lifecycle',
  },
  {
    key: 'team',
    label: 'Team',
    href: '/dashboard/team',
    icon: 'user-plus',
    group: 'settings',
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/dashboard/settings',
    icon: 'settings',
    group: 'settings',
  },
  {
    key: 'treasury',
    label: 'Treasury',
    href: '/dashboard/treasury',
    icon: 'wallet',
    group: 'core',
    badge: 'locked', // Hidden for non-owners via role check
  },
];
