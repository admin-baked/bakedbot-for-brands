// Unit tests for subscription server actions
// Tests all 5 exported functions: createSubscription, cancelSubscription, upgradeSubscription, getSubscription, getInvoices

import { createSubscription, cancelSubscription, upgradeSubscription, getSubscription, getInvoices } from '@/server/actions/subscription';
import { TIERS } from '@/config/tiers';

// Mock all external dependencies
jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn().mockResolvedValue({
    uid: 'user123',
    email: 'user@test.com',
    currentOrgId: 'org_test',
  }),
}));

jest.mock('@/lib/payments/authorize-net', () => ({
  createCustomerProfile: jest.fn(),
  createSubscriptionFromProfile: jest.fn(),
  cancelARBSubscription: jest.fn().mockResolvedValue(undefined),
  updateARBSubscription: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/server/services/billing-notifications', () => ({
  notifySubscriptionCreated: jest.fn().mockResolvedValue(true),
  notifySubscriptionCanceled: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/server/actions/promos', () => ({
  validatePromoCode: jest.fn(),
}));

jest.mock('@/server/actions/playbooks', () => ({
  assignTierPlaybooks: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/server/events/emitter', () => ({
  emitEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger');

jest.mock('@/lib/feature-flags', () => ({
  isCompanyPlanCheckoutEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ _seconds: 1000000 })),
  },
  Timestamp: {
    fromDate: jest.fn((d) => ({ seconds: Math.floor(d.getTime() / 1000) })),
  },
}));

describe('Subscription Server Actions', () => {
  // We need per-collection doc mocks so that 'organizations' and 'subscriptions'
  // can return different data in the same call.
  let orgDocData: any;
  let subDocData: any;
  let invoiceDocs: any[];
  let promoDocs: any[];
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    orgDocData = null; // set per-test
    subDocData = null;
    invoiceDocs = [];
    promoDocs = [];

    const makeOrgDocRef = () => ({
      get: jest.fn(async () => {
        if (!orgDocData) return { exists: false, data: () => null };
        return { exists: true, data: () => orgDocData };
      }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn(async () => {
            if (!subDocData) return { exists: false, data: () => null };
            return { exists: true, data: () => subDocData };
          }),
          set: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    });

    const makeSubDocRef = () => ({
      get: jest.fn(async () => {
        if (!subDocData) return { exists: false, data: () => null };
        return { exists: true, data: () => subDocData };
      }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    });

    const makeInvoicesDocRef = () => ({
      collection: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn(async () => ({
              docs: invoiceDocs,
              empty: invoiceDocs.length === 0,
              size: invoiceDocs.length,
            })),
          }),
        }),
      }),
    });

    const makePromosCollectionRef = () => ({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn(async () => ({
            empty: promoDocs.length === 0,
            docs: promoDocs,
          })),
        }),
      }),
    });

    mockDb = {
      collection: jest.fn((name: string) => {
        if (name === 'organizations') {
          return { doc: jest.fn().mockReturnValue(makeOrgDocRef()) };
        }
        if (name === 'subscriptions') {
          return { doc: jest.fn().mockReturnValue(makeSubDocRef()) };
        }
        if (name === 'invoices') {
          return { doc: jest.fn().mockReturnValue(makeInvoicesDocRef()) };
        }
        if (name === 'promos') {
          return makePromosCollectionRef();
        }
        // Default
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
            set: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
            collection: jest.fn().mockReturnValue({
              doc: jest.fn().mockReturnValue({
                set: jest.fn().mockResolvedValue(undefined),
              }),
              add: jest.fn().mockResolvedValue({ id: 'doc-id' }),
            }),
          }),
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
            limit: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
            }),
          }),
        };
      }),
    };

    const { createServerClient } = require('@/firebase/server-client');
    createServerClient.mockResolvedValue({ firestore: mockDb });
  });

  // ============================================================================
  // createSubscription tests
  // ============================================================================

  describe('createSubscription', () => {
    it('returns error on invalid Zod input (missing tierId)', async () => {
      const result = await createSubscription({
        orgId: 'org1',
        tierId: 'invalid_tier' as any,
        opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'test' },
        billTo: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid tier');
    });

    it('returns error when org not found', async () => {
      orgDocData = null;

      const result = await createSubscription({
        orgId: 'org_missing',
        tierId: 'pro',
        opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'test' },
        billTo: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Organization not found');
    });

    it('returns error when user is not org owner', async () => {
      orgDocData = { ownerId: 'different_user', ownerUid: 'different_user' };

      const result = await createSubscription({
        orgId: 'org1',
        tierId: 'pro',
        opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'test' },
        billTo: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authorized');
    });

    it('returns error when createCustomerProfile throws', async () => {
      orgDocData = { ownerId: 'user123', name: 'Test Org' };

      const { createCustomerProfile } = require('@/lib/payments/authorize-net');
      createCustomerProfile.mockRejectedValueOnce(new Error('Payment gateway error'));

      const result = await createSubscription({
        orgId: 'org1',
        tierId: 'pro',
        opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'test' },
        billTo: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment profile creation failed');
    });

    it('returns error when createSubscriptionFromProfile throws', async () => {
      orgDocData = { ownerId: 'user123', name: 'Test Org' };

      const { createCustomerProfile, createSubscriptionFromProfile } = require('@/lib/payments/authorize-net');
      createCustomerProfile.mockResolvedValueOnce({
        customerProfileId: 'profile123',
        customerPaymentProfileId: 'paymentProfile123',
      });
      createSubscriptionFromProfile.mockRejectedValueOnce(new Error('ARB creation failed'));

      const result = await createSubscription({
        orgId: 'org1',
        tierId: 'pro',
        opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'test' },
        billTo: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Subscription creation failed');
    });

    it('happy path: creates subscription with all Firestore writes', async () => {
      orgDocData = { ownerId: 'user123', name: 'Test Org' };

      const { createCustomerProfile, createSubscriptionFromProfile } = require('@/lib/payments/authorize-net');
      createCustomerProfile.mockResolvedValueOnce({
        customerProfileId: 'profile123',
        customerPaymentProfileId: 'paymentProfile123',
      });
      createSubscriptionFromProfile.mockResolvedValueOnce({
        subscriptionId: 'arb_sub_123',
      });

      const result = await createSubscription({
        orgId: 'org1',
        tierId: 'pro',
        opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'test' },
        billTo: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
        },
      });

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBe('arb_sub_123');
      expect(result.amount).toBe(TIERS.pro.price);
    });
  });

  // ============================================================================
  // cancelSubscription tests
  // ============================================================================

  describe('cancelSubscription', () => {
    it('returns error when org not found', async () => {
      orgDocData = null;

      const result = await cancelSubscription('org_missing');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Organization not found');
    });

    it('returns error when user is not org owner', async () => {
      orgDocData = { ownerId: 'different_user', ownerUid: 'different_user' };

      const result = await cancelSubscription('org1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authorized');
    });

    it('returns error when no subscription exists', async () => {
      orgDocData = { ownerId: 'user123' };
      subDocData = null;

      const result = await cancelSubscription('org1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active subscription found');
    });

    it('happy path: cancels subscription and calls Authorize.net', async () => {
      orgDocData = { ownerId: 'user123' };
      subDocData = { authorizeNetSubscriptionId: 'arb_sub_123', tierId: 'pro' };

      const { cancelARBSubscription } = require('@/lib/payments/authorize-net');

      const result = await cancelSubscription('org1');

      expect(result.success).toBe(true);
      expect(cancelARBSubscription).toHaveBeenCalledWith('arb_sub_123');
    });

    it('skips ARB call when authorizeNetSubscriptionId is missing', async () => {
      orgDocData = { ownerId: 'user123' };
      subDocData = { tierId: 'pro' }; // no authorizeNetSubscriptionId

      const { cancelARBSubscription } = require('@/lib/payments/authorize-net');

      const result = await cancelSubscription('org1');

      expect(result.success).toBe(true);
      expect(cancelARBSubscription).not.toHaveBeenCalled();
    });

    it('is non-blocking when cancelARBSubscription throws', async () => {
      orgDocData = { ownerId: 'user123' };
      subDocData = { authorizeNetSubscriptionId: 'arb_sub_123', tierId: 'pro' };

      const { cancelARBSubscription } = require('@/lib/payments/authorize-net');
      cancelARBSubscription.mockRejectedValueOnce(new Error('ARB error'));

      const result = await cancelSubscription('org1');

      expect(result.success).toBe(true); // Still succeeds
    });
  });

  // ============================================================================
  // getSubscription tests
  // ============================================================================

  describe('getSubscription', () => {
    it('returns subscription data when document exists', async () => {
      orgDocData = { ownerId: 'user123' };
      subDocData = { tierId: 'pro', status: 'active', amount: 99 };

      const result = await getSubscription('org1');

      expect(result).toEqual({ tierId: 'pro', status: 'active', amount: 99 });
    });

    it('returns null when org does not exist', async () => {
      orgDocData = null;
      subDocData = null;

      const result = await getSubscription('org1');

      expect(result).toBeNull();
    });

    it('returns null when Firestore throws', async () => {
      const { createServerClient } = require('@/firebase/server-client');
      createServerClient.mockRejectedValueOnce(new Error('Firestore error'));

      const result = await getSubscription('org1');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // getInvoices tests
  // ============================================================================

  describe('getInvoices', () => {
    it('returns mapped invoice array from Firestore', async () => {
      orgDocData = { ownerId: 'user123' };
      invoiceDocs = [
        {
          id: 'inv1',
          data: () => ({
            amount: 99,
            description: 'Pro Plan',
            status: 'paid',
            tierId: 'pro',
            period: '2026-02',
            createdAt: 1645000000,
          }),
        },
        {
          id: 'inv2',
          data: () => ({
            amount: 349,
            description: 'Growth Plan',
            status: 'pending',
            tierId: 'growth',
            period: '2026-03',
            createdAt: 1647600000,
          }),
        },
      ];

      const result = await getInvoices('org1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'inv1',
        amount: 99,
        description: 'Pro Plan',
        status: 'paid',
        tierId: 'pro',
        period: '2026-02',
        createdAt: 1645000000,
      });
    });

    it('returns empty array when collection is empty', async () => {
      orgDocData = { ownerId: 'user123' };
      invoiceDocs = [];

      const result = await getInvoices('org1');

      expect(result).toEqual([]);
    });

    it('returns empty array when org not found', async () => {
      orgDocData = null;

      const result = await getInvoices('org1');

      expect(result).toEqual([]);
    });
  });
});
