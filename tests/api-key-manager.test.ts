// tests/api-key-manager.test.ts
// Unit tests for API key management service + API key auth middleware

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Firestore mock
// ─────────────────────────────────────────────────────────────────────────────

const mockAdd = jest.fn();
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockDocUpdate = jest.fn();
const mockDocGet = jest.fn();

const mockDocRef = {
    id: 'doc-abc123',
    update: mockDocUpdate,
};

const mockCollection = jest.fn(() => ({
    add: mockAdd,
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: mockGet,
    doc: jest.fn(() => ({ update: mockDocUpdate, get: mockDocGet })),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: { collection: mockCollection },
    }),
}));

import {
    createAPIKey,
    validateAPIKey,
    revokeAPIKey,
    listAPIKeys,
    hasPermission,
} from '../src/server/services/api-key-manager';
import type { APIKeyRecord } from '../src/types/api-contract';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRecord(overrides: Partial<APIKeyRecord> = {}): APIKeyRecord {
    return {
        id: 'key-1',
        orgId: 'org-123',
        keyHash: 'abc123hash',
        keyPrefix: 'bb_live_a',
        name: 'Test Key',
        permissions: ['compliance:check'],
        rateLimitPerMinute: 60,
        createdAt: new Date('2026-01-01'),
        active: true,
        ...overrides,
    };
}

function makeFirestoreDoc(data: Record<string, unknown>, id = 'doc-1') {
    return {
        id,
        data: () => data,
        ref: { update: mockDocUpdate },
        exists: true,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockAdd.mockResolvedValue(mockDocRef);
    // doc.ref.update() must return a Promise (called in non-blocking lastUsedAt update)
    mockDocUpdate.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// createAPIKey
// ─────────────────────────────────────────────────────────────────────────────

describe('createAPIKey', () => {
    test('returns raw key starting with bb_live_ prefix', async () => {
        const { key, record } = await createAPIKey('org-1', 'My Key', ['compliance:check']);

        expect(key).toMatch(/^bb_live_/);
        expect(record.orgId).toBe('org-1');
        expect(record.name).toBe('My Key');
    });

    test('stores hashed key, not raw key', async () => {
        const { key, record } = await createAPIKey('org-1', 'Test', ['compliance:check']);

        // Hash should be 64-char hex (SHA-256)
        expect(record.keyHash).toMatch(/^[a-f0-9]{64}$/);
        // Raw key should NOT equal hash
        expect(record.keyHash).not.toBe(key);
    });

    test('sets keyPrefix to first 8+ chars for identification', async () => {
        const { key, record } = await createAPIKey('org-1', 'Key', ['compliance:check']);

        expect(key).toContain(record.keyPrefix);
        expect(record.keyPrefix.length).toBeGreaterThanOrEqual(8);
    });

    test('assigns requested permissions', async () => {
        const { record } = await createAPIKey('org-2', 'Multi', ['compliance:check', 'workflows:list']);

        expect(record.permissions).toContain('compliance:check');
        expect(record.permissions).toContain('workflows:list');
    });

    test('uses default rate limit when not specified', async () => {
        const { record } = await createAPIKey('org-1', 'Key', ['compliance:check']);
        expect(record.rateLimitPerMinute).toBe(60);
    });

    test('uses custom rate limit when specified', async () => {
        const { record } = await createAPIKey('org-1', 'Key', ['compliance:check'], 120);
        expect(record.rateLimitPerMinute).toBe(120);
    });

    test('sets active=true on creation', async () => {
        const { record } = await createAPIKey('org-1', 'Key', ['compliance:check']);
        expect(record.active).toBe(true);
    });

    test('returns id from Firestore doc', async () => {
        const { record } = await createAPIKey('org-1', 'Key', ['compliance:check']);
        expect(record.id).toBe('doc-abc123');
    });

    test('writes record to api_keys collection', async () => {
        await createAPIKey('org-1', 'Key', ['compliance:check']);
        expect(mockCollection).toHaveBeenCalledWith('api_keys');
        expect(mockAdd).toHaveBeenCalledTimes(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateAPIKey
// ─────────────────────────────────────────────────────────────────────────────

describe('validateAPIKey', () => {
    test('returns null for keys without bb_live_ prefix', async () => {
        const result = await validateAPIKey('sk-invalid-key');
        expect(result).toBeNull();
        // Should short-circuit before hitting Firestore
        expect(mockGet).not.toHaveBeenCalled();
    });

    test('returns null when key not found in Firestore', async () => {
        mockGet.mockResolvedValue({ empty: true, docs: [] });

        const result = await validateAPIKey('bb_live_notavalidkey123456789012345678');
        expect(result).toBeNull();
    });

    test('returns record when key is valid and active', async () => {
        const docData = {
            orgId: 'org-1',
            keyHash: 'somehash',
            keyPrefix: 'bb_live_a',
            name: 'Test Key',
            permissions: ['compliance:check'],
            rateLimitPerMinute: 60,
            createdAt: { toDate: () => new Date('2026-01-01') },
            active: true,
        };

        mockGet.mockResolvedValue({
            empty: false,
            docs: [makeFirestoreDoc(docData, 'key-doc-1')],
        });

        const result = await validateAPIKey('bb_live_validkey123456789012345678901234');
        expect(result).not.toBeNull();
        expect(result?.id).toBe('key-doc-1');
        expect(result?.orgId).toBe('org-1');
        expect(result?.name).toBe('Test Key');
    });

    test('returns null for expired key', async () => {
        const expiredDate = new Date(Date.now() - 1000); // 1 second ago
        const docData = {
            orgId: 'org-1',
            keyHash: 'hash',
            keyPrefix: 'bb_live_a',
            name: 'Expired Key',
            permissions: ['compliance:check'],
            rateLimitPerMinute: 60,
            createdAt: { toDate: () => new Date() },
            expiresAt: { toDate: () => expiredDate },
            active: true,
        };

        mockGet.mockResolvedValue({
            empty: false,
            docs: [makeFirestoreDoc(docData)],
        });

        const result = await validateAPIKey('bb_live_expiredkey12345678901234567890');
        expect(result).toBeNull();
    });

    test('returns record for key with future expiry', async () => {
        const futureDate = new Date(Date.now() + 86_400_000); // tomorrow
        const docData = {
            orgId: 'org-1',
            keyHash: 'hash',
            keyPrefix: 'bb_live_a',
            name: 'Active Key',
            permissions: ['compliance:check'],
            rateLimitPerMinute: 60,
            createdAt: { toDate: () => new Date() },
            expiresAt: { toDate: () => futureDate },
            active: true,
        };

        mockGet.mockResolvedValue({
            empty: false,
            docs: [makeFirestoreDoc(docData)],
        });

        const result = await validateAPIKey('bb_live_activekey12345678901234567890');
        expect(result).not.toBeNull();
    });

    test('non-blocking lastUsedAt update does not affect return', async () => {
        const docData = {
            orgId: 'org-1',
            keyHash: 'hash',
            keyPrefix: 'bb_live_a',
            name: 'Key',
            permissions: ['compliance:check'],
            rateLimitPerMinute: 60,
            createdAt: { toDate: () => new Date() },
            active: true,
        };

        mockDocUpdate.mockRejectedValue(new Error('Firestore offline'));
        mockGet.mockResolvedValue({
            empty: false,
            docs: [makeFirestoreDoc(docData)],
        });

        // Should still succeed even if lastUsedAt update fails
        const result = await validateAPIKey('bb_live_key1234567890123456789012345');
        expect(result).not.toBeNull();
    });

    test('handles Firestore Timestamps missing toDate gracefully', async () => {
        const docData = {
            orgId: 'org-1',
            keyHash: 'hash',
            keyPrefix: 'bb_live_a',
            name: 'Key',
            permissions: ['compliance:check'],
            rateLimitPerMinute: 60,
            createdAt: '2026-01-01T00:00:00Z', // plain string, no toDate
            active: true,
        };

        mockGet.mockResolvedValue({
            empty: false,
            docs: [makeFirestoreDoc(docData)],
        });

        const result = await validateAPIKey('bb_live_key1234567890123456789012345');
        expect(result).not.toBeNull();
        expect(result?.createdAt).toBeInstanceOf(Date);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// revokeAPIKey
// ─────────────────────────────────────────────────────────────────────────────

describe('revokeAPIKey', () => {
    test('returns true on successful revocation', async () => {
        mockDocUpdate.mockResolvedValue(undefined);

        const result = await revokeAPIKey('key-abc');
        expect(result).toBe(true);
    });

    test('sets active=false in Firestore', async () => {
        mockDocUpdate.mockResolvedValue(undefined);

        await revokeAPIKey('key-abc');
        expect(mockDocUpdate).toHaveBeenCalledWith({ active: false });
    });

    test('returns false when Firestore update fails', async () => {
        mockDocUpdate.mockRejectedValue(new Error('Firestore error'));

        const result = await revokeAPIKey('key-xyz');
        expect(result).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// listAPIKeys
// ─────────────────────────────────────────────────────────────────────────────

describe('listAPIKeys', () => {
    test('returns all keys for org without exposing hash', async () => {
        const docs = [
            makeFirestoreDoc({
                orgId: 'org-1', keyHash: 'real-hash-1', keyPrefix: 'bb_live_a',
                name: 'Key 1', permissions: ['compliance:check'], rateLimitPerMinute: 60,
                createdAt: { toDate: () => new Date() }, active: true,
            }, 'k1'),
            makeFirestoreDoc({
                orgId: 'org-1', keyHash: 'real-hash-2', keyPrefix: 'bb_live_b',
                name: 'Key 2', permissions: ['workflows:run'], rateLimitPerMinute: 30,
                createdAt: { toDate: () => new Date() }, active: false,
            }, 'k2'),
        ];

        mockGet.mockResolvedValue({ docs });

        const keys = await listAPIKeys('org-1');
        expect(keys).toHaveLength(2);
        expect(keys[0].id).toBe('k1');
        expect(keys[1].id).toBe('k2');
    });

    test('masks keyHash with *** in listing', async () => {
        const docs = [
            makeFirestoreDoc({
                orgId: 'org-1', keyHash: 'real-secret-hash', keyPrefix: 'bb_live_a',
                name: 'Key 1', permissions: ['compliance:check'], rateLimitPerMinute: 60,
                createdAt: { toDate: () => new Date() }, active: true,
            }, 'k1'),
        ];

        mockGet.mockResolvedValue({ docs });

        const keys = await listAPIKeys('org-1');
        expect(keys[0].keyHash).toBe('***');
    });

    test('returns empty array when org has no keys', async () => {
        mockGet.mockResolvedValue({ docs: [] });

        const keys = await listAPIKeys('org-no-keys');
        expect(keys).toEqual([]);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// hasPermission
// ─────────────────────────────────────────────────────────────────────────────

describe('hasPermission', () => {
    test('returns true when record has the permission', () => {
        const record = makeRecord({ permissions: ['compliance:check', 'workflows:list'] });
        expect(hasPermission(record, 'compliance:check')).toBe(true);
        expect(hasPermission(record, 'workflows:list')).toBe(true);
    });

    test('returns false when record lacks the permission', () => {
        const record = makeRecord({ permissions: ['compliance:check'] });
        expect(hasPermission(record, 'workflows:run')).toBe(false);
        expect(hasPermission(record, 'research:start')).toBe(false);
    });

    test('returns false for empty permissions array', () => {
        const record = makeRecord({ permissions: [] });
        expect(hasPermission(record, 'compliance:check')).toBe(false);
    });

    test('all permissions work correctly', () => {
        const allPermissions: Array<'compliance:check' | 'workflows:list' | 'workflows:run' | 'research:start' | 'research:status'> = [
            'compliance:check', 'workflows:list', 'workflows:run', 'research:start', 'research:status',
        ];
        const record = makeRecord({ permissions: allPermissions });

        for (const perm of allPermissions) {
            expect(hasPermission(record, perm)).toBe(true);
        }
    });
});
