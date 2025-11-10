
import { NextRequest, NextResponse } from 'next/server';

/**
 * This route is the target for the Firebase Authentication magic link.
 * It simply redirects the user to a client-side page (`/auth/callback-client`)
 * where the sign-in process can be safely completed in the browser.
 *
 * This two-step process is necessary because completing the sign-in
 * requires access to the browser's `window.location` and `localStorage`,
 * which are not available in a server-side Route Handler.
 */
export async function GET(request: NextRequest) {
  // The original URL contains the magic link parameters.
  // We forward these parameters to the client-side callback page.
  const url = request.nextUrl.clone();
  url.pathname = '/auth/callback-client';
  
  // Perform the redirect.
  return NextResponse.redirect(url);
}
