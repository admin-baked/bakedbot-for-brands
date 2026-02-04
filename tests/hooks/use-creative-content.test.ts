/**
 * Tests for useCreativeContent hook
 *
 * Verifies that the hook correctly resolves tenantId
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

jest.mock('@/hooks/use-brand-id', () => ({
    useBrandId: jest.fn()
}));

jest.mock('@/server/actions/creative-content', () => ({
    getPendingContent: jest.fn(),
    approveContent: jest.fn(),
    requestRevision: jest.fn(),
    generateContent: jest.fn(),
    deleteContent: jest.fn(),
    updateCaption: jest.fn()
}));

import { useUser } from '@/firebase/auth/use-user';
import { useOptionalFirebase } from '@/firebase/use-optional-firebase';
import { useBrandId } from '@/hooks/use-brand-id';
import { getPendingContent } from '@/server/actions/creative-content';
import { useCreativeContent } from '@/hooks/use-creative-content';

const mockUseUser = useUser as jest.Mock;
const mockUseOptionalFirebase = useOptionalFirebase as jest.Mock;
const mockUseBrandId = useBrandId as jest.Mock;
const mockGetPendingContent = getPendingContent as jest.Mock;

describe('useCreativeContent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseOptionalFirebase.mockReturnValue({ firestore: null });
        mockUseBrandId.mockReturnValue({ brandId: null, loading: false });
        mockGetPendingContent.mockResolvedValue([]);
    });

    describe('tenant ID resolution', () => {
        it('should use tenantId claim when available', async () => {
            mockUseUser.mockReturnValue({
                user: { uid: 'user-1', tenantId: 'tenant-123' },
                isUserLoading: false
            });

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockGetPendingContent).toHaveBeenCalledWith('tenant-123');
        });

        it('should use brandId claim for brand role users', async () => {
            mockUseUser.mockReturnValue({
                user: { uid: 'user-2', brandId: 'brand-456', role: 'brand' },
                isUserLoading: false
            });

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockGetPendingContent).toHaveBeenCalledWith('brand-456');
        });

        it('should use locationId claim for dispensary role users', async () => {
            mockUseUser.mockReturnValue({
                user: { uid: 'user-3', locationId: 'loc-789', role: 'dispensary' },
                isUserLoading: false
            });

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockGetPendingContent).toHaveBeenCalledWith('loc-789');
        });

        it('should fallback to useBrandId hook when no claims available', async () => {
            mockUseUser.mockReturnValue({
                user: { uid: 'user-4' },
                isUserLoading: false
            });
            mockUseBrandId.mockReturnValue({ brandId: 'fallback-brand', loading: false });

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockGetPendingContent).toHaveBeenCalledWith('fallback-brand');
        });

        it('should not fetch when no tenantId can be resolved', async () => {
            mockUseUser.mockReturnValue({
                user: { uid: 'user-5' },
                isUserLoading: false
            });
            mockUseBrandId.mockReturnValue({ brandId: null, loading: false });

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockGetPendingContent).not.toHaveBeenCalled();
            expect(result.current.content).toEqual([]);
        });
    });

    describe('priority order', () => {
        it('should prioritize tenantId > brandId > locationId', async () => {
            // User has all three claims - tenantId should win
            mockUseUser.mockReturnValue({
                user: {
                    uid: 'user-6',
                    tenantId: 'tenant-first',
                    brandId: 'brand-second',
                    locationId: 'loc-third'
                },
                isUserLoading: false
            });

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockGetPendingContent).toHaveBeenCalledWith('tenant-first');
        });

        it('should use brandId when tenantId is missing', async () => {
            mockUseUser.mockReturnValue({
                user: {
                    uid: 'user-7',
                    brandId: 'brand-second',
                    locationId: 'loc-third'
                },
                isUserLoading: false
            });

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockGetPendingContent).toHaveBeenCalledWith('brand-second');
        });

        it('should use locationId when tenantId and brandId are missing', async () => {
            mockUseUser.mockReturnValue({
                user: {
                    uid: 'user-8',
                    locationId: 'loc-only'
                },
                isUserLoading: false
            });

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockGetPendingContent).toHaveBeenCalledWith('loc-only');
        });
    });
});
