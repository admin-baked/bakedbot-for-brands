
import { createServerClient } from '@/firebase/server-client';
import { type NextRequest, NextResponse } from 'next/server';
import type { User } from 'firebase/auth';

async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  try {
    const { auth } = await createServerClient();
    const idToken = request.cookies.get('firebaseIdToken')?.value;
    if (!idToken) {
      return null;
    }
    const decodedToken = await auth.verifyIdToken(idToken);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
    } as User;
  } catch (error) {
    console.error('Middleware auth error:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname.startsWith('/login');
  const isDashboard = pathname.startsWith('/dashboard');

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!user && isDashboard) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
