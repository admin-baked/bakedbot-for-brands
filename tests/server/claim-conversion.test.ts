/**
 * Unit Tests for Claim Conversion Engine
 * 
 * Tests trigger detection for:
 * - High traffic unclaimed pages
 * - Multi-ZIP dispensaries
 * - Wide distribution brands
 */

import {
    detectHighTrafficOpportunities,
    detectMultiZipOpportunities,
    detectWideDistributionOpportunities,
    getAllClaimOpportunities,
    getFoundersAvailability
} from '@/lib/claim-conversion-engine';

// Mock Firestore
const mockGet = jest.fn();
const mockCollection: any = jest.fn(() => ({ doc: mockDoc, get: mockGet }));
const mockDoc: any = jest.fn(() => ({ collection: mockCollection, get: mockGet }));
const mockFirestore = { collection: mockCollection };

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => Promise.resolve({ firestore: mockFirestore }))
}));

describe('Claim Conversion Engine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('detectHighTrafficOpportunities', () => {
        it('should detect unclaimed dispensaries with high traffic', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'disp_1', data: () => ({ name: 'Popular Dispensary', weeklyClicks: 100 }) },
                    { id: 'disp_2', data: () => ({ name: 'Low Traffic', weeklyClicks: 10 }) },
                    { id: 'disp_3', data: () => ({ name: 'Claimed Dispensary', weeklyClicks: 200, claimedBy: 'user123' }) }
                ]
            });

            const opportunities = await detectHighTrafficOpportunities({ minWeeklyClicksForTrigger: 50 });

            expect(opportunities).toHaveLength(1);
            expect(opportunities[0].entityName).toBe('Popular Dispensary');
            expect(opportunities[0].triggerType).toBe('high_traffic');
        });

        it('should suggest email for very high traffic', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'viral', data: () => ({ name: 'Viral Dispensary', weeklyClicks: 500 }) }
                ]
            });

            const opportunities = await detectHighTrafficOpportunities();

            expect(opportunities[0].suggestedAction).toBe('email');
        });
    });

    describe('detectMultiZipOpportunities', () => {
        it('should detect dispensaries appearing in multiple ZIPs', async () => {
            // First call: ZIP pages
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'zip_1', data: () => ({ dispensaries: [{ id: 'disp_popular', name: 'Popular Place' }] }) },
                    { id: 'zip_2', data: () => ({ dispensaries: [{ id: 'disp_popular', name: 'Popular Place' }] }) },
                    { id: 'zip_3', data: () => ({ dispensaries: [{ id: 'disp_popular', name: 'Popular Place' }] }) },
                    { id: 'zip_4', data: () => ({ dispensaries: [{ id: 'disp_local', name: 'Local Spot' }] }) }
                ]
            });

            // Second call: Dispensary pages (for claimed status)
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'disp_popular', data: () => ({}) },
                    { id: 'disp_local', data: () => ({}) }
                ]
            });

            const opportunities = await detectMultiZipOpportunities({ minZipPagesForTrigger: 3 });

            expect(opportunities).toHaveLength(1);
            expect(opportunities[0].entityId).toBe('disp_popular');
            expect(opportunities[0].metrics.zipCount).toBe(3);
        });

        it('should exclude claimed dispensaries', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'zip_1', data: () => ({ dispensaries: [{ id: 'claimed_disp', name: 'Claimed' }] }) },
                    { id: 'zip_2', data: () => ({ dispensaries: [{ id: 'claimed_disp', name: 'Claimed' }] }) },
                    { id: 'zip_3', data: () => ({ dispensaries: [{ id: 'claimed_disp', name: 'Claimed' }] }) }
                ]
            });

            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'claimed_disp', data: () => ({ claimedBy: 'owner123' }) }
                ]
            });

            const opportunities = await detectMultiZipOpportunities({ minZipPagesForTrigger: 3 });

            expect(opportunities).toHaveLength(0);
        });
    });

    describe('detectWideDistributionOpportunities', () => {
        it('should detect brands with wide distribution', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'big_brand',
                    data: () => ({
                        name: 'Big Brand',
                        cities: ['Detroit, MI', 'Chicago, IL', 'Denver, CO'],
                        retailerCount: 50
                    })
                }]
            });

            const opportunities = await detectWideDistributionOpportunities({
                minRetailersForTrigger: 10,
                minStatesForTrigger: 2
            });

            expect(opportunities).toHaveLength(1);
            expect(opportunities[0].entityName).toBe('Big Brand');
            expect(opportunities[0].triggerType).toBe('wide_distribution');
            expect(opportunities[0].metrics.stateCount).toBe(3);
        });

        it('should suggest founders pitch for multi-state brands', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'multi_state',
                    data: () => ({
                        name: 'Multi State Brand',
                        cities: ['LA, CA', 'Portland, OR', 'Seattle, WA', 'Denver, CO'],
                        retailerCount: 100
                    })
                }]
            });

            const opportunities = await detectWideDistributionOpportunities();

            expect(opportunities[0].suggestedAction).toBe('founders_pitch');
        });

        it('should skip claimed brands', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'claimed_brand',
                    data: () => ({
                        name: 'Claimed Brand',
                        cities: ['LA, CA', 'SF, CA'],
                        retailerCount: 100,
                        claimedBy: 'brand_owner'
                    })
                }]
            });

            const opportunities = await detectWideDistributionOpportunities();

            expect(opportunities).toHaveLength(0);
        });
    });

    describe('getAllClaimOpportunities', () => {
        it('should aggregate and dedupe opportunities', async () => {
            // Mock for high traffic
            mockGet.mockResolvedValueOnce({
                docs: [{ id: 'disp_1', data: () => ({ name: 'Test', weeklyClicks: 100 }) }]
            });

            // Mock for multi-zip (ZIPs)
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'z1', data: () => ({ dispensaries: [{ id: 'disp_1', name: 'Test' }] }) },
                    { id: 'z2', data: () => ({ dispensaries: [{ id: 'disp_1', name: 'Test' }] }) },
                    { id: 'z3', data: () => ({ dispensaries: [{ id: 'disp_1', name: 'Test' }] }) }
                ]
            });

            // Mock for multi-zip (dispensary pages)
            mockGet.mockResolvedValueOnce({
                docs: [{ id: 'disp_1', data: () => ({}) }]
            });

            // Mock for wide distribution
            mockGet.mockResolvedValueOnce({
                docs: []
            });

            const opportunities = await getAllClaimOpportunities();

            // Should dedupe - only one entry for disp_1
            expect(opportunities.filter(o => o.entityId === 'disp_1')).toHaveLength(1);
        });
    });

    describe('getFoundersAvailability', () => {
        it('should calculate founders slot availability', () => {
            const result = getFoundersAvailability({
                foundersSlotsCap: 100,
                foundersClaimedCount: 25,
                minWeeklyClicksForTrigger: 50,
                minZipPagesForTrigger: 3,
                minRetailersForTrigger: 10,
                minStatesForTrigger: 2
            });

            expect(result.available).toBe(true);
            expect(result.remaining).toBe(75);
            expect(result.percentClaimed).toBe(25);
        });

        it('should indicate unavailable when sold out', () => {
            const result = getFoundersAvailability({
                foundersSlotsCap: 100,
                foundersClaimedCount: 100,
                minWeeklyClicksForTrigger: 50,
                minZipPagesForTrigger: 3,
                minRetailersForTrigger: 10,
                minStatesForTrigger: 2
            });

            expect(result.available).toBe(false);
            expect(result.remaining).toBe(0);
        });
    });
});
