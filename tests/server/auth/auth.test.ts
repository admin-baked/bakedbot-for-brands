import { roleMatches } from '@/server/auth/auth';
import { UserRole } from '@/types/roles';

describe('Auth Logic', () => {
    describe('roleMatches', () => {
        it('should match direct roles', () => {
            expect(roleMatches('brand_admin', ['brand_admin' as UserRole])).toBe(true);
            expect(roleMatches('brand_member', ['brand_member' as UserRole])).toBe(true);
            expect(roleMatches('super_user', ['super_user' as UserRole])).toBe(true);
        });

        it('should handle "brand" group matching', () => {
            expect(roleMatches('brand_admin', ['brand' as UserRole])).toBe(true);
            expect(roleMatches('brand_member', ['brand' as UserRole])).toBe(true);
            expect(roleMatches('brand', ['brand' as UserRole])).toBe(true);
            expect(roleMatches('dispensary_admin', ['brand' as UserRole])).toBe(false);
        });

        it('should handle "dispensary" group matching', () => {
            expect(roleMatches('dispensary_admin', ['dispensary' as UserRole])).toBe(true);
            expect(roleMatches('dispensary_staff', ['dispensary' as UserRole])).toBe(true);
            expect(roleMatches('dispensary', ['dispensary' as UserRole])).toBe(true);
            expect(roleMatches('brand_admin', ['dispensary' as UserRole])).toBe(false);
        });

        it('should handle hierarchy (brand_admin for brand_member)', () => {
            expect(roleMatches('brand_admin', ['brand_member' as UserRole])).toBe(true);
            expect(roleMatches('brand', ['brand_member' as UserRole])).toBe(true);
            expect(roleMatches('brand_member', ['brand_member' as UserRole])).toBe(true);
        });

        it('should return false for mismatches', () => {
            expect(roleMatches('customer', ['brand_admin' as UserRole])).toBe(false);
            expect(roleMatches('brand_member', ['super_user' as UserRole])).toBe(false);
        });
    });
});
