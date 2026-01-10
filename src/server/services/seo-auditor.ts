/**
 * SEO Auditor Service (Google PageSpeed Insights)
 * 
 * Capability: Audit page performance, accessibility, SEO, and best practices.
 * 
 * API Docs: https://developers.google.com/speed/docs/insights/v5/get-started
 */

import { logger } from '@/lib/logger';

const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export interface AuditResult {
    url: string;
    scores: {
        performance: number;
        accessibility: number;
        bestPractices: number;
        seo: number;
    };
    metrics: {
        fcp: string; // First Contentful Paint
        lcp: string; // Largest Contentful Paint
        cls: string; // Cumulative Layout Shift
    };
    opportunities: Array<{
        title: string;
        savings: string;
        description: string;
    }>;
}

export async function auditPage(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<AuditResult | { error: string }> {
    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY; // Optional but recommended
    
    // Construct URL with categories
    let apiUrl = `${PSI_API_URL}?url=${encodeURIComponent(url)}&strategy=${strategy}`;
    apiUrl += '&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO';
    
    if (apiKey) {
        apiUrl += `&key=${apiKey}`;
    }

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`PSI API error: ${response.status}`);
        }
        
        const data = await response.json();
        const lighthouse = data.lighthouseResult;
        
        if (!lighthouse) {
            return { error: 'No lighthouse data returned' };
        }

        const cats = lighthouse.categories;
        const audits = lighthouse.audits;
        
        return {
            url,
            scores: {
                performance: cats.performance?.score || 0,
                accessibility: cats.accessibility?.score || 0,
                bestPractices: cats['best-practices']?.score || 0,
                seo: cats.seo?.score || 0
            },
            metrics: {
                fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
                lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
                cls: audits['cumulative-layout-shift']?.displayValue || 'N/A'
            },
            opportunities: [
                 // Grab top 3 opportunities
                 ...(Object.values(audits) as any[])
                    .filter(a => a.details?.type === 'opportunity' && a.score < 0.9)
                    .sort((a, b) => (a.score || 0) - (b.score || 0))
                    .slice(0, 3)
                    .map(a => ({
                        title: a.title,
                        savings: a.displayValue || '',
                        description: a.description
                    }))
            ]
        };
    } catch (e) {
        logger.error(`[SeoAuditor] Audit failed for ${url}: ${(e as Error).message}`);
        return { error: (e as Error).message };
    }
}
