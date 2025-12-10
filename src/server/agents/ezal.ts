import { AgentImplementation } from './harness';
import { EzalMemory } from './schemas';
import { logger } from '@/lib/logger';

// Ezal: The Competitive Intelligence Agent
export const ezalAgent: AgentImplementation<EzalMemory> = {
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

    // 2. Check for open gaps that need detail filling (Not fully implemented in this phase)
    return null;
  },

  async act(brandMemory, agentMemory, targetId, tools: any) {
    let resultMessage = '';


    if (targetId.startsWith('scrape:')) {
      const competitorId = targetId.split(':')[1];
      const competitor = agentMemory.competitor_watchlist.find(c => c.id === competitorId);

      if (!competitor) throw new Error(`Competitor ${competitorId} not found`);

      // Simulate Scrape
      resultMessage = `Scraped ${competitor.name}. Found 2 potential gaps.`;

      // Update timestamp
      competitor.last_scrape = new Date();

      // Simulate Finding a Gap
      const newGapId = `gap_${Date.now()}`;
      agentMemory.open_gaps.push({
        id: newGapId,
        description: `Competitor ${competitor.name} has lower price on Live Rosin 1g`,
        status: 'open',
        recommended_owner: 'money_mike'
      });

      return {
        updatedMemory: agentMemory,
        logEntry: {
          action: 'scrape_competitor',
          result: resultMessage,
          metadata: { competitor_id: competitorId, new_gap_id: newGapId }
        }
      };
    }

    throw new Error(`Unknown target action ${targetId}`);
  }
};

export async function handleEzalEvent(orgId: string, eventId: string) {
  logger.info(`[Ezal] Handled event ${eventId} for org ${orgId} (Stub)`);
}

