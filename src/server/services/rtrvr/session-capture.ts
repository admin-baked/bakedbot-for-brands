/**
 * RTRVR Session Capture
 *
 * Uses RTRVR's autonomous agent to log into a service with the user's credentials,
 * then extracts the session cookies. Credentials are used transiently — only the
 * resulting cookies are stored in Firestore.
 */

import { getRTRVRClient } from './client';
import { SERVICE_REGISTRY, ServiceId } from './service-registry';
import { logger } from '@/lib/logger';

export interface CaptureResult {
    success: boolean;
    cookies?: Record<string, string>;
    error?: string;
}

interface RTRVRLoginResult {
    success?: boolean;
    cookies?: Record<string, string>;
    error?: string;
    result?: {
        cookies?: Record<string, string>;
        success?: boolean;
    };
}

/**
 * Log into a service via RTRVR and return the session cookies.
 * The email/password are passed to RTRVR for a single login task — never persisted.
 */
export async function captureSessionCookies(
    serviceId: ServiceId,
    email: string,
    password: string
): Promise<CaptureResult> {
    const service = SERVICE_REGISTRY[serviceId];
    const rtrvr = getRTRVRClient();

    if (!rtrvr.isAvailable()) {
        return { success: false, error: 'Browser automation not available (RTRVR not configured)' };
    }

    logger.info('[SessionCapture] Starting login flow', { service: service.displayName });

    const task = `Log into ${service.displayName} at ${service.loginUrl} using these credentials:
- Email/Username: ${email}
- Password: ${password}

Steps:
1. Navigate to ${service.loginUrl}
2. Enter the email/username in the email field
3. Enter the password in the password field
4. Click the login/sign in button
5. Wait for the page to load after login
6. Confirm you are logged in (look for profile icon, feed, or dashboard)

After successful login, return the session cookies as JSON, specifically these cookie names: ${service.sessionCookies.join(', ')}.

If login fails (wrong credentials, captcha, 2FA required), return an error message explaining why.

Return format: { "success": true, "cookies": { "cookie_name": "cookie_value" } }
or { "success": false, "error": "reason" }`;

    const result = await rtrvr.agent<RTRVRLoginResult>({
        input: task,
        urls: [service.loginUrl],
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                cookies: { type: 'object' },
                error: { type: 'string' },
            },
        },
        verbosity: 'final',
    });

    if (!result.success) {
        logger.warn('[SessionCapture] RTRVR agent failed', { service: service.displayName, error: result.error });
        return { success: false, error: result.error ?? 'Login automation failed' };
    }

    // Extract cookies from nested result shapes RTRVR may return
    const loginResult = result.data;
    const cookies = loginResult?.cookies ?? loginResult?.result?.cookies;
    const loginSuccess = loginResult?.success ?? loginResult?.result?.success ?? !!cookies;

    if (!loginSuccess || !cookies) {
        const errorMsg = loginResult?.error ?? 'Login failed — check credentials or try manual cookie entry';
        logger.warn('[SessionCapture] Login unsuccessful', { service: service.displayName, error: errorMsg });
        return { success: false, error: errorMsg };
    }

    // Filter to only the expected session cookies
    const captured: Record<string, string> = {};
    for (const cookieName of service.sessionCookies) {
        if (cookies[cookieName]) {
            captured[cookieName] = cookies[cookieName];
        }
    }

    if (Object.keys(captured).length === 0) {
        return {
            success: false,
            error: `Logged in but could not extract session cookies (${service.sessionCookies.join(', ')}). Try the manual cookie method.`,
        };
    }

    logger.info('[SessionCapture] Cookies captured', {
        service: service.displayName,
        cookieCount: Object.keys(captured).length,
    });

    return { success: true, cookies: captured };
}
