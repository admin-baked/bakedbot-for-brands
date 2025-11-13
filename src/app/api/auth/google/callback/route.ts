
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Temporarily disable Google OAuth callback.
    // This avoids build errors from missing imports and unsupported flows.
    const redirectUrl = new URL('/brand-login', request.nextUrl.origin);
    redirectUrl.searchParams.set(
      'error',
      'Google sign-in callback is not fully configured.'
    );

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('Google callback error:', err);

    const redirectUrl = new URL('/brand-login', request.nextUrl.origin);
    redirectUrl.searchParams.set(
      'error',
      'There was a problem completing Google sign-in.'
    );

    return NextResponse.redirect(redirectUrl);
  }
}
