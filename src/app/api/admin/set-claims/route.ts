import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/firebase/admin';

/**
 * Admin API: Set Custom Claims
 *
 * POST /api/admin/set-claims
 * Body: { email: string, claims: object }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, claims } = await request.json();

    if (!email || !claims) {
      return NextResponse.json(
        { error: 'Missing email or claims' },
        { status: 400 }
      );
    }

    // Get Firebase Admin Auth
    const app = getAdminApp();
    const auth = getAuth(app);

    // Get user by email
    const user = await auth.getUserByEmail(email);

    // Set custom claims
    await auth.setCustomUserClaims(user.uid, claims);

    return NextResponse.json({
      success: true,
      uid: user.uid,
      email,
      claims,
      message: 'Custom claims set. User must sign out and sign back in.',
    });
  } catch (error) {
    console.error('[set-claims] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to set claims',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
