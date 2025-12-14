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

    const realRole = useMemo(() => {
        if (!user) return null;
        return (user as any).role as Role | null;
    }, [user]);

    const role = useMemo(() => {
        // 1. Check for simulation cookie (Dev/Admin Override)
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(new RegExp('(^| )x-simulated-role=([^;]+)'));
            if (match) {
                return match[2] as Role;
            }
        }

        // 2. Fallback: Get role from user object (Firebase Auth)
        if (user && (user as any).role) {
            return (user as any).role as Role;
        }

        return null;
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
        return realRole === 'owner';
    }, [realRole]);

    const defaultRoute = useMemo(() => {
        switch (role) {
            case 'owner':
                return '/dashboard/playbooks';
            case 'brand':
            case 'dispensary':
                return '/dashboard'; // Brand & Dispensary Console is on Overview
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
