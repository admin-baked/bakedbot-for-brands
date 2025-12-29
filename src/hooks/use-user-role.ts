'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import type { DomainUserProfile } from '@/types/domain';

export type Role = 'brand' | 'dispensary' | 'customer' | 'owner' | 'super_admin';

/**
 * Hook for accessing user role and checking permissions.
 * Provides helper functions for role-based access control.
 * 
 * NOTE: Simulation cookie is read client-side only (after hydration)
 * to avoid React hydration mismatch errors.
 */
export function useUserRole() {
    const { user, isUserLoading } = useUser();

    const realRole = useMemo(() => {
        if (!user) return null;
        return (user as any).role as Role | null;
    }, [user]);

    // Base role from user object (safe for SSR)
    const baseRole = useMemo(() => {
        if (user && (user as any).role) {
            return (user as any).role as Role;
        }
        return null;
    }, [user]);

    // Simulated role from cookie (client-side only, after hydration)
    const [simulatedRole, setSimulatedRole] = useState<Role | null>(null);
    
    useEffect(() => {
        // Only check cookie on client after hydration
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(new RegExp('(^| )x-simulated-role=([^;]+)'));
            if (match) {
                setSimulatedRole(match[2] as Role);
            }
        }
    }, []);

    // Final role: simulation (if set) overrides base role
    const role = simulatedRole || baseRole;

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
            case 'customer':
                return '/dashboard'; // All dashboards on Overview now
            case 'owner':
                return '/dashboard/playbooks';
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
