
import { createServerClient } from '@/firebase/server-client';
import { type NextRequest, NextResponse } from 'next/server';
import type { User } from 'firebase/auth';

async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  const { auth } = await createServerClient();
  try {
    // This will throw if the token is invalid or expired, which is handled below
    const { token } = await auth.verifyIdToken(
      request.cookies.get('firebaseIdToken')?.value || '',
      true // checkRevoked
    );
    // Re-create the user from the decoded token
    return {
      uid: token.uid,
      email: token.email,
      emailVerified: token.email_verified,
      displayName: token.name,
      photoURL: token.picture,
      // Add other properties as needed from the token, but keep it minimal
      // The full User object is not available on the server
    } as User;
  } catch (error) {
    // Token is invalid, expired, or not present. User is not authenticated.
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  const { pathname } = request.nextUrl;

  // If user is trying to access login page but is already authenticated, redirect to dashboard
  if (user && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user is trying to access a protected dashboard route and is not authenticated, redirect to login
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Allow the request to proceed
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
