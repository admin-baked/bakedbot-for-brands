import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Redirect lead magnets to magnets subdomain
  const MAGNETS_URL = 'https://bakedbot-magnets--studio-567050101-bc6e8.us-central1.hosted.app';

  if (path.startsWith('/academy')) {
    return NextResponse.redirect(`${MAGNETS_URL}${path}`);
  }

  if (path.startsWith('/vibe')) {
    return NextResponse.redirect(`${MAGNETS_URL}${path}`);
  }

  if (path.startsWith('/training')) {
    return NextResponse.redirect(`${MAGNETS_URL}${path}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/academy/:path*', '/vibe/:path*', '/training/:path*'],
};
