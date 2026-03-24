import type { OrderStatus } from '@/types/domain';

/**
 * Map Alleaves order status strings to BakedBot OrderStatus.
 * Lives outside 'use server' — Next.js requires all server-action file exports to be async.
 */
export function mapAlleavesStatus(alleavesStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
        'pending': 'pending',
        'submitted': 'submitted',
        'confirmed': 'confirmed',
        'preparing': 'preparing',
        'ready': 'ready',
        'completed': 'completed',
        'cancelled': 'cancelled',
        'processing': 'preparing',
        'delivered': 'completed',
        'voided': 'cancelled',
    };

    return statusMap[alleavesStatus?.toLowerCase()] || 'pending';
}
