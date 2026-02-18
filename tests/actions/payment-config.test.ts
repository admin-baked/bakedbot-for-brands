import {
  getPaymentConfig,
  updatePaymentMethod,
  getCurrentUserLocationId,
  PaymentConfig,
} from '../../src/server/actions/payment-config';
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

describe('Payment Config Actions', () => {
  let mockFirestore: any;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockSet: jest.Mock;
  let mockGet: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockWhere: jest.Mock;
  let mockDocs: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSet = jest.fn().mockResolvedValue({});
    mockUpdate = jest.fn().mockResolvedValue({});
    mockGet = jest.fn();
    mockDocs = jest.fn();
    mockWhere = jest.fn();

    mockDoc = jest.fn((id) => ({
      set: mockSet,
      get: mockGet,
      update: mockUpdate,
    }));

    mockCollection = jest.fn((name) => ({
      doc: mockDoc,
      where: mockWhere,
    }));

    mockFirestore = {
      collection: mockCollection,
    };

    (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
  });

  describe('getPaymentConfig', () => {
    it('should return payment config from Firestore', async () => {
      const mockConfig: PaymentConfig = {
        enabledMethods: ['dispensary_direct', 'cannpay'],
        defaultMethod: undefined,
        cannpay: { enabled: true, integratorId: 'test123', environment: 'sandbox' },
        aeropay: { enabled: false },
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mockConfig,
      });

      const result = await getPaymentConfig('loc_123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(mockDoc).toHaveBeenCalledWith('loc_123');
    });

    it('should return empty config if location not found', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const result = await getPaymentConfig('loc_nonexistent');

      expect(result.success).toBe(true);
      expect(result.data?.enabledMethods).toEqual(['dispensary_direct']);
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGet.mockRejectedValueOnce(new Error('Firestore error'));

      const result = await getPaymentConfig('loc_123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load payment configuration');
    });

    it('should include all payment methods in default config', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const result = await getPaymentConfig('loc_123');

      expect(result.data?.enabledMethods).toContain('dispensary_direct');
      expect(result.data?.cannpay).toBeDefined();
      expect(result.data?.aeropay).toBeDefined();
    });
  });

  describe('updatePaymentMethod', () => {
    it('should enable a payment method', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct'],
          cannpay: { enabled: false },
        }),
      });

      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: true,
      });

      expect(result.success).toBe(true);
      expect(mockSet).toHaveBeenCalled();
    });

    it('should disable a payment method', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay'],
          cannpay: { enabled: true },
        }),
      });

      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: false,
      });

      expect(result.success).toBe(true);
      expect(mockSet).toHaveBeenCalled();
    });

    it('should never disable dispensary_direct', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct'],
        }),
      });

      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'dispensary_direct',
        enabled: false,
      });

      expect(result.success).toBe(true);
      // Verify that dispensary_direct remains enabled
      const callArgs = mockSet.mock.calls[0][0];
      expect(callArgs.enabledMethods).toContain('dispensary_direct');
    });

    it('should add method to enabledMethods array when enabling', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct'],
          cannpay: { enabled: false },
        }),
      });

      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: true,
      });

      const callArgs = mockSet.mock.calls[0][0];
      expect(callArgs.enabledMethods).toContain('cannpay');
    });

    it('should remove method from enabledMethods array when disabling', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay', 'aeropay'],
        }),
      });

      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: false,
      });

      const callArgs = mockSet.mock.calls[0][0];
      expect(callArgs.enabledMethods).not.toContain('cannpay');
      expect(callArgs.enabledMethods).toContain('aeropay');
    });

    it('should validate location ID', async () => {
      const result = await updatePaymentMethod({
        locationId: '',
        method: 'cannpay',
        enabled: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Location ID');
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
      expect(result.error).toContain('update payment method');
    });

    it('should update method-specific config when enabling', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct'],
          cannpay: { enabled: false },
        }),
      });

      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: true,
      });

      const callArgs = mockSet.mock.calls[0][0];
      expect(callArgs.cannpay?.enabled).toBe(true);
    });
  });

  describe('getCurrentUserLocationId', () => {
    it('should return location ID from user claims', async () => {
      (getAuth as jest.Mock).mockResolvedValueOnce({
        currentUser: {
          uid: 'user_123',
          customClaims: {
            locationId: 'loc_123',
          },
        },
      });

      const result = await getCurrentUserLocationId();

      expect(result.success).toBe(true);
      expect(result.locationId).toBe('loc_123');
    });

    it('should return error if user is not authenticated', async () => {
      (getAuth as jest.Mock).mockResolvedValueOnce({
        currentUser: null,
      });

      const result = await getCurrentUserLocationId();

      expect(result.success).toBe(false);
      expect(result.error).toContain('authenticated');
    });

    it('should return error if location ID is not available', async () => {
      (getAuth as jest.Mock).mockResolvedValueOnce({
        currentUser: {
          uid: 'user_123',
          customClaims: {},
        },
      });

      const result = await getCurrentUserLocationId();

      expect(result.success).toBe(false);
      expect(result.error).toContain('location');
    });

    it('should handle auth errors gracefully', async () => {
      (getAuth as jest.Mock).mockRejectedValueOnce(new Error('Auth error'));

      const result = await getCurrentUserLocationId();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed');
    });
  });

  describe('Payment Method Transitions', () => {
    it('should handle enabling multiple methods in sequence', async () => {
      // First enable cannpay
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct'],
        }),
      });

      await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: true,
      });

      // Then enable aeropay
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct', 'cannpay'],
        }),
      });

      const result = await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'aeropay',
        enabled: true,
      });

      expect(result.success).toBe(true);
      expect(mockSet).toHaveBeenCalledTimes(2);
    });

    it('should preserve other config when updating method', async () => {
      const originalConfig: PaymentConfig = {
        enabledMethods: ['dispensary_direct', 'cannpay'],
        defaultMethod: undefined,
        cannpay: {
          enabled: true,
          integratorId: 'test123',
          environment: 'sandbox',
        },
        aeropay: { enabled: false },
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => originalConfig,
      });

      await updatePaymentMethod({
        locationId: 'loc_123',
        method: 'aeropay',
        enabled: true,
      });

      const callArgs = mockSet.mock.calls[0][0];
      expect(callArgs.cannpay).toEqual(originalConfig.cannpay);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined location gracefully', async () => {
      const result = await getPaymentConfig(undefined as any);
      expect(result.success).toBe(false);
    });

    it('should initialize enabledMethods if missing', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}), // Missing enabledMethods
      });

      const result = await getPaymentConfig('loc_123');

      expect(result.success).toBe(true);
      expect(result.data?.enabledMethods).toBeDefined();
    });

    it('should handle concurrent updates correctly', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          enabledMethods: ['dispensary_direct'],
        }),
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

      expect(mockSet.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
