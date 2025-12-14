/**
 * Unit Tests: Geo Discovery Service
 *
 * Tests for location-aware product discovery using CannMenus data
 * Verifies coordinate lookup, radius filtering, foot traffic scoring, and geo zone management
 *
 * [BUILDER-MODE @ 2025-12-10]
 * Created as part of feat_unit_test_services_geo
 */

// Mock firebase-admin to prevent initialization crashes
jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
  initializeApp: jest.fn(),
  cert: jest.fn(),
  applicationDefault: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(),
}));

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(),
}));

import {
  discoverNearbyProducts,
  getRetailersByZipCode,
  cacheZipCodeGeocode,
  getZipCodeCoordinates,
  getGeoZones,
  getGeoZone,
  createGeoZone,
  updateGeoZone,
  deleteGeoZone,
  findZonesForZipCode,
} from '@/server/services/geo-discovery';
import { DiscoveryOptions, GeoZone } from '@/types/foot-traffic';

// Mock CannMenus API
jest.mock('@/lib/cannmenus-api', () => ({
  searchNearbyRetailers: jest.fn(),
  getRetailerProducts: jest.fn(),
  geocodeZipCode: jest.fn(),
}));

// Mock Firebase server client
jest.mock('@/firebase/server-client');

import {
  searchNearbyRetailers,
  getRetailerProducts,
  geocodeZipCode,
} from '@/lib/cannmenus-api';
import { createServerClient } from '@/firebase/server-client';

describe('Geo Discovery Service', () => {
  let mockFirestoreChain: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockFirestoreChain = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ exists: false }),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
    };

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: mockFirestoreChain,
    });
  });

  describe('discoverNearbyProducts', () => {
    it('should discover products near a location', async () => {
      const mockRetailers = [
        {
          id: 'retailer_1',
          name: 'Green Leaf Dispensary',
          address: '123 Main St',
          city: 'Chicago',
          state: 'IL',
          postalCode: '60601',
          distance: 2.5,
          latitude: 41.8781,
          longitude: -87.6298,
          phone: '555-0101',
          menuUrl: 'https://example.com/menu',
        },
        {
          id: 'retailer_2',
          name: 'High Times Shop',
          address: '456 Oak Ave',
          city: 'Chicago',
          state: 'IL',
          postalCode: '60602',
          distance: 5.0,
          latitude: 41.8800,
          longitude: -87.6400,
          phone: '555-0102',
          menuUrl: 'https://example.com/menu2',
        },
      ];

      const mockProducts = [
        {
          cann_sku_id: 'prod_1',
          product_name: 'Blue Dream 1g',
          brand_name: 'Top Shelf',
          brand_id: 'brand_1',
          category: 'Flower',
          image_url: 'https://example.com/image1.jpg',
          description: 'Premium Blue Dream strain',
          latest_price: 15.0,
          original_price: 15.0,
          percentage_thc: 22.5,
          percentage_cbd: 0.5,
        },
      ];

      (searchNearbyRetailers as jest.Mock).mockResolvedValueOnce(mockRetailers);
      (getRetailerProducts as jest.Mock).mockResolvedValue(mockProducts);

      const options: DiscoveryOptions = {
        lat: 41.8781,
        lng: -87.6298,
        radiusMiles: 10,
      };

      const result = await discoverNearbyProducts(options);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Blue Dream 1g');
      expect(result.products[0].retailerCount).toBe(2);
      expect(result.retailers).toHaveLength(2);
      expect(result.totalProducts).toBe(1);
      expect(result.searchRadius).toBe(10);
    });

    it('should return empty result when no retailers found', async () => {
      (searchNearbyRetailers as jest.Mock).mockResolvedValueOnce([]);

      const options: DiscoveryOptions = {
        lat: 41.8781,
        lng: -87.6298,
        radiusMiles: 10,
      };

      const result = await discoverNearbyProducts(options);

      expect(result.products).toEqual([]);
      expect(result.retailers).toEqual([]);
      expect(result.totalProducts).toBe(0);
    });

    it('should filter retailers by radius', async () => {
      const mockRetailers = [
        {
          id: 'retailer_1',
          name: 'Near Shop',
          address: '123 Main St',
          city: 'Chicago',
          state: 'IL',
          postalCode: '60601',
          distance: 3.0,
          latitude: 41.8781,
          longitude: -87.6298,
        },
        {
          id: 'retailer_2',
          name: 'Far Shop',
          address: '789 Distant Rd',
          city: 'Suburbs',
          state: 'IL',
          postalCode: '60999',
          distance: 25.0,
          latitude: 42.0000,
          longitude: -88.0000,
        },
      ];

      (searchNearbyRetailers as jest.Mock).mockResolvedValueOnce(mockRetailers);
      (getRetailerProducts as jest.Mock).mockResolvedValue([]);

      const options: DiscoveryOptions = {
        lat: 41.8781,
        lng: -87.6298,
        radiusMiles: 10, // Should exclude retailer_2 (25 miles away)
      };

      const result = await discoverNearbyProducts(options);

      expect(result.retailers).toHaveLength(1);
      expect(result.retailers[0].name).toBe('Near Shop');
    });

    it('should apply price filters', async () => {
      const mockRetailers = [
        {
          id: 'retailer_1',
          name: 'Test Shop',
          address: '123 Main St',
          city: 'Chicago',
          state: 'IL',
          distance: 2.0,
          latitude: 41.8781,
          longitude: -87.6298,
        },
      ];

      const mockProducts = [
        {
          cann_sku_id: 'prod_cheap',
          product_name: 'Budget Bud',
          brand_name: 'Value Brand',
          category: 'Flower',
          latest_price: 10.0,
          original_price: 10.0,
          percentage_thc: 15.0,
        },
        {
          cann_sku_id: 'prod_expensive',
          product_name: 'Premium Flower',
          brand_name: 'Top Shelf',
          category: 'Flower',
          latest_price: 50.0,
          original_price: 50.0,
          percentage_thc: 28.0,
        },
      ];

      (searchNearbyRetailers as jest.Mock).mockResolvedValueOnce(mockRetailers);
      (getRetailerProducts as jest.Mock).mockResolvedValue(mockProducts);

      const options: DiscoveryOptions = {
        lat: 41.8781,
        lng: -87.6298,
        minPrice: 20.0,
        maxPrice: 60.0,
      };

      const result = await discoverNearbyProducts(options);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Premium Flower');
      expect(result.products[0].price).toBe(50.0);
    });

    it('should sort products by distance', async () => {
      const mockRetailers = [
        {
          id: 'retailer_1',
          name: 'Near Shop',
          address: '123 Main St',
          city: 'Chicago',
          state: 'IL',
          distance: 1.0,
          latitude: 41.8781,
          longitude: -87.6298,
        },
        {
          id: 'retailer_2',
          name: 'Far Shop',
          address: '456 Oak Ave',
          city: 'Chicago',
          state: 'IL',
          distance: 8.0,
          latitude: 41.9000,
          longitude: -87.7000,
        },
      ];

      const mockProducts = [
        {
          cann_sku_id: 'prod_1',
          product_name: 'Product A',
          brand_name: 'Brand',
          category: 'Flower',
          latest_price: 20.0,
          original_price: 20.0,
        },
      ];

      (searchNearbyRetailers as jest.Mock).mockResolvedValueOnce(mockRetailers);
      (getRetailerProducts as jest.Mock)
        .mockResolvedValueOnce([]) // retailer_1 has no products
        .mockResolvedValueOnce(mockProducts); // retailer_2 has prod_1

      const options: DiscoveryOptions = {
        lat: 41.8781,
        lng: -87.6298,
        sortBy: 'distance',
      };

      const result = await discoverNearbyProducts(options);

      // Product should show nearest retailer distance
      expect(result.products[0].nearestDistance).toBe(8.0);
    });

    it('should sort products by price', async () => {
      const mockRetailers = [
        {
          id: 'retailer_1',
          name: 'Shop',
          address: '123 Main St',
          city: 'Chicago',
          state: 'IL',
          distance: 2.0,
          latitude: 41.8781,
          longitude: -87.6298,
        },
      ];

      const mockProducts = [
        {
          cann_sku_id: 'prod_expensive',
          product_name: 'Expensive',
          brand_name: 'Brand',
          category: 'Flower',
          latest_price: 50.0,
          original_price: 50.0,
        },
        {
          cann_sku_id: 'prod_cheap',
          product_name: 'Cheap',
          brand_name: 'Brand',
          category: 'Flower',
          latest_price: 10.0,
          original_price: 10.0,
        },
      ];

      (searchNearbyRetailers as jest.Mock).mockResolvedValueOnce(mockRetailers);
      (getRetailerProducts as jest.Mock).mockResolvedValue(mockProducts);

      const options: DiscoveryOptions = {
        lat: 41.8781,
        lng: -87.6298,
        sortBy: 'price',
      };

      const result = await discoverNearbyProducts(options);

      expect(result.products[0].name).toBe('Cheap');
      expect(result.products[1].name).toBe('Expensive');
    });

    it('should limit results', async () => {
      const mockRetailers = [
        {
          id: 'retailer_1',
          name: 'Shop',
          address: '123 Main St',
          city: 'Chicago',
          state: 'IL',
          distance: 2.0,
          latitude: 41.8781,
          longitude: -87.6298,
        },
      ];

      const mockProducts = Array.from({ length: 100 }, (_, i) => ({
        cann_sku_id: `prod_${i}`,
        product_name: `Product ${i}`,
        brand_name: 'Brand',
        category: 'Flower',
        latest_price: 20.0,
        original_price: 20.0,
      }));

      (searchNearbyRetailers as jest.Mock).mockResolvedValueOnce(mockRetailers);
      (getRetailerProducts as jest.Mock).mockResolvedValue(mockProducts);

      const options: DiscoveryOptions = {
        lat: 41.8781,
        lng: -87.6298,
        limit: 10,
      };

      const result = await discoverNearbyProducts(options);

      expect(result.products).toHaveLength(10);
      expect(result.totalProducts).toBe(100);
    });

    it('should calculate foot traffic score correctly', async () => {
      const mockRetailers = [
        {
          id: 'retailer_1',
          name: 'Near Shop',
          address: '123 Main St',
          city: 'Chicago',
          state: 'IL',
          distance: 0.5, // Very close
          latitude: 41.8781,
          longitude: -87.6298,
        },
      ];

      const mockProducts = [
        {
          cann_sku_id: 'prod_sale',
          product_name: 'On Sale Item',
          brand_name: 'Brand',
          category: 'Flower',
          latest_price: 15.0,
          original_price: 25.0, // On sale
          percentage_thc: 20.0,
        },
      ];

      (searchNearbyRetailers as jest.Mock).mockResolvedValueOnce(mockRetailers);
      (getRetailerProducts as jest.Mock).mockResolvedValue(mockProducts);

      const options: DiscoveryOptions = {
        lat: 41.8781,
        lng: -87.6298,
      };

      const result = await discoverNearbyProducts(options);

      // Score should be high: base(50) + very close distance(25) + on sale(10) + availability(3) = 88
      expect(result.products[0].footTrafficScore).toBeGreaterThanOrEqual(80);
      expect(result.products[0].isOnSale).toBe(true);
    });
  });

  describe('getRetailersByZipCode', () => {
    it('should get retailers by ZIP code', async () => {
      (geocodeZipCode as jest.Mock).mockResolvedValueOnce({
        lat: 41.8781,
        lng: -87.6298,
      });

      const mockRetailers = [
        {
          id: 'retailer_1',
          name: 'Local Shop',
          address: '123 Main St',
          city: 'Chicago',
          state: 'IL',
          postalCode: '60601',
          distance: 2.0,
          latitude: 41.8781,
          longitude: -87.6298,
          phone: '555-0101',
          menuUrl: 'https://example.com/menu',
        },
      ];

      (searchNearbyRetailers as jest.Mock).mockResolvedValueOnce(mockRetailers);

      const result = await getRetailersByZipCode('60601');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Local Shop');
      expect(geocodeZipCode).toHaveBeenCalledWith('60601');
    });

    it('should return empty array if geocoding fails', async () => {
      (geocodeZipCode as jest.Mock).mockResolvedValueOnce(null);

      const result = await getRetailersByZipCode('99999');

      expect(result).toEqual([]);
    });
  });

  describe('ZIP Code Caching', () => {
    it('should cache ZIP code coordinates', async () => {
      (geocodeZipCode as jest.Mock).mockResolvedValueOnce({
        lat: 41.8781,
        lng: -87.6298,
      });

      mockFirestoreChain.set.mockResolvedValueOnce(undefined);

      const result = await cacheZipCodeGeocode('60601');

      expect(result).toBeDefined();
      expect(result?.zipCode).toBe('60601');
      expect(result?.lat).toBe(41.8781);
      expect(result?.lng).toBe(-87.6298);
      expect(mockFirestoreChain.set).toHaveBeenCalled();
    });

    it('should return null if geocoding fails', async () => {
      (geocodeZipCode as jest.Mock).mockResolvedValueOnce(null);

      const result = await cacheZipCodeGeocode('99999');

      expect(result).toBeNull();
      expect(mockFirestoreChain.set).not.toHaveBeenCalled();
    });

    it('should get coordinates from cache if valid', async () => {
      // Mock the get call to return a valid cached result
      mockFirestoreChain.get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          zipCode: '60601',
          lat: 41.8781,
          lng: -87.6298,
          city: 'Chicago',
          state: 'IL',
          cachedAt: { toMillis: () => Date.now() - 1000 * 60 * 60 }, // 1 hour ago
        }),
      });

      const result = await getZipCodeCoordinates('60601');

      expect(result).toEqual({
        lat: 41.8781,
        lng: -87.6298,
        city: 'Chicago',
        state: 'IL'
      });
      expect(geocodeZipCode).not.toHaveBeenCalled();
    });

    it('should refresh cache if expired', async () => {
      mockFirestoreChain.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          zipCode: '60601',
          lat: 41.8781,
          lng: -87.6298,
          cachedAt: { toMillis: () => Date.now() - 31 * 24 * 60 * 60 * 1000 }, // 31 days ago
        }),
      });

      (geocodeZipCode as jest.Mock).mockResolvedValueOnce({
        lat: 41.8800,
        lng: -87.6400,
      });

      mockFirestoreChain.set.mockResolvedValueOnce(undefined);

      const result = await getZipCodeCoordinates('60601');

      expect(result).toEqual({
        lat: 41.8800,
        lng: -87.6400,
        city: expect.any(String),
        state: expect.any(String)
      });
      expect(geocodeZipCode).toHaveBeenCalled();
    });
  });

  describe('Geo Zone Management', () => {
    it('should get all geo zones', async () => {
      mockFirestoreChain.get.mockResolvedValueOnce({
        docs: [
          {
            id: 'zone_1',
            data: () => ({
              name: 'Downtown Chicago',
              zipCodes: ['60601', '60602'],
              priority: 10,
              enabled: true,
              createdAt: { toDate: () => new Date('2024-01-01') },
              updatedAt: { toDate: () => new Date('2024-01-01') },
            }),
          },
        ],
      });

      const result = await getGeoZones();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Downtown Chicago');
      expect(mockFirestoreChain.orderBy).toHaveBeenCalledWith('priority', 'desc');
    });

    it('should get single geo zone by ID', async () => {
      mockFirestoreChain.get.mockResolvedValueOnce({
        exists: true,
        id: 'zone_1',
        data: () => ({
          name: 'Test Zone',
          zipCodes: ['60601'],
          priority: 5,
          enabled: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      });

      const result = await getGeoZone('zone_1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Zone');
    });

    it('should return null if zone not found', async () => {
      mockFirestoreChain.get.mockResolvedValueOnce({
        exists: false,
      });

      const result = await getGeoZone('nonexistent');

      expect(result).toBeNull();
    });

    it('should create a new geo zone', async () => {
      // First doc call is for 'config', second is for new ID
      mockFirestoreChain.doc
        .mockReturnValueOnce(mockFirestoreChain) // .doc('config')
        .mockReturnValueOnce({                   // .doc() -> new ref
          id: 'new_zone_id',
          set: mockFirestoreChain.set,
        });

      mockFirestoreChain.set.mockResolvedValueOnce(undefined);

      const newZone = {
        name: 'New Zone',
        zipCodes: ['60601', '60602'],
        priority: 8,
        enabled: true,
      };

      const result = await createGeoZone(newZone);

      expect(result.id).toBe('new_zone_id');
      expect(result.name).toBe('New Zone');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(mockFirestoreChain.set).toHaveBeenCalled();
    });

    it('should update a geo zone', async () => {
      mockFirestoreChain.get.mockResolvedValueOnce({
        exists: true,
      });

      mockFirestoreChain.update.mockResolvedValueOnce(undefined);

      mockFirestoreChain.get.mockResolvedValueOnce({
        exists: true,
        id: 'zone_1',
        data: () => ({
          name: 'Updated Zone',
          zipCodes: ['60601'],
          priority: 10,
          enabled: false,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      });

      const result = await updateGeoZone('zone_1', { enabled: false });

      expect(result).toBeDefined();
      expect(result?.enabled).toBe(false);
      expect(mockFirestoreChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
          updatedAt: expect.any(Date),
        })
      );
    });

    it('should return null when updating non-existent zone', async () => {
      mockFirestoreChain.get.mockResolvedValueOnce({
        exists: false,
      });

      const result = await updateGeoZone('nonexistent', { enabled: false });

      expect(result).toBeNull();
      expect(mockFirestoreChain.update).not.toHaveBeenCalled();
    });

    it('should delete a geo zone', async () => {
      mockFirestoreChain.delete.mockResolvedValueOnce(undefined);

      const result = await deleteGeoZone('zone_1');

      expect(result).toBe(true);
      expect(mockFirestoreChain.delete).toHaveBeenCalled();
    });

    it('should find zones for ZIP code', async () => {
      mockFirestoreChain.get.mockResolvedValueOnce({
        docs: [
          {
            id: 'zone_1',
            data: () => ({
              name: 'Zone 1',
              zipCodes: ['60601', '60602'],
              priority: 10,
              enabled: true,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
          {
            id: 'zone_2',
            data: () => ({
              name: 'Zone 2',
              zipCodes: ['60603', '60604'],
              priority: 5,
              enabled: true,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
          {
            id: 'zone_disabled',
            data: () => ({
              name: 'Disabled Zone',
              zipCodes: ['60601'],
              priority: 1,
              enabled: false,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      });

      const result = await findZonesForZipCode('60601');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Zone 1');
      // Should not include disabled zone
    });
  });
});
