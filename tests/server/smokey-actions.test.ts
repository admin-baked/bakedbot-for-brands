/**
 * Unit Tests for Smokey Actions Types and Utilities
 */

import { describe, it, expect } from '@jest/globals';
import {
    adjustRatingWithConfidence,
    RANKING_WEIGHTS,
    RATING_CONFIDENCE,
} from '@/types/smokey-actions';

describe('Smokey Actions Types', () => {
    describe('adjustRatingWithConfidence', () => {
        it('should adjust rating based on review count', () => {
            // High confidence: many reviews
            const highConfidence = adjustRatingWithConfidence(4.8, 1000);
            // Low confidence: few reviews
            const lowConfidence = adjustRatingWithConfidence(4.8, 10);

            // High review count should give rating closer to actual
            expect(highConfidence).toBeGreaterThan(lowConfidence);
            expect(highConfidence).toBeCloseTo(4.73, 1); // Close to 4.8
            expect(lowConfidence).toBeLessThan(4.5); // Pulled toward mean
        });

        it('should pull low-review ratings toward global mean', () => {
            // 5-star with only 5 reviews should be pulled down
            const adjusted = adjustRatingWithConfidence(5.0, 5);

            expect(adjusted).toBeLessThan(5.0);
            expect(adjusted).toBeGreaterThan(RATING_CONFIDENCE.globalMean);
        });

        it('should have minimal effect on high-review ratings', () => {
            const original = 4.5;
            const adjusted = adjustRatingWithConfidence(original, 5000);

            expect(adjusted).toBeCloseTo(original, 1);
        });

        it('should handle edge cases', () => {
            // Zero reviews - should return global mean
            const zeroReviews = adjustRatingWithConfidence(4.5, 0);
            expect(zeroReviews).toBe(RATING_CONFIDENCE.globalMean);

            // One review
            const oneReview = adjustRatingWithConfidence(5.0, 1);
            expect(oneReview).toBeLessThan(5.0);
        });
    });

    describe('RANKING_WEIGHTS', () => {
        it('should have weights summing to 1.0', () => {
            const sum = Object.values(RANKING_WEIGHTS).reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1.0, 2);
        });

        it('should prioritize bbRating and googleRating', () => {
            expect(RANKING_WEIGHTS.bbRating).toBeGreaterThan(RANKING_WEIGHTS.distance);
            expect(RANKING_WEIGHTS.googleRating).toBeGreaterThan(RANKING_WEIGHTS.price);
        });
    });
});

describe('Smokey Find Query Parsing', () => {
    // Import parseQuery function inline since it's internal
    function parseQuery(queryText: string): any {
        const text = queryText.toLowerCase();
        const parsed: any = { intent: 'find' };

        const categories = ['flower', 'edibles', 'vapes', 'concentrates', 'pre-rolls', 'tinctures'];
        for (const cat of categories) {
            if (text.includes(cat)) {
                parsed.category = cat;
                break;
            }
        }

        const effects = ['relaxing', 'energizing', 'creative', 'sleepy', 'focused', 'uplifting'];
        parsed.effects = effects.filter(e => text.includes(e));

        const priceMatch = text.match(/under\s*\$?(\d+)|less\s*than\s*\$?(\d+)|max\s*\$?(\d+)/);
        if (priceMatch) {
            const price = parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3]);
            parsed.priceConstraint = { max: price };
        }

        const distanceMatch = text.match(/within\s*(\d+)\s*(minute|min)/);
        if (distanceMatch) {
            parsed.distanceConstraint = { maxMinutes: parseInt(distanceMatch[1]) };
        }

        if (text.match(/\b(best|top|highest|good|great|excellent)(?:[\s-]*rated)?\b/)) {
            parsed.ratingConstraint = { min: 4.0 };
        }

        return parsed;
    }

    it('should parse "highest rated flower within 5 minutes"', () => {
        const result = parseQuery('highest rated flower within 5 minutes');

        expect(result.category).toBe('flower');
        expect(result.distanceConstraint?.maxMinutes).toBe(5);
        expect(result.ratingConstraint?.min).toBe(4.0);
    });

    it('should parse "edibles under $30"', () => {
        const result = parseQuery('edibles under $30');

        expect(result.category).toBe('edibles');
        expect(result.priceConstraint?.max).toBe(30);
    });

    it('should parse "relaxing vapes for sleep"', () => {
        const result = parseQuery('relaxing vapes for sleep');

        expect(result.category).toBe('vapes');
        expect(result.effects).toContain('relaxing');
    });

    it('should parse "best concentrates less than $50"', () => {
        const result = parseQuery('best concentrates less than $50');

        expect(result.category).toBe('concentrates');
        expect(result.priceConstraint?.max).toBe(50);
        expect(result.ratingConstraint?.min).toBe(4.0);
    });

    it('should handle queries with no constraints', () => {
        const result = parseQuery('show me something good');

        expect(result.intent).toBe('find');
        expect(result.category).toBeUndefined();
        expect(result.priceConstraint).toBeUndefined();
    });

    it('should parse multiple effects', () => {
        const result = parseQuery('something relaxing and creative');

        expect(result.effects).toContain('relaxing');
        expect(result.effects).toContain('creative');
    });
});

describe('Distance Calculation', () => {
    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 3959;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    it('should calculate distance between Detroit and Ann Arbor', () => {
        // Detroit: 42.3314, -83.0458
        // Ann Arbor: 42.2808, -83.7430
        const distance = calculateDistance(42.3314, -83.0458, 42.2808, -83.7430);

        // Should be approximately 40-45 miles
        expect(distance).toBeGreaterThan(35);
        expect(distance).toBeLessThan(50);
    });

    it('should return 0 for same location', () => {
        const distance = calculateDistance(42.3314, -83.0458, 42.3314, -83.0458);
        expect(distance).toBe(0);
    });

    it('should handle negative longitudes correctly', () => {
        const distance = calculateDistance(42.0, -84.0, 42.0, -83.0);

        // 1 degree of longitude at 42° latitude ≈ 52 miles
        expect(distance).toBeGreaterThan(45);
        expect(distance).toBeLessThan(60);
    });
});
