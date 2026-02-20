/**
 * Deebo Compliance Check Unit Tests
 *
 * Test suite for Production Readiness Audit - Track C
 * Covers: Age check, state check, medical claims detection
 *
 * Priority: Tier 1 (Compliance Critical)
 * Uses golden sets from .agent/golden-sets/deebo-compliance.json
 */

import { deebo, deeboCheckAge, deeboCheckStateAllowed } from '../deebo';
import goldenSets from '@/../.agent/golden-sets/deebo-compliance.json';

// Mock AI module to control LLM responses
jest.mock('@/ai/genkit', () => ({
  ai: {
    generate: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { ai } from '@/ai/genkit';

describe('Deebo Compliance Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // 1. REGEX RULE TESTS (Fast Path - No LLM Required)
  // ===========================================================================

  describe('Regex Medical Claims Detection', () => {
    const regexTests = goldenSets.test_cases.filter(
      tc => tc.category === 'medical_claims' && tc.test_type === 'regex'
    );

    regexTests.forEach(testCase => {
      it(`${testCase.id}: ${testCase.notes}`, async () => {
        const { jurisdiction, channel, content } = testCase.input;

        const result = await deebo.checkContent(jurisdiction, channel, content);

        if (testCase.expected_status === 'fail') {
          expect(result.status).toBe('fail');
          expect(result.violations.length).toBeGreaterThan(0);

          // Check that expected violation keywords are present
          testCase.expected_violations_contain.forEach(keyword => {
            const violationText = result.violations.join(' ').toLowerCase();
            expect(violationText).toContain(keyword.toLowerCase());
          });
        } else {
          expect(result.status).toBe('pass');
          expect(result.violations).toHaveLength(0);
        }

        // Regex tests should NOT call LLM (fast path)
        expect(ai.generate).not.toHaveBeenCalled();
      });
    });

    it('medical-001: Detects "cure" medical claim without LLM', async () => {
      const result = await deebo.checkContent(
        'NY',
        'sms',
        'Our CBD tincture cures chronic back pain. Try it today!'
      );

      expect(result.status).toBe('fail');
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.join(' ').toLowerCase()).toContain('cure');
      expect(ai.generate).not.toHaveBeenCalled();
    });

    it('medical-002: Detects "treat" medical claim without LLM', async () => {
      const result = await deebo.checkContent(
        'CA',
        'email',
        'This strain treats anxiety and depression. Clinically proven.'
      );

      expect(result.status).toBe('fail');
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.join(' ').toLowerCase()).toContain('treat');
      expect(ai.generate).not.toHaveBeenCalled();
    });

    it('medical-003: Detects "prevent" medical claim without LLM', async () => {
      const result = await deebo.checkContent(
        'IL',
        'sms',
        'Our topical prevents inflammation. Doctor recommended.'
      );

      expect(result.status).toBe('fail');
      expect(result.violations.length).toBeGreaterThan(0);
      expect(ai.generate).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 2. LLM TESTS (Semantic Understanding)
  // ===========================================================================

  describe('LLM Semantic Compliance Checks', () => {
    beforeEach(() => {
      // Setup default mock response
      (ai.generate as jest.Mock).mockResolvedValue({
        output: {
          status: 'pass',
          violations: [],
          suggestions: [],
        },
        text: JSON.stringify({
          status: 'pass',
          violations: [],
          suggestions: [],
        }),
      });
    });

    const llmTests = goldenSets.test_cases.filter(
      tc => tc.test_type === 'llm'
    );

    llmTests.forEach(testCase => {
      it(`${testCase.id}: ${testCase.notes}`, async () => {
        const { jurisdiction, channel, content } = testCase.input;

        // Mock LLM response based on expected status
        const mockOutput = {
          status: testCase.expected_status,
          violations: testCase.expected_violations_contain,
          suggestions: [],
        };

        (ai.generate as jest.Mock).mockResolvedValueOnce({
          output: mockOutput,
          text: JSON.stringify(mockOutput),
        });

        const result = await deebo.checkContent(jurisdiction, channel, content);

        expect(result.status).toBe(testCase.expected_status);

        if (testCase.expected_status === 'fail') {
          expect(result.violations.length).toBeGreaterThan(0);
        }

        // LLM should be called for semantic checks
        expect(ai.generate).toHaveBeenCalled();
      });
    });

    it('medical-004: Passes anecdotal customer report (not medical claim)', async () => {
      (ai.generate as jest.Mock).mockResolvedValueOnce({
        output: {
          status: 'pass',
          violations: [],
          suggestions: [],
        },
        text: '{"status":"pass","violations":[],"suggestions":[]}',
      });

      const result = await deebo.checkContent(
        'NY',
        'social',
        'Many of our customers report better sleep and a calmer mood after using our indica edibles.'
      );

      expect(result.status).toBe('pass');
      expect(result.violations).toHaveLength(0);
      expect(ai.generate).toHaveBeenCalled();
    });

    it('medical-005: Fails fabricated clinical study claim', async () => {
      (ai.generate as jest.Mock).mockResolvedValueOnce({
        output: {
          status: 'fail',
          violations: ['Medical claim: fabricated clinical study'],
          suggestions: ['Remove clinical study reference'],
        },
        text: '{"status":"fail","violations":["Medical claim: fabricated clinical study"],"suggestions":["Remove clinical study reference"]}',
      });

      const result = await deebo.checkContent(
        'NY',
        'email',
        'Our tinctures are clinically shown to reduce pain levels by 40% in double-blind trials.'
      );

      expect(result.status).toBe('fail');
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('minors-001: Fails candy-like appeal to children', async () => {
      (ai.generate as jest.Mock).mockResolvedValueOnce({
        output: {
          status: 'fail',
          violations: ['Appeal to minors: candy-like imagery'],
          suggestions: ['Remove children-oriented language'],
        },
        text: '{"status":"fail","violations":["Appeal to minors: candy-like imagery"],"suggestions":[]}',
      });

      const result = await deebo.checkContent(
        'NY',
        'social',
        'Cannabis gummies that look just like your favorite childhood candy! Kids love the colors.'
      );

      expect(result.status).toBe('fail');
      expect(result.violations.some(v => v.toLowerCase().includes('minor'))).toBe(true);
    });

    it('minors-002: Fails cartoon character usage', async () => {
      (ai.generate as jest.Mock).mockResolvedValueOnce({
        output: {
          status: 'fail',
          violations: ['Appeal to minors: cartoon character'],
          suggestions: [],
        },
        text: '{"status":"fail","violations":["Appeal to minors: cartoon character"],"suggestions":[]}',
      });

      const result = await deebo.checkContent(
        'IL',
        'email',
        'Our cartoon mascot Budsy the Bear invites you to explore our edibles lineup!'
      );

      expect(result.status).toBe('fail');
    });

    it('minors-003: Passes adult-oriented language', async () => {
      (ai.generate as jest.Mock).mockResolvedValueOnce({
        output: {
          status: 'pass',
          violations: [],
          suggestions: [],
        },
        text: '{"status":"pass","violations":[],"suggestions":[]}',
      });

      const result = await deebo.checkContent(
        'NY',
        'sms',
        'Adults 21+ only. Explore our premium edibles — sophisticated flavors for discerning palates.'
      );

      expect(result.status).toBe('pass');
    });

    it('misleading-001: Fails unverifiable superlative claim', async () => {
      (ai.generate as jest.Mock).mockResolvedValueOnce({
        output: {
          status: 'fail',
          violations: ['False statement: unsubstantiated #1 claim'],
          suggestions: [],
        },
        text: '{"status":"fail","violations":["False statement: unsubstantiated #1 claim"],"suggestions":[]}',
      });

      const result = await deebo.checkContent(
        'NY',
        'email',
        '#1 Rated Dispensary in New York State by every major publication.'
      );

      expect(result.status).toBe('fail');
    });

    it('misleading-002: Passes verifiable award claim', async () => {
      (ai.generate as jest.Mock).mockResolvedValueOnce({
        output: {
          status: 'pass',
          violations: [],
          suggestions: [],
        },
        text: '{"status":"pass","violations":[],"suggestions":[]}',
      });

      const result = await deebo.checkContent(
        'CA',
        'sms',
        'Voted Best Dispensary in Syracuse 2024 by Syracuse.com readers. Stop by and see why!'
      );

      expect(result.status).toBe('pass');
    });

    it('compliant-001: Passes clean SMS with opt-out', async () => {
      (ai.generate as jest.Mock).mockResolvedValueOnce({
        output: {
          status: 'pass',
          violations: [],
          suggestions: [],
        },
        text: '{"status":"pass","violations":[],"suggestions":[]}',
      });

      const result = await deebo.checkContent(
        'NY',
        'sms',
        'New arrivals just dropped at Thrive Syracuse! Pre-rolls, flower, and edibles. 21+ only. Reply STOP to opt-out.'
      );

      expect(result.status).toBe('pass');
    });
  });

  // ===========================================================================
  // 3. FUNCTION TESTS (Age & State Checks)
  // ===========================================================================

  describe('deeboCheckAge', () => {
    const ageTests = goldenSets.test_cases.filter(
      tc => tc.test_type === 'function' && tc.function === 'deeboCheckAge'
    );

    ageTests.forEach(testCase => {
      it(`${testCase.id}: ${testCase.notes}`, () => {
        const { dob, jurisdiction } = testCase.input;
        const result = deeboCheckAge(dob, jurisdiction);

        expect(result.allowed).toBe(testCase.expected_output.allowed);
        expect(result.minAge).toBe(testCase.expected_output.minAge);
      });
    });

    it('age-check-001: Allows 25 year old', () => {
      const result = deeboCheckAge('2000-01-01', 'NY');
      expect(result.allowed).toBe(true);
      expect(result.minAge).toBe(21);
    });

    it('age-check-002: Blocks 14 year old', () => {
      const result = deeboCheckAge('2010-06-15', 'NY');
      expect(result.allowed).toBe(false);
      expect(result.minAge).toBe(21);
    });

    it('age-check-003: Allows exactly 21 today', () => {
      // Calculate date that makes user exactly 21 today
      const today = new Date();
      const dob = new Date(today);
      dob.setFullYear(today.getFullYear() - 21);

      const result = deeboCheckAge(dob, 'NY');
      expect(result.allowed).toBe(true);
      expect(result.minAge).toBe(21);
    });

    it('Blocks user one day under 21', () => {
      const today = new Date();
      const dob = new Date(today);
      dob.setFullYear(today.getFullYear() - 21);
      dob.setDate(dob.getDate() + 1); // One day younger

      const result = deeboCheckAge(dob, 'NY');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Must be 21+');
    });
  });

  describe('deeboCheckStateAllowed', () => {
    const stateTests = goldenSets.test_cases.filter(
      tc => tc.test_type === 'function' && tc.function === 'deeboCheckStateAllowed'
    );

    stateTests.forEach(testCase => {
      it(`${testCase.id}: ${testCase.notes}`, () => {
        const { state } = testCase.input;
        const result = deeboCheckStateAllowed(state);

        expect(result.allowed).toBe(testCase.expected_output.allowed);
      });
    });

    it('state-check-001: Allows NY', () => {
      const result = deeboCheckStateAllowed('NY');
      expect(result.allowed).toBe(true);
    });

    it('state-check-002: Blocks Idaho', () => {
      const result = deeboCheckStateAllowed('ID');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not allowed');
    });

    it('state-check-003: Blocks Kansas', () => {
      const result = deeboCheckStateAllowed('KS');
      expect(result.allowed).toBe(false);
    });

    it('Allows California', () => {
      const result = deeboCheckStateAllowed('CA');
      expect(result.allowed).toBe(true);
    });

    it('Allows Illinois', () => {
      const result = deeboCheckStateAllowed('IL');
      expect(result.allowed).toBe(true);
    });

    it('Blocks Nebraska', () => {
      const result = deeboCheckStateAllowed('NE');
      expect(result.allowed).toBe(false);
    });
  });

  // ===========================================================================
  // 4. RULE PACK TESTS
  // ===========================================================================

  describe('Rule Pack Service', () => {
    it('Returns NY rule pack for retail channel', async () => {
      const rulePack = await deebo.getRulePack('NY', 'retail');

      expect(rulePack).not.toBeNull();
      expect(rulePack!.jurisdiction).toBe('NY');
      expect(rulePack!.rules).toBeDefined();
      expect(rulePack!.rules.length).toBeGreaterThan(0);
    });

    it('Returns CA rule pack for retail channel', async () => {
      const rulePack = await deebo.getRulePack('CA', 'retail');

      expect(rulePack).not.toBeNull();
      expect(rulePack!.jurisdiction).toBe('CA');
      expect(rulePack!.rules.length).toBeGreaterThan(0);
    });

    it('Returns IL rule pack for retail channel', async () => {
      const rulePack = await deebo.getRulePack('IL', 'retail');

      expect(rulePack).not.toBeNull();
      expect(rulePack!.jurisdiction).toBe('IL');
      expect(rulePack!.rules.length).toBeGreaterThan(0);
    });

    it('Falls back to retail pack for SMS channel', async () => {
      const rulePack = await deebo.getRulePack('NY', 'sms');

      expect(rulePack).not.toBeNull();
      expect(rulePack!.jurisdiction).toBe('NY');
      // Should use retail pack rules
      expect(rulePack!.rules.length).toBeGreaterThan(0);
    });

    it('Falls back to retail pack for email channel', async () => {
      const rulePack = await deebo.getRulePack('CA', 'email');

      expect(rulePack).not.toBeNull();
      expect(rulePack!.jurisdiction).toBe('CA');
    });

    it('Returns empty rules for unmapped jurisdiction', async () => {
      const rulePack = await deebo.getRulePack('TX', 'retail');

      expect(rulePack).not.toBeNull();
      expect(rulePack!.jurisdiction).toBe('TX');
      expect(rulePack!.rules).toHaveLength(0);
    });
  });

  // ===========================================================================
  // 5. ERROR HANDLING
  // ===========================================================================

  describe('Error Handling', () => {
    it('Returns fail status when LLM throws error', async () => {
      (ai.generate as jest.Mock).mockRejectedValueOnce(new Error('API timeout'));

      const result = await deebo.checkContent('NY', 'email', 'Test content');

      expect(result.status).toBe('fail');
      expect(result.violations).toContain('Compliance check failed due to system error.');
    });

    it('Handles malformed LLM response gracefully', async () => {
      (ai.generate as jest.Mock).mockResolvedValueOnce({
        output: null,
        text: 'This is not JSON',
      });

      const result = await deebo.checkContent('NY', 'email', 'Test content');

      expect(result.status).toBe('fail');
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('Falls back to text parsing when output is missing', async () => {
      (ai.generate as jest.Mock).mockResolvedValueOnce({
        output: null,
        text: '{"status":"pass","violations":[],"suggestions":[]}',
      });

      const result = await deebo.checkContent('NY', 'email', 'Clean content');

      expect(result.status).toBe('pass');
    });
  });

  // ===========================================================================
  // 6. MULTI-JURISDICTION TESTS
  // ===========================================================================

  describe('Multi-Jurisdiction Support', () => {
    it('Applies NY-specific rules', async () => {
      const result = await deebo.checkContent('NY', 'retail', 'This product cures pain');

      expect(result.status).toBe('fail');
      expect(result.violations.some(v => v.toLowerCase().includes('cure'))).toBe(true);
    });

    it('Applies CA-specific rules', async () => {
      const result = await deebo.checkContent('CA', 'retail', 'Treats anxiety');

      expect(result.status).toBe('fail');
    });

    it('Applies IL-specific rules', async () => {
      const result = await deebo.checkContent('IL', 'retail', 'Prevents inflammation');

      expect(result.status).toBe('fail');
    });
  });

  // ===========================================================================
  // 7. EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('Handles empty content string', async () => {
      const result = await deebo.checkContent('NY', 'email', '');

      expect(result.status).toBeDefined();
      expect(['pass', 'fail', 'warning']).toContain(result.status);
    });

    it('Handles very long content', async () => {
      const longContent = 'Safe cannabis products. '.repeat(500);

      (ai.generate as jest.Mock).mockResolvedValueOnce({
        output: {
          status: 'pass',
          violations: [],
          suggestions: [],
        },
        text: '{"status":"pass","violations":[],"suggestions":[]}',
      });

      const result = await deebo.checkContent('NY', 'email', longContent);

      expect(result.status).toBe('pass');
    });

    it('Handles content with special characters', async () => {
      const result = await deebo.checkContent(
        'NY',
        'email',
        'Special offer! 20% off 🌿 Products. #cannabis #deals'
      );

      expect(result.status).toBeDefined();
    });

    it('Case-insensitive regex matching', async () => {
      const result1 = await deebo.checkContent('NY', 'sms', 'CURES pain');
      const result2 = await deebo.checkContent('NY', 'sms', 'cures pain');
      const result3 = await deebo.checkContent('NY', 'sms', 'CuReS pain');

      expect(result1.status).toBe('fail');
      expect(result2.status).toBe('fail');
      expect(result3.status).toBe('fail');
    });
  });
});
