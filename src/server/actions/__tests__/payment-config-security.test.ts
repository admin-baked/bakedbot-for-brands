import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockGet,
  update: mockUpdate,
}));
const mockCollection = jest.fn((name: string) => {
  if (name === 'locations') {
    return { doc: mockDoc };
  }
  return { doc: jest.fn() };
});

const mockRequireUser = jest.fn();

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(async () => ({
    firestore: {
      collection: mockCollection,
    },
  })),
}));

jest.mock('@/server/auth/auth', () => ({
  requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('payment-config security', () => {
  let getPaymentConfig: typeof import('../payment-config').getPaymentConfig;
  let updatePaymentMethod: typeof import('../payment-config').updatePaymentMethod;

  beforeAll(async () => {
    const mod = await import('../payment-config');
    getPaymentConfig = mod.getPaymentConfig;
    updatePaymentMethod = mod.updatePaymentMethod;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });
  });

  it('rejects invalid location ids for getPaymentConfig', async () => {
    const result = await getPaymentConfig('bad/location');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid location id');
    expect(mockCollection).not.toHaveBeenCalledWith('locations');
  });

  it('blocks cross-org reads for non-super users', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orgId: 'org-b',
        paymentConfig: { enabledMethods: ['dispensary_direct'] },
      }),
    });

    const result = await getPaymentConfig('loc-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('allows super users to read cross-org locations', async () => {
    mockRequireUser.mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
    });
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orgId: 'org-b',
        paymentConfig: { enabledMethods: ['dispensary_direct', 'usdc'] },
      }),
    });

    const result = await getPaymentConfig('loc-1');

    expect(result.success).toBe(true);
    expect(result.data?.enabledMethods).toContain('usdc');
  });

  it('rejects invalid location ids for updatePaymentMethod', async () => {
    const result = await updatePaymentMethod({
      locationId: 'bad/location',
      method: 'aeropay',
      enabled: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid location id');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('blocks cross-org writes for non-super users', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orgId: 'org-b',
        paymentConfig: { enabledMethods: ['dispensary_direct'] },
      }),
    });

    const result = await updatePaymentMethod({
      locationId: 'loc-1',
      method: 'cannpay',
      enabled: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('allows writes for same-org users', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orgId: 'org-a',
        paymentConfig: { enabledMethods: ['dispensary_direct'] },
      }),
    });

    const result = await updatePaymentMethod({
      locationId: 'loc-1',
      method: 'usdc',
      enabled: true,
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
