const { extractQAGoldenEvalFailures } = require('../qa-golden-eval-runs');

describe('extractQAGoldenEvalFailures', () => {
    it('extracts failing test ids and summaries from golden eval stdout', () => {
        const result = extractQAGoldenEvalFailures(`
  ❌ SMK-001                    Forbidden terms: [medical claim]
  💥 CRG-004                    Score 40% below 65% threshold
  ✅ SMK-002
        `);

        expect(result.failingTestIds).toEqual(['SMK-001', 'CRG-004']);
        expect(result.failureSummaries).toEqual([
            'SMK-001: Forbidden terms: [medical claim]',
            'CRG-004: Score 40% below 65% threshold',
        ]);
    });

    it('returns empty arrays when stdout has no failure rows', () => {
        const result = extractQAGoldenEvalFailures('✅ PASSED — all thresholds met.');

        expect(result).toEqual({
            failingTestIds: [],
            failureSummaries: [],
        });
    });
});
