/**
 * Unit Tests for Brand Guide Utilities
 *
 * Tests client-side utilities for brand guide processing:
 * - AI placeholder filtering
 * - TLD stripping
 * - Brand name extraction
 * - Completeness calculation
 */

import {
  cleanExtractedValue,
  stripTldSuffix,
  extractBrandNameFromTitle,
  extractBrandNameFromDomain,
  buildBrandName,
  calculateSectionCompleteness,
} from '@/lib/brand-guide-utils';

describe('Brand Guide Utilities', () => {
  describe('cleanExtractedValue', () => {
    it('should return empty string for undefined', () => {
      expect(cleanExtractedValue(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(cleanExtractedValue('')).toBe('');
    });

    it('should return empty string for "Unknown"', () => {
      expect(cleanExtractedValue('Unknown')).toBe('');
      expect(cleanExtractedValue('unknown')).toBe('');
      expect(cleanExtractedValue('UNKNOWN')).toBe('');
    });

    it('should return empty string for "Unable to extract"', () => {
      expect(cleanExtractedValue('Unable to extract')).toBe('');
      expect(cleanExtractedValue('unable to extract - no content provided')).toBe('');
      expect(cleanExtractedValue('Unable to extract brand name')).toBe('');
    });

    it('should return empty string for placeholder patterns', () => {
      expect(cleanExtractedValue('N/A')).toBe('');
      expect(cleanExtractedValue('n/a')).toBe('');
      expect(cleanExtractedValue('Not available')).toBe('');
      expect(cleanExtractedValue('Not found')).toBe('');
      expect(cleanExtractedValue('Unknown - insufficient data')).toBe('');
      expect(cleanExtractedValue('No content available')).toBe('');
    });

    it('should preserve valid values', () => {
      expect(cleanExtractedValue('Thrive Syracuse')).toBe('Thrive Syracuse');
      expect(cleanExtractedValue('Premium Cannabis')).toBe('Premium Cannabis');
      expect(cleanExtractedValue('Quality products since 2020')).toBe('Quality products since 2020');
    });

    it('should not filter values with placeholder substrings in valid context', () => {
      // "unable" is in "sustainable" but the function only checks for full patterns
      // It should preserve the valid value
      expect(cleanExtractedValue('Sustainable practices')).toBe('Sustainable practices');
    });
  });

  describe('stripTldSuffix', () => {
    it('should strip common TLDs', () => {
      expect(stripTldSuffix('thrivesyracuse.com')).toBe('thrivesyracuse');
      expect(stripTldSuffix('example.net')).toBe('example');
      expect(stripTldSuffix('brandname.org')).toBe('brandname');
      expect(stripTldSuffix('startup.io')).toBe('startup');
      expect(stripTldSuffix('company.co')).toBe('company');
      expect(stripTldSuffix('business.ca')).toBe('business');
    });

    it('should be case insensitive', () => {
      expect(stripTldSuffix('Example.COM')).toBe('Example');
      expect(stripTldSuffix('Brand.Net')).toBe('Brand');
    });

    it('should preserve text after TLD', () => {
      expect(stripTldSuffix('example.com - Homepage')).toBe('example');
    });

    it('should return original if no TLD', () => {
      expect(stripTldSuffix('brandname')).toBe('brandname');
      expect(stripTldSuffix('two words')).toBe('two words');
    });

    it('should handle empty string', () => {
      expect(stripTldSuffix('')).toBe('');
    });

    it('should not strip valid words that end with TLD patterns', () => {
      // "organization" ends with "org" but shouldn't be stripped
      expect(stripTldSuffix('organization')).toBe('organization');
      expect(stripTldSuffix('information')).toBe('information');
    });
  });

  describe('extractBrandNameFromTitle', () => {
    it('should extract brand name before pipe separator', () => {
      expect(extractBrandNameFromTitle('Thrive Syracuse | Premium Cannabis')).toBe('Thrive Syracuse');
      expect(extractBrandNameFromTitle('Brand Name | Tagline Here')).toBe('Brand Name');
    });

    it('should extract brand name before dash separator', () => {
      expect(extractBrandNameFromTitle('Thrive Syracuse - Premium Cannabis')).toBe('Thrive Syracuse');
      expect(extractBrandNameFromTitle('Brand Name – Description')).toBe('Brand Name');
    });

    it('should strip TLD if title is just the domain', () => {
      expect(extractBrandNameFromTitle('thrivesyracuse.com')).toBe('thrivesyracuse');
      expect(extractBrandNameFromTitle('example.net | Homepage')).toBe('example');
    });

    it('should handle title without separators', () => {
      expect(extractBrandNameFromTitle('Thrive Syracuse')).toBe('Thrive Syracuse');
      expect(extractBrandNameFromTitle('Single Brand Name')).toBe('Single Brand Name');
    });

    it('should return empty string for undefined', () => {
      expect(extractBrandNameFromTitle(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(extractBrandNameFromTitle('')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(extractBrandNameFromTitle('  Brand Name  | Tagline')).toBe('Brand Name');
    });
  });

  describe('extractBrandNameFromDomain', () => {
    it('should extract domain without protocol and TLD', () => {
      expect(extractBrandNameFromDomain('https://thrivesyracuse.com')).toBe('thrivesyracuse');
      expect(extractBrandNameFromDomain('http://example.net')).toBe('example');
      expect(extractBrandNameFromDomain('https://www.brandname.org')).toBe('brandname');
    });

    it('should remove www prefix', () => {
      expect(extractBrandNameFromDomain('https://www.example.com')).toBe('example');
      expect(extractBrandNameFromDomain('www.example.com')).toBe('example');
    });

    it('should handle domains without protocol', () => {
      expect(extractBrandNameFromDomain('thrivesyracuse.com')).toBe('thrivesyracuse');
      expect(extractBrandNameFromDomain('example.net')).toBe('example');
    });

    it('should return empty string for empty input', () => {
      expect(extractBrandNameFromDomain('')).toBe('');
    });

    it('should handle invalid URLs gracefully', () => {
      expect(extractBrandNameFromDomain('not-a-url')).toBe('not-a-url');
      expect(extractBrandNameFromDomain('incomplete.com')).toBe('incomplete');
    });
  });

  describe('buildBrandName', () => {
    it('should prioritize AI-extracted name when valid', () => {
      const result = buildBrandName(
        'Thrive Syracuse',
        'thrivesyracuse.com | Homepage',
        'https://thrivesyracuse.com'
      );
      expect(result).toBe('Thrive Syracuse');
    });

    it('should fall back to title when AI extraction is placeholder', () => {
      const result = buildBrandName(
        'Unknown - unable to extract',
        'Thrive Syracuse | Premium Cannabis',
        'https://thrivesyracuse.com'
      );
      expect(result).toBe('Thrive Syracuse');
    });

    it('should fall back to domain when both AI and title are invalid', () => {
      const result = buildBrandName(
        'Unknown',
        undefined,
        'https://thrivesyracuse.com'
      );
      expect(result).toBe('thrivesyracuse');
    });

    it('should handle all fallback scenarios', () => {
      // AI valid
      expect(buildBrandName('Brand Name', 'title', 'domain.com')).toBe('Brand Name');

      // AI invalid, title valid
      expect(buildBrandName('Unknown', 'Brand | Tagline', 'domain.com')).toBe('Brand');

      // AI invalid, title invalid, domain valid
      expect(buildBrandName('N/A', '', 'https://example.com')).toBe('example');
    });

    it('should strip TLD from title-derived names', () => {
      const result = buildBrandName(
        undefined,
        'thrivesyracuse.com',
        'https://thrivesyracuse.com'
      );
      expect(result).toBe('thrivesyracuse');
    });

    it('should handle empty AI extraction', () => {
      const result = buildBrandName(
        '',
        'Brand Name | Site',
        'https://example.com'
      );
      expect(result).toBe('Brand Name');
    });
  });

  describe('calculateSectionCompleteness', () => {
    it('should return 0 for undefined object', () => {
      expect(calculateSectionCompleteness(undefined, ['field1', 'field2'])).toBe(0);
    });

    it('should return 0 when no fields are filled', () => {
      const obj = { field1: '', field2: null, field3: undefined };
      expect(calculateSectionCompleteness(obj, ['field1', 'field2', 'field3'])).toBe(0);
    });

    it('should return 100 when all fields are filled', () => {
      const obj = { field1: 'value', field2: 'value', field3: 'value' };
      expect(calculateSectionCompleteness(obj, ['field1', 'field2', 'field3'])).toBe(100);
    });

    it('should calculate percentage for partially filled', () => {
      const obj = { field1: 'value', field2: '', field3: 'value', field4: null };
      expect(calculateSectionCompleteness(obj, ['field1', 'field2', 'field3', 'field4'])).toBe(50);
    });

    it('should handle nested fields', () => {
      const obj = {
        colors: {
          primary: { hex: '#000000' },
          secondary: { hex: '' },
        },
        fonts: {
          heading: 'Inter',
        },
      };
      const fields = ['colors.primary.hex', 'colors.secondary.hex', 'fonts.heading'];
      expect(calculateSectionCompleteness(obj, fields)).toBe(67); // 2 of 3
    });

    it('should consider arrays', () => {
      const obj = {
        list1: ['item1', 'item2'],
        list2: [],
        list3: ['item'],
      };
      const fields = ['list1', 'list2', 'list3'];
      expect(calculateSectionCompleteness(obj, fields)).toBe(67); // 2 of 3
    });

    it('should consider objects', () => {
      const obj = {
        obj1: { key: 'value' },
        obj2: {},
        obj3: { nested: { deep: 'value' } },
      };
      const fields = ['obj1', 'obj2', 'obj3'];
      expect(calculateSectionCompleteness(obj, fields)).toBe(67); // 2 of 3
    });

    it('should round to nearest integer', () => {
      const obj = { f1: 'v', f2: '', f3: 'v' };
      expect(calculateSectionCompleteness(obj, ['f1', 'f2', 'f3'])).toBe(67); // 66.666... rounded
    });

    it('should handle missing nested paths', () => {
      const obj = { colors: { primary: 'red' } };
      const fields = ['colors.primary', 'colors.secondary.hex', 'typography.heading'];
      expect(calculateSectionCompleteness(obj, fields)).toBe(33); // 1 of 3
    });
  });
});
