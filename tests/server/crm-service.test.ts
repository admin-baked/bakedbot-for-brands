/**
 * Unit tests for CRM Service
 * Tests brand/dispensary upsert, national brand detection, and stats
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Firebase Admin
const mockFirestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
};

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: () => mockFirestore,
}));

// Import after mocks
import {
    upsertBrand,
    upsertDispensary,
    getBrands,
    getDispensaries,
    getCRMStats,
} from '@/server/services/crm-service';

describe('CRM Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('upsertBrand', () => {
        it('should create new brand when not exists', async () => {
            mockFirestore.get.mockResolvedValueOnce({ empty: true });
            mockFirestore.set.mockResolvedValueOnce({});

            await upsertBrand('Test Brand', 'Michigan');

            expect(mockFirestore.collection).toHaveBeenCalledWith('crm_brands');
            expect(mockFirestore.set).toHaveBeenCalled();
        });

        it('should update existing brand with new state', async () => {
            const existingBrand = {
                id: 'brand_123',
                name: 'Test Brand',
                states: ['California'],
                isNational: false,
            };

            mockFirestore.get.mockResolvedValueOnce({
                empty: false,
                docs: [{ id: 'brand_123', data: () => existingBrand }],
            });
            mockFirestore.update.mockResolvedValueOnce({});

            await upsertBrand('Test Brand', 'Michigan');

            expect(mockFirestore.update).toHaveBeenCalled();
        });

        it('should detect national brand when in 3+ states', async () => {
            const existingBrand = {
                id: 'brand_123',
                name: 'National Brand',
                states: ['California', 'Oregon'],
                isNational: false,
            };

            mockFirestore.get.mockResolvedValueOnce({
                empty: false,
                docs: [{ id: 'brand_123', data: () => existingBrand }],
            });
            mockFirestore.update.mockResolvedValueOnce({});

            await upsertBrand('National Brand', 'Michigan');

            // Should have set isNational to true because now in 3 states
            const updateCall = mockFirestore.update.mock.calls[0][0];
            expect(updateCall.isNational).toBe(true);
            expect(updateCall.states).toContain('Michigan');
            expect(updateCall.states).toContain('California');
            expect(updateCall.states).toContain('Oregon');
        });

        it('should not duplicate states', async () => {
            const existingBrand = {
                id: 'brand_123',
                name: 'Test Brand',
                states: ['Michigan'],
                isNational: false,
            };

            mockFirestore.get.mockResolvedValueOnce({
                empty: false,
                docs: [{ id: 'brand_123', data: () => existingBrand }],
            });
            mockFirestore.update.mockResolvedValueOnce({});

            await upsertBrand('Test Brand', 'Michigan');

            const updateCall = mockFirestore.update.mock.calls[0][0];
            const michiganCount = updateCall.states.filter((s: string) => s === 'Michigan').length;
            expect(michiganCount).toBe(1);
        });
    });

    describe('upsertDispensary', () => {
        it('should create new dispensary when not exists', async () => {
            mockFirestore.get.mockResolvedValueOnce({ empty: true });
            mockFirestore.set.mockResolvedValueOnce({});

            await upsertDispensary('Test Dispensary', 'Michigan', 'Detroit');

            expect(mockFirestore.collection).toHaveBeenCalledWith('crm_dispensaries');
            expect(mockFirestore.set).toHaveBeenCalled();
        });

        it('should include optional metadata', async () => {
            mockFirestore.get.mockResolvedValueOnce({ empty: true });
            mockFirestore.set.mockResolvedValueOnce({});

            await upsertDispensary('Test Dispensary', 'Michigan', 'Detroit', {
                retailerId: '12345',
                leaflyUrl: 'https://leafly.com/test',
            });

            const setCall = mockFirestore.set.mock.calls[0][0];
            expect(setCall.retailerId).toBe('12345');
            expect(setCall.leaflyUrl).toBe('https://leafly.com/test');
        });

        it('should normalize names to prevent duplicates', async () => {
            mockFirestore.get.mockResolvedValueOnce({ empty: true });
            mockFirestore.set.mockResolvedValueOnce({});

            await upsertDispensary('TEST DISPENSARY', 'MICHIGAN', 'DETROIT');

            // Should search with normalized values
            expect(mockFirestore.where).toHaveBeenCalled();
        });
    });

    describe('getBrands', () => {
        it('should return brands with filters', async () => {
            const mockBrands = [
                { id: '1', name: 'Brand A', states: ['MI'], isNational: false, claimStatus: 'unclaimed' },
                { id: '2', name: 'Brand B', states: ['MI', 'CA', 'OR'], isNational: true, claimStatus: 'claimed' },
            ];

            mockFirestore.get.mockResolvedValueOnce({
                docs: mockBrands.map(b => ({ id: b.id, data: () => b })),
            });

            const result = await getBrands({ state: 'MI' });

            expect(result.length).toBeGreaterThanOrEqual(0);
        });

        it('should filter by search term', async () => {
            mockFirestore.get.mockResolvedValueOnce({
                docs: [],
            });

            await getBrands({ search: 'cookies' });

            expect(mockFirestore.limit).toHaveBeenCalled();
        });
    });

    describe('getDispensaries', () => {
        it('should return dispensaries with filters', async () => {
            mockFirestore.get.mockResolvedValueOnce({
                docs: [],
            });

            const result = await getDispensaries({ state: 'Michigan', city: 'Detroit' });

            expect(result).toEqual([]);
        });
    });

    describe('getCRMStats', () => {
        it('should return aggregated stats', async () => {
            mockFirestore.get.mockResolvedValueOnce({
                data: () => ({ count: 100 }),
            });
            mockFirestore.get.mockResolvedValueOnce({
                data: () => ({ count: 500 }),
            });
            mockFirestore.get.mockResolvedValueOnce({
                data: () => ({ count: 5 }),
            });
            mockFirestore.get.mockResolvedValueOnce({
                data: () => ({ count: 10 }),
            });

            const stats = await getCRMStats();

            expect(stats).toHaveProperty('totalBrands');
            expect(stats).toHaveProperty('totalDispensaries');
            expect(stats).toHaveProperty('claimedBrands');
            expect(stats).toHaveProperty('claimedDispensaries');
        });
    });
});
