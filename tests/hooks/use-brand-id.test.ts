/**
 * Tests for useBrandId hook
 *
 * Verifies that the hook correctly resolves brandId/locationId
 * for both brand and dispensary role users.
 */

import { renderHook, waitFor } from '@testing-library/react';

// Mock dependencies
jest.mock('@/firebase/auth/use-user', () => ({
    useUser: jest.fn()
}));

jest.mock('@/firebase/use-optional-firebase', () => ({
    useOptionalFirebase: jest.fn()
}));

import { useUser } from '@/firebase/auth/use-user';
import { useOptionalFirebase } from '@/firebase/use-optional-firebase';
import { useBrandId } from '@/hooks/use-brand-id';

const mockUseUser = useUser as jest.Mock;
const mockUseOptionalFirebase = useOptionalFirebase as jest.Mock;

describe('useBrandId', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseOptionalFirebase.mockReturnValue({ firestore: null });
    });

    describe('when user is loading', () => {
        it('should return loading state', () => {
            mockUseUser.mockReturnValue({ user: null, isUserLoading: true });

            const { result } = renderHook(() => useBrandId());

            expect(result.current.loading).toBe(true);
            expect(result.current.brandId).toBe(null);
        });
    });

    describe('when user is not authenticated', () => {
        it('should return null brandId', async () => {
            mockUseUser.mockReturnValue({ user: null, isUserLoading: false });

            const { result } = renderHook(() => useBrandId());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            expect(result.current.brandId).toBe(null);
        });
    });

    describe('for brand role users', () => {
        it('should resolve brandId from custom claims', async () => {
            mockUseUser.mockReturnValue({
                user: { uid: 'user-123', brandId: 'brand-456', role: 'brand' },
                isUserLoading: false
            });

            const { result } = renderHook(() => useBrandId());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            expect(result.current.brandId).toBe('brand-456');
        });
    });

    describe('for dispensary role users', () => {
        it('should resolve locationId from custom claims', async () => {
            mockUseUser.mockReturnValue({
                user: { uid: 'user-789', locationId: 'loc-abc', role: 'dispensary' },
                isUserLoading: false
            });

            const { result } = renderHook(() => useBrandId());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            expect(result.current.brandId).toBe('loc-abc');
        });

        it('should prefer brandId over locationId if both present', async () => {
            mockUseUser.mockReturnValue({
                user: { uid: 'user-999', brandId: 'brand-111', locationId: 'loc-222', role: 'dispensary' },
                isUserLoading: false
            });

            const { result } = renderHook(() => useBrandId());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            // brandId takes precedence (first claim check)
            expect(result.current.brandId).toBe('brand-111');
        });
    });

    describe('for budtender role users', () => {
        it('should resolve locationId for budtenders', async () => {
            mockUseUser.mockReturnValue({
                user: { uid: 'budtender-1', locationId: 'dispensary-loc', role: 'budtender' },
                isUserLoading: false
            });

            const { result } = renderHook(() => useBrandId());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            expect(result.current.brandId).toBe('dispensary-loc');
        });
    });
});
