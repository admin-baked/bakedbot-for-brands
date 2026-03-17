'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  UtensilsCrossed,
  TrendingUp,
  Truck,
  Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { AnalyticsData } from '../actions';
import type { AnalyticsPrefs } from '@/server/actions/analytics-prefs';
import OverviewTab from './overview-tab';
import { ProductsAnalyticsTab } from '@/app/dashboard/products/components/analytics-tab';
import { OrdersAnalyticsTab } from '@/app/dashboard/orders/components/analytics-tab';
import { MenuAnalyticsTab } from '@/app/dashboard/menu/components/analytics-tab';
import { UpsellAnalytics } from '@/app/dashboard/upsells/components/upsell-analytics';
import { AgentOwnerBadge } from '@/components/dashboard/agent-owner-badge';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const ALL_ROLES = ['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender', 'super_user', 'super_admin'];
const DISPENSARY_ROLES = ['dispensary', 'dispensary_admin', 'dispensary_staff', 'super_user', 'super_admin'];
const ORDERS_ROLES = ['brand', 'brand_admin', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'super_user', 'super_admin'];
const UPSELLS_ROLES = ['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'super_user', 'super_admin'];

const TABS = [
  { id: 'overview',  label: 'Overview',  Icon: LayoutDashboard, roles: ALL_ROLES,       placeholder: false },
  { id: 'products',  label: 'Products',  Icon: Package,         roles: DISPENSARY_ROLES, placeholder: false },
  { id: 'orders',    label: 'Orders',    Icon: ShoppingCart,    roles: ORDERS_ROLES,     placeholder: false },
  { id: 'menu',      label: 'Menu',      Icon: UtensilsCrossed, roles: DISPENSARY_ROLES, placeholder: false },
  { id: 'upsells',   label: 'Upsells',   Icon: TrendingUp,      roles: UPSELLS_ROLES,    placeholder: false },
  { id: 'delivery',  label: 'Delivery',  Icon: Truck,           roles: ALL_ROLES,        placeholder: true  },
  { id: 'pricing',   label: 'Pricing',   Icon: Tag,             roles: ALL_ROLES,        placeholder: true  },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ---------------------------------------------------------------------------
// Placeholder tab
// ---------------------------------------------------------------------------

function PlaceholderTab({ name, description }: { name: string; description: string }) {
  return (
    <Card>
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-lg">{name} Analytics</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
        <span className="text-4xl">🚧</span>
        <p className="text-muted-foreground text-sm font-medium">Coming Soon</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          {name} analytics will appear here. Stay tuned for updates.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main analytics dashboard (tabbed shell)
// ---------------------------------------------------------------------------

interface AnalyticsDashboardProps {
  initialData: AnalyticsData;
  prefs: AnalyticsPrefs;
  orgId: string;
  userRole: string;
}

export default function AnalyticsDashboard({
  initialData,
  prefs,
  orgId,
  userRole,
}: AnalyticsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'overview') as TabId;

  // Filter tabs by role
  const visibleTabs = TABS.filter((t) => t.roles.includes(userRole));

  // If the active tab is not visible for this role, default to 'overview'
  const resolvedTab: TabId = visibleTabs.some((t) => t.id === activeTab) ? activeTab : 'overview';

  const setTab = useCallback(
    (id: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', id);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page header with agent attribution */}
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <AgentOwnerBadge agentId="pops" label="Pops Insights" />
      </div>
      {/* Tab nav — sits below the page header */}
      <div className="border-b flex gap-0 overflow-x-auto">
        {visibleTabs.map(({ id, label, Icon }) => {
          const isActive = id === resolvedTab;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      {resolvedTab === 'overview' && (
        <OverviewTab data={initialData} prefs={prefs} orgId={orgId} />
      )}
      {resolvedTab === 'products' && <ProductsAnalyticsTab orgId={orgId} />}
      {resolvedTab === 'orders' && <OrdersAnalyticsTab orgId={orgId} />}
      {resolvedTab === 'menu' && <MenuAnalyticsTab orgId={orgId} />}
      {resolvedTab === 'upsells' && <UpsellAnalytics orgId={orgId} />}
      {resolvedTab === 'delivery' && (
        <PlaceholderTab
          name="Delivery"
          description="Driver performance, route efficiency, ETA accuracy, and delivery order analytics."
        />
      )}
      {resolvedTab === 'pricing' && (
        <PlaceholderTab
          name="Pricing"
          description="Price elasticity, competitor benchmarking, margin optimization, and promo lift analysis."
        />
      )}
    </div>
  );
}
