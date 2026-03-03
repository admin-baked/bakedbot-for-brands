// tests/api-contract.test.ts
// Unit tests for API Key Management and Contract

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// In-memory Firestore mock
const mockStore = new Map<string, Record<string, unknown>>();
let autoIdCounter = 0;

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: (name: string) => ({
                add: jest.fn().mockImplementation(async (data: Record<string, unknown>) => {
                    const id = `auto_${++autoIdCounter}`;
                    mockStore.set(`${name}/${id}`, { id, ...data });
                    return { id };
                }),
                where: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            get: jest.fn().mockImplementation(async () => {
                                const docs: { id: string; data: () => Record<string, unknown> }[] = [];
                                for (const [key, value] of mockStore) {
                                    if (key.startsWith(`${name}/`)) {
                                        docs.push({
                                            id: (value as Record<string, unknown>).id as string,
                                            data: () => value,
                                        });
                                    }
                                }
                                return { empty: docs.length === 0, docs };
                            }),
                        }),
                    }),
                    limit: jest.fn().mockReturnValue({
                        get: jest.fn().mockImplementation(async () => {
                            const docs: { id: string; data: () => Record<string, unknown> }[] = [];
                            for (const [key, value] of mockStore) {
                                if (key.startsWith(`${name}/`)) {
                                    docs.push({
                                        id: (value as Record<string, unknown>).id as string,
                                        data: () => value,
                                    });
                                }
                            }
                            return { empty: docs.length === 0, docs };
                        }),
                    }),
                    get: jest.fn().mockImplementation(async () => {
                        const docs: { id: string; data: () => Record<string, unknown> }[] = [];
                        for (const [key, value] of mockStore) {
                            if (key.startsWith(`${name}/`) && (value as Record<string, unknown>).orgId) {
                                docs.push({
                                    id: (value as Record<string, unknown>).id as string,
                                    data: () => value,
                                });
                            }
                        }
                        return { docs };
                    }),
                }),
                doc: (id: string) => ({
                    get: jest.fn().mockImplementation(async () => {
                        const data = mockStore.get(`${name}/${id}`);
                        return { exists: !!data, data: () => data };
                    }),
                    update: jest.fn().mockImplementation(async (updates: Record<string, unknown>) => {
                        const existing = mockStore.get(`${name}/${id}`);
                        if (existing) {
                            mockStore.set(`${name}/${id}`, { ...existing, ...updates });
                        }
                    }),
                }),
            }),
        },
    }),
}));

import {
    makeAPIResponse,
    makeAPIError,
} from '../src/types/api-contract';
import type { APIResponse, APIPermission } from '../src/types/api-contract';

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
    mockStore.clear();
    autoIdCounter = 0;
});

// ─────────────────────────────────────────────────────────────────────────────
// API Response Helpers
// ─────────────────────────────────────────────────────────────────────────────

describe('makeAPIResponse', () => {
    test('creates successful response', () => {
        const response = makeAPIResponse({ items: [1, 2, 3] });
        expect(response.success).toBe(true);
        expect(response.data).toEqual({ items: [1, 2, 3] });
        expect(response.error).toBeUndefined();
    });

    test('includes meta when provided', () => {
        const response = makeAPIResponse(
            { count: 5 },
            { requestId: 'req_1', durationMs: 42, version: 'v1' },
        );
        expect(response.meta?.requestId).toBe('req_1');
        expect(response.meta?.durationMs).toBe(42);
        expect(response.meta?.version).toBe('v1');
    });
});

describe('makeAPIError', () => {
    test('creates error response', () => {
        const response = makeAPIError('not_found', 'Resource not found');
        expect(response.success).toBe(false);
        expect(response.error?.code).toBe('not_found');
        expect(response.error?.message).toBe('Resource not found');
        expect(response.data).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Key Management
// ─────────────────────────────────────────────────────────────────────────────

describe('API Key Manager', () => {
    let createAPIKey: typeof import('../src/server/services/api-key-manager').createAPIKey;
    let validateAPIKey: typeof import('../src/server/services/api-key-manager').validateAPIKey;
    let revokeAPIKey: typeof import('../src/server/services/api-key-manager').revokeAPIKey;
    let hasPermission: typeof import('../src/server/services/api-key-manager').hasPermission;

    beforeAll(async () => {
        const mod = await import('../src/server/services/api-key-manager');
        createAPIKey = mod.createAPIKey;
        validateAPIKey = mod.validateAPIKey;
        revokeAPIKey = mod.revokeAPIKey;
        hasPermission = mod.hasPermission;
    });

    test('createAPIKey returns key with bb_live_ prefix', async () => {
        const result = await createAPIKey('org_test', 'Test Key', ['compliance:check']);
        expect(result.key).toMatch(/^bb_live_/);
        expect(result.record.name).toBe('Test Key');
        expect(result.record.orgId).toBe('org_test');
        expect(result.record.permissions).toContain('compliance:check');
        expect(result.record.active).toBe(true);
    });

    test('createAPIKey stores hash, not raw key', async () => {
        const result = await createAPIKey('org_test', 'Test Key', ['compliance:check']);

        // The stored record should have keyHash, not raw key
        expect(result.record.keyHash).toBeDefined();
        expect(result.record.keyHash).not.toBe(result.key);
        expect(result.record.keyHash).not.toContain('bb_live_');
    });

    test('hasPermission checks permission array', () => {
        const record = {
            id: 'key_1',
            orgId: 'org_test',
            keyHash: 'abc',
            name: 'Test',
            permissions: ['compliance:check', 'workflows:list'] as APIPermission[],
            rateLimitPerMinute: 60,
            createdAt: new Date(),
            active: true,
        };

        expect(hasPermission(record, 'compliance:check')).toBe(true);
        expect(hasPermission(record, 'workflows:list')).toBe(true);
        expect(hasPermission(record, 'workflows:run')).toBe(false);
        expect(hasPermission(record, 'research:start')).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Key Auth Middleware
// ─────────────────────────────────────────────────────────────────────────────

describe('APIKeyError', () => {
    test('creates error with statusCode and code', () => {
        const { APIKeyError } = require('../src/server/auth/api-key-auth');
        const error = new APIKeyError(401, 'missing_api_key', 'No key provided');

        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('missing_api_key');
        expect(error.message).toBe('No key provided');
    });

    test('toResponse is defined as a method', () => {
        const { APIKeyError } = require('../src/server/auth/api-key-auth');
        const error = new APIKeyError(403, 'insufficient_permissions', 'Not allowed');

        // Response.json is not available in Node.js test environment
        // Just verify the method exists and properties are correct
        expect(typeof error.toResponse).toBe('function');
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('insufficient_permissions');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Response Shape
// ─────────────────────────────────────────────────────────────────────────────

describe('APIResponse shape', () => {
    test('successful response has correct shape', () => {
        const response: APIResponse<{ count: number }> = makeAPIResponse(
            { count: 42 },
            { requestId: 'req_1', durationMs: 10, version: 'v1' },
        );

        expect(response).toHaveProperty('success', true);
        expect(response).toHaveProperty('data');
        expect(response).toHaveProperty('meta');
        expect(response.data?.count).toBe(42);
    });

    test('error response has correct shape', () => {
        const response: APIResponse = makeAPIError('rate_limited', 'Too many requests');

        expect(response).toHaveProperty('success', false);
        expect(response).toHaveProperty('error');
        expect(response.error?.code).toBe('rate_limited');
    });
});
