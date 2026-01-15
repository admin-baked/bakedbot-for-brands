// [AI-THREAD P0-SEC-RBAC-API]
// [Dev1-Claude @ 2025-11-29]:
//   Created server-side role-based authorization middleware.
//   Prevents client-side auth bypass by validating Firebase custom claims on server.
//   Returns 403 Forbidden for unauthorized access with structured logging.

/**
 * Server-Side RBAC Middleware
 *
 * Validates Firebase custom claims (role, brandId, locationId) on the server
 * to prevent client-side authorization bypass.
 *
 * Usage:
 * ```typescript
 * import { requireRole, requireBrandAccess } from '@/middleware/require-role';
 *
 * export async function GET(req: NextRequest) {
 *   const user = await requireRole(req, 'brand');
 *   // ... user is guaranteed to have 'brand' role
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'firebase-admin';
import { logger } from '@/lib/logger';

import { UserRole } from '@/types/roles';

export { UserRole }; // Re-export for compatibility

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  role: UserRole;
  brandId?: string;
  locationId?: string;
}

/**
 * Extract Firebase ID token from Authorization header
 */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Verify Firebase ID token and extract user claims
 */
async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const decodedToken = await auth().verifyIdToken(token);

    const rawRole = decodedToken.role as string;
    // Map legacy Firebase Custom Claims to new standard roles
    // Legacy 'owner', 'executive', 'super_admin' -> 'super_user'
    const role: UserRole = (rawRole === 'owner' || rawRole === 'super_admin' || rawRole === 'executive') 
        ? 'super_user' 
        : (rawRole as UserRole || 'customer');

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      role,
      brandId: decodedToken.brandId as string | undefined,
      locationId: decodedToken.locationId as string | undefined,
    };
  } catch (error: any) {
    logger.error('[P0-SEC-RBAC-API] Token verification failed', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Get authenticated user from request
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  const token = extractToken(req);
  if (!token) {
    return null;
  }

  return await verifyToken(token);
}

/**
 * Require authentication - throws 401 if not authenticated
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    logger.warn('[P0-SEC-RBAC-API] Unauthorized request - no valid token', {
      path: req.nextUrl.pathname,
    });
    throw new UnauthorizedError('Authentication required');
  }

  return user;
}

/**
 * Require specific role - throws 403 if user doesn't have the role
 */
export async function requireRole(
  req: NextRequest,
  requiredRole: UserRole | UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);

  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  // Super User has access to everything
  if (user.role === 'super_user') {
    return user;
  }

  // Check if user has one of the required roles
  if (!allowedRoles.includes(user.role)) {
    logger.error('[P0-SEC-RBAC-API] Forbidden - insufficient role', {
      path: req.nextUrl.pathname,
      userRole: user.role,
      requiredRoles: allowedRoles,
      uid: user.uid,
    });
    throw new ForbiddenError(`Required role: ${allowedRoles.join(' or ')}`);
  }

  return user;
}

/**
 * Require brand access - throws 403 if user can't access the brand
 */
export async function requireBrandAccess(
  req: NextRequest,
  brandId: string
): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);

  // Super User can access all brands
  if (user.role === 'super_user') {
    return user;
  }

  // Brand managers can only access their own brand
  if (user.role === 'brand' && user.brandId === brandId) {
    return user;
  }

  logger.error('[P0-SEC-RBAC-API] Forbidden - cannot access brand', {
    path: req.nextUrl.pathname,
    userRole: user.role,
    userBrandId: user.brandId,
    requestedBrandId: brandId,
    uid: user.uid,
  });
  throw new ForbiddenError(`Cannot access brand ${brandId}`);
}

/**
 * Require dispensary access - throws 403 if user can't access the dispensary
 */
export async function requireDispensaryAccess(
  req: NextRequest,
  dispensaryId: string
): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);

  // Super User can access all dispensaries
  if (user.role === 'super_user') {
    return user;
  }

  // Dispensary managers can only access their own location
  if (user.role === 'dispensary' && user.locationId === dispensaryId) {
    return user;
  }

  logger.error('[P0-SEC-RBAC-API] Forbidden - cannot access dispensary', {
    path: req.nextUrl.pathname,
    userRole: user.role,
    userLocationId: user.locationId,
    requestedDispensaryId: dispensaryId,
    uid: user.uid,
  });
  throw new ForbiddenError(`Cannot access dispensary ${dispensaryId}`);
}

/**
 * Custom error classes for better error handling
 */
export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Helper to handle RBAC errors in API routes
 */
export function handleRBACError(error: any): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: error.message },
      { status: 403 }
    );
  }

  // Generic error
  logger.error('[P0-SEC-RBAC-API] Unexpected RBAC error', {
    error: error.message,
    stack: error.stack,
  });

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
