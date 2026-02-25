// tests/intent-profile.test.ts
// Unit tests for the Dispensary Intent Profile Framework (DIPF) — Phase 1

import {
  getDefaultProfile,
  buildSmokeyIntentBlock,
  buildCraigIntentBlock,
  calculateCompletionPct,
} from '../src/server/services/intent-profile';
import type { DispensaryIntentProfile } from '../src/types/dispensary-intent-profile';

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildFullProfile(): DispensaryIntentProfile {
  return getDefaultProfile('premium_boutique', 'org_test');
}

function buildProfileWithBoundaries(): DispensaryIntentProfile {
  const p = buildFullProfile();
  p.hardBoundaries = {
    neverDoList: ['Never compare prices to competitors by name'],
    escalationTriggers: ['Customer mentions a medical emergency'],
  };
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default profile tests
// ─────────────────────────────────────────────────────────────────────────────

describe('getDefaultProfile', () => {
  test('premium_boutique: speedVsEducation is 0.8', () => {
    const p = getDefaultProfile('premium_boutique', 'org_test');
    expect(p.valueHierarchies.speedVsEducation).toBe(0.8);
  });

  test('premium_boutique: smokey recommendationPhilosophy is chemistry_first', () => {
    const p = getDefaultProfile('premium_boutique', 'org_test');
    expect(p.agentConfigs.smokey.recommendationPhilosophy).toBe('chemistry_first');
  });

  test('premium_boutique: smokey productEducationDepth is comprehensive', () => {
    const p = getDefaultProfile('premium_boutique', 'org_test');
    expect(p.agentConfigs.smokey.productEducationDepth).toBe('comprehensive');
  });

  test('premium_boutique: craig toneArchetype is sage', () => {
    const p = getDefaultProfile('premium_boutique', 'org_test');
    expect(p.agentConfigs.craig.toneArchetype).toBe('sage');
  });

  test('value_leader: smokey productEducationDepth is minimal', () => {
    const p = getDefaultProfile('value_leader', 'org_test');
    expect(p.agentConfigs.smokey.productEducationDepth).toBe('minimal');
  });

  test('value_leader: speedVsEducation is 0.2', () => {
    const p = getDefaultProfile('value_leader', 'org_test');
    expect(p.valueHierarchies.speedVsEducation).toBe(0.2);
  });

  test('community_hub: craig toneArchetype is hero', () => {
    const p = getDefaultProfile('community_hub', 'org_test');
    expect(p.agentConfigs.craig.toneArchetype).toBe('hero');
  });

  test('community_hub: craig preferredChannels includes sms and email', () => {
    const p = getDefaultProfile('community_hub', 'org_test');
    expect(p.agentConfigs.craig.preferredChannels).toContain('sms');
    expect(p.agentConfigs.craig.preferredChannels).toContain('email');
  });

  test('isDefault is true for all archetype defaults', () => {
    expect(getDefaultProfile('premium_boutique', 'org_test').isDefault).toBe(true);
    expect(getDefaultProfile('value_leader', 'org_test').isDefault).toBe(true);
    expect(getDefaultProfile('community_hub', 'org_test').isDefault).toBe(true);
  });

  test('version is 1.0.0', () => {
    const p = getDefaultProfile('premium_boutique', 'org_test');
    expect(p.version).toBe('1.0.0');
  });

  test('orgId is passed through correctly', () => {
    const p = getDefaultProfile('premium_boutique', 'org_thrive_syracuse');
    expect(p.orgId).toBe('org_thrive_syracuse');
    expect(p.id).toBe('org_thrive_syracuse');
  });

  test('medical_focus falls back to community_hub defaults with archetype override', () => {
    const p = getDefaultProfile('medical_focus', 'org_test');
    expect(p.strategicFoundation.archetype).toBe('medical_focus');
    // Should have community_hub values as fallback
    expect(p.agentConfigs.craig.toneArchetype).toBe('hero');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateCompletionPct tests
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateCompletionPct', () => {
  test('returns 0 for empty object', () => {
    expect(calculateCompletionPct({})).toBe(0);
  });

  test('returns 30 for strategic foundation only', () => {
    const profile: Partial<DispensaryIntentProfile> = {
      strategicFoundation: {
        archetype: 'premium_boutique',
        growthStage: 'established',
        competitivePosture: 'differentiator',
        geographicStrategy: 'hyperlocal',
        weightedObjectives: [{ objective: 'boost_average_order_value', weight: 1.0 }],
      },
    };
    expect(calculateCompletionPct(profile)).toBe(30);
  });

  test('returns 60 for strategic foundation + value hierarchies', () => {
    const p = getDefaultProfile('premium_boutique', 'org_test');
    const partial: Partial<DispensaryIntentProfile> = {
      strategicFoundation: p.strategicFoundation,
      valueHierarchies: p.valueHierarchies,
    };
    expect(calculateCompletionPct(partial)).toBe(60);
  });

  test('returns 100 for full profile from archetype default', () => {
    const p = buildFullProfile();
    // Add hard boundaries to make it 100%
    p.hardBoundaries = { neverDoList: [], escalationTriggers: [] };
    expect(calculateCompletionPct(p)).toBe(100);
  });

  test('strategic foundation missing archetype scores 0 for that section', () => {
    const p: Partial<DispensaryIntentProfile> = {
      strategicFoundation: {
        archetype: undefined as unknown as 'premium_boutique',
        growthStage: 'growth',
        competitivePosture: 'aggressive',
        geographicStrategy: 'hyperlocal',
        weightedObjectives: [],
      },
    };
    expect(calculateCompletionPct(p)).toBe(0);
  });

  test('value hierarchies with missing field scores 0 for that section', () => {
    const p: Partial<DispensaryIntentProfile> = {
      valueHierarchies: {
        speedVsEducation: 0.5,
        volumeVsMargin: 0.5,
        // acquisitionVsRetention missing
      } as unknown as DispensaryIntentProfile['valueHierarchies'],
    };
    expect(calculateCompletionPct(p)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildSmokeyIntentBlock tests
// ─────────────────────────────────────────────────────────────────────────────

describe('buildSmokeyIntentBlock', () => {
  test('contains section header', () => {
    const block = buildSmokeyIntentBlock(buildFullProfile());
    expect(block).toContain('=== DISPENSARY INTENT PROFILE ===');
    expect(block).toContain('=== END INTENT PROFILE ===');
  });

  test('premium_boutique block contains chemistry_first', () => {
    const block = buildSmokeyIntentBlock(getDefaultProfile('premium_boutique', 'org_test'));
    expect(block).toContain('chemistry_first');
  });

  test('value_leader block contains price_first', () => {
    const block = buildSmokeyIntentBlock(getDefaultProfile('value_leader', 'org_test'));
    expect(block).toContain('price_first');
  });

  test('block contains archetype label', () => {
    const block = buildSmokeyIntentBlock(getDefaultProfile('premium_boutique', 'org_test'));
    expect(block).toContain('Premium Boutique');
  });

  test('block contains weighted objectives', () => {
    const block = buildSmokeyIntentBlock(getDefaultProfile('premium_boutique', 'org_test'));
    expect(block).toContain('TOP PRIORITIES:');
    expect(block).toContain('%');
  });

  test('block contains HARD BOUNDARIES when neverDoList is non-empty', () => {
    const block = buildSmokeyIntentBlock(buildProfileWithBoundaries());
    expect(block).toContain('HARD BOUNDARIES — NEVER DO:');
    expect(block).toContain('Never compare prices to competitors by name');
  });

  test('block does NOT contain HARD BOUNDARIES when neverDoList is empty', () => {
    const block = buildSmokeyIntentBlock(buildFullProfile());
    expect(block).not.toContain('HARD BOUNDARIES');
  });

  test('block contains ESCALATE TO HUMAN when escalationTriggers is non-empty', () => {
    const block = buildSmokeyIntentBlock(buildProfileWithBoundaries());
    expect(block).toContain('ESCALATE TO HUMAN WHEN:');
    expect(block).toContain('Customer mentions a medical emergency');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildCraigIntentBlock tests
// ─────────────────────────────────────────────────────────────────────────────

describe('buildCraigIntentBlock', () => {
  test('contains section header', () => {
    const block = buildCraigIntentBlock(buildFullProfile());
    expect(block).toContain('=== CAMPAIGN INTENT PROFILE ===');
    expect(block).toContain('=== END CAMPAIGN INTENT ===');
  });

  test('premium_boutique block contains education_led', () => {
    const block = buildCraigIntentBlock(getDefaultProfile('premium_boutique', 'org_test'));
    expect(block).toContain('education_led');
  });

  test('community_hub block contains hero', () => {
    const block = buildCraigIntentBlock(getDefaultProfile('community_hub', 'org_test'));
    expect(block).toContain('hero');
  });

  test('block contains preferred channels', () => {
    const block = buildCraigIntentBlock(getDefaultProfile('community_hub', 'org_test'));
    expect(block).toContain('sms');
    expect(block).toContain('email');
  });

  test('block contains HARD LIMITS when neverDoList is non-empty', () => {
    const block = buildCraigIntentBlock(buildProfileWithBoundaries());
    expect(block).toContain('HARD LIMITS — NEVER DO:');
  });

  test('value_leader block contains discount_led', () => {
    const block = buildCraigIntentBlock(getDefaultProfile('value_leader', 'org_test'));
    expect(block).toContain('discount_led');
  });
});
