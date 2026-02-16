import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

/**
 * Require authenticated user with specific role(s)
 * Redirects to login if not authenticated or unauthorized
 */
export async function requireUser(allowedRoles: string[]) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  const user = await getCurrentUser(sessionCookie);

  if (!user) {
    redirect('/customer-login');
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    redirect('/dashboard');
  }

  return user;
}
