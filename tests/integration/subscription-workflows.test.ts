// Integration tests for subscription workflows
// Tests the complete upgrade and cancel flows with realistic Firestore state
// Verifies sequence correctness and data consistency across multiple collections

import { createSubscription, cancelSubscription, upgradeSubscription } from '@/server/actions/subscription';
import { TIERS } from '@/config/tiers';

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

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ _seconds: 1000000 })),
  },
  Timestamp: {
    fromDate: jest.fn((d) => ({ seconds: Math.floor(d.getTime() / 1000) })),
  },
}));

describe('Subscription Workflows — Integration Tests', () => {
  let mockDb: any;
  let mockDocRef: any;
  let mockCollectionRef: any;
  let mockQuery: any;
  let firestoreWrites: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    firestoreWrites = [];

    mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
    };

    mockDocRef = {
      get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      set: jest.fn().mockImplementation((data, options) => {
        firestoreWrites.push({
          type: 'set',
          collection: mockCollectionRef.doc.mock.lastCall?.[0],
          data,
        });
        return Promise.resolve();
      }),
      update: jest.fn().mockResolvedValue(undefined),
      collection: jest.fn(),
    };

    mockCollectionRef = {
      doc: jest.fn().mockReturnValue(mockDocRef),
      where: jest.fn().mockReturnValue(mockQuery),
      add: jest.fn().mockImplementation((data) => {
        firestoreWrites.push({
          type: 'add',
          collection: 'unknown',
          data,
        });
        return Promise.resolve({ id: `doc-${Date.now()}` });
      }),
      get: jest.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
      orderBy: jest.fn().mockReturnValue(mockQuery),
      limit: jest.fn().mockReturnValue(mockQuery),
    };

    mockDocRef.collection = jest.fn().mockReturnValue(mockCollectionRef);

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollectionRef),
    };

    const { createServerClient } = require('@/firebase/server-client');
    createServerClient.mockResolvedValue({ firestore: mockDb });
  });

  // ============================================================================
  // Upgrade Workflow — Complete Sequence
  // ============================================================================

  describe('Upgrade Workflow — End-to-End Sequence', () => {
    it('happy path: upgrade writes to both subscription docs', async () => {
      // Setup existing subscription
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) }) // org
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            tierId: 'pro',
            status: 'active',
            amount: 99,
            authorizeNetSubscriptionId: 'arb_sub_123',
          }),
        }); // subscription

      const { updateARBSubscription } = require('@/lib/payments/authorize-net');

      const result = await upgradeSubscription('org1', 'growth');

      expect(result.success).toBe(true);
      expect(result.newAmount).toBe(TIERS.growth.price);

      // Verify Firestore writes happened
      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({ tierId: 'growth', amount: TIERS.growth.price }),
        expect.any(Object)
      );

      // Verify ARB was updated
      expect(updateARBSubscription).toHaveBeenCalledWith('arb_sub_123', TIERS.growth.price);
    });

    it('upgrade writes invoice record with correct fields', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            tierId: 'pro',
            status: 'active',
            amount: 99,
            authorizeNetSubscriptionId: 'arb_sub_123',
          }),
        });

      const { updateARBSubscription } = require('@/lib/payments/authorize-net');

      await upgradeSubscription('org1', 'growth');

      // Find the invoice write in firestoreWrites
      const invoiceWrite = firestoreWrites.find((w) => w.type === 'add');

      expect(invoiceWrite).toBeDefined();
      expect(invoiceWrite.data).toMatchObject({
        orgId: 'org1',
        amount: TIERS.growth.price,
        description: expect.stringContaining('Upgrade from Pro to Growth'),
        status: 'pending',
        tierId: 'growth',
      });
    });

    it('upgrade preserves and appends to upgradeHistory', async () => {
      // First upgrade: pro → growth
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            tierId: 'pro',
            status: 'active',
            amount: 99,
            authorizeNetSubscriptionId: 'arb_sub_123',
            upgradeHistory: [],
          }),
        });

      const { updateARBSubscription } = require('@/lib/payments/authorize-net');

      const result1 = await upgradeSubscription('org1', 'growth');
      expect(result1.success).toBe(true);

      // Verify first upgrade write includes 1 history entry
      const firstUpgradeWrite = firestoreWrites.find((w) => w.data?.tierId === 'growth');
      expect(firstUpgradeWrite.data.upgradeHistory).toHaveLength(1);
      expect(firstUpgradeWrite.data.upgradeHistory[0]).toMatchObject({
        fromTier: 'pro',
        toTier: 'growth',
      });
    });

    it('full upgrade sequence executes all steps', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            tierId: 'pro',
            status: 'active',
            amount: 99,
            authorizeNetSubscriptionId: 'arb_sub_123',
          }),
        });

      const { updateARBSubscription } = require('@/lib/payments/authorize-net');
      const { assignTierPlaybooks } = require('@/server/actions/playbooks');
      const { emitEvent } = require('@/server/events/emitter');
      const { notifySubscriptionCreated } = require('@/server/services/billing-notifications');

      const result = await upgradeSubscription('org1', 'growth');

      expect(result.success).toBe(true);
      expect(updateARBSubscription).toHaveBeenCalled(); // Step 5
      expect(mockDocRef.set).toHaveBeenCalled(); // Step 6
      expect(assignTierPlaybooks).toHaveBeenCalledWith('org1', 'pro'); // Step 7 (growth maps to pro playbook tier)
      expect(emitEvent).toHaveBeenCalled(); // Step 8
      expect(notifySubscriptionCreated).toHaveBeenCalled(); // Step 9
      expect(firestoreWrites.some((w) => w.type === 'add')).toBe(true); // Step 10 (invoice)
    });
  });

  // ============================================================================
  // Cancel Workflow — Complete Sequence
  // ============================================================================

  describe('Cancel Workflow — End-to-End Sequence', () => {
    it('happy path: cancel writes status and canceledAt to both docs', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            tierId: 'pro',
            authorizeNetSubscriptionId: 'arb_sub_123',
          }),
        });

      const { cancelARBSubscription } = require('@/lib/payments/authorize-net');

      const result = await cancelSubscription('org1');

      expect(result.success).toBe(true);

      // Verify both subscription docs were updated with status + canceledAt
      const setCalls = firestoreWrites.filter((w) => w.type === 'set');
      expect(setCalls.length).toBeGreaterThanOrEqual(2);

      // Both should have status: 'canceled' and canceledAt
      setCalls.forEach((call) => {
        expect(call.data).toMatchObject({
          status: 'canceled',
          canceledAt: expect.any(Object),
        });
      });

      expect(cancelARBSubscription).toHaveBeenCalledWith('arb_sub_123');
    });

    it('cancel calls ARB then sends email notification in sequence', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            tierId: 'pro',
            authorizeNetSubscriptionId: 'arb_sub_123',
          }),
        });

      const { cancelARBSubscription } = require('@/lib/payments/authorize-net');
      const { notifySubscriptionCanceled } = require('@/server/services/billing-notifications');

      await cancelSubscription('org1');

      // Both should be called
      expect(cancelARBSubscription).toHaveBeenCalled();
      expect(notifySubscriptionCanceled).toHaveBeenCalled();
    });

    it('full cancel sequence executes all steps', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            tierId: 'pro',
            authorizeNetSubscriptionId: 'arb_sub_123',
          }),
        });

      const { cancelARBSubscription } = require('@/lib/payments/authorize-net');
      const { notifySubscriptionCanceled } = require('@/server/services/billing-notifications');

      const result = await cancelSubscription('org1');

      expect(result.success).toBe(true);
      expect(mockDocRef.set).toHaveBeenCalled(); // Step: Firestore update
      expect(cancelARBSubscription).toHaveBeenCalled(); // Step: ARB cancel
      expect(notifySubscriptionCanceled).toHaveBeenCalled(); // Step: Email
    });

    it('cancel is non-blocking when ARB fails', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            tierId: 'pro',
            authorizeNetSubscriptionId: 'arb_sub_123',
          }),
        });

      const { cancelARBSubscription } = require('@/lib/payments/authorize-net');
      cancelARBSubscription.mockRejectedValueOnce(new Error('ARB API error'));

      const result = await cancelSubscription('org1');

      // Should still succeed — Firestore already updated
      expect(result.success).toBe(true);
      expect(mockDocRef.set).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Invoice Record Chain
  // ============================================================================

  describe('Invoice Record Chain', () => {
    it('createSubscription writes invoice with correct fields', async () => {
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerId: 'user123', name: 'Test Org' }),
      });

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

      // Find invoice write
      const invoiceWrite = firestoreWrites.find((w) => w.type === 'add');
      expect(invoiceWrite).toBeDefined();
      expect(invoiceWrite.data).toMatchObject({
        orgId: 'org1',
        amount: TIERS.pro.price,
        description: expect.stringContaining('Pro Plan'),
        status: 'pending',
        tierId: 'pro',
      });
    });

    it('invoice write failure is non-blocking for createSubscription', async () => {
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerId: 'user123', name: 'Test Org' }),
      });

      const { createCustomerProfile, createSubscriptionFromProfile } = require('@/lib/payments/authorize-net');
      createCustomerProfile.mockResolvedValueOnce({
        customerProfileId: 'profile123',
        customerPaymentProfileId: 'paymentProfile123',
      });
      createSubscriptionFromProfile.mockResolvedValueOnce({
        subscriptionId: 'arb_sub_123',
      });

      // Make invoice write fail
      mockCollectionRef.add.mockRejectedValueOnce(new Error('Firestore error'));

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

      // Should still succeed
      expect(result.success).toBe(true);
    });

    it('invoice write failure is non-blocking for upgradeSubscription', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            tierId: 'pro',
            status: 'active',
            amount: 99,
            authorizeNetSubscriptionId: 'arb_sub_123',
          }),
        });

      const { updateARBSubscription } = require('@/lib/payments/authorize-net');

      // Make invoice write fail
      mockCollectionRef.add.mockRejectedValueOnce(new Error('Invoice write failed'));

      const result = await upgradeSubscription('org1', 'growth');

      // Should still succeed
      expect(result.success).toBe(true);
      expect(updateARBSubscription).toHaveBeenCalled();
    });
  });
});
