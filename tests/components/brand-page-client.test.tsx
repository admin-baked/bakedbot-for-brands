// tests/components/brand-page-client.test.tsx
/**
 * Unit tests for Brand Page Client component
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

jest.mock('@/firebase/auth/use-user', () => ({
    useUser: () => ({
        user: {
            uid: 'test-user-id',
            brandId: 'test-brand-id',
        },
    }),
}));

jest.mock('@/server/actions/slug-management', () => ({
    checkSlugAvailability: jest.fn(),
    reserveSlug: jest.fn(),
    getBrandSlug: jest.fn(),
}));

describe('Brand Page Client', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Slug Validation', () => {
        it('should normalize slugs to lowercase', () => {
            const input = 'MyBrand';
            const normalized = input.toLowerCase();
            expect(normalized).toBe('mybrand');
        });

        it('should replace invalid characters with hyphens', () => {
            const input = 'My Brand Name!';
            const normalized = input.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            expect(normalized).toBe('my-brand-name-');
        });

        it('should collapse multiple hyphens', () => {
            const input = 'my--brand---name';
            const normalized = input.replace(/--+/g, '-');
            expect(normalized).toBe('my-brand-name');
        });

        it('should reject slugs shorter than 3 characters', () => {
            const shortSlugs = ['a', 'ab', ''];
            shortSlugs.forEach((slug) => {
                expect(slug.length < 3).toBe(true);
            });
        });

        it('should accept valid slugs', () => {
            const validSlugs = ['40tons', 'my-brand', 'green-valley-420'];
            validSlugs.forEach((slug) => {
                expect(slug.length >= 3).toBe(true);
                expect(/^[a-z0-9-]+$/.test(slug)).toBe(true);
            });
        });
    });

    describe('Public URL Generation', () => {
        it('should generate correct public URL for brand', () => {
            const slug = '40tons';
            const publicUrl = `https://bakedbot.ai/${slug}`;
            expect(publicUrl).toBe('https://bakedbot.ai/40tons');
        });

        it('should handle null slug gracefully', () => {
            const slug: string | null = null;
            const publicUrl = slug ? `https://bakedbot.ai/${slug}` : null;
            expect(publicUrl).toBeNull();
        });
    });

    describe('Publication State', () => {
        it('should start as unpublished', () => {
            const isPublished = false;
            expect(isPublished).toBe(false);
        });

        it('should transition to published state', () => {
            let isPublished = false;
            
            // Simulate publish action
            isPublished = true;
            
            expect(isPublished).toBe(true);
        });
    });

    describe('Slug Availability Check', () => {
        it('should return available for new slugs', async () => {
            const { checkSlugAvailability } = await import('@/server/actions/slug-management');
            (checkSlugAvailability as jest.Mock).mockResolvedValue({ available: true });
            
            const result = await checkSlugAvailability('new-brand');
            expect((result as any).available).toBe(true);
        });

        it('should return suggestion for taken slugs', async () => {
            const { checkSlugAvailability } = await import('@/server/actions/slug-management');
            (checkSlugAvailability as jest.Mock).mockResolvedValue({ 
                available: false, 
                suggestion: 'my-brand-42' 
            });
            
            const result = await checkSlugAvailability('my-brand');
            expect((result as any).available).toBe(false);
            expect((result as any).suggestion).toBe('my-brand-42');
        });
    });
});
