/**
 * Big Worm Agent - NotebookLM Research Tools
 *
 * Specialized tools for competitive intelligence and market research
 * using the NotebookLM MCP integration.
 */

import { notebookLM } from '@/server/services/notebooklm-client';
import { logger } from '@/lib/logger';

export interface CompetitorIntelligence {
  competitor: string;
  pricing: string;
  products: string;
  marketing: string;
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
  lastUpdated: Date;
}

export interface MarketTrends {
  trends: string[];
  insights: string;
  opportunities: string[];
  threats: string[];
  recommendations: string[];
}

/**
 * Research competitor strategies and positioning
 */
export async function researchCompetitor(
  competitorName: string,
  focus?: 'pricing' | 'products' | 'marketing' | 'all'
): Promise<CompetitorIntelligence> {
  const focusArea = focus === 'all' || !focus
    ? 'all aspects including pricing, products, marketing, and positioning'
    : focus;

  const query = `
    Competitive Intelligence Analysis for: ${competitorName}
    Focus: ${focusArea}

    Please provide detailed information about:
    1. Pricing strategies and price points
    2. Product lineup and positioning
    3. Marketing approach and messaging
    4. Competitive advantages (strengths)
    5. Vulnerabilities (weaknesses)
    6. Market opportunities they're pursuing
    7. Threats to their position

    Format the response clearly with sections for each area.
  `.trim();

  logger.info('Big Worm: Researching competitor', { competitor: competitorName, focus });

  const response = await notebookLM.chat({ message: query });

  if (response.error) {
    logger.error('Competitor research failed', { competitor: competitorName, error: response.error });
    throw new Error(`Research failed: ${response.error}`);
  }

  // Parse the structured response
  return parseCompetitorIntelligence(competitorName, response.response);
}

/**
 * Analyze market trends and opportunities
 */
export async function analyzeMarketTrends(
  category: string,
  region?: string
): Promise<MarketTrends> {
  const regionFilter = region ? `in ${region}` : 'across the market';

  const query = `
    Market Trends Analysis
    Category: ${category}
    Region: ${regionFilter}

    Based on the research data, identify:
    1. Top emerging trends in this category
    2. Key insights and patterns
    3. Opportunities for brands to capitalize on
    4. Potential threats or challenges
    5. Strategic recommendations

    Provide specific, actionable insights with examples.
  `.trim();

  logger.info('Big Worm: Analyzing market trends', { category, region });

  const response = await notebookLM.chat({ message: query });

  if (response.error) {
    throw new Error(`Trend analysis failed: ${response.error}`);
  }

  return parseMarketTrends(response.response);
}

/**
 * Get pricing intelligence for competitive positioning
 */
export async function getPricingIntelligence(
  productCategory: string,
  competitors?: string[]
): Promise<{
  priceRanges: Record<string, string>;
  strategies: string[];
  recommendations: string;
}> {
  const competitorFilter = competitors && competitors.length > 0
    ? `Specifically analyze: ${competitors.join(', ')}`
    : 'Analyze all major competitors in the research';

  const query = `
    Pricing Intelligence Report
    Category: ${productCategory}
    ${competitorFilter}

    Provide:
    1. Price ranges for each competitor
    2. Pricing strategies being used (premium, value, penetration, etc.)
    3. How prices compare to each other
    4. Recommendations for competitive pricing

    Be specific with dollar amounts where available.
  `.trim();

  logger.info('Big Worm: Getting pricing intelligence', { productCategory, competitors });

  const response = await notebookLM.chat({ message: query });

  if (response.error) {
    throw new Error(`Pricing research failed: ${response.error}`);
  }

  return parsePricingIntelligence(response.response);
}

/**
 * Identify competitive gaps and opportunities
 */
export async function findMarketGaps(
  category: string
): Promise<{
  gaps: string[];
  opportunities: string[];
  recommendations: string;
}> {
  const query = `
    Market Gap Analysis
    Category: ${category}

    Based on competitor analysis and market research:
    1. What gaps exist in the current market?
    2. What customer needs are underserved?
    3. What opportunities exist for differentiation?
    4. What recommendations would you make for a brand entering or competing in this space?

    Focus on actionable insights and specific opportunities.
  `.trim();

  logger.info('Big Worm: Finding market gaps', { category });

  const response = await notebookLM.chat({ message: query });

  if (response.error) {
    throw new Error(`Gap analysis failed: ${response.error}`);
  }

  return parseMarketGaps(response.response);
}

/**
 * Get competitive landscape overview
 */
export async function getCompetitiveLandscape(
  category: string,
  region?: string
): Promise<{
  overview: string;
  keyPlayers: string[];
  marketDynamics: string;
  threats: string[];
  opportunities: string[];
}> {
  const regionFilter = region ? `in ${region}` : '';

  const query = `
    Competitive Landscape Overview
    Category: ${category} ${regionFilter}

    Provide a comprehensive overview including:
    1. Overall market landscape
    2. Key players and their positions
    3. Market dynamics and competitive forces
    4. Major threats and challenges
    5. Strategic opportunities

    Give me the big picture with specific details.
  `.trim();

  logger.info('Big Worm: Getting competitive landscape', { category, region });

  const response = await notebookLM.chat({ message: query });

  if (response.error) {
    throw new Error(`Landscape analysis failed: ${response.error}`);
  }

  return parseCompetitiveLandscape(response.response);
}

/**
 * Compare multiple competitors head-to-head
 */
export async function compareCompetitors(
  competitors: string[],
  criteria: string[] = ['pricing', 'products', 'marketing']
): Promise<Map<string, Record<string, string>>> {
  const query = `
    Competitive Comparison
    Competitors: ${competitors.join(', ')}
    Compare on: ${criteria.join(', ')}

    Create a detailed comparison showing:
    ${criteria.map(c => `- ${c.charAt(0).toUpperCase() + c.slice(1)}`).join('\n')}

    Highlight key differences and competitive advantages for each.
  `.trim();

  logger.info('Big Worm: Comparing competitors', { competitors, criteria });

  const response = await notebookLM.chat({ message: query });

  if (response.error) {
    throw new Error(`Comparison failed: ${response.error}`);
  }

  return parseComparisonResults(competitors, criteria, response.response);
}

// Helper parsing functions

function parseCompetitorIntelligence(
  competitor: string,
  text: string
): CompetitorIntelligence {
  // Extract sections from the response
  const extractSection = (keyword: string): string => {
    const regex = new RegExp(`${keyword}[:\\s]+([^]*?)(?=\\n\\n|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : 'Not available';
  };

  return {
    competitor,
    pricing: extractSection('pricing'),
    products: extractSection('product'),
    marketing: extractSection('marketing'),
    strengths: extractSection('strengths?|advantages'),
    weaknesses: extractSection('weaknesses?|vulnerabilities'),
    opportunities: extractSection('opportunities'),
    threats: extractSection('threats'),
    lastUpdated: new Date()
  };
}

function parseMarketTrends(text: string): MarketTrends {
  // Extract trends (numbered lists or bullet points)
  const trendMatches = text.match(/(?:^|\n)[-•*\d.]+\s*(.+)/gm);
  const trends = trendMatches
    ? trendMatches.map(t => t.replace(/^[-•*\d.]+\s*/, '').trim()).filter(Boolean)
    : [];

  // Extract opportunities
  const oppsSection = text.match(/opportunities?[:\s]+([^]*?)(?=\n\n|threats|recommendations|$)/i);
  const opportunities = oppsSection
    ? oppsSection[1].match(/[-•*]\s*(.+)/g)?.map(o => o.replace(/^[-•*]\s*/, '').trim()) || []
    : [];

  // Extract threats
  const threatsSection = text.match(/threats?[:\s]+([^]*?)(?=\n\n|recommendations|$)/i);
  const threats = threatsSection
    ? threatsSection[1].match(/[-•*]\s*(.+)/g)?.map(t => t.replace(/^[-•*]\s*/, '').trim()) || []
    : [];

  // Extract recommendations
  const recsSection = text.match(/recommendations?[:\s]+([^]*?)$/i);
  const recommendations = recsSection
    ? recsSection[1].match(/[-•*\d.]+\s*(.+)/gm)?.map(r => r.replace(/^[-•*\d.]+\s*/, '').trim()) || []
    : [];

  return {
    trends: trends.slice(0, 10), // Top 10 trends
    insights: text,
    opportunities,
    threats,
    recommendations
  };
}

function parsePricingIntelligence(text: string): {
  priceRanges: Record<string, string>;
  strategies: string[];
  recommendations: string;
} {
  const priceRanges: Record<string, string> = {};

  // Extract price ranges (e.g., "Brand X: $20-$40")
  const priceMatches = text.matchAll(/([A-Z][a-zA-Z\s&]+):\s*\$?([\d.,-]+)/g);
  for (const match of priceMatches) {
    priceRanges[match[1].trim()] = match[2];
  }

  // Extract strategies
  const strategiesSection = text.match(/strateg(?:y|ies)[:\s]+([^]*?)(?=\n\n|recommendations|$)/i);
  const strategies = strategiesSection
    ? strategiesSection[1].match(/[-•*\d.]+\s*(.+)/gm)?.map(s => s.replace(/^[-•*\d.]+\s*/, '').trim()) || []
    : [];

  // Extract recommendations
  const recsSection = text.match(/recommendations?[:\s]+([^]*?)$/i);
  const recommendations = recsSection ? recsSection[1].trim() : text;

  return {
    priceRanges,
    strategies,
    recommendations
  };
}

function parseMarketGaps(text: string): {
  gaps: string[];
  opportunities: string[];
  recommendations: string;
} {
  // Extract gaps
  const gapsSection = text.match(/gaps?[:\s]+([^]*?)(?=\n\n|opportunit|recommendations|$)/i);
  const gaps = gapsSection
    ? gapsSection[1].match(/[-•*\d.]+\s*(.+)/gm)?.map(g => g.replace(/^[-•*\d.]+\s*/, '').trim()) || []
    : [];

  // Extract opportunities
  const oppsSection = text.match(/opportunit(?:y|ies)[:\s]+([^]*?)(?=\n\n|recommendations|$)/i);
  const opportunities = oppsSection
    ? oppsSection[1].match(/[-•*\d.]+\s*(.+)/gm)?.map(o => o.replace(/^[-•*\d.]+\s*/, '').trim()) || []
    : [];

  // Extract recommendations
  const recsSection = text.match(/recommendations?[:\s]+([^]*?)$/i);
  const recommendations = recsSection ? recsSection[1].trim() : text;

  return {
    gaps,
    opportunities,
    recommendations
  };
}

function parseCompetitiveLandscape(text: string): {
  overview: string;
  keyPlayers: string[];
  marketDynamics: string;
  threats: string[];
  opportunities: string[];
} {
  // Extract overview
  const overviewSection = text.match(/(?:overview|landscape)[:\s]+([^]*?)(?=\n\n|key players|$)/i);
  const overview = overviewSection ? overviewSection[1].trim() : text.substring(0, 200);

  // Extract key players
  const playersSection = text.match(/key players?[:\s]+([^]*?)(?=\n\n|market dynamics|$)/i);
  const keyPlayers = playersSection
    ? playersSection[1].match(/[-•*\d.]+\s*(.+)/gm)?.map(p => p.replace(/^[-•*\d.]+\s*/, '').trim()) || []
    : [];

  // Extract market dynamics
  const dynamicsSection = text.match(/market dynamics[:\s]+([^]*?)(?=\n\n|threats|opportunities|$)/i);
  const marketDynamics = dynamicsSection ? dynamicsSection[1].trim() : '';

  // Extract threats and opportunities
  const threatsSection = text.match(/threats?[:\s]+([^]*?)(?=\n\n|opportunities|$)/i);
  const threats = threatsSection
    ? threatsSection[1].match(/[-•*\d.]+\s*(.+)/gm)?.map(t => t.replace(/^[-•*\d.]+\s*/, '').trim()) || []
    : [];

  const oppsSection = text.match(/opportunit(?:y|ies)[:\s]+([^]*?)$/i);
  const opportunities = oppsSection
    ? oppsSection[1].match(/[-•*\d.]+\s*(.+)/gm)?.map(o => o.replace(/^[-•*\d.]+\s*/, '').trim()) || []
    : [];

  return {
    overview,
    keyPlayers,
    marketDynamics,
    threats,
    opportunities
  };
}

function parseComparisonResults(
  competitors: string[],
  criteria: string[],
  text: string
): Map<string, Record<string, string>> {
  const results = new Map<string, Record<string, string>>();

  for (const competitor of competitors) {
    const compData: Record<string, string> = {};

    for (const criterion of criteria) {
      // Try to find section for this competitor + criterion
      const pattern = new RegExp(
        `${competitor}[^]*?${criterion}[:\\s]+([^]*?)(?=\\n\\n|${competitors.join('|')}|$)`,
        'i'
      );
      const match = text.match(pattern);

      compData[criterion] = match ? match[1].trim().substring(0, 200) : 'Not available';
    }

    results.set(competitor, compData);
  }

  return results;
}

// Export all tools
export const bigWormResearch = {
  researchCompetitor,
  analyzeMarketTrends,
  getPricingIntelligence,
  findMarketGaps,
  getCompetitiveLandscape,
  compareCompetitors
};
