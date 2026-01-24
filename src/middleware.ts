import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCorsHeaders, CORS_PREFLIGHT_HEADERS, isOriginAllowed } from './lib/cors';

/**
 * Middleware for route protection, authentication, CORS, CSRF, and custom domain routing.
 * This runs on the Edge runtime before the request reaches the page.
 *
 * Subdomain Routing (brand.bakedbot.ai):
 * - Extracts subdomain from *.bakedbot.ai hostnames
 * - Rewrites to /{subdomain} to serve brand storefront
 *
 * Custom Domain Routing (mybrand.com):
 * - Checks if hostname is a custom domain (not bakedbot.ai or localhost)
 * - Looks up tenant via API call to avoid Firestore in Edge runtime
 * - Rewrites request to /{tenantId} or /dispensaries/{tenantId}
 *
 * Note: CSRF validation is handled in API routes using the csrf middleware
 * because Edge runtime doesn't support the 'crypto' module needed for validation.
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const origin = request.headers.get('origin');
    const hostname = request.headers.get('host') || '';

    // ============================
    // SUBDOMAIN ROUTING (*.bakedbot.ai)
    // ============================
    // Check for subdomains like ecstaticedibles.bakedbot.ai
    const bakedBotDomains = ['bakedbot.ai', 'bakedbot.dev', 'localhost:9000'];
    const isBakedBotDomain = bakedBotDomains.some(d => hostname.includes(d));

    if (isBakedBotDomain) {
        // Extract subdomain (e.g., "ecstaticedibles" from "ecstaticedibles.bakedbot.ai")
        const hostParts = hostname.split('.');

        // Check if this is a subdomain (not just "bakedbot.ai" or "www.bakedbot.ai")
        // For localhost, check for subdomain.localhost:port pattern
        const isLocalhost = hostname.includes('localhost');
        const hasSubdomain = isLocalhost
            ? hostParts[0] !== 'localhost' && hostParts.length > 1
            : hostParts.length > 2 && hostParts[0] !== 'www';

        if (hasSubdomain) {
            const subdomain = hostParts[0].toLowerCase();

            // Skip reserved subdomains
            const reservedSubdomains = ['www', 'api', 'app', 'dashboard', 'admin', 'mail', 'cdn', 'static'];
            if (!reservedSubdomains.includes(subdomain)) {
                // For subdomain requests, resolve to the brand's storefront
                // If hitting root, rewrite to /{subdomain}
                if (pathname === '/') {
                    const url = request.nextUrl.clone();
                    url.pathname = `/${subdomain}`;
                    return NextResponse.rewrite(url);
                }

                // For other paths, rewrite with subdomain prefix if not already prefixed
                // This allows ecstaticedibles.bakedbot.ai/products to work
                if (!pathname.startsWith(`/${subdomain}`)) {
                    const url = request.nextUrl.clone();
                    url.pathname = `/${subdomain}${pathname}`;
                    return NextResponse.rewrite(url);
                }

                // Pass through with subdomain header for tracking
                const response = NextResponse.next();
                response.headers.set('x-subdomain', subdomain);
                return response;
            }
        }
    }

    // ============================
    // CUSTOM DOMAIN ROUTING (mybrand.com)
    // ============================
    // Check if this is a custom domain request (not bakedbot.ai or localhost)
    const isCustomDomain =
        !hostname.includes('bakedbot.ai') &&
        !hostname.includes('localhost') &&
        !hostname.includes('127.0.0.1') &&
        !hostname.includes('firebaseapp.com') &&
        hostname.includes('.'); // Has a dot = is a domain

    if (isCustomDomain && pathname === '/') {
        // For custom domains hitting root path, we need to look up the tenant
        // We can't use Firestore in Edge, so we call an internal API
        // The API route will handle the lookup and set headers
        // Note: Construct URL with search params directly in the string to ensure they're preserved
        const resolveUrl = new URL(`/api/domain/resolve?hostname=${encodeURIComponent(hostname)}&originalPath=${encodeURIComponent(pathname)}`, request.url);

        // Rewrite to internal resolver - it will handle the redirect
        return NextResponse.rewrite(resolveUrl);
    }

    // For custom domains on other paths, pass through with hostname header
    if (isCustomDomain) {
        const response = NextResponse.next();
        response.headers.set('x-custom-domain', hostname);
        return response;
    }

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

    // CEO dashboard requires server-side role verification
    // This is no longer allowed to be handled client-side via localStorage
    const isCeoDashboard = pathname.startsWith('/dashboard/ceo');

    // Allow public routes
    if (!isProtectedRoute) {
        return NextResponse.next();
    }

    // CRITICAL: CEO dashboard now requires session and server-side role verification
    if (isCeoDashboard) {
        if (!sessionCookie) {
            const url = request.nextUrl.clone();
            url.pathname = '/brand-login';
            url.searchParams.set('redirect', pathname);
            return NextResponse.redirect(url);
        }
        // Note: Actual role verification will happen in the page component via requireUser(['owner'])
    }

    // Redirect to login if no session cookie on other protected routes
    // Exception: If running in simulation mode (for development only)
    const activeSimulation = request.cookies.get('x-simulated-role');
    const isDev = process.env.NODE_ENV === 'development';

    if (!sessionCookie && !activeSimulation) {
        // PRODUCTION ENFORCEMENT: Redirect to appropriate login page
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

    // Development mode: Allow x-simulated-role for testing different personas
    if (!isDev && activeSimulation && !sessionCookie) {
        // Reject simulation mode in production
        console.warn('[AUTH] x-simulated-role rejected in production environment');
        const url = request.nextUrl.clone();
        url.pathname = '/brand-login';
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
        // Subdomain and custom domain routing - match all paths
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
    ],
};
