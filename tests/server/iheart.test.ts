/**
 * Unit Tests: iHeart Integration Service
 *
 * Tests for iHeart loyalty platform integration
 * Verifies customer profile management, points calculation, rewards redemption, and menu sync
 */

import { IHeartService, IHeartCustomer, IHeartApiConfig } from '@/server/services/iheart';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock Firebase Admin
const mockBatch = {
  set: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined)
};

const mockDb = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  batch: jest.fn(() => mockBatch)
};

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => mockDb)
}));

// Setup global fetch mock
global.fetch = jest.fn();

describe('IHeartService', () => {
  let service: IHeartService;
  let mockConfig: IHeartApiConfig;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      baseUrl: 'https://api.test.com',
      merchantId: 'test-merchant',
    };
    service = new IHeartService(mockConfig);
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('upsertCustomer', () => {
    it('should successfully create/update customer profile', async () => {
      const customer: IHeartCustomer = {
        id: 'cust_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+15555551234',
        state: 'IL',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      });

      const result = await service.upsertCustomer(customer);

      expect(result.success).toBe(true);
      expect(result.customerId).toBe('cust_123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/customers'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('cust_123')
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error'
      });

      const customer: IHeartCustomer = { id: 'cust_error', email: 'error@example.com' };
      const result = await service.upsertCustomer(customer);

      expect(result.success).toBe(false);
      expect(result.error).toContain('iHeart API Error: 500');
    });
  });

  describe('getLoyaltyProfile', () => {
    it('should fetch customer loyalty profile', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          points: 1500,
          total_orders: 5,
          total_spent: 500,
          last_order_date: '2025-01-01',
          created_at: '2024-01-01',
          updated_at: '2025-01-01'
        })
      });

      const profile = await service.getLoyaltyProfile('cust_123');

      expect(profile).toBeDefined();
      expect(profile?.customerId).toBe('cust_123');
      expect(profile?.points).toBe(1500);
      expect(profile?.tier).toBe('VIP'); // calculated based on points
    });

    it('should return null on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

      const profile = await service.getLoyaltyProfile('cust_notfound');
      expect(profile).toBeNull();
    });
  });

  describe('awardPoints', () => {
    it('should award points', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ new_balance: 150 })
      });

      const result = await service.awardPoints({
        customerId: 'cust_123',
        orderId: 'order_abc',
        orderTotal: 50.0,
      });

      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(50);
      expect(result.newBalance).toBe(150);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/transactions'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"type":"earn"') // Check for type: earn
        })
      );
    });
  });

  describe('syncMenu', () => {
    it('should fetch menu and upsert to firestore', async () => {
      // Mock Get Menu Response
      const mockProducts = [
        { id: 'prod_1', name: 'Product 1' },
        { id: 'prod_2', name: 'Product 2' }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ products: mockProducts })
      });

      const result = await service.syncMenu('store_123');

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);

      // Verify Firestore interactions
      expect(mockDb.collection).toHaveBeenCalledWith('organizations');
      expect(mockDb.doc).toHaveBeenCalledWith('store_123');
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled(); // Should be called at end
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Down'));

      const result = await service.syncMenu('store_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Down');
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });
  });

  describe('tier calculation', () => {
    // We can access private method via prototype or casting for unit testing internal logic
    // OR we can test it via getLoyaltyProfile which we did above (VIP check).

    it('should calculate tiers correctly via profile fetch', async () => {
      // New
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ points: 100 }) });
      const p1 = await service.getLoyaltyProfile('c1');
      expect(p1?.tier).toBe('New');

      // Regular
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ points: 500 }) });
      const p2 = await service.getLoyaltyProfile('c2');
      expect(p2?.tier).toBe('Regular');
    });
  });
});
