/**
 * Chrome Extension Connection API
 *
 * Handles authentication flow for the BakedBot Chrome extension.
 * Returns a connection token that the extension can use to authenticate.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';

const EXTENSION_TOKENS_COLLECTION = 'extension_tokens';
const TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/browser/extension/connect
 *
 * Generate a one-time token for the Chrome extension to authenticate.
 * The extension will poll for this token or receive it via postMessage.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.uid) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is a Super User
    const userDoc = await getAdminFirestore()
      .collection('users')
      .doc(session.uid)
      .get();

    const userData = userDoc.data();
    if (!userData?.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Super User access required' },
        { status: 403 }
      );
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + TOKEN_EXPIRY_MS);

    // Store the token
    await getAdminFirestore()
      .collection(EXTENSION_TOKENS_COLLECTION)
      .doc(token)
      .set({
        userId: session.uid,
        createdAt: now,
        expiresAt,
        used: false,
      });

    return NextResponse.json({
      success: true,
      token,
      userId: session.uid,
      expiresIn: TOKEN_EXPIRY_MS,
    });
  } catch (error) {
    console.error('[Extension Connect] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/browser/extension/connect
 *
 * Validate a connection token from the extension.
 * Returns user info if the token is valid.
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const tokenDoc = await db
      .collection(EXTENSION_TOKENS_COLLECTION)
      .doc(token)
      .get();

    if (!tokenDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const tokenData = tokenDoc.data()!;

    // Check if token is expired
    if (tokenData.expiresAt.toMillis() < Date.now()) {
      await tokenDoc.ref.delete();
      return NextResponse.json(
        { success: false, error: 'Token expired' },
        { status: 401 }
      );
    }

    // Check if token was already used
    if (tokenData.used) {
      return NextResponse.json(
        { success: false, error: 'Token already used' },
        { status: 401 }
      );
    }

    // Mark token as used
    await tokenDoc.ref.update({ used: true });

    // Get user data
    const userDoc = await db
      .collection('users')
      .doc(tokenData.userId)
      .get();

    const userData = userDoc.data();

    return NextResponse.json({
      success: true,
      userId: tokenData.userId,
      email: userData?.email,
      displayName: userData?.displayName || userData?.name,
      isSuperUser: userData?.isSuperAdmin || false,
    });
  } catch (error) {
    console.error('[Extension Connect] Validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}
