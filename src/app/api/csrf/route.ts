/**
 * CSRF Token API Route
 * Returns a CSRF token for the client to use in subsequent requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureCsrfToken } from '@/lib/csrf';
import { logger } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  try {
    // Generate or retrieve existing CSRF token
    const token = await ensureCsrfToken();

    // Return token to client (they'll send it back in X-CSRF-Token header)
    return NextResponse.json(
      {
        csrfToken: token,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    logger.error('Failed to generate CSRF token', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to generate CSRF token',
      },
      { status: 500 }
    );
  }
}
