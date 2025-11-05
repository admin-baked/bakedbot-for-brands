
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

  const isBrandLogin = pathname.startsWith('/brand-login');
  const isCustomerLogin = pathname.startsWith('/login');
  const isDashboard = pathname.startsWith('/dashboard');

  // If a logged-in user tries to access any login page, redirect them to the dashboard
  if (user && (isBrandLogin || isCustomerLogin)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If a non-logged-in user tries to access the brand dashboard, redirect them to the brand login
  if (!user && isDashboard) {
      return NextResponse.redirect(new URL('/brand-login', request.url));
  }
  
  // Allow customer login page to be accessed without auth
  if (isCustomerLogin && !user) {
    return NextResponse.next();
  }

  // Allow the request to proceed for all other cases
  return NextResponse.next();
}

// Update matcher to include the new brand login and exclude the public login
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/brand-login'],
};
