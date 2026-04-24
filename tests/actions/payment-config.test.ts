import {
  getPaymentConfig,
  updatePaymentMethod,
  getCurrentUserLocationId,
  PaymentConfig,
} from '../../src/server/actions/payment-config';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

// Mock Firebase Server Client
jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

// Mock Auth - source uses requireUser
jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

// Mock Next Cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Default super_user actor so auth/org checks pass
const SUPER_USER = {
  uid: 'user_123',
  role: 'super_user',
  orgId: null,
  currentOrgId: null,
  brandId: null,
  locationId: null,
};

describe('Payment Config Actions', () => {
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockSet: jest.Mock;
  let mockGet: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockWhere: jest.Mock;
  let mockLimit: jest.Mock;
  let mockLocRef: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSet = jest.fn().mockResolvedValue({});
    mockUpdate = jest.fn().mockResolvedValue({});
    mockGet = jest.fn();
    mockWhere = jest.fn().mockReturnThis();
    mockLimit = jest.fn().mockReturnThis();

    // locationRef returned by doc()
    mockLocRef = {
      get: mockGet,
      update: mockUpdate,
    };

    mockDoc = jest.fn(() => mockLocRef);

    mockCollection = jest.fn(() => ({
      doc: mockDoc,
      where: mockWhere,
      limit: mockLimit,
      get: mockGet,
    }));

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: { collection: mockCollection },
    });

    (requireUser as jest.Mock).mockResolvedValue(SUPER_USER);
  });

  describe('getPaymentConfig', () => {
    it('should return payment config from Firestore', async () => {
      const mockConfig: PaymentConfig = {
        enabledMethods: ['dispensary_direct', 'cannpay'],
        defaultMethod: undefined,
        cannpay: { enabled: true, integratorId: 'test123', environment: 'sandbox' },
        aeropay: { enabled: false, merchantId: '', environment: 'sandbox' },
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ orgId: null, paymentConfig: mockConfig }),
      });

      const result = await getPaymentConfig('loc_123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(mockDoc).toHaveBeenCalledWith('loc_123');
    });

    it('should return default config if location has no paymentConfig', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ orgId: null }),
      });

      const result = await getPaymentConfig('loc_123');

      expect(result.success).toBe(true);
      expect(result.data?.enabledMethods).toContain('dispensary_direct');
    });

    it('should return error if location not found', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const result = await getPaymentConfig('loc_nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Location not found');
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGet.mockRejectedValueOnce(new Error('Firestore error'));

      const result = await getPaymentConfig('loc_123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for invalid location ID', async () => {
      const result = await getPaymentConfig('');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid location id');
    });
  });

  describe('updatePaymentMethod', () => {
    it('should enable a payment method', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          orgId: null,
          paymentConfig: { enabledMethods: ['dispensary_direct'], cannpay: { enabled: false } },
        }),
      });

      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: true,
      });

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should disable a payment method', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          orgId: null,
          paymentConfig: { enabledMethods: ['dispensary_direct', 'cannpay'], cannpay: { enabled: true } },
        }),
      });

      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: false,
      });

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should never disable dispensary_direct', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          orgId: null,
          paymentConfig: { enabledMethods: ['dispensary_direct'] },
        }),
      });

      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'dispensary_direct',
        enabled: false,
      });

      expect(result.success).toBe(true);
      const callArgs = mockUpdate.mock.calls[0][0];
      expect(callArgs.paymentConfig.enabledMethods).toContain('dispensary_direct');
    });

    it('should add method to enabledMethods array when enabling', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          orgId: null,
          paymentConfig: { enabledMethods: ['dispensary_direct'], cannpay: { enabled: false } },
        }),
      });

      await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: true,
      });

      const callArgs = mockUpdate.mock.calls[0][0];
      expect(callArgs.paymentConfig.enabledMethods).toContain('cannpay');
    });

    it('should remove method from enabledMethods array when disabling', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          orgId: null,
          paymentConfig: { enabledMethods: ['dispensary_direct', 'cannpay', 'aeropay'] },
        }),
      });

      await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: false,
      });

      const callArgs = mockUpdate.mock.calls[0][0];
      expect(callArgs.paymentConfig.enabledMethods).not.toContain('cannpay');
      expect(callArgs.paymentConfig.enabledMethods).toContain('aeropay');
    });

    it('should return error for invalid (empty) location ID', async () => {
      const result = await updatePaymentMethod({
        locationId: '',
        method: 'cannpay',
        enabled: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid location id');
    });

    it('should validate method name', async () => {
      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'invalid_method' as any,
        enabled: true,
      });

      expect(result.success).toBe(false);
    });

    it('should handle Firestore errors when updating', async () => {
      mockGet.mockRejectedValueOnce(new Error('Firestore error'));

      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should update method-specific config when enabling cannpay', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          orgId: null,
          paymentConfig: { enabledMethods: ['dispensary_direct'], cannpay: { enabled: false } },
        }),
      });

      await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: true,
      });

      const callArgs = mockUpdate.mock.calls[0][0];
      expect(callArgs.paymentConfig.cannpay?.enabled).toBe(true);
    });
  });

  describe('getCurrentUserLocationId', () => {
    it('should return location ID from user locationId claim', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce({
        ...SUPER_USER,
        locationId: 'loc_123',
      });

      const result = await getCurrentUserLocationId();

      expect(result.success).toBe(true);
      expect(result.locationId).toBe('loc_123');
    });

    it('should return error if requireUser throws', async () => {
      (requireUser as jest.Mock).mockRejectedValueOnce(new Error('Not authenticated'));

      const result = await getCurrentUserLocationId();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should look up location by orgId when no locationId claim', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce({
        ...SUPER_USER,
        role: 'dispensary',
        orgId: 'org_123',
        locationId: null,
      });

      // locations query returns a location
      const mockLocSnap = {
        empty: false,
        docs: [{ id: 'loc_from_org' }],
      };
      mockGet.mockResolvedValueOnce(mockLocSnap);

      const result = await getCurrentUserLocationId();

      expect(result.success).toBe(true);
      expect(result.locationId).toBe('loc_from_org');
    });

    it('should return error when no location found', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce({
        ...SUPER_USER,
        role: 'dispensary',
        orgId: null,
        locationId: null,
      });

      // user doc lookup
      mockGet.mockResolvedValueOnce({ data: () => ({}) });

      const result = await getCurrentUserLocationId();

      expect(result.success).toBe(false);
      expect(result.error).toContain('No location found');
    });
  });

  describe('Payment Method Transitions', () => {
    it('should handle enabling multiple methods in sequence', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ orgId: null, paymentConfig: { enabledMethods: ['dispensary_direct'] } }),
      });

      await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: true,
      });

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ orgId: null, paymentConfig: { enabledMethods: ['dispensary_direct', 'cannpay'] } }),
      });

      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'aeropay',
        enabled: true,
      });

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });

    it('should preserve other config when updating method', async () => {
      const originalPaymentConfig: PaymentConfig = {
        enabledMethods: ['dispensary_direct', 'cannpay'],
        defaultMethod: undefined,
        cannpay: {
          enabled: true,
          integratorId: 'test123',
          environment: 'sandbox',
        },
        aeropay: { enabled: false, merchantId: '', environment: 'sandbox' },
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ orgId: null, paymentConfig: originalPaymentConfig }),
      });

      await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'aeropay',
        enabled: true,
      });

      const callArgs = mockUpdate.mock.calls[0][0];
      expect(callArgs.paymentConfig.cannpay).toEqual(originalPaymentConfig.cannpay);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined location gracefully', async () => {
      const result = await getPaymentConfig(undefined as any);
      expect(result.success).toBe(false);
    });

    it('should return paymentConfig with enabledMethods when exists but config missing', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ orgId: null }), // no paymentConfig field
      });

      const result = await getPaymentConfig('loc_123');

      expect(result.success).toBe(true);
      expect(result.data?.enabledMethods).toBeDefined();
    });

    it('should handle concurrent updates correctly', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ orgId: null, paymentConfig: { enabledMethods: ['dispensary_direct'] } }),
      });

      const promise1 = updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: true,
      });

      const promise2 = updatePaymentMethod({
        locationId: 'loc_123',
        method: 'aeropay',
        enabled: true,
      });

      await Promise.all([promise1, promise2]);

      expect(mockUpdate.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
