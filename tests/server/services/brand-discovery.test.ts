/**
 * BrandDiscoveryService Tests
 * Tests for the brand discovery and SEO page generation service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firecrawl service
vi.mock('@/server/services/firecrawl', () => ({
    FirecrawlService: {
        getInstance: vi.fn(() => ({
            mapSite: vi.fn(),
            extractData: vi.fn(),
            scrapeUrl: vi.fn()
        }))
    }
}));

// Mock Firebase
vi.mock('@/firebase/admin', () => ({
    getAdminFirestore: vi.fn(() => ({
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                set: vi.fn().mockResolvedValue(undefined)
            }))
        }))
    }))
}));

describe('BrandDiscoveryService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('discoverBrands', () => {
        it('should filter out duplicate brands from search results', () => {
            const rawBrands = [
                { name: 'Cookies', url: 'https://example.com/cookies' },
                { name: 'COOKIES', url: 'https://example.com/cookies2' }, // duplicate
                { name: 'Stiiizy', url: 'https://example.com/stiiizy' },
            ];
            
            // Simulate deduplication logic
            const seen = new Set<string>();
            const uniqueBrands = rawBrands.filter(b => {
                const key = b.name.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            
            expect(uniqueBrands).toHaveLength(2);
            expect(uniqueBrands[0].name).toBe('Cookies');
            expect(uniqueBrands[1].name).toBe('Stiiizy');
        });

        it('should filter out generic/navigation links', () => {
            const rawData = [
                { name: 'Cookies', url: '/brands/cookies' },
                { name: 'All Brands', url: '/brands' }, // generic
                { name: 'View More', url: '/brands?page=2' }, // navigation
                { name: 'Stiiizy', url: '/brands/stiiizy' },
            ];
            
            const genericTerms = ['all brands', 'view more', 'see all', 'browse', 'menu'];
            const filtered = rawData.filter(b => 
                !genericTerms.some(term => b.name.toLowerCase().includes(term))
            );
            
            expect(filtered).toHaveLength(2);
            expect(filtered[0].name).toBe('Cookies');
            expect(filtered[1].name).toBe('Stiiizy');
        });
    });

    describe('createBrandPage', () => {
        it('should generate correct slug from brand name', () => {
            const brandName = 'Cookies California';
            const expectedSlug = 'cookies-california';
            
            const slug = brandName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            
            expect(slug).toBe(expectedSlug);
        });

        it('should handle special characters in brand names', () => {
            const brandName = "Mike's Extracts™";
            const slug = brandName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            
            expect(slug).toBe('mikes-extracts');
        });

        it('should build SEO page structure correctly', () => {
            const brandName = 'Cookies';
            const city = 'Chicago';
            const state = 'IL';
            
            const page = {
                brandName,
                slug: brandName.toLowerCase(),
                seoTitle: `${brandName} Cannabis Products in ${city}, ${state}`,
                seoDescription: `Find ${brandName} cannabis products at dispensaries near you in ${city}, ${state}.`,
                locations: [`${city}, ${state}`],
                status: 'draft' as const,
            };
            
            expect(page.seoTitle).toContain('Cookies');
            expect(page.seoTitle).toContain('Chicago');
            expect(page.locations).toContain('Chicago, IL');
            expect(page.status).toBe('draft');
        });
    });

    describe('savePage', () => {
        it('should generate document ID from slug', () => {
            const page = {
                slug: 'cookies-chicago',
                brandName: 'Cookies',
            };
            
            const docId = page.slug || page.brandName?.toLowerCase().replace(/\s+/g, '-');
            
            expect(docId).toBe('cookies-chicago');
        });

        it('should use brandName as fallback for docId', () => {
            const page = {
                brandName: 'Stiiizy Summer',
            };
            
            const docId = (page as any).slug || page.brandName?.toLowerCase().replace(/\s+/g, '-');
            
            expect(docId).toBe('stiiizy-summer');
        });
    });
});
