import {
  deebo,
  RulePackService,
  deeboCheckAge,
  deeboCheckStateAllowed,
  deeboCheckMessage,
  deeboCheckCheckout,
  ComplianceResultSchema,
} from '@/server/agents/deebo';
import { ai } from '@/ai/genkit';
import { logger } from '@/lib/logger';

jest.mock('@/ai/genkit');
jest.mock('@/lib/logger');

// Mock rule packs
jest.mock('@/server/agents/rules/wa-retail.json', () => ({
  jurisdiction: 'WA',
  channel: 'retail',
  version: 1,
  status: 'passing',
  rules: [
    { type: 'regex', pattern: 'cure', description: 'Medical claim: cure' },
  ],
}));

jest.mock('@/server/agents/rules/ny-retail.json', () => ({
  jurisdiction: 'NY',
  channel: 'retail',
  version: 1,
  status: 'passing',
  rules: [
    { type: 'regex', pattern: 'guaranteed relief', description: 'Medical claim: guaranteed relief' },
    { type: 'regex', pattern: 'heal', description: 'Medical claim: heal' },
  ],
}));

jest.mock('@/server/agents/rules/ca-retail.json', () => ({
  jurisdiction: 'CA',
  channel: 'retail',
  version: 1,
  status: 'passing',
  rules: [
    { type: 'regex', pattern: 'treat.*disease', description: 'Medical claim: treat disease' },
  ],
}));

jest.mock('@/server/agents/rules/il-retail.json', () => ({
  jurisdiction: 'IL',
  channel: 'retail',
  version: 1,
  status: 'passing',
  rules: [
    { type: 'regex', pattern: 'prevent.*illness', description: 'Medical claim: prevent illness' },
  ],
}));

describe('Deebo Compliance Rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RulePackService.getRulePack', () => {
    it('returns NY retail rules for NY:retail lookup', async () => {
      const rulePack = await RulePackService.getRulePack('NY', 'retail');

      expect(rulePack).toBeDefined();
      expect(rulePack?.jurisdiction).toBe('NY');
      expect(rulePack?.rules).toHaveLength(2);
    });

    it('returns CA retail rules for CA:retail lookup', async () => {
      const rulePack = await RulePackService.getRulePack('CA', 'retail');

      expect(rulePack).toBeDefined();
      expect(rulePack?.jurisdiction).toBe('CA');
      expect(rulePack?.rules).toHaveLength(1);
    });

    it('returns WA retail rules for WA:retail lookup', async () => {
      const rulePack = await RulePackService.getRulePack('WA', 'retail');

      expect(rulePack).toBeDefined();
      expect(rulePack?.jurisdiction).toBe('WA');
    });

    it('returns IL retail rules for IL:retail lookup', async () => {
      const rulePack = await RulePackService.getRulePack('IL', 'retail');

      expect(rulePack).toBeDefined();
      expect(rulePack?.jurisdiction).toBe('IL');
    });

    it('falls back to retail pack for advertising channel', async () => {
      const rulePack = await RulePackService.getRulePack('NY', 'advertising');

      expect(rulePack).toBeDefined();
      expect(rulePack?.rules).toBeDefined(); // Should have NY retail rules
    });

    it('returns empty rule pack for unmapped jurisdiction', async () => {
      const rulePack = await RulePackService.getRulePack('TX', 'retail');

      expect(rulePack).toBeDefined();
      expect(rulePack?.rules).toEqual([]); // Empty rules for unmapped
      expect(rulePack?.jurisdiction).toBe('TX');
    });
  });

  describe('deebo.checkContent - Regex Fast Path', () => {
    it('fails with NY rule violation for "guaranteed relief"', async () => {
      const result = await deebo.checkContent('NY', 'retail', 'Use our product for guaranteed relief');

      expect(result.status).toBe('fail');
      expect(result.violations).toContain(expect.stringContaining('guaranteed relief'));
    });

    it('fails with CA rule violation for "treat disease"', async () => {
      const result = await deebo.checkContent('CA', 'retail', 'This product can treat disease');

      expect(result.status).toBe('fail');
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('fails with IL rule violation for "prevent illness"', async () => {
      const result = await deebo.checkContent('IL', 'retail', 'Prevent illness with our CBD');

      expect(result.status).toBe('fail');
      expect(result.violations).toContain(expect.stringContaining('prevent illness'));
    });

    it('fails with WA rule violation for "cure"', async () => {
      const result = await deebo.checkContent('WA', 'retail', 'Cure your pain naturally');

      expect(result.status).toBe('fail');
      expect(result.violations).toContain(expect.stringContaining('cure'));
    });

    it('returns fail immediately on regex violation (no LLM call)', async () => {
      const result = await deebo.checkContent('NY', 'retail', 'guaranteed relief');

      expect(result.status).toBe('fail');
      expect(ai.generate).not.toHaveBeenCalled(); // Should not call LLM
    });

    it('case-insensitive regex matching', async () => {
      const result = await deebo.checkContent('NY', 'retail', 'GUARANTEED RELIEF');

      expect(result.status).toBe('fail');
    });

    it('handles multiple violations in single content', async () => {
      const result = await deebo.checkContent('NY', 'retail', 'guaranteed relief and heal your pain');

      expect(result.status).toBe('fail');
      expect(result.violations.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('deebo.checkContent - LLM Semantic Fallback', () => {
    it('calls LLM for content without regex violations', async () => {
      (ai.generate as jest.Mock).mockResolvedValue({
        output: { status: 'pass', violations: [], suggestions: [] },
      });

      const result = await deebo.checkContent('NY', 'retail', 'Buy our product today');

      expect(ai.generate).toHaveBeenCalled();
      expect(result.status).toBe('pass');
    });

    it('uses gemini-2.5-pro model for compliance checking', async () => {
      (ai.generate as jest.Mock).mockResolvedValue({
        output: { status: 'pass', violations: [], suggestions: [] },
      });

      await deebo.checkContent('NY', 'retail', 'Clean content');

      expect(ai.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'googleai/gemini-2.5-pro',
        })
      );
    });

    it('returns LLM result when structured output provided', async () => {
      const llmResult = { status: 'fail', violations: ['Claim about benefits'], suggestions: [] };

      (ai.generate as jest.Mock).mockResolvedValue({
        output: llmResult,
      });

      const result = await deebo.checkContent('NY', 'retail', 'Subtle medical claim');

      expect(result).toEqual(llmResult);
    });

    it('falls back to JSON parsing when output not structured', async () => {
      const llmResult = { status: 'warning', violations: ['Minor issue'], suggestions: ['Check wording'] };

      (ai.generate as jest.Mock).mockResolvedValue({
        output: null,
        text: JSON.stringify(llmResult),
      });

      const result = await deebo.checkContent('NY', 'retail', 'Content');

      expect(result.status).toBe('warning');
      expect(result.violations).toContain('Minor issue');
    });

    it('fails safe on LLM error', async () => {
      (ai.generate as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await deebo.checkContent('NY', 'retail', 'Content');

      expect(result.status).toBe('fail');
      expect(result.violations).toContain('Compliance check failed due to system error');
    });

    it('logs error when LLM fails', async () => {
      (ai.generate as jest.Mock).mockRejectedValue(new Error('Network error'));

      await deebo.checkContent('NY', 'retail', 'Content');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[Deebo] Genkit Error'),
        expect.any(Object)
      );
    });
  });

  describe('deeboCheckAge', () => {
    it('blocks users under 21', () => {
      const birthDate = new Date(Date.now() - 15 * 365 * 24 * 60 * 60 * 1000); // 15 years ago

      const result = deeboCheckAge(birthDate, 'NY');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('21+');
    });

    it('allows users exactly 21 years old', () => {
      const birthDate = new Date(Date.now() - 21 * 365 * 24 * 60 * 60 * 1000);

      const result = deeboCheckAge(birthDate, 'NY');

      expect(result.allowed).toBe(true);
      expect(result.minAge).toBe(21);
    });

    it('allows users over 21', () => {
      const birthDate = new Date(Date.now() - 30 * 365 * 24 * 60 * 60 * 1000); // 30 years ago

      const result = deeboCheckAge(birthDate, 'NY');

      expect(result.allowed).toBe(true);
    });

    it('accepts string date format', () => {
      const birthDate = new Date(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000);

      const result = deeboCheckAge(birthDate.toISOString(), 'NY');

      expect(result.allowed).toBe(true);
    });

    it('returns minAge: 21', () => {
      const result = deeboCheckAge(new Date(), 'NY');

      expect(result.minAge).toBe(21);
    });
  });

  describe('deeboCheckStateAllowed', () => {
    it('blocks Idaho', () => {
      const result = deeboCheckStateAllowed('ID');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not allowed');
    });

    it('blocks Nebraska', () => {
      const result = deeboCheckStateAllowed('NE');

      expect(result.allowed).toBe(false);
    });

    it('blocks Kansas', () => {
      const result = deeboCheckStateAllowed('KS');

      expect(result.allowed).toBe(false);
    });

    it('allows New York', () => {
      const result = deeboCheckStateAllowed('NY');

      expect(result.allowed).toBe(true);
    });

    it('allows California', () => {
      const result = deeboCheckStateAllowed('CA');

      expect(result.allowed).toBe(true);
    });

    it('allows Washington', () => {
      const result = deeboCheckStateAllowed('WA');

      expect(result.allowed).toBe(true);
    });

    it('allows Illinois', () => {
      const result = deeboCheckStateAllowed('IL');

      expect(result.allowed).toBe(true);
    });

    it('allows Colorado', () => {
      const result = deeboCheckStateAllowed('CO');

      expect(result.allowed).toBe(true);
    });

    it('blocks all 3 prohibited states', () => {
      const blocked = ['ID', 'NE', 'KS'];
      blocked.forEach((state) => {
        const result = deeboCheckStateAllowed(state);
        expect(result.allowed).toBe(false);
      });
    });
  });

  describe('deeboCheckMessage', () => {
    it('returns ok: true for passing content', async () => {
      (ai.generate as jest.Mock).mockResolvedValue({
        output: { status: 'pass', violations: [], suggestions: [] },
      });

      const result = await deeboCheckMessage({
        orgId: 'org-1',
        channel: 'retail',
        stateCode: 'NY',
        content: 'Buy our product today',
      });

      expect(result.ok).toBe(true);
    });

    it('returns ok: false for failing content', async () => {
      const result = await deeboCheckMessage({
        orgId: 'org-1',
        channel: 'retail',
        stateCode: 'NY',
        content: 'guaranteed relief',
      });

      expect(result.ok).toBe(false);
    });

    it('includes violations in reason field', async () => {
      const result = await deeboCheckMessage({
        orgId: 'org-1',
        channel: 'retail',
        stateCode: 'NY',
        content: 'guaranteed relief and heal',
      });

      expect(result.reason).toContain('guaranteed relief');
    });

    it('joins multiple violations with comma separator', async () => {
      const result = await deeboCheckMessage({
        orgId: 'org-1',
        channel: 'retail',
        stateCode: 'NY',
        content: 'guaranteed relief AND heal everything',
      });

      expect(result.reason).toContain(',');
    });

    it('accepts all required params', async () => {
      (ai.generate as jest.Mock).mockResolvedValue({
        output: { status: 'pass', violations: [], suggestions: [] },
      });

      const result = await deeboCheckMessage({
        orgId: 'org-test-123',
        channel: 'email',
        stateCode: 'CA',
        content: 'Clean content',
      });

      expect(result).toBeDefined();
    });
  });

  describe('deeboCheckCheckout', () => {
    it('returns allowed: true', () => {
      const result = deeboCheckCheckout({});

      expect(result.allowed).toBe(true);
    });

    it('returns empty violations array', () => {
      const result = deeboCheckCheckout({});

      expect(result.violations).toEqual([]);
    });

    it('returns empty warnings array', () => {
      const result = deeboCheckCheckout({});

      expect(result.warnings).toEqual([]);
    });

    it('returns empty errors array', () => {
      const result = deeboCheckCheckout({});

      expect(result.errors).toEqual([]);
    });

    it('accepts any cart shape', () => {
      const result = deeboCheckCheckout({ items: [], total: 0 });

      expect(result.allowed).toBe(true);
    });
  });

  describe('Compliance Result Schema Validation', () => {
    it('validates pass status result', () => {
      const result = { status: 'pass', violations: [], suggestions: [] };

      const validation = ComplianceResultSchema.safeParse(result);

      expect(validation.success).toBe(true);
    });

    it('validates fail status result', () => {
      const result = { status: 'fail', violations: ['Violation 1'], suggestions: ['Fix it'] };

      const validation = ComplianceResultSchema.safeParse(result);

      expect(validation.success).toBe(true);
    });

    it('validates warning status result', () => {
      const result = { status: 'warning', violations: [], suggestions: ['Review'] };

      const validation = ComplianceResultSchema.safeParse(result);

      expect(validation.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = { status: 'maybe', violations: [], suggestions: [] } as any;

      const validation = ComplianceResultSchema.safeParse(result);

      expect(validation.success).toBe(false);
    });

    it('requires violations array', () => {
      const result = { status: 'pass', suggestions: [] } as any;

      const validation = ComplianceResultSchema.safeParse(result);

      expect(validation.success).toBe(false);
    });

    it('requires suggestions array', () => {
      const result = { status: 'pass', violations: [] } as any;

      const validation = ComplianceResultSchema.safeParse(result);

      expect(validation.success).toBe(false);
    });
  });

  describe('Integration: Full compliance check flow', () => {
    it('blocks NY medical claim, allows clean content', async () => {
      // Medical claim — fail via regex
      const badResult = await deebo.checkContent('NY', 'retail', 'guaranteed relief');
      expect(badResult.status).toBe('fail');

      // Clean content — pass via LLM
      (ai.generate as jest.Mock).mockResolvedValue({
        output: { status: 'pass', violations: [], suggestions: [] },
      });

      const goodResult = await deebo.checkContent('NY', 'retail', 'Quality hemp products');
      expect(goodResult.status).toBe('pass');
    });

    it('age gate + state gate + content gate', () => {
      // User check
      const ageCheck = deeboCheckAge(new Date(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000), 'NY');
      expect(ageCheck.allowed).toBe(true);

      // State check
      const stateCheck = deeboCheckStateAllowed('NY');
      expect(stateCheck.allowed).toBe(true);

      // (Content checked separately)
    });
  });
});
