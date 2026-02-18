/**
 * Subscription Security Tests
 *
 * Validates: IDOR prevention, unauthenticated access rejection,
 * input validation enforcement, source code audit, and promo code security.
 *
 * Patterns from: tests/server/security/q1-2026-audit-part2.test.ts
 */

import fs from 'fs/promises';
import path from 'path';
import {
  createSubscription,
  cancelSubscription,
  upgradeSubscription,
} from '@/server/actions/subscription';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/firebase/server-client', () => ({ createServerClient: jest.fn() }));
jest.mock('@/server/auth/auth', () => ({ requireUser: jest.fn() }));
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
jest.mock('@/server/events/emitter', () => ({ emitEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/logger');
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => ({ _seconds: 1000000 })) },
  Timestamp: { fromDate: jest.fn((d: Date) => ({ seconds: Math.floor(d.getTime() / 1000) })) },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMocks(orgData: Record<string, unknown> = { ownerId: 'owner-uid' }) {
  const mockQuery: any = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], size: 0, empty: true }),
  };
  const mockDocRef: any = {
    get: jest.fn().mockResolvedValue({ exists: true, data: () => orgData }),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    collection: jest.fn(),
  };
  const mockCollectionRef: any = {
    doc: jest.fn().mockReturnValue(mockDocRef),
    where: jest.fn().mockReturnValue(mockQuery),
    add: jest.fn().mockResolvedValue({ id: 'doc-id' }),
    get: jest.fn().mockResolvedValue({ docs: [], size: 0, empty: true }),
    orderBy: jest.fn().mockReturnValue(mockQuery),
    limit: jest.fn().mockReturnValue(mockQuery),
  };
  mockDocRef.collection = jest.fn().mockReturnValue(mockCollectionRef);
  const mockDb = { collection: jest.fn().mockReturnValue(mockCollectionRef) };
  return { mockDb, mockDocRef, mockCollectionRef };
}

function setupAuth(uid: string) {
  (require('@/server/auth/auth').requireUser as jest.Mock)
    .mockResolvedValue({ uid, email: `${uid}@test.com` });
}

function setupDb(orgData?: Record<string, unknown>) {
  const mocks = buildMocks(orgData);
  (require('@/firebase/server-client').createServerClient as jest.Mock)
    .mockResolvedValue({ firestore: mocks.mockDb });
  return mocks;
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

beforeEach(() => jest.clearAllMocks());

// ─── IDOR Prevention ──────────────────────────────────────────────────────────

describe('Authorization — IDOR Prevention', () => {
  it('cancelSubscription rejects when authenticated user is not org owner', async () => {
    setupAuth('attacker-uid');
    setupDb({ ownerId: 'victim-uid' });

    const result = await cancelSubscription('org1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not authorized/i);
  });

  it('upgradeSubscription rejects when authenticated user is not org owner', async () => {
    setupAuth('attacker-uid');
    setupDb({ ownerId: 'victim-uid' });

    const result = await upgradeSubscription('org1', 'growth');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not authorized/i);
  });

  it('createSubscription rejects when authenticated user is not org owner', async () => {
    setupAuth('attacker-uid');
    setupDb({ ownerId: 'victim-uid' });

    const result = await createSubscription(CREATE_INPUT);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('ownerUid fallback field is also honoured for ownership check', async () => {
    setupAuth('user123');
    const { mockCollectionRef } = setupDb({ ownerUid: 'user123' });
    mockCollectionRef.doc().get
      .mockResolvedValueOnce({ exists: true, data: () => ({ ownerUid: 'user123' }) })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ tierId: 'pro', authorizeNetSubscriptionId: 'arb_sub_123' }),
      });

    const result = await cancelSubscription('org1');
    expect(result.success).toBe(true);
  });
});

// ─── Unauthenticated Access ───────────────────────────────────────────────────

describe('Authorization — Unauthenticated Access', () => {
  beforeEach(() => {
    (require('@/server/auth/auth').requireUser as jest.Mock)
      .mockRejectedValue(new Error('Unauthorized'));
    setupDb();
  });

  it('cancelSubscription rejects unauthenticated requests gracefully', async () => {
    const result = await cancelSubscription('org1');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('upgradeSubscription rejects unauthenticated requests gracefully', async () => {
    const result = await upgradeSubscription('org1', 'growth');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('createSubscription rejects unauthenticated requests gracefully', async () => {
    const result = await createSubscription(CREATE_INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ─── Input Validation ─────────────────────────────────────────────────────────

describe('Input Validation — Zod Schema Enforcement', () => {
  beforeEach(() => {
    setupAuth('user123');
    setupDb({ ownerId: 'user123', name: 'Test Org' });
  });

  it.each([['enterprise'], ['free'], ['']])(
    'createSubscription rejects invalid tierId "%s"',
    async (tierId) => {
      const result = await createSubscription({ ...CREATE_INPUT, tierId: tierId as any });
      expect(result.success).toBe(false);
    }
  );

  it('createSubscription rejects empty orgId', async () => {
    const result = await createSubscription({ ...CREATE_INPUT, orgId: '' });
    expect(result.success).toBe(false);
  });

  it('createSubscription rejects state code longer than 2 chars', async () => {
    const result = await createSubscription({
      ...CREATE_INPUT,
      billTo: { ...CREATE_INPUT.billTo, state: 'Illinois' },
    });
    expect(result.success).toBe(false);
  });

  it('createSubscription rejects state code shorter than 2 chars', async () => {
    const result = await createSubscription({
      ...CREATE_INPUT,
      billTo: { ...CREATE_INPUT.billTo, state: 'I' },
    });
    expect(result.success).toBe(false);
  });

  it('createSubscription rejects zip code under 5 characters', async () => {
    const result = await createSubscription({
      ...CREATE_INPUT,
      billTo: { ...CREATE_INPUT.billTo, zip: '123' },
    });
    expect(result.success).toBe(false);
  });

  it('upgradeSubscription rejects downgrade attempts (empire → pro)', async () => {
    const { mockCollectionRef } = setupDb({ ownerId: 'user123' });
    mockCollectionRef.doc().get
      .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ tierId: 'empire', status: 'active', amount: 999, authorizeNetSubscriptionId: 'arb_123' }),
      });

    const result = await upgradeSubscription('org1', 'pro');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/downgrade/i);
  });

  it('upgradeSubscription rejects same-tier selection', async () => {
    const { mockCollectionRef } = setupDb({ ownerId: 'user123' });
    mockCollectionRef.doc().get
      .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ tierId: 'pro', status: 'active', amount: 99, authorizeNetSubscriptionId: 'arb_123' }),
      });

    const result = await upgradeSubscription('org1', 'pro');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/same tier/i);
  });
});

// ─── Source Code Audit ────────────────────────────────────────────────────────

describe('Source Code Audit — Subscription Security', () => {
  let src: string;

  beforeAll(async () => {
    src = await fs.readFile(
      path.join(process.cwd(), 'src/server/actions/subscription.ts'),
      'utf-8'
    );
  });

  it("has 'use server' directive", () => {
    expect(src).toContain("'use server'");
  });

  it('createSubscription calls requireUser()', () => {
    const start = src.indexOf('export async function createSubscription');
    const end = src.indexOf('\nexport async function ', start + 1);
    expect(src.slice(start, end > start ? end : undefined)).toContain('requireUser()');
  });

  it('cancelSubscription calls requireUser()', () => {
    const start = src.indexOf('export async function cancelSubscription');
    const end = src.indexOf('\nexport async function ', start + 1);
    expect(src.slice(start, end > start ? end : undefined)).toContain('requireUser()');
  });

  it('upgradeSubscription calls requireUser()', () => {
    const start = src.indexOf('export async function upgradeSubscription');
    const end = src.indexOf('\nexport async function ', start + 1);
    expect(src.slice(start, end > start ? end : undefined)).toContain('requireUser()');
  });

  it('no hardcoded API keys or secrets', () => {
    expect(src).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
    expect(src).not.toMatch(/AUTHNET_TRANSACTION_KEY\s*=\s*['"]/);
    expect(src).not.toMatch(/password\s*[:=]\s*['"][^'"]{8,}/i);
  });

  it('uses logger not console.log / console.error', () => {
    expect(src).not.toContain('console.log');
    expect(src).not.toContain('console.error');
  });

  it('validates org ownership in all mutation functions', () => {
    expect(src).toContain('ownerId !== user.uid');
    expect(src).toContain('ownerUid !== user.uid');
  });
});

// ─── Promo Code Security ──────────────────────────────────────────────────────

describe('Promo Code Security', () => {
  it('scout tier is ineligible for all promo codes', async () => {
    const { validatePromoCode } = jest.requireActual('@/server/actions/promos') as any;
    const result = await validatePromoCode('EARLYBIRD50', 'scout', 'org1');
    expect(result.valid).toBe(false);
  });

  it('unknown promo codes always return { valid: false }', async () => {
    const { validatePromoCode } = jest.requireActual('@/server/actions/promos') as any;
    const result = await validatePromoCode('TOTALLY_FAKE_CODE_9999', 'pro', 'org1');
    expect(result.valid).toBe(false);
  });

  it('EARLYBIRD50 is rejected when max redemptions are exceeded (51 > 50)', async () => {
    // promos.ts uses .collection().where().count().get() and reads .data().count
    const mockCountQuery: any = {
      get: jest.fn().mockResolvedValue({ data: () => ({ count: 51 }) }),
    };
    const mockQuery: any = {
      where: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnValue(mockCountQuery),
    };
    const mockCollRef: any = { where: jest.fn().mockReturnValue(mockQuery) };
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: { collection: jest.fn().mockReturnValue(mockCollRef) } });

    const { validatePromoCode } = jest.requireActual('@/server/actions/promos') as any;
    const result = await validatePromoCode('EARLYBIRD50', 'pro', 'org1');
    expect(result.valid).toBe(false);
  });

  it('SOCIALEQUITY is rejected when SE application status is not approved', async () => {
    const mockDocRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ status: 'pending' }) }),
    };
    const mockRedemptionQuery: any = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ size: 0, docs: [], empty: true }),
    };
    const mockCollRef: any = {
      doc: jest.fn().mockReturnValue(mockDocRef),
      where: jest.fn().mockReturnValue(mockRedemptionQuery),
    };
    (require('@/firebase/server-client').createServerClient as jest.Mock)
      .mockResolvedValue({ firestore: { collection: jest.fn().mockReturnValue(mockCollRef) } });

    const { validatePromoCode } = jest.requireActual('@/server/actions/promos') as any;
    const result = await validatePromoCode('SOCIALEQUITY', 'pro', 'org1');
    expect(result.valid).toBe(false);
  });
});
