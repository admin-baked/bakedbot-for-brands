/**
 * Dispensary Dashboard Landing Page
 *
 * Overview dashboard for dispensary users (admin, staff, budtender)
 * Shows today's orders, customer stats, inventory alerts, and revenue snapshot
 */

import { Suspense } from 'react';
import { requireUser } from '@/server/auth/auth';
import { getUserOrgId } from '@/server/auth/rbac';
import { getOrders } from '@/app/dashboard/orders/actions';
import { getCustomers } from '@/app/dashboard/customers/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  Clock,
  AlertCircle,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { POSSyncStatus } from '@/components/dashboard/pos-sync-status';

export default async function DispensaryDashboard() {
  // Require dispensary role
  const authUser = await requireUser(['dispensary_admin', 'dispensary_staff', 'dispensary', 'budtender']);

  // Convert to DomainUserProfile format for getUserOrgId
  const user = {
    id: authUser.uid,
    uid: authUser.uid,
    email: authUser.email || null,
    displayName: authUser.displayName,
    role: authUser.role,
    organizationIds: [],
    currentOrgId: authUser.currentOrgId,
    brandId: authUser.brandId,
    locationId: authUser.locationId,
  };

  // Get org ID for data scoping
  const orgId = getUserOrgId(user);

  if (!orgId) {
    return (
      <div className="p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Organization Not Found
            </CardTitle>
            <CardDescription>
              Your account is not associated with a dispensary organization.
              Please contact support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dispensary Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of today's operations
          </p>
        </div>
        <POSSyncStatus orgId={orgId} dataType="customers" />
      </div>

      {/* Stats Grid */}
      <Suspense fallback={<StatsGridSkeleton />}>
        <StatsGrid orgId={orgId} />
      </Suspense>

      {/* Recent Orders & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<CardSkeleton />}>
          <RecentOrders orgId={orgId} />
        </Suspense>

        <QuickActions role={user.role} />
      </div>
    </div>
  );
}

/**
 * Stats Grid Component - Shows key metrics
 */
async function StatsGrid({ orgId }: { orgId: string }) {
  // Fetch data in parallel
  const [ordersResult, customersResult] = await Promise.all([
    getOrders({ orgId, limit: 100 }),
    getCustomers({ orgId, limit: 100 })
  ]);

  const orders = ordersResult.success ? ordersResult.data || [] : [];
  const customers = customersResult.customers || [];

  // Calculate today's stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(o => {
    if (!o.createdAt) return false;
    const orderDate = o.createdAt instanceof Date ? o.createdAt :
                      (o.createdAt as any).toDate ? (o.createdAt as any).toDate() : new Date(o.createdAt as any);
    return orderDate >= today;
  });

  const pendingOrders = orders.filter(o =>
    ['confirmed', 'preparing'].includes(o.status)
  ).length;

  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.totals?.total || 0), 0);

  const newCustomersToday = customers.filter((c: any) => {
    if (!c.createdAt) return false;
    const createdDate = c.createdAt instanceof Date ? c.createdAt :
                        c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
    return createdDate >= today;
  }).length;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Today's Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Today's Orders
          </CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayOrders.length}</div>
          <p className="text-xs text-muted-foreground">
            {pendingOrders} pending
          </p>
        </CardContent>
      </Card>

      {/* Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Today's Revenue
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${todayRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            ${(todayRevenue / Math.max(todayOrders.length, 1)).toFixed(2)} avg
          </p>
        </CardContent>
      </Card>

      {/* Customers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Customers
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{customers.length}</div>
          <p className="text-xs text-muted-foreground">
            {newCustomersToday} new today
          </p>
        </CardContent>
      </Card>

      {/* Inventory (placeholder) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Inventory
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">--</div>
          <p className="text-xs text-muted-foreground">
            Coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Recent Orders Component
 */
async function RecentOrders({ orgId }: { orgId: string }) {
  const result = await getOrders({ orgId, limit: 5 });
  const orders = result.success ? result.data || [] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>Latest orders from your dispensary</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.slice(0, 5).map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {order.customer?.name || order.customer?.email || 'Guest'}
                    </span>
                    <Badge variant={getStatusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.items?.length || 0} items · ${order.totals?.total?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <Link href={`/dashboard/orders?id=${order.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <Link href="/dashboard/orders">
            <Button variant="outline" className="w-full">
              View All Orders
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Quick Actions Component
 */
function QuickActions({ role }: { role: string | null }) {
  const isAdmin = role === 'dispensary_admin' || role === 'dispensary';
  const isBudtender = role === 'budtender';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks for your role</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* All roles */}
        <Link href="/dashboard/orders" className="block">
          <Button variant="outline" className="w-full justify-start">
            <ShoppingCart className="mr-2 h-4 w-4" />
            View Orders
          </Button>
        </Link>

        <Link href="/dashboard/customers" className="block">
          <Button variant="outline" className="w-full justify-start">
            <Users className="mr-2 h-4 w-4" />
            View Customers
          </Button>
        </Link>

        {!isBudtender && (
          <>
            <Link href="/dashboard/loyalty" className="block">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Loyalty Program
              </Button>
            </Link>

            <Link href="/dashboard/menu" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                Menu Management
              </Button>
            </Link>
          </>
        )}

        {isAdmin && (
          <>
            <Link href="/dashboard/analytics" className="block">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </Link>

            <Link href="/dashboard/settings" className="block">
              <Button variant="outline" className="w-full justify-start">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Helper Functions
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'confirmed':
    case 'preparing':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Loading Skeletons
 */
function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardHeader className="space-y-0 pb-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            <div className="h-3 w-20 bg-muted animate-pulse rounded mt-1" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
