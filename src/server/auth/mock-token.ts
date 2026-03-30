import type { DecodedIdToken } from 'firebase-admin/auth';

const DEFAULT_TOKEN_TTL_SECONDS = 3600;

type DecodedIdTokenWithClaims = DecodedIdToken & {
    role?: string;
    brandId?: string;
    orgId?: string;
};

function normalizeEpochSeconds(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.floor(value);
    }

    return fallback;
}

export function buildSyntheticDecodedIdToken(
    user: DecodedIdTokenWithClaims,
    brandId?: string
): DecodedIdTokenWithClaims {
    const nowSeconds = Math.floor(Date.now() / 1000);

    return {
        uid: user.uid,
        email: user.email || '',
        email_verified: user.email_verified ?? true,
        role: user.role || 'customer',
        brandId: brandId || user.brandId || user.orgId || undefined,
        auth_time: normalizeEpochSeconds(user.auth_time, nowSeconds),
        iat: normalizeEpochSeconds(user.iat, nowSeconds),
        exp: normalizeEpochSeconds(user.exp, nowSeconds + DEFAULT_TOKEN_TTL_SECONDS),
        aud: user.aud || 'bakedbot',
        iss: user.iss || 'https://securetoken.google.com/bakedbot',
        sub: user.sub || user.uid,
        firebase: user.firebase || { identities: {}, sign_in_provider: 'custom' },
    };
}
