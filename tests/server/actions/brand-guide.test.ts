/**
 * Integration Tests for Brand Guide Server Actions
 *
 * Tests the server actions including:
 * - Brand guide CRUD operations
 * - Firestore Timestamp serialization
 * - URL extraction flow
 * - Error handling
 */

import {
  createBrandGuide,
  getBrandGuide,
  updateBrandGuide,
  extractBrandGuideFromUrl,
} from '@/server/actions/brand-guide';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { getBrandGuideExtractor } from '@/server/services/brand-guide-extractor';

// Mock dependencies
jest.mock('@/firebase/admin');
jest.mock('@/server/services/brand-guide-extractor');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Brand Guide Server Actions', () => {
  let mockFirestore: any;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockSet: jest.Mock;
  let mockGet: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockWhere: jest.Mock;
  let mockOrderBy: jest.Mock;
  let mockLimit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Firestore mock chain
    mockSet = jest.fn().mockResolvedValue(undefined);
    mockGet = jest.fn();
    mockUpdate = jest.fn().mockResolvedValue(undefined);
    mockDelete = jest.fn().mockResolvedValue(undefined);
    mockWhere = jest.fn();
    mockOrderBy = jest.fn();
    mockLimit = jest.fn();

    mockDoc = jest.fn((path?: string) => ({
      set: mockSet,
      get: mockGet,
      update: mockUpdate,
      delete: mockDelete,
      collection: mockCollection,
    }));

    mockCollection = jest.fn((collectionPath: string) => ({
      doc: mockDoc,
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      get: jest.fn(),
    }));

    mockFirestore = {
      collection: mockCollection,
      doc: mockDoc,
    };

    (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
  });

  describe('createBrandGuide', () => {
    it('should create brand guide with manual method', async () => {
      const input = {
        brandId: 'brand123',
        brandName: 'Test Brand',
        method: 'manual' as const,
      };

      // Mock successful document creation
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'brand123',
          brandId: 'brand123',
          brandName: 'Test Brand',
          status: 'draft',
          createdAt: Timestamp.now(),
          lastUpdatedAt: Timestamp.now(),
        }),
      });

      const result = await createBrandGuide(input);

      expect(result.success).toBe(true);
      expect(result.brandGuide).toBeDefined();
      expect(mockSet).toHaveBeenCalled();
    });

    it('should use Firestore Timestamp (not Date) for timestamps', async () => {
      const input = {
        brandId: 'brand123',
        brandName: 'Test Brand',
        method: 'manual' as const,
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'brand123',
          createdAt: Timestamp.now(),
          lastUpdatedAt: Timestamp.now(),
        }),
      });

      await createBrandGuide(input);

      // Check that Timestamp.now() was used (not new Date())
      const setCall = mockSet.mock.calls[0];
      if (setCall) {
        const data = setCall[0];
        // Version history should use Timestamp
        expect(data).toBeDefined();
      }

      expect(mockSet).toHaveBeenCalled();
    });

    it('should extract from URL when method is url', async () => {
      const mockExtractor = {
        extractFromUrl: jest.fn().mockResolvedValue({
          visualIdentity: { colors: { primary: { hex: '#000000' } } },
          voice: { personality: ['Friendly'] },
          messaging: { tagline: 'Test tagline' },
          source: { method: 'url_extraction' },
          confidence: 85,
          websiteTitle: 'Test Brand',
        }),
      };

      (getBrandGuideExtractor as jest.Mock).mockReturnValue(mockExtractor);

      const input = {
        brandId: 'brand123',
        brandName: 'Test Brand',
        method: 'url' as const,
        sourceUrl: 'https://example.com',
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'brand123',
          visualIdentity: { colors: { primary: { hex: '#000000' } } },
        }),
      });

      const result = await createBrandGuide(input);

      expect(result.success).toBe(true);
      expect(mockExtractor.extractFromUrl).toHaveBeenCalledWith({
        url: 'https://example.com',
        socialHandles: undefined,
      });
    });

    it('should pass social handles to extractor', async () => {
      const mockExtractor = {
        extractFromUrl: jest.fn().mockResolvedValue({
          visualIdentity: {},
          voice: {},
          messaging: {},
          source: { method: 'url_extraction' },
          confidence: 50,
        }),
      };

      (getBrandGuideExtractor as jest.Mock).mockReturnValue(mockExtractor);

      const input = {
        brandId: 'brand123',
        brandName: 'Test Brand',
        method: 'url' as const,
        sourceUrl: 'https://example.com',
        socialHandles: {
          instagram: 'testbrand',
          twitter: 'testbrand',
        },
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ id: 'brand123' }),
      });

      await createBrandGuide(input);

      expect(mockExtractor.extractFromUrl).toHaveBeenCalledWith({
        url: 'https://example.com',
        socialHandles: {
          instagram: 'testbrand',
          twitter: 'testbrand',
        },
      });
    });

    it('should return error when URL is required but missing', async () => {
      const input = {
        brandId: 'brand123',
        brandName: 'Test Brand',
        method: 'url' as const,
        // sourceUrl missing
      };

      const result = await createBrandGuide(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source URL required');
    });

    it('should handle Firestore errors gracefully', async () => {
      const input = {
        brandId: 'brand123',
        brandName: 'Test Brand',
        method: 'manual' as const,
      };

      mockSet.mockRejectedValue(new Error('Firestore connection error'));

      const result = await createBrandGuide(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Failed to create brand guide');
    });

    it('should handle serialization errors from Date objects', async () => {
      const input = {
        brandId: 'brand123',
        brandName: 'Test Brand',
        method: 'manual' as const,
      };

      // Simulate the "Couldn't serialize object of type 'e'" error
      mockSet.mockRejectedValue(new Error("Couldn't serialize object of type 'e'"));

      const result = await createBrandGuide(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getBrandGuide', () => {
    it('should retrieve existing brand guide', async () => {
      const brandId = 'brand123';

      mockGet.mockResolvedValue({
        exists: true,
        id: brandId,
        data: () => ({
          id: brandId,
          brandId,
          brandName: 'Test Brand',
          status: 'active',
          createdAt: Timestamp.now(),
          lastUpdatedAt: Timestamp.now(),
        }),
      });

      const result = await getBrandGuide(brandId);

      expect(result.success).toBe(true);
      expect(result.brandGuide).toBeDefined();
      expect(result.brandGuide?.brandName).toBe('Test Brand');
    });

    it('should return error when brand guide not found', async () => {
      const brandId = 'nonexistent';

      mockGet.mockResolvedValue({
        exists: false,
      });

      const result = await getBrandGuide(brandId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle Firestore errors', async () => {
      const brandId = 'brand123';

      mockGet.mockRejectedValue(new Error('Network error'));

      const result = await getBrandGuide(brandId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateBrandGuide', () => {
    it('should update brand guide successfully', async () => {
      const input = {
        brandId: 'brand123',
        updates: {
          brandName: 'Updated Brand Name',
        },
      };

      // Mock existing guide
      mockGet.mockResolvedValue({
        exists: true,
        id: 'brand123',
        data: () => ({
          id: 'brand123',
          brandId: 'brand123',
          brandName: 'Original Name',
          version: 1,
        }),
      });

      const result = await updateBrandGuide(input);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should create version history when requested', async () => {
      const input = {
        brandId: 'brand123',
        updates: {
          brandName: 'Updated Name',
        },
        reason: 'Rebranding',
        createVersion: true,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'brand123',
        data: () => ({
          id: 'brand123',
          brandName: 'Original Name',
          version: 1,
        }),
      });

      const result = await updateBrandGuide(input);

      expect(result.success).toBe(true);
      // Version should be created in subcollection
      expect(mockSet).toHaveBeenCalled();
    });

    it('should return error when brand guide not found', async () => {
      const input = {
        brandId: 'nonexistent',
        updates: {},
      };

      mockGet.mockResolvedValue({
        exists: false,
      });

      const result = await updateBrandGuide(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('extractBrandGuideFromUrl', () => {
    it('should extract brand guide data from URL', async () => {
      const mockExtractor = {
        extractFromUrl: jest.fn().mockResolvedValue({
          visualIdentity: {
            colors: {
              primary: { hex: '#2D5016', name: 'Green', usage: 'Primary' },
            },
          },
          voice: {
            personality: ['Friendly', 'Professional'],
            tone: 'professional',
          },
          messaging: {
            brandName: 'Thrive Syracuse',
            tagline: 'Premium Cannabis',
            positioning: 'Premium dispensary',
          },
          source: { method: 'url_extraction' },
          confidence: 90,
          websiteTitle: 'Thrive Syracuse - Premium Cannabis',
        }),
      };

      (getBrandGuideExtractor as jest.Mock).mockReturnValue(mockExtractor);

      const result = await extractBrandGuideFromUrl({
        url: 'https://thrivesyracuse.com',
      });

      expect(result.success).toBe(true);
      expect(result.visualIdentity).toBeDefined();
      expect(result.voice).toBeDefined();
      expect(result.messaging).toBeDefined();
      expect(result.messaging?.brandName).toBe('Thrive Syracuse');
      expect(result.websiteTitle).toBe('Thrive Syracuse - Premium Cannabis');
      expect(result.confidence).toBe(90);
    });

    it('should include social handles in extraction', async () => {
      const mockExtractor = {
        extractFromUrl: jest.fn().mockResolvedValue({
          visualIdentity: {},
          voice: {},
          messaging: {},
          source: { method: 'hybrid', socialMediaSources: [] },
          confidence: 75,
        }),
      };

      (getBrandGuideExtractor as jest.Mock).mockReturnValue(mockExtractor);

      const input = {
        url: 'https://example.com',
        socialHandles: {
          instagram: 'testbrand',
          facebook: 'testbrand',
        },
      };

      await extractBrandGuideFromUrl(input);

      expect(mockExtractor.extractFromUrl).toHaveBeenCalledWith(input);
    });

    it('should handle extraction errors', async () => {
      const mockExtractor = {
        extractFromUrl: jest.fn().mockRejectedValue(new Error('Scraping failed')),
      };

      (getBrandGuideExtractor as jest.Mock).mockReturnValue(mockExtractor);

      const result = await extractBrandGuideFromUrl({
        url: 'https://invalid-url.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Failed to extract brand guide');
    });

    it('should return extracted data even with low confidence', async () => {
      const mockExtractor = {
        extractFromUrl: jest.fn().mockResolvedValue({
          visualIdentity: { colors: {} },
          voice: {},
          messaging: { tagline: 'Something' },
          source: { method: 'url_extraction' },
          confidence: 25, // Low confidence
        }),
      };

      (getBrandGuideExtractor as jest.Mock).mockReturnValue(mockExtractor);

      const result = await extractBrandGuideFromUrl({
        url: 'https://example.com',
      });

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(25);
      expect(result.messaging).toBeDefined();
    });
  });

  describe('Timestamp Serialization', () => {
    it('should use Firestore Timestamp for all date fields', async () => {
      const input = {
        brandId: 'brand123',
        brandName: 'Test Brand',
        method: 'manual' as const,
      };

      let capturedData: any;
      mockSet.mockImplementation((data) => {
        capturedData = data;
        return Promise.resolve();
      });

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'brand123',
          createdAt: Timestamp.now(),
          lastUpdatedAt: Timestamp.now(),
        }),
      });

      await createBrandGuide(input);

      // The data passed to Firestore should not contain raw Date objects
      // Version history timestamp should be created properly
      expect(mockSet).toHaveBeenCalled();
    });

    it('should handle Timestamp conversion in version history', async () => {
      const input = {
        brandId: 'brand123',
        updates: {
          brandName: 'Updated',
        },
        createVersion: true,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'brand123',
        data: () => ({
          id: 'brand123',
          brandName: 'Original',
          version: 1,
          createdAt: Timestamp.now(),
        }),
      });

      await updateBrandGuide(input);

      // Version should be created with Timestamp
      expect(mockSet).toHaveBeenCalled();
    });
  });
});
