/**
 * Deebo Compliance Engine - All 51 States Test Suite
 *
 * Tests getStateRules from compliance-rules for all jurisdictions.
 * Note: deeboCheckCheckout is a stub that always returns allowed: true,
 * so detailed checkout tests are skipped until full implementation.
 */

import { describe, it, expect } from '@jest/globals';
import { deeboCheckCheckout } from '@/server/agents/deebo';
import { getStateRules } from '@/lib/compliance/compliance-rules';

describe('Deebo - All 51 States Compliance', () => {

  // ============================================================================
  // FULLY LEGAL STATES (24 states) - Recreational cannabis legal
  // ============================================================================

  describe('Fully Legal States (24 states)', () => {

    const legalStates = [
      { code: 'AK', name: 'Alaska', minAge: 21, flowerLimit: 28 },
      { code: 'AZ', name: 'Arizona', minAge: 21, flowerLimit: 28 },
      { code: 'CA', name: 'California', minAge: 21, flowerLimit: 28.5 },
      { code: 'CO', name: 'Colorado', minAge: 21, flowerLimit: 28 },
      { code: 'CT', name: 'Connecticut', minAge: 21, flowerLimit: 42.5 },
      { code: 'DC', name: 'District of Columbia', minAge: 21, flowerLimit: 56 },
      { code: 'DE', name: 'Delaware', minAge: 21, flowerLimit: 28 },
      { code: 'IL', name: 'Illinois', minAge: 21, flowerLimit: 30 },
      { code: 'ME', name: 'Maine', minAge: 21, flowerLimit: 71 },
      { code: 'MD', name: 'Maryland', minAge: 21, flowerLimit: 28 },
      { code: 'MA', name: 'Massachusetts', minAge: 21, flowerLimit: 28 },
      { code: 'MI', name: 'Michigan', minAge: 21, flowerLimit: 71 },
      { code: 'MN', name: 'Minnesota', minAge: 21, flowerLimit: 56 },
      { code: 'MO', name: 'Missouri', minAge: 21, flowerLimit: 85 },
      { code: 'MT', name: 'Montana', minAge: 21, flowerLimit: 28 },
      { code: 'NV', name: 'Nevada', minAge: 21, flowerLimit: 28 },
      { code: 'NJ', name: 'New Jersey', minAge: 21, flowerLimit: 28 },
      { code: 'NM', name: 'New Mexico', minAge: 21, flowerLimit: 56 },
      { code: 'NY', name: 'New York', minAge: 21, flowerLimit: 85 },
      { code: 'OH', name: 'Ohio', minAge: 21, flowerLimit: 71 },
      { code: 'OR', name: 'Oregon', minAge: 21, flowerLimit: 28 },
      { code: 'RI', name: 'Rhode Island', minAge: 21, flowerLimit: 28 },
      { code: 'VT', name: 'Vermont', minAge: 21, flowerLimit: 28 },
      { code: 'VA', name: 'Virginia', minAge: 21, flowerLimit: 113 },
      { code: 'WA', name: 'Washington', minAge: 21, flowerLimit: 28 },
    ];

    legalStates.forEach(({ code, name, minAge }) => {
      it(`${code} (${name}): getStateRules returns legal status`, () => {
        const rules = getStateRules(code);

        expect(rules.legalStatus).toBe('legal');
        expect(rules.minAge).toBe(minAge);
        expect(rules.requiresMedicalCard).toBe(false);
      });
    });
  });

  // ============================================================================
  // MEDICAL-ONLY STATES (15 states) - Medical cannabis only
  // ============================================================================

  describe('Medical-Only States (15 states)', () => {

    const medicalStates = [
      { code: 'AL', name: 'Alabama', minAge: 18 },
      { code: 'AR', name: 'Arkansas', minAge: 18 },
      { code: 'FL', name: 'Florida', minAge: 18 },
      { code: 'HI', name: 'Hawaii', minAge: 18 },
      { code: 'LA', name: 'Louisiana', minAge: 18 },
      { code: 'MS', name: 'Mississippi', minAge: 18 },
      { code: 'ND', name: 'North Dakota', minAge: 18 },
      { code: 'OK', name: 'Oklahoma', minAge: 18 },
      { code: 'PA', name: 'Pennsylvania', minAge: 18 },
      { code: 'SD', name: 'South Dakota', minAge: 18 },
      { code: 'UT', name: 'Utah', minAge: 18 },
      { code: 'WV', name: 'West Virginia', minAge: 18 },
    ];

    medicalStates.forEach(({ code, name, minAge }) => {
      it(`${code} (${name}): getStateRules returns medical status`, () => {
        const rules = getStateRules(code);

        expect(rules.legalStatus).toBe('medical');
        expect(rules.requiresMedicalCard).toBe(true);
        expect(rules.minAge).toBe(minAge);
      });
    });
  });

  // ============================================================================
  // ILLEGAL/DECRIMINALIZED STATES (12 states + DC)
  // ============================================================================

  describe('Illegal/Decriminalized States (12 + DC)', () => {

    const illegalStates = [
      { code: 'GA', name: 'Georgia' },
      { code: 'ID', name: 'Idaho' },
      { code: 'IN', name: 'Indiana' },
      { code: 'IA', name: 'Iowa' },
      { code: 'KS', name: 'Kansas' },
      { code: 'KY', name: 'Kentucky' },
      { code: 'NE', name: 'Nebraska' },
      { code: 'NH', name: 'New Hampshire' },
      { code: 'NC', name: 'North Carolina' },
      { code: 'SC', name: 'South Carolina' },
      { code: 'TN', name: 'Tennessee' },
      { code: 'TX', name: 'Texas' },
      { code: 'WI', name: 'Wisconsin' },
      { code: 'WY', name: 'Wyoming' },
    ];

    illegalStates.forEach(({ code, name }) => {
      it(`${code} (${name}): getStateRules returns illegal or decriminalized`, () => {
        const rules = getStateRules(code);

        expect(rules.legalStatus).toMatch(/illegal|decriminalized/);
      });
    });
  });

  // ============================================================================
  // CHECKOUT STUB TESTS
  // ============================================================================

  describe('deeboCheckCheckout (Stub)', () => {

    it('stub always returns allowed: true', () => {
      const result = deeboCheckCheckout({ any: 'cart' });
      expect(result.allowed).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  // ============================================================================
  // CROSS-STATE VERIFICATION
  // ============================================================================

  describe('Cross-State Edge Cases', () => {

    it('getStateRules should return valid rules for any known state', () => {
      const result = getStateRules('CA');
      expect(result).toBeDefined();
      expect(result.state).toBe('CA');
    });
  });
});
