import { SeoTools } from '@/server/tools/seo';
import { auditPage } from '@/server/services/seo-auditor';

jest.mock('@/server/services/seo-auditor', () => ({
    auditPage: jest.fn()
}));

describe('SeoTools', () => {
    describe('checkRank', () => {
        it('should return simplified successful result', async () => {
            (auditPage as jest.Mock).mockResolvedValue({
                url: 'https://example.com',
                scores: { seo: 0.9, performance: 0.8, accessibility: 0.8, bestPractices: 0.8 },
                metrics: { lcp: '1s', cls: '0.1', fcp: '0.5s' },
                opportunities: [{ title: 'Fix images' }]
            });

            const result = await SeoTools.checkRank('https://example.com');

            expect(result.success).toBe(true);
            expect(result.score).toBe(90); // 0.9 * 100
            expect(result.topIssue).toBe('Fix images');
        });

        it('should handle errors', async () => {
            (auditPage as jest.Mock).mockResolvedValue({ error: 'Audit failed' });

            const result = await SeoTools.checkRank('https://example.com');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Audit failed');
        });
    });
});
