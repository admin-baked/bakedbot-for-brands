/**
 * Unit tests for Day Day SEO Review Server Action
 * Tests the SEO scoring logic and review functions
 */

import { calculateSEOScore, reviewSEOPage } from '@/server/actions/dayday-seo-review';

// Mock the Firebase client
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        db: {
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    update: jest.fn()
                }))
            }))
        }
    }))
}));

describe('Day Day SEO Review', () => {
    describe('calculateSEOScore', () => {
        it('should return max score (10) for perfect SEO', () => {
            const criteria = {
                hasUniqueTitle: true,
                hasMetaDescription: true,
                hasH1Tag: true,
                hasStructuredData: true,
                hasInternalLinks: true,
                isCompliant: true,
                hasLocalKeywords: true,
                pageLoadFast: true
            };

            const score = calculateSEOScore(criteria);
            expect(score).toBe(10);
        });

        it('should return low score for missing essential elements', () => {
            const criteria = {
                hasUniqueTitle: false,
                hasMetaDescription: false,
                hasH1Tag: false,
                hasStructuredData: false,
                hasInternalLinks: false,
                isCompliant: true,
                hasLocalKeywords: false,
                pageLoadFast: false
            };

            const score = calculateSEOScore(criteria);
            expect(score).toBeLessThanOrEqual(3);
        });

        it('should give significant weight to compliance', () => {
            const compliantCriteria = {
                hasUniqueTitle: false,
                hasMetaDescription: false,
                hasH1Tag: false,
                hasStructuredData: false,
                hasInternalLinks: false,
                isCompliant: true,
                hasLocalKeywords: false,
                pageLoadFast: false
            };

            const nonCompliantCriteria = {
                ...compliantCriteria,
                isCompliant: false
            };

            const compliantScore = calculateSEOScore(compliantCriteria);
            const nonCompliantScore = calculateSEOScore(nonCompliantCriteria);

            expect(compliantScore - nonCompliantScore).toBe(2);
        });

        it('should weight structured data appropriately', () => {
            const withStructuredData = {
                hasUniqueTitle: true,
                hasMetaDescription: true,
                hasH1Tag: true,
                hasStructuredData: true,
                hasInternalLinks: true,
                isCompliant: true,
                hasLocalKeywords: true,
                pageLoadFast: true
            };

            const withoutStructuredData = {
                ...withStructuredData,
                hasStructuredData: false
            };

            const withScore = calculateSEOScore(withStructuredData);
            const withoutScore = calculateSEOScore(withoutStructuredData);

            expect(withScore - withoutScore).toBe(2); // 1.5 rounded
        });
    });

    describe('reviewSEOPage', () => {
        it('should return a valid review result for zip page', async () => {
            const result = await reviewSEOPage(
                'zip_60601',
                'zip',
                'http://localhost:3000/zip/60601-dispensary'
            );

            expect(result).toHaveProperty('pageId', 'zip_60601');
            expect(result).toHaveProperty('pageType', 'zip');
            expect(result).toHaveProperty('seoScore');
            expect(result.seoScore).toBeGreaterThanOrEqual(1);
            expect(result.seoScore).toBeLessThanOrEqual(10);
            expect(result).toHaveProperty('complianceStatus');
            expect(['passed', 'failed', 'pending']).toContain(result.complianceStatus);
        });

        it('should return a valid review result for city page', async () => {
            const result = await reviewSEOPage(
                'city_chicago',
                'city',
                'http://localhost:3000/city/chicago-cannabis-guide'
            );

            expect(result).toHaveProperty('pageId', 'city_chicago');
            expect(result).toHaveProperty('pageType', 'city');
            expect(result.screenshotUrl).toContain('city');
        });

        it('should provide meaningful review notes based on score', async () => {
            const result = await reviewSEOPage(
                'zip_60601',
                'zip',
                'http://localhost:3000/zip/60601-dispensary'
            );

            expect(result.reviewNotes).toBeTruthy();
            expect(result.reviewNotes.length).toBeGreaterThan(10);
        });
    });
});
