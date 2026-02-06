import { createServerClient } from '@/firebase/server-client';

/**
 * Verify Firebase session cookie and return decoded claims
 */
export async function verifySessionCookie(sessionCookie: string) {
  try {
    const { auth } = await createServerClient();
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    console.error('[auth-helpers] Session verification failed:', error);
    return null;
  }
}

/**
 * Get current user from session cookie
 */
export async function getCurrentUser(sessionCookie: string | undefined) {
  if (!sessionCookie) return null;

  try {
    const claims = await verifySessionCookie(sessionCookie);
    if (!claims) return null;

    return {
      uid: claims.uid,
      email: claims.email,
      role: claims.role,
      orgId: claims.orgId || claims.brandId || claims.currentOrgId,
      planId: claims.planId,
    };
  } catch (error) {
    return null;
  }
}
