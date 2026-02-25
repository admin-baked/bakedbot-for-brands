// tests/intent-profile.test.ts
// Unit tests for the Dispensary Intent Profile Framework (DIPF) — Phase 1 + Phase 2

import {
  getDefaultProfile,
  buildSmokeyIntentBlock,
  buildCraigIntentBlock,
  buildPopsIntentBlock,
  buildEzalIntentBlock,
  buildMoneyMikeIntentBlock,
  buildMrsParkerIntentBlock,
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
    expect(getDefaultProfile('medical_focus', 'org_test').isDefault).toBe(true);
    expect(getDefaultProfile('lifestyle_brand', 'org_test').isDefault).toBe(true);
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

  // Phase 2: medical_focus has full own defaults (not community_hub fallback)
  test('medical_focus has own defaults — archetype is correct', () => {
    const p = getDefaultProfile('medical_focus', 'org_test');
    expect(p.strategicFoundation.archetype).toBe('medical_focus');
  });

  test('medical_focus: craig toneArchetype is sage (not hero)', () => {
    const p = getDefaultProfile('medical_focus', 'org_test');
    expect(p.agentConfigs.craig.toneArchetype).toBe('sage');
  });

  test('medical_focus: complianceConservatism is 0.9', () => {
    const p = getDefaultProfile('medical_focus', 'org_test');
    expect(p.valueHierarchies.complianceConservatism).toBe(0.9);
  });

  test('medical_focus: speedVsEducation is 0.9', () => {
    const p = getDefaultProfile('medical_focus', 'org_test');
    expect(p.valueHierarchies.speedVsEducation).toBe(0.9);
  });

  test('medical_focus: smokey upsellAggressiveness is 0.1', () => {
    const p = getDefaultProfile('medical_focus', 'org_test');
    expect(p.agentConfigs.smokey.upsellAggressiveness).toBe(0.1);
  });

  test('medical_focus: acquisitionVsRetention is 0.8 (retention-first)', () => {
    const p = getDefaultProfile('medical_focus', 'org_test');
    expect(p.valueHierarchies.acquisitionVsRetention).toBe(0.8);
  });

  // Phase 2: lifestyle_brand has full own defaults
  test('lifestyle_brand has own defaults — archetype is correct', () => {
    const p = getDefaultProfile('lifestyle_brand', 'org_test');
    expect(p.strategicFoundation.archetype).toBe('lifestyle_brand');
  });

  test('lifestyle_brand: craig toneArchetype is rebel', () => {
    const p = getDefaultProfile('lifestyle_brand', 'org_test');
    expect(p.agentConfigs.craig.toneArchetype).toBe('rebel');
  });

  test('lifestyle_brand: brandVoiceFormality is 0.1', () => {
    const p = getDefaultProfile('lifestyle_brand', 'org_test');
    expect(p.valueHierarchies.brandVoiceFormality).toBe(0.1);
  });

  test('lifestyle_brand: smokey newUserProtocol is discover', () => {
    const p = getDefaultProfile('lifestyle_brand', 'org_test');
    expect(p.agentConfigs.smokey.newUserProtocol).toBe('discover');
  });

  test('lifestyle_brand: acquisitionVsRetention is 0.3 (acquisition-first)', () => {
    const p = getDefaultProfile('lifestyle_brand', 'org_test');
    expect(p.valueHierarchies.acquisitionVsRetention).toBe(0.3);
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

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: buildPopsIntentBlock tests
// ─────────────────────────────────────────────────────────────────────────────

describe('buildPopsIntentBlock', () => {
  test('contains section header', () => {
    const block = buildPopsIntentBlock(buildFullProfile());
    expect(block).toContain('=== DISPENSARY INTENT PROFILE ===');
    expect(block).toContain('=== END INTENT PROFILE ===');
  });

  test('contains ANALYTICS PRIORITIES section', () => {
    const block = buildPopsIntentBlock(buildFullProfile());
    expect(block).toContain('ANALYTICS PRIORITIES:');
  });

  test('contains BUSINESS FOCUS section', () => {
    const block = buildPopsIntentBlock(buildFullProfile());
    expect(block).toContain('BUSINESS FOCUS:');
  });

  test('contains archetype label', () => {
    const block = buildPopsIntentBlock(getDefaultProfile('value_leader', 'org_test'));
    expect(block).toContain('Value Leader');
  });

  test('premium_boutique: Margin-first for volumeVsMargin 0.7', () => {
    const block = buildPopsIntentBlock(getDefaultProfile('premium_boutique', 'org_test'));
    expect(block).toContain('Margin-first');
  });

  test('value_leader: Volume-first for volumeVsMargin 0.2', () => {
    const block = buildPopsIntentBlock(getDefaultProfile('value_leader', 'org_test'));
    expect(block).toContain('Volume-first');
  });

  test('medical_focus: Retention-first for acquisitionVsRetention 0.8', () => {
    const block = buildPopsIntentBlock(getDefaultProfile('medical_focus', 'org_test'));
    expect(block).toContain('Retention-first');
  });

  test('lifestyle_brand: Acquisition-first for acquisitionVsRetention 0.3', () => {
    const block = buildPopsIntentBlock(getDefaultProfile('lifestyle_brand', 'org_test'));
    expect(block).toContain('Acquisition-first');
  });

  test('contains weighted objective with percentage', () => {
    const block = buildPopsIntentBlock(buildFullProfile());
    expect(block).toContain('%');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: buildEzalIntentBlock tests
// ─────────────────────────────────────────────────────────────────────────────

describe('buildEzalIntentBlock', () => {
  test('contains section header', () => {
    const block = buildEzalIntentBlock(buildFullProfile());
    expect(block).toContain('=== DISPENSARY INTENT PROFILE ===');
    expect(block).toContain('=== END INTENT PROFILE ===');
  });

  test('contains COMPETITIVE STANCE section', () => {
    const block = buildEzalIntentBlock(buildFullProfile());
    expect(block).toContain('COMPETITIVE STANCE:');
  });

  test('contains COMPLIANCE POSTURE section', () => {
    const block = buildEzalIntentBlock(buildFullProfile());
    expect(block).toContain('COMPLIANCE POSTURE:');
  });

  test('contains TOP BUSINESS GOALS section', () => {
    const block = buildEzalIntentBlock(buildFullProfile());
    expect(block).toContain('TOP BUSINESS GOALS:');
  });

  test('value_leader: aggressive posture', () => {
    const block = buildEzalIntentBlock(getDefaultProfile('value_leader', 'org_test'));
    expect(block).toContain('Aggressive');
  });

  test('community_hub: defensive posture', () => {
    const block = buildEzalIntentBlock(getDefaultProfile('community_hub', 'org_test'));
    expect(block).toContain('Defensive');
  });

  test('premium_boutique: differentiator posture', () => {
    const block = buildEzalIntentBlock(getDefaultProfile('premium_boutique', 'org_test'));
    expect(block).toContain('Differentiator');
  });

  test('shows only top 2 objectives — third excluded', () => {
    // premium_boutique: #1 boost_average_order_value, #2 build_brand_authority, #3 improve_retention
    const block = buildEzalIntentBlock(getDefaultProfile('premium_boutique', 'org_test'));
    expect(block).toContain('Boost Average Order Value');
    expect(block).toContain('Build Brand Authority');
    expect(block).not.toContain('Improve Customer Retention');
  });

  test('medical_focus: Conservative compliance posture', () => {
    const block = buildEzalIntentBlock(getDefaultProfile('medical_focus', 'org_test'));
    expect(block).toContain('Conservative');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: buildMoneyMikeIntentBlock tests
// ─────────────────────────────────────────────────────────────────────────────

describe('buildMoneyMikeIntentBlock', () => {
  test('contains section header', () => {
    const block = buildMoneyMikeIntentBlock(buildFullProfile());
    expect(block).toContain('=== DISPENSARY INTENT PROFILE ===');
    expect(block).toContain('=== END INTENT PROFILE ===');
  });

  test('contains FINANCIAL PRIORITIES section', () => {
    const block = buildMoneyMikeIntentBlock(buildFullProfile());
    expect(block).toContain('FINANCIAL PRIORITIES:');
  });

  test('contains PRICING PHILOSOPHY section', () => {
    const block = buildMoneyMikeIntentBlock(buildFullProfile());
    expect(block).toContain('PRICING PHILOSOPHY:');
  });

  test('contains COMPLIANCE POSTURE section', () => {
    const block = buildMoneyMikeIntentBlock(buildFullProfile());
    expect(block).toContain('COMPLIANCE POSTURE:');
  });

  test('premium_boutique: Margin-first for volumeVsMargin 0.7', () => {
    const block = buildMoneyMikeIntentBlock(getDefaultProfile('premium_boutique', 'org_test'));
    expect(block).toContain('Margin-first');
  });

  test('value_leader: Volume-first for volumeVsMargin 0.2', () => {
    const block = buildMoneyMikeIntentBlock(getDefaultProfile('value_leader', 'org_test'));
    expect(block).toContain('Volume-first');
  });

  test('community_hub: Volume-first for volumeVsMargin 0.3', () => {
    const block = buildMoneyMikeIntentBlock(getDefaultProfile('community_hub', 'org_test'));
    expect(block).toContain('Volume-first');
  });

  test('contains archetype label', () => {
    const block = buildMoneyMikeIntentBlock(getDefaultProfile('premium_boutique', 'org_test'));
    expect(block).toContain('Premium Boutique');
  });

  test('contains weighted objective with percentage', () => {
    const block = buildMoneyMikeIntentBlock(buildFullProfile());
    expect(block).toContain('%');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: buildMrsParkerIntentBlock tests
// ─────────────────────────────────────────────────────────────────────────────

describe('buildMrsParkerIntentBlock', () => {
  test('contains section header', () => {
    const block = buildMrsParkerIntentBlock(buildFullProfile());
    expect(block).toContain('=== DISPENSARY INTENT PROFILE ===');
    expect(block).toContain('=== END INTENT PROFILE ===');
  });

  test('contains RETENTION PRIORITIES section', () => {
    const block = buildMrsParkerIntentBlock(buildFullProfile());
    expect(block).toContain('RETENTION PRIORITIES:');
  });

  test('contains CUSTOMER STRATEGY section', () => {
    const block = buildMrsParkerIntentBlock(buildFullProfile());
    expect(block).toContain('CUSTOMER STRATEGY:');
  });

  test('contains ENGAGEMENT STYLE section', () => {
    const block = buildMrsParkerIntentBlock(buildFullProfile());
    expect(block).toContain('ENGAGEMENT STYLE:');
  });

  test('contains VOICE section', () => {
    const block = buildMrsParkerIntentBlock(buildFullProfile());
    expect(block).toContain('VOICE:');
  });

  test('medical_focus: Retention-first for acquisitionVsRetention 0.8', () => {
    const block = buildMrsParkerIntentBlock(getDefaultProfile('medical_focus', 'org_test'));
    expect(block).toContain('Retention-first');
  });

  test('medical_focus: Human-in-the-loop for automationVsHumanTouch 0.9', () => {
    const block = buildMrsParkerIntentBlock(getDefaultProfile('medical_focus', 'org_test'));
    expect(block).toContain('Human-in-the-loop');
  });

  test('medical_focus: Clinical and formal for brandVoiceFormality 0.8', () => {
    const block = buildMrsParkerIntentBlock(getDefaultProfile('medical_focus', 'org_test'));
    expect(block).toContain('Clinical and formal');
  });

  test('lifestyle_brand: Acquisition-first for acquisitionVsRetention 0.3', () => {
    const block = buildMrsParkerIntentBlock(getDefaultProfile('lifestyle_brand', 'org_test'));
    expect(block).toContain('Acquisition-first');
  });

  test('lifestyle_brand: Casual and conversational for brandVoiceFormality 0.1', () => {
    const block = buildMrsParkerIntentBlock(getDefaultProfile('lifestyle_brand', 'org_test'));
    expect(block).toContain('Casual and conversational');
  });

  test('premium_boutique: Balanced customer strategy for acquisitionVsRetention 0.6', () => {
    const block = buildMrsParkerIntentBlock(getDefaultProfile('premium_boutique', 'org_test'));
    expect(block).toContain('Balanced');
  });

  test('contains archetype label', () => {
    const block = buildMrsParkerIntentBlock(getDefaultProfile('community_hub', 'org_test'));
    expect(block).toContain('Community Hub');
  });
});
