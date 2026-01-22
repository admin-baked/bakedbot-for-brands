/**
 * Ezal Analyzer Agent
 *
 * Step 3 of the competitive intelligence pipeline.
 * Generates strategic insights from scraped competitor data.
 */

import { logger } from '@/lib/logger';
import { runMultiStepTask } from '../harness';
import {
  AnalyzerTools,
  AnalyzerResult,
  CompetitiveInsight,
  ActionItem,
  EzalPipelineState,
} from './types';
import { z } from 'zod';

// ============================================================================
// ANALYZER AGENT SYSTEM INSTRUCTIONS
// ============================================================================

const ANALYZER_SYSTEM_INSTRUCTIONS = `
You are the ANALYZER - the final step in the Ezal Competitive Intelligence pipeline.

YOUR MISSION: Generate actionable competitive intelligence from scraped data.

ANALYSIS TYPES:
1. PRICE OPPORTUNITIES - Products where competitors undercut us (we can compete)
2. PRODUCT GAPS - Products competitors have that we don't carry
3. THREAT ALERTS - Aggressive competitor pricing or new products
4. MARKET TRENDS - Category-level insights across competitors

INSIGHT PRIORITIES:
- Critical: Immediate threat requiring action (competitor price war, major gap)
- High: Significant opportunity (>15% price difference, popular missing product)
- Medium: Worth noting (5-15% price gap, emerging trend)
- Low: Informational only

OUTPUT FORMAT:
For each insight, provide:
- Type (price_opportunity, product_gap, threat_alert, market_trend)
- Severity (critical, high, medium, low)
- Title (short, actionable headline)
- Description (detailed explanation)
- Recommendations (specific actions to take)

COORDINATION:
- If you detect a critical threat, alert Craig (Marketing) to prepare counter-campaigns
- Save important findings to long-term memory for future reference
- Generate specific action items with agent delegation where appropriate

RULES:
- Focus on ACTIONABLE insights, not just data summaries
- Include specific product names and prices in recommendations
- Prioritize insights by business impact
- Be direct and strategic in recommendations
`;

// ============================================================================
// ANALYZER AGENT IMPLEMENTATION
// ============================================================================

/**
 * Run the Analyzer agent to generate strategic insights.
 */
export async function runAnalyzerAgent(
  pipelineState: EzalPipelineState,
  tools: AnalyzerTools
): Promise<AnalyzerResult> {
  const startTime = Date.now();
  const { tenantId, query } = pipelineState;
  const competitors = pipelineState.scraperResult?.competitors || [];

  logger.info(
    `[Ezal:Analyzer] Analyzing data from ${competitors.length} competitors`
  );

  // Collect all products for analysis
  const allProducts = competitors.flatMap((c) =>
    c.products.map((p) => ({
      ...p,
      competitorId: c.id,
      competitorName: c.name,
      competitorUrl: c.url,
    }))
  );

  logger.debug(`[Ezal:Analyzer] Total products to analyze: ${allProducts.length}`);

  // Compare with our prices
  let priceComparisons: Awaited<ReturnType<typeof tools.compareWithOurPrices>> = [];
  try {
    const basicProducts = allProducts.map((p) => ({
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
      regularPrice: p.regularPrice,
      inStock: p.inStock,
      thc: p.thc,
      cbd: p.cbd,
    }));
    priceComparisons = await tools.compareWithOurPrices(basicProducts, tenantId);
  } catch (e) {
    logger.warn(`[Ezal:Analyzer] Price comparison failed: ${e}`);
  }

  // Build tool definitions for multi-step analysis
  const toolsDef = [
    {
      name: 'alertCraig',
      description: 'Alert Craig (Marketing) to launch a counter-campaign for a competitive threat',
      schema: z.object({
        competitorId: z.string().describe('Competitor ID'),
        threat: z.string().describe('Description of the threat'),
        product: z.string().describe('Affected product name'),
      }),
    },
    {
      name: 'lettaSaveFact',
      description: 'Save an important finding to long-term memory',
      schema: z.object({
        fact: z.string().describe('The fact to save'),
        category: z.string().optional().describe('Category like "pricing", "competitor", "market"'),
      }),
    },
  ];

  const toolsImpl = {
    alertCraig: async (
      competitorId: unknown,
      threat: unknown,
      product: unknown
    ) => tools.alertCraig(competitorId as string, threat as string, product as string),
    lettaSaveFact: async (fact: unknown, category: unknown) =>
      tools.lettaSaveFact(fact as string, category as string | undefined),
  };

  // Build analysis context
  const competitorSummary = competitors
    .map(
      (c) =>
        `- ${c.name} (${c.url}): ${c.products.length} products`
    )
    .join('\n');

  const pricingInsights = priceComparisons
    .slice(0, 20)
    .map(
      (p) =>
        `- ${p.productName}: Competitor $${p.competitorPrice}${p.ourPrice ? `, Our price $${p.ourPrice} (${p.recommendation})` : ''}`
    )
    .join('\n');

  // Run multi-step analysis
  const result = await runMultiStepTask({
    userQuery: `Analyze competitive intelligence data and generate strategic insights.

QUERY: ${query}

COMPETITORS FOUND:
${competitorSummary}

TOTAL PRODUCTS: ${allProducts.length}

PRICE COMPARISONS:
${pricingInsights || 'No price comparison data available'}

TOP CATEGORIES:
${getCategoryBreakdown(allProducts)}

Generate:
1. Top 3-5 price opportunities (where we can compete)
2. Top 3 product gaps (what we should consider stocking)
3. Any critical threats requiring immediate action
4. 2-3 market trend observations

For critical threats, use alertCraig to notify marketing.
Save important findings using lettaSaveFact.`,
    systemInstructions: ANALYZER_SYSTEM_INSTRUCTIONS,
    toolsDef,
    tools: toolsImpl,
    model: 'claude', // Claude is better for strategic analysis
    maxIterations: 5,
    agentId: 'ezal_analyzer',
  });

  // Parse insights from the result
  const insights = parseInsightsFromResult(result.finalResult);
  const actionItems = generateActionItems(insights, priceComparisons);

  const durationMs = Date.now() - startTime;

  logger.info(
    `[Ezal:Analyzer] Complete. Generated ${insights.length} insights, ${actionItems.length} action items in ${durationMs}ms`
  );

  return {
    insights,
    report: result.finalResult,
    actionItems,
    durationMs,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCategoryBreakdown(
  products: Array<{ category?: string }>
): string {
  const categories: Record<string, number> = {};
  for (const p of products) {
    const cat = p.category || 'unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  }

  return Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, count]) => `- ${cat}: ${count} products`)
    .join('\n');
}

function parseInsightsFromResult(resultText: string): CompetitiveInsight[] {
  // This is a simplified parser - in production, use structured output
  const insights: CompetitiveInsight[] = [];

  // Look for common patterns in the result text
  const sections = resultText.split(/#{2,3}\s*/);

  for (const section of sections) {
    const lowerSection = section.toLowerCase();

    if (lowerSection.includes('price') && lowerSection.includes('opportunit')) {
      insights.push({
        type: 'price_opportunity',
        severity: lowerSection.includes('critical') ? 'critical' : 'high',
        title: 'Price Opportunity Identified',
        description: section.slice(0, 500),
        recommendations: ['Review pricing strategy', 'Consider price matching'],
      });
    }

    if (lowerSection.includes('gap') || lowerSection.includes('missing')) {
      insights.push({
        type: 'product_gap',
        severity: 'medium',
        title: 'Product Gap Detected',
        description: section.slice(0, 500),
        recommendations: ['Evaluate adding product to inventory'],
      });
    }

    if (lowerSection.includes('threat') || lowerSection.includes('alert')) {
      insights.push({
        type: 'threat_alert',
        severity: 'critical',
        title: 'Competitive Threat Detected',
        description: section.slice(0, 500),
        recommendations: ['Consider counter-campaign', 'Monitor closely'],
      });
    }

    if (lowerSection.includes('trend') || lowerSection.includes('market')) {
      insights.push({
        type: 'market_trend',
        severity: 'low',
        title: 'Market Trend Observation',
        description: section.slice(0, 500),
        recommendations: ['Continue monitoring'],
      });
    }
  }

  return insights.slice(0, 10); // Limit to 10 insights
}

function generateActionItems(
  insights: CompetitiveInsight[],
  priceComparisons: Array<{ recommendation: string }>
): ActionItem[] {
  const items: ActionItem[] = [];

  // Generate action items from insights
  for (const insight of insights) {
    if (insight.severity === 'critical') {
      items.push({
        action: insight.recommendations[0] || 'Review critical insight',
        delegateTo: insight.type === 'threat_alert' ? 'craig' : undefined,
        priority: 10,
        context: { insightType: insight.type },
      });
    } else if (insight.severity === 'high') {
      items.push({
        action: insight.recommendations[0] || 'Review high-priority insight',
        priority: 7,
        context: { insightType: insight.type },
      });
    }
  }

  // Add pricing action items
  const priceActions = priceComparisons.filter(
    (p) => p.recommendation && p.recommendation !== 'competitive'
  );
  if (priceActions.length > 0) {
    items.push({
      action: `Review pricing on ${priceActions.length} products`,
      delegateTo: 'money_mike',
      priority: 6,
      context: { productCount: priceActions.length },
    });
  }

  return items.slice(0, 10); // Limit to 10 action items
}

// ============================================================================
// DEFAULT PRICE COMPARATOR
// ============================================================================

/**
 * Create a simple price comparator that checks against tenant's products.
 */
export function createDefaultPriceComparator(
  getOurProducts: (tenantId: string) => Promise<Array<{ name: string; price: number }>>
): AnalyzerTools['compareWithOurPrices'] {
  return async (competitorProducts, tenantId) => {
    const ourProducts = await getOurProducts(tenantId);
    const ourPriceMap = new Map(
      ourProducts.map((p) => [p.name.toLowerCase(), p.price])
    );

    return competitorProducts
      .filter((p) => p.price !== undefined)
      .map((p) => {
        const ourPrice = ourPriceMap.get(p.name.toLowerCase());
        let recommendation = 'new_product';

        if (ourPrice !== undefined && p.price !== undefined) {
          const diff = ourPrice - p.price;
          const pctDiff = (diff / ourPrice) * 100;

          if (pctDiff > 10) {
            recommendation = 'overpriced';
          } else if (pctDiff < -10) {
            recommendation = 'underpriced';
          } else {
            recommendation = 'competitive';
          }
        }

        return {
          productName: p.name,
          ourPrice,
          competitorPrice: p.price!,
          priceDifference: ourPrice ? ourPrice - p.price! : undefined,
          recommendation,
        };
      });
  };
}
