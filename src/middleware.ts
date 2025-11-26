import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for route protection and authentication.
 * This runs on the Edge runtime before the request reaches the page.
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Get session cookie
    const sessionCookie = request.cookies.get('__session');

    // Define protected routes
    const isDashboardRoute = pathname.startsWith('/dashboard');
    const isAccountRoute = pathname.startsWith('/account');
    const isProtectedRoute = isDashboardRoute || isAccountRoute;

    // Allow public routes
    if (!isProtectedRoute) {
        return NextResponse.next();
    }

    // Redirect to login if no session cookie on protected routes
    if (!sessionCookie) {
        // Determine which login page to redirect to based on the route
        let loginUrl = '/customer-login';

        if (isDashboardRoute) {
            // For dashboard routes, default to brand login
            loginUrl = '/brand-login';
        }

        const url = request.nextUrl.clone();
        url.pathname = loginUrl;
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    // Note: We can't verify the session cookie or decode JWT in Edge middleware
    // without additional setup. Role-based checks will be done client-side
    // in the withAuth HOC and server-side in page components.

    return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
    matcher: [
        '/dashboard/:path*',
        '/account/:path*',
    ],
};
