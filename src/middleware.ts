import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for route protection and authentication.
 * This runs on the Edge runtime before the request reaches the page.
 */
export function middleware(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl;
    const hostname = request.headers.get('host') || '';

    // Define allowed domains (localhost, main domain)
    // Adjust these based on your actual main domains
    const allowedDomains = ['localhost:3000', 'bakedbot.ai', 'www.bakedbot.ai', 'app.bakedbot.ai', 'bakedbot-for-brands--studio-567050101-bc6e8.us-east4.hosted.app'];

    // Check if the current hostname is a custom domain or subdomain
    const isCustomDomain = !allowedDomains.some(domain => hostname.includes(domain));

    // Extract subdomain if it exists and is not 'www', 'app' etc.
    // e.g. "greenvalley.bakedbot.ai" -> "greenvalley"
    // For now, assuming bakedbot.ai is the root. 
    // If testing on localhost, you might use invalid subdomains like `brand.localhost:3000`.
    const subdomain = hostname.split('.')[0];
    const isSubdomain = hostname.endsWith('.bakedbot.ai') && !['www', 'app'].includes(subdomain);

    // Get session cookie
    const sessionCookie = request.cookies.get('__session');

    // Define protected routes
    const isDashboardRoute = pathname.startsWith('/dashboard');
    const isAccountRoute = pathname.startsWith('/account');
    const isOnboardingRoute = pathname === '/onboarding';
    const isProtectedRoute = isDashboardRoute || isAccountRoute || isOnboardingRoute;

    // CEO dashboard has special super admin access via localStorage
    const isCeoDashboard = pathname.startsWith('/dashboard/ceo');

    // --- DOMAIN ROUTING LOGIC ---
    // If it's a custom domain or valid subdomain, rewrite to the brand's public page
    if (isCustomDomain || isSubdomain) {
        // Rewrite all requests to /[brand]/...
        // We need a way to map hostname to brandId.
        // For subdomains, it's the subdomain itself (e.g. greenvalley).
        // For custom domains, we might need to lookup or pass the full host.
        // Simplified approach: use hostname as the key for now.
        // If it's a subdomain, use the subdomain as the key.
        const brandKey = isSubdomain ? subdomain : hostname;

        // Avoid rewriting API routes or Next.js internals
        if (!pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.includes('.')) {
            // Rewrite to the dynamic route
            return NextResponse.rewrite(new URL(`/${brandKey}${pathname}`, request.url));
        }
    }

    // --- EXISTING AUTH LOGIC (for main app) ---

    // Allow public routes
    if (!isProtectedRoute) {
        return NextResponse.next();
    }

    // Allow CEO dashboard through - super admin auth handled client-side
    if (isCeoDashboard) {
        return NextResponse.next();
    }

    // Redirect to login if no session cookie on other protected routes
    if (!sessionCookie) {
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

    return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - embed (embed scripts)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|embed).*)',
    ],
};
