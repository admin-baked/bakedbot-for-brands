/**
 * Unit Tests for Reviews Types and Moderation
 */

import { describe, it, expect } from '@jest/globals';
import { MODERATION_PATTERNS, REVIEW_TAGS } from '@/types/reviews';

describe('Reviews Types', () => {
    describe('MODERATION_PATTERNS', () => {
        describe('profanity', () => {
            it('should detect profanity', () => {
                expect(MODERATION_PATTERNS.profanity.test('this is f**k bad')).toBe(true);
                expect(MODERATION_PATTERNS.profanity.test('sh*t product')).toBe(true);
            });

            it('should not flag clean text', () => {
                // Reset regex state
                MODERATION_PATTERNS.profanity.lastIndex = 0;
                expect(MODERATION_PATTERNS.profanity.test('Great product, loved it!')).toBe(false);
            });
        });

        describe('medicalClaims', () => {
            it('should detect medical claims', () => {
                expect(MODERATION_PATTERNS.medicalClaims.test('This cured my pain')).toBe(true);
                expect(MODERATION_PATTERNS.medicalClaims.test('Works like medicine')).toBe(true);
                expect(MODERATION_PATTERNS.medicalClaims.test('Better than my prescription')).toBe(true);
            });

            it('should not flag non-medical text', () => {
                MODERATION_PATTERNS.medicalClaims.lastIndex = 0;
                expect(MODERATION_PATTERNS.medicalClaims.test('Really relaxing experience')).toBe(false);
            });
        });

        describe('personalInfo', () => {
            it('should detect phone numbers', () => {
                expect(MODERATION_PATTERNS.personalInfo.test('Call me at 313-555-1234')).toBe(true);
                expect(MODERATION_PATTERNS.personalInfo.test('My number is 3135551234')).toBe(true);
            });

            it('should detect email addresses', () => {
                MODERATION_PATTERNS.personalInfo.lastIndex = 0;
                expect(MODERATION_PATTERNS.personalInfo.test('Email me at test@example.com')).toBe(true);
            });

            it('should not flag normal text', () => {
                MODERATION_PATTERNS.personalInfo.lastIndex = 0;
                expect(MODERATION_PATTERNS.personalInfo.test('Great dispensary')).toBe(false);
            });
        });

        describe('spam', () => {
            it('should detect spam patterns', () => {
                expect(MODERATION_PATTERNS.spam.test('Click here for discount')).toBe(true);
                expect(MODERATION_PATTERNS.spam.test('Visit www.spam.com')).toBe(true);
                expect(MODERATION_PATTERNS.spam.test('Use discount code SAVE20')).toBe(true);
            });

            it('should not flag legitimate reviews', () => {
                MODERATION_PATTERNS.spam.lastIndex = 0;
                expect(MODERATION_PATTERNS.spam.test('Amazing selection and fair prices')).toBe(false);
            });
        });
    });

    describe('REVIEW_TAGS', () => {
        it('should have tags for dispensary reviews', () => {
            expect(REVIEW_TAGS.dispensary).toContain('Fast Service');
            expect(REVIEW_TAGS.dispensary).toContain('Friendly Staff');
            expect(REVIEW_TAGS.dispensary).toContain('Good Selection');
        });

        it('should have tags for product reviews', () => {
            expect(REVIEW_TAGS.product).toContain('Strong Effects');
            expect(REVIEW_TAGS.product).toContain('Great Flavor');
            expect(REVIEW_TAGS.product).toContain('Relaxing');
        });

        it('should have tags for brand reviews', () => {
            expect(REVIEW_TAGS.brand).toContain('Consistent Quality');
            expect(REVIEW_TAGS.brand).toContain('Love the Brand');
        });
    });
});

describe('Review Aggregate Calculations', () => {
    function calculateAverage(ratings: number[]): number {
        if (ratings.length === 0) return 0;
        return ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }

    function calculateDistribution(ratings: number[]): Record<number, number> {
        const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratings.forEach(r => dist[r]++);
        return dist;
    }

    it('should calculate correct average rating', () => {
        expect(calculateAverage([5, 4, 5, 3, 5])).toBeCloseTo(4.4, 1);
        expect(calculateAverage([1, 2, 3, 4, 5])).toBe(3);
        expect(calculateAverage([5, 5, 5, 5])).toBe(5);
    });

    it('should calculate correct rating distribution', () => {
        const ratings = [5, 5, 4, 4, 4, 3, 2, 1, 1];
        const dist = calculateDistribution(ratings);

        expect(dist[5]).toBe(2);
        expect(dist[4]).toBe(3);
        expect(dist[3]).toBe(1);
        expect(dist[2]).toBe(1);
        expect(dist[1]).toBe(2);
    });

    it('should handle empty ratings', () => {
        expect(calculateAverage([])).toBe(0);
        const dist = calculateDistribution([]);
        expect(dist[5]).toBe(0);
    });
});
