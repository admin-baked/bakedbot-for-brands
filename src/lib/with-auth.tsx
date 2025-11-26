'use client';

import { useEffect, ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole, type Role } from '@/hooks/use-user-role';
import { Loader2 } from 'lucide-react';

interface WithAuthOptions {
    allowedRoles?: Role[];
    redirectTo?: string;
    requireAuth?: boolean;
}

/**
 * Higher-order component for protecting routes with authentication and role-based access control.
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
        const { role, isLoading, user, defaultRoute, loginRoute } = useUserRole();

        useEffect(() => {
            // Wait for auth to initialize
            if (isLoading) return;

            // Check if authentication is required
            if (requireAuth && !user) {
                // Redirect to login if not authenticated
                router.push(redirectTo || loginRoute);
                return;
            }

            // Check if user has required role
            if (allowedRoles && allowedRoles.length > 0) {
                if (!role || !allowedRoles.includes(role)) {
                    // User doesn't have required role, redirect to their default route
                    router.push(redirectTo || defaultRoute);
                    return;
                }
            }
        }, [isLoading, user, role, router, defaultRoute, loginRoute]);

        // Show loading state while checking authentication
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

        // Don't render if not authenticated or doesn't have required role
        if (requireAuth && !user) {
            return null;
        }

        if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
            return null;
        }

        // User is authenticated and has required role, render component
        return <Component {...props} />;
    };
}
