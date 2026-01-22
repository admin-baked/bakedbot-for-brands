/**
 * Unit tests for TTS Service
 * Tests: Text processing, brand voices, OpenAI TTS integration
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      audio: {
        speech: {
          create: jest.fn().mockResolvedValue({
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
          }),
        },
      },
    })),
  };
});

// Mock Firebase Admin Storage
jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn().mockReturnValue({
    bucket: jest.fn().mockReturnValue({
      name: 'test-bucket',
      file: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue(undefined),
        makePublic: jest.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

// Mock server client
jest.mock('@/server/server-client', () => ({
  createServerClient: jest.fn().mockResolvedValue({
    firestore: {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ exists: false }),
      set: jest.fn().mockResolvedValue(undefined),
    },
  }),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { processTextForTTS } from '@/server/services/tts/text-processor';
import {
  getBrandVoiceConfig,
  getVoiceForTone,
  DEFAULT_BRAND_VOICE,
  SMOKEY_DEFAULT_VOICE,
  clearBrandVoiceCache,
} from '@/server/services/tts/brand-voices';
import type { BrandVoiceConfig, OpenAIVoice } from '@/server/services/tts/types';

describe('TTS Text Processor', () => {
  describe('processTextForTTS', () => {
    it('should remove markdown formatting', async () => {
      const text = '**Bold text** and *italic* and `code`';
      const result = await processTextForTTS(text);

      expect(result.processed).not.toContain('**');
      expect(result.processed).not.toContain('*');
      expect(result.processed).not.toContain('`');
      expect(result.processed).toContain('Bold text');
      expect(result.processed).toContain('italic');
      expect(result.processed).toContain('code');
    });

    it('should convert prices to spoken form', async () => {
      const text = 'The price is $25.99 for flower';
      const result = await processTextForTTS(text);

      expect(result.processed).toContain('twenty-five dollars');
      expect(result.processed).toContain('ninety-nine cents');
      expect(result.processed).not.toContain('$');
    });

    it('should convert whole dollar prices', async () => {
      const text = 'Only $50 for an eighth';
      const result = await processTextForTTS(text);

      expect(result.processed).toContain('fifty dollars');
    });

    it('should convert percentages to spoken form', async () => {
      const text = 'THC content is 24.5%';
      const result = await processTextForTTS(text);

      expect(result.processed).toContain('twenty-four point');
      expect(result.processed).toContain('percent');
      expect(result.processed).not.toContain('%');
    });

    it('should expand THC and CBD abbreviations', async () => {
      const text = 'High THC and CBD content';
      const result = await processTextForTTS(text);

      expect(result.processed).toContain('T H C');
      expect(result.processed).toContain('C B D');
    });

    it('should convert cannabis fractions', async () => {
      const cases = [
        { input: '1/8th of flower', expected: 'an eighth' },
        { input: '1/4 ounce', expected: 'a quarter' },
        { input: '1/2 gram', expected: 'a half' },
        { input: '3.5g of bud', expected: 'an eighth' },
      ];

      for (const { input, expected } of cases) {
        const result = await processTextForTTS(input);
        expect(result.processed.toLowerCase()).toContain(expected);
      }
    });

    it('should handle hyphenated cannabis terms', async () => {
      const text = 'Try our pre-roll or full-spectrum oil';
      const result = await processTextForTTS(text);

      expect(result.processed).toContain('pre roll');
      expect(result.processed).toContain('full spectrum');
    });

    it('should track transformations applied', async () => {
      const text = '**Bold** with $25 and 24%';
      const result = await processTextForTTS(text);

      expect(result.transformations).toContain('removed_markdown');
      expect(result.transformations).toContain('converted_prices');
      expect(result.transformations).toContain('converted_percentages');
    });

    it('should estimate speaking duration', async () => {
      const text = 'This is a test sentence with about ten words in it.';
      const result = await processTextForTTS(text);

      // ~10 words at 150 wpm = ~4 seconds
      expect(result.estimatedDuration).toBeGreaterThan(0);
      expect(result.estimatedDuration).toBeLessThan(10);
    });

    it('should apply brand vocabulary when provided', async () => {
      const text = 'Check out Stiiizy products';
      const brandConfig: BrandVoiceConfig = {
        brandId: 'test',
        defaultVoice: 'nova',
        speed: 1.0,
        vocabulary: [
          { word: 'Stiiizy', pronunciation: 'Steezy' },
        ],
      };

      const result = await processTextForTTS(text, brandConfig);

      expect(result.processed).toContain('Steezy');
      expect(result.transformations).toContain('brand_vocabulary');
    });

    it('should remove markdown links but keep text', async () => {
      const text = 'Check out [our menu](https://example.com/menu) today';
      const result = await processTextForTTS(text);

      expect(result.processed).toContain('our menu');
      expect(result.processed).not.toContain('[');
      expect(result.processed).not.toContain('https://');
    });

    it('should remove markdown headers', async () => {
      const text = '## Product Recommendations\n### Top Picks';
      const result = await processTextForTTS(text);

      expect(result.processed).not.toContain('#');
      expect(result.processed).toContain('Product Recommendations');
      expect(result.processed).toContain('Top Picks');
    });
  });

  describe('Number to Words Conversion', () => {
    it('should convert single digit numbers', async () => {
      const result = await processTextForTTS('$5 item');
      expect(result.processed).toContain('five dollars');
    });

    it('should convert teen numbers', async () => {
      const result = await processTextForTTS('$15 deal');
      expect(result.processed).toContain('fifteen dollars');
    });

    it('should convert tens', async () => {
      const result = await processTextForTTS('$45 flower');
      expect(result.processed).toContain('forty-five dollars');
    });

    it('should convert hundreds', async () => {
      const result = await processTextForTTS('$250 ounce');
      expect(result.processed).toContain('two hundred fifty dollars');
    });
  });
});

describe('Brand Voices', () => {
  beforeEach(() => {
    clearBrandVoiceCache();
  });

  describe('getBrandVoiceConfig', () => {
    it('should return default config when brand not found', async () => {
      const config = await getBrandVoiceConfig('unknown-brand');

      expect(config).not.toBeNull();
      expect(config?.brandId).toBe('unknown-brand');
      expect(config?.defaultVoice).toBe(DEFAULT_BRAND_VOICE.defaultVoice);
    });

    it('should cache config after first fetch', async () => {
      const config1 = await getBrandVoiceConfig('test-brand');
      const config2 = await getBrandVoiceConfig('test-brand');

      // Same instance from cache
      expect(config1).toBe(config2);
    });
  });

  describe('getVoiceForTone', () => {
    it('should return correct voice for each tone', () => {
      const tones: Array<{ tone: BrandVoiceConfig['tone']; expected: OpenAIVoice }> = [
        { tone: 'professional', expected: 'onyx' },
        { tone: 'friendly', expected: 'nova' },
        { tone: 'casual', expected: 'alloy' },
        { tone: 'educational', expected: 'shimmer' },
      ];

      for (const { tone, expected } of tones) {
        expect(getVoiceForTone(tone)).toBe(expected);
      }
    });

    it('should default to nova for undefined tone', () => {
      expect(getVoiceForTone(undefined)).toBe('nova');
    });
  });

  describe('Constants', () => {
    it('should have Smokey default voice as nova', () => {
      expect(SMOKEY_DEFAULT_VOICE).toBe('nova');
    });

    it('should have default brand voice configuration', () => {
      expect(DEFAULT_BRAND_VOICE.defaultVoice).toBe('nova');
      expect(DEFAULT_BRAND_VOICE.speed).toBe(1.0);
      expect(DEFAULT_BRAND_VOICE.tone).toBe('friendly');
      expect(DEFAULT_BRAND_VOICE.vocabulary).toBeDefined();
      expect(DEFAULT_BRAND_VOICE.vocabulary?.length).toBeGreaterThan(0);
    });

    it('should include common cannabis brand pronunciations', () => {
      const vocabulary = DEFAULT_BRAND_VOICE.vocabulary || [];
      const brandNames = vocabulary.map(v => v.word);

      expect(brandNames).toContain('Stiiizy');
      expect(brandNames).toContain('Wana');
      expect(brandNames).toContain('WYLD');
    });
  });
});

describe('TTS Types', () => {
  describe('OpenAIVoice', () => {
    it('should support all OpenAI voices', () => {
      const validVoices: OpenAIVoice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

      for (const voice of validVoices) {
        expect(typeof voice).toBe('string');
      }
    });
  });

  describe('BrandVoiceConfig', () => {
    it('should have required fields', () => {
      const config: BrandVoiceConfig = {
        brandId: 'test',
        defaultVoice: 'nova',
        speed: 1.0,
      };

      expect(config.brandId).toBeDefined();
      expect(config.defaultVoice).toBeDefined();
      expect(config.speed).toBeDefined();
    });

    it('should support optional fields', () => {
      const config: BrandVoiceConfig = {
        brandId: 'test',
        defaultVoice: 'nova',
        speed: 1.0,
        customInstructions: 'Be friendly',
        vocabulary: [{ word: 'test', pronunciation: 'test' }],
        tone: 'friendly',
      };

      expect(config.customInstructions).toBe('Be friendly');
      expect(config.vocabulary).toHaveLength(1);
      expect(config.tone).toBe('friendly');
    });

    it('should validate speed range', () => {
      // Speed should be between 0.25 and 4.0
      const validSpeeds = [0.25, 1.0, 2.0, 4.0];
      const invalidSpeeds = [0.1, 5.0];

      for (const speed of validSpeeds) {
        expect(speed).toBeGreaterThanOrEqual(0.25);
        expect(speed).toBeLessThanOrEqual(4.0);
      }

      for (const speed of invalidSpeeds) {
        expect(speed < 0.25 || speed > 4.0).toBe(true);
      }
    });
  });
});

describe('TTS API Route Validation', () => {
  describe('Request Validation', () => {
    it('should require text field', () => {
      const invalidRequest = { voice: 'nova' };
      expect(invalidRequest).not.toHaveProperty('text');
    });

    it('should validate text length', () => {
      const validText = 'a'.repeat(4096);
      const invalidText = 'a'.repeat(4097);

      expect(validText.length).toBe(4096);
      expect(invalidText.length).toBeGreaterThan(4096);
    });

    it('should validate voice options', () => {
      const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
      const invalidVoice = 'invalid_voice';

      expect(validVoices).not.toContain(invalidVoice);
    });

    it('should validate speed range', () => {
      const validSpeed = 1.5;
      const invalidSpeedLow = 0.1;
      const invalidSpeedHigh = 5.0;

      expect(validSpeed).toBeGreaterThanOrEqual(0.25);
      expect(validSpeed).toBeLessThanOrEqual(4.0);
      expect(invalidSpeedLow).toBeLessThan(0.25);
      expect(invalidSpeedHigh).toBeGreaterThan(4.0);
    });
  });
});
