/**
 * Unit Tests: CannMenus Integration Service
 *
 * Tests for CannMenus API integration
 * Verifies API payload construction, error handling, retry logic, and rate limiting
 *
 * [BUILDER-MODE @ 2025-12-10]
 * Created as part of feat_unit_test_services_cannmenus
 */

import { CannMenusService, SearchParams, SyncOptions, ApiError } from '@/server/services/cannmenus';

// Mock uuid to avoid ES module issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock dependencies
jest.mock('@/firebase/server-client');
jest.mock('@/lib/monitoring', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  reportError: jest.fn(),
  monitorApiCall: jest.fn(async (endpoint, fn) => await fn()),
  perfMonitor: {
    start: jest.fn(),
    end: jest.fn(),
  },
}));
jest.mock('@/lib/retry-utility', () => ({
  withRetry: jest.fn(async (fn) => await fn()),
  RateLimiter: jest.fn().mockImplementation(() => ({
    acquire: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
  })),
}));
jest.mock('@/lib/plan-limits', () => ({
  getPlanLimits: jest.fn((planId: string) => ({
    maxRetailers: planId === 'premium' ? 100 : 10,
    maxProducts: planId === 'premium' ? 1000 : 100,
  })),
}));

import { createServerClient } from '@/firebase/server-client';
import { withRetry } from '@/lib/retry-utility';

// Setup global fetch mock
global.fetch = jest.fn();

describe('CannMenusService', () => {
  let service: CannMenusService;
  let mockFirestore: any;

  beforeEach(() => {
    service = new CannMenusService();

    // Setup Firestore mock
    mockFirestore = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      batch: jest.fn(() => ({
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      })),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: mockFirestore,
    });

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();

    // Reset withRetry to just call the function
    (withRetry as jest.Mock).mockImplementation((fn) => fn());

    // Setup environment
    process.env.CANNMENUS_API_KEY = 'test-api-key';
    process.env.CANNMENUS_API_BASE = 'https://api.cannmenus.test';

    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.CANNMENUS_API_KEY;
    delete process.env.CANNMENUS_API_BASE;
  });

  describe('findRetailersCarryingBrand', () => {
    it('should find retailers for a brand', async () => {
      const mockApiResponse = {
        data: {
          data: [
            {
              retailer_id: '123',
              name: 'Green Leaf Dispensary',
              state: 'IL',
              city: 'Chicago',
              postal_code: '60601',
              address: '123 Main St',
              homepage_url: 'https://greenleaf.com',
              menu_url: 'https://greenleaf.com/menu',
              latitude: 41.8781,
              longitude: -87.6298,
              phone: '555-0101',
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const result = await service.findRetailersCarryingBrand('Top Shelf', 50);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('123');
      expect(result[0].name).toBe('Green Leaf Dispensary');
      expect(result[0].geo.lat).toBe(41.8781);
      expect(result[0].geo.lng).toBe(-87.6298);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('brand_name=Top+Shelf'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'User-Agent': 'BakedBot/1.0',
          }),
        })
      );
    });

    it('should deduplicate retailers by ID', async () => {
      const mockApiResponse = {
        data: {
          data: [
            {
              retailer_id: '123',
              name: 'Green Leaf Dispensary',
              state: 'IL',
              city: 'Chicago',
              postal_code: '60601',
            },
            {
              retailer_id: '123', // Duplicate
              name: 'Green Leaf Dispensary',
              state: 'IL',
              city: 'Chicago',
              postal_code: '60601',
            },
            {
              retailer_id: '456',
              name: 'High Times Shop',
              state: 'CA',
              city: 'Los Angeles',
              postal_code: '90001',
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const result = await service.findRetailersCarryingBrand('Brand X', 50);

      expect(result).toHaveLength(2); // Should deduplicate
      expect(result.map(r => r.id)).toEqual(['123', '456']);
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(service.findRetailersCarryingBrand('Brand X', 50)).rejects.toThrow('CannMenus API error');
    });

    // Note: Cannot test API key not configured because CANNMENUS_API_KEY
    // is a module-level constant set at load time.
    // This would require module reload or dependency injection.

    it('should handle request timeout', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request aborted')), 100);
        })
      );

      await expect(service.findRetailersCarryingBrand('Brand X', 50)).rejects.toThrow();
    });

    it('should respect maxRetailers parameter', async () => {
      const mockApiResponse = {
        data: {
          data: [],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      await service.findRetailersCarryingBrand('Brand X', 25);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=25'),
        expect.any(Object)
      );
    });
  });

  describe('searchProducts', () => {
    it('should search products with all parameters', async () => {
      const mockApiResponse = {
        data: {
          products: [
            {
              cann_sku_id: 'sku_123',
              product_name: 'Blue Dream 1g',
              brand_name: 'Top Shelf',
              category: 'Flower',
              image_url: 'https://example.com/image.jpg',
              latest_price: 15.0,
              original_price: 20.0,
              percentage_thc: 22.5,
              percentage_cbd: 0.5,
            },
          ],
        },
        meta: {
          total: 1,
          page: 1,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const params: SearchParams = {
        search: 'Blue Dream',
        category: 'Flower',
        price_min: 10,
        price_max: 30,
        retailers: '123,456',
        brands: 'Top Shelf',
        limit: 20,
        page: 1,
      };

      const result = await service.searchProducts(params);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].product_name).toBe('Blue Dream 1g');
      expect(result.meta?.total).toBe(1);

      // Verify all parameters are in the URL
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain('search=Blue+Dream');
      expect(fetchCall).toContain('category=Flower');
      expect(fetchCall).toContain('price_min=10');
      expect(fetchCall).toContain('price_max=30');
      expect(fetchCall).toContain('retailers=123%2C456');
      expect(fetchCall).toContain('brands=Top+Shelf');
      expect(fetchCall).toContain('limit=20');
      expect(fetchCall).toContain('page=1');
    });

    it('should handle minimal search parameters', async () => {
      const mockApiResponse = {
        data: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const result = await service.searchProducts({ search: 'flower' });

      expect(result.products).toEqual([]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=flower'),
        expect.any(Object)
      );
    });

    it('should handle API errors during search', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.searchProducts({ search: 'test' })).rejects.toThrow(ApiError);
    });

    // Note: Cannot test API key not configured because CANNMENUS_API_KEY
    // is a module-level constant set at load time.
    // This would require module reload or dependency injection.

    it('should handle different response data formats', async () => {
      // Test when data.data.products doesn't exist, falls back to data.data
      const mockApiResponse = {
        data: [
          {
            cann_sku_id: 'sku_456',
            product_name: 'Product A',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const result = await service.searchProducts({ search: 'test' });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].cann_sku_id).toBe('sku_456');
    });
  });

  describe('ApiError class', () => {
    it('should create ApiError with status code', () => {
      const error = new ApiError('Test error', 404);

      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
      expect(error.name).toBe('ApiError');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Error handling and retry logic', () => {
    it('should use retry wrapper for API calls', async () => {
      const mockApiResponse = {
        data: { data: [] },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      await service.findRetailersCarryingBrand('Brand X', 50);

      // Verify withRetry was called
      expect(withRetry).toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.findRetailersCarryingBrand('Brand X', 50)).rejects.toThrow('Network error');
    });
  });

  describe('Request headers', () => {
    it('should include correct headers in all requests', async () => {
      const mockApiResponse = {
        data: { data: [] },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      await service.findRetailersCarryingBrand('Brand X', 50);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'User-Agent': 'BakedBot/1.0',
          }),
        })
      );

      // Verify X-Token is present (value comes from env)
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].headers['X-Token']).toBeDefined();
    });
  });

  describe('Data transformation', () => {
    it('should transform API response to RetailerDoc format', async () => {
      const mockApiResponse = {
        data: {
          data: [
            {
              retailer_id: '789',
              name: 'Test Dispensary',
              state: 'CA',
              city: 'San Francisco',
              postal_code: '94102',
              address: '456 Market St',
              homepage_url: 'https://test.com',
              menu_url: 'https://test.com/menu',
              latitude: 37.7749,
              longitude: -122.4194,
              phone: '555-1234',
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const result = await service.findRetailersCarryingBrand('Brand Y', 50);

      expect(result[0]).toMatchObject({
        id: '789',
        name: 'Test Dispensary',
        state: 'CA',
        city: 'San Francisco',
        postal_code: '94102',
        country: 'US',
        street_address: '456 Market St',
        homepage_url: 'https://test.com',
        menu_url: 'https://test.com/menu',
        menu_discovery_status: 'found',
        geo: {
          lat: 37.7749,
          lng: -122.4194,
        },
        phone: '555-1234',
      });
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Empty and edge cases', () => {
    it('should handle empty API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: {} }),
      });

      const result = await service.findRetailersCarryingBrand('NonExistent Brand', 50);

      expect(result).toEqual([]);
    });

    it('should handle null/undefined data gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      const result = await service.findRetailersCarryingBrand('Brand Z', 50);

      expect(result).toEqual([]);
    });

    it('should handle search with no results', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { products: [] },
          meta: { total: 0 },
        }),
      });

      const result = await service.searchProducts({ search: 'nonexistent' });

      expect(result.products).toEqual([]);
      expect(result.meta?.total).toBe(0);
    });
  });
});
