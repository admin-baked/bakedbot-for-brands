import {
    isDirectoryBrand,
    isDirectoryDispensary,
    isDirectoryClaim,
    DirectoryBrand,
    DirectoryDispensary,
    DirectoryClaim
} from '../directory';

describe('Directory Type Guards', () => {
    describe('isDirectoryBrand', () => {
        it('returns true for valid DirectoryBrand objects', () => {
            const validBrand: Partial<DirectoryBrand> = {
                id: 'brand-123',
                name: 'Test Brand',
                confidence: 0.85,
                sourceRefs: [{ importId: 'imp-1', sourceId: 'src-1', timestamp: new Date() }]
            };
            expect(isDirectoryBrand(validBrand)).toBe(true);
        });

        it('returns false for null', () => {
            expect(isDirectoryBrand(null)).toBe(false);
        });

        it('returns false for undefined', () => {
            expect(isDirectoryBrand(undefined)).toBe(false);
        });

        it('returns false for objects missing required fields', () => {
            expect(isDirectoryBrand({ id: 'brand-123' })).toBe(false);
            expect(isDirectoryBrand({ id: 'brand-123', name: 'Test' })).toBe(false);
            expect(isDirectoryBrand({ name: 'Test', confidence: 0.5 })).toBe(false);
        });

        it('returns false for non-objects', () => {
            expect(isDirectoryBrand('string')).toBe(false);
            expect(isDirectoryBrand(123)).toBe(false);
            expect(isDirectoryBrand([])).toBe(false);
        });
    });

    describe('isDirectoryDispensary', () => {
        it('returns true for valid DirectoryDispensary objects', () => {
            const validDispensary: Partial<DirectoryDispensary> = {
                id: 'disp-123',
                name: 'Test Dispensary',
                address: { city: 'Chicago', state: 'IL', postalCode: '60601' },
                geo: { lat: 41.8781, lng: -87.6298 }
            };
            expect(isDirectoryDispensary(validDispensary)).toBe(true);
        });

        it('returns false for objects missing address', () => {
            const invalidDispensary = {
                id: 'disp-123',
                name: 'Test Dispensary',
                geo: { lat: 41.8781, lng: -87.6298 }
            };
            expect(isDirectoryDispensary(invalidDispensary)).toBe(false);
        });

        it('returns false for objects missing geo', () => {
            const invalidDispensary = {
                id: 'disp-123',
                name: 'Test Dispensary',
                address: { city: 'Chicago', state: 'IL', postalCode: '60601' }
            };
            expect(isDirectoryDispensary(invalidDispensary)).toBe(false);
        });
    });

    describe('isDirectoryClaim', () => {
        it('returns true for valid DirectoryClaim objects', () => {
            const validClaim: Partial<DirectoryClaim> = {
                id: 'claim-123',
                entityType: 'brand',
                entityId: 'brand-456',
                claimantEmail: 'owner@brand.com',
                status: 'requested'
            };
            expect(isDirectoryClaim(validClaim)).toBe(true);
        });

        it('returns false for missing claimantEmail', () => {
            const invalidClaim = {
                id: 'claim-123',
                entityType: 'brand',
                entityId: 'brand-456',
                status: 'requested'
            };
            expect(isDirectoryClaim(invalidClaim)).toBe(false);
        });

        it('returns false for missing status', () => {
            const invalidClaim = {
                id: 'claim-123',
                entityType: 'brand',
                entityId: 'brand-456',
                claimantEmail: 'owner@brand.com'
            };
            expect(isDirectoryClaim(invalidClaim)).toBe(false);
        });
    });
});
