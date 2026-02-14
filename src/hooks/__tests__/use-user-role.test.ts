import { renderHook, waitFor } from '@testing-library/react';
import { useUserRole } from '../use-user-role';
import { useUser } from '@/firebase/auth/use-user';

jest.mock('@/firebase/auth/use-user', () => ({
    useUser: jest.fn(),
}));

describe('useUserRole', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
        jest.clearAllMocks();
        document.cookie = 'x-simulated-role=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

        (useUser as jest.Mock).mockReturnValue({
            user: { role: 'customer', email: 'test@example.com' },
            isUserLoading: false,
        });
    });

    afterEach(() => {
        Object.defineProperty(process.env, 'NODE_ENV', {
            value: originalNodeEnv,
            configurable: true,
        });
    });

    it('returns null role when no user is logged in', () => {
        (useUser as jest.Mock).mockReturnValue({
            user: null,
            isUserLoading: false,
        });

        const { result } = renderHook(() => useUserRole());
        expect(result.current.role).toBeNull();
    });

    it('returns role from user object', () => {
        (useUser as jest.Mock).mockReturnValue({
            user: { role: 'brand', email: 'brand@example.com' },
            isUserLoading: false,
        });

        const { result } = renderHook(() => useUserRole());
        expect(result.current.role).toBe('brand');
        expect(result.current.isRole('brand')).toBe(true);
    });

    it('maps legacy super_admin as super_user for hasAnyRole checks', () => {
        (useUser as jest.Mock).mockReturnValue({
            user: { role: 'super_admin', email: 'admin@example.com' },
            isUserLoading: false,
        });

        const { result } = renderHook(() => useUserRole());
        expect(result.current.hasAnyRole(['super_user'])).toBe(true);
    });

    it('prioritizes orgId as currentOrgId -> brandId -> locationId', () => {
        (useUser as jest.Mock).mockReturnValue({
            user: {
                role: 'brand',
                email: 'brand@example.com',
                currentOrgId: 'org-123',
                brandId: 'brand-456',
                locationId: 'loc-789',
            },
            isUserLoading: false,
        });

        const { result } = renderHook(() => useUserRole());
        expect(result.current.orgId).toBe('org-123');
    });

    it('accepts valid simulated role cookie in development', async () => {
        Object.defineProperty(process.env, 'NODE_ENV', {
            value: 'development',
            configurable: true,
        });
        document.cookie = 'x-simulated-role=brand_admin';

        const { result } = renderHook(() => useUserRole());

        await waitFor(() => {
            expect(result.current.role).toBe('brand_admin');
        });
    });

    it('ignores invalid simulated role cookie in development', async () => {
        Object.defineProperty(process.env, 'NODE_ENV', {
            value: 'development',
            configurable: true,
        });
        document.cookie = 'x-simulated-role=hacker';

        const { result } = renderHook(() => useUserRole());

        await waitFor(() => {
            expect(result.current.role).toBe('customer');
        });
    });

    describe('loginRoute', () => {
        it('returns /signin for users with no role', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: null,
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.loginRoute).toBe('/signin');
        });

        it('returns /brand-login for brand roles', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: { role: 'brand_admin', email: 'brand@example.com' },
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.loginRoute).toBe('/brand-login');
        });

        it('returns /dispensary-login for dispensary roles', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: { role: 'dispensary_admin', email: 'dispensary@example.com' },
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.loginRoute).toBe('/dispensary-login');
        });

        it('returns /customer-login for customer role', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: { role: 'customer', email: 'customer@example.com' },
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.loginRoute).toBe('/customer-login');
        });

        it('returns /super-admin for super_user role', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: { role: 'super_user', email: 'admin@example.com' },
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.loginRoute).toBe('/super-admin');
        });
    });

    describe('defaultRoute', () => {
        it('returns / for users with no role', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: null,
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.defaultRoute).toBe('/');
        });

        it('returns /dashboard/ceo?tab=boardroom for super_user', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: { role: 'super_user', email: 'admin@example.com' },
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.defaultRoute).toBe('/dashboard/ceo?tab=boardroom');
        });

        it('returns /dashboard for brand roles', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: { role: 'brand_admin', email: 'brand@example.com' },
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.defaultRoute).toBe('/dashboard');
        });

        it('returns /dashboard for dispensary roles', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: { role: 'dispensary_admin', email: 'dispensary@example.com' },
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.defaultRoute).toBe('/dashboard');
        });

        it('returns /dashboard for customer role', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: { role: 'customer', email: 'customer@example.com' },
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.defaultRoute).toBe('/dashboard');
        });
    });

    describe('canAccessDashboard', () => {
        it('returns false when no role is set', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: null,
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.canAccessDashboard).toBe(false);
        });

        it('returns true for dispensary_admin role', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: { role: 'dispensary_admin', email: 'dispensary@example.com' },
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.canAccessDashboard).toBe(true);
        });

        it('returns true for brand_admin role', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: { role: 'brand_admin', email: 'brand@example.com' },
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.canAccessDashboard).toBe(true);
        });

        it('returns true for customer role', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: { role: 'customer', email: 'customer@example.com' },
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());
            expect(result.current.canAccessDashboard).toBe(true);
        });
    });

    describe('Thrive Syracuse user regression test', () => {
        it('dispensary_admin with orgId should redirect to /dashboard not /customer-login', () => {
            (useUser as jest.Mock).mockReturnValue({
                user: {
                    role: 'dispensary_admin',
                    email: 'thrivesyracuse@bakedbot.ai',
                    orgId: 'org_thrive_syracuse',
                    locationId: 'org_thrive_syracuse',
                    planId: 'empire',
                },
                isUserLoading: false,
            });

            const { result } = renderHook(() => useUserRole());

            // Should have dispensary_admin role
            expect(result.current.role).toBe('dispensary_admin');

            // Should be recognized as dispensary role
            expect(result.current.isDispensaryRole).toBe(true);

            // Should redirect to dispensary login page
            expect(result.current.loginRoute).toBe('/dispensary-login');

            // Should redirect to dashboard after login
            expect(result.current.defaultRoute).toBe('/dashboard');

            // Should have dashboard access
            expect(result.current.canAccessDashboard).toBe(true);

            // Should have dispensary admin access
            expect(result.current.hasDispensaryAdminAccess).toBe(true);

            // Should have correct orgId
            expect(result.current.orgId).toBe('org_thrive_syracuse');
        });
    });
});
