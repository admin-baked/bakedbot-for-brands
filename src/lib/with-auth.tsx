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
        const { role, isLoading: isAuthLoading, user, defaultRoute, loginRoute } = useUserRole();
        const [superAdminChecked, setSuperAdminChecked] = useState(false);
        const [isSuperAdmin, setIsSuperAdmin] = useState(false);

        // Check for super admin session immediately on mount
        useEffect(() => {
            const session = getSuperAdminSession();
            setIsSuperAdmin(!!session);
            setSuperAdminChecked(true);
        }, []);

        // Combined loading state - wait for both auth and super admin check
        const isLoading = isAuthLoading || !superAdminChecked;

        // Handle redirects after all checks are complete
        useEffect(() => {
            // Wait for all checks to complete
            if (isLoading) return;

            // Super admins can access any dashboard page without Firebase auth
            if (isSuperAdmin) {
                return; // Allow access, no redirect needed
            }

            // Regular auth check for non-super admins
            if (requireAuth && !user) {
                router.push(redirectTo || loginRoute);
                return;
            }

            // Role check for non-super admins
            if (allowedRoles && allowedRoles.length > 0) {
                if (!role || !allowedRoles.includes(role)) {
                    router.push(redirectTo || defaultRoute);
                    return;
                }
            }
        }, [isLoading, user, role, router, defaultRoute, loginRoute, isSuperAdmin]);

        // Show loading state while checking both auth and super admin
        if (isLoading) {
            return (
                <div className="flex min-h-screen items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Verifying access...</p>
                    </div>
                </div>
            );
        }

        // Super admins can access without Firebase auth
        if (isSuperAdmin) {
            return <Component {...props} />;
        }

        // Regular users need Firebase auth
        if (requireAuth && !user) {
            return null;
        }

        // Regular users need correct role
        if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
            return null;
        }

        // Authorized - render component
        return <Component {...props} />;
    };
}
