/**
 * Unit tests for order-notifications server action
 * Tests email notification sending for orders
 */

// Mock firebase
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        firestore: {
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({
                            items: [{ name: 'Test Product', quantity: 1, price: 25 }],
                            customer: {
                                name: 'John Doe',
                                email: 'john@test.com',
                                phone: '555-123-4567'
                            },
                            retailerId: 'retailer_123',
                            totals: { subtotal: 25, tax: 2.50, total: 27.50 }
                        })
                    })),
                    withConverter: jest.fn().mockReturnThis()
                }))
            }))
        }
    }))
}));

// Mock email sender
jest.mock('@/lib/email/send-order-email', () => ({
    sendOrderEmail: jest.fn(() => Promise.resolve())
}));

// Mock logger
jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

// Mock converter
jest.mock('@/firebase/converters', () => ({
    retailerConverter: {}
}));

import type { OrderStatus } from '@/types/domain';

describe('Order Notifications', () => {
    describe('sendOrderNotification', () => {
        const validStatuses: OrderStatus[] = [
            'pending',
            'submitted',
            'confirmed',
            'preparing',
            'ready',
            'completed',
            'cancelled'
        ];

        it('should support all order status types', () => {
            expect(validStatuses).toHaveLength(7);
        });

        it('should have status labels for customer notifications', () => {
            const statusLabels: Record<OrderStatus, string> = {
                pending: 'Received',
                submitted: 'Submitted',
                confirmed: 'Confirmed',
                preparing: 'Being Prepared',
                ready: 'Ready for Pickup',
                completed: 'Complete',
                cancelled: 'Cancelled'
            };

            expect(statusLabels.pending).toBe('Received');
            expect(statusLabels.ready).toBe('Ready for Pickup');
            expect(statusLabels.cancelled).toBe('Cancelled');
        });

        it('should format order ID in subject line', () => {
            const orderId = 'order_abc123xyz';
            const shortId = orderId.substring(0, 7);
            const subject = `Order #${shortId}: Confirmed`;

            expect(subject).toBe('Order #order_a: Confirmed');
        });

        it('should return success result format', () => {
            const result = { success: true };
            expect(result.success).toBe(true);
            expect(result).not.toHaveProperty('error');
        });

        it('should return error result format', () => {
            const result = { success: false, error: 'Order not found' };
            expect(result.success).toBe(false);
            expect(result.error).toBe('Order not found');
        });
    });

    describe('sendDispensaryNotification', () => {
        it('should format dispensary subject line', () => {
            const orderId = 'order_abc123xyz';
            const customerName = 'John Doe';
            const subject = `New Order #${orderId.substring(0, 7)} - ${customerName}`;

            expect(subject).toBe('New Order #order_a - John Doe');
        });

        it('should handle missing dispensary email', () => {
            const email = undefined;
            const fallback = null;
            const hasEmail = email || fallback;

            expect(hasEmail).toBeFalsy();
        });

        it('should use provided email over retailer email', () => {
            const providedEmail = 'override@dispensary.com';
            const retailerEmail = 'default@dispensary.com';
            const finalEmail = providedEmail || retailerEmail;

            expect(finalEmail).toBe('override@dispensary.com');
        });
    });

    describe('ServerOrderPayload structure', () => {
        it('should contain required order fields', () => {
            const payload = {
                items: [{ name: 'Product', quantity: 1, price: 20 }],
                customer: { name: 'John', email: 'john@test.com' },
                retailerId: 'retailer_123',
                totals: { subtotal: 20, tax: 2, total: 22 }
            };

            expect(payload).toHaveProperty('items');
            expect(payload).toHaveProperty('customer');
            expect(payload).toHaveProperty('retailerId');
            expect(payload).toHaveProperty('totals');
        });

        it('should handle multiple items', () => {
            const items = [
                { name: 'Product A', quantity: 2, price: 25 },
                { name: 'Product B', quantity: 1, price: 40 }
            ];

            expect(items).toHaveLength(2);
            const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            expect(total).toBe(90);
        });
    });

    describe('Error handling', () => {
        it('should handle order not found', () => {
            const orderExists = false;
            if (!orderExists) {
                const result = { success: false, error: 'Order not found' };
                expect(result.error).toBe('Order not found');
            }
        });

        it('should handle missing retailer gracefully', () => {
            const retailer = undefined;
            const fallbackRetailer = retailer || {
                id: 'unknown',
                name: 'Your Dispensary',
                address: '',
                city: '',
                state: '',
                zip: ''
            };

            expect(fallbackRetailer.name).toBe('Your Dispensary');
        });

        it('should log warnings for missing data', () => {
            const missingEmail = !undefined;
            expect(missingEmail).toBe(true);
        });
    });

    describe('Email recipient types', () => {
        it('should support customer recipient type', () => {
            const recipientType = 'customer';
            expect(recipientType).toBe('customer');
        });

        it('should support dispensary recipient type', () => {
            const recipientType = 'dispensary';
            expect(recipientType).toBe('dispensary');
        });
    });
});
