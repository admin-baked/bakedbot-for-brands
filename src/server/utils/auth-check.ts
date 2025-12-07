
import { NextRequest } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { isSuperAdminEmail } from '@/lib/super-admin-config';
import { logger } from '@/lib/logger';
import { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Verify the Firebase session cookie
 */
export async function verifySession(request: NextRequest): Promise<DecodedIdToken | null> {
    const sessionCookie = request.cookies.get('__session')?.value;

    if (!sessionCookie) {
        return null;
    }

    try {
        const { auth } = await createServerClient();
        const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
        return decodedToken;
    } catch (error) {
        logger.warn('Session verification failed', { error });
        return null;
    }
}

/**
 * Verify if the request is from a super admin
 */
export async function verifySuperAdmin(request: NextRequest): Promise<boolean> {
    // 1. Verify session
    const user = await verifySession(request);

    if (!user || !user.email) {
        return false;
    }

    // 2. Verify email against whitelist
    return isSuperAdminEmail(user.email);
}
