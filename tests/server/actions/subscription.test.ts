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

jest.mock('./promos', () => ({
  validatePromoCode: jest.fn(),
}));

jest.mock('./playbooks', () => ({
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

describe('Subscription Server Actions', () => {
  let mockDb: any;
  let mockDocRef: any;
  let mockCollectionRef: any;
  let mockQuery: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Firestore mock chain
    mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
    };

    mockDocRef = {
      get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      collection: jest.fn(),
    };

    mockCollectionRef = {
      doc: jest.fn().mockReturnValue(mockDocRef),
      where: jest.fn().mockReturnValue(mockQuery),
      add: jest.fn().mockResolvedValue({ id: 'invoice-doc-id' }),
      get: jest.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
      orderBy: jest.fn().mockReturnValue(mockQuery),
      limit: jest.fn().mockReturnValue(mockQuery),
    };

    // Circular reference for sub-collections
    mockDocRef.collection = jest.fn().mockReturnValue(mockCollectionRef);

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollectionRef),
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
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      });

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
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerId: 'different_user', ownerUid: 'different_user' }),
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

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authorized');
    });

    it('returns error when createCustomerProfile throws', async () => {
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerId: 'user123', name: 'Test Org' }),
      });

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
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerId: 'user123', name: 'Test Org' }),
      });

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
      expect(result.subscriptionId).toBe('arb_sub_123');
      expect(result.amount).toBe(TIERS.pro.price);
      expect(mockCollectionRef.doc).toHaveBeenCalledWith('org1');
      expect(mockCollectionRef.doc().set).toHaveBeenCalled();
    });

    it('applies free_months promo correctly', async () => {
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerId: 'user123', name: 'Test Org' }),
      });

      const { validatePromoCode } = require('./promos');
      validatePromoCode.mockResolvedValueOnce({
        valid: true,
        promo: { code: 'EARLYBIRD50', type: 'free_months', value: 3 },
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
        promoCode: 'EARLYBIRD50',
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(TIERS.pro.price); // Full price, not discounted
      expect(result.promoApplied).toEqual({ code: 'EARLYBIRD50', discount: '3 months free' });
    });

    it('applies percent_off promo correctly', async () => {
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerId: 'user123', name: 'Test Org' }),
      });

      const { validatePromoCode } = require('./promos');
      validatePromoCode.mockResolvedValueOnce({
        valid: true,
        promo: { code: 'SOCIALEQUITY', type: 'percent_off', value: 50 },
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
        promoCode: 'SOCIALEQUITY',
      });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(TIERS.pro.price * 0.5); // Discounted
      expect(result.promoApplied).toEqual({ code: 'SOCIALEQUITY', discount: '50% off' });
    });
  });

  // ============================================================================
  // cancelSubscription tests
  // ============================================================================

  describe('cancelSubscription', () => {
    it('returns error when org not found', async () => {
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      });

      const result = await cancelSubscription('org_missing');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Organization not found');
    });

    it('returns error when user is not org owner', async () => {
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerId: 'different_user', ownerUid: 'different_user' }),
      });

      const result = await cancelSubscription('org1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authorized');
    });

    it('returns error when no subscription exists', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) }) // org
        .mockResolvedValueOnce({ exists: false, data: () => null }); // subscription

      const result = await cancelSubscription('org1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active subscription found');
    });

    it('happy path: cancels subscription and calls Authorize.net', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) }) // org
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ authorizeNetSubscriptionId: 'arb_sub_123', tierId: 'pro' }),
        }); // subscription

      const { cancelARBSubscription } = require('@/lib/payments/authorize-net');

      const result = await cancelSubscription('org1');

      expect(result.success).toBe(true);
      expect(cancelARBSubscription).toHaveBeenCalledWith('arb_sub_123');
      expect(mockCollectionRef.doc().set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'canceled' }),
        expect.any(Object)
      );
    });

    it('skips ARB call when authorizeNetSubscriptionId is missing', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) }) // org
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ tierId: 'pro' }), // no authorizeNetSubscriptionId
        }); // subscription

      const { cancelARBSubscription } = require('@/lib/payments/authorize-net');

      const result = await cancelSubscription('org1');

      expect(result.success).toBe(true);
      expect(cancelARBSubscription).not.toHaveBeenCalled();
    });

    it('is non-blocking when cancelARBSubscription throws', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) }) // org
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ authorizeNetSubscriptionId: 'arb_sub_123', tierId: 'pro' }),
        }); // subscription

      const { cancelARBSubscription } = require('@/lib/payments/authorize-net');
      cancelARBSubscription.mockRejectedValueOnce(new Error('ARB error'));

      const result = await cancelSubscription('org1');

      expect(result.success).toBe(true); // Still succeeds
      expect(mockCollectionRef.doc().set).toHaveBeenCalled(); // Firestore still updated
    });
  });

  // ============================================================================
  // upgradeSubscription tests
  // ============================================================================

  describe('upgradeSubscription', () => {
    it('returns error when same tier selected', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) }) // org
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ tierId: 'pro', status: 'active', amount: 99 }),
        }); // subscription

      const result = await upgradeSubscription('org1', 'pro');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot upgrade to the same tier');
    });

    it('returns error when downgrade attempted', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) }) // org
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ tierId: 'growth', status: 'active', amount: 349 }),
        }); // subscription

      const result = await upgradeSubscription('org1', 'pro'); // Downgrade to lower price

      expect(result.success).toBe(false);
      expect(result.error).toContain('Downgrades not supported');
    });

    it('returns error when subscription status is not active', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) }) // org
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ tierId: 'pro', status: 'canceled', amount: 99 }),
        }); // subscription

      const result = await upgradeSubscription('org1', 'growth');

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be active');
    });

    it('returns error when no authorizeNetSubscriptionId', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) }) // org
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ tierId: 'pro', status: 'active', amount: 99 }), // missing authorizeNetSubscriptionId
        }); // subscription

      const result = await upgradeSubscription('org1', 'growth');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No Authorize.net subscription found');
    });

    it('returns error when updateARBSubscription throws', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) }) // org
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ tierId: 'pro', status: 'active', amount: 99, authorizeNetSubscriptionId: 'arb_sub_123' }),
        }); // subscription

      const { updateARBSubscription } = require('@/lib/payments/authorize-net');
      updateARBSubscription.mockRejectedValueOnce(new Error('ARB error'));

      const result = await upgradeSubscription('org1', 'growth');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update payment processor');
    });

    it('happy path: upgrades subscription and updates all docs', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) }) // org
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ tierId: 'pro', status: 'active', amount: 99, authorizeNetSubscriptionId: 'arb_sub_123' }),
        }); // subscription

      const { updateARBSubscription } = require('@/lib/payments/authorize-net');
      const { notifySubscriptionCreated } = require('@/server/services/billing-notifications');

      const result = await upgradeSubscription('org1', 'growth');

      expect(result.success).toBe(true);
      expect(result.newAmount).toBe(TIERS.growth.price);
      expect(updateARBSubscription).toHaveBeenCalledWith('arb_sub_123', TIERS.growth.price);
      expect(mockCollectionRef.doc().set).toHaveBeenCalledWith(
        expect.objectContaining({ tierId: 'growth', amount: TIERS.growth.price }),
        expect.any(Object)
      );
      expect(notifySubscriptionCreated).toHaveBeenCalledWith(
        'org1',
        'growth',
        TIERS.growth.price,
        undefined
      );
    });

    it('applies percent_off promo to new tier during upgrade', async () => {
      mockCollectionRef.doc().get
        .mockResolvedValueOnce({ exists: true, data: () => ({ ownerId: 'user123' }) }) // org
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            tierId: 'pro',
            status: 'active',
            amount: 50, // Discounted from 99
            authorizeNetSubscriptionId: 'arb_sub_123',
            promoCode: 'SOCIALEQUITY',
            promoType: 'percent_off',
          }),
        }); // subscription

      mockQuery.get.mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ type: 'percent_off', value: 50, code: 'SOCIALEQUITY' }) }],
      }); // promos collection query

      const { updateARBSubscription } = require('@/lib/payments/authorize-net');

      const result = await upgradeSubscription('org1', 'growth');

      expect(result.success).toBe(true);
      // Expected: growth price (349) * 0.5 = 174.50
      expect(result.newAmount).toBe(TIERS.growth.price * 0.5);
      expect(updateARBSubscription).toHaveBeenCalledWith('arb_sub_123', TIERS.growth.price * 0.5);
    });
  });

  // ============================================================================
  // getSubscription tests
  // ============================================================================

  describe('getSubscription', () => {
    it('returns subscription data when document exists', async () => {
      const subscriptionData = { tierId: 'pro', status: 'active', amount: 99 };
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => subscriptionData,
      });

      const result = await getSubscription('org1');

      expect(result).toEqual(subscriptionData);
    });

    it('returns null when document does not exist', async () => {
      mockCollectionRef.doc().get.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      });

      const result = await getSubscription('org1');

      expect(result).toBeNull();
    });

    it('returns null when Firestore throws', async () => {
      mockCollectionRef.doc().get.mockRejectedValueOnce(new Error('Firestore error'));

      const result = await getSubscription('org1');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // getInvoices tests
  // ============================================================================

  describe('getInvoices', () => {
    it('returns mapped invoice array from Firestore', async () => {
      const invoiceData = [
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

      mockQuery.get.mockResolvedValueOnce({
        docs: invoiceData,
        empty: false,
        size: 2,
      });

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
      expect(result[1]).toEqual({
        id: 'inv2',
        amount: 349,
        description: 'Growth Plan',
        status: 'pending',
        tierId: 'growth',
        period: '2026-03',
        createdAt: 1647600000,
      });
    });

    it('returns empty array when collection is empty', async () => {
      mockQuery.get.mockResolvedValueOnce({
        docs: [],
        empty: true,
        size: 0,
      });

      const result = await getInvoices('org1');

      expect(result).toEqual([]);
    });

    it('returns empty array when Firestore throws', async () => {
      mockQuery.get.mockRejectedValueOnce(new Error('Firestore error'));

      const result = await getInvoices('org1');

      expect(result).toEqual([]);
    });
  });
});
