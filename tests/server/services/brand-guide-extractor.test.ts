/**
 * Unit Tests for Brand Guide Extractor
 *
 * Tests the brand guide extraction service including:
 * - Subpage scraping
 * - Color/font extraction
 * - Text sample extraction
 * - Confidence calculation
 * - AI extraction integration
 */

import { BrandGuideExtractor, getBrandGuideExtractor } from '@/server/services/brand-guide-extractor';
import { DiscoveryService } from '@/server/services/firecrawl';
import { callClaude } from '@/ai/claude';

// Mock dependencies
jest.mock('@/server/services/firecrawl');
jest.mock('@/ai/claude');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('BrandGuideExtractor', () => {
  let extractor: BrandGuideExtractor;
  let mockDiscoveryService: jest.Mocked<DiscoveryService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock discovery service
    mockDiscoveryService = {
      discoverUrl: jest.fn(),
      getInstance: jest.fn(),
    } as any;

    // Mock DiscoveryService.getInstance to return our mock
    (DiscoveryService.getInstance as jest.Mock).mockReturnValue(mockDiscoveryService);

    // Create extractor instance
    extractor = new BrandGuideExtractor();
  });

  describe('scrapeSubpages', () => {
    it('should scrape multiple subpages in parallel', async () => {
      const baseUrl = 'https://example.com';

      mockDiscoveryService.discoverUrl.mockImplementation((url: string) => {
        if (url.includes('/about-us')) {
          return Promise.resolve({
            markdown: 'About Us content with over 100 characters to pass the filter and provide meaningful content',
            metadata: {},
          });
        }
        if (url.includes('/our-story')) {
          return Promise.resolve({
            markdown: 'Our Story content with over 100 characters to pass the filter and provide meaningful brand story',
            metadata: {},
          });
        }
        return Promise.resolve({ markdown: '', metadata: {} });
      });

      // Use reflection to access private method
      const result = await (extractor as any).scrapeSubpages(baseUrl);

      // Should contain content from both successful scrapes
      expect(result).toContain('About Us content');
      expect(result).toContain('Our Story content');
      expect(result).toContain('<!-- subpage:');

      // Should have been called for all candidate URLs
      expect(mockDiscoveryService.discoverUrl).toHaveBeenCalledTimes(9);
    });

    it('should filter out short content (< 100 chars)', async () => {
      const baseUrl = 'https://example.com';

      mockDiscoveryService.discoverUrl.mockResolvedValue({
        markdown: 'Short',
        metadata: {},
      });

      const result = await (extractor as any).scrapeSubpages(baseUrl);

      // Should be empty since all content is too short
      expect(result).toBe('');
    });

    it('should handle failed scrapes gracefully', async () => {
      const baseUrl = 'https://example.com';

      mockDiscoveryService.discoverUrl.mockRejectedValue(new Error('Network error'));

      // Should not throw
      const result = await (extractor as any).scrapeSubpages(baseUrl);

      expect(result).toBe('');
    });

    it('should remove trailing slashes from base URL', async () => {
      const baseUrl = 'https://example.com/';

      mockDiscoveryService.discoverUrl.mockResolvedValue({
        markdown: 'Content with enough characters to pass the minimum length requirement for valid subpage content',
        metadata: {},
      });

      await (extractor as any).scrapeSubpages(baseUrl);

      // All URLs should be built without double slashes
      const calls = mockDiscoveryService.discoverUrl.mock.calls;
      calls.forEach((call) => {
        expect(call[0]).not.toContain('example.com//');
      });
    });
  });

  describe('extractColors', () => {
    it('should extract hex colors from content', () => {
      const content = `
        Primary color: #2D5016
        Secondary: #C9A05F
        Also supports short form: #FFF
        Invalid: #GGGGGG
      `;

      const colors = (extractor as any).extractColors(content);

      expect(colors).toContain('#2D5016');
      expect(colors).toContain('#C9A05F');
      expect(colors).toContain('#FFF');
      expect(colors).not.toContain('#GGGGGG');
    });

    it('should deduplicate colors', () => {
      const content = '#2D5016 and #2D5016 again';

      const colors = (extractor as any).extractColors(content);

      expect(colors.filter((c: string) => c === '#2D5016')).toHaveLength(1);
    });

    it('should limit to 10 colors', () => {
      const content = Array.from({ length: 20 }, (_, i) =>
        `#${i.toString(16).padStart(6, '0')}`
      ).join(' ');

      const colors = (extractor as any).extractColors(content);

      expect(colors).toHaveLength(10);
    });

    it('should return empty array for no colors', () => {
      const content = 'No colors here';

      const colors = (extractor as any).extractColors(content);

      expect(colors).toEqual([]);
    });
  });

  describe('extractFonts', () => {
    it('should extract common font names from content', () => {
      const content = 'We use Inter for headings and Roboto for body text';

      const fonts = (extractor as any).extractFonts(content);

      expect(fonts).toContain('Inter');
      expect(fonts).toContain('Roboto');
    });

    it('should be case insensitive', () => {
      const content = 'MONTSERRAT and open sans';

      const fonts = (extractor as any).extractFonts(content);

      expect(fonts).toContain('Montserrat');
      expect(fonts).toContain('Open Sans');
    });

    it('should limit to 5 fonts', () => {
      const content = 'Arial Helvetica Times Georgia Verdana Courier Roboto';

      const fonts = (extractor as any).extractFonts(content);

      expect(fonts.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for no fonts', () => {
      const content = 'NoFontsHere';

      const fonts = (extractor as any).extractFonts(content);

      expect(fonts).toEqual([]);
    });
  });

  describe('extractTextSamples', () => {
    it('should extract meaningful paragraphs', () => {
      const content = `
        # Header to skip

        This is a meaningful paragraph with enough content to be extracted as a sample for voice analysis.

        Another good paragraph that provides insight into the brand's communication style and tone.

        Short

        http://skip-urls.com

        © 2024 Copyright text to skip
      `;

      const samples = (extractor as any).extractTextSamples(content);

      expect(samples.length).toBeGreaterThan(0);
      expect(samples.some((s: string) => s.includes('meaningful paragraph'))).toBe(true);
      expect(samples.some((s: string) => s.includes('Short'))).toBe(false);
      expect(samples.some((s: string) => s.includes('http://'))).toBe(false);
      expect(samples.some((s: string) => s.includes('©'))).toBe(false);
      expect(samples.some((s: string) => s.startsWith('#'))).toBe(false);
    });

    it('should filter paragraphs by length (50-500 chars)', () => {
      const shortText = 'Too short';
      const goodText = 'This is a perfect length paragraph for extracting brand voice samples from website content';
      const longText = 'x'.repeat(501);

      const content = `${shortText}\n\n${goodText}\n\n${longText}`;
      const samples = (extractor as any).extractTextSamples(content);

      expect(samples).toContain(goodText);
      expect(samples).not.toContain(shortText);
      expect(samples).not.toContain(longText);
    });

    it('should limit to 30 samples', () => {
      const paragraph = 'This is a valid paragraph with enough content to be extracted as a sample.';
      const content = Array.from({ length: 50 }, () => paragraph).join('\n\n');

      const samples = (extractor as any).extractTextSamples(content);

      expect(samples.length).toBeLessThanOrEqual(30);
    });
  });

  describe('calculateConfidence', () => {
    it('should calculate confidence based on data quality', () => {
      const websiteAnalysis = {
        url: 'https://example.com',
        content: 'content',
        metadata: { title: 'Test', description: 'Description' },
        colors: ['#000000', '#FFFFFF'],
        fonts: ['Inter'],
        textSamples: Array(10).fill('sample'),
      };

      const socialAnalyses: any[] = [
        { platform: 'instagram', handle: 'test', profileUrl: '', posts: [] },
      ];

      const visualIdentity = {
        colors: { primary: { hex: '#000000', name: 'Black', usage: 'Primary' } },
        typography: { headingFont: { family: 'Inter', weights: [400], source: 'google' } },
      };

      const voice = {
        personality: ['Friendly'],
        writingStyle: { sentenceLength: 'medium' },
      };

      const messaging = {
        tagline: 'Test tagline',
        positioning: 'Test positioning',
      };

      const confidence = (extractor as any).calculateConfidence(
        websiteAnalysis,
        socialAnalyses,
        visualIdentity,
        voice,
        messaging
      );

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('should give higher scores for more complete data', () => {
      const baseWebsite = {
        url: 'https://example.com',
        content: 'content',
        metadata: {},
        colors: [],
        fonts: [],
        textSamples: [],
      };

      const completeWebsite = {
        ...baseWebsite,
        metadata: { title: 'Test', description: 'Description' },
        colors: ['#000000'],
        fonts: ['Inter'],
        textSamples: Array(10).fill('sample'),
      };

      const lowConfidence = (extractor as any).calculateConfidence(baseWebsite, [], {}, {}, {});
      const highConfidence = (extractor as any).calculateConfidence(
        completeWebsite,
        [{ platform: 'instagram', handle: 'test', profileUrl: '', posts: [] }],
        { colors: {}, typography: {} },
        { personality: ['Friendly'], writingStyle: {} },
        { tagline: 'Test', positioning: 'Test' }
      );

      expect(highConfidence).toBeGreaterThan(lowConfidence);
    });

    it('should cap confidence at 100', () => {
      const perfectData = {
        url: 'https://example.com',
        content: 'content',
        metadata: { title: 'Test', description: 'Description', ogImage: 'img.jpg', favicon: 'fav.ico' },
        colors: Array(10).fill('#000000'),
        fonts: Array(5).fill('Inter'),
        textSamples: Array(30).fill('sample'),
      };

      const social = Array(10).fill({ platform: 'instagram', handle: 'test', profileUrl: '', posts: [] });

      const confidence = (extractor as any).calculateConfidence(
        perfectData,
        social,
        { colors: {}, typography: {} },
        { personality: ['Friendly'], writingStyle: {} },
        { tagline: 'Test', positioning: 'Test' }
      );

      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('extractFromUrl (integration)', () => {
    it('should extract full brand guide from URL', async () => {
      const url = 'https://thrivesyracuse.com';

      // Mock root scrape
      mockDiscoveryService.discoverUrl.mockImplementation((scrapeUrl: string) => {
        if (scrapeUrl === url) {
          return Promise.resolve({
            markdown: 'Homepage content with enough text to be meaningful for analysis and extraction',
            metadata: {
              title: 'Thrive Syracuse - Premium Cannabis',
              description: 'Premium cannabis dispensary',
              ogImage: 'https://example.com/logo.png',
            },
          });
        }
        if (scrapeUrl.includes('/about-us')) {
          return Promise.resolve({
            markdown: 'We are Thrive Syracuse. Our mission is to provide premium cannabis products with exceptional service.',
            metadata: {},
          });
        }
        return Promise.resolve({ markdown: '', metadata: {} });
      });

      // Mock Claude AI responses
      (callClaude as jest.Mock).mockImplementation(({ userMessage }) => {
        if (userMessage.includes('visual identity')) {
          return Promise.resolve(JSON.stringify({
            logo: { primary: 'https://example.com/logo.png' },
            colors: {
              primary: { hex: '#2D5016', name: 'Forest Green', usage: 'Primary' },
              secondary: { hex: '#C9A05F', name: 'Gold', usage: 'Accents' },
              accent: { hex: '#1A1A1A', name: 'Charcoal', usage: 'Text' },
              text: { hex: '#2C2C2C', name: 'Text', usage: 'Body' },
              background: { hex: '#FFFFFF', name: 'White', usage: 'Background' },
            },
            typography: {
              headingFont: { family: 'Inter', weights: [400, 700], source: 'google' },
              bodyFont: { family: 'Open Sans', weights: [400], source: 'google' },
            },
          }));
        }
        if (userMessage.includes('brand voice')) {
          return Promise.resolve(JSON.stringify({
            personality: ['Friendly', 'Professional'],
            tone: 'professional',
            writingStyle: {
              sentenceLength: 'medium',
              paragraphLength: 'moderate',
              useEmojis: false,
              useExclamation: false,
              useQuestions: true,
              useHumor: false,
              formalityLevel: 3,
              complexity: 'moderate',
              perspective: 'second-person',
            },
            vocabulary: {
              preferred: [],
              avoid: [],
            },
            sampleContent: [],
          }));
        }
        if (userMessage.includes('messaging')) {
          return Promise.resolve(JSON.stringify({
            brandName: 'Thrive Syracuse',
            tagline: 'Premium Cannabis, Exceptional Service',
            positioning: 'Premium cannabis dispensary serving Syracuse',
            missionStatement: 'To provide premium cannabis products with exceptional service',
            valuePropositions: ['Quality products', 'Expert staff', 'Community focused'],
            brandStory: {
              origin: 'Founded in Syracuse',
              values: ['Quality', 'Service', 'Community'],
              differentiators: ['Premium selection', 'Expert knowledge'],
            },
          }));
        }
        return Promise.resolve('{}');
      });

      const result = await extractor.extractFromUrl({ url });

      expect(result.success).toBe(true);
      expect(result.visualIdentity).toBeDefined();
      expect(result.voice).toBeDefined();
      expect(result.messaging).toBeDefined();
      expect(result.messaging?.brandName).toBe('Thrive Syracuse');
      expect(result.websiteTitle).toBe('Thrive Syracuse - Premium Cannabis');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle extraction errors gracefully', async () => {
      mockDiscoveryService.discoverUrl.mockRejectedValue(new Error('Network error'));

      await expect(extractor.extractFromUrl({ url: 'https://example.com' }))
        .rejects.toThrow('Failed to extract brand guide');
    });

    it('should include social media data when handles provided', async () => {
      const url = 'https://example.com';

      mockDiscoveryService.discoverUrl.mockResolvedValue({
        markdown: 'Content with enough characters to be meaningful and pass all filters during analysis',
        metadata: { title: 'Test Brand' },
      });

      (callClaude as jest.Mock).mockResolvedValue(JSON.stringify({
        personality: ['Friendly'],
        tone: 'casual',
      }));

      const result = await extractor.extractFromUrl({
        url,
        socialHandles: {
          instagram: 'testbrand',
          twitter: 'testbrand',
        },
      });

      expect(result.source.socialMediaSources).toBeDefined();
      expect(result.source.socialMediaSources?.length).toBeGreaterThan(0);
    });
  });

  describe('getBrandGuideExtractor (singleton)', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getBrandGuideExtractor();
      const instance2 = getBrandGuideExtractor();

      expect(instance1).toBe(instance2);
    });
  });
});
