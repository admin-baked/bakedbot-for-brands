import { createHash } from 'crypto';

import { requireAPIKey, APIKeyError } from '@/server/auth/api-key-auth';
import { getAdminFirestore } from '@/firebase/admin';
import type { APIKeyRecord } from '@/types/api-contract';

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/types/api-contract', () => ({
  makeAPIError: (code: string, message: string) => ({ success: false, error: { code, message } }),
}));

const mockedGetAdminFirestore = getAdminFirestore as jest.MockedFunction<typeof getAdminFirestore>;

function makeRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) {
    headers.set('authorization', authHeader);
  }

  return { headers } as Request;
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
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    active: true,
    ...overrides,
  };
}

function mockFirestoreResult(record: APIKeyRecord | null) {
  const get = jest.fn();
  const limit = jest.fn(() => ({ get }));
  const secondWhere = jest.fn(() => ({ limit }));
  const firstWhere = jest.fn(() => ({ where: secondWhere }));
  const collection = jest.fn(() => ({ where: firstWhere }));

  if (!record) {
    get.mockResolvedValue({ empty: true, docs: [] });
  } else {
    get.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: record.id,
          data: () => ({
            ...record,
            createdAt: record.createdAt.toISOString(),
          }),
        },
      ],
    });
  }

  mockedGetAdminFirestore.mockReturnValue({
    collection,
  } as never);

  return { collection, firstWhere, secondWhere, limit, get };
}

describe('requireAPIKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws a 401 when the Authorization header is missing', async () => {
    await expect(requireAPIKey(makeRequest(), 'compliance:check')).rejects.toMatchObject({
      statusCode: 401,
      code: 'missing_api_key',
    });
    expect(mockedGetAdminFirestore).not.toHaveBeenCalled();
  });

  it('throws a 401 when the Authorization header is not a Bearer token', async () => {
    await expect(requireAPIKey(makeRequest('Basic dXNlcjpwYXNz'), 'compliance:check')).rejects.toMatchObject({
      statusCode: 401,
      code: 'missing_api_key',
    });
    expect(mockedGetAdminFirestore).not.toHaveBeenCalled();
  });

  it('hashes the raw bearer token and looks it up in Firestore', async () => {
    const rawKey = 'bb_live_myrawkey123456';
    const expectedHash = createHash('sha256').update(rawKey).digest('hex');
    const query = mockFirestoreResult(null);

    await expect(requireAPIKey(makeRequest(`Bearer ${rawKey}`), 'compliance:check')).rejects.toMatchObject({
      statusCode: 401,
      code: 'invalid_api_key',
    });

    expect(query.collection).toHaveBeenCalledWith('api_keys');
    expect(query.firstWhere).toHaveBeenCalledWith('keyHash', '==', expectedHash);
    expect(query.secondWhere).toHaveBeenCalledWith('active', '==', true);
  });

  it('throws a 401 when no active key record is found', async () => {
    mockFirestoreResult(null);

    await expect(requireAPIKey(makeRequest('Bearer bb_live_invalidkey123'), 'compliance:check')).rejects.toMatchObject({
      statusCode: 401,
      code: 'invalid_api_key',
    });
  });

  it('throws a 403 when the key lacks the required permission', async () => {
    mockFirestoreResult(makeKeyRecord({ permissions: ['compliance:check'] }));

    await expect(requireAPIKey(makeRequest('Bearer bb_live_validkey'), 'workflows:run')).rejects.toMatchObject({
      statusCode: 403,
      code: 'insufficient_permissions',
      message: expect.stringContaining('workflows:run'),
    });
  });

  it('returns the record when the key has the required permission', async () => {
    const record = makeKeyRecord({ permissions: ['compliance:check', 'workflows:list'] });
    mockFirestoreResult(record);

    const result = await requireAPIKey(makeRequest('Bearer bb_live_validkey'), 'workflows:list');

    expect(result).toMatchObject({
      id: 'key-1',
      orgId: 'org-123',
      permissions: ['compliance:check', 'workflows:list'],
    });
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('treats the admin permission as a global allow', async () => {
    mockFirestoreResult(makeKeyRecord({ permissions: ['admin' as never] }));

    const result = await requireAPIKey(makeRequest('Bearer bb_live_adminkey'), 'research:status');

    expect(result.permissions).toContain('admin');
  });
});

describe('APIKeyError', () => {
  it('is an instance of Error', () => {
    const err = new APIKeyError(401, 'missing_api_key', 'Header required');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(APIKeyError);
  });

  it('stores status, code, and message', () => {
    const err = new APIKeyError(403, 'insufficient_permissions', 'No access');
    expect(err.name).toBe('APIKeyError');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('insufficient_permissions');
    expect(err.message).toBe('No access');
  });

  it('serializes to an API error response', async () => {
    const err = new APIKeyError(403, 'insufficient_permissions', 'No access to workflow');
    const response = err.toResponse();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: {
        code: 'insufficient_permissions',
        message: 'No access to workflow',
      },
    });
  });
});
