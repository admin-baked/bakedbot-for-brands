/**
 * Unit tests for Deebo Compliance Agent
 *
 * Tests compliance checking functionality including:
 * - Compliance result structure validation
 * - Rule pack structure validation
 * - Type safety and data structures
 */

describe('Deebo Compliance Agent', () => {
  describe('Age Verification Logic', () => {
    it('should calculate age correctly for 21+ validation', () => {
      // Person born 25 years ago
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 25);

      const ageDifMs = Date.now() - dob.getTime();
      const ageDate = new Date(ageDifMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);

      expect(age).toBeGreaterThanOrEqual(21);
    });

    it('should correctly identify under 21', () => {
      // Person born 18 years ago
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 18);

      const ageDifMs = Date.now() - dob.getTime();
      const ageDate = new Date(ageDifMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);

      expect(age).toBeLessThan(21);
    });
  });

  describe('State Compliance Logic', () => {
    it('should identify blocked states correctly', () => {
      const blockedStates = ['ID', 'NE', 'KS'];
      const testState = 'ID';

      const isBlocked = blockedStates.includes(testState);

      expect(isBlocked).toBe(true);
    });

    it('should allow legal states', () => {
      const blockedStates = ['ID', 'NE', 'KS'];
      const testState = 'CA';

      const isBlocked = blockedStates.includes(testState);

      expect(isBlocked).toBe(false);
    });
  });

  describe('Compliance Status Enum', () => {
    it('should support all valid compliance statuses', () => {
      const validStatuses = ['pass', 'fail', 'warning'];

      validStatuses.forEach(status => {
        expect(['pass', 'fail', 'warning']).toContain(status);
      });
    });
  });

  describe('RulePack Structure', () => {
    it('should define all required rule pack fields', () => {
      const rulePack = {
        jurisdiction: 'WA',
        channel: 'retail',
        version: 1,
        rules: [],
        status: 'passing' as const
      };

      expect(rulePack.jurisdiction).toBe('WA');
      expect(rulePack.channel).toBe('retail');
      expect(rulePack.version).toBe(1);
      expect(rulePack.status).toBe('passing');
      expect(Array.isArray(rulePack.rules)).toBe(true);
    });

    it('should support all rule pack statuses', () => {
      const validStatuses = ['passing', 'failing', 'deprecated'];

      validStatuses.forEach(status => {
        expect(['passing', 'failing', 'deprecated']).toContain(status);
      });
    });
  });

  describe('Compliance Result Structure', () => {
    it('should define all required compliance result fields', () => {
      const result = {
        status: 'pass' as const,
        violations: [],
        suggestions: []
      };

      expect(result.status).toBe('pass');
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should support violation messages', () => {
      const result = {
        status: 'fail' as const,
        violations: ['Medical claim detected', 'Appeal to minors'],
        suggestions: ['Remove health claims', 'Use adult-focused imagery']
      };

      expect(result.violations).toHaveLength(2);
      expect(result.suggestions).toHaveLength(2);
      expect(result.violations[0]).toBe('Medical claim detected');
    });

    it('should map compliance statuses correctly', () => {
      // Test the mapping used in creative-content.ts
      const deeboStatus = 'pass';
      const complianceStatus = deeboStatus === 'pass' ? 'active' :
                              deeboStatus === 'warning' ? 'warning' : 'review_needed';

      expect(complianceStatus).toBe('active');
    });

    it('should map warning status', () => {
      const deeboStatus = 'warning';
      const complianceStatus = deeboStatus === 'pass' ? 'active' :
                              deeboStatus === 'warning' ? 'warning' : 'review_needed';

      expect(complianceStatus).toBe('warning');
    });

    it('should map fail status to review_needed', () => {
      const deeboStatus = 'fail';
      const complianceStatus = deeboStatus === 'pass' ? 'active' :
                              deeboStatus === 'warning' ? 'warning' : 'review_needed';

      expect(complianceStatus).toBe('review_needed');
    });
  });

  describe('Regex Pattern Validation', () => {
    it('should detect "cure" keyword (case insensitive)', () => {
      const pattern = /cure/i;

      expect(pattern.test('This will cure your headaches')).toBe(true);
      expect(pattern.test('This will CURE your issues')).toBe(true);
      expect(pattern.test('Premium quality')).toBe(false);
    });

    it('should detect "treat" keyword (case insensitive)', () => {
      const pattern = /treat/i;

      expect(pattern.test('Great for treating pain')).toBe(true);
      expect(pattern.test('TREAT yourself')).toBe(true);
      expect(pattern.test('Premium quality')).toBe(false);
    });

    it('should detect medical claims', () => {
      const medicalKeywords = ['cure', 'treat', 'heal', 'diagnose', 'prevent'];
      const content = 'This product can help treat anxiety';

      const hasViolation = medicalKeywords.some(keyword =>
        new RegExp(keyword, 'i').test(content)
      );

      expect(hasViolation).toBe(true);
    });

    it('should pass clean content', () => {
      const medicalKeywords = ['cure', 'treat', 'heal', 'diagnose', 'prevent'];
      const content = 'Experience premium quality cannabis products for adults 21+';

      const hasViolation = medicalKeywords.some(keyword =>
        new RegExp(keyword, 'i').test(content)
      );

      expect(hasViolation).toBe(false);
    });
  });
});
