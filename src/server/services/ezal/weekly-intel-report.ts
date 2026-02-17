'use server';

/**
 * Weekly Competitive Intelligence Report Generator
 * 
 * Aggregates daily competitor snapshots into a weekly report.
 * Calculates insights, trends, and recommendations.
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import {
    getWeeklySnapshots,
    getCompetitorSummaries,
    CompetitorSnapshot,
    SnapshotSummary,
} from '@/server/repos/competitor-snapshots';
import { listCompetitors } from '@/server/services/ezal/competitor-manager';

// =============================================================================
// TYPES
// =============================================================================

export interface WeeklyIntelReport {
    id: string;
    orgId: string;
    generatedAt: Date;
    weekStart: Date;
    weekEnd: Date;
    
    // Competitor summaries
    competitors: CompetitorReportSection[];
    
    // Aggregated insights
    insights: {
        topDeals: DealInsight[];
        pricingGaps: PricingGap[];
        marketTrends: string[];
        recommendations: string[];
    };
    
    // Stats
    totalSnapshots: number;
    totalDealsTracked: number;
    totalProductsTracked: number;
}

interface CompetitorReportSection {
    competitorId: string;
    competitorName: string;
    avgDealPrice: number;
    dealCount: number;
    productCount: number;
    topDeals: DealInsight[];
    priceStrategy: 'discount' | 'premium' | 'competitive' | 'unknown';
}

interface DealInsight {
    competitorName: string;
    dealName: string;
    price: number;
    discount?: string;
    dayOfWeek?: string;
}

interface PricingGap {
    category: string;
    competitorAvg: number;
    marketPosition: 'above' | 'below' | 'at';
    opportunity: string;
}

const COLLECTION = 'weekly_reports';

// =============================================================================
// REPORT GENERATION
// =============================================================================

/**
 * Generate a weekly competitive intelligence report.
 */
export async function generateWeeklyIntelReport(
    orgId: string
): Promise<WeeklyIntelReport> {
    logger.info('[WeeklyReport] Generating report', { orgId });

    const { firestore } = await createServerClient();

    // Get date range for the week
    const weekEnd = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // Fetch all weekly data
    const [snapshots, summaries, competitors] = await Promise.all([
        getWeeklySnapshots(orgId),
        getCompetitorSummaries(orgId, 7),
        listCompetitors(orgId, { active: true }),
    ]);

    // Build competitor sections
    const competitorSections: CompetitorReportSection[] = summaries.map(summary => {
        const compSnapshots = snapshots.filter(s => s.competitorId === summary.competitorId);
        const allDeals = compSnapshots.flatMap(s => s.deals);
        
        // Get top deals (lowest prices with highest discounts)
        const topDeals = allDeals
            .sort((a, b) => (a.price || 0) - (b.price || 0))
            .slice(0, 5)
            .map(d => ({
                competitorName: summary.competitorName,
                dealName: d.name,
                price: d.price,
                discount: d.discount,
            }));

        // Determine pricing strategy
        const priceStrategy = determinePricingStrategy(allDeals);

        return {
            competitorId: summary.competitorId,
            competitorName: summary.competitorName,
            avgDealPrice: summary.avgDealPrice,
            dealCount: summary.totalDeals,
            productCount: summary.totalProducts,
            topDeals,
            priceStrategy,
        };
    });

    // Generate insights
    const allDeals = snapshots.flatMap(s => s.deals.map(d => ({
        ...d,
        competitorName: s.competitorName,
    })));

    const topDeals = allDeals
        .sort((a, b) => (a.price || 0) - (b.price || 0))
        .slice(0, 10)
        .map(d => ({
            competitorName: d.competitorName || 'Unknown',
            dealName: d.name,
            price: d.price,
            discount: d.discount,
        }));

    const pricingGaps = calculatePricingGaps(competitorSections);
    const marketTrends = generateMarketTrends(competitorSections, snapshots);
    const recommendations = generateRecommendations(competitorSections, pricingGaps);

    const report: Omit<WeeklyIntelReport, 'id'> = {
        orgId,
        generatedAt: new Date(),
        weekStart,
        weekEnd,
        competitors: competitorSections,
        insights: {
            topDeals,
            pricingGaps,
            marketTrends,
            recommendations,
        },
        totalSnapshots: snapshots.length,
        totalDealsTracked: allDeals.length,
        totalProductsTracked: snapshots.reduce((sum, s) => sum + s.products.length, 0),
    };

    // Save report to Firestore
    const docRef = await firestore
        .collection('tenants')
        .doc(orgId)
        .collection(COLLECTION)
        .add(report);

    logger.info('[WeeklyReport] Report generated', {
        orgId,
        reportId: docRef.id,
        competitors: competitorSections.length,
        deals: allDeals.length,
    });

    // Save report to BakedBot Drive for AI access
    try {
        await saveReportToDrive(orgId, docRef.id, report);
        await createInboxNotification(orgId, docRef.id, report);
    } catch (error) {
        logger.error('[WeeklyReport] Failed to save to Drive or create inbox notification', { error, orgId });
        // Don't fail the whole operation if Drive/Inbox fails
    }

    // Analyze competitor changes and generate real-time alerts
    try {
        const { analyzeCompetitorChanges, saveAndNotifyAlerts } = await import('./competitor-alerts');

        // Process each competitor snapshot to detect significant changes
        for (const summary of summaries) {
            // Get latest snapshot for this competitor
            const latestSnapshot = snapshots
                .filter(s => s.competitorId === summary.competitorId)
                .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())[0];

            if (!latestSnapshot) continue;

            // Analyze changes and generate alerts
            const alerts = await analyzeCompetitorChanges(orgId, summary.competitorId, {
                id: latestSnapshot.id,
                competitorId: summary.competitorId,
                deals: latestSnapshot.deals.map(d => ({
                    dealName: d.name,
                    price: d.price,
                    discount: d.discount,
                    category: d.category,
                })),
                priceStrategy: competitorSections.find(c => c.competitorId === summary.competitorId)?.priceStrategy || 'unknown',
                avgPrice: summary.avgDealPrice,
                dealCount: summary.totalDeals,
                capturedAt: latestSnapshot.capturedAt,
            });

            // Save and notify for any alerts
            if (alerts.length > 0) {
                await saveAndNotifyAlerts(alerts);
                logger.info('[WeeklyReport] Generated alerts for competitor', {
                    orgId,
                    competitorId: summary.competitorId,
                    alertCount: alerts.length,
                });
            }
        }
    } catch (error) {
        logger.error('[WeeklyReport] Failed to analyze competitor changes', { error, orgId });
        // Don't fail the whole operation if alert detection fails
    }

    return {
        id: docRef.id,
        ...report,
    };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function determinePricingStrategy(
    deals: { price: number; discount?: string }[]
): 'discount' | 'premium' | 'competitive' | 'unknown' {
    if (deals.length === 0) return 'unknown';

    const hasDiscounts = deals.filter(d => d.discount).length;
    const discountRatio = hasDiscounts / deals.length;
    const avgPrice = deals.reduce((sum, d) => sum + d.price, 0) / deals.length;

    if (discountRatio > 0.5) return 'discount';
    if (avgPrice > 40) return 'premium';
    if (avgPrice < 20) return 'discount';
    return 'competitive';
}

function calculatePricingGaps(
    sections: CompetitorReportSection[]
): PricingGap[] {
    if (sections.length < 2) return [];

    const avgPrice = sections.reduce((sum, s) => sum + s.avgDealPrice, 0) / sections.length;
    
    const gaps: PricingGap[] = [];
    
    // Find discount leaders (potential threats)
    const discountLeader = sections.find(s => s.priceStrategy === 'discount');
    if (discountLeader) {
        gaps.push({
            category: 'Budget Segment',
            competitorAvg: discountLeader.avgDealPrice,
            marketPosition: 'below',
            opportunity: `${discountLeader.competitorName} leads on budget deals. Consider a value-tier offering.`,
        });
    }

    // Find premium players (potential differentiation)
    const premiumPlayer = sections.find(s => s.priceStrategy === 'premium');
    if (premiumPlayer) {
        gaps.push({
            category: 'Premium Segment',
            competitorAvg: premiumPlayer.avgDealPrice,
            marketPosition: 'above',
            opportunity: `${premiumPlayer.competitorName} targets premium. Highlight quality in marketing.`,
        });
    }

    return gaps;
}

function generateMarketTrends(
    sections: CompetitorReportSection[],
    snapshots: CompetitorSnapshot[]
): string[] {
    const trends: string[] = [];

    // Deal activity trend
    const totalDeals = sections.reduce((sum, s) => sum + s.dealCount, 0);
    if (totalDeals > 20) {
        trends.push(`High market activity: ${totalDeals} deals tracked this week.`);
    } else if (totalDeals < 5) {
        trends.push('Low market activity: Competitors running fewer promotions.');
    }

    // Discount trend
    const discountingCompetitors = sections.filter(s => s.priceStrategy === 'discount').length;
    if (discountingCompetitors > sections.length / 2) {
        trends.push('Market trend: Heavy discounting across competitors.');
    }

    // Category trends
    const categories = new Set<string>();
    for (const snap of snapshots) {
        for (const deal of snap.deals) {
            if (deal.category) categories.add(deal.category);
        }
    }
    if (categories.size > 0) {
        trends.push(`Active categories: ${Array.from(categories).slice(0, 5).join(', ')}.`);
    }

    return trends;
}

function generateRecommendations(
    sections: CompetitorReportSection[],
    gaps: PricingGap[]
): string[] {
    const recommendations: string[] = [];

    // Based on pricing gaps
    const hasDiscountThreat = sections.some(s => s.priceStrategy === 'discount');
    if (hasDiscountThreat) {
        recommendations.push('Consider a "Daily Deal" feature to compete with budget-focused competitors.');
    }

    // Based on competitor count
    if (sections.length >= 3) {
        recommendations.push('With 3+ competitors tracked, focus on differentiation through customer experience.');
    }

    // General best practices
    if (sections.some(s => s.dealCount > 10)) {
        recommendations.push('Competitors are running multiple deals. Consider a loyalty program to retain customers.');
    }

    return recommendations.length > 0 ? recommendations : ['Continue monitoring - not enough data for specific recommendations.'];
}

// =============================================================================
// DRIVE + INBOX INTEGRATION
// =============================================================================

/**
 * Format weekly report as markdown and save to BakedBot Drive.
 */
async function saveReportToDrive(
    orgId: string,
    reportId: string,
    report: Omit<WeeklyIntelReport, 'id'>
): Promise<void> {
    const { getDriveStorageService } = await import('@/server/services/drive-storage');
    const driveService = getDriveStorageService();

    // Format report as markdown
    const markdown = formatReportAsMarkdown(report);
    const buffer = Buffer.from(markdown, 'utf-8');

    // Get tenant admin user for storage
    const { firestore } = await createServerClient();
    const tenantDoc = await firestore.collection('tenants').doc(orgId).get();
    const tenantData = tenantDoc.data();
    const adminUserId = tenantData?.ownerId || tenantData?.createdBy || 'system';

    // Save to Drive under 'documents' category
    const uploadResult = await driveService.uploadFile({
        userId: adminUserId,
        userEmail: tenantData?.email || 'system@bakedbot.ai',
        file: {
            buffer,
            originalName: `competitive-intel-${reportId}.md`,
            mimeType: 'text/markdown',
            size: buffer.length,
        },
        category: 'documents',
        description: `Weekly Competitive Intelligence Report - ${new Date().toLocaleDateString()}`,
        tags: ['competitive-intel', 'automated', 'ezal'],
        metadata: {
            orgId,
            reportId,
            generatedAt: new Date().toISOString(),
            competitorCount: String(report.competitors.length),
            dealCount: String(report.totalDealsTracked),
        },
    });

    if (!uploadResult.success) {
        logger.error('[WeeklyReport] Failed to save to Drive', {
            orgId,
            reportId,
            error: uploadResult.error,
        });
        throw new Error(uploadResult.error || 'Failed to save to Drive');
    }

    // Save Drive file reference to Firestore
    await firestore
        .collection('tenants')
        .doc(orgId)
        .collection('competitive_intel_drive_files')
        .doc(reportId)
        .set({
            reportId,
            storagePath: uploadResult.storagePath,
            downloadUrl: uploadResult.downloadUrl,
            createdAt: new Date(),
        });

    logger.info('[WeeklyReport] Saved to Drive', {
        orgId,
        reportId,
        storagePath: uploadResult.storagePath,
    });
}

/**
 * Create inbox notification about new competitive intelligence report.
 */
async function createInboxNotification(
    orgId: string,
    reportId: string,
    report: Omit<WeeklyIntelReport, 'id'>
): Promise<void> {
    const { createInboxThread } = await import('@/server/actions/inbox');

    // Get tenant admin user
    const { firestore } = await createServerClient();
    const tenantDoc = await firestore.collection('tenants').doc(orgId).get();
    const tenantData = tenantDoc.data();
    const adminUserId = tenantData?.ownerId || tenantData?.createdBy;

    if (!adminUserId) {
        logger.warn('[WeeklyReport] No admin user found for tenant', { orgId });
        return;
    }

    // Create inbox thread for the report
    const weekStartStr = report.weekStart.toLocaleDateString();
    const weekEndStr = report.weekEnd.toLocaleDateString();
    const title = `📊 Weekly Competitive Intelligence - ${weekStartStr} to ${weekEndStr}`;

    const summary = generateNotificationSummary(report);

    const result = await createInboxThread({
        type: 'market_intel',
        title,
        primaryAgent: 'ezal',
        brandId: orgId,
        tags: ['competitive-intel', 'automated', 'weekly-report'],
        initialMessage: {
            id: `msg_${Date.now()}`,
            userId: 'agent_ezal',
            userName: 'Ezal',
            userAvatar: '/agents/ezal-avatar.png',
            message: summary,
            timestamp: new Date(),
        } as any, // TODO: Fix type mismatch between ChatMessage (collaboration) and inbox message
    });

    if (result.success) {
        logger.info('[WeeklyReport] Created inbox notification', {
            orgId,
            reportId,
            threadId: result.thread?.id,
        });
    } else {
        logger.error('[WeeklyReport] Failed to create inbox notification', {
            orgId,
            reportId,
            error: result.error,
        });
    }
}

/**
 * Format report as markdown for Drive storage.
 */
function formatReportAsMarkdown(report: Omit<WeeklyIntelReport, 'id'>): string {
    const weekStart = report.weekStart.toLocaleDateString();
    const weekEnd = report.weekEnd.toLocaleDateString();

    let md = `# Weekly Competitive Intelligence Report\n\n`;
    md += `**Report Period:** ${weekStart} - ${weekEnd}\n`;
    md += `**Generated:** ${report.generatedAt.toLocaleString()}\n\n`;

    md += `## Executive Summary\n\n`;
    md += `- **Competitors Tracked:** ${report.competitors.length}\n`;
    md += `- **Total Snapshots:** ${report.totalSnapshots}\n`;
    md += `- **Deals Tracked:** ${report.totalDealsTracked}\n`;
    md += `- **Products Tracked:** ${report.totalProductsTracked}\n\n`;

    // Market trends
    md += `## Market Trends\n\n`;
    for (const trend of report.insights.marketTrends) {
        md += `- ${trend}\n`;
    }
    md += `\n`;

    // Top deals across market
    md += `## Top 10 Deals This Week\n\n`;
    md += `| Competitor | Deal | Price |\n`;
    md += `|------------|------|-------|\n`;
    for (const deal of report.insights.topDeals.slice(0, 10)) {
        md += `| ${deal.competitorName} | ${deal.dealName} | $${deal.price.toFixed(2)} |\n`;
    }
    md += `\n`;

    // Competitor breakdown
    md += `## Competitor Analysis\n\n`;
    for (const comp of report.competitors) {
        md += `### ${comp.competitorName}\n\n`;
        md += `- **Pricing Strategy:** ${comp.priceStrategy}\n`;
        md += `- **Average Deal Price:** $${comp.avgDealPrice.toFixed(2)}\n`;
        md += `- **Active Deals:** ${comp.dealCount}\n`;
        md += `- **Products Tracked:** ${comp.productCount}\n\n`;

        if (comp.topDeals.length > 0) {
            md += `**Top Deals:**\n\n`;
            for (const deal of comp.topDeals.slice(0, 5)) {
                md += `- ${deal.dealName} - $${deal.price.toFixed(2)}`;
                if (deal.discount) md += ` (${deal.discount})`;
                md += `\n`;
            }
            md += `\n`;
        }
    }

    // Pricing gaps
    if (report.insights.pricingGaps.length > 0) {
        md += `## Pricing Gaps & Opportunities\n\n`;
        for (const gap of report.insights.pricingGaps) {
            md += `### ${gap.category}\n\n`;
            md += `- **Competitor Average:** $${gap.competitorAvg.toFixed(2)}\n`;
            md += `- **Market Position:** ${gap.marketPosition}\n`;
            md += `- **Opportunity:** ${gap.opportunity}\n\n`;
        }
    }

    // Recommendations
    md += `## Recommendations\n\n`;
    for (const rec of report.insights.recommendations) {
        md += `- ${rec}\n`;
    }
    md += `\n`;

    md += `---\n\n`;
    md += `*Generated by Ezal - BakedBot Competitive Intelligence*\n`;

    return md;
}

/**
 * Generate notification summary for inbox thread.
 */
function generateNotificationSummary(report: Omit<WeeklyIntelReport, 'id'>): string {
    const topDeal = report.insights.topDeals[0];
    const avgPrice = report.competitors.reduce((sum, c) => sum + c.avgDealPrice, 0) / report.competitors.length;

    let summary = `Hey there! 👋 Your weekly competitive intelligence report is ready.\n\n`;
    summary += `**Key Highlights:**\n\n`;
    summary += `📊 Tracked ${report.competitors.length} competitors with ${report.totalDealsTracked} active deals\n\n`;

    if (topDeal) {
        summary += `🔥 **Best Deal in Market:** ${topDeal.competitorName} - ${topDeal.dealName} at $${topDeal.price.toFixed(2)}\n\n`;
    }

    summary += `💰 **Average Deal Price:** $${avgPrice.toFixed(2)}\n\n`;

    if (report.insights.marketTrends.length > 0) {
        summary += `**Market Trends:**\n`;
        for (const trend of report.insights.marketTrends.slice(0, 3)) {
            summary += `• ${trend}\n`;
        }
        summary += `\n`;
    }

    if (report.insights.recommendations.length > 0) {
        summary += `**My Recommendations:**\n`;
        for (const rec of report.insights.recommendations.slice(0, 3)) {
            summary += `• ${rec}\n`;
        }
        summary += `\n`;
    }

    summary += `📁 The full report has been saved to your BakedBot Drive for easy access.\n\n`;
    summary += `Need me to dig deeper into any competitor or analyze specific pricing strategies? Just ask! 🎯`;

    return summary;
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get the most recent weekly report for an org.
 */
export async function getLatestWeeklyReport(
    orgId: string
): Promise<WeeklyIntelReport | null> {
    const { firestore } = await createServerClient();

    const snapshot = await firestore
        .collection('tenants')
        .doc(orgId)
        .collection(COLLECTION)
        .orderBy('generatedAt', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
        id: doc.id,
        ...data,
        generatedAt: data.generatedAt?.toDate?.() || new Date(),
        weekStart: data.weekStart?.toDate?.() || new Date(),
        weekEnd: data.weekEnd?.toDate?.() || new Date(),
    } as WeeklyIntelReport;
}

/**
 * Get reports within a date range.
 */
export async function getWeeklyReports(
    orgId: string,
    limit: number = 10
): Promise<WeeklyIntelReport[]> {
    const { firestore } = await createServerClient();

    const snapshot = await firestore
        .collection('tenants')
        .doc(orgId)
        .collection(COLLECTION)
        .orderBy('generatedAt', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            generatedAt: data.generatedAt?.toDate?.() || new Date(),
            weekStart: data.weekStart?.toDate?.() || new Date(),
            weekEnd: data.weekEnd?.toDate?.() || new Date(),
        } as WeeklyIntelReport;
    });
}
