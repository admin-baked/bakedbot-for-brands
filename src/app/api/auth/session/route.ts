// src/app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';

import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json();

        if (!idToken) {
            return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
        }

        logger.info('Session creation started', { tokenLength: idToken?.length });

        let auth;
        try {
            const serverClient = await createServerClient();
            auth = serverClient.auth;
            logger.info('Firebase Admin SDK initialized successfully');
        } catch (initError: any) {
            logger.error('Firebase Admin SDK initialization failed:', initError);
            return NextResponse.json(
                { error: 'Server configuration error', details: initError.message },
                { status: 500 }
            );
        }

        // Verify the ID token first
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(idToken);
            logger.info('ID token verified', { uid: decodedToken.uid });
        } catch (verifyError: any) {
            logger.error('ID token verification failed:', verifyError);
            return NextResponse.json(
                { error: 'Invalid ID token', details: verifyError.message },
                { status: 401 }
            );
        }

        // Create a session cookie with 5 days expiration
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        let sessionCookie;
        try {
            sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
            logger.info('Session cookie created successfully');
        } catch (cookieError: any) {
            // MOCK FALLBACK for local development credential bypass
            if (process.env.NODE_ENV !== 'production') {
                logger.warn('Session cookie creation failed (local dev bypass) - Setting MOCK session cookie');
                // Use a recognizable mock prefix
                sessionCookie = `mock_session_${Date.now()}`;
            } else {
                logger.error('Session cookie creation failed:', cookieError);
                return NextResponse.json(
                    { error: 'Failed to create session cookie', details: cookieError.message },
                    { status: 401 }
                );
            }
        }

        logger.info('Setting session cookie', {
            expiresIn,
            secure: true,
            sameSite: 'lax'
        });

        // Set the cookie - secure only in production (HTTPS required)
        const isProduction = process.env.NODE_ENV === 'production';
        (await cookies()).set('__session', sessionCookie, {
            maxAge: expiresIn / 1000, // seconds
            httpOnly: true,
            secure: isProduction, // false for localhost, true for production
            path: '/',
            sameSite: 'lax',
        });

        // Set a non-HttpOnly flag cookie so client can detect session existence
        // This prevents the race condition in withAuth where it redirects before Firebase loads
        (await cookies()).set('__session_is_active', 'true', {
            maxAge: expiresIn / 1000, // seconds
            httpOnly: false, // Visible to client JS
            secure: isProduction,
            path: '/',
            sameSite: 'lax',
        });

        return NextResponse.json({ success: true, uid: decodedToken.uid });
    } catch (error: any) {
        logger.error('Unexpected session creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create session', details: error.message },
            { status: 401 }
        );
    }
}

export async function DELETE() {
    (await cookies()).delete('__session');
    (await cookies()).delete('__session_is_active');
    return NextResponse.json({ success: true });
}
