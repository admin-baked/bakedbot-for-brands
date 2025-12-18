/**
 * Unit Tests for Shop Filter Logic
 */

import { describe, it, expect } from '@jest/globals';

describe('Shop Filters', () => {
    interface ShopFilters {
        category?: string;
        maxPrice?: number;
        minRating?: number;
        maxMinutes?: number;
        openNow?: boolean;
        effects?: string[];
    }

    function countActiveFilters(filters: ShopFilters): number {
        return Object.values(filters).filter(v =>
            v !== undefined && v !== null && v !== false &&
            !(Array.isArray(v) && v.length === 0)
        ).length;
    }

    describe('countActiveFilters', () => {
        it('should return 0 for empty filters', () => {
            expect(countActiveFilters({})).toBe(0);
        });

        it('should count category filter', () => {
            expect(countActiveFilters({ category: 'flower' })).toBe(1);
        });

        it('should count multiple filters', () => {
            expect(countActiveFilters({
                category: 'edibles',
                maxPrice: 50,
                openNow: true,
            })).toBe(3);
        });

        it('should not count false boolean', () => {
            expect(countActiveFilters({ openNow: false })).toBe(0);
        });

        it('should not count empty array', () => {
            expect(countActiveFilters({ effects: [] })).toBe(0);
        });

        it('should count non-empty array', () => {
            expect(countActiveFilters({ effects: ['relaxing'] })).toBe(1);
        });
    });

    describe('Filter Application', () => {
        interface Product {
            category: string;
            price: number;
            rating?: number;
            distanceMinutes?: number;
            isOpen?: boolean;
            effects?: string[];
        }

        function matchesFilters(product: Product, filters: ShopFilters): boolean {
            if (filters.category && product.category !== filters.category) return false;
            if (filters.maxPrice && product.price > filters.maxPrice) return false;
            if (filters.minRating && (product.rating || 0) < filters.minRating) return false;
            if (filters.maxMinutes && (product.distanceMinutes || Infinity) > filters.maxMinutes) return false;
            if (filters.openNow && !product.isOpen) return false;
            if (filters.effects && filters.effects.length > 0) {
                const hasMatchingEffect = filters.effects.some(e =>
                    product.effects?.includes(e)
                );
                if (!hasMatchingEffect) return false;
            }
            return true;
        }

        const sampleProduct: Product = {
            category: 'flower',
            price: 45,
            rating: 4.5,
            distanceMinutes: 10,
            isOpen: true,
            effects: ['relaxing', 'sleepy'],
        };

        it('should match when no filters', () => {
            expect(matchesFilters(sampleProduct, {})).toBe(true);
        });

        it('should filter by category', () => {
            expect(matchesFilters(sampleProduct, { category: 'flower' })).toBe(true);
            expect(matchesFilters(sampleProduct, { category: 'edibles' })).toBe(false);
        });

        it('should filter by maxPrice', () => {
            expect(matchesFilters(sampleProduct, { maxPrice: 50 })).toBe(true);
            expect(matchesFilters(sampleProduct, { maxPrice: 40 })).toBe(false);
        });

        it('should filter by minRating', () => {
            expect(matchesFilters(sampleProduct, { minRating: 4.0 })).toBe(true);
            expect(matchesFilters(sampleProduct, { minRating: 4.8 })).toBe(false);
        });

        it('should filter by maxMinutes', () => {
            expect(matchesFilters(sampleProduct, { maxMinutes: 15 })).toBe(true);
            expect(matchesFilters(sampleProduct, { maxMinutes: 5 })).toBe(false);
        });

        it('should filter by openNow', () => {
            expect(matchesFilters(sampleProduct, { openNow: true })).toBe(true);
            expect(matchesFilters({ ...sampleProduct, isOpen: false }, { openNow: true })).toBe(false);
        });

        it('should filter by effects', () => {
            expect(matchesFilters(sampleProduct, { effects: ['relaxing'] })).toBe(true);
            expect(matchesFilters(sampleProduct, { effects: ['energizing'] })).toBe(false);
        });

        it('should apply multiple filters', () => {
            expect(matchesFilters(sampleProduct, {
                category: 'flower',
                maxPrice: 50,
                minRating: 4.0,
                openNow: true,
            })).toBe(true);

            expect(matchesFilters(sampleProduct, {
                category: 'flower',
                maxPrice: 30, // Too low
                minRating: 4.0,
            })).toBe(false);
        });
    });
});

describe('Category Pills', () => {
    const CATEGORIES = [
        { value: 'flower', label: 'Flower' },
        { value: 'edibles', label: 'Edibles' },
        { value: 'vapes', label: 'Vapes' },
        { value: 'concentrates', label: 'Concentrates' },
        { value: 'pre-rolls', label: 'Pre-Rolls' },
        { value: 'tinctures', label: 'Tinctures' },
    ];

    it('should have all cannabis categories', () => {
        expect(CATEGORIES.length).toBeGreaterThanOrEqual(5);
    });

    it('should have unique values', () => {
        const values = CATEGORIES.map(c => c.value);
        const unique = [...new Set(values)];
        expect(values.length).toBe(unique.length);
    });

    it('should have human-readable labels', () => {
        CATEGORIES.forEach(cat => {
            expect(cat.label.length).toBeGreaterThan(0);
            expect(cat.label[0]).toBe(cat.label[0].toUpperCase());
        });
    });
});
