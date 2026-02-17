'use server';

/**
 * Competitive Pricing Intelligence Actions
 *
 * Server actions for fetching competitive intelligence reports from Drive
 * and providing pricing recommendations based on market data.
 */

import { createServerClient } from '@/firebase/server-client';
import { getDriveStorageService } from '@/server/services/drive-storage';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface PricingRecommendation {
    category: string;
    competitorAvg: number;
    marketPosition: 'above' | 'below' | 'competitive';
    opportunity: string;
    suggestedAction: string;
    priority: 'high' | 'medium' | 'low';
}

export interface MarketTrend {
    trend: string;
    impact: 'positive' | 'negative' | 'neutral';
}

export interface CompetitiveIntelSummary {
    reportId: string;
    generatedAt: Date;
    competitorsTracked: number;
    totalDeals: number;
    topDeal: {
        competitor: string;
        deal: string;
        price: number;
    } | null;
    pricingRecommendations: PricingRecommendation[];
    marketTrends: MarketTrend[];
    recommendations: string[];
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Get latest competitive intelligence summary for pricing dashboard
 */
export async function getLatestCompetitiveIntel(
    orgId: string
): Promise<{ success: boolean; data?: CompetitiveIntelSummary; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const driveService = getDriveStorageService();

        // Get latest report reference from Firestore
        const reportsSnapshot = await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('competitive_intel_drive_files')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (reportsSnapshot.empty) {
            return {
                success: false,
                error: 'No competitive intelligence reports found. Reports are generated weekly.'
            };
        }

        const latestReportDoc = reportsSnapshot.docs[0];
        const driveFileData = latestReportDoc.data();
        const storagePath = driveFileData?.storagePath;
        const reportId = driveFileData?.reportId;

        if (!storagePath) {
            return { success: false, error: 'Drive storage path not found' };
        }

        // Download markdown report from Drive
        const downloadResult = await driveService.downloadFile(storagePath);

        if (!downloadResult.success || !downloadResult.buffer) {
            return { success: false, error: downloadResult.error || 'Failed to download report' };
        }

        // Parse markdown to extract structured data
        const markdown = downloadResult.buffer.toString('utf-8');
        const summary = parseCompetitiveIntelReport(markdown, reportId, driveFileData?.createdAt);

        logger.info('[CompetitivePricing] Fetched latest intel summary', {
            orgId,
            reportId,
            competitorsTracked: summary.competitorsTracked
        });

        return { success: true, data: summary };

    } catch (error) {
        logger.error('[CompetitivePricing] Failed to fetch competitive intel', { error, orgId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch competitive intelligence'
        };
    }
}

/**
 * Get pricing recommendations based on competitive intelligence
 */
export async function getPricingRecommendations(
    orgId: string
): Promise<{ success: boolean; recommendations?: PricingRecommendation[]; error?: string }> {
    const result = await getLatestCompetitiveIntel(orgId);

    if (!result.success || !result.data) {
        return { success: false, error: result.error };
    }

    return {
        success: true,
        recommendations: result.data.pricingRecommendations
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse markdown report to extract structured intelligence data
 */
function parseCompetitiveIntelReport(
    markdown: string,
    reportId: string,
    createdAt: any
): CompetitiveIntelSummary {
    const lines = markdown.split('\n');

    // Extract executive summary stats
    let competitorsTracked = 0;
    let totalDeals = 0;

    for (const line of lines) {
        if (line.includes('**Competitors Tracked:**')) {
            competitorsTracked = parseInt(line.match(/\d+/)?.[0] || '0');
        }
        if (line.includes('**Deals Tracked:**')) {
            totalDeals = parseInt(line.match(/\d+/)?.[0] || '0');
        }
    }

    // Extract top deal from table
    let topDeal: CompetitiveIntelSummary['topDeal'] = null;
    const topDealsIndex = lines.findIndex(l => l.includes('## Top 10 Deals'));
    if (topDealsIndex !== -1) {
        // Skip header and separator lines
        const firstDealLine = lines[topDealsIndex + 3];
        if (firstDealLine) {
            const parts = firstDealLine.split('|').map(p => p.trim()).filter(Boolean);
            if (parts.length >= 3) {
                topDeal = {
                    competitor: parts[0],
                    deal: parts[1],
                    price: parseFloat(parts[2].replace('$', '')) || 0
                };
            }
        }
    }

    // Extract pricing gaps and opportunities
    const pricingRecommendations: PricingRecommendation[] = [];
    const pricingGapsIndex = lines.findIndex(l => l.includes('## Pricing Gaps'));
    if (pricingGapsIndex !== -1) {
        let currentCategory = '';
        let competitorAvg = 0;
        let marketPosition: PricingRecommendation['marketPosition'] = 'competitive';
        let opportunity = '';

        for (let i = pricingGapsIndex + 1; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('## ')) break; // Next section

            if (line.startsWith('### ')) {
                currentCategory = line.replace('###', '').trim();
            }

            if (line.includes('**Competitor Average:**')) {
                const match = line.match(/\$(\d+\.?\d*)/);
                competitorAvg = match ? parseFloat(match[1]) : 0;
            }

            if (line.includes('**Market Position:**')) {
                const position = line.split(':')[1]?.trim().toLowerCase();
                if (position?.includes('above')) marketPosition = 'above';
                else if (position?.includes('below')) marketPosition = 'below';
                else marketPosition = 'competitive';
            }

            if (line.includes('**Opportunity:**')) {
                opportunity = line.split(':')[1]?.trim() || '';

                // Add recommendation when we have all data
                if (currentCategory && competitorAvg > 0) {
                    pricingRecommendations.push({
                        category: currentCategory,
                        competitorAvg,
                        marketPosition,
                        opportunity,
                        suggestedAction: determineSuggestedAction(marketPosition, opportunity),
                        priority: determinePriority(marketPosition, competitorAvg)
                    });
                }

                // Reset for next category
                currentCategory = '';
                competitorAvg = 0;
                marketPosition = 'competitive';
                opportunity = '';
            }
        }
    }

    // Extract market trends
    const marketTrends: MarketTrend[] = [];
    const trendsIndex = lines.findIndex(l => l.includes('## Market Trends'));
    if (trendsIndex !== -1) {
        for (let i = trendsIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('## ')) break; // Next section
            if (line.startsWith('- ')) {
                const trend = line.substring(2).trim();
                marketTrends.push({
                    trend,
                    impact: determineTrendImpact(trend)
                });
            }
        }
    }

    // Extract recommendations
    const recommendations: string[] = [];
    const recsIndex = lines.findIndex(l => l.includes('## Recommendations'));
    if (recsIndex !== -1) {
        for (let i = recsIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('## ') || line.startsWith('---')) break;
            if (line.startsWith('- ')) {
                recommendations.push(line.substring(2).trim());
            }
        }
    }

    return {
        reportId,
        generatedAt: createdAt?.toDate?.() || new Date(),
        competitorsTracked,
        totalDeals,
        topDeal,
        pricingRecommendations,
        marketTrends,
        recommendations
    };
}

/**
 * Determine suggested action based on market position
 */
function determineSuggestedAction(
    position: PricingRecommendation['marketPosition'],
    opportunity: string
): string {
    if (position === 'above') {
        return 'Consider lowering prices to match competitor average';
    }
    if (position === 'below') {
        return 'You have pricing advantage - maintain or slightly increase';
    }
    if (opportunity.toLowerCase().includes('increase')) {
        return 'Market allows for price increase';
    }
    if (opportunity.toLowerCase().includes('match')) {
        return 'Match competitor pricing to stay competitive';
    }
    return 'Monitor market and maintain current pricing';
}

/**
 * Determine priority based on market position and price
 */
function determinePriority(
    position: PricingRecommendation['marketPosition'],
    competitorAvg: number
): PricingRecommendation['priority'] {
    if (position === 'above' && competitorAvg < 20) {
        return 'high'; // Significant undercutting on low-price items
    }
    if (position === 'above') {
        return 'medium'; // Need to adjust pricing
    }
    if (position === 'below') {
        return 'low'; // Competitive advantage
    }
    return 'medium';
}

/**
 * Determine trend impact (positive/negative/neutral)
 */
function determineTrendImpact(trend: string): MarketTrend['impact'] {
    const trendLower = trend.toLowerCase();

    if (trendLower.includes('heavy discounting') || trendLower.includes('price war')) {
        return 'negative';
    }
    if (trendLower.includes('premium') || trendLower.includes('stable')) {
        return 'positive';
    }
    return 'neutral';
}
