'use client';

import { useEffect, ComponentType, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserRole, type Role } from '@/hooks/use-user-role';
import { getSuperAdminSession } from '@/lib/super-admin-config';
import { Loader2 } from 'lucide-react';

interface WithAuthOptions {
    allowedRoles?: Role[];
    redirectTo?: string;
    requireAuth?: boolean;
}

/**
 * Higher-order component for protecting routes with authentication and role-based access control.
 * Also allows super admin access via localStorage session.
 * 
 * @param Component - The component to wrap
 * @param options - Configuration options for authentication
 * @returns Protected component that enforces authentication and role requirements
 * 
 * @example
 * ```tsx
 * export default withAuth(DashboardPage, { 
 *   allowedRoles: ['brand', 'dispensary', 'owner'] 
 * });
 * ```
 */
export function withAuth<P extends object>(
    Component: ComponentType<P>,
    options: WithAuthOptions = {}
) {
    const {
        allowedRoles,
        redirectTo,
        requireAuth = true,
    } = options;

    return function ProtectedComponent(props: P) {
        const router = useRouter();
        const pathname = usePathname();
        const { role, isLoading, user, defaultRoute, loginRoute } = useUserRole();
        const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

        // Check for super admin session on mount
        useEffect(() => {
            const session = getSuperAdminSession();
            setIsSuperAdmin(!!session);
        }, []);

        useEffect(() => {
            // Wait for auth to initialize and super admin check
            if (isLoading || isSuperAdmin === null) return;

            // Super admins can access the CEO dashboard without Firebase auth
            if (isSuperAdmin && pathname?.startsWith('/dashboard/ceo')) {
                return; // Allow access
            }

            // Check if authentication is required
            if (requireAuth && !user && !isSuperAdmin) {
                // Redirect to login if not authenticated
                router.push(redirectTo || loginRoute);
                return;
            }

            // Check if user has required role (not applicable for super admins on CEO page)
            if (allowedRoles && allowedRoles.length > 0 && !isSuperAdmin) {
                if (!role || !allowedRoles.includes(role)) {
                    // User doesn't have required role, redirect to their default route
                    router.push(redirectTo || defaultRoute);
                    return;
                }
            }
        }, [isLoading, user, role, router, defaultRoute, loginRoute, isSuperAdmin, pathname]);

        // Show loading state while checking authentication
        if (isLoading || isSuperAdmin === null) {
            return (
                <div className="flex min-h-screen items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Verifying access...</p>
                    </div>
                </div>
            );
        }

        // Super admins can access CEO dashboard
        if (isSuperAdmin && pathname?.startsWith('/dashboard/ceo')) {
            return <Component {...props} />;
        }

        // Don't render if not authenticated or doesn't have required role
        if (requireAuth && !user && !isSuperAdmin) {
            return null;
        }

        if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role)) && !isSuperAdmin) {
            return null;
        }

        // User is authenticated and has required role, render component
        return <Component {...props} />;
    };
}
