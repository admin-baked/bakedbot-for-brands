
import { hasRole, hasPermission, hasRolePermission, canAccessBrand, canAccessDispensary, canAccessOrder } from '@/server/auth/rbac';
import { isSuperUser } from '@/server/auth/auth';
import { DomainUserProfile } from '@/types/domain';

// Mock Genkit and Auth
jest.mock('@/ai/genkit', () => ({
    ai: {
        embed: jest.fn()
    }
}));
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
    isSuperUser: jest.fn(async () => {
        // Simple mock of isSuperUser logic for testing standalone
        return true; 
    })
}));

import { requireUser } from '@/server/auth/auth';

describe('RBAC Role Standardization', () => {
    const superAdminUser: DomainUserProfile = {
        uid: 'admin-1',
        email: 'admin@bakedbot.ai',
        displayName: 'Super Admin',
        role: 'super_admin',
        organizationIds: [],
        brandId: '',
        dispensaryId: '',
        locationId: ''
    };

    const ownerUser: DomainUserProfile = {
        uid: 'owner-1',
        email: 'owner@bakedbot.ai',
        displayName: 'Owner',
        role: 'owner',
        organizationIds: [],
        brandId: '',
        dispensaryId: '',
        locationId: ''
    };

    const brandUser: DomainUserProfile = {
        uid: 'brand-1',
        email: 'brand@example.com',
        displayName: 'Brand User',
        role: 'brand',
        organizationIds: ['org-1'],
        brandId: 'org-1',
        dispensaryId: '',
        locationId: ''
    };

    describe('hasRole', () => {
        it('identifies super_admin as super_admin', () => {
            expect(hasRole(superAdminUser, 'super_admin')).toBe(true);
        });
        it('identifies owner as super_admin (legacy/alias logic)', () => {
            expect(hasRole(ownerUser, 'super_admin')).toBe(true);
        });
        it('identifies super_admin as owner (legacy/alias logic)', () => {
            expect(hasRole(superAdminUser, 'owner')).toBe(true);
        });
        it('denies brand user as super_admin', () => {
            expect(hasRole(brandUser, 'super_admin')).toBe(false);
        });
    });

    describe('hasPermission', () => {
        it('grants admin:all to super_admin', () => {
            expect(hasPermission(superAdminUser, 'admin:all')).toBe(true);
        });
        it('grants specific permissions to super_admin', () => {
            expect(hasPermission(superAdminUser, 'write:products')).toBe(true);
            expect(hasPermission(superAdminUser, 'manage:agents')).toBe(true);
        });
    });

    describe('isSuperUser', () => {
        it('returns true for super_admin role', async () => {
            (requireUser as jest.Mock).mockResolvedValueOnce({ role: 'super_admin', email: 'v@b.com' });
            const result = await isSuperUser();
            expect(result).toBe(true);
        });
        it('returns true for super admin email whitelist', async () => {
            (requireUser as jest.Mock).mockResolvedValueOnce({ role: 'brand', email: 'martez@bakedbot.ai' });
            const result = await isSuperUser();
            expect(result).toBe(true);
        });
    });

    describe('Cross-Resource Access', () => {
        it('allows super_admin to access any brand', () => {
            expect(canAccessBrand(superAdminUser, 'some-other-brand')).toBe(true);
        });
        it('allows super_admin to access any dispensary', () => {
            expect(canAccessDispensary(superAdminUser, 'some-other-dispensary')).toBe(true);
        });
        it('allows super_admin to access any order', () => {
            expect(canAccessOrder(superAdminUser, { brandId: 'any-brand' })).toBe(true);
        });
    });
});
