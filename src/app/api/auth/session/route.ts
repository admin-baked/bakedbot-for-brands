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

        const { auth } = await createServerClient();

        // Verify the ID token first
        const decodedToken = await auth.verifyIdToken(idToken);

        // Create a session cookie with 5 days expiration
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

        logger.info('Creating session cookie', { 
            expiresIn, 
            secure: true,
            sameSite: 'lax' 
        });

        // Set the cookie - always secure for production
        cookies().set('__session', sessionCookie, {
            maxAge: expiresIn / 1000, // seconds
            httpOnly: true,
            secure: true, // Always true for Firebase Hosting/Cloud Run
            path: '/',
            sameSite: 'lax',
        });

        return NextResponse.json({ success: true, uid: decodedToken.uid });
    } catch (error: any) {
        logger.error('Session creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create session' },
            { status: 401 }
        );
    }
}

export async function DELETE() {
    cookies().delete('__session');
    return NextResponse.json({ success: true });
}
