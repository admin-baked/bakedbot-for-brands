
'use server';

import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/firebase/server-client';
import { DecodedIdToken } from 'firebase-admin/auth';
import { SUPER_ADMIN_EMAILS } from '@/lib/super-admin-config';
import { logger } from '@/lib/logger';
import {
  UserRole,
  isBrandRole,
  isDispensaryRole,
  BRAND_ALL_ROLES,
  DISPENSARY_ALL_ROLES
} from '@/types/roles';

// Re-export Role type for backward compatibility
export type Role = UserRole;

/**
 * Check if a user's role matches one of the required roles.
 * Handles role hierarchy (e.g., brand_admin can act as brand_member)
 */
function roleMatches(userRole: string, requiredRoles: Role[]): boolean {
  // Direct match
  if (requiredRoles.includes(userRole as Role)) {
    return true;
  }

  // Check for role group matches
  for (const required of requiredRoles) {
    // If 'brand' is required, accept any brand role (admin or member)
    if (required === 'brand' && isBrandRole(userRole)) {
      return true;
    }
    // If 'dispensary' is required, accept any dispensary role
    if (required === 'dispensary' && isDispensaryRole(userRole)) {
      return true;
    }
    // If 'brand_member' is required, brand_admin also qualifies
    if (required === 'brand_member' && (userRole === 'brand_admin' || userRole === 'brand')) {
      return true;
    }
    // If 'dispensary_staff' is required, dispensary_admin also qualifies
    if (required === 'dispensary_staff' && (userRole === 'dispensary_admin' || userRole === 'dispensary')) {
      return true;
    }
  }

  return false;
}

/**
 * A server-side utility to require an authenticated user and optionally enforce roles.
 * This function centralizes session verification for all Server Actions.
 * In development, it uses a bypass to return a default persona.
 *
 * @param requiredRoles - An optional array of roles. If provided, the user must have one of these roles.
 *                        Supports role groups: 'brand' matches brand_admin/brand_member/brand
 * @returns The decoded token of the authenticated user.
 * @throws An error if the user is not authenticated or does not have the required role.
 */
export async function requireUser(requiredRoles?: Role[]): Promise<DecodedIdToken> {
  // --- PRODUCTION LOGIC ---
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;

  if (!sessionCookie) {
    // --- DEV BYPASS ---
    // In development, allow access if x-simulated-role is present, even without a real session.
    // This allows testing different personas without full Firebase Auth flow.
    const simulatedRole = cookieStore.get('x-simulated-role')?.value as Role | undefined;

    // Check if we are strictly in development mode
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev && simulatedRole) {
      // Double-check: ensure this NEVER runs in production
      if (process.env.NODE_ENV !== 'development') {
        throw new Error('SECURITY: Dev bypass attempted in non-development environment');
      }
      // Return a mock token for development
      const mockToken: any = {
        uid: 'dev-user-id',
        email: 'dev@bakedbot.ai',
        email_verified: true,
        role: simulatedRole,
        // Add other required properties as needed
      };

      // Apply role check for the mock token
      if (requiredRoles && requiredRoles.length > 0) {
        if (!roleMatches(simulatedRole, requiredRoles)) {
          throw new Error(`Forbidden: Dev user (role=${simulatedRole}) missing required permissions.`);
        }
      }
      return mockToken;
    }

    logger.warn('[AUTH] No session cookie — redirecting to login');
    redirect('/login');
  }

  const { auth } = await createServerClient();
  const isDevOrTest = process.env.NODE_ENV !== 'production';

  let decodedToken;
  try {
    // MOCK BYPASS for local development
    if (isDevOrTest && sessionCookie.startsWith('mock_session_')) {
      console.warn('[AUTH_BYPASS] Using synthetic token for mock session');
      decodedToken = {
        uid: `mock-user-${sessionCookie.split('_')[2]}`,
        email: 'dev-user@bakedbot.ai',
        email_verified: true,
        // No role by default for mock sessions to trigger onboarding/role setup
      } as any as DecodedIdToken;
    } else {
      decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    }
  } catch (error) {
    logger.warn('[AUTH] Session cookie verification failed — redirecting to login', { error: String(error) });
    redirect('/login');
  }

  // --- ROLE NORMALIZATION (Legacy Custom Claims) ---
  // Some older accounts still have legacy platform-level roles in custom claims.
  // Normalize them here so server actions/pages don't incorrectly redirect to login.
  const rawRole = (decodedToken.role as string | undefined) || undefined;
  const normalizedPlatformRole =
    rawRole && ['owner', 'executive', 'superuser', 'admin'].includes(rawRole)
      ? 'super_user'
      : rawRole;
  if (normalizedPlatformRole && normalizedPlatformRole !== rawRole) {
    decodedToken = { ...decodedToken, role: normalizedPlatformRole } as any as DecodedIdToken;
  }

  // --- ROLE SIMULATION LOGIC ---
  // Only allow simulation if the REAL user has the 'super_user' role.
  if (decodedToken.role === 'super_user' || decodedToken.role === 'super_admin') {
    const simulatedRole = cookieStore.get('x-simulated-role')?.value as Role | undefined;
    if (simulatedRole && ['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'customer'].includes(simulatedRole)) {
      // AUDIT: Log role simulation for security tracking
      logger.warn('[AUTH] Role simulation used', {
        realUserId: decodedToken.uid,
        realRole: decodedToken.role,
        simulatedRole,
        timestamp: new Date().toISOString(),
      });
      // Override the role in the returned token
      decodedToken = { ...decodedToken, role: simulatedRole };

      // If simulating a brand role, inject a demo brand ID to prevent "You are not associated with a brand" errors
      if (isBrandRole(simulatedRole)) {
        decodedToken = { ...decodedToken, brandId: 'default' };
      }
      // Note: We are NOT modifying the actual session cookie, just the decoded object for this request context.
    }
  }

  // --- ORG IMPERSONATION LOGIC (Super User Only) ---
  // Allow super users to impersonate a specific org to test/support that org's data
  if (decodedToken.role === 'super_user' || decodedToken.role === 'super_admin') {
    const impersonatedOrgId = cookieStore.get('x-impersonated-org-id')?.value;
    if (impersonatedOrgId) {
      try {
        // Always apply basic impersonation context regardless of whether
        // the organizations doc exists (it may not for new orgs).
        decodedToken = {
          ...decodedToken,
          currentOrgId: impersonatedOrgId,
          orgId: impersonatedOrgId,
        };

        const { firestore } = await createServerClient();
        const orgDoc = await firestore.collection('organizations').doc(impersonatedOrgId).get();
        if (orgDoc.exists) {
          const org = orgDoc.data() as any;
          if (org) {
            decodedToken = {
              ...decodedToken,
              brandId: org.type === 'brand' ? impersonatedOrgId : null,
            };

            // If dispensary, try to get first location
            if (org.type === 'dispensary') {
              const locSnap = await firestore
                .collection('locations')
                .where('orgId', '==', impersonatedOrgId)
                .limit(1)
                .get();
              if (!locSnap.empty) {
                decodedToken = { ...decodedToken, locationId: locSnap.docs[0].id };
              }
            }
          }
        }
      } catch (error) {
        console.error('[AUTH_WARN] Failed to fetch impersonated org:', error);
        // Non-fatal — basic impersonation (currentOrgId/orgId) already applied above
      }
    }
  }

  // Determine user details
  const userRole = (decodedToken.role as string) || null;
  const userEmail = (decodedToken.email as string)?.toLowerCase() || '';
  const isSuperAdminByEmail = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === userEmail);
  const isSuperUserRole = userRole === 'super_user' || userRole === 'super_admin';

  // --- GLOBAL APPROVAL CHECK ---
  // Block access if the account is pending/rejected, UNLESS they are a super admin.
  if (!isSuperAdminByEmail && !isSuperUserRole) {
    const approvalStatus = decodedToken.approvalStatus;
    if (approvalStatus === 'pending') {
      logger.warn('[AUTH] Account pending approval — redirecting to login', { uid: decodedToken.uid });
      redirect('/login');
    }
    if (approvalStatus === 'rejected') {
      logger.warn('[AUTH] Account rejected — redirecting to login', { uid: decodedToken.uid });
      redirect('/login');
    }
  }

  // --- ROLE CHECK (Optional) ---
  if (requiredRoles && requiredRoles.length > 0) {
    // Super admins (by email or role) bypass role checks
    if (!isSuperAdminByEmail && !isSuperUserRole) {
      if (!userRole || !roleMatches(userRole, requiredRoles)) {
        logger.warn('[AUTH] Role mismatch — redirecting to dashboard', { uid: decodedToken.uid, userRole, requiredRoles });
        redirect('/dashboard');
      }
    }
  }

  return decodedToken;
}

/**
 * Check if the current user is a Super Admin
 * @returns true if the user has super_user/super_admin role OR is in the super admin email whitelist
 */
export async function isSuperUser(): Promise<boolean> {
  try {
    const user = await requireUser();
    const role = (user.role as string) || '';
    const email = (user.email as string)?.toLowerCase() || '';

    // Check 1: Role-based access
    if (role === 'super_user' || role === 'super_admin') {
      return true;
    }

    // Check 2: Email whitelist (using static import)
    if (email && SUPER_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check if the current user is a brand admin (owner-level access)
 */
export async function isBrandAdmin(): Promise<boolean> {
  try {
    const user = await requireUser();
    const role = (user.role as string) || '';
    return ['brand_admin', 'brand', 'super_user', 'super_admin'].includes(role);
  } catch {
    return false;
  }
}

/**
 * Check if the current user has any brand role
 */
export async function hasBrandRole(): Promise<boolean> {
  try {
    const user = await requireUser();
    const role = (user.role as string) || '';
    return isBrandRole(role) || role === 'super_user' || role === 'super_admin';
  } catch {
    return false;
  }
}

/**
 * Require the current user to be a Super User (CEO/CTO level access).
 * Use this to protect sensitive operations like agent execution, bash commands, etc.
 * @throws Error if user is not authenticated or not a super user
 * @returns The decoded token of the authenticated super user
 */
export async function requireSuperUser(): Promise<DecodedIdToken> {
  const user = await requireUser();
  const role = (user.role as string) || '';
  const email = (user.email as string)?.toLowerCase() || '';

  // Check 1: Role-based access
  if (role === 'super_user' || role === 'super_admin') {
    return user;
  }

  // Check 2: Email whitelist
  if (email && SUPER_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email)) {
    return user;
  }

  throw new Error('Forbidden: This action requires Super User privileges.');
}
