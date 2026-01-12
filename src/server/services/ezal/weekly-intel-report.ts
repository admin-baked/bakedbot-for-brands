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

    // Save report
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
