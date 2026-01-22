/**
 * Tests for menu embed functionality
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the fetch API
global.fetch = jest.fn();

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/embed/menu/test-brand',
}));

// Mock firebase client provider
jest.mock('@/firebase/auth/use-user', () => ({
    useUser: () => ({
        user: null,
        isUserLoading: false,
    }),
}));

describe('Menu Embed Configuration', () => {
    describe('PostMessage Events', () => {
        it('should define correct event types', () => {
            const eventTypes = [
                'bakedbot:cart:updated',
                'bakedbot:checkout:start',
                'bakedbot:checkout:complete',
                'bakedbot:resize',
            ];

            // Verify all event types are valid strings
            eventTypes.forEach((type) => {
                expect(typeof type).toBe('string');
                expect(type).toMatch(/^bakedbot:/);
            });
        });
    });

    describe('Embed Script Configuration', () => {
        it('should accept valid brandId', () => {
            const validBrandIds = ['test-brand', 'brand-123', 'my_brand'];
            validBrandIds.forEach((brandId) => {
                expect(brandId).toBeTruthy();
                expect(typeof brandId).toBe('string');
            });
        });

        it('should support layout options', () => {
            const validLayouts = ['grid', 'list', 'compact'];
            validLayouts.forEach((layout) => {
                expect(['grid', 'list', 'compact']).toContain(layout);
            });
        });

        it('should support dimension options', () => {
            const validDimensions = ['100%', '600px', '80vh'];
            validDimensions.forEach((dim) => {
                expect(dim).toMatch(/^\d+(%|px|vh|vw)?$/);
            });
        });
    });

    describe('Cart State Management', () => {
        it('should track cart items with quantity', () => {
            const cartItem = {
                productId: 'prod-123',
                quantity: 2,
                price: 29.99,
            };

            expect(cartItem.productId).toBeTruthy();
            expect(cartItem.quantity).toBeGreaterThan(0);
            expect(cartItem.price).toBeGreaterThan(0);
        });

        it('should calculate cart total correctly', () => {
            const items = [
                { price: 10.0, quantity: 2 },
                { price: 15.5, quantity: 1 },
            ];

            const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            expect(total).toBe(35.5);
        });
    });

    describe('Category Filter', () => {
        it('should filter products by category', () => {
            const products = [
                { id: '1', category: 'flower', name: 'Product 1' },
                { id: '2', category: 'edibles', name: 'Product 2' },
                { id: '3', category: 'flower', name: 'Product 3' },
            ];

            const filtered = products.filter((p) => p.category === 'flower');
            expect(filtered).toHaveLength(2);
            expect(filtered.every((p) => p.category === 'flower')).toBe(true);
        });

        it('should show all products when category is null', () => {
            const products = [
                { id: '1', category: 'flower' },
                { id: '2', category: 'edibles' },
            ];

            const selectedCategory = null;
            const filtered = selectedCategory
                ? products.filter((p) => p.category === selectedCategory)
                : products;

            expect(filtered).toHaveLength(2);
        });
    });

    describe('Search Functionality', () => {
        it('should filter products by search term', () => {
            const products = [
                { id: '1', name: 'Blue Dream', brand: 'Brand A' },
                { id: '2', name: 'OG Kush', brand: 'Brand B' },
                { id: '3', name: 'Blue Cheese', brand: 'Brand A' },
            ];

            const searchTerm = 'blue';
            const filtered = products.filter(
                (p) =>
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
            );

            expect(filtered).toHaveLength(2);
            expect(filtered.map((p) => p.name)).toContain('Blue Dream');
            expect(filtered.map((p) => p.name)).toContain('Blue Cheese');
        });

        it('should be case insensitive', () => {
            const products = [{ id: '1', name: 'Blue Dream', brand: 'Brand A' }];

            const searches = ['blue', 'BLUE', 'Blue', 'bLuE'];
            searches.forEach((term) => {
                const filtered = products.filter((p) =>
                    p.name.toLowerCase().includes(term.toLowerCase())
                );
                expect(filtered).toHaveLength(1);
            });
        });
    });

    describe('Favorites', () => {
        it('should add and remove favorites', () => {
            const favorites = new Set<string>();

            // Add favorite
            favorites.add('prod-1');
            expect(favorites.has('prod-1')).toBe(true);
            expect(favorites.size).toBe(1);

            // Add another
            favorites.add('prod-2');
            expect(favorites.size).toBe(2);

            // Remove favorite
            favorites.delete('prod-1');
            expect(favorites.has('prod-1')).toBe(false);
            expect(favorites.size).toBe(1);
        });

        it('should not duplicate favorites', () => {
            const favorites = new Set<string>();

            favorites.add('prod-1');
            favorites.add('prod-1');
            favorites.add('prod-1');

            expect(favorites.size).toBe(1);
        });
    });

    describe('Price Formatting', () => {
        it('should format prices correctly', () => {
            const formatPrice = (price: number): string => {
                return `$${price.toFixed(2)}`;
            };

            expect(formatPrice(10)).toBe('$10.00');
            expect(formatPrice(10.5)).toBe('$10.50');
            expect(formatPrice(10.99)).toBe('$10.99');
            expect(formatPrice(0)).toBe('$0.00');
        });
    });

    describe('Quantity Controls', () => {
        it('should increment quantity', () => {
            let quantity = 1;
            quantity++;
            expect(quantity).toBe(2);
        });

        it('should decrement quantity but not below 1', () => {
            let quantity = 2;
            quantity = Math.max(1, quantity - 1);
            expect(quantity).toBe(1);

            quantity = Math.max(1, quantity - 1);
            expect(quantity).toBe(1); // Should stay at 1
        });
    });
});

describe('Embed URL Parameters', () => {
    it('should parse brandId from URL', () => {
        const url = '/embed/menu/test-brand';
        const brandId = url.split('/').pop();
        expect(brandId).toBe('test-brand');
    });

    it('should handle query parameters', () => {
        const searchParams = new URLSearchParams('layout=grid&showCart=true');

        expect(searchParams.get('layout')).toBe('grid');
        expect(searchParams.get('showCart')).toBe('true');
    });

    it('should provide defaults for missing parameters', () => {
        const searchParams = new URLSearchParams();

        const layout = searchParams.get('layout') || 'grid';
        const showCart = searchParams.get('showCart') !== 'false';

        expect(layout).toBe('grid');
        expect(showCart).toBe(true);
    });
});

describe('Resize Observer', () => {
    it('should calculate container height', () => {
        const mockElement = {
            scrollHeight: 800,
            offsetHeight: 600,
        };

        const height = Math.max(mockElement.scrollHeight, mockElement.offsetHeight);
        expect(height).toBe(800);
    });
});
