import type { NextRequest } from 'next/server';

// Centralized Edge middleware lives in src/proxy.ts (route protection + custom domain routing).
import { proxy } from './src/proxy';

export function middleware(request: NextRequest) {
  return proxy(request);
}

// Turbopack requires config to be exported directly, not re-exported
export const config = {
  matcher: [
    // Subdomain and custom domain routing - match all paths
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};

