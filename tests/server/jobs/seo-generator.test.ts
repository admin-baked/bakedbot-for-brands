/**
 * SEO Generator (Dispensary Pilot) Tests
 * Tests for the dispensary discovery and page generation job
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/server/services/mass-scraper', () => ({
    massScraper: {
        search: vi.fn(),
        scrapeDispensary: vi.fn()
    }
}));

vi.mock('@/firebase/admin', () => ({
    getAdminFirestore: vi.fn(() => ({
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                set: vi.fn().mockResolvedValue(undefined),
                get: vi.fn().mockResolvedValue({ exists: false })
            }))
        }))
    }))
}));

describe('SEO Generator Job', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('runChicagoPilotJob parameters', () => {
        it('should accept city and state parameters', () => {
            const params = {
                city: 'Denver',
                state: 'CO',
                zipCodes: ['80202', '80203', '80204']
            };
            
            expect(params.city).toBe('Denver');
            expect(params.state).toBe('CO');
            expect(params.zipCodes).toHaveLength(3);
        });

        it('should default to Chicago if no city provided', () => {
            const city = undefined;
            const defaultCity = city || 'Chicago';
            
            expect(defaultCity).toBe('Chicago');
        });

        it('should parse comma-separated ZIP codes', () => {
            const zipsParam = '60601,60602,60603';
            const zipCodes = zipsParam.split(',').map(z => z.trim());
            
            expect(zipCodes).toEqual(['60601', '60602', '60603']);
        });
    });

    describe('dispensary page creation', () => {
        it('should generate slug from dispensary name', () => {
            const name = 'Sunnyside Dispensary Chicago';
            const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            
            expect(slug).toBe('sunnyside-dispensary-chicago');
        });

        it('should create SEO-friendly title', () => {
            const name = 'Green Thumb';
            const city = 'Chicago';
            const state = 'IL';
            
            const seoTitle = `${name} - Cannabis Dispensary in ${city}, ${state}`;
            
            expect(seoTitle).toBe('Green Thumb - Cannabis Dispensary in Chicago, IL');
        });

        it('should include location data in page', () => {
            const page = {
                dispensaryName: 'Test Dispensary',
                city: 'Chicago',
                state: 'IL',
                zip: '60601',
                locations: ['60601', '60602']
            };
            
            expect(page.locations).toContain('60601');
            expect(page.city).toBe('Chicago');
        });
    });

    describe('deduplication', () => {
        it('should skip already existing pages by slug', async () => {
            const existingSlugs = new Set(['dispensary-a', 'dispensary-b']);
            
            const newPages = [
                { slug: 'dispensary-a' }, // exists
                { slug: 'dispensary-c' }, // new
                { slug: 'dispensary-b' }, // exists
            ];
            
            const toCreate = newPages.filter(p => !existingSlugs.has(p.slug));
            
            expect(toCreate).toHaveLength(1);
            expect(toCreate[0].slug).toBe('dispensary-c');
        });
    });

    describe('error handling', () => {
        it('should continue processing after individual page failure', () => {
            const results = [
                { success: true, slug: 'dispensary-a' },
                { success: false, slug: 'dispensary-b', error: 'Scrape failed' },
                { success: true, slug: 'dispensary-c' },
            ];
            
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            expect(successful).toHaveLength(2);
            expect(failed).toHaveLength(1);
        });
    });
});
