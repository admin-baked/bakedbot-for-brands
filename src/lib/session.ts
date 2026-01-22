/**
 * Session utilities for API routes
 *
 * Provides a simple interface to get the current authenticated user's session.
 * Wraps the server auth module for use in API routes.
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';

export interface Session {
    uid: string;
    email?: string;
    role?: string;
}

/**
 * Get the current server session
 * @returns Session object if authenticated, null otherwise
 */
export async function getServerSession(): Promise<Session | null> {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('__session')?.value;

        if (!sessionCookie) {
            return null;
        }

        const { auth } = await createServerClient();
        const decodedToken = await auth.verifySessionCookie(sessionCookie, true);

        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: decodedToken.role as string | undefined,
        };
    } catch (error) {
        console.error('[Session] Failed to get server session:', error);
        return null;
    }
}
