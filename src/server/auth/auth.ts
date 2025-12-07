
'use server';

import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { DecodedIdToken } from 'firebase-admin/auth';
import { devPersonas } from '@/lib/dev-personas';

// Define the roles used in the application for type safety.
export type Role = 'brand' | 'dispensary' | 'customer' | 'owner';

/**
 * A server-side utility to require an authenticated user and optionally enforce roles.
 * This function centralizes session verification for all Server Actions.
 * In development, it uses a bypass to return a default persona.
 *
 * @param requiredRoles - An optional array of roles. If provided, the user must have one of these roles.
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
        if (!requiredRoles.includes(simulatedRole)) {
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
  // Only allow simulation if the REAL user has the 'owner' or admin role.
  if (['owner', 'admin', 'super-admin'].includes(decodedToken.role)) {
    const simulatedRole = cookieStore.get('x-simulated-role')?.value as Role | undefined;
    if (simulatedRole && ['brand', 'dispensary', 'customer'].includes(simulatedRole)) {
      // Override the role in the returned token
      decodedToken = { ...decodedToken, role: simulatedRole };

      // If simulating a brand, inject a demo brand ID to prevent "You are not associated with a brand" errors
      if (simulatedRole === 'brand') {
        decodedToken = { ...decodedToken, brandId: 'default' };
      }
      // Note: We are NOT modifying the actual session cookie, just the decoded object for this request context.
    }
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = (decodedToken.role as Role) || null;
    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new Error('Forbidden: You do not have the required permissions.');
    }
  }

  return decodedToken;
}
