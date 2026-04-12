export const dynamic = 'force-dynamic';
/**
 * Competitive Intelligence Cron Endpoint
 *
 * POST /api/cron/competitive-intel
 *
 * Triggers the daily competitive intelligence report for a specific org.
 * Generates report covering up to 10 competitors with price changes, new products, and menu shakeups.
 * Delivers via email and dashboard inbox. Automatically enrolls user in playbook.
 * Bypasses the playbook system for reliability.
 *
 * Usage:
 * - Cloud Scheduler: daily at 7 AM (configurable per org)
 * - Manual: curl with CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshCompetitiveIntelWorkspace } from '@/server/services/ezal';
import { PriceMatchInsightsGenerator } from '@/server/services/insights/generators/price-match-insights-generator';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import {
  ingestCompetitiveIntelKnowledge,
  generateKnowledgeAlerts,
  promoteRuntimeKnowledgeToLetta,
} from '@/server/services/knowledge-engine';

export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) { return POST(request); }

export async function POST(request: NextRequest) {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { orgId } = body;

        if (!orgId) {
            return NextResponse.json(
                { error: 'Missing required field: orgId' },
                { status: 400 }
            );
        }

        logger.info('[CompetitiveIntelCron] Starting competitive intel refresh', { orgId });

        const result = await refreshCompetitiveIntelWorkspace(orgId, { force: false, maxSources: 12 });

        logger.info('[CompetitiveIntelCron] Refresh completed successfully', {
            orgId,
            reportId: result.report?.id,
            sourcesRun: result.sourcesRun,
            snapshots: result.report?.totalSnapshots,
            deals: result.report?.totalDealsTracked,
        });

        // Generate price match opportunities card (Ezal's flagship feature)
        const priceMatchCount = await new PriceMatchInsightsGenerator(orgId).generate();

        logger.info('[CompetitiveIntelCron] Price match opportunities generated', {
            orgId,
            opportunities: priceMatchCount,
        });

        // Auto-apply high-impact price matches if enabled for this org
        let autoApplyResult: { applied: number; failed: number; skipped: number } | null = null;
        try {
            const db = getAdminFirestore();
            const tenantSnap = await db.collection('tenants').doc(orgId).get();
            const tenant = tenantSnap.data();

            if (tenant?.autoPriceMatch === true && tenant?.posProvider) {
                const { applyAutoPriceMatches } = await import('@/app/actions/dynamic-pricing');

                // Find today's price match artifact
                const today = new Date().toISOString().split('T')[0];
                const artifactId = `price_match_${orgId}_${today}`;

                autoApplyResult = await applyAutoPriceMatches(orgId, artifactId);

                logger.info('[CompetitiveIntelCron] Auto price match applied', {
                    orgId, ...autoApplyResult,
                });
            }
        } catch (autoErr) {
            logger.warn('[CompetitiveIntelCron] Auto price match failed (non-blocking)', {
                orgId, error: (autoErr as Error).message,
            });
        }

        // Knowledge Engine ingestion (non-blocking)
        let knowledgeClaims = 0;
        let knowledgeAlerts = 0;
        try {
            if (result.report?.id) {
                // Load full report from Firestore and build markdown for KE ingestion
                const db = getAdminFirestore();
                const reportSnap = await db
                    .collection('tenants').doc(orgId)
                    .collection('weekly_reports').doc(result.report.id)
                    .get();
                const reportData = reportSnap.data();
                const reportMarkdown = reportData ? buildCIReportMarkdown(reportData) : '';

                if (reportMarkdown) {
                    const ke = await ingestCompetitiveIntelKnowledge({
                        tenantId: orgId,
                        reportMarkdown,
                        sourceRef: result.report.id,
                        observedAt: new Date(),
                        createdBy: 'ezal',
                    });
                    knowledgeClaims = ke.claimIds.length;
                }

                const alertResult = await generateKnowledgeAlerts({ tenantId: orgId });
                knowledgeAlerts = alertResult.alertIds.length;

                if (knowledgeClaims > 0) {
                    for (const agent of ['ezal', 'craig', 'marty'] as const) {
                        await promoteRuntimeKnowledgeToLetta({
                            tenantId: orgId,
                            targetAgent: agent,
                            domain: 'competitive_intel',
                            limit: 5,
                        });
                    }
                }
            }
        } catch (keErr) {
            logger.warn('[CompetitiveIntelCron] Knowledge engine ingestion failed (non-blocking)', {
                orgId, error: (keErr as Error).message,
            });
        }

        return NextResponse.json({
            success: true,
            reportId: result.report?.id,
            orgId,
            sourcesRun: result.sourcesRun,
            sourcesCreated: result.sourcesCreated,
            sourcesUpdated: result.sourcesUpdated,
            totalDeals: result.report?.totalDealsTracked || 0,
            totalSnapshots: result.report?.totalSnapshots || 0,
            priceMatchOpportunities: priceMatchCount,
            autoApply: autoApplyResult,
            generatedAt: result.report?.generatedAt || null,
            knowledgeClaims,
            knowledgeAlerts,
        });

    } catch (error: any) {
        logger.error('[CompetitiveIntelCron] Failed to generate report', {
            error: error.message,
        });

        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Build a markdown string from a WeeklyIntelReport Firestore document
 * suitable for the Knowledge Engine's competitive intel ingestion parser.
 */
function buildCIReportMarkdown(reportData: Record<string, unknown>): string {
    const lines: string[] = ['# Competitive Intelligence Report\n'];

    const competitors = Array.isArray(reportData.competitors) ? reportData.competitors : [];
    if (competitors.length > 0) {
        lines.push('\n### Promotions\n');
        for (const c of competitors) {
            const name = (c as Record<string, unknown>).competitorName as string || 'Unknown';
            const deals = Array.isArray((c as Record<string, unknown>).topDeals)
                ? (c as Record<string, unknown>).topDeals as Record<string, unknown>[]
                : [];
            for (const deal of deals.slice(0, 3)) {
                if (deal.discount) {
                    lines.push(`- **${name}** is running a ${deal.discount} off ${deal.dealName || 'products'} promotion`);
                } else if (deal.dealName) {
                    lines.push(`- **${name}** has deal: ${deal.dealName} at $${deal.price}`);
                }
            }
        }
    }

    const insights = reportData.insights as Record<string, unknown> | undefined;
    if (insights) {
        const pricingGaps = Array.isArray(insights.pricingGaps) ? insights.pricingGaps as Record<string, unknown>[] : [];
        if (pricingGaps.length > 0) {
            lines.push('\n### Price Changes\n');
            for (const gap of pricingGaps) {
                if (gap.opportunity) lines.push(`- ${gap.opportunity}`);
            }
        }
        const trends = Array.isArray(insights.marketTrends) ? insights.marketTrends as string[] : [];
        if (trends.length > 0) {
            lines.push('\n### Market Trends\n');
            for (const trend of trends.slice(0, 5)) {
                lines.push(`- ${trend}`);
            }
        }
    }

    return lines.join('\n');
}
