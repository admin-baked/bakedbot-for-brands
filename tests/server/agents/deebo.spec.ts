// [AI-THREAD P0-TEST-DEEBO-AGENT]
// [Dev1-Claude @ 2025-11-29]:
//   Created comprehensive test suite for Deebo compliance engine.
//   Tests all 51 US states, age validation, medical card requirements, and purchase limits.
//   Target: 100% function coverage, 153+ test cases.

/**
 * Deebo Compliance Engine - Unit Tests
 *
 * Tests the core compliance validation logic for cannabis purchases across all 51 US jurisdictions.
 * Validates age requirements, medical card checks, purchase limits, and state legality.
 */

import { describe, it, expect } from '@jest/globals';
import {
  deeboCheckCheckout,
  deeboCheckAge,
  deeboCheckStateAllowed,
  deeboCheckMessage,
  type CheckoutCustomer,
  type CheckoutComplianceInput,
} from '@/server/agents/deebo';

describe('Deebo Compliance Engine', () => {

  // ============================================================================
  // AGE VALIDATION TESTS
  // ============================================================================

  describe('deeboCheckAge', () => {
    const today = new Date();
    const currentYear = today.getFullYear();

    it('should allow 21+ year old in recreational state (CA)', () => {
      const dob = `${currentYear - 25}-01-01`; // 25 years old
      const result = deeboCheckAge(dob, 'CA');

      expect(result.allowed).toBe(true);
      expect(result.minAge).toBe(21);
      expect(result.reason).toBeUndefined();
    });

    it('should block 20 year old in recreational state (CA)', () => {
      const dob = `${currentYear - 20}-01-01`; // 20 years old
      const result = deeboCheckAge(dob, 'CA');

      expect(result.allowed).toBe(false);
      expect(result.minAge).toBe(21);
      expect(result.reason).toContain('must be 21+');
    });

    it('should allow 18+ year old in medical-only state (FL)', () => {
      const dob = `${currentYear - 19}-01-01`; // 19 years old
      const result = deeboCheckAge(dob, 'FL');

      expect(result.allowed).toBe(true);
      expect(result.minAge).toBe(18);
      expect(result.reason).toBeUndefined();
    });

    it('should block 17 year old in medical-only state (FL)', () => {
      const dob = `${currentYear - 17}-01-01`; // 17 years old
      const result = deeboCheckAge(dob, 'FL');

      expect(result.allowed).toBe(false);
      expect(result.minAge).toBe(18);
      expect(result.reason).toContain('must be 18+');
    });

    it('should require 21+ in illegal state (TX)', () => {
      const dob = `${currentYear - 25}-01-01`; // 25 years old
      const result = deeboCheckAge(dob, 'TX');

      expect(result.allowed).toBe(true);
      expect(result.minAge).toBe(21);
    });

    it('should handle edge case: exactly 21 years old today', () => {
      const exactBirthday = new Date(today);
      exactBirthday.setFullYear(today.getFullYear() - 21);
      const dob = exactBirthday.toISOString().split('T')[0];

      const result = deeboCheckAge(dob, 'CA');
      expect(result.allowed).toBe(true);
    });

    it('should handle edge case: 1 day before 21st birthday', () => {
      const almostBirthday = new Date(today);
      almostBirthday.setFullYear(today.getFullYear() - 21);
      almostBirthday.setDate(almostBirthday.getDate() + 1);
      const dob = almostBirthday.toISOString().split('T')[0];

      const result = deeboCheckAge(dob, 'CA');
      expect(result.allowed).toBe(false);
    });
  });

  // ============================================================================
  // STATE LEGALITY TESTS
  // ============================================================================

  describe('deeboCheckStateAllowed', () => {

    // FULLY LEGAL STATES (24 states)
    const legalStates = [
      'AK', 'AZ', 'CA', 'CO', 'CT', 'DE', 'IL', 'ME', 'MD', 'MA',
      'MI', 'MN', 'MT', 'NV', 'NJ', 'NM', 'NY', 'OH', 'OR', 'PA',
      'RI', 'VT', 'VA', 'WA'
    ];

    legalStates.forEach(state => {
      it(`should allow sales in legal state: ${state}`, () => {
        const result = deeboCheckStateAllowed(state);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    // MEDICAL-ONLY STATES (15 states)
    const medicalStates = [
      'AL', 'AR', 'FL', 'HI', 'LA', 'MS', 'MO', 'ND', 'OK', 'SD',
      'UT', 'WV', 'WY', 'NH', 'KY'
    ];

    medicalStates.forEach(state => {
      it(`should allow medical sales in medical-only state: ${state}`, () => {
        const result = deeboCheckStateAllowed(state);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    // ILLEGAL STATES (12 states)
    const illegalStates = [
      'GA', 'ID', 'IN', 'IA', 'KS', 'NE', 'NC', 'SC', 'TN', 'TX', 'WI', 'DC'
    ];

    illegalStates.forEach(state => {
      it(`should block sales in illegal state: ${state}`, () => {
        const result = deeboCheckStateAllowed(state);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('not legal');
      });
    });

    it('should handle lowercase state codes', () => {
      const result = deeboCheckStateAllowed('ca');
      expect(result.allowed).toBe(true);
    });

    it('should handle unknown state codes', () => {
      const result = deeboCheckStateAllowed('XX');
      expect(result.allowed).toBe(false);
    });
  });

  // ============================================================================
  // CHECKOUT COMPLIANCE TESTS
  // ============================================================================

  describe('deeboCheckCheckout', () => {

    const validCart = [
      { productId: 'prod1', quantity: 1, category: 'flower', grams: 3.5 },
      { productId: 'prod2', quantity: 2, category: 'edibles', mg_thc: 100 },
    ];

    it('should allow valid checkout in recreational state (CA)', async () => {
      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'user123',
          dateOfBirth: '1990-01-01',
          hasMedicalCard: false,
          state: 'CA',
        },
        cart: validCart,
        dispensaryState: 'CA',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should block checkout in illegal state (TX)', async () => {
      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'user123',
          dateOfBirth: '1990-01-01',
          hasMedicalCard: false,
          state: 'TX',
        },
        cart: validCart,
        dispensaryState: 'TX',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not legal');
    });

    it('should block underage customer (20 years old)', async () => {
      const currentYear = new Date().getFullYear();
      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'user123',
          dateOfBirth: `${currentYear - 20}-01-01`,
          hasMedicalCard: false,
          state: 'CA',
        },
        cart: validCart,
        dispensaryState: 'CA',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(false);
      expect(result.errors.some(e => e.includes('21+'))).toBe(true);
    });

    it('should block checkout without medical card in medical-only state (FL)', async () => {
      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'user123',
          dateOfBirth: '1990-01-01',
          hasMedicalCard: false,
          state: 'FL',
        },
        cart: validCart,
        dispensaryState: 'FL',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(false);
      expect(result.errors.some(e => e.includes('medical'))).toBe(true);
    });

    it('should allow checkout WITH medical card in medical-only state (FL)', async () => {
      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'user123',
          dateOfBirth: '1990-01-01',
          hasMedicalCard: true,
          state: 'FL',
        },
        cart: validCart,
        dispensaryState: 'FL',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should block checkout exceeding flower limits (CA: 28.5g limit)', async () => {
      const largeCart = [
        { productId: 'prod1', quantity: 10, category: 'flower', grams: 3.5 }, // 35g total
      ];

      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'user123',
          dateOfBirth: '1990-01-01',
          hasMedicalCard: false,
          state: 'CA',
        },
        cart: largeCart,
        dispensaryState: 'CA',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(false);
      expect(result.errors.some(e => e.includes('limit'))).toBe(true);
    });

    it('should handle missing date of birth', async () => {
      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'user123',
          hasMedicalCard: false,
          state: 'CA',
        },
        cart: validCart,
        dispensaryState: 'CA',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(false);
      expect(result.errors.some(e => e.includes('Date of birth'))).toBe(true);
    });

    it('should provide state-specific rules in response', async () => {
      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'user123',
          dateOfBirth: '1990-01-01',
          hasMedicalCard: false,
          state: 'CA',
        },
        cart: validCart,
        dispensaryState: 'CA',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.stateRules).toBeDefined();
      expect(result.stateRules?.state).toBe('CA');
      expect(result.stateRules?.legalStatus).toBe('legal');
    });
  });

  // ============================================================================
  // MESSAGE COMPLIANCE TESTS (Marketing/Support)
  // ============================================================================

  describe('deeboCheckMessage', () => {

    it('should allow general cannabis information', () => {
      const message = 'Learn about our cannabis products';
      const result = deeboCheckMessage(message, 'CA');

      expect(result.allowed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about medical claims', () => {
      const message = 'Our cannabis cures cancer';
      const result = deeboCheckMessage(message, 'CA');

      expect(result.allowed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('medical claim');
    });

    it('should warn about targeting minors', () => {
      const message = 'Great for kids and families!';
      const result = deeboCheckMessage(message, 'CA');

      expect(result.allowed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('minor');
    });

    it('should block interstate shipping references', () => {
      const message = 'We ship nationwide!';
      const result = deeboCheckMessage(message, 'CA');

      expect(result.allowed).toBe(false);
      expect(result.errors.some(e => e.includes('interstate'))).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES & ERROR HANDLING
  // ============================================================================

  describe('Edge Cases', () => {

    it('should handle null/undefined customer gracefully', async () => {
      const input: any = {
        customer: null,
        cart: [],
        dispensaryState: 'CA',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(false);
    });

    it('should handle empty cart', async () => {
      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'user123',
          dateOfBirth: '1990-01-01',
          hasMedicalCard: false,
          state: 'CA',
        },
        cart: [],
        dispensaryState: 'CA',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(true); // Empty cart is technically valid
    });

    it('should handle malformed date of birth', async () => {
      const input: CheckoutComplianceInput = {
        customer: {
          uid: 'user123',
          dateOfBirth: 'invalid-date',
          hasMedicalCard: false,
          state: 'CA',
        },
        cart: [],
        dispensaryState: 'CA',
      };

      const result = await deeboCheckCheckout(input);
      expect(result.allowed).toBe(false);
    });
  });
});
