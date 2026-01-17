/**
 * Comprehensive RBAC Test Suite - Q1 Security Review
 * Tests all 5 roles: super_user, brand, dispensary, budtender, customer
 */

import {
    hasRole,
    hasPermission,
    canAccessBrand,
    canAccessDispensary,
    canAccessOrder,
    getUserPermissions,
    requirePermission,
    requireRole,
    requireBrandAccess,
    type UserRole,
    type Permission
} from '@/server/auth/rbac';
import { type DomainUserProfile } from '@/types/domain';

// Test fixtures
const createMockUser = (overrides: Partial<DomainUserProfile> = {}): DomainUserProfile => ({
    id: 'test-user-1',
    uid: 'test-user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'customer',
    organizationIds: [],
    brandId: null,
    locationId: null,
    ...overrides,
});

describe('RBAC System', () => {
    describe('Super User Role', () => {
        const superUser = createMockUser({
            uid: 'super-1',
            role: 'super_user',
        });

        it('should have admin:all permission', () => {
            expect(hasPermission(superUser, 'admin:all')).toBe(true);
        });

        it('should have ALL permissions via admin:all', () => {
            const allPermissions: Permission[] = [
                'read:products',
                'write:products',
                'read:orders',
                'write:orders',
                'read:analytics',
                'manage:campaigns',
                'manage:playbooks',
                'manage:agents',
                'manage:brand',
                'sync:menus',
                'manage:users',
            ];

            allPermissions.forEach(permission => {
                expect(hasPermission(superUser, permission)).toBe(true);
            });
        });

        it('should be able to access any brand', () => {
            expect(canAccessBrand(superUser, 'any-brand-id')).toBe(true);
            expect(canAccessBrand(superUser, 'another-brand')).toBe(true);
        });

        it('should be able to access any dispensary', () => {
            expect(canAccessDispensary(superUser, 'any-disp-id')).toBe(true);
        });

        it('should be able to access any order', () => {
            expect(canAccessOrder(superUser, { userId: 'someone-else' })).toBe(true);
            expect(canAccessOrder(superUser, { brandId: 'any-brand' })).toBe(true);
            expect(canAccessOrder(superUser, { retailerId: 'any-retailer' })).toBe(true);
        });
    });

    describe('Brand Role', () => {
        const brandUser = createMockUser({
            uid: 'brand-1',
            role: 'brand',
            brandId: 'brand-123',
        });

        it('should have correct permissions', () => {
            expect(hasPermission(brandUser, 'read:products')).toBe(true);
            expect(hasPermission(brandUser, 'write:products')).toBe(true);
            expect(hasPermission(brandUser, 'read:orders')).toBe(true);
            expect(hasPermission(brandUser, 'read:analytics')).toBe(true);
            expect(hasPermission(brandUser, 'manage:campaigns')).toBe(true);
            expect(hasPermission(brandUser, 'manage:playbooks')).toBe(true);
            expect(hasPermission(brandUser, 'manage:agents')).toBe(true);
            expect(hasPermission(brandUser, 'manage:brand')).toBe(true);
            expect(hasPermission(brandUser, 'sync:menus')).toBe(true);
            expect(hasPermission(brandUser, 'manage:users')).toBe(true);
        });

        it('should NOT have admin:all permission', () => {
            expect(hasPermission(brandUser, 'admin:all')).toBe(false);
        });

        it('should ONLY access their own brand', () => {
            expect(canAccessBrand(brandUser, 'brand-123')).toBe(true);
            expect(canAccessBrand(brandUser, 'other-brand')).toBe(false);
        });

        it('should NOT be able to access dispensaries', () => {
            expect(canAccessDispensary(brandUser, 'any-disp')).toBe(false);
        });

        it('should access orders for their brand', () => {
            expect(canAccessOrder(brandUser, { brandId: 'brand-123' })).toBe(true);
            expect(canAccessOrder(brandUser, { brandId: 'other-brand' })).toBe(false);
        });
    });

    describe('Dispensary Role', () => {
        const dispensaryUser = createMockUser({
            uid: 'disp-1',
            role: 'dispensary',
            locationId: 'location-123',
        });

        it('should have correct permissions', () => {
            expect(hasPermission(dispensaryUser, 'read:products')).toBe(true);
            expect(hasPermission(dispensaryUser, 'read:orders')).toBe(true);
            expect(hasPermission(dispensaryUser, 'write:orders')).toBe(true);
            expect(hasPermission(dispensaryUser, 'read:analytics')).toBe(true);
        });

        it('should NOT have brand management permissions', () => {
            expect(hasPermission(dispensaryUser, 'write:products')).toBe(false);
            expect(hasPermission(dispensaryUser, 'manage:campaigns')).toBe(false);
            expect(hasPermission(dispensaryUser, 'manage:brand')).toBe(false);
            expect(hasPermission(dispensaryUser, 'admin:all')).toBe(false);
        });

        it('should ONLY access their own dispensary', () => {
            expect(canAccessDispensary(dispensaryUser, 'location-123')).toBe(true);
            expect(canAccessDispensary(dispensaryUser, 'other-location')).toBe(false);
        });

        it('should access orders for their location', () => {
            expect(canAccessOrder(dispensaryUser, { retailerId: 'location-123' })).toBe(true);
            expect(canAccessOrder(dispensaryUser, { retailerId: 'other-loc' })).toBe(false);
        });
    });

    describe('Budtender Role', () => {
        const budtenderUser = createMockUser({
            uid: 'bud-1',
            role: 'budtender',
            locationId: 'loc-1',
        });

        it('should have limited permissions for dispensary work', () => {
            expect(hasPermission(budtenderUser, 'read:products')).toBe(true);
            expect(hasPermission(budtenderUser, 'read:orders')).toBe(true);
            expect(hasPermission(budtenderUser, 'write:orders')).toBe(true);
        });

        it('should NOT have analytics or management permissions', () => {
            expect(hasPermission(budtenderUser, 'read:analytics')).toBe(false);
            expect(hasPermission(budtenderUser, 'manage:brand')).toBe(false);
            expect(hasPermission(budtenderUser, 'admin:all')).toBe(false);
        });

        it('should access orders at their location', () => {
            expect(canAccessOrder(budtenderUser, { retailerId: 'loc-1' })).toBe(true);
            expect(canAccessOrder(budtenderUser, { retailerId: 'loc-2' })).toBe(false);
        });
    });

    describe('Customer Role', () => {
        const customerUser = createMockUser({
            uid: 'cust-1',
            role: 'customer',
        });

        it('should have minimal read-only permissions', () => {
            expect(hasPermission(customerUser, 'read:products')).toBe(true);
            expect(hasPermission(customerUser, 'read:orders')).toBe(true);
        });

        it('should NOT have write or management permissions', () => {
            expect(hasPermission(customerUser, 'write:products')).toBe(false);
            expect(hasPermission(customerUser, 'write:orders')).toBe(false);
            expect(hasPermission(customerUser, 'manage:brand')).toBe(false);
            expect(hasPermission(customerUser, 'admin:all')).toBe(false);
        });

        it('should ONLY access their own orders', () => {
            expect(canAccessOrder(customerUser, { userId: 'cust-1' })).toBe(true);
            expect(canAccessOrder(customerUser, { userId: 'cust-2' })).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        it('should return false for null user', () => {
            expect(hasRole(null, 'brand')).toBe(false);
            expect(hasPermission(null, 'read:products')).toBe(false);
            expect(canAccessBrand(null, 'any')).toBe(false);
            expect(canAccessDispensary(null, 'any')).toBe(false);
            expect(canAccessOrder(null, {})).toBe(false);
        });

        it('should return false for user without role', () => {
            const noRoleUser = createMockUser({ role: undefined as any });
            expect(hasRole(noRoleUser, 'brand')).toBe(false);
            expect(hasPermission(noRoleUser, 'read:products')).toBe(false);
        });

        it('should return empty permissions for null user', () => {
            expect(getUserPermissions(null)).toEqual([]);
        });

        it('should return empty permissions for invalid role', () => {
            const invalidRoleUser = createMockUser({ role: 'invalid_role' as any });
            expect(getUserPermissions(invalidRoleUser)).toEqual([]);
        });
    });

    describe('Require Functions', () => {
        const brandUser = createMockUser({
            role: 'brand',
            brandId: 'brand-123',
        });

        it('should throw for missing permission', () => {
            expect(() => requirePermission(brandUser, 'admin:all'))
                .toThrow('Unauthorized: missing permission admin:all');
        });

        it('should NOT throw for valid permission', () => {
            expect(() => requirePermission(brandUser, 'read:products'))
                .not.toThrow();
        });

        it('should throw for wrong role', () => {
            expect(() => requireRole(brandUser, 'super_user'))
                .toThrow('Unauthorized: requires role super_user');
        });

        it('should NOT throw for correct role', () => {
            expect(() => requireRole(brandUser, 'brand'))
                .not.toThrow();
        });

        it('should throw for wrong brand access', () => {
            expect(() => requireBrandAccess(brandUser, 'other-brand'))
                .toThrow('Unauthorized: cannot access brand other-brand');
        });

        it('should NOT throw for correct brand access', () => {
            expect(() => requireBrandAccess(brandUser, 'brand-123'))
                .not.toThrow();
        });
    });
});
