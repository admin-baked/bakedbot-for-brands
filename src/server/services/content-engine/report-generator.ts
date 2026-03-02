/**
 * Content Engine — Report Generator
 *
 * Generates quarterly data reports using real financial/market/operational data
 * from the agent squad. Powers the "State of the Stash" and other data journalism pieces.
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { generateFromTemplate } from './generator';

// ============================================================================
// Report Types
// ============================================================================

export interface ReportMetric {
    label: string;
    value: number;
    unit: string;              // '$', '%', 'count', 'days'
    delta?: number;            // change from previous period
    deltaDirection?: 'up' | 'down' | 'flat';
}

export interface ReportChartData {
    type: 'bar' | 'line' | 'pie';
    title: string;
    labels: string[];
    datasets: Array<{
        label: string;
        data: number[];
        color?: string;
    }>;
}

export interface ReportData {
    title: string;
    quarter: string;
    year: number;
    generatedAt: Date;
    keyMetrics: ReportMetric[];
    charts: ReportChartData[];
    dataPoints: number;
}

type ReportType = 'state_of_stash' | 'market_pricing' | 'compliance_landscape';

// ============================================================================
// Data Aggregation
// ============================================================================

async function aggregateFinancialData(): Promise<Record<string, unknown>> {
    const db = getAdminFirestore();
    try {
        const benchmarksSnap = await db
            .collection('market_benchmarks')
            .orderBy('updatedAt', 'desc')
            .limit(1)
            .get();

        return benchmarksSnap.empty ? {} : benchmarksSnap.docs[0].data();
    } catch {
        return {};
    }
}

async function aggregateProductData(state: string): Promise<Record<string, unknown>> {
    const db = getAdminFirestore();
    try {
        const orgsSnap = await db.collection('organizations')
            .where('state', '==', state)
            .limit(10)
            .get();

        const products: Record<string, unknown>[] = [];
        for (const orgDoc of orgsSnap.docs) {
            const productsQuery = await db
                .collection('tenants')
                .doc(orgDoc.id)
                .collection('publicViews')
                .doc('products')
                .collection('items')
                .orderBy('salesCount', 'desc')
                .limit(20)
                .get();

            for (const pDoc of productsQuery.docs) {
                products.push({
                    name: pDoc.data().name,
                    category: pDoc.data().category,
                    price: pDoc.data().price,
                    salesCount: pDoc.data().salesCount,
                    strainType: pDoc.data().strainType,
                });
            }
        }

        return { products: products.slice(0, 50), productCount: products.length };
    } catch {
        return { products: [], productCount: 0 };
    }
}

async function aggregateCompetitorData(): Promise<Record<string, unknown>> {
    const db = getAdminFirestore();
    try {
        const competitorsSnap = await db
            .collectionGroup('competitors')
            .limit(50)
            .get();

        const competitors = competitorsSnap.docs.map(d => ({
            name: d.data().name,
            priceRange: d.data().priceRange,
            categories: d.data().categories,
        }));

        return { competitors, competitorCount: competitors.length };
    } catch {
        return { competitors: [], competitorCount: 0 };
    }
}

async function aggregateRegulatoryData(state: string): Promise<Record<string, unknown>> {
    const db = getAdminFirestore();
    try {
        const regulationSnap = await db
            .collection('regulation_snapshots')
            .where('state', '==', state)
            .orderBy('checkedAt', 'desc')
            .limit(10)
            .get();

        const changes = regulationSnap.docs
            .filter(d => d.data().changeDetected)
            .map(d => ({
                state: d.data().state,
                checkedAt: d.data().checkedAt?.toDate?.()?.toISOString(),
                summary: d.data().summary,
            }));

        return { regulatoryChanges: changes, changeCount: changes.length };
    } catch {
        return { regulatoryChanges: [], changeCount: 0 };
    }
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate a quarterly report using real data from all agent sources
 */
export async function generateQuarterlyReport(
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
    year: number,
    reportType: ReportType = 'state_of_stash'
): Promise<{ postId: string; reportData: ReportData } | null> {
    const state = 'NY';

    logger.info('[ReportGenerator] Starting quarterly report', { quarter, year, reportType });

    try {
        // Gather data from all agent sources in parallel
        const [financials, products, competitors, regulatory] = await Promise.all([
            aggregateFinancialData(),
            aggregateProductData(state),
            aggregateCompetitorData(),
            aggregateRegulatoryData(state),
        ]);

        const combinedData = {
            financials,
            products,
            competitors,
            regulatory,
            quarter,
            year,
            state,
        };

        // Count data points for threshold check
        const dataPoints = Object.values(combinedData).reduce<number>((count, val) => {
            if (Array.isArray(val)) return count + val.length;
            if (val && typeof val === 'object') return count + Object.keys(val as object).length;
            return count + (val ? 1 : 0);
        }, 0);

        // Build report metadata
        const reportData: ReportData = {
            title: buildReportTitle(reportType, quarter, year),
            quarter,
            year,
            generatedAt: new Date(),
            keyMetrics: extractKeyMetrics(financials, products),
            charts: buildChartData(products, competitors),
            dataPoints,
        };

        // Select template based on report type
        const templateId = reportType === 'state_of_stash'
            ? 'market_trends_state'
            : 'price_watch';

        const variables: Record<string, string> = {
            state,
            month: `${quarter} ${year}`,
            quarter,
            year: String(year),
            region: 'New York',
        };

        // Generate the blog post via content engine
        const result = await generateFromTemplate(templateId, variables, combinedData);

        if (!result) {
            logger.warn('[ReportGenerator] Template generation returned null', { reportType, quarter });
            return null;
        }

        logger.info('[ReportGenerator] Quarterly report generated', {
            reportType,
            quarter,
            year,
            postId: result.postId,
            dataPoints,
        });

        return { postId: result.postId, reportData };
    } catch (error) {
        logger.error('[ReportGenerator] Failed to generate report', {
            error: String(error),
            reportType,
            quarter,
            year,
        });
        return null;
    }
}

// ============================================================================
// Helpers
// ============================================================================

function buildReportTitle(reportType: ReportType, quarter: string, year: number): string {
    switch (reportType) {
        case 'state_of_stash':
            return `State of the Stash: ${quarter} ${year} Cannabis Market Report`;
        case 'market_pricing':
            return `Average Dispensary Pricing: ${quarter} ${year}`;
        case 'compliance_landscape':
            return `Cannabis Compliance Landscape: ${quarter} ${year}`;
        default:
            return `Cannabis Industry Report: ${quarter} ${year}`;
    }
}

function extractKeyMetrics(
    financials: Record<string, unknown>,
    products: Record<string, unknown>
): ReportMetric[] {
    const metrics: ReportMetric[] = [];

    const productList = (products as { products?: Array<{ price?: number; category?: string }> }).products || [];

    if (productList.length > 0) {
        const prices = productList.filter(p => p.price).map(p => p.price!);
        if (prices.length > 0) {
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            metrics.push({
                label: 'Average Product Price',
                value: Math.round(avgPrice * 100) / 100,
                unit: '$',
            });
        }

        metrics.push({
            label: 'Products Tracked',
            value: productList.length,
            unit: 'count',
        });
    }

    const benchmarks = financials as Record<string, number | undefined>;
    if (benchmarks.discountRateNationalAvg) {
        metrics.push({
            label: 'Avg Discount Rate',
            value: Math.round(benchmarks.discountRateNationalAvg * 100) / 100,
            unit: '%',
        });
    }

    if (benchmarks.grossMarginTarget) {
        metrics.push({
            label: 'Target Gross Margin',
            value: Math.round(benchmarks.grossMarginTarget * 100) / 100,
            unit: '%',
        });
    }

    return metrics;
}

function buildChartData(
    products: Record<string, unknown>,
    competitors: Record<string, unknown>
): ReportChartData[] {
    const charts: ReportChartData[] = [];

    const productList = (products as { products?: Array<{ category?: string; price?: number }> }).products || [];

    // Category distribution chart
    if (productList.length > 0) {
        const categoryMap = new Map<string, number>();
        for (const p of productList) {
            const cat = p.category || 'Other';
            categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
        }

        const sortedCategories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

        charts.push({
            type: 'bar',
            title: 'Products by Category',
            labels: sortedCategories.map(([cat]) => cat),
            datasets: [{
                label: 'Product Count',
                data: sortedCategories.map(([, count]) => count),
            }],
        });
    }

    // Competitor count
    const competitorList = (competitors as { competitors?: unknown[] }).competitors || [];
    if (competitorList.length > 0) {
        charts.push({
            type: 'pie',
            title: 'Competitive Landscape',
            labels: ['Tracked Competitors'],
            datasets: [{
                label: 'Count',
                data: [competitorList.length],
            }],
        });
    }

    return charts;
}
