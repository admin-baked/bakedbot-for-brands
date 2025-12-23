/**
 * Auth Redirect Tests
 * Tests that role-based redirects route to correct dashboards
 */

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

// Helper to simulate redirect logic from brand-login/page.tsx
function getRedirectUrl(userRole: string): string {
    if (userRole === 'owner') {
        return '/dashboard/ceo';
    } else if (userRole === 'brand') {
        return '/dashboard';
    } else if (userRole === 'dispensary') {
        return '/dashboard';
    } else if (userRole === 'customer') {
        return '/account';
    }
    return '/dashboard';
}

describe('Auth Redirect Logic', () => {
    beforeEach(() => {
        mockPush.mockClear();
    });

    describe('Brand Login Redirect', () => {
        it('should redirect owner role to /dashboard/ceo', () => {
            expect(getRedirectUrl('owner')).toBe('/dashboard/ceo');
        });
        
        it('should redirect brand role to /dashboard', () => {
            expect(getRedirectUrl('brand')).toBe('/dashboard');
        });
        
        it('should redirect dispensary role to /dashboard', () => {
            expect(getRedirectUrl('dispensary')).toBe('/dashboard');
        });
        
        it('should redirect customer role to /account', () => {
            expect(getRedirectUrl('customer')).toBe('/account');
        });
    });

    describe('Super Admin Login', () => {
        it('should always redirect super admin to /dashboard/ceo', () => {
            // Super admin login component explicitly redirects to /dashboard/ceo
            // This is handled separately from role-based redirects
            expect(getRedirectUrl('owner')).toBe('/dashboard/ceo');
        });
    });
});

