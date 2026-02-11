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
        const { role, isLoading: isAuthLoading, user, defaultRoute, loginRoute, hasAnyRole } = useUserRole();
        const [superAdminChecked, setSuperAdminChecked] = useState(false);
        const [isSuperAdmin, setIsSuperAdmin] = useState(false);

        // Check for super admin session and session cookie on mount/update
        useEffect(() => {
            if (isAuthLoading) return;

            const session = getSuperAdminSession();
            let validSuperAdmin = false;

            // Super Admin local session is only valid when tied to the active Firebase user.
            if (session && user?.email) {
                if (session.email === user.email.toLowerCase()) {
                    validSuperAdmin = true;
                } else {
                    console.warn('[withAuth] Security Alert: Super Admin session mismatch. Invalidating.');
                    localStorage.removeItem('bakedbot_superadmin_session');
                }
            }

            setIsSuperAdmin(validSuperAdmin);

            setSuperAdminChecked(true);
        }, [isAuthLoading, user]);

        // Combined loading state - wait for both auth and super admin check
        const isLoading = isAuthLoading || !superAdminChecked;

        // Handle redirects after all checks are complete
        useEffect(() => {
            // Wait for all checks to complete
            if (isLoading) return;

            // Super admins can access any dashboard page once local session is validated
            // against the authenticated Firebase user.
            if (isSuperAdmin) {
                return; // Allow access, no redirect needed
            }

            // Regular auth check for non-super admins
            if (requireAuth && !user && !role) {
                router.push(redirectTo || loginRoute);
                return;
            }

            // Role check for non-super admins (skip if Firebase is still syncing)
            if (allowedRoles && allowedRoles.length > 0 && user) {
                if (!role || !hasAnyRole(allowedRoles)) {
                    router.push(redirectTo || defaultRoute);
                    return;
                }
            }
        }, [isLoading, user, role, router, defaultRoute, loginRoute, isSuperAdmin]);

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

        // Super admins can access only when local session matches authenticated Firebase user
        if (isSuperAdmin) {
            return <Component {...props} />;
        }

        // Regular users need Firebase auth OR a simulated role
        if (requireAuth && !user && !role) {
            return null;
        }

        // Regular users need correct role
        if (allowedRoles && allowedRoles.length > 0 && (!role || !hasAnyRole(allowedRoles))) {
            return null;
        }

        // Authorized - render component
        return <Component {...props} />;
    };
}
