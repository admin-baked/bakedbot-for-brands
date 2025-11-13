
import { getAuth } from 'firebase-admin/auth';
import { createServerClient } from '@/firebase/server-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { auth } = await createServerClient();
    const googleProvider = new (getAuth().GoogleAuthProvider)();
    
    // This generates the URL that the user will be redirected to
    // for Google's sign-in page.
    const authUrl = await auth.createSignInLinkWithRedirect(googleProvider.providerId, {
      continueUrl: `${request.nextUrl.origin}/api/auth/google/callback`,
    });

    // Redirect the user's browser to the Google sign-in page.
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('Error creating Google sign-in link:', error);
    const redirectUrl = new URL('/brand-login', request.nextUrl.origin);
    redirectUrl.searchParams.set('error', 'Could not initiate Google sign-in. Please try again.');
    return NextResponse.redirect(redirectUrl);
  }
}
