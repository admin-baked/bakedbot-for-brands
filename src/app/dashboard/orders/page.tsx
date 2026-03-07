import { requireUser } from '@/server/auth/auth';
import { getOrders } from './actions';
import { OrderDoc } from '@/types/orders';
import OrdersPageClient from './orders-client';
import { logger } from '@/lib/logger';

export const metadata = {
    title: 'Order Management | BakedBot',
    description: 'Manage and track customer orders',
};

// Serialize Timestamp objects for client component
function serializeOrders(orders: OrderDoc[]) {
    return orders.map(order => ({
        ...order,
        createdAt: order.createdAt?.toDate?.() ?? order.createdAt ?? new Date(),
        updatedAt: order.updatedAt?.toDate?.() ?? order.updatedAt,
        shippedAt: order.shippedAt?.toDate?.() ?? order.shippedAt,
        deliveredAt: order.deliveredAt?.toDate?.() ?? order.deliveredAt,
    }));
}

export default async function OrdersPage() {
    const user = await requireUser(['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender', 'super_user']);
    // Keep tenant org context separate from location context.
    // orgId drives Alleaves/tenant lookups; locationId drives retailerId order queries.
    const tenantOrgId = String((user as any).orgId || (user as any).currentOrgId || (user as any).brandId || user.uid);
    const locationId = (user as any).locationId ? String((user as any).locationId) : undefined;

    // Pre-fetch digital orders for SSR
    let initialOrders: OrderDoc[] = [];
    try {
        const result = await getOrders({ orgId: tenantOrgId, locationId });
        initialOrders = result.success ? result.data || [] : [];
    } catch (error) {
        logger.error('Failed to load initial orders', { error });
    }

    // Serialize timestamps for client component
    const serializedOrders = serializeOrders(initialOrders) as any;

    return (
        <div className="container mx-auto py-6">
            <OrdersPageClient orgId={tenantOrgId} initialOrders={serializedOrders} />
        </div>
    );
}
