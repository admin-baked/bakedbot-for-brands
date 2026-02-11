import { renderHook, waitFor } from '@testing-library/react';
import { useSuperAdmin } from '../use-super-admin';
import { useUser } from '@/firebase/auth/use-user';
import {
    getSuperAdminSession,
    clearSuperAdminSession,
    isSuperAdminEmail,
} from '@/lib/super-admin-config';

jest.mock('@/firebase/auth/use-user', () => ({
    useUser: jest.fn(),
}));

jest.mock('@/lib/super-admin-config', () => ({
    getSuperAdminSession: jest.fn(),
    setSuperAdminSession: jest.fn(),
    clearSuperAdminSession: jest.fn(),
    isSuperAdminEmail: jest.fn(),
}));

describe('useSuperAdmin', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (isSuperAdminEmail as jest.Mock).mockReturnValue(true);
    });

    it('does not grant super admin when there is no authenticated user', async () => {
        (useUser as jest.Mock).mockReturnValue({
            user: null,
            isUserLoading: false,
        });
        (getSuperAdminSession as jest.Mock).mockReturnValue({
            email: 'martez@bakedbot.ai',
            timestamp: Date.now(),
        });

        const { result } = renderHook(() => useSuperAdmin());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isSuperAdmin).toBe(false);
    });

    it('grants super admin when session email matches authenticated user', async () => {
        (useUser as jest.Mock).mockReturnValue({
            user: { email: 'martez@bakedbot.ai' },
            isUserLoading: false,
        });
        (getSuperAdminSession as jest.Mock).mockReturnValue({
            email: 'martez@bakedbot.ai',
            timestamp: Date.now(),
        });

        const { result } = renderHook(() => useSuperAdmin());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isSuperAdmin).toBe(true);
        expect(result.current.superAdminEmail).toBe('martez@bakedbot.ai');
    });

    it('clears stale session when email does not match authenticated user', async () => {
        (useUser as jest.Mock).mockReturnValue({
            user: { email: 'other@bakedbot.ai' },
            isUserLoading: false,
        });
        (getSuperAdminSession as jest.Mock).mockReturnValue({
            email: 'martez@bakedbot.ai',
            timestamp: Date.now(),
        });

        const { result } = renderHook(() => useSuperAdmin());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isSuperAdmin).toBe(false);
        expect(clearSuperAdminSession).toHaveBeenCalledTimes(1);
    });
});
