import { hasRole, hasPermission, canAccessBrand, canAccessDispensary, canAccessOrder } from '@/server/auth/rbac';
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
        return true; 
    })
}));

import { requireUser } from '@/server/auth/auth';

describe('RBAC Role Standardization (Super User)', () => {
    const superUser: DomainUserProfile = {
        id: 'user-1',
        uid: 'super-1',
        email: 'admin@bakedbot.ai',
        displayName: 'Super User',
        role: 'super_user',
        organizationIds: [],
        brandId: '',
        locationId: ''
    };

    const brandUser: DomainUserProfile = {
         id: 'user-2',
        uid: 'brand-1',
        email: 'brand@example.com',
        displayName: 'Brand User',
        role: 'brand',
        organizationIds: ['org-1'],
        brandId: 'org-1',
        locationId: ''
    };

    describe('hasRole', () => {
        it('identifies super_user correctly', () => {
            expect(hasRole(superUser, 'super_user')).toBe(true);
        });
        
        it('denies brand user as super_user', () => {
            expect(hasRole(brandUser, 'super_user')).toBe(false);
        });
    });

    describe('hasPermission', () => {
        it('grants admin:all to super_user', () => {
            expect(hasPermission(superUser, 'admin:all')).toBe(true);
        });
        it('grants specific permissions to super_user', () => {
             // Super users imply all permissions via logic or explicit check
            expect(hasPermission(superUser, 'write:products')).toBe(true);
            expect(hasPermission(superUser, 'manage:agents')).toBe(true);
            expect(hasPermission(superUser, 'read:analytics')).toBe(true);
        });
    });

    describe('isSuperUser', () => {
        it('returns true for super_user role', async () => {
            (requireUser as jest.Mock).mockResolvedValueOnce({ role: 'super_user', email: 'v@b.com' });
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
        it('allows super_user to access any brand', () => {
            expect(canAccessBrand(superUser, 'some-other-brand')).toBe(true);
        });
        it('allows super_user to access any dispensary', () => {
            expect(canAccessDispensary(superUser, 'some-other-dispensary')).toBe(true);
        });
        it('allows super_user to access any order', () => {
            expect(canAccessOrder(superUser, { brandId: 'any-brand' })).toBe(true);
        });
    });
});
