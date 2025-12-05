'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import type { UserProfile } from '@/types/domain';

import { useImpersonation } from '@/context/impersonation-context';

export type Role = 'brand' | 'dispensary' | 'customer' | 'owner';

/**
 * Hook for accessing user role and checking permissions.
 * Provides helper functions for role-based access control.
 */
export function useUserRole() {
    const { user, isUserLoading } = useUser();
    const { impersonatedRole } = useImpersonation();

    const realRole = useMemo(() => {
        if (!user) return null;
        return (user as any).role as Role | null;
    }, [user]);

    const role = useMemo(() => {
        if (!user) return null;
        const actualRole = (user as any).role as Role | null;

        // Only allow owners to impersonate
        if (actualRole === 'owner' && impersonatedRole) {
            return impersonatedRole;
        }

        return actualRole;
    }, [user, impersonatedRole]);

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
        return realRole === 'owner';
    }, [realRole]);

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
