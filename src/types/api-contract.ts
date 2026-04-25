/**
 * External API Contract Types
 *
 * Defines the versioned API response envelope, API key management,
 * and permission model for external consumers of BakedBot services
 * (compliance checking, workflow execution, research).
 */

// ---------------------------------------------------------------------------
// API Response Envelope
// ---------------------------------------------------------------------------

export interface APIResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: APIError;
    meta?: APIResponseMeta;
}

export interface APIError {
    code: string;
    message: string;
    details?: unknown;
}

export interface APIResponseMeta {
    requestId: string;
    durationMs: number;
    version: string;
}

// ---------------------------------------------------------------------------
// API Key Management
// ---------------------------------------------------------------------------

export interface APIKeyRecord {
    id: string;
    orgId: string;
    keyHash: string;              // SHA-256 hash (raw key never stored)
    keyPrefix: string;            // first 8 chars for identification (e.g., 'bb_live_a')
    name: string;
    permissions: APIPermission[];
    rateLimitPerMinute: number;
    createdAt: Date;
    lastUsedAt?: Date;
    expiresAt?: Date;
    active: boolean;
}

export type APIPermission =
    | 'compliance:check'
    | 'workflows:list'
    | 'workflows:run'
    | 'research:start'
    | 'research:status'
    | 'read:customers'
    | 'write:members'
    | 'write:transactions';

export const ALL_API_PERMISSIONS: APIPermission[] = [
    'compliance:check',
    'workflows:list',
    'workflows:run',
    'research:start',
    'research:status',
    'read:customers',
    'write:members',
    'write:transactions',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const API_VERSION = 'v1';

export const DEFAULT_RATE_LIMIT_PER_MINUTE = 60;

export function makeAPIResponse<T>(data: T, meta?: Partial<APIResponseMeta>): APIResponse<T> {
    return {
        success: true,
        data,
        meta: meta ? {
            requestId: meta.requestId ?? crypto.randomUUID(),
            durationMs: meta.durationMs ?? 0,
            version: API_VERSION,
        } : undefined,
    };
}

export function makeAPIError(code: string, message: string, details?: unknown): APIResponse<never> {
    return {
        success: false,
        error: { code, message, details },
    };
}
