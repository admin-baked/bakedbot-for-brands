/**
 * CSRF Protection Middleware for API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrfToken } from '@/lib/csrf';
import { logger } from '@/lib/monitoring';

/**
 * HTTP methods that require CSRF protection (state-changing operations)
 */
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * Routes that should be exempt from CSRF protection
 * (e.g., public webhooks that use other authentication methods)
 */
const EXEMPT_ROUTES = [
  '/api/webhooks/stripe',
  '/api/webhooks/canpay',
  '/api/webhooks/authnet',
  '/api/auth/session', // Session creation uses Firebase auth
  '/api/auth/logout',
];

/**
 * Check if a route is exempt from CSRF protection
 */
function isExemptRoute(pathname: string): boolean {
  return EXEMPT_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Verify CSRF token for state-changing requests
 * @param request - Next.js request object
 * @returns true if valid or not required, false if invalid
 */
export async function validateCsrf(request: NextRequest): Promise<boolean> {
  const { pathname } = request.nextUrl;

  // Skip CSRF check for exempt routes
  if (isExemptRoute(pathname)) {
    return true;
  }

  // Only check state-changing methods
  if (!PROTECTED_METHODS.includes(request.method)) {
    return true;
  }

  // Skip in development for easier testing (but log a warning)
  if (process.env.NODE_ENV === 'development') {
    logger.warn('CSRF check skipped in development', {
      path: pathname,
      method: request.method,
    });
    return true;
  }

  const csrfToken = request.headers.get('x-csrf-token');

  const isValid = await verifyCsrfToken(csrfToken);

  if (!isValid) {
    logger.warn('CSRF token validation failed', {
      path: pathname,
      method: request.method,
      hasToken: !!csrfToken,
    });
  }

  return isValid;
}

/**
 * Middleware to require CSRF token for protected routes
 * Returns 403 response if CSRF validation fails
 */
export async function requireCsrf(request: NextRequest): Promise<NextResponse | null> {
  const isValid = await validateCsrf(request);

  if (!isValid) {
    return NextResponse.json(
      {
        error: 'Invalid or missing CSRF token',
        code: 'CSRF_VALIDATION_FAILED',
      },
      { status: 403 }
    );
  }

  return null; // Continue to next middleware/handler
}
