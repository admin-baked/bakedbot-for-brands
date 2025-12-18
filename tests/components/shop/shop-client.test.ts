/**
 * Unit Tests for Shop Client Page
 */

import { describe, it, expect } from '@jest/globals';

describe('Shop Client', () => {
    describe('Search Query Normalization', () => {
        function normalizeSearchQuery(query: string): string {
            return query
                .toLowerCase()
                .trim()
                .replace(/\s+/g, ' ')
                .replace(/[^\w\s-]/g, '');
        }

        it('should normalize uppercase to lowercase', () => {
            expect(normalizeSearchQuery('FLOWER')).toBe('flower');
        });

        it('should trim whitespace', () => {
            expect(normalizeSearchQuery('  flower  ')).toBe('flower');
        });

        it('should collapse multiple spaces', () => {
            expect(normalizeSearchQuery('blue   dream')).toBe('blue dream');
        });

        it('should remove special characters', () => {
            expect(normalizeSearchQuery('flower!')).toBe('flower');
            expect(normalizeSearchQuery('edibles@#$')).toBe('edibles');
        });

        it('should preserve hyphens', () => {
            expect(normalizeSearchQuery('pre-rolls')).toBe('pre-rolls');
        });
    });

    describe('Product Search Filtering', () => {
        interface Product {
            name: string;
            brand: string;
            category: string;
        }

        function searchProducts(products: Product[], query: string): Product[] {
            const lowerQuery = query.toLowerCase();
            return products.filter(p =>
                p.name.toLowerCase().includes(lowerQuery) ||
                p.brand.toLowerCase().includes(lowerQuery) ||
                p.category.toLowerCase().includes(lowerQuery)
            );
        }

        const sampleProducts: Product[] = [
            { name: 'Blue Dream', brand: 'Cookies', category: 'flower' },
            { name: 'Gummy Bears', brand: 'Wana', category: 'edibles' },
            { name: 'Live Resin', brand: 'Cookies', category: 'concentrates' },
        ];

        it('should find by product name', () => {
            const results = searchProducts(sampleProducts, 'blue');
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Blue Dream');
        });

        it('should find by brand name', () => {
            const results = searchProducts(sampleProducts, 'cookies');
            expect(results).toHaveLength(2);
        });

        it('should find by category', () => {
            const results = searchProducts(sampleProducts, 'edibles');
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Gummy Bears');
        });

        it('should return empty for no matches', () => {
            const results = searchProducts(sampleProducts, 'xyz');
            expect(results).toHaveLength(0);
        });

        it('should be case insensitive', () => {
            const results = searchProducts(sampleProducts, 'WANA');
            expect(results).toHaveLength(1);
        });
    });

    describe('Price Formatting', () => {
        function formatPrice(cents: number): string {
            return `$${(cents / 100).toFixed(2)}`;
        }

        function formatPriceRange(min: number, max: number): string {
            if (min === max) return formatPrice(min);
            return `${formatPrice(min)} - ${formatPrice(max)}`;
        }

        it('should format price in cents to dollars', () => {
            expect(formatPrice(2999)).toBe('$29.99');
            expect(formatPrice(100)).toBe('$1.00');
            expect(formatPrice(5050)).toBe('$50.50');
        });

        it('should format price ranges', () => {
            expect(formatPriceRange(2000, 3000)).toBe('$20.00 - $30.00');
        });

        it('should show single price when min equals max', () => {
            expect(formatPriceRange(2500, 2500)).toBe('$25.00');
        });
    });

    describe('Distance Formatting', () => {
        function formatDistance(miles: number): string {
            if (miles < 0.1) return 'Nearby';
            if (miles < 1) return `${Math.round(miles * 10) / 10} mi`;
            return `${Math.round(miles * 10) / 10} mi`;
        }

        function formatDriveTime(minutes: number): string {
            if (minutes < 1) return '< 1 min';
            if (minutes >= 60) {
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
            }
            return `${Math.round(minutes)} min`;
        }

        it('should format very close distances as Nearby', () => {
            expect(formatDistance(0.05)).toBe('Nearby');
        });

        it('should format miles with one decimal', () => {
            expect(formatDistance(2.5)).toBe('2.5 mi');
            expect(formatDistance(10.3)).toBe('10.3 mi');
        });

        it('should format drive time less than 1 minute', () => {
            expect(formatDriveTime(0.5)).toBe('< 1 min');
        });

        it('should format drive time in minutes', () => {
            expect(formatDriveTime(15)).toBe('15 min');
        });

        it('should format drive time over an hour', () => {
            expect(formatDriveTime(90)).toBe('1h 30m');
            expect(formatDriveTime(60)).toBe('1h');
        });
    });

    describe('Stock Status', () => {
        type StockLevel = 'high' | 'medium' | 'low' | 'out';

        function getStockLevel(quantity: number): StockLevel {
            if (quantity <= 0) return 'out';
            if (quantity <= 5) return 'low';
            if (quantity <= 20) return 'medium';
            return 'high';
        }

        function getStockLabel(level: StockLevel): string {
            switch (level) {
                case 'high': return 'In Stock';
                case 'medium': return 'Limited';
                case 'low': return 'Low Stock';
                case 'out': return 'Out of Stock';
            }
        }

        it('should classify stock levels correctly', () => {
            expect(getStockLevel(50)).toBe('high');
            expect(getStockLevel(15)).toBe('medium');
            expect(getStockLevel(3)).toBe('low');
            expect(getStockLevel(0)).toBe('out');
        });

        it('should provide correct stock labels', () => {
            expect(getStockLabel('high')).toBe('In Stock');
            expect(getStockLabel('medium')).toBe('Limited');
            expect(getStockLabel('low')).toBe('Low Stock');
            expect(getStockLabel('out')).toBe('Out of Stock');
        });
    });
});
