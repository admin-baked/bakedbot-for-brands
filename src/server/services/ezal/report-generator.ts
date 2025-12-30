import { createServerClient } from '@/firebase/server-client';
import { getRecentInsights, findPriceGaps } from './diff-engine';
import { listCompetitors } from './competitor-manager';
import { EzalInsight } from '@/types/ezal-scraper';

/**
 * Generates a Markdown-formatted Competitive Intelligence Report
 * mirroring the user's requested format.
 */
export async function generateCompetitorReport(tenantId: string): Promise<string> {
    const today = new Date().toLocaleDateString('en-US');
    
    // 1. Fetch Data
    const [competitors, insights, priceGaps] = await Promise.all([
        listCompetitors(tenantId, { active: true }),
        getRecentInsights(tenantId, { limit: 50, includeDissmissed: false }),
        findPriceGaps(tenantId, { minGapPercent: 5 })
    ]);

    if (competitors.length === 0) {
        return `# 📊 Competitive Intelligence Report (${today})\n\n**No competitors configured.**\nPlease configure competitors in the Intelligence Dashboard to generate this report.`;
    }

    const competitorNames = competitors.map(c => c.name).join(' vs ');

    // 2. Process Insights
    const outOfStocks = insights.filter(i => i.type === 'out_of_stock');
    const backInStocks = insights.filter(i => i.type === 'back_in_stock');
    const priceDrops = insights.filter(i => i.type === 'price_drop');
    const newProducts = insights.filter(i => i.type === 'new_product');

    // 3. Margin Opportunities (Where we are more expensive or they are cheaper)
    // Actually, report says "Love Cannabis offers Yellow Shelf ($4-6) vs our $12-25".
    // We'll use Price Gaps where OUR price > THEIR price (Gap is positive? findPriceGaps returns gap based on Our - Their)
    // findPriceGaps returns `gapAbsolute = Our - Their`. If positive, We are more expensive.
    const riskOpportunities = priceGaps.filter(g => g.gapAbsolute > 0).slice(0, 3);
    const segmentationOpportunities = priceGaps.filter(g => g.gapAbsolute < 0).slice(0, 3); // We are cheaper

    // 4. Generate Markdown
    let md = `# :bar_chart: COMPETITIVE PRICING SNAPSHOT (${today})\n`;
    md += `**Scope:** ${competitorNames}\n\n`;

    // --- Margin Opportunities ---
    md += `### :moneybag: Top 3 Margin Opportunities:\n`;
    if (riskOpportunities.length > 0) {
        riskOpportunities.forEach(g => {
            md += `- **${g.brandName || 'Product'}**: ${g.competitorName} offers ${g.productName} ($${g.competitorPrice.toFixed(2)}) vs our $${g.ourPrice.toFixed(2)} - **RISK:** Undercut on price\n`;
        });
    } else {
        md += `- No significant price undercutting detected today.\n`;
    }
    
    if (segmentationOpportunities.length > 0) {
         segmentationOpportunities.forEach(g => {
            md += `- **${g.brandName || 'Product'}**: We are priced lower on ${g.productName} ($${g.ourPrice.toFixed(2)}) vs ${g.competitorPrice.toFixed(2)} - **Opportunity:** Check margins or advertise value.\n`;
        });
    }
    md += `\n`;

    // --- Popular/New Items ---
    md += `### :chart_with_upwards_trend: Market Movements (High Activity):\n`;
    if (newProducts.length > 0) {
        newProducts.slice(0, 5).forEach(p => {
            md += `- **${p.brandName}**: New arrival "${p.currentValue}" detected at ${p.competitorId} - Monitor demand.\n`;
        });
    } else if (backInStocks.length > 0) {
        backInStocks.slice(0, 5).forEach(p => {
             md += `- **${p.brandName}**: Restocked at ${p.competitorId} - High demand item?\n`;
        });
    } else {
        md += `- No major new inventory movements detected today.\n`;
    }
    md += `\n`;

    // --- Out of Stock ---
    md += `### :rotating_light: Out-of-Stock Analysis (Market Gap Opportunities):\n`;
    if (outOfStocks.length > 0) {
        outOfStocks.slice(0, 5).forEach(os => {
            md += `- **${os.brandName}**: Showing stock depletion at ${os.competitorId}. **Action:** Promote if we have stock.\n`;
        });
        md += `\n**LinkedIn Insight:** "While competitors struggle with inventory on ${outOfStocks[0].brandName}, we maintain consistent availability."\n`;
    } else {
        md += `- Competitors appear well-stocked.\n`;
    }
    md += `\n`;

    // --- Category Performance (Simplified) ---
    md += `### :clipboard: Category Insights:\n`;
    const brands = new Set(priceGaps.map(g => g.brandName || 'General'));
    brands.forEach(brand => {
         const brandGaps = priceGaps.filter(g => (g.brandName || 'General') === brand);
         const ourAvg = brandGaps.reduce((sum, g) => sum + g.ourPrice, 0) / (brandGaps.length || 1);
         const themAvg = brandGaps.reduce((sum, g) => sum + g.competitorPrice, 0) / (brandGaps.length || 1);
         const winning = ourAvg < themAvg ? "We are competitive" : "Competitor leading on price";
         md += `- **${brand}**: ${winning} (Avg Gap: $${Math.abs(ourAvg - themAvg).toFixed(2)})\n`;
    });
    if (brands.size === 0) md += `- Insufficient data for category analysis.\n`;

    md += `\n### :link: Next Steps:\n`;
    md += `- [View Full Report on Dashboard](/dashboard/intelligence)\n`;
    md += `- [Update Pricing Rules](/dashboard/settings)\n`;
    
    return md;
}
