/**
 * Shared Google auth helpers for growth services (GA4, GSC, Sitemap).
 *
 * Handles base64-encoded FIREBASE_SERVICE_ACCOUNT_KEY and the googleapis
 * JWT-client requirement (GoogleAuth wrapper doesn't attach tokens —
 * the JWT client must be passed directly to google.* API constructors).
 */

import { GoogleAuth } from 'google-auth-library';

export function parseServiceAccountKey(): Record<string, unknown> | null {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) return null;
    try {
        if (raw.startsWith('{')) return JSON.parse(raw);
        return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
    } catch {
        return null;
    }
}

export function buildAuthFromServiceKey(scope: string): GoogleAuth {
    const creds = parseServiceAccountKey();
    if (creds) {
        return new GoogleAuth({ credentials: creds as Record<string, string>, scopes: [scope] });
    }
    return new GoogleAuth({ scopes: [scope] });
}
