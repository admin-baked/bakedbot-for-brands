
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
  const sessionCookie = cookies().get('__session')?.value;
  if (!sessionCookie) {
    console.error('[AUTH_DEBUG] No session cookie found in request headers:', cookies().getAll().map(c => c.name));
    throw new Error('Unauthorized: No session cookie found.');
  }

  const { auth } = await createServerClient();

  let decodedToken;
  try {
    decodedToken = await auth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    throw new Error('Unauthorized: Invalid session cookie.');
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = (decodedToken.role as Role) || null;
    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new Error('Forbidden: You do not have the required permissions.');
    }
  }

  return decodedToken;
}
