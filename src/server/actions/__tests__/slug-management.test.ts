
import { checkSlugAvailability, reserveSlug, getBrandSlug } from '../slug-management';
import { createSlug } from '@/lib/utils/slug';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

describe('Slug Management', () => {
    let mockFirestore: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            get: jest.fn(),
            set: jest.fn(),
            update: jest.fn(),
        };
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    describe('createSlug', () => {
        it('should normalize strings correctly', () => {
            expect(createSlug('Hello World')).toBe('hello-world');
            expect(createSlug('Brand & Co!')).toBe('brand-co');
            expect(createSlug('  Spaces  ')).toBe('spaces');
            expect(createSlug('Multiple---Dashes')).toBe('multiple-dashes');
        });
    });

    describe('checkSlugAvailability', () => {
        it('should return available for non-existent slugs', async () => {
            mockFirestore.get.mockResolvedValue({ exists: false });
            const result = await checkSlugAvailability('new-brand');
            expect(result.available).toBe(true);
        });

        it('should return taken and suggestion for existing slugs', async () => {
            mockFirestore.get.mockResolvedValue({ exists: true });
            const result = await checkSlugAvailability('taken-brand');
            expect(result.available).toBe(false);
            expect(result.suggestion).toBeDefined();
            expect(result.suggestion).toContain('taken-brand-');
        });

        it('should return unavailable for short slugs', async () => {
            const result = await checkSlugAvailability('ab');
            expect(result.available).toBe(false);
            expect(result.suggestion).toBeUndefined();
        });
    });

    describe('reserveSlug', () => {
        it('should return error for short slug', async () => {
            const result = await reserveSlug('ab', 'brand123');
            expect(result.success).toBe(false);
            expect(result.error).toContain('at least 3 characters');
        });

        it('should return error if slug is already taken', async () => {
            mockFirestore.get.mockResolvedValue({ exists: true });
            const result = await reserveSlug('taken-brand', 'brand123');
            expect(result.success).toBe(false);
            expect(result.error).toContain('already taken');
        });

        it('should successfully reserve slug if available', async () => {
            mockFirestore.get.mockResolvedValue({ exists: false });
            const result = await reserveSlug('my-new-brand', 'brand123');
            
            expect(result.success).toBe(true);
            // Verify it was set in brands collection
            expect(mockFirestore.collection).toHaveBeenCalledWith('brands');
            expect(mockFirestore.doc).toHaveBeenCalledWith('my-new-brand');
            // Verify it was updated in organizations
            expect(mockFirestore.collection).toHaveBeenCalledWith('organizations');
            expect(mockFirestore.doc).toHaveBeenCalledWith('brand123');
        });
    });

    describe('getBrandSlug', () => {
        it('should return slug from organization doc if it exists', async () => {
            // First call matches organizations, second matches brands if needed
            mockFirestore.get.mockResolvedValueOnce({ 
                exists: true, 
                data: () => ({ slug: 'org-slug' }) 
            });
            
            const result = await getBrandSlug('brand123');
            expect(result).toBe('org-slug');
            expect(mockFirestore.collection).toHaveBeenCalledWith('organizations');
        });

        it('should fallback to brands doc if not in organization', async () => {
            // Org doesn't exist or doesn't have slug
            mockFirestore.get.mockResolvedValueOnce({ exists: false });
            mockFirestore.get.mockResolvedValueOnce({ 
                exists: true, 
                data: () => ({ slug: 'brand-slug' }) 
            });
            
            const result = await getBrandSlug('brand123');
            expect(result).toBe('brand-slug');
        });
    });
});
