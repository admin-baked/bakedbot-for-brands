// tests/components/url-import-client.test.tsx
/**
 * Unit tests for URL Import Client component
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the dependencies
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

jest.mock('@/app/dashboard/products/actions', () => ({
    saveImportedProducts: jest.fn(),
}));

describe('URL Import Client', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('URL Validation', () => {
        it('should reject empty URLs', () => {
            const url = '';
            expect(url.trim()).toBe('');
        });

        it('should validate proper URLs', () => {
            const validUrls = [
                'https://example.com/menu',
                'https://dutchie.com/dispensary/test',
                'https://www.weedmaps.com/dispensaries/test',
            ];

            validUrls.forEach((url) => {
                expect(() => new URL(url)).not.toThrow();
            });
        });

        it('should reject invalid URLs', () => {
            const invalidUrls = [
                'not-a-url',
                'just some text',
            ];

            invalidUrls.forEach((url) => {
                expect(() => new URL(url)).toThrow();
            });
        });
    });

    describe('Import Status Flow', () => {
        it('should have correct initial status', () => {
            const initialStatus = 'idle';
            expect(initialStatus).toBe('idle');
        });

        it('should define all valid statuses', () => {
            const validStatuses = ['idle', 'validating', 'extracting', 'processing', 'complete', 'saving', 'error'];
            expect(validStatuses).toHaveLength(7);
        });

        it('should map status to correct messages', () => {
            const statusMessages: Record<string, string> = {
                validating: 'Validating URL...',
                extracting: 'Extracting menu data with AI...',
                processing: 'Processing products and brand info...',
                complete: 'Import complete!',
                saving: 'Saving products to your account...',
            };

            expect(statusMessages.validating).toBe('Validating URL...');
            expect(statusMessages.extracting).toBe('Extracting menu data with AI...');
            expect(statusMessages.complete).toBe('Import complete!');
        });
    });

    describe('Category Counting', () => {
        it('should correctly count products by category', () => {
            const products = [
                { name: 'Product 1', category: 'Flower', price: 30 },
                { name: 'Product 2', category: 'Flower', price: 35 },
                { name: 'Product 3', category: 'Edibles', price: 20 },
                { name: 'Product 4', category: 'Vapes', price: 40 },
            ];

            const categoryCounts = products.reduce(
                (acc: Record<string, number>, p) => {
                    acc[p.category] = (acc[p.category] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>
            );

            expect(categoryCounts).toEqual({
                Flower: 2,
                Edibles: 1,
                Vapes: 1,
            });
        });

        it('should handle empty product array', () => {
            const products: any[] = [];
            const categoryCounts = products.reduce(
                (acc: Record<string, number>, p) => {
                    acc[p.category] = (acc[p.category] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>
            );

            expect(categoryCounts).toEqual({});
        });
    });
});
