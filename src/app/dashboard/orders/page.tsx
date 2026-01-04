import { requireUser } from '@/server/auth/auth';
import { getOrders } from './actions';
import { OrderDoc } from '@/types/orders';
import OrdersPageClient from './orders-client';

export const metadata = {
    title: 'Order Management | BakedBot',
    description: 'Manage and track customer orders',
};

export default async function OrdersPage() {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const orgId = user.brandId || user.uid;

    // Pre-fetch digital orders for SSR
    let initialOrders: OrderDoc[] = [];
    try {
        initialOrders = await getOrders(orgId);
    } catch (error) {
        console.error('Failed to load initial orders:', error);
    }

    return (
        <div className="container mx-auto py-6">
            <OrdersPageClient orgId={orgId} initialOrders={initialOrders} />
        </div>
    );
}
