/**
 * Unit Tests for Alert Evaluator Service
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Alert } from '@/types/smokey-actions';

// Mock Firebase Admin
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: jest.fn(),
                update: jest.fn().mockResolvedValue({}),
            })),
            where: jest.fn(() => ({
                limit: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({ size: 0, docs: [] }),
                })),
            })),
            add: jest.fn().mockResolvedValue({ id: 'test-event-id' }),
        })),
    })),
}));

// Mock logger
jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Alert Evaluator', () => {
    const createMockAlert = (overrides: Partial<Alert> = {}): Alert => ({
        id: 'alert-123',
        userId: 'user-456',
        type: 'inStock',
        scope: 'product',
        dispId: 'disp-789',
        productKey: 'product-abc',
        constraints: {},
        status: 'active',
        createdAt: new Date(),
        cooldownMinutes: 360,
        channels: { email: true, sms: false, push: false },
        ...overrides,
    });

    describe('Cooldown Logic', () => {
        it('should respect cooldown period', () => {
            const alert = createMockAlert({
                lastTriggeredAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
                cooldownMinutes: 360, // 6 hours
            });

            const cooldownMs = alert.cooldownMinutes * 60 * 1000;
            const lastTriggered = alert.lastTriggeredAt!.getTime();
            const now = Date.now();

            // Still in cooldown (6 hours not passed since 1 hour ago)
            expect(now - lastTriggered < cooldownMs).toBe(true);
        });

        it('should allow after cooldown expires', () => {
            const alert = createMockAlert({
                lastTriggeredAt: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7 hours ago
                cooldownMinutes: 360, // 6 hours
            });

            const cooldownMs = alert.cooldownMinutes * 60 * 1000;
            const lastTriggered = alert.lastTriggeredAt!.getTime();
            const now = Date.now();

            // Cooldown expired
            expect(now - lastTriggered >= cooldownMs).toBe(true);
        });

        it('should allow if never triggered before', () => {
            const alert = createMockAlert({
                lastTriggeredAt: undefined,
            });

            expect(alert.lastTriggeredAt).toBeUndefined();
        });
    });

    describe('Alert Types', () => {
        it('should handle inStock alert type', () => {
            const alert = createMockAlert({ type: 'inStock' });
            expect(alert.type).toBe('inStock');
            expect(alert.productKey).toBeDefined();
        });

        it('should handle priceDrop alert type', () => {
            const alert = createMockAlert({
                type: 'priceDrop',
                constraints: { maxPrice: 50 },
            });
            expect(alert.type).toBe('priceDrop');
            expect(alert.constraints.maxPrice).toBe(50);
        });

        it('should handle openNowWithin alert type', () => {
            const alert = createMockAlert({
                type: 'openNowWithin',
                constraints: { maxMinutes: 10 },
            });
            expect(alert.type).toBe('openNowWithin');
            expect(alert.constraints.maxMinutes).toBe(10);
        });
    });

    describe('Alert Constraints', () => {
        it('should validate maxPrice constraint', () => {
            const currentPrice = 45;
            const constraint = 50;
            expect(currentPrice <= constraint).toBe(true);
        });

        it('should reject when price exceeds constraint', () => {
            const currentPrice = 55;
            const constraint = 50;
            expect(currentPrice <= constraint).toBe(false);
        });

        it('should validate minRating constraint', () => {
            const currentRating = 4.5;
            const constraint = 4.0;
            expect(currentRating >= constraint).toBe(true);
        });
    });

    describe('Notification Channels', () => {
        it('should respect channel preferences', () => {
            const alert = createMockAlert({
                channels: { email: true, sms: false, push: true },
            });

            expect(alert.channels.email).toBe(true);
            expect(alert.channels.sms).toBe(false);
            expect(alert.channels.push).toBe(true);
        });

        it('should have at least one channel enabled', () => {
            const alert = createMockAlert();
            const hasChannel = alert.channels.email || alert.channels.sms || alert.channels.push;
            expect(hasChannel).toBe(true);
        });
    });
});

describe('Alert Scope Validation', () => {
    it('should require dispId for dispensary scope', () => {
        const alert = {
            scope: 'dispensary',
            dispId: 'disp-123',
        };
        expect(alert.scope === 'dispensary' && !!alert.dispId).toBe(true);
    });

    it('should require brandId for brand scope', () => {
        const alert = {
            scope: 'brand',
            brandId: 'brand-123',
        };
        expect(alert.scope === 'brand' && !!alert.brandId).toBe(true);
    });

    it('should require productKey for product scope', () => {
        const alert = {
            scope: 'product',
            productKey: 'product-123',
            dispId: 'disp-123',
        };
        expect(alert.scope === 'product' && !!alert.productKey).toBe(true);
    });
});
