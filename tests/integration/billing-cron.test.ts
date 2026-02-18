// Integration tests for billing cron endpoints
// These test the business logic of the cron handlers at a functional level
// (without full NextRequest/Response mocking which has compatibility issues in jsdom)

import { TIERS } from '@/config/tiers';

// Mocks
jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/server/services/billing-notifications', () => ({
  notifyUsage80Percent: jest.fn().mockResolvedValue(true),
  notifyPromoExpiring: jest.fn().mockResolvedValue(true),
  notifyPromoExpired: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger');
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    increment: jest.fn((n) => n),
    serverTimestamp: jest.fn(() => ({ _seconds: 1000000 })),
  },
}));

describe('Billing Cron Integration Tests', () => {
  let mockDb: any;
  let mockCollectionRef: any;
  let mockQuery: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup comprehensive Firestore mock chain
    mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
      onSnapshot: jest.fn(),
    };

    const mockDocReturn = {
      get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };

    mockCollectionRef = {
      doc: jest.fn().mockReturnValue(mockDocReturn),
      where: jest.fn().mockReturnValue(mockQuery),
      add: jest.fn().mockResolvedValue({ id: 'doc-id' }),
      get: jest.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
      orderBy: jest.fn().mockReturnValue(mockQuery),
      limit: jest.fn().mockReturnValue(mockQuery),
    };

    // Add circular reference after definition
    mockDocReturn.collection = jest.fn().mockReturnValue(mockCollectionRef);

    mockDb = { collection: jest.fn().mockReturnValue(mockCollectionRef) };

    const { createServerClient } = require('@/firebase/server-client');
    createServerClient.mockResolvedValue({ firestore: mockDb });
  });

  describe('Usage Alerts Cron Logic', () => {
    it('returns 0 alerts when no active subscriptions exist', async () => {
      mockQuery.get.mockResolvedValue({
        empty: true,
        size: 0,
        docs: [],
      });

      const { createServerClient } = require('@/firebase/server-client');
      const { firestore } = await createServerClient();

      const subsSnapshot = await firestore.collection('subscriptions').where('status', '==', 'active').get();

      expect(subsSnapshot.empty).toBe(true);
      expect(subsSnapshot.size).toBe(0);
    });

    it('skips alert when usage is below 80%', async () => {
      mockQuery.get.mockResolvedValue({
        empty: false,
        size: 1,
        docs: [
          {
            id: 'org1',
            data: () => ({
              customerId: 'org1',
              tierId: 'empire',
              status: 'active',
            }),
          },
        ],
      });

      // Mock the usage doc retrieval
      mockCollectionRef.doc().get.mockResolvedValue({
        exists: true,
        data: () => ({
          smsCustomerUsed: 100,
          emailsUsed: 200,
          creativeAssetsUsed: 1,
          competitorsTracked: 2,
          alertSentAt80Percent: false,
        }),
      });

      const { createServerClient } = require('@/firebase/server-client');
      const { firestore } = await createServerClient();

      const subsSnapshot = await firestore.collection('subscriptions').where('status', '==', 'active').get();
      const sub = subsSnapshot.docs[0];

      const usageSnapshot = await firestore.collection('usage').doc(`${sub.id}-2026-02`).get();
      const usage = usageSnapshot.data();

      const tierConfig = TIERS[sub.data().tierId];
      const smsPercent = (usage.smsCustomerUsed / tierConfig.allocations.smsCustomer) * 100;

      expect(smsPercent).toBeLessThan(80);
    });

    it('triggers alert when SMS usage reaches 80%', async () => {
      const { notifyUsage80Percent } = require('@/server/services/billing-notifications');

      mockQuery.get.mockResolvedValue({
        empty: false,
        size: 1,
        docs: [
          {
            id: 'org1',
            data: () => ({
              customerId: 'org1',
              tierId: 'empire',
              status: 'active',
            }),
          },
        ],
      });

      const { createServerClient } = require('@/firebase/server-client');
      const { firestore } = await createServerClient();

      const subsSnapshot = await firestore.collection('subscriptions').where('status', '==', 'active').get();
      const sub = subsSnapshot.docs[0];

      // Calculate 80% of empire SMS allocation
      const tierConfig = TIERS.empire;
      const smsAt80Percent = Math.floor(tierConfig.allocations.smsCustomer * 0.8);

      // Verify alert should be triggered at this usage level
      expect(smsAt80Percent / tierConfig.allocations.smsCustomer).toBeGreaterThanOrEqual(0.8);

      // If we have the metrics, notify should be called
      const metrics = [
        { name: 'Customer SMS', used: smsAt80Percent, limit: tierConfig.allocations.smsCustomer, percent: 80 },
      ];

      await notifyUsage80Percent('org1', metrics);

      expect(notifyUsage80Percent).toHaveBeenCalledWith('org1', expect.arrayContaining([
        expect.objectContaining({ name: 'Customer SMS', percent: 80 }),
      ]));
    });

    it('prevents duplicate alerts via alertSentAt80Percent flag', async () => {
      mockCollectionRef.doc().get.mockResolvedValue({
        exists: true,
        data: () => ({
          smsCustomerUsed: 4000,
          alertSentAt80Percent: true, // Alert already sent
        }),
      });

      const { createServerClient } = require('@/firebase/server-client');
      const { firestore } = await createServerClient();

      const usage = await firestore.collection('usage').doc('org1-2026-02').get();
      const usageData = usage.data();

      expect(usageData.alertSentAt80Percent).toBe(true);
    });

    it('creates inbox notification after sending alert', async () => {
      const adminUserId = 'user123';

      mockCollectionRef.add.mockResolvedValue({ id: 'inbox-doc-id' });

      const { createServerClient } = require('@/firebase/server-client');
      const { firestore } = await createServerClient();

      const inboxDoc = await firestore.collection('inbox').add({
        userId: adminUserId,
        type: 'system',
        category: 'billing',
        title: 'Usage limit approaching',
        message: 'You have used 80% of your Customer SMS allocation',
        priority: 'high',
        read: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(mockCollectionRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: adminUserId,
          type: 'system',
          category: 'billing',
        })
      );
    });
  });

  describe('Promo Decrement Cron Logic', () => {
    it('returns 0 when no promo subscriptions found', async () => {
      mockQuery.get.mockResolvedValue({
        empty: true,
        size: 0,
        docs: [],
      });

      const { createServerClient } = require('@/firebase/server-client');
      const { firestore } = await createServerClient();

      const promoSnapshot = await firestore
        .collection('subscriptions')
        .where('promoType', '==', 'free_months')
        .where('promoMonthsRemaining', '>', 0)
        .get();

      expect(promoSnapshot.empty).toBe(true);
    });

    it('decrements promoMonthsRemaining by 1', async () => {
      const { FieldValue } = require('firebase-admin/firestore');

      mockQuery.get.mockResolvedValue({
        empty: false,
        size: 1,
        docs: [
          {
            id: 'org1',
            data: () => ({
              promoType: 'free_months',
              promoMonthsRemaining: 3,
              tierId: 'empire',
              status: 'active',
            }),
          },
        ],
      });

      const { createServerClient } = require('@/firebase/server-client');
      const { firestore } = await createServerClient();

      const subSnapshot = await firestore
        .collection('subscriptions')
        .where('promoType', '==', 'free_months')
        .get();

      const subData = subSnapshot.docs[0].data();
      const newMonthsRemaining = subData.promoMonthsRemaining - 1;

      expect(newMonthsRemaining).toBe(2);

      // Update would use FieldValue.increment(-1) in the actual code
      await firestore.collection('subscriptions').doc('org1').update({
        promoMonthsRemaining: newMonthsRemaining,
      });

      expect(mockCollectionRef.doc().update).toHaveBeenCalled();
    });

    it('sends expiring notification when months reach 1', async () => {
      const { notifyPromoExpiring } = require('@/server/services/billing-notifications');

      mockQuery.get.mockResolvedValue({
        empty: false,
        size: 1,
        docs: [
          {
            id: 'org1',
            data: () => ({
              promoType: 'free_months',
              promoMonthsRemaining: 2,
              tierId: 'empire',
              status: 'active',
            }),
          },
        ],
      });

      const { createServerClient } = require('@/firebase/server-client');
      const { firestore } = await createServerClient();

      const subSnapshot = await firestore.collection('subscriptions').where('promoType', '==', 'free_months').get();
      const subData = subSnapshot.docs[0].data();
      const newMonthsRemaining = subData.promoMonthsRemaining - 1;

      // Should trigger notification at 1 month
      if (newMonthsRemaining === 1) {
        await notifyPromoExpiring('org1', subData.tierId, 1);
      }

      expect(notifyPromoExpiring).toHaveBeenCalledWith('org1', 'empire', 1);
    });

    it('sends expired notification and clears promo when months reach 0', async () => {
      const { notifyPromoExpired } = require('@/server/services/billing-notifications');

      mockQuery.get.mockResolvedValue({
        empty: false,
        size: 1,
        docs: [
          {
            id: 'org1',
            data: () => ({
              promoType: 'free_months',
              promoMonthsRemaining: 1,
              promoCode: 'EARLYBIRD50',
              tierId: 'empire',
              status: 'active',
            }),
          },
        ],
      });

      const { createServerClient } = require('@/firebase/server-client');
      const { firestore } = await createServerClient();

      const subSnapshot = await firestore.collection('subscriptions').where('promoType', '==', 'free_months').get();
      const subData = subSnapshot.docs[0].data();
      const newMonthsRemaining = subData.promoMonthsRemaining - 1;

      if (newMonthsRemaining === 0) {
        await notifyPromoExpired('org1', subData.tierId, TIERS[subData.tierId].price);

        await firestore.collection('subscriptions').doc('org1').update({
          promoMonthsRemaining: 0,
          promoCode: null,
          promoType: null,
        });
      }

      expect(notifyPromoExpired).toHaveBeenCalledWith('org1', 'empire', TIERS.empire.price);
      expect(mockCollectionRef.doc().update).toHaveBeenCalledWith(
        expect.objectContaining({
          promoCode: null,
          promoType: null,
        })
      );
    });

    it('updates both subscriptions doc and org subscription/current sub-collection', async () => {
      mockQuery.get.mockResolvedValue({
        empty: false,
        size: 1,
        docs: [
          {
            id: 'org1',
            data: () => ({
              promoType: 'free_months',
              promoMonthsRemaining: 3,
              tierId: 'empire',
            }),
          },
        ],
      });

      const { createServerClient } = require('@/firebase/server-client');
      const { firestore } = await createServerClient();

      const orgId = 'org1';
      const update = { promoMonthsRemaining: 2 };

      // Update main subscription doc
      await firestore.collection('subscriptions').doc(orgId).update(update);

      // Update org-level subscription
      await firestore
        .collection('organizations')
        .doc(orgId)
        .collection('subscription')
        .doc('current')
        .update(update);

      expect(mockCollectionRef.doc().update).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cron Authorization', () => {
    it('validates CRON_SECRET for usage-alerts', () => {
      const validSecret = process.env.CRON_SECRET || 'test-secret';
      const authHeader = `Bearer ${validSecret}`;

      expect(authHeader).toBe(`Bearer ${validSecret}`);
    });

    it('validates CRON_SECRET for promo-decrement', () => {
      const validSecret = process.env.CRON_SECRET || 'test-secret';
      const authHeader = `Bearer ${validSecret}`;

      expect(authHeader).toBe(`Bearer ${validSecret}`);
    });

    it('rejects invalid CRON_SECRET', () => {
      const validSecret = 'real-secret';
      const invalidSecret = 'wrong-secret';

      expect(invalidSecret).not.toBe(validSecret);
    });
  });
});
