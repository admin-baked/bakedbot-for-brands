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
});
