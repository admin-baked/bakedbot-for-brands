/**
 * Knowledge Engine — Promotion Policy Tests
 *
 * Validates Letta auto-promotion eligibility logic.
 */

import { isEligibleForLettaPromotion } from '../promotion-policy';
import type { KnowledgeClaim } from '../types';
import { Timestamp } from 'firebase-admin/firestore';

function mockClaim(overrides: Partial<KnowledgeClaim> = {}): KnowledgeClaim {
  return {
    id: 'kc_test',
    tenantId: 'org_thrive_syracuse',
    entityIds: [],
    observationIds: [],
    sourceIds: [],
    claimType: 'competitor_promo',
    claimText: 'Test claim',
    state: 'verified_fact',
    confidenceScore: 0.90,
    confidenceBand: 'high',
    evidenceType: 'first_party_system',
    recencyBucket: '7d',
    impactLevel: 'high',
    promotedToLetta: false,
    contradictedByClaimIds: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

describe('isEligibleForLettaPromotion', () => {
  it('verified high-impact recent claim → promotable', () => {
    const claim = mockClaim();
    expect(isEligibleForLettaPromotion(claim, 'competitive_intel')).toBe(true);
  });

  it('working_fact → not promotable', () => {
    const claim = mockClaim({ state: 'working_fact' });
    expect(isEligibleForLettaPromotion(claim, 'competitive_intel')).toBe(false);
  });

  it('signal → not promotable', () => {
    const claim = mockClaim({ state: 'signal' });
    expect(isEligibleForLettaPromotion(claim, 'competitive_intel')).toBe(false);
  });

  it('verified + low confidence → not promotable', () => {
    const claim = mockClaim({ confidenceScore: 0.80 });
    expect(isEligibleForLettaPromotion(claim, 'competitive_intel')).toBe(false);
  });

  it('verified + stale → not promotable', () => {
    const claim = mockClaim({ recencyBucket: 'stale' });
    expect(isEligibleForLettaPromotion(claim, 'competitive_intel')).toBe(false);
  });

  it('verified + contradicted → not promotable', () => {
    const claim = mockClaim({ contradictedByClaimIds: ['kc_other'] });
    expect(isEligibleForLettaPromotion(claim, 'competitive_intel')).toBe(false);
  });

  it('verified + low impact + not playbook domain → not promotable', () => {
    const claim = mockClaim({ impactLevel: 'low' });
    expect(isEligibleForLettaPromotion(claim, 'campaign_history')).toBe(false);
  });

  it('verified + medium impact + welcome_playbooks domain → promotable', () => {
    const claim = mockClaim({ impactLevel: 'medium' });
    expect(isEligibleForLettaPromotion(claim, 'welcome_playbooks')).toBe(true);
  });

  it('verified + medium impact + checkin_flow domain → promotable', () => {
    const claim = mockClaim({ impactLevel: 'medium' });
    expect(isEligibleForLettaPromotion(claim, 'checkin_flow')).toBe(true);
  });

  it('verified + 14d recency → promotable', () => {
    const claim = mockClaim({ recencyBucket: '14d' });
    expect(isEligibleForLettaPromotion(claim, 'competitive_intel')).toBe(true);
  });

  it('verified + 30d recency → not promotable', () => {
    const claim = mockClaim({ recencyBucket: '30d' });
    expect(isEligibleForLettaPromotion(claim, 'competitive_intel')).toBe(false);
  });
});
