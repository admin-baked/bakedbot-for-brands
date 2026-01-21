
'use server';

import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { DecodedIdToken } from 'firebase-admin/auth';
import { SUPER_ADMIN_EMAILS } from '@/lib/super-admin-config';
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

    // Check if we are in a non-production environment (simplified check)
    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev && simulatedRole) {
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

    console.error('[AUTH_DEBUG] No session cookie found in request headers:', cookieStore.getAll().map(c => c.name));
    throw new Error('Unauthorized: No session cookie found.');
  }

  const { auth } = await createServerClient();

  let decodedToken;
  try {
    decodedToken = await auth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    console.error('[AUTH_ERROR] verifySessionCookie failed:', error);
    throw new Error('Unauthorized: Invalid session cookie.');
  }

  // --- ROLE SIMULATION LOGIC ---
  // Only allow simulation if the REAL user has the 'super_user' role.
  if (decodedToken.role === 'super_user' || decodedToken.role === 'super_admin') {
    const simulatedRole = cookieStore.get('x-simulated-role')?.value as Role | undefined;
    if (simulatedRole && ['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'customer'].includes(simulatedRole)) {
      // Override the role in the returned token
      decodedToken = { ...decodedToken, role: simulatedRole };

      // If simulating a brand role, inject a demo brand ID to prevent "You are not associated with a brand" errors
      if (isBrandRole(simulatedRole)) {
        decodedToken = { ...decodedToken, brandId: 'default' };
      }
      // Note: We are NOT modifying the actual session cookie, just the decoded object for this request context.
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
           throw new Error('Forbidden: Your account is pending approval.');
      }
      if (approvalStatus === 'rejected') {
           throw new Error('Forbidden: Your account has been rejected.');
      }
  }

  // --- ROLE CHECK (Optional) ---
  if (requiredRoles && requiredRoles.length > 0) {
    // Super admins (by email or role) bypass role checks
    if (!isSuperAdminByEmail && !isSuperUserRole) {
      if (!userRole || !roleMatches(userRole, requiredRoles)) {
        throw new Error('Forbidden: You do not have the required permissions.');
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
