/**
 * API Key Authentication Middleware
 *
 * Validates API keys from the Authorization header and checks permissions.
 * Used by versioned API routes (/api/v1/*).
 */

import { APIKeyRecord, APIPermission, ALL_API_PERMISSIONS } from '@/types/api-contract';

import { getAdminFirestore } from '@/firebase/admin';
import { createHash } from 'crypto';

/**
 * Validate the raw API key against Firestore.
 * We store the SHA-256 hash of the key, never the raw key.
 */
const validateAPIKey = async (rawKey: string): Promise<APIKeyRecord | null> => {
    try {
        const keyHash = createHash('sha256').update(rawKey).digest('hex');
        const db = getAdminFirestore();
        
        const snap = await db.collection('api_keys')
            .where('keyHash', '==', keyHash)
            .where('active', '==', true)
            .limit(1)
            .get();

        if (snap.empty) return null;
        
        const data = snap.docs[0].data();
        return {
            ...data,
            id: snap.docs[0].id,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            lastUsedAt: data.lastUsedAt?.toDate?.() || (data.lastUsedAt ? new Date(data.lastUsedAt) : undefined),
            expiresAt: data.expiresAt?.toDate?.() || (data.expiresAt ? new Date(data.expiresAt) : undefined),
        } as APIKeyRecord;
    } catch (error) {
        console.error('[APIKeyAuth] Validation error:', error);
        return null;
    }
};

/**
 * Check if the record has the required permission.
 */
function hasPermission(record: APIKeyRecord, perm: APIPermission): boolean {
    return record.permissions.includes(perm) || record.permissions.includes('admin' as any);
}

import { makeAPIError } from '@/types/api-contract';

/**
 * Validate the API key from the request and check required permission.
 * Returns the key record on success, throws on failure.
 */
export async function requireAPIKey(
    request: Request,
    requiredPermission: APIPermission,
): Promise<APIKeyRecord> {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        throw new APIKeyError(401, 'missing_api_key', 'Authorization header with Bearer token required');
    }

    const rawKey = authHeader.substring(7);
    const record = await validateAPIKey(rawKey);

    if (!record) {
        throw new APIKeyError(401, 'invalid_api_key', 'API key is invalid, expired, or revoked');
    }

    if (!hasPermission(record, requiredPermission)) {
        throw new APIKeyError(403, 'insufficient_permissions', `API key lacks "${requiredPermission}" permission`);
    }

    return record;
}

/**
 * Custom error class for API key auth failures.
 */
export class APIKeyError extends Error {
    readonly statusCode: number;
    readonly code: string;

    constructor(statusCode: number, code: string, message: string) {
        super(message);
        this.name = 'APIKeyError';
        this.statusCode = statusCode;
        this.code = code;
    }

    toResponse(): Response {
        return Response.json(makeAPIError(this.code, this.message), {
            status: this.statusCode,
        });
    }
}
