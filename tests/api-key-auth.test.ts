// tests/api-key-auth.test.ts
// Unit tests for API key authentication middleware

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockValidateAPIKey = jest.fn();
const mockHasPermission = jest.fn();

jest.mock('@/server/services/api-key-manager', () => ({
    validateAPIKey: (...args: unknown[]) => mockValidateAPIKey(...args),
    hasPermission: (...args: unknown[]) => mockHasPermission(...args),
}));

jest.mock('@/types/api-contract', () => ({
    makeAPIError: (code: string, message: string) => ({ success: false, error: { code, message } }),
}));

import { requireAPIKey, APIKeyError } from '../src/server/auth/api-key-auth';
import type { APIKeyRecord } from '../src/types/api-contract';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(authHeader?: string): Request {
    const headers = new Headers();
    if (authHeader) headers.set('authorization', authHeader);
    return { headers } as unknown as Request;
}

function makeKeyRecord(overrides: Partial<APIKeyRecord> = {}): APIKeyRecord {
    return {
        id: 'key-1',
        orgId: 'org-123',
        keyHash: 'hash123',
        keyPrefix: 'bb_live_a',
        name: 'Test Key',
        permissions: ['compliance:check'],
        rateLimitPerMinute: 60,
        createdAt: new Date(),
        active: true,
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// requireAPIKey — missing/malformed header
// ─────────────────────────────────────────────────────────────────────────────

describe('requireAPIKey — header validation', () => {
    test('throws APIKeyError 401 when Authorization header is missing', async () => {
        const req = makeRequest();

        await expect(requireAPIKey(req, 'compliance:check')).rejects.toThrow(APIKeyError);
        await expect(requireAPIKey(req, 'compliance:check')).rejects.toMatchObject({
            statusCode: 401,
            code: 'missing_api_key',
        });
    });

    test('throws APIKeyError 401 when header does not start with Bearer', async () => {
        const req = makeRequest('Basic dXNlcjpwYXNz');

        await expect(requireAPIKey(req, 'compliance:check')).rejects.toMatchObject({
            statusCode: 401,
            code: 'missing_api_key',
        });
    });

    test('throws APIKeyError 401 when header is "Bearer" with no token', async () => {
        // "Bearer " prefix without a token — substring(7) gives empty string
        const req = makeRequest('Bearer ');
        mockValidateAPIKey.mockResolvedValue(null); // empty key won't match prefix

        await expect(requireAPIKey(req, 'compliance:check')).rejects.toMatchObject({
            statusCode: 401,
            code: 'invalid_api_key',
        });
    });

    test('does not call validateAPIKey when header is missing', async () => {
        const req = makeRequest();
        await expect(requireAPIKey(req, 'compliance:check')).rejects.toThrow();
        expect(mockValidateAPIKey).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireAPIKey — key validation
// ─────────────────────────────────────────────────────────────────────────────

describe('requireAPIKey — key validation', () => {
    test('throws 401 invalid_api_key when validateAPIKey returns null', async () => {
        mockValidateAPIKey.mockResolvedValue(null);
        const req = makeRequest('Bearer bb_live_invalidkey123');

        await expect(requireAPIKey(req, 'compliance:check')).rejects.toMatchObject({
            statusCode: 401,
            code: 'invalid_api_key',
        });
    });

    test('extracts raw key from Bearer token and passes to validateAPIKey', async () => {
        mockValidateAPIKey.mockResolvedValue(null);
        const req = makeRequest('Bearer bb_live_myrawkey123456');

        await expect(requireAPIKey(req, 'compliance:check')).rejects.toThrow();
        expect(mockValidateAPIKey).toHaveBeenCalledWith('bb_live_myrawkey123456');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireAPIKey — permission check
// ─────────────────────────────────────────────────────────────────────────────

describe('requireAPIKey — permission check', () => {
    test('throws 403 insufficient_permissions when key lacks required permission', async () => {
        const record = makeKeyRecord({ permissions: ['compliance:check'] });
        mockValidateAPIKey.mockResolvedValue(record);
        mockHasPermission.mockReturnValue(false);

        const req = makeRequest('Bearer bb_live_validkey');

        await expect(requireAPIKey(req, 'workflows:run')).rejects.toMatchObject({
            statusCode: 403,
            code: 'insufficient_permissions',
        });
    });

    test('returns record when key has required permission', async () => {
        const record = makeKeyRecord({ permissions: ['compliance:check'] });
        mockValidateAPIKey.mockResolvedValue(record);
        mockHasPermission.mockReturnValue(true);

        const req = makeRequest('Bearer bb_live_validkey');

        const result = await requireAPIKey(req, 'compliance:check');
        expect(result).toEqual(record);
    });

    test('passes record and permission to hasPermission', async () => {
        const record = makeKeyRecord();
        mockValidateAPIKey.mockResolvedValue(record);
        mockHasPermission.mockReturnValue(true);

        const req = makeRequest('Bearer bb_live_key');
        await requireAPIKey(req, 'research:start');

        expect(mockHasPermission).toHaveBeenCalledWith(record, 'research:start');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// APIKeyError class
// ─────────────────────────────────────────────────────────────────────────────

describe('APIKeyError', () => {
    test('is an instance of Error', () => {
        const err = new APIKeyError(401, 'missing_api_key', 'Header required');
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(APIKeyError);
    });

    test('sets name to APIKeyError', () => {
        const err = new APIKeyError(401, 'test', 'msg');
        expect(err.name).toBe('APIKeyError');
    });

    test('stores statusCode and code', () => {
        const err = new APIKeyError(403, 'insufficient_permissions', 'No access');
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('insufficient_permissions');
        expect(err.message).toBe('No access');
    });

    test('toResponse() returns a Response with correct status', async () => {
        const err = new APIKeyError(401, 'invalid_api_key', 'Bad key');
        const response = err.toResponse();

        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(401);
    });

    test('toResponse() body is JSON with error envelope', async () => {
        const err = new APIKeyError(403, 'insufficient_permissions', 'No access to workflow');
        const response = err.toResponse();
        const body = await response.json();

        expect(body.success).toBe(false);
        expect(body.error?.code).toBe('insufficient_permissions');
    });

    test('error message includes permission name for 403', async () => {
        const req = makeRequest('Bearer bb_live_validkey');
        const record = makeKeyRecord();
        mockValidateAPIKey.mockResolvedValue(record);
        mockHasPermission.mockReturnValue(false);

        let caught: APIKeyError | undefined;
        try {
            await requireAPIKey(req, 'workflows:run');
        } catch (e) {
            caught = e as APIKeyError;
        }

        expect(caught?.message).toContain('workflows:run');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: full auth flow
// ─────────────────────────────────────────────────────────────────────────────

describe('requireAPIKey — integration flow', () => {
    test('full success path: header → validate → permission → return record', async () => {
        const record = makeKeyRecord({
            permissions: ['compliance:check', 'workflows:list'],
        });
        mockValidateAPIKey.mockResolvedValue(record);
        mockHasPermission.mockReturnValue(true);

        const req = makeRequest('Bearer bb_live_goodkey12345678901234567890');
        const result = await requireAPIKey(req, 'workflows:list');

        expect(result.id).toBe('key-1');
        expect(result.orgId).toBe('org-123');
        expect(mockValidateAPIKey).toHaveBeenCalledWith('bb_live_goodkey12345678901234567890');
        expect(mockHasPermission).toHaveBeenCalledWith(record, 'workflows:list');
    });

    test('each permission type can be required', async () => {
        const permissions = ['compliance:check', 'workflows:list', 'workflows:run', 'research:start', 'research:status'] as const;

        for (const perm of permissions) {
            const record = makeKeyRecord({ permissions: [perm] });
            mockValidateAPIKey.mockResolvedValue(record);
            mockHasPermission.mockReturnValue(true);

            const req = makeRequest('Bearer bb_live_testkey');
            const result = await requireAPIKey(req, perm);
            expect(result.permissions).toContain(perm);
        }
    });
});
