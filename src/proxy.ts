import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCorsHeaders, CORS_PREFLIGHT_HEADERS, isOriginAllowed } from './lib/cors';
import { checkRateLimit } from './middleware/rate-limit';

/**
 * Proxy for route protection, authentication, CORS, CSRF, and custom domain routing.
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
export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const origin = request.headers.get('origin');
    // Use x-forwarded-host in cloud environments (Firebase/Cloud Run), fall back to host
    const hostname = request.headers.get('x-forwarded-host')
        || request.headers.get('host')
        || '';

    // ============================
    // LEAD MAGNET SUBDOMAINS
    // ============================
    // Lead magnets use dedicated custom subdomains pointing to separate backends:
    // - academy.bakedbot.ai → bakedbot-magnets backend
    // - vibe.bakedbot.ai → bakedbot-magnets backend
    // - training.bakedbot.ai → bakedbot-training backend
    //
    // DNS CNAME records route traffic directly to the correct backend.
    // No redirects needed in this proxy.

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

            // Skip reserved subdomains (including lead magnets with custom backends)
            const reservedSubdomains = ['www', 'api', 'app', 'dashboard', 'admin', 'mail', 'cdn', 'static', 'academy', 'vibe', 'training'];
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
    // Check if this is a custom domain request (not bakedbot.ai, localhost, or hosting domains)
    const isCustomDomain =
        !hostname.includes('bakedbot.ai') &&
        !hostname.includes('localhost') &&
        !hostname.includes('127.0.0.1') &&
        !hostname.includes('firebaseapp.com') &&
        !hostname.includes('hosted.app') &&
        !hostname.includes('web.app') &&
        !hostname.includes('appspot.com') &&
        hostname.includes('.'); // Has a dot = is a domain

    if (isCustomDomain && pathname === '/') {
        // For custom domains hitting root path, we need to look up the tenant
        // We can't use Firestore in Edge, so we call an internal API
        try {
            const protocol = request.headers.get('x-forwarded-proto') || 'https';
            const internalHost = request.headers.get('host') || hostname;
            const resolveUrl = `${protocol}://${internalHost}/api/domain/resolve`;

            const resolveResponse = await fetch(resolveUrl, {
                headers: {
                    'x-resolve-hostname': hostname,
                    'x-resolve-path': pathname,
                },
            });

            if (resolveResponse.ok) {
                const data = await resolveResponse.json();
                if (data.success && data.path) {
                    // Rewrite to the resolved path
                    const url = request.nextUrl.clone();
                    url.pathname = data.path;
                    return NextResponse.rewrite(url);
                }
            }

            // If resolution failed, redirect to 404
            return NextResponse.redirect(new URL('https://bakedbot.ai/404'));
        } catch (error) {
            console.error('[Proxy] Custom domain resolution failed:', error);
            return NextResponse.redirect(new URL('https://bakedbot.ai/404'));
        }
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

    // ============================
    // RATE LIMITING (PUBLIC ROUTES)
    // ============================
    // Rate limiting with fail-safe: if it crashes, allow request through
    // Analytics disabled due to Edge Runtime compatibility issues
    if (!isProtectedRoute && !pathname.startsWith('/api/cron/') && !pathname.startsWith('/_next/')) {
        try {
            const ip =
                request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                '127.0.0.1';

            const { success, remaining } = await checkRateLimit(ip);

            if (!success) {
                return new NextResponse('Too Many Requests', {
                    status: 429,
                    headers: {
                        'Retry-After': '60',
                        'X-RateLimit-Remaining': String(remaining || 0),
                    },
                });
            }
        } catch (error) {
            // CRITICAL: If rate limiting crashes, fail OPEN (allow request)
            // This prevents rate limiting from taking down the entire site
            console.error('[Proxy] Rate limit check failed, allowing request:', error);
            // Continue to next middleware step
        }
    }

    // ============================
    // AGE GATE ENFORCEMENT (21+)
    // ============================
    // Check if this is a cannabis menu route requiring age verification
    // Skip age gate for: protected routes, API, signin pages, verify-age itself, main landing page
    const META_PATHS = ['/robots.txt', '/sitemap.xml', '/llm.txt', '/manifest.json', '/favicon.ico', '/sw.js'];
    const isMetaPath = META_PATHS.includes(pathname) || pathname.endsWith('.xml') || pathname.endsWith('.txt');
    // Public executive booking pages — bypass age gate entirely
    const isBookingRoute = pathname.startsWith('/book/');
    const isMenuRoute =
        !isProtectedRoute &&
        !isMetaPath &&
        !isBookingRoute &&
        !pathname.startsWith('/api/') &&
        !pathname.startsWith('/signin') &&
        !pathname.startsWith('/verify-age') &&
        !pathname.startsWith('/_next/') &&
        (
            pathname.match(/^\/[^/]+$/) || // Brand pages like /thrivesyracuse
            pathname.startsWith('/dispensaries/') ||
            (pathname === '/' && isCustomDomain) // Only custom domains at root (brand menus)
        );

    if (isMenuRoute) {
        const ageVerified = request.cookies.get('age_verified');

        // If no age verification cookie, redirect to server-rendered age gate
        // This prevents bypass via JavaScript disabling
        if (!ageVerified) {
            const url = request.nextUrl.clone();
            url.pathname = '/verify-age';
            url.searchParams.set('return_to', pathname + request.nextUrl.search);
            return NextResponse.redirect(url);
        }
    }

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
            // CEO dashboard is a platform-level workspace; send to Super Admin login.
            url.pathname = '/super-admin';
            url.searchParams.set('redirect', pathname + request.nextUrl.search);
            return NextResponse.redirect(url);
        }
        // Note: Actual role verification happens in the /dashboard/ceo layout via requireSuperUser().
    }

    // Redirect to login if no session cookie on other protected routes
    // Exception: If running in simulation mode (for development only)
    const activeSimulation = request.cookies.get('x-simulated-role');
    const isDev = process.env.NODE_ENV === 'development';

    if (!sessionCookie && !activeSimulation) {
        // PRODUCTION ENFORCEMENT: Redirect to unified sign-in for protected internal routes.
        // Avoid sending internal users to the customer login flow by default.
        const loginUrl = '/signin';

        const url = request.nextUrl.clone();
        url.pathname = loginUrl;
        url.searchParams.set('redirect', pathname + request.nextUrl.search);
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

// Configure which routes the proxy should run on
export const config = {
    matcher: [
        // Subdomain and custom domain routing - match all paths
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
    ],
};
