'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import type { UserProfile } from '@/types/domain';

export type Role = 'brand' | 'dispensary' | 'customer' | 'owner';

/**
 * Hook for accessing user role and checking permissions.
 * Provides helper functions for role-based access control.
 */
export function useUserRole() {
    const { user, isUserLoading } = useUser();

    const role = useMemo(() => {
        if (!user) return null;
        // Role is stored in custom claims on the user token
        return (user as any).role as Role | null;
    }, [user]);

    const isRole = useMemo(() => {
        return (checkRole: Role) => role === checkRole;
    }, [role]);

    const hasAnyRole = useMemo(() => {
        return (roles: Role[]) => {
            if (!role) return false;
            return roles.includes(role);
        };
    }, [role]);

    const canAccessDashboard = useMemo(() => {
        return role === 'brand' || role === 'dispensary' || role === 'owner';
    }, [role]);

    const canAccessAdminFeatures = useMemo(() => {
        return role === 'owner';
    }, [role]);

    const defaultRoute = useMemo(() => {
        switch (role) {
            case 'brand':
            case 'dispensary':
            case 'owner':
                return '/dashboard';
            case 'customer':
                return '/account';
            default:
                return '/';
        }
    }, [role]);

    const loginRoute = useMemo(() => {
        switch (role) {
            case 'brand':
                return '/brand-login';
            case 'dispensary':
                return '/dispensary-login';
            case 'customer':
                return '/customer-login';
            default:
                return '/customer-login';
        }
    }, [role]);

    return {
        role,
        isRole,
        hasAnyRole,
        canAccessDashboard,
        canAccessAdminFeatures,
        defaultRoute,
        loginRoute,
        isLoading: isUserLoading,
        user,
    };
}
