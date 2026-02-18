import {
  notifySubscriptionCreated,
  notifySubscriptionCanceled,
  notifySubscriptionPaymentFailed,
  notifyUsage80Percent,
  notifyPromoExpiring,
  notifyPromoExpired,
  type UsageAlertMetric,
} from '@/server/services/billing-notifications';
import { TIERS } from '@/config/tiers';

// Mocks
jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/lib/email/dispatcher', () => ({
  sendGenericEmail: jest.fn(),
}));

jest.mock('@/server/services/audit-log-streaming', () => ({
  auditLogStreaming: {
    logAction: jest.fn().mockResolvedValue('log-id'),
  },
}));

jest.mock('@/lib/logger');

describe('BillingNotifications', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Firestore mock chain
    const mockDocGet = jest.fn();
    const mockUsersQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };
    const mockCollection = {
      doc: jest.fn().mockReturnValue({ get: mockDocGet }),
      where: jest.fn().mockReturnValue(mockUsersQuery),
    };
    mockDb = { collection: jest.fn().mockReturnValue(mockCollection) };

    const { createServerClient } = require('@/firebase/server-client');
    createServerClient.mockResolvedValue({ firestore: mockDb });

    // Default: no tenant doc, no user found
    mockDocGet.mockResolvedValue({ exists: false });
    mockUsersQuery.get.mockResolvedValue({ empty: true });
  });

  describe('notifySubscriptionCreated', () => {
    it('returns true when email sends successfully', async () => {
      const mockCollection = mockDb.collection('tenants');
      mockCollection.doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const result = await notifySubscriptionCreated(
        'org_test',
        'empire',
        299,
        undefined
      );

      expect(result).toBe(true);
      expect(sendGenericEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@org.com',
          communicationType: 'transactional',
          orgId: 'org_test',
        })
      );
    });

    it('returns false when no admin email found', async () => {
      const result = await notifySubscriptionCreated(
        'org_test',
        'empire',
        299,
        undefined
      );

      expect(result).toBe(false);
    });

    it('includes tier name in email subject and body', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      await notifySubscriptionCreated('org_test', 'empire', 299, undefined);

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.htmlBody).toContain(TIERS.empire.name);
      expect(call.htmlBody).toContain('$299/month');
    });

    it('includes promo row when promoApplied provided', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      await notifySubscriptionCreated('org_test', 'empire', 299, {
        code: 'EARLYBIRD50',
        discount: '3 months free',
      });

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.htmlBody).toContain('EARLYBIRD50');
      expect(call.htmlBody).toContain('3 months free');
    });

    it('excludes promo row when promoApplied not provided', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      await notifySubscriptionCreated('org_test', 'empire', 299, undefined);

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.htmlBody).not.toContain('Promo:');
    });

    it('calls audit log with subscription_created_email_sent on success', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

      await notifySubscriptionCreated('org_test', 'empire', 299, undefined);

      expect(auditLogStreaming.logAction).toHaveBeenCalledWith(
        'subscription_created_email_sent',
        'system',
        'org_test',
        'subscription',
        'success',
        expect.any(Object)
      );
    });

    it('calls audit log with subscription_created_email_failed when email fails', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: false, error: 'Email failed' });

      const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

      await notifySubscriptionCreated('org_test', 'empire', 299, undefined);

      expect(auditLogStreaming.logAction).toHaveBeenCalledWith(
        'subscription_created_email_failed',
        'system',
        'org_test',
        'subscription',
        'failed'
      );
    });

    it('includes feature allocations in email body', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      await notifySubscriptionCreated('org_test', 'empire', 299, undefined);

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.htmlBody).toContain('emails');
      expect(call.htmlBody).toContain('SMS');
      expect(call.htmlBody).toContain('competitors');
    });

    it('returns false on unexpected exception', async () => {
      const { createServerClient } = require('@/firebase/server-client');
      createServerClient.mockRejectedValue(new Error('DB error'));

      const result = await notifySubscriptionCreated(
        'org_test',
        'empire',
        299,
        undefined
      );

      expect(result).toBe(false);
    });

    it('falls back to users query when tenant doc not found', async () => {
      const mockUsersQuery = mockDb.collection().where();
      mockUsersQuery.limit.mockReturnThis();
      mockUsersQuery.get.mockResolvedValue({
        empty: false,
        docs: [{ data: () => ({ email: 'user@org.com' }) }],
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const result = await notifySubscriptionCreated(
        'org_test',
        'empire',
        299,
        undefined
      );

      expect(result).toBe(true);
      expect(sendGenericEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'user@org.com' })
      );
    });
  });

  describe('notifySubscriptionCanceled', () => {
    it('returns true when email sends successfully', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const result = await notifySubscriptionCanceled('org_test', 'empire');

      expect(result).toBe(true);
    });

    it('returns false when no admin email found', async () => {
      const result = await notifySubscriptionCanceled('org_test', 'empire');
      expect(result).toBe(false);
    });

    it('email subject contains canceled', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      await notifySubscriptionCanceled('org_test', 'empire');

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.subject).toContain('canceled');
    });

    it('email body mentions retaining access', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      await notifySubscriptionCanceled('org_test', 'empire');

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.htmlBody).toContain('retain access');
    });

    it('calls audit log on success', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

      await notifySubscriptionCanceled('org_test', 'empire');

      expect(auditLogStreaming.logAction).toHaveBeenCalledWith(
        'subscription_canceled_email_sent',
        'system',
        'org_test',
        'subscription',
        'success'
      );
    });

    it('returns false on exception', async () => {
      const { createServerClient } = require('@/firebase/server-client');
      createServerClient.mockRejectedValue(new Error('DB error'));

      const result = await notifySubscriptionCanceled('org_test', 'empire');

      expect(result).toBe(false);
    });
  });

  describe('notifySubscriptionPaymentFailed', () => {
    it('returns true when email sends successfully', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const result = await notifySubscriptionPaymentFailed('org_test', 'empire');

      expect(result).toBe(true);
    });

    it('returns false when no admin email found', async () => {
      const result = await notifySubscriptionPaymentFailed('org_test', 'empire');
      expect(result).toBe(false);
    });

    it('email subject contains payment failed warning', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      await notifySubscriptionPaymentFailed('org_test', 'empire');

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.subject.toLowerCase()).toContain('payment failed');
    });

    it('email body includes update billing message', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      await notifySubscriptionPaymentFailed('org_test', 'empire');

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.htmlBody).toContain('billing');
    });

    it('calls audit log on success', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

      await notifySubscriptionPaymentFailed('org_test', 'empire');

      expect(auditLogStreaming.logAction).toHaveBeenCalledWith(
        'payment_failed_email_sent',
        'system',
        'org_test',
        'subscription',
        'success'
      );
    });

    it('returns false on exception', async () => {
      const { createServerClient } = require('@/firebase/server-client');
      createServerClient.mockRejectedValue(new Error('DB error'));

      const result = await notifySubscriptionPaymentFailed('org_test', 'empire');

      expect(result).toBe(false);
    });
  });

  describe('notifyUsage80Percent', () => {
    it('returns true when email sends successfully', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const metrics: UsageAlertMetric[] = [
        { name: 'Customer SMS', used: 400, limit: 500, percent: 80 },
      ];

      const result = await notifyUsage80Percent('org_test', metrics);

      expect(result).toBe(true);
    });

    it('returns false when no admin email found', async () => {
      const metrics: UsageAlertMetric[] = [
        { name: 'Customer SMS', used: 400, limit: 500, percent: 80 },
      ];

      const result = await notifyUsage80Percent('org_test', metrics);

      expect(result).toBe(false);
    });

    it('renders single metric row correctly', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const metrics: UsageAlertMetric[] = [
        { name: 'Customer SMS', used: 400, limit: 500, percent: 80 },
      ];

      await notifyUsage80Percent('org_test', metrics);

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.htmlBody).toContain('Customer SMS');
      expect(call.htmlBody).toContain('400');
      expect(call.htmlBody).toContain('500');
      expect(call.htmlBody).toContain('80');
    });

    it('renders multiple metric rows all correctly', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const metrics: UsageAlertMetric[] = [
        { name: 'Customer SMS', used: 400, limit: 500, percent: 80 },
        { name: 'Emails', used: 800, limit: 1000, percent: 80 },
        { name: 'Competitors', used: 8, limit: 10, percent: 80 },
      ];

      await notifyUsage80Percent('org_test', metrics);

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.htmlBody).toContain('Customer SMS');
      expect(call.htmlBody).toContain('Emails');
      expect(call.htmlBody).toContain('Competitors');
    });

    it('calls audit log with metrics array in details', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

      const metrics: UsageAlertMetric[] = [
        { name: 'Customer SMS', used: 400, limit: 500, percent: 80 },
      ];

      await notifyUsage80Percent('org_test', metrics);

      expect(auditLogStreaming.logAction).toHaveBeenCalledWith(
        'usage_alert_80_percent_sent',
        'system',
        'org_test',
        'usage',
        'success',
        { metrics }
      );
    });

    it('returns false on exception', async () => {
      const { createServerClient } = require('@/firebase/server-client');
      createServerClient.mockRejectedValue(new Error('DB error'));

      const metrics: UsageAlertMetric[] = [
        { name: 'Customer SMS', used: 400, limit: 500, percent: 80 },
      ];

      const result = await notifyUsage80Percent('org_test', metrics);

      expect(result).toBe(false);
    });
  });

  describe('notifyPromoExpiring', () => {
    it('returns true when email sends successfully', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const result = await notifyPromoExpiring('org_test', 'empire', 1);

      expect(result).toBe(true);
    });

    it('returns false when no admin email found', async () => {
      const result = await notifyPromoExpiring('org_test', 'empire', 1);
      expect(result).toBe(false);
    });

    it('subject is singular when monthsRemaining === 1', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      await notifyPromoExpiring('org_test', 'empire', 1);

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.subject).toContain('1 month');
    });

    it('subject is plural when monthsRemaining > 1', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      await notifyPromoExpiring('org_test', 'empire', 2);

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.subject).toContain('2 months');
    });

    it('email body mentions tier name and price', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      await notifyPromoExpiring('org_test', 'empire', 1);

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.htmlBody).toContain(TIERS.empire.name);
      expect(call.htmlBody).toContain(`$${TIERS.empire.price}`);
    });

    it('calls audit log with monthsRemaining in details', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

      await notifyPromoExpiring('org_test', 'empire', 1);

      expect(auditLogStreaming.logAction).toHaveBeenCalledWith(
        'promo_expiring_email_sent',
        'system',
        'org_test',
        'subscription',
        'success',
        { monthsRemaining: 1 }
      );
    });

    it('returns false on exception', async () => {
      const { createServerClient } = require('@/firebase/server-client');
      createServerClient.mockRejectedValue(new Error('DB error'));

      const result = await notifyPromoExpiring('org_test', 'empire', 1);

      expect(result).toBe(false);
    });
  });

  describe('notifyPromoExpired', () => {
    it('returns true when email sends successfully', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const result = await notifyPromoExpired('org_test', 'empire', 299);

      expect(result).toBe(true);
    });

    it('returns false when no admin email found', async () => {
      const result = await notifyPromoExpired('org_test', 'empire', 299);
      expect(result).toBe(false);
    });

    it('email body contains amount and free months message', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      await notifyPromoExpired('org_test', 'empire', 299);

      const call = sendGenericEmail.mock.calls[0][0];
      expect(call.htmlBody).toContain('$299');
      expect(call.htmlBody).toContain('free months');
    });

    it('calls audit log with amount in details', async () => {
      mockDb.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ adminEmail: 'admin@org.com' }),
      });

      const { sendGenericEmail } = require('@/lib/email/dispatcher');
      sendGenericEmail.mockResolvedValue({ success: true });

      const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

      await notifyPromoExpired('org_test', 'empire', 299);

      expect(auditLogStreaming.logAction).toHaveBeenCalledWith(
        'promo_expired_email_sent',
        'system',
        'org_test',
        'subscription',
        'success',
        { amount: 299 }
      );
    });

    it('returns false on exception', async () => {
      const { createServerClient } = require('@/firebase/server-client');
      createServerClient.mockRejectedValue(new Error('DB error'));

      const result = await notifyPromoExpired('org_test', 'empire', 299);

      expect(result).toBe(false);
    });
  });
});
