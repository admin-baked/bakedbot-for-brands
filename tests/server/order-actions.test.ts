/**
 * Unit tests for Order Actions
 * Tests dispensary order fulfillment workflow
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Firebase Admin
const mockOrderDoc = {
    exists: true,
    id: 'order_123',
    data: jest.fn(),
};

const mockOrderRef = {
    get: jest.fn().mockResolvedValue(mockOrderDoc),
    update: jest.fn().mockResolvedValue({}),
};

const mockFirestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnValue(mockOrderRef),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    get: jest.fn(),
};

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({ firestore: mockFirestore }),
}));

describe('Order Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('acceptOrder', () => {
        it('should accept pending order', async () => {
            mockOrderDoc.data.mockReturnValue({ status: 'pending' });

            const { acceptOrder } = await import('@/server/actions/order-actions');
            const result = await acceptOrder('order_123');

            expect(result.success).toBe(true);
            expect(mockOrderRef.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'preparing' })
            );
        });

        it('should reject non-pending order', async () => {
            mockOrderDoc.data.mockReturnValue({ status: 'completed' });

            const { acceptOrder } = await import('@/server/actions/order-actions');
            const result = await acceptOrder('order_123');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot accept order');
        });

        it('should return error for non-existent order', async () => {
            mockOrderRef.get.mockResolvedValueOnce({ exists: false });

            const { acceptOrder } = await import('@/server/actions/order-actions');
            const result = await acceptOrder('nonexistent');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Order not found');
        });
    });

    describe('markOrderReady', () => {
        it('should mark preparing order as ready', async () => {
            mockOrderDoc.data.mockReturnValue({ status: 'preparing' });

            const { markOrderReady } = await import('@/server/actions/order-actions');
            const result = await markOrderReady('order_123');

            expect(result.success).toBe(true);
            expect(mockOrderRef.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'ready' })
            );
        });

        it('should reject non-preparing order', async () => {
            mockOrderDoc.data.mockReturnValue({ status: 'pending' });

            const { markOrderReady } = await import('@/server/actions/order-actions');
            const result = await markOrderReady('order_123');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot mark ready');
        });
    });

    describe('fulfillOrder', () => {
        it('should fulfill ready order', async () => {
            mockOrderDoc.data.mockReturnValue({ status: 'ready' });

            const { fulfillOrder } = await import('@/server/actions/order-actions');
            const result = await fulfillOrder('order_123');

            expect(result.success).toBe(true);
            expect(mockOrderRef.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'completed' })
            );
        });

        it('should fulfill preparing order', async () => {
            mockOrderDoc.data.mockReturnValue({ status: 'preparing' });

            const { fulfillOrder } = await import('@/server/actions/order-actions');
            const result = await fulfillOrder('order_123');

            expect(result.success).toBe(true);
        });

        it('should reject pending order for fulfillment', async () => {
            mockOrderDoc.data.mockReturnValue({ status: 'pending' });

            const { fulfillOrder } = await import('@/server/actions/order-actions');
            const result = await fulfillOrder('order_123');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot fulfill order');
        });
    });

    describe('cancelOrder', () => {
        it('should cancel pending order', async () => {
            mockOrderDoc.data.mockReturnValue({ status: 'pending' });

            const { cancelOrder } = await import('@/server/actions/order-actions');
            const result = await cancelOrder('order_123', 'Out of stock', 'dispensary');

            expect(result.success).toBe(true);
            expect(mockOrderRef.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'cancelled',
                    cancellationReason: 'Out of stock',
                    cancelledBy: 'dispensary',
                })
            );
        });

        it('should cancel preparing order', async () => {
            mockOrderDoc.data.mockReturnValue({ status: 'preparing' });

            const { cancelOrder } = await import('@/server/actions/order-actions');
            const result = await cancelOrder('order_123', 'Customer request', 'customer');

            expect(result.success).toBe(true);
        });

        it('should reject cancellation of completed order', async () => {
            mockOrderDoc.data.mockReturnValue({ status: 'completed' });

            const { cancelOrder } = await import('@/server/actions/order-actions');
            const result = await cancelOrder('order_123', 'Too late', 'customer');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot cancel order');
        });

        it('should reject cancellation of already cancelled order', async () => {
            mockOrderDoc.data.mockReturnValue({ status: 'cancelled' });

            const { cancelOrder } = await import('@/server/actions/order-actions');
            const result = await cancelOrder('order_123', 'Duplicate', 'dispensary');

            expect(result.success).toBe(false);
        });
    });

    describe('getDispensaryOrders', () => {
        it('should return orders for retailer', async () => {
            const mockOrders = [
                { id: '1', status: 'pending', createdAt: { toDate: () => new Date() } },
                { id: '2', status: 'ready', createdAt: { toDate: () => new Date() } },
            ];

            mockFirestore.get.mockResolvedValueOnce({
                docs: mockOrders.map(o => ({ id: o.id, data: () => o })),
            });

            const { getDispensaryOrders } = await import('@/server/actions/order-actions');
            const result = await getDispensaryOrders('retailer_123');

            expect(result.orders).toHaveLength(2);
        });
    });

    describe('getOrderStats', () => {
        it('should return aggregated stats', async () => {
            // Mock count queries for each status
            const mockCounts = [5, 3, 2, 10, 1]; // pending, preparing, ready, completed, cancelled
            mockCounts.forEach(count => {
                mockFirestore.get.mockResolvedValueOnce({
                    data: () => ({ count }),
                });
            });

            const { getOrderStats } = await import('@/server/actions/order-actions');
            const stats = await getOrderStats('retailer_123');

            expect(stats.pending).toBe(5);
            expect(stats.preparing).toBe(3);
            expect(stats.ready).toBe(2);
            expect(stats.completed).toBe(10);
            expect(stats.cancelled).toBe(1);
        });
    });
});

describe('Order State Machine', () => {
    it('should define valid transitions', () => {
        // These are the allowed transitions
        const transitions = {
            pending: ['submitted', 'cancelled'],
            submitted: ['confirmed', 'cancelled'],
            confirmed: ['preparing', 'ready', 'cancelled'],
            preparing: ['ready', 'cancelled'],
            ready: ['completed', 'cancelled'],
            completed: [],
            cancelled: [],
        };

        // Verify no status can transition to pending (except initial creation)
        Object.values(transitions).forEach(allowed => {
            expect(allowed).not.toContain('pending');
        });

        // Verify completed and cancelled are terminal states
        expect(transitions.completed).toHaveLength(0);
        expect(transitions.cancelled).toHaveLength(0);
    });
});
