// src/server/middleware/app-check.ts
import { createServerClient } from '@/firebase/server-client';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/monitoring';
import { getApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';

/**
 * Verifies Firebase App Check token from request headers
 * @param request NextRequest object
 * @returns Promise<boolean> - true if token is valid or in development mode
 */
export async function verifyAppCheck(request: NextRequest): Promise<boolean> {
    // Skip App Check in development
    if (process.env.NODE_ENV !== 'production') {
        return true;
    }

    const appCheckToken = request.headers.get('X-Firebase-AppCheck');

    if (!appCheckToken) {
        logger.warn('Missing App Check token', {
            path: request.nextUrl.pathname,
            method: request.method
        });
        return false;
    }

    try {
        // Initialize server client to ensure Firebase Admin is initialized
        await createServerClient();

        // Get the App Check instance
        const app = getApp();
        const appCheck = getAppCheck(app);

        // Verify the App Check token
        await appCheck.verifyToken(appCheckToken);

        logger.info('App Check token verified successfully', {
            path: request.nextUrl.pathname
        });

        return true;

    } catch (error: any) {
        logger.error('App Check verification failed', {
            error: error.message,
            path: request.nextUrl.pathname
        });
        return false;
    }
}

/**
 * Middleware function to require App Check for protected routes
 * Use this in API routes that need App Check protection
 */
export async function requireAppCheck(request: NextRequest): Promise<void> {
    const isValid = await verifyAppCheck(request);

    if (!isValid) {
        throw new Error('Invalid or missing App Check token');
    }
}
