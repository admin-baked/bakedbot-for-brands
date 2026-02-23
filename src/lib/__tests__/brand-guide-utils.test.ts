/**
 * Unit tests for brand-guide-utils
 *
 * Covers the AI placeholder filtering, TLD stripping, and brand name
 * extraction functions introduced/updated in the Feb 2026 bug fixes.
 */

import {
  cleanExtractedValue,
  stripTldSuffix,
  extractBrandNameFromTitle,
  extractBrandNameFromDomain,
  buildBrandName,
} from '../brand-guide-utils';

// ---------------------------------------------------------------------------
// cleanExtractedValue
// ---------------------------------------------------------------------------

describe('cleanExtractedValue', () => {
  describe('returns empty string for falsy input', () => {
    it('handles undefined', () => expect(cleanExtractedValue(undefined)).toBe(''));
    it('handles empty string', () => expect(cleanExtractedValue('')).toBe(''));
  });

  describe('filters original AI placeholder patterns', () => {
    it('filters "unknown"', () => expect(cleanExtractedValue('Unknown')).toBe(''));
    it('filters "unable to extract"', () =>
      expect(cleanExtractedValue('Unable to extract brand name')).toBe(''));
    it('filters "n/a"', () => expect(cleanExtractedValue('N/A')).toBe(''));
    it('filters "not found"', () => expect(cleanExtractedValue('Not found')).toBe(''));
    it('filters "not available"', () => expect(cleanExtractedValue('Not available')).toBe(''));
    it('filters "insufficient"', () =>
      expect(cleanExtractedValue('Insufficient data to determine')).toBe(''));
    it('filters "no content"', () => expect(cleanExtractedValue('No content')).toBe(''));
  });

  describe('filters cannabis-specific AI placeholder patterns (Feb 2026 fix)', () => {
    it('filters "Cannabis Brand"', () =>
      expect(cleanExtractedValue('Cannabis Brand')).toBe(''));
    it('filters "cannabis brand" (lowercase)', () =>
      expect(cleanExtractedValue('cannabis brand')).toBe(''));
    it('filters "Dispensary Name"', () =>
      expect(cleanExtractedValue('Dispensary Name')).toBe(''));
    it('filters "Brand Name"', () =>
      expect(cleanExtractedValue('Brand Name')).toBe(''));
    it('filters "Your Brand"', () =>
      expect(cleanExtractedValue('Your Brand')).toBe(''));
    it('filters "Company Name"', () =>
      expect(cleanExtractedValue('Company Name')).toBe(''));
    it('filters mixed-case variants', () =>
      expect(cleanExtractedValue('CANNABIS BRAND')).toBe(''));
    it('filters placeholder embedded in sentence', () =>
      expect(cleanExtractedValue('This is a cannabis brand')).toBe(''));
  });

  describe('passes through valid brand names', () => {
    it('keeps "Thrive Syracuse"', () =>
      expect(cleanExtractedValue('Thrive Syracuse')).toBe('Thrive Syracuse'));
    it('keeps "Green Thumb"', () =>
      expect(cleanExtractedValue('Green Thumb')).toBe('Green Thumb'));
    it('keeps short names', () =>
      expect(cleanExtractedValue('Sira')).toBe('Sira'));
    it('keeps names with numbers', () =>
      expect(cleanExtractedValue('420 Dispensary')).toBe('420 Dispensary'));
  });
});

// ---------------------------------------------------------------------------
// stripTldSuffix
// ---------------------------------------------------------------------------

describe('stripTldSuffix', () => {
  it('strips .com', () => expect(stripTldSuffix('thrivesyracuse.com')).toBe('thrivesyracuse'));
  it('strips .net', () => expect(stripTldSuffix('greenleaf.net')).toBe('greenleaf'));
  it('strips .org', () => expect(stripTldSuffix('cannabis.org')).toBe('cannabis'));
  it('strips .io', () => expect(stripTldSuffix('bakedbot.io')).toBe('bakedbot'));
  it('strips .co', () => expect(stripTldSuffix('brand.co')).toBe('brand'));
  it('strips .ca', () => expect(stripTldSuffix('dispensary.ca')).toBe('dispensary'));
  it('does not strip non-TLD patterns', () =>
    expect(stripTldSuffix('Thrive Syracuse')).toBe('Thrive Syracuse'));
  it('handles empty string', () => expect(stripTldSuffix('')).toBe(''));
});

// ---------------------------------------------------------------------------
// extractBrandNameFromTitle
// ---------------------------------------------------------------------------

describe('extractBrandNameFromTitle', () => {
  it('extracts brand before pipe separator', () =>
    expect(extractBrandNameFromTitle('Thrive Syracuse | Cannabis Dispensary')).toBe(
      'Thrive Syracuse'
    ));
  it('extracts brand before dash separator', () =>
    expect(extractBrandNameFromTitle('Green Thumb - Best Dispensary')).toBe('Green Thumb'));
  it('extracts brand before em-dash', () =>
    expect(extractBrandNameFromTitle('Herbal Care – Your Wellness Store')).toBe('Herbal Care'));
  it('strips TLD from domain-style titles', () =>
    expect(extractBrandNameFromTitle('thrivesyracuse.com')).toBe('thrivesyracuse'));
  it('handles undefined', () => expect(extractBrandNameFromTitle(undefined)).toBe(''));
  it('returns plain title unchanged if no separator', () =>
    expect(extractBrandNameFromTitle('Thrive Syracuse')).toBe('Thrive Syracuse'));
});

// ---------------------------------------------------------------------------
// extractBrandNameFromDomain
// ---------------------------------------------------------------------------

describe('extractBrandNameFromDomain', () => {
  it('extracts from https URL', () =>
    expect(extractBrandNameFromDomain('https://thrivesyracuse.com')).toBe('thrivesyracuse'));
  it('strips www prefix', () =>
    expect(extractBrandNameFromDomain('https://www.greenthumb.com')).toBe('greenthumb'));
  it('handles empty string', () => expect(extractBrandNameFromDomain('')).toBe(''));
  it('falls back gracefully on invalid URL', () =>
    expect(extractBrandNameFromDomain('not-a-url')).toBe('not-a-url'));
});

// ---------------------------------------------------------------------------
// buildBrandName — fallback chain
// ---------------------------------------------------------------------------

describe('buildBrandName', () => {
  it('uses AI-extracted name when clean', () =>
    expect(
      buildBrandName('Thrive Syracuse', 'Thrive | Dispensary', 'https://thrivesyracuse.com')
    ).toBe('Thrive Syracuse'));

  it('falls back to title-derived when AI returns placeholder', () =>
    expect(
      buildBrandName('Cannabis Brand', 'Thrive Syracuse | Dispensary', 'https://thrivesyracuse.com')
    ).toBe('Thrive Syracuse'));

  it('falls back to domain when AI and title both fail', () =>
    expect(
      buildBrandName('Brand Name', undefined, 'https://thrivesyracuse.com')
    ).toBe('thrivesyracuse'));

  it('falls back to domain when AI is undefined and no title', () =>
    expect(buildBrandName(undefined, undefined, 'https://greenthumb.com')).toBe('greenthumb'));

  it('does NOT return "Cannabis Brand" for any input (regression test)', () => {
    const result = buildBrandName('Cannabis Brand', undefined, 'https://thrivesyracuse.com');
    expect(result).not.toBe('Cannabis Brand');
    expect(result).toBe('thrivesyracuse');
  });
});
