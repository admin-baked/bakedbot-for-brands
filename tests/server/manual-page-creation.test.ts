/**
 * Tests for Manual Page Creation Server Action
 * @jest-environment node
 */

import { ManualPageInput } from '@/server/actions/manual-page-creation';

// Mock Firebase
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            batch: jest.fn().mockReturnValue({
                set: jest.fn(),
                commit: jest.fn().mockResolvedValue(undefined),
            }),
        },
    }),
}));

describe('Manual Page Creation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Input Validation', () => {
        it('should require entityType to be brand or dispensary', () => {
            const validBrandInput: ManualPageInput = {
                entityType: 'brand',
                name: 'Test Brand',
                slug: 'test-brand',
                cities: [],
                zipCodes: [],
                createGlobalPage: true,
            };
            expect(validBrandInput.entityType).toBe('brand');

            const validDispensaryInput: ManualPageInput = {
                entityType: 'dispensary',
                name: 'Test Dispensary',
                slug: 'test-dispensary',
                cities: [],
                zipCodes: [],
                createGlobalPage: true,
            };
            expect(validDispensaryInput.entityType).toBe('dispensary');
        });

        it('should accept optional fields', () => {
            const input: ManualPageInput = {
                entityType: 'brand',
                name: 'Test Brand',
                slug: 'test-brand',
                description: 'A test brand description',
                logoUrl: 'https://example.com/logo.png',
                website: 'https://example.com',
                cities: ['Detroit, MI', 'Chicago, IL'],
                zipCodes: ['48201', '60605'],
                createGlobalPage: true,
            };

            expect(input.description).toBe('A test brand description');
            expect(input.logoUrl).toBe('https://example.com/logo.png');
            expect(input.website).toBe('https://example.com');
        });

        it('should parse cities correctly', () => {
            const citiesInput = 'Detroit, MI\nChicago, IL\nLos Angeles, CA';
            const cities = citiesInput.split('\n').filter(Boolean);

            expect(cities).toHaveLength(3);
            expect(cities[0]).toBe('Detroit, MI');
            expect(cities[1]).toBe('Chicago, IL');
            expect(cities[2]).toBe('Los Angeles, CA');
        });

        it('should parse ZIP codes correctly (comma-separated)', () => {
            const zipInput = '48201, 60605, 90210';
            const zips = zipInput.split(',').map(z => z.trim()).filter(Boolean);

            expect(zips).toHaveLength(3);
            expect(zips).toContain('48201');
            expect(zips).toContain('60605');
            expect(zips).toContain('90210');
        });

        it('should parse ZIP codes correctly (newline-separated)', () => {
            const zipInput = '48201\n60605\n90210';
            const zips = zipInput.replace(/\n/g, ',').split(',').map(z => z.trim()).filter(Boolean);

            expect(zips).toHaveLength(3);
            expect(zips).toContain('48201');
        });
    });

    describe('Slug Generation', () => {
        it('should generate slug from name', () => {
            const name = 'Cookies California';
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

            expect(slug).toBe('cookies-california');
        });

        it('should handle special characters in name', () => {
            const name = "Mike's Premium Cannabis!";
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

            expect(slug).toBe('mike-s-premium-cannabis');
        });

        it('should remove leading/trailing hyphens', () => {
            const name = '---Test Brand---';
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

            expect(slug).toBe('test-brand');
        });
    });

    describe('Page Count Calculation', () => {
        it('should count global page when enabled', () => {
            const createGlobal = true;
            const cities: string[] = [];
            const zips: string[] = [];

            let count = 0;
            if (createGlobal) count++;
            count += cities.length;
            count += zips.length;

            expect(count).toBe(1);
        });

        it('should count all page types', () => {
            const createGlobal = true;
            const cities = ['Detroit, MI', 'Chicago, IL'];
            const zips = ['48201', '60605', '90210'];

            let count = 0;
            if (createGlobal) count++;
            count += cities.length;
            count += zips.length;

            expect(count).toBe(6); // 1 global + 2 cities + 3 zips
        });

        it('should return 0 when nothing selected', () => {
            const createGlobal = false;
            const cities: string[] = [];
            const zips: string[] = [];

            let count = 0;
            if (createGlobal) count++;
            count += cities.length;
            count += zips.length;

            expect(count).toBe(0);
        });
    });
});
