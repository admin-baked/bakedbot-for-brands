
import { createServerClient } from '@/firebase/server-client';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDoc } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
    const { auth, firestore } = await createServerClient();
    const session = request.nextUrl.searchParams.get('session');

    if (!session) {
        const redirectUrl = new URL('/brand-login', request.nextUrl.origin);
        redirectUrl.searchParams.set('error', 'Session not found in callback.');
        return NextResponse.redirect(redirectUrl);
    }
    
    try {
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await auth.createSessionCookie(session, { expiresIn });
        
        // Set cookie and redirect
        cookies().set('__session', sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true });

        // Decode the token to get the user's UID
        const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
        const userDocRef = firestore.collection('users').doc(decodedToken.uid);
        const userDoc = await userDocRef.get();
        
        let redirectTo = '/dashboard'; // Default redirect

        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.role === 'dispensary') {
                redirectTo = '/dashboard/orders';
            } else if (!userData?.onboardingCompleted) {
                redirectTo = '/onboarding';
            }
        } else {
             // User document doesn't exist, so they are a new user
            redirectTo = '/onboarding';
        }

        return NextResponse.redirect(new URL(redirectTo, request.nextUrl.origin));

    } catch (error) {
        console.error('Error in Google auth callback:', error);
        const redirectUrl = new URL('/brand-login', request.nextUrl.origin);
        redirectUrl.searchParams.set('error', 'Failed to verify session. Please try logging in again.');
        return NextResponse.redirect(redirectUrl);
    }
}
