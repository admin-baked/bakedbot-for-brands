/**
 * Deebo Compliance Engine - Unit Tests
 *
 * Tests the core compliance validation logic exported from @/server/agents/deebo.
 * The source uses stub/simplified implementations for checkout and state checks.
 */

import { describe, it, expect } from '@jest/globals';
import {
  deeboCheckCheckout,
  deeboCheckAge,
  deeboCheckStateAllowed,
} from '@/server/agents/deebo';

describe('Deebo Compliance Engine', () => {

  // ============================================================================
  // AGE VALIDATION TESTS
  // ============================================================================

  describe('deeboCheckAge', () => {
    const today = new Date();
    const currentYear = today.getFullYear();

    it('should allow 21+ year old', () => {
      const dob = `${currentYear - 25}-01-01`; // 25 years old
      const result = deeboCheckAge(dob, 'CA');

      expect(result.allowed).toBe(true);
      expect(result.minAge).toBe(21);
    });

    it('should block 20 year old', () => {
      const dob = `${currentYear - 20}-01-01`; // 20 years old
      const result = deeboCheckAge(dob, 'CA');

      expect(result.allowed).toBe(false);
      expect(result.minAge).toBe(21);
      expect(result.reason).toContain('21+');
    });

    it('should use 21 as minAge regardless of state', () => {
      // Current implementation always uses 21 as minAge
      const dob = `${currentYear - 19}-01-01`; // 19 years old
      const result = deeboCheckAge(dob, 'FL');

      expect(result.allowed).toBe(false);
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

    it('should handle invalid date of birth', () => {
      const result = deeboCheckAge('invalid-date', 'CA');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Invalid');
    });
  });

  // ============================================================================
  // STATE LEGALITY TESTS
  // ============================================================================

  describe('deeboCheckStateAllowed', () => {

    it('should allow sales in non-blocked states', () => {
      const result = deeboCheckStateAllowed('CA');
      expect(result.allowed).toBe(true);
    });

    it('should block sales in blocked states (ID)', () => {
      const result = deeboCheckStateAllowed('ID');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should block sales in blocked states (NE)', () => {
      const result = deeboCheckStateAllowed('NE');
      expect(result.allowed).toBe(false);
    });

    it('should block sales in blocked states (KS)', () => {
      const result = deeboCheckStateAllowed('KS');
      expect(result.allowed).toBe(false);
    });

    it('should allow sales in states not on the blocked list', () => {
      // Only ID, NE, KS are blocked in current stub
      const result = deeboCheckStateAllowed('NY');
      expect(result.allowed).toBe(true);
    });

    it('should handle unknown state codes', () => {
      const result = deeboCheckStateAllowed('XX');
      // Not in blocked list, so allowed
      expect(result.allowed).toBe(true);
    });
  });

  // ============================================================================
  // CHECKOUT COMPLIANCE TESTS (Stub implementation)
  // ============================================================================

  describe('deeboCheckCheckout', () => {

    it('should always return allowed (stub implementation)', () => {
      const result = deeboCheckCheckout({ anything: 'goes' });
      expect(result.allowed).toBe(true);
      expect(result.violations).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle empty cart', () => {
      const result = deeboCheckCheckout([]);
      expect(result.allowed).toBe(true);
    });

    it('should handle null input', () => {
      const result = deeboCheckCheckout(null);
      expect(result.allowed).toBe(true);
    });
  });
});
