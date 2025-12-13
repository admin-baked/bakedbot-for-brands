
import { deebo, RulePackService } from '@/server/agents/deebo';
import { analyzeExperiment } from '@/server/algorithms/pops-algo';
import * as rules from '@/server/agents/rules/wa-retail.json';

// Mock AI to avoid real genkit calls in tests
jest.mock('@/ai/genkit', () => ({
    ai: {
        generate: jest.fn().mockResolvedValue({
            output: {
                status: 'fail',
                violations: ['Mock violation'],
                suggestions: []
            }
        })
    }
}));

describe('Phase 4: Optimization & Governance', () => {

    describe('Deebo: Rule Packs', () => {
        it('should load WA retail rules correctly', async () => {
            const pack = await RulePackService.getRulePack('WA', 'retail');
            expect(pack).not.toBeNull();
            expect(pack?.jurisdiction).toBe('WA');
            expect(pack?.rules.length).toBeGreaterThan(0);
        });

        it('should return null/mock for unknown jurisdictions', async () => {
            const pack = await RulePackService.getRulePack('Mars', 'retail');
            // Our mock implementation returns a safe fallback, not null
            expect(pack?.jurisdiction).toBe('Mars');
            expect(pack?.rules.length).toBe(0);
        });

        it('should validate using Regex rules (fast path)', async () => {
            // "cure cancer" should trigger the regex rule in wa-retail.json
            const result = await deebo.checkContent(
                'WA',
                'retail',
                'This product will cure your cancer immediately.'
            );

            expect(result.status).toBe('fail');
            expect(result.violations[0]).toMatch(/unapproved medical claims/i);
        });
    });

    describe('Pops: Experiment Analytics', () => {
        it('should identify significant stats (Winner)', () => {
            // Control: 1000 visits, 100 conversions (10%)
            // Treatment: 1000 visits, 150 conversions (15%)
            const stats = analyzeExperiment(
                { visitors: 1000, conversions: 100 },
                { visitors: 1000, conversions: 150 }
            );

            expect(stats.lift).toBeCloseTo(0.5, 1); // 50% lift ((15-10)/10)
            expect(stats.isSignificant).toBe(true);
            expect(stats.confidence).toBeGreaterThan(0.95);
        });

        it('should identify insignificant stats (Noise)', () => {
            // Control: 1000 visits, 100 conversions (10%)
            // Treatment: 1000 visits, 102 conversions (10.2%)
            const stats = analyzeExperiment(
                { visitors: 1000, conversions: 100 },
                { visitors: 1000, conversions: 102 }
            );

            expect(stats.lift).toBeCloseTo(0.02, 1);
            expect(stats.isSignificant).toBe(false);
            expect(stats.confidence).toBeLessThan(0.90);
        });
    });
});
