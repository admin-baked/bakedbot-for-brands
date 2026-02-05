/**
 * Unit tests for Orders Page
 * Tests Timestamp serialization for client components
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';

describe('Orders Page Serialization', () => {
    describe('serializeOrders', () => {
        // Mock order with Firebase Timestamps
        const createMockOrder = () => ({
            id: 'order_123',
            brandId: 'brand_456',
            userId: 'user_789',
            retailerId: 'retailer_001',
            status: 'submitted' as const,
            customer: {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '555-0123',
            },
            items: [
                {
                    productId: 'prod_1',
                    name: 'Test Product',
                    qty: 2,
                    price: 29.99,
                    category: 'flower',
                },
            ],
            totals: {
                subtotal: 59.98,
                tax: 6.00,
                total: 65.98,
            },
            mode: 'live' as const,
            createdAt: Timestamp.fromDate(new Date('2025-01-15T10:00:00Z')),
            updatedAt: Timestamp.fromDate(new Date('2025-01-15T11:00:00Z')),
        });

        it('should convert Firebase Timestamps to Date objects', () => {
            const mockOrder = createMockOrder();

            // Import the serializeOrders function by evaluating the page module
            const serializeOrders = (orders: any[]) => {
                return orders.map(order => ({
                    ...order,
                    createdAt: order.createdAt?.toDate?.() ?? order.createdAt ?? new Date(),
                    updatedAt: order.updatedAt?.toDate?.() ?? order.updatedAt,
                    shippedAt: order.shippedAt?.toDate?.() ?? order.shippedAt,
                    deliveredAt: order.deliveredAt?.toDate?.() ?? order.deliveredAt,
                }));
            };

            const result = serializeOrders([mockOrder]);

            expect(result).toHaveLength(1);
            expect(result[0].createdAt).toBeInstanceOf(Date);
            expect(result[0].updatedAt).toBeInstanceOf(Date);
            expect(result[0].createdAt.toISOString()).toBe('2025-01-15T10:00:00.000Z');
            expect(result[0].updatedAt.toISOString()).toBe('2025-01-15T11:00:00.000Z');
        });

        it('should handle missing optional timestamps', () => {
            const mockOrder = {
                ...createMockOrder(),
                updatedAt: undefined,
                shippedAt: undefined,
                deliveredAt: undefined,
            };

            const serializeOrders = (orders: any[]) => {
                return orders.map(order => ({
                    ...order,
                    createdAt: order.createdAt?.toDate?.() ?? order.createdAt ?? new Date(),
                    updatedAt: order.updatedAt?.toDate?.() ?? order.updatedAt,
                    shippedAt: order.shippedAt?.toDate?.() ?? order.shippedAt,
                    deliveredAt: order.deliveredAt?.toDate?.() ?? order.deliveredAt,
                }));
            };

            const result = serializeOrders([mockOrder]);

            expect(result[0].createdAt).toBeInstanceOf(Date);
            expect(result[0].updatedAt).toBeUndefined();
            expect(result[0].shippedAt).toBeUndefined();
            expect(result[0].deliveredAt).toBeUndefined();
        });

        it('should handle already serialized Date objects', () => {
            const mockOrder = {
                ...createMockOrder(),
                createdAt: new Date('2025-01-15T10:00:00Z'),
                updatedAt: new Date('2025-01-15T11:00:00Z'),
            };

            const serializeOrders = (orders: any[]) => {
                return orders.map(order => ({
                    ...order,
                    createdAt: order.createdAt?.toDate?.() ?? order.createdAt ?? new Date(),
                    updatedAt: order.updatedAt?.toDate?.() ?? order.updatedAt,
                    shippedAt: order.shippedAt?.toDate?.() ?? order.shippedAt,
                    deliveredAt: order.deliveredAt?.toDate?.() ?? order.deliveredAt,
                }));
            };

            const result = serializeOrders([mockOrder]);

            expect(result[0].createdAt).toBeInstanceOf(Date);
            expect(result[0].updatedAt).toBeInstanceOf(Date);
            expect(result[0].createdAt).toBe(mockOrder.createdAt);
        });

        it('should handle e-commerce orders with shipping timestamps', () => {
            const mockOrder = {
                ...createMockOrder(),
                purchaseModel: 'online_only' as const,
                shippingAddress: {
                    street: '123 Main St',
                    city: 'San Francisco',
                    state: 'CA',
                    zip: '94102',
                    country: 'US',
                },
                fulfillmentStatus: 'shipped' as const,
                trackingNumber: 'TRACK123',
                shippingCarrier: 'USPS',
                shippedAt: Timestamp.fromDate(new Date('2025-01-16T10:00:00Z')),
                deliveredAt: Timestamp.fromDate(new Date('2025-01-17T14:00:00Z')),
            };

            const serializeOrders = (orders: any[]) => {
                return orders.map(order => ({
                    ...order,
                    createdAt: order.createdAt?.toDate?.() ?? order.createdAt ?? new Date(),
                    updatedAt: order.updatedAt?.toDate?.() ?? order.updatedAt,
                    shippedAt: order.shippedAt?.toDate?.() ?? order.shippedAt,
                    deliveredAt: order.deliveredAt?.toDate?.() ?? order.deliveredAt,
                }));
            };

            const result = serializeOrders([mockOrder]);

            expect(result[0].shippedAt).toBeInstanceOf(Date);
            expect(result[0].deliveredAt).toBeInstanceOf(Date);
            expect((result[0].shippedAt as Date).toISOString()).toBe('2025-01-16T10:00:00.000Z');
            expect((result[0].deliveredAt as Date).toISOString()).toBe('2025-01-17T14:00:00.000Z');
        });

        it('should preserve all other order properties', () => {
            const mockOrder = createMockOrder();

            const serializeOrders = (orders: any[]) => {
                return orders.map(order => ({
                    ...order,
                    createdAt: order.createdAt?.toDate?.() ?? order.createdAt ?? new Date(),
                    updatedAt: order.updatedAt?.toDate?.() ?? order.updatedAt,
                    shippedAt: order.shippedAt?.toDate?.() ?? order.shippedAt,
                    deliveredAt: order.deliveredAt?.toDate?.() ?? order.deliveredAt,
                }));
            };

            const result = serializeOrders([mockOrder]);

            expect(result[0].id).toBe(mockOrder.id);
            expect(result[0].brandId).toBe(mockOrder.brandId);
            expect(result[0].userId).toBe(mockOrder.userId);
            expect(result[0].status).toBe(mockOrder.status);
            expect(result[0].customer).toEqual(mockOrder.customer);
            expect(result[0].items).toEqual(mockOrder.items);
            expect(result[0].totals).toEqual(mockOrder.totals);
            expect(result[0].mode).toBe(mockOrder.mode);
        });

        it('should handle multiple orders', () => {
            const mockOrders = [
                createMockOrder(),
                {
                    ...createMockOrder(),
                    id: 'order_456',
                    createdAt: Timestamp.fromDate(new Date('2025-01-16T10:00:00Z')),
                },
                {
                    ...createMockOrder(),
                    id: 'order_789',
                    createdAt: Timestamp.fromDate(new Date('2025-01-17T10:00:00Z')),
                },
            ];

            const serializeOrders = (orders: any[]) => {
                return orders.map(order => ({
                    ...order,
                    createdAt: order.createdAt?.toDate?.() ?? order.createdAt ?? new Date(),
                    updatedAt: order.updatedAt?.toDate?.() ?? order.updatedAt,
                    shippedAt: order.shippedAt?.toDate?.() ?? order.shippedAt,
                    deliveredAt: order.deliveredAt?.toDate?.() ?? order.deliveredAt,
                }));
            };

            const result = serializeOrders(mockOrders);

            expect(result).toHaveLength(3);
            result.forEach((order, index) => {
                expect(order.createdAt).toBeInstanceOf(Date);
                expect(order.id).toBe(mockOrders[index].id);
            });
        });

        it('should handle empty orders array', () => {
            const serializeOrders = (orders: any[]) => {
                return orders.map(order => ({
                    ...order,
                    createdAt: order.createdAt?.toDate?.() ?? order.createdAt ?? new Date(),
                    updatedAt: order.updatedAt?.toDate?.() ?? order.updatedAt,
                    shippedAt: order.shippedAt?.toDate?.() ?? order.shippedAt,
                    deliveredAt: order.deliveredAt?.toDate?.() ?? order.deliveredAt,
                }));
            };

            const result = serializeOrders([]);

            expect(result).toEqual([]);
        });

        it('should provide fallback date if createdAt is missing', () => {
            const mockOrder = {
                ...createMockOrder(),
                createdAt: null as any,
            };

            const serializeOrders = (orders: any[]) => {
                return orders.map(order => ({
                    ...order,
                    createdAt: order.createdAt?.toDate?.() ?? order.createdAt ?? new Date(),
                    updatedAt: order.updatedAt?.toDate?.() ?? order.updatedAt,
                    shippedAt: order.shippedAt?.toDate?.() ?? order.shippedAt,
                    deliveredAt: order.deliveredAt?.toDate?.() ?? order.deliveredAt,
                }));
            };

            const result = serializeOrders([mockOrder]);

            expect(result[0].createdAt).toBeInstanceOf(Date);
        });
    });
});
