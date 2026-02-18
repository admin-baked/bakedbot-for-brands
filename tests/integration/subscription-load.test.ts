/**
 * Subscription Load Tests
 *
 * Verifies the subscription system handles concurrent workloads without
 * race conditions, data corruption, or silent failures.
 *
 * Patterns from: tests/performance/endpoint-latency.bench.ts (Promise.all runner)
 */

import {
  createSubscription,
  cancelSubscription,
  upgradeSubscription,
  getSubscription,
} from '@/server/actions/subscription';

jest.setTimeout(30000);

jest.mock('@/firebase/server-client', () => ({ createServerClient: jest.fn() }));
jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn().mockResolvedValue({ uid: 'user123', email: 'user@test.com' }),
}));
jest.mock('@/lib/payments/authorize-net', () => ({
  createCustomerProfile: jest.fn().mockResolvedValue({
    customerProfileId: 'profile123',
    customerPaymentProfileId: 'payProfile123',
  }),
  createSubscriptionFromProfile: jest.fn().mockResolvedValue({ subscriptionId: 'arb_sub_123' }),
  cancelARBSubscription: jest.fn().mockResolvedValue(undefined),
  updateARBSubscription: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/server/services/billing-notifications', () => ({
  notifySubscriptionCreated: jest.fn().mockResolvedValue(true),
  notifySubscriptionCanceled: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/server/actions/promos', () => ({
  validatePromoCode: jest.fn().mockResolvedValue({ valid: false }),
}));
jest.mock('@/server/actions/playbooks', () => ({
  assignTierPlaybooks: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/server/events/emitter', () => ({
  emitEvent: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/logger');
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => ({ _seconds: 1000000 })) },
  Timestamp: { fromDate: jest.fn((d: Date) => ({ seconds: Math.floor(d.getTime() / 1000) })) },
}));

// ─── Mock factory ──────────────────────────────────────────────────────────────

function buildMocks() {
  const mockQuery: any = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], size: 0, empty: true }),
  };
  const mockDocRef: any = {
    get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    collection: jest.fn(),
  };
  const mockCollectionRef: any = {
    doc: jest.fn().mockReturnValue(mockDocRef),
    where: jest.fn().mockReturnValue(mockQuery),
    add: jest.fn().mockResolvedValue({ id: `doc-${Date.now()}-${Math.random()}` }),
    get: jest.fn().mockResolvedValue({ docs: [], size: 0, empty: true }),
    orderBy: jest.fn().mockReturnValue(mockQuery),
    limit: jest.fn().mockReturnValue(mockQuery),
  };
  mockDocRef.collection = jest.fn().mockReturnValue(mockCollectionRef);
  const mockDb = { collection: jest.fn().mockReturnValue(mockCollectionRef) };
  return { mockDb, mockDocRef, mockCollectionRef };
}

function setupSharedMock(orgData: Record<string, unknown> = { ownerId: 'user123', name: 'Org' }) {
  const mocks = buildMocks();
  mocks.mockCollectionRef.doc().get.mockResolvedValue({ exists: true, data: () => orgData });
  (require('@/firebase/server-client').createServerClient as jest.Mock)
    .mockResolvedValue({ firestore: mocks.mockDb });
  return mocks;
}

const BASE_CREATE_INPUT = {
  tierId: 'pro' as const,
  opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'tok_test' },
  billTo: {
    firstName: 'John', lastName: 'Doe',
    address: '123 Main St', city: 'Springfield',
    state: 'IL', zip: '62701',
  },
};

beforeEach(() => jest.clearAllMocks());

// ─── Concurrent Subscription Creation ─────────────────────────────────────────

describe('Concurrent Subscription Creation', () => {
  it('5 simultaneous createSubscription calls all return { success: true }', async () => {
    setupSharedMock({ ownerId: 'user123', name: 'Shared Test Org' });

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createSubscription({ ...BASE_CREATE_INPUT, orgId: `org_load_${i}` })
      )
    );

    expect(results).toHaveLength(5);
    results.forEach((r) => expect(r.success).toBe(true));
  });

  it('10 concurrent getSubscription calls all resolve without errors', async () => {
    setupSharedMock({ tierId: 'pro', status: 'active', amount: 99 });

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => getSubscription(`org_load_${i}`))
    );

    expect(results).toHaveLength(10);
    results.forEach((r) => expect(r).toBeDefined());
  });

  it('5 concurrent cancelSubscription calls all return { success: true }', async () => {
    const { mockCollectionRef } = setupSharedMock();
    mockCollectionRef.doc().get.mockResolvedValue({
      exists: true,
      data: () => ({ ownerId: 'user123', tierId: 'pro', authorizeNetSubscriptionId: 'arb_123' }),
    });

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => cancelSubscription(`org_load_${i}`))
    );

    expect(results).toHaveLength(5);
    results.forEach((r) => expect(r.success).toBe(true));
  });
});

// ─── Concurrent Upgrade + Cancel Race Conditions ───────────────────────────────

describe('Concurrent Upgrade + Cancel Race Conditions', () => {
  it('concurrent upgrade and cancel on same org both return { success: boolean } without crashing', async () => {
    const { mockCollectionRef } = setupSharedMock({ ownerId: 'user123' });
    mockCollectionRef.doc().get.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerId: 'user123',
        tierId: 'pro',
        status: 'active',
        amount: 99,
        authorizeNetSubscriptionId: 'arb_sub_123',
      }),
    });

    const [upgradeResult, cancelResult] = await Promise.allSettled([
      upgradeSubscription('org1', 'growth'),
      cancelSubscription('org1'),
    ]);

    // Neither should throw an uncaught exception
    expect(upgradeResult.status).toBe('fulfilled');
    expect(cancelResult.status).toBe('fulfilled');

    const upgrade = (upgradeResult as PromiseFulfilledResult<any>).value;
    const cancel = (cancelResult as PromiseFulfilledResult<any>).value;

    expect(typeof upgrade.success).toBe('boolean');
    expect(typeof cancel.success).toBe('boolean');

    // At least one should succeed
    expect(upgrade.success || cancel.success).toBe(true);
  });

  it('sequential upgrade then cancel completes cleanly', async () => {
    const { mockCollectionRef } = setupSharedMock({ ownerId: 'user123' });
    mockCollectionRef.doc().get.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerId: 'user123',
        tierId: 'pro',
        status: 'active',
        amount: 99,
        authorizeNetSubscriptionId: 'arb_sub_123',
      }),
    });

    const upgradeResult = await upgradeSubscription('org1', 'growth');
    expect(upgradeResult.success).toBe(true);

    const cancelResult = await cancelSubscription('org1');
    expect(cancelResult.success).toBe(true);
  });
});

// ─── Invoice Record Accumulation Under Load ────────────────────────────────────

describe('Invoice Record Accumulation Under Load', () => {
  it('3 sequential upgrades each trigger a separate invoice add() call', async () => {
    const { mockCollectionRef } = setupSharedMock({ ownerId: 'user123' });
    mockCollectionRef.doc().get.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerId: 'user123',
        tierId: 'pro',
        status: 'active',
        amount: 99,
        authorizeNetSubscriptionId: 'arb_sub_123',
      }),
    });

    const addCalls: unknown[] = [];
    mockCollectionRef.add.mockImplementation((d: unknown) => {
      addCalls.push(d);
      return Promise.resolve({ id: `inv-${addCalls.length}` });
    });

    await upgradeSubscription('org1', 'growth');
    await upgradeSubscription('org2', 'growth');
    await upgradeSubscription('org3', 'growth');

    expect(addCalls.length).toBeGreaterThanOrEqual(3);
  });

  it('invoice write failure never blocks 5 concurrent upgrade calls', async () => {
    const { mockCollectionRef } = setupSharedMock({ ownerId: 'user123' });
    mockCollectionRef.doc().get.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerId: 'user123',
        tierId: 'pro',
        status: 'active',
        amount: 99,
        authorizeNetSubscriptionId: 'arb_sub_123',
      }),
    });

    // Alternate success / failure on invoice add()
    let callCount = 0;
    mockCollectionRef.add.mockImplementation(() => {
      callCount++;
      return callCount % 2 === 0
        ? Promise.reject(new Error('Firestore quota exceeded'))
        : Promise.resolve({ id: `inv-${callCount}` });
    });

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => upgradeSubscription(`org_load_${i}`, 'growth'))
    );

    // All 5 must succeed even when invoice writes fail (non-blocking pattern)
    results.forEach((r) => expect(r.success).toBe(true));
  });
});

// ─── ARB Failure Resilience Under Load ────────────────────────────────────────

describe('ARB Failure Resilience Under Concurrent Load', () => {
  it('5 concurrent cancel calls with ARB failures all still return { success: true }', async () => {
    const { mockCollectionRef } = setupSharedMock({ ownerId: 'user123' });
    mockCollectionRef.doc().get.mockResolvedValue({
      exists: true,
      data: () => ({ ownerId: 'user123', tierId: 'pro', authorizeNetSubscriptionId: 'arb_sub_123' }),
    });

    const { cancelARBSubscription } = require('@/lib/payments/authorize-net');
    cancelARBSubscription.mockRejectedValue(new Error('ARB service unavailable'));

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => cancelSubscription(`org_load_${i}`))
    );

    // ARB failure is non-blocking — cancel always succeeds in Firestore
    results.forEach((r) => expect(r.success).toBe(true));
  });

  it('org with valid ARB ID succeeds, org without ARB ID fails with correct error', async () => {
    // Run sequentially to guarantee deterministic mock consumption
    const { mockCollectionRef: mc1 } = buildMocks();
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: { collection: jest.fn().mockReturnValue(mc1) } });
    mc1.doc().get
      .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
      .mockResolvedValueOnce({ exists: true, data: () => ({ tierId: 'pro', status: 'active', amount: 99, authorizeNetSubscriptionId: 'arb_001' }) });
    const validResult = await upgradeSubscription('org_valid', 'growth');
    expect(validResult.success).toBe(true);

    const { mockCollectionRef: mc2 } = buildMocks();
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: { collection: jest.fn().mockReturnValue(mc2) } });
    mc2.doc().get
      .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
      .mockResolvedValueOnce({ exists: true, data: () => ({ tierId: 'pro', status: 'active', amount: 99 }) });
    const noArbResult = await upgradeSubscription('org_no_arb', 'growth');
    expect(noArbResult.success).toBe(false);
    expect(noArbResult.error).toMatch(/authorize\.net/i);
  });
});
