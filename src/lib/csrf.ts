/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Uses the Double Submit Cookie pattern:
 * 1. Generate a random token and store it in both a cookie and the user's session
 * 2. Client must send the token in a custom header (X-CSRF-Token)
 * 3. Server verifies the header matches the cookie
 *
 * This protects against CSRF because:
 * - Cookies are sent automatically by the browser
 * - Custom headers require JavaScript and are subject to CORS
 * - An attacker cannot read the cookie value due to same-origin policy
 */

import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const CSRF_COOKIE_NAME = '__Host-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('base64url');
}

/**
 * Set CSRF token in a secure cookie
 */
export async function setCsrfToken(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Get CSRF token from cookies
 */
export async function getCsrfToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value;
}

/**
 * Verify CSRF token from request headers against cookie
 * @param headerToken - Token from X-CSRF-Token header
 * @returns true if valid, false otherwise
 */
export async function verifyCsrfToken(headerToken: string | null): Promise<boolean> {
  if (!headerToken) {
    return false;
  }

  const cookieToken = await getCsrfToken();

  if (!cookieToken) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(headerToken, cookieToken);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get or create CSRF token for the current session
 * Call this in Server Components/Actions to ensure a token exists
 */
export async function ensureCsrfToken(): Promise<string> {
  let token = await getCsrfToken();

  if (!token) {
    token = generateCsrfToken();
    await setCsrfToken(token);
  }

  return token;
}

/**
 * CSRF token configuration for client-side
 */
export const CSRF_CONFIG = {
  cookieName: CSRF_COOKIE_NAME,
  headerName: CSRF_HEADER_NAME,
} as const;
