/**
 * Subscription Performance Benchmarks
 *
 * Measures latency and write efficiency of all subscription operations.
 * Thresholds are realistic for mocked I/O — catch regressions early.
 *
 * Patterns from: tests/performance/cache-performance.bench.ts
 */

import {
  createSubscription,
  cancelSubscription,
  upgradeSubscription,
  getSubscription,
  getInvoices,
} from '@/server/actions/subscription';

jest.setTimeout(15000);

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

// ─── Shared factory ────────────────────────────────────────────────────────────

function buildMocks() {
  const mockQuery: any = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
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
    add: jest.fn().mockResolvedValue({ id: `doc-${Date.now()}` }),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
    orderBy: jest.fn().mockReturnValue(mockQuery),
    limit: jest.fn().mockReturnValue(mockQuery),
  };
  mockDocRef.collection = jest.fn().mockReturnValue(mockCollectionRef);
  const mockDb = { collection: jest.fn().mockReturnValue(mockCollectionRef) };
  return { mockDb, mockDocRef, mockCollectionRef, mockQuery };
}

const CREATE_INPUT = {
  orgId: 'org1',
  tierId: 'pro' as const,
  opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'tok_test' },
  billTo: {
    firstName: 'John', lastName: 'Doe',
    address: '123 Main St', city: 'Springfield',
    state: 'IL', zip: '62701',
  },
};

// Accumulates timing data across tests for the afterAll summary
const timings: Record<string, number[]> = {};

function record(op: string, ms: number) {
  if (!timings[op]) timings[op] = [];
  timings[op].push(ms);
}

// ─── Subscription Action Latency ───────────────────────────────────────────────

describe('Subscription Action Latency', () => {
  it('createSubscription completes within 200ms (worst of 3 runs)', async () => {
    const { mockDb, mockCollectionRef } = buildMocks();
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: mockDb });

    const runs: number[] = [];
    for (let i = 0; i < 3; i++) {
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: true, data: () => ({ ownerId: 'user123', name: 'Test Org' }),
      });
      const t = performance.now();
      await createSubscription(CREATE_INPUT);
      const ms = performance.now() - t;
      runs.push(ms);
      record('createSubscription', ms);
    }
    expect(Math.max(...runs)).toBeLessThan(200);
  });

  it('cancelSubscription completes within 150ms (worst of 3 runs)', async () => {
    const { mockDb, mockCollectionRef } = buildMocks();
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: mockDb });

    const runs: number[] = [];
    for (let i = 0; i < 3; i++) {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
        .mockResolvedValueOnce({
          exists: true, data: () => ({ tierId: 'pro', authorizeNetSubscriptionId: 'arb_sub_123' }),
        });
      const t = performance.now();
      await cancelSubscription('org1');
      const ms = performance.now() - t;
      runs.push(ms);
      record('cancelSubscription', ms);
    }
    expect(Math.max(...runs)).toBeLessThan(150);
  });

  it('upgradeSubscription completes within 200ms (worst of 3 runs)', async () => {
    const { mockDb, mockCollectionRef } = buildMocks();
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: mockDb });

    const runs: number[] = [];
    for (let i = 0; i < 3; i++) {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ tierId: 'pro', status: 'active', amount: 99, authorizeNetSubscriptionId: 'arb_sub_123' }),
        });
      const t = performance.now();
      await upgradeSubscription('org1', 'growth');
      const ms = performance.now() - t;
      runs.push(ms);
      record('upgradeSubscription', ms);
    }
    expect(Math.max(...runs)).toBeLessThan(200);
  });

  it('getSubscription completes within 50ms (worst of 5 runs)', async () => {
    const { mockDb, mockCollectionRef } = buildMocks();
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: mockDb });
    mockCollectionRef.doc().get.mockResolvedValue({
      exists: true, data: () => ({ tierId: 'pro', status: 'active', amount: 99 }),
    });

    const runs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t = performance.now();
      await getSubscription('org1');
      const ms = performance.now() - t;
      runs.push(ms);
      record('getSubscription', ms);
    }
    expect(Math.max(...runs)).toBeLessThan(50);
  });

  it('getInvoices completes within 100ms (worst of 5 runs)', async () => {
    const { mockDb, mockCollectionRef } = buildMocks();
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: mockDb });
    mockCollectionRef.orderBy().limit().get.mockResolvedValue({
      docs: [{ id: 'inv1', data: () => ({ amount: 99, description: 'Pro Plan', status: 'pending', tierId: 'pro' }) }],
    });

    const runs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t = performance.now();
      await getInvoices('org1');
      const ms = performance.now() - t;
      runs.push(ms);
      record('getInvoices', ms);
    }
    expect(Math.max(...runs)).toBeLessThan(100);
  });
});

// ─── Firestore Write Efficiency ────────────────────────────────────────────────

describe('Firestore Write Efficiency', () => {
  it('createSubscription makes ≥2 set() writes and ≥1 add() (invoice)', async () => {
    const { mockDb, mockDocRef, mockCollectionRef } = buildMocks();
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: mockDb });

    mockCollectionRef.doc().get.mockResolvedValueOnce({
      exists: true, data: () => ({ ownerId: 'user123', name: 'Test Org' }),
    });

    const sets: unknown[] = [];
    const adds: unknown[] = [];
    mockDocRef.set.mockImplementation((d: unknown) => { sets.push(d); return Promise.resolve(); });
    mockCollectionRef.add.mockImplementation((d: unknown) => { adds.push(d); return Promise.resolve({ id: 'inv-id' }); });

    await createSubscription(CREATE_INPUT);

    expect(sets.length).toBeGreaterThanOrEqual(2);
    expect(adds.length).toBeGreaterThanOrEqual(1);
  });

  it('upgradeSubscription makes ≥2 set() writes and ≥1 add() (invoice)', async () => {
    const { mockDb, mockDocRef, mockCollectionRef } = buildMocks();
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: mockDb });

    mockCollectionRef.doc().get
      .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ tierId: 'pro', status: 'active', amount: 99, authorizeNetSubscriptionId: 'arb_sub_123' }),
      });

    const sets: unknown[] = [];
    const adds: unknown[] = [];
    mockDocRef.set.mockImplementation((d: unknown) => { sets.push(d); return Promise.resolve(); });
    mockCollectionRef.add.mockImplementation((d: unknown) => { adds.push(d); return Promise.resolve({ id: 'inv-id' }); });

    await upgradeSubscription('org1', 'growth');

    expect(sets.length).toBeGreaterThanOrEqual(2);
    expect(adds.length).toBeGreaterThanOrEqual(1);
  });

  it('cancelSubscription makes ≥2 set() writes and 0 add() calls', async () => {
    const { mockDb, mockDocRef, mockCollectionRef } = buildMocks();
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: mockDb });

    mockCollectionRef.doc().get
      .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
      .mockResolvedValueOnce({
        exists: true, data: () => ({ tierId: 'pro', authorizeNetSubscriptionId: 'arb_sub_123' }),
      });

    const sets: unknown[] = [];
    const adds: unknown[] = [];
    mockDocRef.set.mockImplementation((d: unknown) => { sets.push(d); return Promise.resolve(); });
    mockCollectionRef.add.mockImplementation((d: unknown) => { adds.push(d); return Promise.resolve({ id: 'x' }); });

    await cancelSubscription('org1');

    expect(sets.length).toBeGreaterThanOrEqual(2);
    expect(adds.length).toBe(0);
  });
});

// ─── Concurrent Operation Performance ─────────────────────────────────────────

describe('Concurrent Operation Performance', () => {
  it('5 concurrent createSubscription calls all return { success: true }', async () => {
    // Use a single shared mock that always returns org data — safe for concurrent reads
    const { mockDb, mockCollectionRef } = buildMocks();
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: mockDb });
    mockCollectionRef.doc().get.mockResolvedValue({
      exists: true, data: () => ({ ownerId: 'user123', name: 'Shared Org' }),
    });

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createSubscription({ ...CREATE_INPUT, orgId: `org_perf_${i}` })
      )
    );

    results.forEach((r) => expect(r.success).toBe(true));
  });

  it('10 concurrent getSubscription calls complete within 500ms total', async () => {
    const { mockDb, mockCollectionRef } = buildMocks();
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: mockDb });
    mockCollectionRef.doc().get.mockResolvedValue({
      exists: true, data: () => ({ tierId: 'pro', status: 'active', amount: 99 }),
    });

    const t = performance.now();
    const reads = await Promise.all(
      Array.from({ length: 10 }, (_, i) => getSubscription(`org_perf_${i}`))
    );
    const elapsed = performance.now() - t;

    expect(elapsed).toBeLessThan(500);
    reads.forEach((r) => expect(r).not.toBeNull());
  });
});

// ─── Benchmark Summary ─────────────────────────────────────────────────────────

afterAll(() => {
  const thresholds: Record<string, number> = {
    createSubscription: 200,
    cancelSubscription: 150,
    upgradeSubscription: 200,
    getSubscription: 50,
    getInvoices: 100,
  };

  console.log('\n📊 Subscription Performance Summary\n' + '─'.repeat(68));
  console.log('Operation'.padEnd(22) + 'Runs'.padEnd(6) + 'Avg ms'.padEnd(10) + 'Max ms'.padEnd(10) + 'Target'.padEnd(10) + 'Status');
  console.log('─'.repeat(68));

  for (const [op, times] of Object.entries(timings)) {
    if (!times.length) continue;
    const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
    const max = Math.max(...times).toFixed(1);
    const target = thresholds[op] ?? 0;
    const pass = parseFloat(max) <= target;
    console.log(
      op.padEnd(22) + String(times.length).padEnd(6) +
      avg.padEnd(10) + max.padEnd(10) +
      String(target).padEnd(10) + (pass ? '✅' : '❌')
    );
  }

  console.log('─'.repeat(68) + '\n');
});
