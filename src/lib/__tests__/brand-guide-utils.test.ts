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
  buildOrganizationDescriptor,
  inferBusinessModelFromText,
  inferOrganizationTypeFromText,
  isRetailCannabisOrganization,
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

// ---------------------------------------------------------------------------
// organization context inference
// ---------------------------------------------------------------------------

describe('inferOrganizationTypeFromText', () => {
  it('detects technology platforms', () => {
    expect(inferOrganizationTypeFromText('AI CRM and cannabis automation platform')).toBe('technology_platform');
  });

  it('detects service organizations', () => {
    expect(inferOrganizationTypeFromText('Cannabis consulting and managed services')).toBe('agency_service');
  });

  it('detects community organizations', () => {
    expect(inferOrganizationTypeFromText('Social equity coalition and advocacy program')).toBe('community_organization');
  });

  it('detects dispensaries', () => {
    expect(inferOrganizationTypeFromText('Adult-use dispensary with delivery menu')).toBe('dispensary');
  });
});

describe('inferBusinessModelFromText', () => {
  it('detects SaaS / AI platforms', () => {
    expect(inferBusinessModelFromText('Subscription cannabis analytics dashboard')).toBe('saas_ai_platform');
  });

  it('falls back from organization type', () => {
    expect(inferBusinessModelFromText(undefined, 'technology_platform')).toBe('saas_ai_platform');
    expect(inferBusinessModelFromText(undefined, 'cannabis_brand')).toBe('product_brand');
  });
});

describe('buildOrganizationDescriptor', () => {
  it('builds dispensary descriptors with location', () => {
    expect(buildOrganizationDescriptor({
      organizationType: 'dispensary',
      dispensaryType: 'medical',
      city: 'Chicago',
      state: 'Illinois',
    })).toBe('medical dispensary in Chicago, Illinois');
  });

  it('builds startup/company descriptors', () => {
    expect(buildOrganizationDescriptor({
      organizationType: 'technology_platform',
      businessModel: 'saas_ai_platform',
      city: 'Chicago',
      state: 'Illinois',
    })).toBe('Technology Platform - SaaS / AI Platform in Chicago, Illinois');
  });
});

describe('isRetailCannabisOrganization', () => {
  it('returns true for dispensaries and cannabis brands', () => {
    expect(isRetailCannabisOrganization('dispensary')).toBe(true);
    expect(isRetailCannabisOrganization('cannabis_brand')).toBe(true);
  });

  it('returns false for technology companies without dispensary type', () => {
    expect(isRetailCannabisOrganization('technology_platform')).toBe(false);
  });

  it('treats legacy dispensaryType as retail', () => {
    expect(isRetailCannabisOrganization(undefined, 'medical')).toBe(true);
  });
});
