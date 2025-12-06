import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCorsHeaders, CORS_PREFLIGHT_HEADERS, isOriginAllowed } from './lib/cors';

/**
 * Middleware for route protection, authentication, CORS, and CSRF.
 * This runs on the Edge runtime before the request reaches the page.
 *
 * Note: CSRF validation is handled in API routes using the csrf middleware
 * because Edge runtime doesn't support the 'crypto' module needed for validation.
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const origin = request.headers.get('origin');

    // Handle CORS preflight requests for API routes
    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
        if (isOriginAllowed(origin)) {
            return new NextResponse(null, {
                status: 204,
                headers: {
                    ...getCorsHeaders(origin),
                    ...CORS_PREFLIGHT_HEADERS,
                },
            });
        }
        // Reject CORS preflight from unauthorized origins
        return new NextResponse(null, { status: 403 });
    }

    // Get session cookie
    const sessionCookie = request.cookies.get('__session');

    // Define protected routes
    const isDashboardRoute = pathname.startsWith('/dashboard');
    const isAccountRoute = pathname.startsWith('/account');
    const isOnboardingRoute = pathname === '/onboarding';
    const isProtectedRoute = isDashboardRoute || isAccountRoute || isOnboardingRoute;

    // CEO dashboard has special super admin access via localStorage
    const isCeoDashboard = pathname.startsWith('/dashboard/ceo');

    // Allow public routes
    if (!isProtectedRoute) {
        return NextResponse.next();
    }

    // Allow CEO dashboard through - super admin auth handled client-side
    if (isCeoDashboard) {
        return NextResponse.next();
    }

    // Redirect to login if no session cookie on other protected routes
    // Exception: If running in simulation mode (client-side auth will verify role/token)
    const activeSimulation = request.cookies.get('x-simulated-role');

    if (!sessionCookie && !activeSimulation) {
        // Determine which login page to redirect to based on the route
        let loginUrl = '/customer-login';

        if (isDashboardRoute || isOnboardingRoute) {
            // For dashboard and onboarding routes, default to brand login
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

    // Add CORS headers to API responses
    if (pathname.startsWith('/api/')) {
        const response = NextResponse.next();
        const corsHeaders = getCorsHeaders(origin);
        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
        return response;
    }

    return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
    matcher: [
        '/api/:path*',
        '/dashboard/:path*',
        '/account/:path*',
        '/onboarding',
    ],
};
