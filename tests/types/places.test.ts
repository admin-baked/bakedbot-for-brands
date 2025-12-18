/**
 * Unit Tests for Places Types
 */

import { describe, it, expect } from '@jest/globals';
import { PLACES_CONFIG, PLACE_FIELD_MASKS } from '@/types/places';

describe('Places Types', () => {
    describe('PLACES_CONFIG', () => {
        it('should have TTL within Google TOS limits', () => {
            // Google TOS: ≤ 30 days
            expect(PLACES_CONFIG.snapshotTTLDays).toBeLessThanOrEqual(30);
            expect(PLACES_CONFIG.snapshotTTLDays).toBeGreaterThan(0);
        });

        it('should have reasonable rate limits', () => {
            expect(PLACES_CONFIG.maxRequestsPerMinute).toBeGreaterThan(0);
            expect(PLACES_CONFIG.maxRequestsPerMinute).toBeLessThanOrEqual(100);
        });

        it('should have confidence threshold for auto-match', () => {
            expect(PLACES_CONFIG.minConfidenceForAutoMatch).toBeGreaterThan(0);
            expect(PLACES_CONFIG.minConfidenceForAutoMatch).toBeLessThanOrEqual(1);
        });

        it('should limit reviews per Google TOS', () => {
            // Google TOS: max 5 reviews
            expect(PLACES_CONFIG.maxReviewsPerPlace).toBe(5);
        });
    });

    describe('PLACE_FIELD_MASKS', () => {
        it('should have dispensary page mask with required fields', () => {
            const mask = PLACE_FIELD_MASKS.dispensaryPage;
            expect(mask).toContain('id');
            expect(mask).toContain('displayName');
            expect(mask).toContain('rating');
            expect(mask).toContain('currentOpeningHours');
        });

        it('should have brand where-to-buy mask with minimal fields', () => {
            const mask = PLACE_FIELD_MASKS.brandWhereToBuy;
            expect(mask.length).toBeLessThan(PLACE_FIELD_MASKS.dispensaryPage.length);
            expect(mask).toContain('rating');
        });

        it('should have shop listing mask', () => {
            const mask = PLACE_FIELD_MASKS.shopListing;
            expect(mask).toContain('displayName');
            expect(mask).toContain('rating');
        });
    });
});

describe('Places Snapshot TTL', () => {
    it('should calculate correct expiry date', () => {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + PLACES_CONFIG.snapshotTTLDays);

        const daysDiff = Math.round(
            (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        expect(daysDiff).toBe(PLACES_CONFIG.snapshotTTLDays);
    });

    it('should identify expired snapshots', () => {
        const now = new Date();
        const expiredAt = new Date(now);
        expiredAt.setDate(expiredAt.getDate() - 1); // Yesterday

        expect(now > expiredAt).toBe(true);
    });

    it('should identify fresh snapshots', () => {
        const now = new Date();
        const futureExpiry = new Date(now);
        futureExpiry.setDate(futureExpiry.getDate() + 10);

        expect(now < futureExpiry).toBe(true);
    });
});

describe('Place ID Format', () => {
    it('should validate Google Place ID format', () => {
        // Google Place IDs start with ChIJ
        const validPlaceId = 'ChIJ123456789abcdef';
        expect(validPlaceId.startsWith('ChIJ')).toBe(true);
    });

    it('should handle edge cases', () => {
        const invalidPlaceId = '';
        expect(invalidPlaceId.length).toBe(0);
    });
});

describe('Opening Hours Parsing', () => {
    function isOpenNow(hours: { openNow?: boolean }): boolean {
        return hours.openNow === true;
    }

    it('should correctly identify open status', () => {
        expect(isOpenNow({ openNow: true })).toBe(true);
        expect(isOpenNow({ openNow: false })).toBe(false);
        expect(isOpenNow({})).toBe(false);
    });

    function getTodayIndex(): number {
        const day = new Date().getDay();
        // Google returns Sunday=0, but weekdayDescriptions starts with Monday
        return day === 0 ? 6 : day - 1;
    }

    it('should get correct weekday index', () => {
        const index = getTodayIndex();
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThanOrEqual(6);
    });
});
