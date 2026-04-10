/**
 * Dynamic Card Generator
 *
 * Executes discovered card definitions by fetching the required data source
 * and rendering headline/subtext templates into InsightCards.
 *
 * Extends InsightGeneratorBase so cards flow through the same pipeline
 * as static cards (Firestore → useInsights → dashboard grid).
 */

import { InsightGeneratorBase } from '../insight-generator-base';
import { logger } from '@/lib/logger';
import { redditSearch, redditBrowseSubreddit } from '@/server/tools/reddit-tools';
import { jinaSearch } from '@/server/tools/jina-tools';
import { getAdminFirestore } from '@/firebase/admin';
import { getAlleavesClientForOrg } from '@/server/services/alleaves/client';
import type { InsightCard } from '@/types/insight-cards';
import type { DiscoveredCardDefinition } from '@/types/discovered-cards';

// ============================================================================
// Dynamic Card Generator
// ============================================================================

export class DynamicCardGenerator extends InsightGeneratorBase {
  private definition: DiscoveredCardDefinition;

  constructor(orgId: string, definition: DiscoveredCardDefinition) {
    super(orgId, definition.agentId, definition.agentName, definition.category);
    this.definition = definition;
  }

  async generate(): Promise<InsightCard[]> {
    try {
      const data = await this.fetchData();

      if (!data || Object.keys(data).length === 0) {
        logger.debug('[DynamicCard] No data returned for card', {
          orgId: this.orgId,
          title: this.definition.title,
        });
        return [];
      }

      const headline = renderTemplate(this.definition.headlineTemplate, data);
      const subtext = this.definition.subtextTemplate
        ? renderTemplate(this.definition.subtextTemplate, data)
        : undefined;

      const threadPrompt = renderTemplate(
        this.definition.ctaAction.threadPromptTemplate,
        data
      );

      const insight = this.createInsight({
        title: this.definition.title,
        headline,
        subtext,
        severity: this.definition.severity,
        actionable: true,
        ctaLabel: this.definition.ctaAction.label,
        threadType: this.definition.ctaAction.threadType,
        threadPrompt,
        dataSource: this.definition.dataSource,
        metadata: {
          isDiscovered: true,
          cardDefinitionId: this.definition.slug,
          discoveredWeek: this.definition.proposedWeek,
          rawData: data,
        },
      });

      await this.saveInsights([insight]);
      return [insight];
    } catch (err) {
      logger.error('[DynamicCard] Generation failed', {
        error: err,
        orgId: this.orgId,
        title: this.definition.title,
      });
      return [];
    }
  }

  // ==========================================================================
  // Data Fetching (dispatched by queryConfig.type)
  // ==========================================================================

  private async fetchData(): Promise<Record<string, string>> {
    const { queryConfig } = this.definition;

    switch (queryConfig.type) {
      case 'reddit_search':
        return this.fetchRedditData();
      case 'pos_velocity':
      case 'pos_orders':
        return this.fetchPosData();
      case 'competitive_scan':
        return this.fetchCompetitiveData();
      case 'crm_segments':
        return this.fetchCrmData();
      case 'jina_search':
        return this.fetchJinaData();
      case 'composite':
        return this.fetchCompositeData();
      default:
        logger.warn('[DynamicCard] Unknown query type', { type: queryConfig.type });
        return {};
    }
  }

  private async fetchRedditData(): Promise<Record<string, string>> {
    const { query, subreddit } = this.definition.queryConfig;
    if (!query) return {};

    try {
      const result = subreddit
        ? await redditSearch(query, subreddit, 'hot', 5)
        : await redditBrowseSubreddit('trees', 'hot', 'week', 5);

      // Extract the first trending topic from the result text
      const lines = result.split('\n').filter((l) => l.trim().length > 0);
      const firstTitle = lines.find((l) => l.startsWith('**') || l.includes('|'))
        ?? lines[0] ?? 'No trending topics';

      return {
        trendingTopic: firstTitle.replace(/\*\*/g, '').slice(0, 80),
        subreddit: subreddit ?? 'trees',
        postCount: String(lines.filter((l) => l.includes('score:')).length || 0),
        fullResult: result.slice(0, 500),
      };
    } catch {
      return {};
    }
  }

  private async fetchPosData(): Promise<Record<string, string>> {
    try {
      const client = await getAlleavesClientForOrg(this.orgId);
      if (!client) return {};

      const menu = await client.fetchMenu();
      const totalProducts = menu.length;
      const categories = new Map<string, number>();
      for (const p of menu) {
        const cat = p.category ?? 'Other';
        categories.set(cat, (categories.get(cat) ?? 0) + 1);
      }

      const topCategory = [...categories.entries()]
        .sort((a, b) => b[1] - a[1])[0];

      return {
        totalProducts: String(totalProducts),
        topCategory: topCategory?.[0] ?? 'Unknown',
        topCategoryCount: String(topCategory?.[1] ?? 0),
        categoryCount: String(categories.size),
      };
    } catch {
      return {};
    }
  }

  private async fetchCompetitiveData(): Promise<Record<string, string>> {
    try {
      const db = getAdminFirestore();
      const snap = await db
        .collection('tenants')
        .doc(this.orgId)
        .collection('competitive_intel')
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();

      if (snap.empty) return {};

      const latest = snap.docs[0].data();
      return {
        competitorName: String(latest.competitorName ?? 'Competitor'),
        summary: String(latest.summary ?? '').slice(0, 200),
        changeCount: String(snap.size),
      };
    } catch {
      return {};
    }
  }

  private async fetchCrmData(): Promise<Record<string, string>> {
    try {
      const db = getAdminFirestore();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const snap = await db
        .collection('orders')
        .where('orgId', '==', this.orgId)
        .where('createdAt', '>=', todayStart)
        .limit(500)
        .get();

      const uniqueCustomers = new Set(
        snap.docs.map((d) => d.data().customerId).filter(Boolean)
      );

      return {
        todayOrders: String(snap.size),
        uniqueCustomers: String(uniqueCustomers.size),
      };
    } catch {
      return {};
    }
  }

  private async fetchJinaData(): Promise<Record<string, string>> {
    const { query } = this.definition.queryConfig;
    if (!query) return {};

    try {
      const results = await jinaSearch(query);
      if (results.length === 0) return {};

      const top = results[0];
      return {
        searchTitle: top.title ?? '',
        searchSnippet: top.snippet?.slice(0, 200) ?? '',
        resultCount: String(results.length),
      };
    } catch {
      return {};
    }
  }

  private async fetchCompositeData(): Promise<Record<string, string>> {
    // Composite: gather from multiple sources, merge into one map
    const [reddit, pos, competitive] = await Promise.allSettled([
      this.fetchRedditData(),
      this.fetchPosData(),
      this.fetchCompetitiveData(),
    ]);

    const merged: Record<string, string> = {};

    if (reddit.status === 'fulfilled') Object.assign(merged, reddit.value);
    if (pos.status === 'fulfilled') Object.assign(merged, pos.value);
    if (competitive.status === 'fulfilled') Object.assign(merged, competitive.value);

    return merged;
  }
}

// ============================================================================
// Template Rendering
// ============================================================================

/**
 * Simple Mustache-style template rendering.
 * Replaces {{key}} with data[key], or "N/A" if missing.
 */
function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return data[key] ?? 'N/A';
  });
}
