// src/app/local/search/route.ts
/**
 * Search redirect handler
 * Redirects /local/search?zip=12345 to /local/12345
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const zip = searchParams.get('zip');

    // Validate ZIP code (5 digits)
    if (!zip || !/^\d{5}$/.test(zip)) {
        // Redirect back to /local with error
        return NextResponse.redirect(new URL('/local?error=invalid_zip', request.url));
    }

    // Redirect to the specific ZIP page
    return NextResponse.redirect(new URL(`/local/${zip}`, request.url));
}
