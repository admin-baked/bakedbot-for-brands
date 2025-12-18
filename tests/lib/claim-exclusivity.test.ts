/**
 * Unit tests for Claim Exclusivity Logic
 * Tests the one-owner-per-ZIP rule and claim management functions
 */

import {
    isPageClaimable,
    canEntityClaimMore,
    getPageOwner
} from '@/lib/claim-exclusivity';
import { COVERAGE_PACK_TIERS } from '@/lib/coverage-packs';

// Mock the Firebase client
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        firestore: {
            collection: jest.fn(() => ({
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                get: jest.fn(() => Promise.resolve({
                    empty: true,
                    docs: []
                })),
                doc: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({
                        exists: false,
                        data: () => null
                    })),
                    set: jest.fn(),
                    update: jest.fn()
                }))
            }))
        }
    }))
}));

describe('Claim Exclusivity Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('COVERAGE_PACK_TIERS', () => {
        it('should have four tiers defined', () => {
            expect(COVERAGE_PACK_TIERS).toHaveLength(4);
        });

        it('should have Starter at $99/mo with 25 ZIP limit', () => {
            const starter = COVERAGE_PACK_TIERS.find(t => t.id === 'starter');
            expect(starter).toBeDefined();
            expect(starter?.pricePerMonth).toBe(99);
            expect(starter?.zipLimit).toBe(25);
        });

        it('should have Growth at $249/mo with 100 ZIP limit', () => {
            const growth = COVERAGE_PACK_TIERS.find(t => t.id === 'growth');
            expect(growth).toBeDefined();
            expect(growth?.pricePerMonth).toBe(249);
            expect(growth?.zipLimit).toBe(100);
        });

        it('should have Scale at $699/mo with 300 ZIP limit', () => {
            const scale = COVERAGE_PACK_TIERS.find(t => t.id === 'scale');
            expect(scale).toBeDefined();
            expect(scale?.pricePerMonth).toBe(699);
            expect(scale?.zipLimit).toBe(300);
        });

        it('should have Enterprise with unlimited ZIP claims', () => {
            const enterprise = COVERAGE_PACK_TIERS.find(t => t.id === 'enterprise');
            expect(enterprise).toBeDefined();
            expect(enterprise?.zipLimit).toBe(-1); // Unlimited
        });

        it('should include usage limits for each tier', () => {
            COVERAGE_PACK_TIERS.forEach(tier => {
                expect(tier).toHaveProperty('pageviewsPerMonth');
                expect(tier).toHaveProperty('smokeySessionsPerMonth');
                expect(tier).toHaveProperty('menuSyncsPerDay');
                expect(tier).toHaveProperty('deeboChecksPerMonth');
            });
        });

        it('should include exclusive features array', () => {
            COVERAGE_PACK_TIERS.forEach(tier => {
                expect(tier).toHaveProperty('exclusiveFeatures');
                expect(Array.isArray(tier.exclusiveFeatures)).toBe(true);
            });
        });
    });

    describe('isPageClaimable', () => {
        it('should return claimable when no existing claims', async () => {
            const result = await isPageClaimable('zip_60601', 'zip', 'brand');
            expect(result.claimable).toBe(true);
            expect(result.currentOwner).toBeUndefined();
        });
    });

    describe('Model B Pricing Validation', () => {
        it('should have correct Starter features', () => {
            const starter = COVERAGE_PACK_TIERS.find(t => t.id === 'starter');
            expect(starter?.pageviewsPerMonth).toBe(1000);
            expect(starter?.smokeySessionsPerMonth).toBe(500);
            expect(starter?.menuSyncsPerDay).toBe(2);
            expect(starter?.deeboChecksPerMonth).toBe(10000);
        });

        it('should have correct Growth features', () => {
            const growth = COVERAGE_PACK_TIERS.find(t => t.id === 'growth');
            expect(growth?.pageviewsPerMonth).toBe(10000);
            expect(growth?.smokeySessionsPerMonth).toBe(1500);
            expect(growth?.menuSyncsPerDay).toBe(6);
            expect(growth?.deeboChecksPerMonth).toBe(25000);
        });

        it('should have correct Scale features', () => {
            const scale = COVERAGE_PACK_TIERS.find(t => t.id === 'scale');
            expect(scale?.pageviewsPerMonth).toBe(50000);
            expect(scale?.smokeySessionsPerMonth).toBe(7500);
            expect(scale?.menuSyncsPerDay).toBe(24); // Hourly
            expect(scale?.deeboChecksPerMonth).toBe(100000);
        });

        it('should have Enterprise with unlimited everything', () => {
            const enterprise = COVERAGE_PACK_TIERS.find(t => t.id === 'enterprise');
            expect(enterprise?.pageviewsPerMonth).toBe(-1);
            expect(enterprise?.smokeySessionsPerMonth).toBe(-1);
            expect(enterprise?.menuSyncsPerDay).toBe(-1);
            expect(enterprise?.deeboChecksPerMonth).toBe(-1);
        });
    });
});
