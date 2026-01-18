
import { renderHook } from '@testing-library/react';
import { useUserRole } from '../use-user-role';
import { useUser } from '@/firebase/auth/use-user';

jest.mock('@/firebase/auth/use-user');

describe('useUserRole', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return null role when no user is logged in', () => {
        (useUser as jest.Mock).mockReturnValue({ user: null, isUserLoading: false });
        const { result } = renderHook(() => useUserRole());
        expect(result.current.role).toBe(null);
    });

    it('should return role from user object', () => {
        (useUser as jest.Mock).mockReturnValue({ 
            user: { role: 'brand' }, 
            isUserLoading: false 
        });
        const { result } = renderHook(() => useUserRole());
        expect(result.current.role).toBe('brand');
        expect(result.current.isRole('brand')).toBe(true);
    });

    it('should prioritize simulated role from cookie', () => {
        // Mock document.cookie
        Object.defineProperty(document, 'cookie', {
            writable: true,
            value: 'x-simulated-role=super_user',
        });

        (useUser as jest.Mock).mockReturnValue({ 
            user: { role: 'brand' }, 
            isUserLoading: false 
        });

        const { result } = renderHook(() => useUserRole());
        
        // Wait for useEffect if necessary, but here document.cookie is read on mount
        // Actually, the hook reads it in useEffect, so we might need to wait or trigger it
        expect(result.current.role).toBe('super_user');
    });

    it('should return orgId prioritized correctly', () => {
        (useUser as jest.Mock).mockReturnValue({ 
            user: { 
                currentOrgId: 'org123',
                brandId: 'brand456',
                dispensaryId: 'disp789'
            }, 
            isUserLoading: false 
        });
        const { result } = renderHook(() => useUserRole());
        expect(result.current.orgId).toBe('org123');
        expect(result.current.brandId).toBe('brand456');
    });

    it('should fallback orgId to brandId if currentOrgId is missing', () => {
        (useUser as jest.Mock).mockReturnValue({ 
            user: { 
                brandId: 'brand456',
                dispensaryId: 'disp789'
            }, 
            isUserLoading: false 
        });
        const { result } = renderHook(() => useUserRole());
        expect(result.current.orgId).toBe('brand456');
    });

    it('should fallback orgId to dispensaryId if others are missing', () => {
        (useUser as jest.Mock).mockReturnValue({ 
            user: { 
                dispensaryId: 'disp789'
            }, 
            isUserLoading: false 
        });
        const { result } = renderHook(() => useUserRole());
        expect(result.current.orgId).toBe('disp789');
    });
});
