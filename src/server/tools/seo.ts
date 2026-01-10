import { auditPage, type AuditResult } from '@/server/services/seo-auditor';

export const SeoTools = {
    /**
     * Audits a specific URL for performance, SEO, and accessibility.
     */
    auditUrl: async (url: string, strategy: 'mobile' | 'desktop' = 'mobile') => {
        return await auditPage(url, strategy);
    },

    /**
     * Quick check logic (simpler return type for chat).
     */
    checkRank: async (url: string) => {
        const result = await auditPage(url);
        if ('error' in result) return { success: false, error: result.error };
        
        return {
            success: true,
            score: result.scores.seo * 100,
            metrics: result.metrics,
            topIssue: result.opportunities[0]?.title || 'No major issues'
        };
    }
};
