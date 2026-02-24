/**
 * Brand Archetype Tests — Spec 01: Brand Archetype Selector
 *
 * 18 test cases covering:
 *   - suggestArchetype() heuristic scoring (color + keyword)
 *   - getVoiceDefaults() pure/blended computation
 *   - buildArchetypeBlock() agent prompt formatting
 *   - saveBrandArchetype() input validation
 */

import {
  BRAND_ARCHETYPES,
  suggestArchetype,
  getVoiceDefaults,
  getArchetypeById,
  type ArchetypeId,
} from '@/constants/brand-archetypes';
import { buildArchetypeBlock, buildBrandVoiceBrief } from '@/lib/brand-guide-prompt';
import type { BrandGuide } from '@/types/brand-guide';
import { Timestamp } from '@google-cloud/firestore';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ARCHETYPE_IDS: ArchetypeId[] = [
  'wellness_caregiver',
  'explorer_adventure',
  'rebel_streetwear',
  'artisan_craft',
  'premium_luxury',
  'community_heritage',
];

function makeBrandGuide(overrides: Partial<BrandGuide> = {}): BrandGuide {
  return {
    brandId: 'test-brand',
    brandName: 'Test Dispensary',
    status: 'draft',
    version: 1,
    visualIdentity: {
      logo: { primary: '' },
      colors: { primary: { hex: '#4ade80', name: 'Green', usage: 'Primary' }, secondary: { hex: '#111', name: 'Dark', usage: 'Text' }, accent: { hex: '#fff', name: 'White', usage: 'BG' }, text: { hex: '#222', name: 'Text', usage: 'Body' }, background: { hex: '#fff', name: 'BG', usage: 'BG' } },
      typography: { headingFont: { family: 'Inter', weights: [700], source: 'google' }, bodyFont: { family: 'Inter', weights: [400], source: 'google' } },
    },
    voice: { personality: [], tone: 'professional', writingStyle: { sentenceLength: 'medium', paragraphLength: 'moderate', useEmojis: false, useExclamation: false, useQuestions: true, useHumor: false, formalityLevel: 3, complexity: 'moderate', perspective: 'second-person' }, vocabulary: { preferred: [], avoid: [], cannabisTerms: [] }, sampleContent: [] },
    messaging: { brandName: 'Test Dispensary', tagline: '', positioning: '', valuePropositions: [] },
    source: { method: 'manual', extractedAt: new Date(), extractionConfidence: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as BrandGuide;
}

// ---------------------------------------------------------------------------
// Tests: BRAND_ARCHETYPES constant structure
// ---------------------------------------------------------------------------

describe('BRAND_ARCHETYPES constant', () => {
  test('TC-01: contains exactly 6 archetypes', () => {
    expect(Object.keys(BRAND_ARCHETYPES)).toHaveLength(6);
  });

  test('TC-02: each archetype has all required fields', () => {
    for (const [id, archetype] of Object.entries(BRAND_ARCHETYPES)) {
      expect(archetype).toMatchObject({
        id,
        label: expect.any(String),
        shortLabel: expect.any(String),
        description: expect.any(String),
        icon: expect.any(String),
        color: expect.stringMatching(/^#[0-9a-fA-F]{6}$/),
        brandExamples: expect.any(Array),
        voiceDefaults: expect.objectContaining({
          formality: expect.any(Number),
          education: expect.any(Number),
          energy: expect.any(Number),
          boldness: expect.any(Number),
          community: expect.any(Number),
        }),
        smokeySample: expect.any(String),
        craigSubjectSample: expect.any(String),
      });
    }
  });

  test('TC-03: all voice defaults are integers 1-5', () => {
    for (const archetype of Object.values(BRAND_ARCHETYPES)) {
      for (const val of Object.values(archetype.voiceDefaults)) {
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(5);
        expect(Number.isInteger(val)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: getArchetypeById()
// ---------------------------------------------------------------------------

describe('getArchetypeById()', () => {
  test('TC-04: returns correct archetype for valid ID', () => {
    const result = getArchetypeById('rebel_streetwear');
    expect(result?.id).toBe('rebel_streetwear');
    expect(result?.label).toBe('Rebel & Streetwear');
  });

  test('TC-05: returns null for invalid ID', () => {
    expect(getArchetypeById('nonexistent')).toBeNull();
    expect(getArchetypeById('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: getVoiceDefaults()
// ---------------------------------------------------------------------------

describe('getVoiceDefaults()', () => {
  test('TC-06: returns a 5-element tuple for primary-only', () => {
    const result = getVoiceDefaults('wellness_caregiver');
    expect(result).toHaveLength(5);
    // wellness_caregiver defaults: formality=4, education=5, energy=2, boldness=2, community=3
    expect(result).toEqual([4, 5, 2, 2, 3]);
  });

  test('TC-07: blends 70/30 when secondary provided', () => {
    // rebel_streetwear: formality=1, education=2, energy=5, boldness=5, community=3
    // wellness_caregiver: formality=4, education=5, energy=2, boldness=2, community=3
    // Blend: primary=rebel(70%) + secondary=wellness(30%)
    // formality: round(1*0.7 + 4*0.3) = round(0.7 + 1.2) = round(1.9) = 2
    // education: round(2*0.7 + 5*0.3) = round(1.4 + 1.5) = round(2.9) = 3
    // energy: round(5*0.7 + 2*0.3) = round(3.5 + 0.6) = round(4.1) = 4
    // boldness: round(5*0.7 + 2*0.3) = round(3.5 + 0.6) = round(4.1) = 4
    // community: round(3*0.7 + 3*0.3) = round(2.1 + 0.9) = round(3.0) = 3
    const result = getVoiceDefaults('rebel_streetwear', 'wellness_caregiver');
    expect(result).toEqual([2, 3, 4, 4, 3]);
  });

  test('TC-08: ignores invalid secondary (returns primary defaults)', () => {
    const primary = getVoiceDefaults('artisan_craft');
    const withInvalidSecondary = getVoiceDefaults('artisan_craft', 'nonexistent_id' as ArchetypeId);
    expect(withInvalidSecondary).toEqual(primary);
  });

  test('TC-09: all returned values are integers 1-5', () => {
    for (const primary of ARCHETYPE_IDS) {
      for (const secondary of ARCHETYPE_IDS) {
        if (primary !== secondary) {
          const result = getVoiceDefaults(primary, secondary);
          for (const val of result) {
            expect(val).toBeGreaterThanOrEqual(1);
            expect(val).toBeLessThanOrEqual(5);
            expect(Number.isInteger(val)).toBe(true);
          }
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: suggestArchetype()
// ---------------------------------------------------------------------------

describe('suggestArchetype()', () => {
  test('TC-10: keywords "wellness health medical" → wellness_caregiver', () => {
    const result = suggestArchetype({ heroText: 'Your health and wellness journey starts here' });
    expect(result).toBe('wellness_caregiver');
  });

  test('TC-11: keywords "exclusive luxury reserve" → premium_luxury', () => {
    const result = suggestArchetype({ heroText: 'Exclusive luxury reserve collection' });
    expect(result).toBe('premium_luxury');
  });

  test('TC-12: dark color (lightness<25) → premium_luxury', () => {
    // HSL of #111111 ≈ hue=0, lightness~7%
    const result = suggestArchetype({ dominantColor: { hue: 0, lightness: 7 } });
    expect(result).toBe('premium_luxury');
  });

  test('TC-13: green color (hue 80-160) → wellness_caregiver', () => {
    // Pure green hue=120, lightness=50 → wellness_caregiver
    const result = suggestArchetype({ dominantColor: { hue: 120, lightness: 50 } });
    expect(result).toBe('wellness_caregiver');
  });

  test('TC-14: community keywords → community_heritage', () => {
    const result = suggestArchetype({ heroText: 'Community-first, equity-driven, local neighborhood dispensary' });
    expect(result).toBe('community_heritage');
  });

  test('TC-15: returns a valid ArchetypeId for empty input', () => {
    const result = suggestArchetype({});
    expect(ARCHETYPE_IDS).toContain(result);
  });

  test('TC-16: returns a valid ArchetypeId for any combination', () => {
    const testCases = [
      { dominantColor: { hue: 30, lightness: 50 } },
      { heroText: 'explore nature adventure wild journey outdoor' },
      { heroText: 'craft artisan curated small-batch quality handcrafted' },
      { dominantColor: { hue: 240, lightness: 40 }, heroText: 'family community' },
    ];
    for (const input of testCases) {
      const result = suggestArchetype(input);
      expect(ARCHETYPE_IDS).toContain(result);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: buildArchetypeBlock()
// ---------------------------------------------------------------------------

describe('buildArchetypeBlock()', () => {
  test('TC-17: returns empty string when no archetype set', () => {
    const guide = makeBrandGuide();
    expect(buildArchetypeBlock(guide)).toBe('');
    expect(buildArchetypeBlock(null)).toBe('');
    expect(buildArchetypeBlock(undefined)).toBe('');
  });

  test('TC-17b: includes [BRAND ARCHETYPE] header', () => {
    const guide = makeBrandGuide({
      archetype: {
        primary: 'wellness_caregiver',
        secondary: null,
        selected_at: Timestamp.now(),
        suggested_by_scanner: null,
      },
    });
    const block = buildArchetypeBlock(guide);
    expect(block).toContain('[BRAND ARCHETYPE]');
    expect(block).toContain('Wellness & Caregiver');
    expect(block).toContain('🌿');
  });

  test('TC-17c: includes secondary when provided', () => {
    const guide = makeBrandGuide({
      archetype: {
        primary: 'rebel_streetwear',
        secondary: 'artisan_craft',
        selected_at: Timestamp.now(),
        suggested_by_scanner: null,
      },
    });
    const block = buildArchetypeBlock(guide);
    expect(block).toContain('Rebel & Streetwear');
    expect(block).toContain('Artisan & Craft');
    expect(block).toContain('30% blend');
  });

  test('TC-17d: includes Smokey greeting style sample', () => {
    const guide = makeBrandGuide({
      archetype: {
        primary: 'premium_luxury',
        secondary: null,
        selected_at: Timestamp.now(),
        suggested_by_scanner: null,
      },
    });
    const block = buildArchetypeBlock(guide);
    expect(block).toContain('Smokey greeting style');
    expect(block).toContain('Welcome to');
  });

  test('TC-18: buildBrandVoiceBrief includes archetype block when archetype is set', () => {
    const guide = makeBrandGuide({
      archetype: {
        primary: 'community_heritage',
        secondary: null,
        selected_at: Timestamp.now(),
        suggested_by_scanner: null,
      },
    });
    const brief = buildBrandVoiceBrief(guide);
    expect(brief).toContain('Community & Heritage');
    expect(brief).toContain('🤝');
  });
});
