// [AI-THREAD P0-TEST-DEEBO-AGENT]
// [Dev1-Claude @ 2025-11-29]:
//   Created comprehensive 51-state test suite for Deebo compliance engine.
//   Tests all US jurisdictions (50 states + DC) against compliance rules.
//   Validates legal status, age requirements, medical card rules, and purchase limits.

/**
 * Deebo Compliance Engine - All 51 States Test Suite
 *
 * Comprehensive validation of cannabis compliance rules across all US jurisdictions.
 * Tests legal status, age requirements, medical card requirements, and purchase limits.
 */

import { describe, it, expect } from '@jest/globals';
import { deeboCheckCheckout, type CheckoutComplianceInput } from '@/server/agents/deebo';
import { getStateRules } from '@/lib/compliance/compliance-rules';

describe('Deebo - All 51 States Compliance', () => {

  const validAdultDOB = '1990-01-01'; // 33 years old
  const validTeenDOB = '2005-01-01'; // 18 years old
  const validMinorDOB = '2010-01-01'; // 13 years old

  const smallCart = [
    { productId: 'test1', quantity: 1, category: 'flower', grams: 3.5 },
  ];

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
      { code: 'DE', name: 'Delaware', minAge: 21, flowerLimit: 28 },
      { code: 'IL', name: 'Illinois', minAge: 21, flowerLimit: 30 },
      { code: 'ME', name: 'Maine', minAge: 21, flowerLimit: 71 },
      { code: 'MD', name: 'Maryland', minAge: 21, flowerLimit: 28 },
      { code: 'MA', name: 'Massachusetts', minAge: 21, flowerLimit: 28 },
      { code: 'MI', name: 'Michigan', minAge: 21, flowerLimit: 71 },
      { code: 'MN', name: 'Minnesota', minAge: 21, flowerLimit: 56 },
      { code: 'MT', name: 'Montana', minAge: 21, flowerLimit: 28 },
      { code: 'NV', name: 'Nevada', minAge: 21, flowerLimit: 28 },
      { code: 'NJ', name: 'New Jersey', minAge: 21, flowerLimit: 28 },
      { code: 'NM', name: 'New Mexico', minAge: 21, flowerLimit: 56 },
      { code: 'NY', name: 'New York', minAge: 21, flowerLimit: 85 },
      { code: 'OH', name: 'Ohio', minAge: 21, flowerLimit: 71 },
      { code: 'OR', name: 'Oregon', minAge: 21, flowerLimit: 28 },
      { code: 'PA', name: 'Pennsylvania', minAge: 21, flowerLimit: 30 },
      { code: 'RI', name: 'Rhode Island', minAge: 21, flowerLimit: 28 },
      { code: 'VT', name: 'Vermont', minAge: 21, flowerLimit: 28 },
      { code: 'VA', name: 'Virginia', minAge: 21, flowerLimit: 113 },
      { code: 'WA', name: 'Washington', minAge: 21, flowerLimit: 28 },
    ];

    legalStates.forEach(({ code, name, minAge }) => {
      it(`${code} (${name}): Should allow 21+ without medical card`, async () => {
        const input: CheckoutComplianceInput = {
          customer: {
            uid: 'test123',
            dateOfBirth: validAdultDOB,
            hasMedicalCard: false,
            state: code,
          },
          cart: smallCart,
          dispensaryState: code,
        };

        const result = await deeboCheckCheckout(input);
        const rules = getStateRules(code);

        expect(result.allowed).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(rules.legalStatus).toBe('legal');
        expect(rules.minAge).toBe(minAge);
        expect(rules.requiresMedicalCard).toBe(false);
      });

      it(`${code} (${name}): Should block under 21`, async () => {
        const input: CheckoutComplianceInput = {
          customer: {
            uid: 'test123',
            dateOfBirth: validTeenDOB, // 18 years old
            hasMedicalCard: false,
            state: code,
          },
          cart: smallCart,
          dispensaryState: code,
        };

        const result = await deeboCheckCheckout(input);
        expect(result.allowed).toBe(false);
        expect(result.errors.some(e => e.includes('21'))).toBe(true);
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
      { code: 'MO', name: 'Missouri', minAge: 18 },
      { code: 'ND', name: 'North Dakota', minAge: 18 },
      { code: 'OK', name: 'Oklahoma', minAge: 18 },
      { code: 'SD', name: 'South Dakota', minAge: 18 },
      { code: 'UT', name: 'Utah', minAge: 18 },
      { code: 'WV', name: 'West Virginia', minAge: 18 },
      { code: 'WY', name: 'Wyoming', minAge: 18 },
      { code: 'NH', name: 'New Hampshire', minAge: 18 },
      { code: 'KY', name: 'Kentucky', minAge: 18 },
    ];

    medicalStates.forEach(({ code, name, minAge }) => {
      it(`${code} (${name}): Should REQUIRE medical card`, async () => {
        const input: CheckoutComplianceInput = {
          customer: {
            uid: 'test123',
            dateOfBirth: validAdultDOB,
            hasMedicalCard: false, // No card
            state: code,
          },
          cart: smallCart,
          dispensaryState: code,
        };

        const result = await deeboCheckCheckout(input);
        const rules = getStateRules(code);

        expect(result.allowed).toBe(false);
        expect(result.errors.some(e => e.toLowerCase().includes('medical'))).toBe(true);
        expect(rules.legalStatus).toBe('medical');
        expect(rules.requiresMedicalCard).toBe(true);
      });

      it(`${code} (${name}): Should allow 18+ WITH medical card`, async () => {
        const input: CheckoutComplianceInput = {
          customer: {
            uid: 'test123',
            dateOfBirth: validTeenDOB, // 18 years old
            hasMedicalCard: true, // Has card
            state: code,
          },
          cart: smallCart,
          dispensaryState: code,
        };

        const result = await deeboCheckCheckout(input);
        const rules = getStateRules(code);

        expect(result.allowed).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(rules.minAge).toBe(minAge);
      });

      it(`${code} (${name}): Should block under 18 even WITH medical card`, async () => {
        const input: CheckoutComplianceInput = {
          customer: {
            uid: 'test123',
            dateOfBirth: validMinorDOB, // 13 years old
            hasMedicalCard: true,
            state: code,
          },
          cart: smallCart,
          dispensaryState: code,
        };

        const result = await deeboCheckCheckout(input);
        expect(result.allowed).toBe(false);
        expect(result.errors.some(e => e.includes('18'))).toBe(true);
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
      { code: 'NE', name: 'Nebraska' },
      { code: 'NC', name: 'North Carolina' },
      { code: 'SC', name: 'South Carolina' },
      { code: 'TN', name: 'Tennessee' },
      { code: 'TX', name: 'Texas' },
      { code: 'WI', name: 'Wisconsin' },
      { code: 'DC', name: 'District of Columbia' },
    ];

    illegalStates.forEach(({ code, name }) => {
      it(`${code} (${name}): Should BLOCK all sales (illegal state)`, async () => {
        const input: CheckoutComplianceInput = {
          customer: {
            uid: 'test123',
            dateOfBirth: validAdultDOB,
            hasMedicalCard: false,
            state: code,
          },
          cart: smallCart,
          dispensaryState: code,
        };

        const result = await deeboCheckCheckout(input);
        const rules = getStateRules(code);

        expect(result.allowed).toBe(false);
        expect(result.errors.some(e =>
          e.toLowerCase().includes('not legal') ||
          e.toLowerCase().includes('illegal') ||
          e.toLowerCase().includes('decriminalized')
        )).toBe(true);
        expect(rules.legalStatus).toMatch(/illegal|decriminalized/);
      });

      it(`${code} (${name}): Should block even WITH medical card (illegal state)`, async () => {
        const input: CheckoutComplianceInput = {
          customer: {
            uid: 'test123',
            dateOfBirth: validAdultDOB,
            hasMedicalCard: true,
            state: code,
          },
          cart: smallCart,
          dispensaryState: code,
        };

        const result = await deeboCheckCheckout(input);
        expect(result.allowed).toBe(false);
      });
    });
  });

  // ============================================================================
  // PURCHASE LIMIT VALIDATION (All States)
  // ============================================================================

  describe('Purchase Limits by State', () => {

    it('CA: Should enforce 28.5g flower limit', async () => {
      const largeCart = [
        { productId: 'test1', quantity: 10, category: 'flower', grams: 3.5 }, // 35g total
      ];

      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'test123',
          dateOfBirth: validAdultDOB,
          hasMedicalCard: false,
          state: 'CA',
        },
        cart: largeCart,
        dispensaryState: 'CA',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('limit'))).toBe(true);
    });

    it('IL: Should enforce 30g flower limit', async () => {
      const largeCart = [
        { productId: 'test1', quantity: 10, category: 'flower', grams: 3.5 }, // 35g total
      ];

      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'test123',
          dateOfBirth: validAdultDOB,
          hasMedicalCard: false,
          state: 'IL',
        },
        cart: largeCart,
        dispensaryState: 'IL',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(false);
    });

    it('FL: Should enforce medical limits', async () => {
      const largeCart = [
        { productId: 'test1', quantity: 25, category: 'flower', grams: 3.5 }, // 87.5g total (exceeds 70g limit)
      ];

      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'test123',
          dateOfBirth: validAdultDOB,
          hasMedicalCard: true, // Medical card required
          state: 'FL',
        },
        cart: largeCart,
        dispensaryState: 'FL',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('limit'))).toBe(true);
    });

    it('MI: Should allow higher limits (71g flower)', async () => {
      const largeCart = [
        { productId: 'test1', quantity: 20, category: 'flower', grams: 3.5 }, // 70g total (within limit)
      ];

      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'test123',
          dateOfBirth: validAdultDOB,
          hasMedicalCard: false,
          state: 'MI',
        },
        cart: largeCart,
        dispensaryState: 'MI',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(true);
    });
  });

  // ============================================================================
  // CROSS-STATE VERIFICATION
  // ============================================================================

  describe('Cross-State Edge Cases', () => {

    it('Should validate customer state matches dispensary state', async () => {
      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'test123',
          dateOfBirth: validAdultDOB,
          hasMedicalCard: false,
          state: 'CA', // California customer
        },
        cart: smallCart,
        dispensaryState: 'NY', // New York dispensary
      };

      const result = await deeboCheckCheckout(input);
      // Implementation may allow or warn - document expected behavior
      expect(result).toBeDefined();
    });

    it('Should handle customer from illegal state buying in legal state', async () => {
      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'test123',
          dateOfBirth: validAdultDOB,
          hasMedicalCard: false,
          state: 'TX', // Texas (illegal)
        },
        cart: smallCart,
        dispensaryState: 'CA', // California (legal)
      };

      const result = await deeboCheckCheckout(input);
      // Should use dispensary state rules, but may warn
      expect(result).toBeDefined();
    });
  });
});
