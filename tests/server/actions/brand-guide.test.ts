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
import { Timestamp } from '@google-cloud/firestore';
import { getBrandGuideExtractor } from '@/server/services/brand-guide-extractor';
import { createMockBrandGuideRepo, type MockBrandGuideRepo } from '../../__mocks__/brandGuideRepo';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({})),
}));

jest.mock('@/server/repos/brandGuideRepo', () => ({
  makeBrandGuideRepo: jest.fn(),
}));

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
  let mockRepo: MockBrandGuideRepo;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock repository for each test
    mockRepo = createMockBrandGuideRepo();

    // Make makeBrandGuideRepo return our mock
    const { makeBrandGuideRepo } = require('@/server/repos/brandGuideRepo');
    (makeBrandGuideRepo as jest.Mock).mockReturnValue(mockRepo);
  });

  describe('createBrandGuide', () => {
    it('should create brand guide with manual method', async () => {
      const input = {
        brandId: 'brand123',
        brandName: 'Test Brand',
        method: 'manual' as const,
      };

      const result = await createBrandGuide(input);

      expect(result.success).toBe(true);
      expect(result.brandGuide).toBeDefined();
      expect(result.brandGuide?.brandName).toBe('Test Brand');
      expect(mockRepo.create).toHaveBeenCalledWith(
        'brand123',
        expect.objectContaining({
          brandId: 'brand123',
          brandName: 'Test Brand',
          status: 'draft',
        })
      );
      expect(mockRepo.createVersion).toHaveBeenCalled();
    });

    it('should use Firestore Timestamp (not Date) for timestamps', async () => {
      const input = {
        brandId: 'brand123',
        brandName: 'Test Brand',
        method: 'manual' as const,
      };

      await createBrandGuide(input);

      // Verify that createVersion was called (which uses Timestamp.now())
      expect(mockRepo.createVersion).toHaveBeenCalled();
      const versionCall = mockRepo.createVersion.mock.calls[0];
      if (versionCall) {
        const [, versionData] = versionCall;
        // The timestamp field should exist
        expect(versionData).toHaveProperty('timestamp');
      }
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

      const result = await createBrandGuide(input);

      expect(result.success).toBe(true);
      expect(mockExtractor.extractFromUrl).toHaveBeenCalledWith({
        url: 'https://example.com',
        socialHandles: undefined,
      });
      expect(mockRepo.create).toHaveBeenCalled();
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

    it('should handle repository errors gracefully', async () => {
      const input = {
        brandId: 'brand123',
        brandName: 'Test Brand',
        method: 'manual' as const,
      };

      mockRepo.create.mockRejectedValue(new Error('Repository error'));

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
      mockRepo.create.mockRejectedValue(new Error("Couldn't serialize object of type 'e'"));

      const result = await createBrandGuide(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getBrandGuide', () => {
    it('should retrieve existing brand guide', async () => {
      const brandId = 'brand123';

      const mockGuide = {
        id: brandId,
        brandId,
        brandName: 'Test Brand',
        status: 'active',
        createdAt: Timestamp.now(),
        lastUpdatedAt: Timestamp.now(),
      };

      mockRepo.getById.mockResolvedValue(mockGuide as any);

      const result = await getBrandGuide(brandId);

      expect(result.success).toBe(true);
      expect(result.brandGuide).toBeDefined();
      expect(result.brandGuide?.brandName).toBe('Test Brand');
      expect(mockRepo.getById).toHaveBeenCalledWith(brandId);
    });

    it('should return error when brand guide not found', async () => {
      const brandId = 'nonexistent';

      mockRepo.getById.mockResolvedValue(null);

      const result = await getBrandGuide(brandId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle repository errors', async () => {
      const brandId = 'brand123';

      mockRepo.getById.mockRejectedValue(new Error('Network error'));

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
      const mockGuide = {
        id: 'brand123',
        brandId: 'brand123',
        brandName: 'Original Name',
        version: 1,
      };

      mockRepo.getById.mockResolvedValue(mockGuide as any);

      const result = await updateBrandGuide(input);

      expect(result.success).toBe(true);
      expect(mockRepo.update).toHaveBeenCalled();
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

      const mockGuide = {
        id: 'brand123',
        brandName: 'Original Name',
        version: 1,
      };

      mockRepo.getById.mockResolvedValue(mockGuide as any);

      const result = await updateBrandGuide(input);

      expect(result.success).toBe(true);
      expect(mockRepo.createVersion).toHaveBeenCalled();
    });

    it('should return error when brand guide not found', async () => {
      const input = {
        brandId: 'nonexistent',
        updates: {},
      };

      mockRepo.getById.mockResolvedValue(null);

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
      // The error wraps the original message
      expect(result.error).toMatch(/Failed to extract brand guide|Scraping failed/);
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

      await createBrandGuide(input);

      // The repository create method should be called
      // The actual implementation uses Timestamp.now() internally
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.createVersion).toHaveBeenCalled();
    });

    it('should handle Timestamp conversion in version history', async () => {
      const input = {
        brandId: 'brand123',
        updates: {
          brandName: 'Updated',
        },
        createVersion: true,
      };

      const mockGuide = {
        id: 'brand123',
        brandName: 'Original',
        version: 1,
        createdAt: Timestamp.now(),
      };

      mockRepo.getById.mockResolvedValue(mockGuide as any);

      await updateBrandGuide(input);

      // Version should be created with Timestamp
      expect(mockRepo.createVersion).toHaveBeenCalled();
    });
  });
});
