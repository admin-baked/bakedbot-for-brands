/**
 * Knowledge Engine — Scoring Tests
 *
 * Validates confidence score computation and state classification.
 * All test cases from the spec.
 */

import { computeConfidenceScore, computeClaimState, getConfidenceBand, getRecencyBucket } from '../scoring';

describe('computeConfidenceScore', () => {
  it('trusted_external + 2 sources + repeated → 0.85', () => {
    const score = computeConfidenceScore({
      trustClass: 'trusted_external',
      sourceCount: 2,
      repeatedAcrossRuns: true,
      firstPartyConfirmation: false,
      contradictionCount: 0,
      ageDays: 3,
    });
    expect(score).toBe(0.85);
    // 0.70 + 0.08 + 0.07 = 0.85
  });

  it('external + single-source + ageDays=35 (stale >30) → 0.45', () => {
    const score = computeConfidenceScore({
      trustClass: 'external',
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmation: false,
      contradictionCount: 0,
      ageDays: 35,
    });
    expect(score).toBe(0.45);
    // 0.55 - 0.10 (>30 days, non-cumulative) = 0.45
  });

  it('age penalty is non-cumulative: ageDays=35 applies -0.10 only, not -0.15', () => {
    const score = computeConfidenceScore({
      trustClass: 'external',
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmation: false,
      contradictionCount: 0,
      ageDays: 35,
    });
    // If cumulative: 0.55 - 0.05 - 0.10 = 0.40 (wrong)
    // Correct: 0.55 - 0.10 = 0.45
    expect(score).not.toBe(0.40);
    expect(score).toBe(0.45);
  });

  it('first_party + 1 contradiction → 0.75', () => {
    const score = computeConfidenceScore({
      trustClass: 'first_party',
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmation: false,
      contradictionCount: 1,
      ageDays: 2,
    });
    expect(score).toBe(0.75);
    // 0.85 - 0.10 = 0.75
  });

  it('contradictions capped at -0.20 regardless of count', () => {
    const score = computeConfidenceScore({
      trustClass: 'first_party',
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmation: false,
      contradictionCount: 5,
      ageDays: 1,
    });
    expect(score).toBe(0.65);
    // 0.85 - 0.20 (capped) = 0.65
  });

  it('clamps to 0.00 minimum', () => {
    const score = computeConfidenceScore({
      trustClass: 'agent_generated',
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmation: false,
      contradictionCount: 5,
      ageDays: 60,
    });
    expect(score).toBeGreaterThanOrEqual(0.00);
  });

  it('clamps to 1.00 maximum', () => {
    const score = computeConfidenceScore({
      trustClass: 'first_party',
      sourceCount: 5,
      repeatedAcrossRuns: true,
      firstPartyConfirmation: true,
      contradictionCount: 0,
      ageDays: 0,
    });
    expect(score).toBeLessThanOrEqual(1.00);
  });
});

describe('getConfidenceBand', () => {
  it('0.34 → low', () => expect(getConfidenceBand(0.34)).toBe('low'));
  it('0.35 → medium', () => expect(getConfidenceBand(0.35)).toBe('medium'));
  it('0.59 → medium', () => expect(getConfidenceBand(0.59)).toBe('medium'));
  it('0.60 → high', () => expect(getConfidenceBand(0.60)).toBe('high'));
  it('1.00 → high', () => expect(getConfidenceBand(1.00)).toBe('high'));
});

describe('computeClaimState', () => {
  it('high confidence + first-party → verified_fact', () => {
    const state = computeClaimState({
      confidenceScore: 0.90,
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmed: true,
      contradicted: false,
      dismissed: false,
    });
    expect(state).toBe('verified_fact');
  });

  it('high confidence + repeated → verified_fact', () => {
    const state = computeClaimState({
      confidenceScore: 0.87,
      sourceCount: 2,
      repeatedAcrossRuns: true,
      firstPartyConfirmed: false,
      contradicted: false,
      dismissed: false,
    });
    expect(state).toBe('verified_fact');
  });

  it('medium confidence → working_fact', () => {
    const state = computeClaimState({
      confidenceScore: 0.72,
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmed: false,
      contradicted: false,
      dismissed: false,
    });
    expect(state).toBe('working_fact');
  });

  it('low confidence → signal', () => {
    const state = computeClaimState({
      confidenceScore: 0.45,
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmed: false,
      contradicted: false,
      dismissed: false,
    });
    expect(state).toBe('signal');
  });

  it('dismissed flag overrides everything', () => {
    const state = computeClaimState({
      confidenceScore: 0.95,
      sourceCount: 5,
      repeatedAcrossRuns: true,
      firstPartyConfirmed: true,
      contradicted: false,
      dismissed: true,
    });
    expect(state).toBe('dismissed');
  });
});

describe('getRecencyBucket', () => {
  it('0 hours ago → today', () => {
    expect(getRecencyBucket(new Date())).toBe('today');
  });
  it('3 days ago → 7d', () => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    expect(getRecencyBucket(d)).toBe('7d');
  });
  it('10 days ago → 14d', () => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    expect(getRecencyBucket(d)).toBe('14d');
  });
  it('20 days ago → 30d', () => {
    const d = new Date();
    d.setDate(d.getDate() - 20);
    expect(getRecencyBucket(d)).toBe('30d');
  });
  it('45 days ago → stale', () => {
    const d = new Date();
    d.setDate(d.getDate() - 45);
    expect(getRecencyBucket(d)).toBe('stale');
  });
});
