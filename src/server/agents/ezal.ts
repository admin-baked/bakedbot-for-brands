import { AgentImplementation } from './harness';
import { EzalMemory } from './schemas';
import { logger } from '@/lib/logger';
import { calculateGapScore } from '../algorithms/ezal-algo';
import { getCompetitiveIntelForAgent, getLocalCompetition } from '../services/leafly-connector';

// --- Tool Definitions ---

export interface EzalTools {
  // Scrape a competitor menu (Mock for now, or fetch HTML)
  scrapeMenu(url: string): Promise<{ products: any[] }>;
  // Compare my prices vs competitor prices
  comparePricing(myProducts: any[], competitorProducts: any[]): Promise<{ price_index: number }>;
  // NEW: Get competitive intel from Leafly data
  getCompetitiveIntel(state: string, city?: string): Promise<string>;
  // NEW: Search the web for general research
  searchWeb(query: string): Promise<string>;
}

// --- Ezal Agent Implementation ---

export const ezalAgent: AgentImplementation<EzalMemory, EzalTools> = {
  agentName: 'ezal',

  async initialize(brandMemory, agentMemory) {
    logger.info('[Ezal] Initializing. Checking watchlist...');
    return agentMemory;
  },

  async orient(brandMemory, agentMemory) {
    // 1. Check for stale competitor data (> 7 days old)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    // Find a competitor who hasn't been scraped recently
    const staleCompetitor = agentMemory.competitor_watchlist.find(c => {
      if (!c.last_scrape) return true;
      const last = typeof c.last_scrape === 'string' ? new Date(c.last_scrape).getTime() :
        c.last_scrape instanceof Date ? c.last_scrape.getTime() : 0;
      return last < sevenDaysAgo;
    });

    if (staleCompetitor) {
      return `scrape:${staleCompetitor.id}`;
    }

    // 2. Fallback to general competitive research if no specific stale items
    return 'general_research';
  },

  async act(brandMemory, agentMemory, targetId, tools: EzalTools) {
    let resultMessage = '';

    if (targetId.startsWith('scrape:')) {
      const competitorId = targetId.split(':')[1];
      const competitor = agentMemory.competitor_watchlist.find(c => c.id === competitorId);

      if (!competitor) throw new Error(`Competitor ${competitorId} not found`);

      // Mock URL logic (in real implementation, stored in competitor metadata)
      const mockUrl = `https://${competitor.name.toLowerCase().replace(/\s/g, '')}.com/menu`;

      // Use Tool: Scrape Menu
      const menuData = await tools.scrapeMenu(mockUrl);

      // Update timestamp
      competitor.last_scrape = new Date();

      // Use Tool: Compare Pricing (Mocking "My Products" for now)
      // In reality, we'd fetch our own inventory from Brand Memory or a tool
      const myMockProducts = [{ name: 'Live Rosin 1g', price: 60 }];
      const comparison = await tools.comparePricing(myMockProducts, menuData.products);

      resultMessage = `Scraped ${competitor.name}. Found ${menuData.products.length} items. Price Index: ${comparison.price_index.toFixed(2)}.`;

      // Logic to find gaps based on comparison
      if (comparison.price_index < 0.9) {
        // If we are significantly cheaper, maybe opportunity? Or if expensive, gap?
        // Let's say if competitor is cheaper (index > 1.0 implies we are expensive? No, let's say index = One's Price / Competitor Price)
        // If index > 1.1, we are expensive.
      }

      // Stubbing simple gap finding from tool output directly or just keeping existing stub logic but enriched
      if (menuData.products.some(p => p.price < 50)) { // Simple check

        // Calculate gap score
        const gapScore = calculateGapScore({
          missing_price_tiers: 1, // Found inexpensive item, implies we might not have it contextually? Or other way around. Logic is stubbed.
          missing_forms: 0,
          underrepresented_effects: 2
        });

        const newGapId = `gap_${Date.now()}`;
        agentMemory.open_gaps.push({
          id: newGapId,
          description: `Competitor ${competitor.name} has sub-$50 Rosin (Score: ${gapScore})`,
          status: 'open',
          recommended_owner: 'money_mike'
        });
      }

      return {
        updatedMemory: agentMemory,
        logEntry: {
          action: 'scrape_competitor',
          result: resultMessage,
          metadata: { competitor_id: competitorId, items_scraped: menuData.products.length }
        }
      };
    }

    if (targetId === 'general_research') {
      const researchQuery = stimulus && typeof stimulus === 'string'
        ? stimulus
        : `latest cannabis market trends for ${brandMemory.brand_profile.name || 'dispensaries'}`;

      const researchResult = await tools.searchWeb(researchQuery);

      return {
        updatedMemory: agentMemory,
        logEntry: {
          action: 'general_research',
          result: researchResult, // Return the full formatted result
          metadata: { query: researchQuery }
        }
      };
    }

    throw new Error(`Unknown target action ${targetId}`);
  }
};


export async function handleEzalEvent(orgId: string, eventId: string) {
  logger.info(`[Ezal] Handled event ${eventId} for org ${orgId} (Stub)`);
}

