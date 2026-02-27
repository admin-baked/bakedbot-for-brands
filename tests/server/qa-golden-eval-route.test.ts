import { parseEvalOutput } from '@/app/api/cron/qa-golden-eval/route';

describe('qa-golden-eval parseEvalOutput', () => {
    it('treats unknown non-zero exits as failures (fail-closed)', () => {
        const result = parseEvalOutput('', 'deebo', 'fast', 'ETIMEDOUT');

        expect(result.complianceFailed).toBe(false);
        expect(result.belowThreshold).toBe(true);
        expect(result.passed).toBe(0);
        expect(result.failed).toBe(1);
        expect(result.total).toBe(1);
    });

    it('flags compliance failure when exit code is 1', () => {
        const result = parseEvalOutput('Passed: 9/10 Score: 90% Threshold: 90%', 'deebo', 'fast', 1);

        expect(result.complianceFailed).toBe(true);
        expect(result.belowThreshold).toBe(false);
        expect(result.passed).toBe(9);
        expect(result.failed).toBe(1);
    });

    it('parses successful output when exit code is 0', () => {
        const result = parseEvalOutput('Passed: 10/10 Score: 100% Threshold: 100%', 'deebo', 'fast', 0);

        expect(result.complianceFailed).toBe(false);
        expect(result.belowThreshold).toBe(false);
        expect(result.passed).toBe(10);
        expect(result.failed).toBe(0);
        expect(result.total).toBe(10);
        expect(result.score).toBe(100);
        expect(result.threshold).toBe(100);
    });
});
