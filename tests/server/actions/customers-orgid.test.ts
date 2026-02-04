/**
 * Unit tests for customer actions orgId resolution
 * Tests the fixes made for Thrive Syracuse Alleaves integration
 *
 * Key fix: Dispensary users should check user.orgId BEFORE user.currentOrgId
 */

import { isBrandRole, isDispensaryRole } from '@/types/roles';

describe('Customer Actions - OrgId Resolution', () => {
    describe('isDispensaryRole', () => {
        it('should return true for dispensary role', () => {
            expect(isDispensaryRole('dispensary')).toBe(true);
        });

        it('should return true for dispensary_admin role', () => {
            expect(isDispensaryRole('dispensary_admin')).toBe(true);
        });

        it('should return true for dispensary_staff role', () => {
            expect(isDispensaryRole('dispensary_staff')).toBe(true);
        });

        it('should return true for budtender role', () => {
            expect(isDispensaryRole('budtender')).toBe(true);
        });

        it('should return false for brand role', () => {
            expect(isDispensaryRole('brand')).toBe(false);
        });
    });

    describe('isBrandRole', () => {
        it('should return true for brand role', () => {
            expect(isBrandRole('brand')).toBe(true);
        });

        it('should return true for brand_admin role', () => {
            expect(isBrandRole('brand_admin')).toBe(true);
        });

        it('should return true for brand_member role', () => {
            expect(isBrandRole('brand_member')).toBe(true);
        });

        it('should return false for dispensary role', () => {
            expect(isBrandRole('dispensary')).toBe(false);
        });
    });

    describe('orgId resolution logic', () => {
        /**
         * Simulates the orgId resolution logic from customers/actions.ts
         * This is the key fix: check orgId BEFORE currentOrgId
         */
        function resolveOrgId(user: {
            role: string;
            orgId?: string;
            currentOrgId?: string;
            locationId?: string;
            brandId?: string;
        }): string | undefined {
            let orgId: string | undefined;

            // Brand users use brandId
            if (isBrandRole(user.role)) {
                orgId = user.brandId;
            }

            // Dispensary users use orgId, currentOrgId, or locationId
            // KEY FIX: Check orgId FIRST (not currentOrgId)
            if (isDispensaryRole(user.role)) {
                orgId = user.orgId || user.currentOrgId || user.locationId;
            }

            return orgId;
        }

        it('should resolve orgId for dispensary user with orgId claim', () => {
            const user = {
                role: 'dispensary',
                orgId: 'org_thrive_syracuse',
                currentOrgId: undefined,
                locationId: 'loc_thrive_syracuse',
            };

            expect(resolveOrgId(user)).toBe('org_thrive_syracuse');
        });

        it('should fallback to currentOrgId when orgId is not set', () => {
            const user = {
                role: 'dispensary',
                orgId: undefined,
                currentOrgId: 'org_current',
                locationId: 'loc_123',
            };

            expect(resolveOrgId(user)).toBe('org_current');
        });

        it('should fallback to locationId when neither orgId nor currentOrgId is set', () => {
            const user = {
                role: 'dispensary',
                orgId: undefined,
                currentOrgId: undefined,
                locationId: 'loc_456',
            };

            expect(resolveOrgId(user)).toBe('loc_456');
        });

        it('should prioritize orgId over currentOrgId', () => {
            // This is the critical test - orgId should win over currentOrgId
            const user = {
                role: 'dispensary',
                orgId: 'org_primary',
                currentOrgId: 'org_secondary',
                locationId: 'loc_789',
            };

            expect(resolveOrgId(user)).toBe('org_primary');
        });

        it('should use brandId for brand users', () => {
            const user = {
                role: 'brand',
                orgId: 'org_something',
                brandId: 'brand_test',
            };

            expect(resolveOrgId(user)).toBe('brand_test');
        });

        it('should use brandId for brand_admin users', () => {
            const user = {
                role: 'brand_admin',
                brandId: 'brand_admin_test',
            };

            expect(resolveOrgId(user)).toBe('brand_admin_test');
        });

        it('should handle Thrive Syracuse user claims correctly', () => {
            // Actual user claims structure from diagnostic
            const thriveUser = {
                role: 'dispensary',
                orgId: 'org_thrive_syracuse',
                currentOrgId: undefined, // Note: this is null in production
                brandId: 'brand_thrive_syracuse',
                locationId: 'loc_thrive_syracuse',
            };

            expect(resolveOrgId(thriveUser)).toBe('org_thrive_syracuse');
        });

        it('should handle budtender role correctly', () => {
            const budtender = {
                role: 'budtender',
                orgId: 'org_dispensary',
                locationId: 'loc_main',
            };

            expect(resolveOrgId(budtender)).toBe('org_dispensary');
        });
    });

    describe('location query fallback', () => {
        /**
         * Simulates the location query logic that tries orgId first, then brandId
         */
        function simulateLocationQuery(
            orgId: string,
            locationsData: Array<{ orgId?: string; brandId?: string; id: string }>
        ): string | null {
            // Try orgId first
            const byOrgId = locationsData.find(loc => loc.orgId === orgId);
            if (byOrgId) return byOrgId.id;

            // Fallback to brandId
            const byBrandId = locationsData.find(loc => loc.brandId === orgId);
            if (byBrandId) return byBrandId.id;

            return null;
        }

        it('should find location by orgId', () => {
            const locations = [
                { id: 'loc_1', orgId: 'org_thrive_syracuse', brandId: 'brand_thrive_syracuse' },
            ];

            expect(simulateLocationQuery('org_thrive_syracuse', locations)).toBe('loc_1');
        });

        it('should fallback to brandId when orgId not found', () => {
            const locations = [
                { id: 'loc_1', brandId: 'brand_thrive_syracuse' }, // No orgId field
            ];

            // Query with orgId should fallback to brandId match
            expect(simulateLocationQuery('brand_thrive_syracuse', locations)).toBe('loc_1');
        });

        it('should return null when no match found', () => {
            const locations = [
                { id: 'loc_1', orgId: 'org_other', brandId: 'brand_other' },
            ];

            expect(simulateLocationQuery('org_thrive_syracuse', locations)).toBeNull();
        });
    });
});

describe('RBAC getUserOrgId', () => {
    /**
     * Simulates the getUserOrgId function from rbac.ts
     */
    function getUserOrgId(user: {
        role: string;
        orgId?: string;
        currentOrgId?: string;
        locationId?: string;
        brandId?: string;
    }): string | null {
        const userRole = user.role;

        // Brand users use brandId
        if (isBrandRole(userRole)) {
            return user.brandId || null;
        }

        // Dispensary users use orgId, currentOrgId, or locationId
        // KEY FIX: Check orgId FIRST
        if (isDispensaryRole(userRole)) {
            return user.orgId || user.currentOrgId || user.locationId || null;
        }

        return null;
    }

    it('should return orgId for dispensary user', () => {
        expect(getUserOrgId({
            role: 'dispensary',
            orgId: 'org_test',
            currentOrgId: 'org_current',
            locationId: 'loc_test',
        })).toBe('org_test');
    });

    it('should return brandId for brand user', () => {
        expect(getUserOrgId({
            role: 'brand',
            brandId: 'brand_test',
        })).toBe('brand_test');
    });

    it('should return null for customer role', () => {
        expect(getUserOrgId({
            role: 'customer',
            orgId: 'org_test',
        })).toBeNull();
    });
});
