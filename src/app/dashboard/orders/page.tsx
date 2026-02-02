import { requireUser } from '@/server/auth/auth';
import { getOrders } from './actions';
import { OrderDoc } from '@/types/orders';
import OrdersPageClient from './orders-client';

export const metadata = {
    title: 'Order Management | BakedBot',
    description: 'Manage and track customer orders',
};

export default async function OrdersPage() {
    const user = await requireUser(['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender', 'super_user']);
    // Ensure orgId is always a valid string
    const orgId = String((user as any).brandId || user.uid);

    // Pre-fetch digital orders for SSR
    let initialOrders: OrderDoc[] = [];
    try {
        const result = await getOrders({ orgId });
        initialOrders = result.success ? result.data || [] : [];
    } catch (error) {
        console.error('Failed to load initial orders:', error);
    }

    return (
        <div className="container mx-auto py-6">
            <OrdersPageClient orgId={orgId} initialOrders={initialOrders} />
        </div>
    );
}
