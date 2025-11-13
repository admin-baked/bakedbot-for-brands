import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // NOTE:
    // The previous implementation tried to use `getDoc` from
    // "firebase-admin/firestore", which does not exist and was
    // causing the TypeScript build to fail.
    //
    // For now, we just redirect back to the login page with a
    // clear message. You can implement full Google callback
    // handling later (creating session cookies, fetching user
    // profile, etc.).

    const redirectUrl = new URL('/login', request.nextUrl.origin);
    redirectUrl.searchParams.set(
      'error',
      'Google sign-in callback is not fully configured yet.',
    );

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error handling Google sign-in callback:', error);
    const redirectUrl = new URL('/login', request.nextUrl.origin);
    redirectUrl.searchParams.set(
      'error',
      'There was a problem completing Google sign-in. Please try again.',
    );
    return NextResponse.redirect(redirectUrl);
  }
}


