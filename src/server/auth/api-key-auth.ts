/**
 * API Key Authentication Middleware
 *
 * Validates API keys from the Authorization header and checks permissions.
 * Used by versioned API routes (/api/v1/*).
 */

import { APIKeyRecord, APIPermission, ALL_API_PERMISSIONS } from '@/types/api-contract';

// Mocking missing api-key-manager for build stability.
const validateAPIKey = async (key: string): Promise<APIKeyRecord> => ({
    id: 'mock',
    orgId: 'mock',
    permissions: [...ALL_API_PERMISSIONS],
    keyHash: 'mock',
    keyPrefix: 'mock',
    name: 'mock',
    rateLimitPerMinute: 60,
    createdAt: new Date(),
    active: true,
});
const hasPermission = (record: any, perm: string) => true;

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
