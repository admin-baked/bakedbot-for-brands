'use server';

/**
 * Competitor History Query Tool for Ezal
 * 
 * Enables chat queries on historical competitive intelligence data:
 * - "What was Competitor X's average deal last week?"
 * - "Who is the discount competitor?"
 * - "What pricing strategy would work best?"
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import {
    getCompetitorSummaries,
    getWeeklySnapshots,
    getLatestSnapshots,
    CompetitorSnapshot,
    SnapshotSummary,
} from '@/server/repos/competitor-snapshots';
import {
    getLatestWeeklyReport,
    WeeklyIntelReport,
} from '@/server/services/ezal/weekly-intel-report';
import { listCompetitors } from '@/server/services/ezal/competitor-manager';

// =============================================================================
// TOOL DEFINITION
// =============================================================================

export const queryCompetitorHistoryTool = ai.defineTool(
    {
        name: 'queryCompetitorHistory',
        description: `Query saved competitive intelligence data. Use for questions like:
- "What was Competitor X's average deal last week?"
- "Who is the discount competitor?"
- "What deals did competitors run?"
- "What pricing strategy works for this market?"

Returns aggregated competitor data, deal history, and market insights.`,
        inputSchema: z.object({
            orgId: z.string().describe('Organization ID to query'),
            competitorName: z.string().optional().describe('Specific competitor to query (optional)'),
            metric: z.enum(['avg_deal', 'pricing_strategy', 'deals', 'all']).default('all')
                .describe('Type of data to retrieve'),
            timeframe: z.enum(['last_week', 'last_month']).default('last_week')
                .describe('Time period for the query'),
        }),
        outputSchema: z.object({
            success: z.boolean(),
            data: z.any().optional(),
            summary: z.string().optional(),
            error: z.string().optional(),
        }),
    },
    async (input) => {
        try {
            logger.info('[Ezal:QueryHistory] Processing query', {
                orgId: input.orgId,
                metric: input.metric,
                competitorName: input.competitorName,
            });

            // Get relevant data based on timeframe
            const daysBack = input.timeframe === 'last_month' ? 30 : 7;
            
            const [summaries, report, competitors] = await Promise.all([
                getCompetitorSummaries(input.orgId, daysBack),
                getLatestWeeklyReport(input.orgId),
                listCompetitors(input.orgId, { active: true }),
            ]);

            // Filter by competitor name if specified
            let filteredSummaries = summaries;
            if (input.competitorName) {
                const nameLower = input.competitorName.toLowerCase();
                filteredSummaries = summaries.filter(s => 
                    s.competitorName.toLowerCase().includes(nameLower)
                );
            }

            // Build response based on metric
            let data: any;
            let summary: string;

            switch (input.metric) {
                case 'avg_deal':
                    data = filteredSummaries.map(s => ({
                        competitor: s.competitorName,
                        avgDealPrice: `$${s.avgDealPrice.toFixed(2)}`,
                        totalDeals: s.totalDeals,
                        period: input.timeframe,
                    }));
                    summary = formatAvgDealSummary(filteredSummaries);
                    break;

                case 'pricing_strategy':
                    data = report?.competitors.map(c => ({
                        competitor: c.competitorName,
                        strategy: c.priceStrategy,
                        avgDealPrice: `$${c.avgDealPrice.toFixed(2)}`,
                    })) || [];
                    summary = formatPricingStrategySummary(report);
                    break;

                case 'deals':
                    data = report?.insights.topDeals || [];
                    summary = formatDealsSummary(report);
                    break;

                case 'all':
                default:
                    data = {
                        competitors: filteredSummaries,
                        report: report ? {
                            generatedAt: report.generatedAt,
                            insights: report.insights,
                            totalDealsTracked: report.totalDealsTracked,
                        } : null,
                    };
                    summary = formatFullSummary(filteredSummaries, report);
                    break;
            }

            logger.info('[Ezal:QueryHistory] Query complete', {
                orgId: input.orgId,
                resultCount: Array.isArray(data) ? data.length : 1,
            });

            return {
                success: true,
                data,
                summary,
            };
        } catch (error) {
            logger.error('[Ezal:QueryHistory] Query failed', { error });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to query competitor history',
            };
        }
    }
);

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

function formatAvgDealSummary(summaries: SnapshotSummary[]): string {
    if (summaries.length === 0) {
        return 'No competitor data available for this period.';
    }

    const lines = summaries.map(s => 
        `• **${s.competitorName}**: Average deal price $${s.avgDealPrice.toFixed(2)} (${s.totalDeals} deals tracked)`
    );

    return `**Average Deal Prices (Last 7 Days)**\n\n${lines.join('\n')}`;
}

function formatPricingStrategySummary(report: WeeklyIntelReport | null): string {
    if (!report?.competitors) {
        return 'No pricing strategy data available. Weekly report not yet generated.';
    }

    const strategies = report.competitors.map(c => {
        const strategyEmoji = {
            discount: '💰',
            premium: '⭐',
            competitive: '⚖️',
            unknown: '❓',
        }[c.priceStrategy];
        
        return `• **${c.competitorName}**: ${strategyEmoji} ${c.priceStrategy.toUpperCase()} (avg $${c.avgDealPrice.toFixed(2)})`;
    });

    return `**Competitor Pricing Strategies**\n\n${strategies.join('\n')}`;
}

function formatDealsSummary(report: WeeklyIntelReport | null): string {
    if (!report?.insights.topDeals?.length) {
        return 'No deals tracked this period.';
    }

    const deals = report.insights.topDeals.slice(0, 5).map(d => 
        `• ${d.competitorName}: "${d.dealName}" at $${d.price}${d.discount ? ` (${d.discount})` : ''}`
    );

    return `**Top Deals This Week**\n\n${deals.join('\n')}`;
}

function formatFullSummary(
    summaries: SnapshotSummary[],
    report: WeeklyIntelReport | null
): string {
    const parts: string[] = [];

    if (summaries.length > 0) {
        parts.push(`📊 **Tracking ${summaries.length} competitors**`);
        
        const totalDeals = summaries.reduce((sum, s) => sum + s.totalDeals, 0);
        parts.push(`• Total deals tracked: ${totalDeals}`);
        
        const avgPrice = summaries.reduce((sum, s) => sum + s.avgDealPrice, 0) / summaries.length;
        parts.push(`• Market average deal price: $${avgPrice.toFixed(2)}`);
    }

    if (report) {
        parts.push('');
        parts.push('**Latest Weekly Report Insights:**');
        
        if (report.insights.recommendations?.length) {
            parts.push(`• ${report.insights.recommendations[0]}`);
        }
        
        if (report.insights.marketTrends?.length) {
            parts.push(`• ${report.insights.marketTrends[0]}`);
        }
    }

    return parts.length > 0 
        ? parts.join('\n') 
        : 'No competitive intelligence data available yet. Competitor discovery runs daily.';
}

// =============================================================================
// EXPORT FOR AGENT TOOLS
// =============================================================================

export default queryCompetitorHistoryTool;
