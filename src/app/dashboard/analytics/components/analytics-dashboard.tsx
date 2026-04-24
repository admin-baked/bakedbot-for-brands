'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  TrendingUp,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentOwnerBadge } from '@/components/dashboard/agent-owner-badge';
import { AnalyticsTab as DeliveryAnalyticsTab } from '@/app/dashboard/delivery/components/analytics-tab';
import { MenuAnalyticsTab } from '@/app/dashboard/menu/components/analytics-tab';
import { OrdersAnalyticsTab } from '@/app/dashboard/orders/components/analytics-tab';
import { PricingAnalyticsTab } from '@/app/dashboard/pricing/components/pricing-analytics-tab';
import { ProductsAnalyticsTab } from '@/app/dashboard/products/components/analytics-tab';
import { UpsellAnalytics } from '@/app/dashboard/upsells/components/upsell-analytics';
import type { AnalyticsPrefs } from '@/server/actions/analytics-prefs';
import type { AnalyticsData } from '../actions';
import OverviewTab from './overview-tab';

const ALL_ROLES = [
  'brand',
  'brand_admin',
  'brand_member',
  'dispensary',
  'dispensary_admin',
  'dispensary_staff',
  'budtender',
  'super_user',
  'super_admin',
];
const DISPENSARY_ROLES = ['dispensary', 'dispensary_admin', 'dispensary_staff', 'super_user', 'super_admin'];
const ORDERS_ROLES = ['brand', 'brand_admin', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'super_user', 'super_admin'];
const UPSELLS_ROLES = ['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'super_user', 'super_admin'];

const TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard, roles: ALL_ROLES },
  { id: 'products', label: 'Products', Icon: Package, roles: DISPENSARY_ROLES },
  { id: 'orders', label: 'Orders', Icon: ShoppingCart, roles: ORDERS_ROLES },
  { id: 'menu', label: 'Menu', Icon: UtensilsCrossed, roles: DISPENSARY_ROLES },
  { id: 'upsells', label: 'Upsells', Icon: TrendingUp, roles: UPSELLS_ROLES },
  { id: 'delivery', label: 'Delivery', Icon: Truck, roles: ALL_ROLES },
  { id: 'pricing', label: 'Pricing', Icon: Tag, roles: ALL_ROLES },
] as const;

type TabId = (typeof TABS)[number]['id'];

function resolveDeliveryLocationId(orgId: string): string | null {
  const normalized = orgId.trim();
  if (!normalized) return null;
  if (normalized.startsWith('loc_')) return normalized;
  if (normalized.startsWith('org_')) return `loc_${normalized.slice(4)}`;
  if (normalized.startsWith('dispensary_')) return `loc_${normalized.slice('dispensary_'.length)}`;
  return null;
}

function DeliveryTabPanel({ orgId }: { orgId: string }) {
  const locationId = resolveDeliveryLocationId(orgId);

  if (!locationId) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Delivery Analytics</CardTitle>
          <CardDescription>Delivery metrics appear when you are scoped to a dispensary location.</CardDescription>
        </CardHeader>
        <CardContent className="py-10 text-sm text-muted-foreground">
          Switch into a dispensary workspace to review driver performance, delivery times, and completion rates.
        </CardContent>
      </Card>
    );
  }

  return <DeliveryAnalyticsTab locationId={locationId} />;
}

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

  const visibleTabs = TABS.filter((tab) => tab.roles.includes(userRole));
  const resolvedTab: TabId = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : 'overview';

  const setTab = useCallback(
    (id: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', id);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <AgentOwnerBadge agentId="pops" label="Pops Insights" />
      </div>

      <div className="flex gap-0 overflow-x-auto border-b">
        {visibleTabs.map(({ id, label, Icon }) => {
          const isActive = id === resolvedTab;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {resolvedTab === 'overview' && <OverviewTab data={initialData} prefs={prefs} orgId={orgId} />}
      {resolvedTab === 'products' && <ProductsAnalyticsTab orgId={orgId} />}
      {resolvedTab === 'orders' && <OrdersAnalyticsTab orgId={orgId} />}
      {resolvedTab === 'menu' && <MenuAnalyticsTab orgId={orgId} />}
      {resolvedTab === 'upsells' && <UpsellAnalytics orgId={orgId} />}
      {resolvedTab === 'delivery' && <DeliveryTabPanel orgId={orgId} />}
      {resolvedTab === 'pricing' && <PricingAnalyticsTab orgId={orgId} />}
    </div>
  );
}
