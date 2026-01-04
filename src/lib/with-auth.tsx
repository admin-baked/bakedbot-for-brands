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
        const [hasSessionCookie, setHasSessionCookie] = useState(false);

        // Check for super admin session and session cookie immediately on mount
        useEffect(() => {
            const session = getSuperAdminSession();
            setIsSuperAdmin(!!session);

            // Check for __session_is_active cookie (client-visible flag)
            // We use this because __session is HttpOnly and invisible to document.cookie
            const sessionCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('__session_is_active='));
            setHasSessionCookie(!!sessionCookie);

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

            // If we have a session cookie, Firebase client might still be syncing
            // Wait for auth to fully load before redirecting
            if (hasSessionCookie && !user && isAuthLoading) {
                return; // Still loading, don't redirect yet
            }

            // Regular auth check for non-super admins
            // Allow access if user is present OR if a role is simulated (cookie)
            // Also allow if session cookie exists and Firebase is still syncing
            if (requireAuth && !user && !role && !hasSessionCookie) {
                router.push(redirectTo || loginRoute);
                return;
            }

            // Role check for non-super admins (skip if Firebase is still syncing)
            if (allowedRoles && allowedRoles.length > 0 && user) {
                if (!role || !allowedRoles.includes(role as Role)) {
                    router.push(redirectTo || defaultRoute);
                    return;
                }
            }
        }, [isLoading, user, role, router, defaultRoute, loginRoute, isSuperAdmin, hasSessionCookie, isAuthLoading]);

        // Show loading state while checking both auth and super admin
        if (isLoading) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-background">
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

        // Regular users need Firebase auth OR a simulated role
        if (requireAuth && !user && !role) {
            return null;
        }

        // Regular users need correct role
        if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role as Role))) {
            return null;
        }

        // Authorized - render component
        return <Component {...props} />;
    };
}
