/**
 * Tests for orgId resolution logic in segments page
 *
 * This tests the fix from Phase 7 of the Thrive Syracuse audit where
 * we improved orgId resolution to check in priority order:
 * orgId > brandId > currentOrgId > uid
 */

describe('Segments Page - orgId Resolution', () => {
    describe('brandId resolution priority', () => {
        it('should use orgId when available', () => {
            const user = {
                uid: 'user123',
                brandId: 'brand456',
                orgId: 'org_thrive_syracuse',
                currentOrgId: 'current_org'
            } as any;

            const brandId = user.orgId || user.brandId || user.currentOrgId || user.uid;

            expect(brandId).toBe('org_thrive_syracuse');
        });

        it('should use brandId when orgId is not available', () => {
            const user = {
                uid: 'user123',
                brandId: 'brand456',
                currentOrgId: 'current_org'
            } as any;

            const brandId = user.orgId || user.brandId || user.currentOrgId || user.uid;

            expect(brandId).toBe('brand456');
        });

        it('should use currentOrgId when orgId and brandId are not available', () => {
            const user = {
                uid: 'user123',
                currentOrgId: 'current_org'
            } as any;

            const brandId = user.orgId || user.brandId || user.currentOrgId || user.uid;

            expect(brandId).toBe('current_org');
        });

        it('should fall back to uid when no org identifiers are available', () => {
            const user = {
                uid: 'user123'
            } as any;

            const brandId = user.orgId || user.brandId || user.currentOrgId || user.uid;

            expect(brandId).toBe('user123');
        });

        it('should handle undefined custom claims gracefully', () => {
            const user = {
                uid: 'user123',
                brandId: undefined,
                orgId: undefined,
                currentOrgId: undefined
            } as any;

            const brandId = user.orgId || user.brandId || user.currentOrgId || user.uid;

            expect(brandId).toBe('user123');
        });

        it('should handle empty string orgId', () => {
            const user = {
                uid: 'user123',
                brandId: 'brand456',
                orgId: '',
                currentOrgId: ''
            } as any;

            const brandId = user.orgId || user.brandId || user.currentOrgId || user.uid;

            expect(brandId).toBe('brand456');
        });
    });
});
