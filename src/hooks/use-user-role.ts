'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import type { DomainUserProfile } from '@/types/domain';
import { 
    UserRole, 
    isBrandRole, 
    isBrandAdmin, 
    isDispensaryRole, 
    isDispensaryAdmin,
    DASHBOARD_ROLES 
} from '@/types/roles';

// Role is now synonymous with UserRole
export type Role = UserRole;

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
                // Ensure the cookie value is a valid role, otherwise ignore or default
                // In a stricter world we might validation against UserRole values
                setSimulatedRole(match[2] as Role);
            }
        }
    }, []);

    // Final role: simulation (if set) overrides base role
    const role = simulatedRole || baseRole;

    const isRole = useMemo(() => {
        return (checkRole: Role) => role === checkRole;
    }, [role]);

    /**
     * Check if user has any of the specified roles.
     * Handles role hierarchy (e.g., brand_admin matches 'brand')
     */
    const hasAnyRole = useMemo(() => {
        return (roles: Role[]) => {
            if (!role) return false;
            
            // Direct match
            if (roles.includes(role)) return true;
            
            // Check for group matches
            for (const r of roles) {
                // 'brand' matches any brand role
                if (r === 'brand' && isBrandRole(role)) return true;
                // 'dispensary' matches any dispensary role
                if (r === 'dispensary' && isDispensaryRole(role)) return true;
                // brand_member matches brand_admin (admin >= member)
                if (r === 'brand_member' && (role === 'brand_admin' || role === 'brand')) return true;
                // dispensary_staff matches dispensary_admin
                if (r === 'dispensary_staff' && (role === 'dispensary_admin' || role === 'dispensary')) return true;
            }
            
            return false;
        };
    }, [role]);

    const canAccessDashboard = useMemo(() => {
        if (!role) return false;
        // Check if role is in dashboard roles list
        if (DASHBOARD_ROLES.includes(role as UserRole)) return true;
        // Also check brand/dispensary role helpers
        return isBrandRole(role) || isDispensaryRole(role) || role === 'customer' || role === 'super_user' || role === 'super_admin';
    }, [role]);

    const canAccessAdminFeatures = useMemo(() => {
        return realRole === 'super_user' || realRole === 'super_admin';
    }, [realRole]);

    /**
     * Check if user has brand admin privileges (can manage billing, team, etc.)
     */
    const hasBrandAdminAccess = useMemo(() => {
        if (!role) return false;
        return isBrandAdmin(role) || role === 'super_user' || role === 'super_admin';
    }, [role]);

    /**
     * Check if user has dispensary admin privileges
     */
    const hasDispensaryAdminAccess = useMemo(() => {
        if (!role) return false;
        return isDispensaryAdmin(role) || role === 'super_user' || role === 'super_admin';
    }, [role]);

    const defaultRoute = useMemo(() => {
        if (!role) return '/';
        
        // Super users go to playbooks
        if (role === 'super_user' || role === 'super_admin') {
            return '/dashboard/playbooks';
        }
        
        // All brand roles go to dashboard
        if (isBrandRole(role)) {
            return '/dashboard';
        }
        
        // All dispensary roles go to dashboard
        if (isDispensaryRole(role)) {
            return '/dashboard';
        }
        
        // Customer and budtender
        if (role === 'customer' || role === 'budtender') {
            return '/dashboard';
        }
        
        return '/';
    }, [role]);

    const loginRoute = useMemo(() => {
        if (!role) return '/customer-login';
        
        if (isBrandRole(role)) {
            return '/brand-login';
        }
        
        if (isDispensaryRole(role)) {
            return '/dispensary-login';
        }
        
        if (role === 'customer') {
            return '/customer-login';
        }
        
        return '/customer-login';
    }, [role]);

    // Organization IDs from claims
    const brandId = useMemo(() => (user as any)?.brandId || null, [user]);
    // Dispensary users have locationId claim, not dispensaryId
    const locationId = useMemo(() => (user as any)?.locationId || null, [user]);
    const dispensaryId = useMemo(() => locationId || (user as any)?.dispensaryId || null, [user, locationId]);
    const currentOrgId = useMemo(() => (user as any)?.currentOrgId || null, [user]);
    const orgId = useMemo(() => currentOrgId || brandId || locationId || dispensaryId || null, [currentOrgId, brandId, locationId, dispensaryId]);

    return {
        role,
        isRole,
        hasAnyRole,
        canAccessDashboard,
        canAccessAdminFeatures,
        hasBrandAdminAccess,
        hasDispensaryAdminAccess,
        defaultRoute,
        loginRoute,
        isLoading: isUserLoading,
        user,
        // Organization IDs for invitations and scoped actions
        brandId,
        dispensaryId,
        locationId,
        orgId,
        // Helper checks
        isBrandRole: role ? isBrandRole(role) : false,
        isDispensaryRole: role ? isDispensaryRole(role) : false,
        isBrandAdmin: role ? isBrandAdmin(role) : false,
        isDispensaryAdmin: role ? isDispensaryAdmin(role) : false,
        isSuperUser: role === 'super_user' || role === 'super_admin',
    };
}
