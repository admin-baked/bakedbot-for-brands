// src/server/auth/auth-helpers.ts

import { cookies } from 'next/headers';
import { verifyIdToken, getUserProfile } from '@/firebase/server-client';
import { UserProfile } from '@/types/domain';

/**
 * Get the current authenticated user from the request
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('__session')?.value;

        if (!token) {
            return null;
        }

        const decodedToken = await verifyIdToken(token);
        const userProfile = await getUserProfile(decodedToken.uid);

        return userProfile;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<UserProfile> {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error('Unauthorized: authentication required');
    }

    return user;
}

/**
 * Get auth token from request headers or cookies
 */
export function getAuthToken(request: Request): string | null {
    // Check Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check cookie (for same-origin requests)
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim());
        const sessionCookie = cookies.find(c => c.startsWith('__session='));
        if (sessionCookie) {
            return sessionCookie.split('=')[1];
        }
    }

    return null;
}

/**
 * Get authenticated user from request
 */
export async function getUserFromRequest(
    request: Request
): Promise<UserProfile | null> {
    try {
        const token = getAuthToken(request);

        if (!token) {
            return null;
        }

        const decodedToken = await verifyIdToken(token);
        const userProfile = await getUserProfile(decodedToken.uid);

        return userProfile;
    } catch (error) {
        console.error('Error getting user from request:', error);
        return null;
    }
}

/**
 * Require authentication from request - throws error if not authenticated
 */
export async function requireAuthFromRequest(
    request: Request
): Promise<UserProfile> {
    const user = await getUserFromRequest(request);

    if (!user) {
        throw new Error('Unauthorized: authentication required');
    }

    return user;
}
