import { getApps } from '../../src/app/dashboard/apps/actions';
import { getAdminFirestore } from '@/firebase/admin';
import { getAuth } from '@/server/auth/auth';

// Mock Firebase Admin
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

// Mock Auth
jest.mock('@/server/auth/auth', () => ({
  getAuth: jest.fn(),
}));

// Mock Next Cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Payment App Store Integration', () => {
  let mockFirestore: any;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGet = jest.fn();

    mockDoc = jest.fn((id) => ({
      get: mockGet,
    }));

    mockCollection = jest.fn((name) => ({
      doc: mockDoc,
    }));

    mockFirestore = {
      collection: mockCollection,
    };

    (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    (getAuth as jest.Mock).mockResolvedValue({
      currentUser: {
        uid: 'user_123',
        customClaims: {
          locationId: 'loc_123',
          orgId: 'org_123',
        },
      },
    });
  });

  describe('Payment Processors in App Store', () => {
    it('should include Smokey Pay in apps list', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay'],
          cannpay: { enabled: true },
          aeropay: { enabled: false },
        }),
      });

      const result = await getApps();

      expect(result.success).toBe(true);

      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      expect(smokey).toBeDefined();
      expect(smokey?.name).toBe('Smokey Pay');
      expect(smokey?.category).toBe('payment');
    });

    it('should include Aeropay in apps list', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'aeropay'],
          cannpay: { enabled: false },
          aeropay: { enabled: true },
        }),
      });

      const result = await getApps();

      expect(result.success).toBe(true);

      const aeropay = result.data?.find((app) => app.id === 'aeropay');
      expect(aeropay).toBeDefined();
      expect(aeropay?.name).toBe('Aeropay');
      expect(aeropay?.category).toBe('payment');
    });

    it('should set Smokey Pay as installed when enabled', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay'],
          cannpay: { enabled: true },
        }),
      });

      const result = await getApps();

      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      expect(smokey?.installed).toBe(true);
      expect(smokey?.status).toBe('active');
    });

    it('should set Smokey Pay as not installed when disabled', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct'],
          cannpay: { enabled: false },
        }),
      });

      const result = await getApps();

      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      expect(smokey?.installed).toBe(false);
      expect(smokey?.status).toBe('inactive');
    });

    it('should set Aeropay as installed when enabled', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'aeropay'],
          aeropay: { enabled: true },
        }),
      });

      const result = await getApps();

      const aeropay = result.data?.find((app) => app.id === 'aeropay');
      expect(aeropay?.installed).toBe(true);
      expect(aeropay?.status).toBe('active');
    });

    it('should set Aeropay as not installed when disabled', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct'],
          aeropay: { enabled: false },
        }),
      });

      const result = await getApps();

      const aeropay = result.data?.find((app) => app.id === 'aeropay');
      expect(aeropay?.installed).toBe(false);
      expect(aeropay?.status).toBe('inactive');
    });
  });

  describe('Payment Processor Metadata', () => {
    it('should include features for Smokey Pay', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay'],
          cannpay: { enabled: true },
        }),
      });

      const result = await getApps();

      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      expect(smokey?.features).toContain('Cannabis-compliant payments');
      expect(smokey?.features).toContain('Bank-to-bank transfer');
      expect(smokey?.features).toContain('Guest checkout support');
      expect(smokey?.features).toContain('Tip handling');
    });

    it('should include features for Aeropay', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'aeropay'],
          aeropay: { enabled: true },
        }),
      });

      const result = await getApps();

      const aeropay = result.data?.find((app) => app.id === 'aeropay');
      expect(aeropay?.features).toContain('Instant bank transfers');
      expect(aeropay?.features).toContain('One-time bank linking');
      expect(aeropay?.features).toContain('Real-time status');
      expect(aeropay?.features).toContain('Aerosync widget');
    });

    it('should include pricing information', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay'],
          cannpay: { enabled: true },
        }),
      });

      const result = await getApps();

      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      expect(smokey?.pricing).toBeDefined();
      expect(smokey?.pricing?.setup).toBe('Free');
      expect(smokey?.pricing?.transaction).toBe('$0.50 per transaction');
    });

    it('should include provider information', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay'],
          cannpay: { enabled: true },
        }),
      });

      const result = await getApps();

      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      expect(smokey?.provider).toBeDefined();
      expect(smokey?.provider?.name).toBe('CannPay');
      expect(smokey?.provider?.website).toBe('https://canpaydebit.com');
      expect(smokey?.provider?.support).toBe('support@canpaydebit.com');
    });

    it('should include configure URL for payment processors', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay'],
          cannpay: { enabled: true },
        }),
      });

      const result = await getApps();

      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      expect(smokey?.configUrl).toBe(
        '/dashboard/admin/payment-config?method=smokey-pay'
      );

      const aeropay = result.data?.find((app) => app.id === 'aeropay');
      expect(aeropay?.configUrl).toBe(
        '/dashboard/admin/payment-config?method=aeropay'
      );
    });
  });

  describe('Payment Processor Icons', () => {
    it('should use Banknote icon for Smokey Pay', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay'],
          cannpay: { enabled: true },
        }),
      });

      const result = await getApps();

      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      expect(smokey?.icon).toBe('Banknote');
    });

    it('should use Building icon for Aeropay', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'aeropay'],
          aeropay: { enabled: true },
        }),
      });

      const result = await getApps();

      const aeropay = result.data?.find((app) => app.id === 'aeropay');
      expect(aeropay?.icon).toBe('Building');
    });
  });

  describe('App Store Categories', () => {
    it('should categorize payment processors correctly', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay', 'aeropay'],
          cannpay: { enabled: true },
          aeropay: { enabled: true },
        }),
      });

      const result = await getApps();

      const paymentApps = result.data?.filter((app) => app.category === 'payment');
      expect(paymentApps?.length).toBeGreaterThanOrEqual(2);

      paymentApps?.forEach((app) => {
        expect(['smokey-pay', 'aeropay']).toContain(app.id);
      });
    });
  });

  describe('Multiple Payment Methods Enabled', () => {
    it('should show both processors when both are enabled', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay', 'aeropay'],
          cannpay: { enabled: true },
          aeropay: { enabled: true },
        }),
      });

      const result = await getApps();

      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      const aeropay = result.data?.find((app) => app.id === 'aeropay');

      expect(smokey?.installed).toBe(true);
      expect(aeropay?.installed).toBe(true);
    });

    it('should show only Smokey Pay when Aeropay is disabled', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay'],
          cannpay: { enabled: true },
          aeropay: { enabled: false },
        }),
      });

      const result = await getApps();

      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      const aeropay = result.data?.find((app) => app.id === 'aeropay');

      expect(smokey?.installed).toBe(true);
      expect(aeropay?.installed).toBe(false);
    });

    it('should show only Aeropay when Smokey Pay is disabled', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'aeropay'],
          cannpay: { enabled: false },
          aeropay: { enabled: true },
        }),
      });

      const result = await getApps();

      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      const aeropay = result.data?.find((app) => app.id === 'aeropay');

      expect(smokey?.installed).toBe(false);
      expect(aeropay?.installed).toBe(true);
    });

    it('should show both as inactive when both are disabled', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct'],
          cannpay: { enabled: false },
          aeropay: { enabled: false },
        }),
      });

      const result = await getApps();

      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      const aeropay = result.data?.find((app) => app.id === 'aeropay');

      expect(smokey?.installed).toBe(false);
      expect(aeropay?.installed).toBe(false);
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle missing payment config', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const result = await getApps();

      expect(result.success).toBe(true);
      // Payment apps should still appear but with default status
      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      expect(smokey).toBeDefined();
    });

    it('should handle incomplete payment config', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct'],
          // Missing cannpay and aeropay
        }),
      });

      const result = await getApps();

      expect(result.success).toBe(true);
      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      expect(smokey?.installed).toBe(false);
    });

    it('should handle Firestore errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Firestore error'));

      const result = await getApps();

      // Should still return apps list, but with default statuses
      expect(result.success).toBe(true);
      const smokey = result.data?.find((app) => app.id === 'smokey-pay');
      expect(smokey).toBeDefined();
    });
  });
});
