/**
 * Card Discovery Service
 *
 * Every week, uses Claude to analyze POS data, competitive intel, and Reddit trends
 * to propose 3 new briefing card types for the dispensary dashboard.
 *
 * Cards are stored in tenants/{orgId}/discovered_card_definitions and executed
 * by DynamicCardGenerator every 2 hours.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { callClaude } from '@/ai/claude';
import { redditSearch } from '@/server/tools/reddit-tools';
import { getAgentDisplayName } from '@/types/insight-cards';
import type {
  DiscoveredCardDefinition,
  CardProposal,
} from '@/types/discovered-cards';
import type { InsightCategory } from '@/types/insight-cards';

// ============================================================================
// Constants
// ============================================================================

/** Static card titles that should never be duplicated */
const EXISTING_CARD_TITLES = [
  'Top Seller',
  'Slow Movers',
  'Expiring Soon',
  'Customer Mix',
  'Churn Risk',
  'Loyalty Performance',
  'Compliance',
  'Competitive Pricing',
  'Order Flow',
];

const VALID_CATEGORIES: InsightCategory[] = [
  'velocity', 'efficiency', 'customer', 'compliance', 'market',
];

const VALID_AGENT_IDS = [
  'money_mike', 'pops', 'smokey', 'mrs_parker', 'deebo', 'ezal', 'craig', 'day_day',
];

// ============================================================================
// Discovery Logic
// ============================================================================

/**
 * Discover 3 new briefing card types for a dispensary org.
 * Gathers POS summary, competitive intel, Reddit trends, then asks Claude to propose.
 */
export async function discoverNewCards(orgId: string): Promise<DiscoveredCardDefinition[]> {
  const now = new Date();
  const isoWeek = getISOWeek(now);

  // Gather context in parallel
  const [redditTrends, competitiveChanges, existingDynamic] = await Promise.all([
    gatherRedditTrends(),
    gatherCompetitiveContext(orgId),
    getExistingDynamicTitles(orgId),
  ]);

  const allExclusions = [...EXISTING_CARD_TITLES, ...existingDynamic];

  const prompt = buildDiscoveryPrompt(redditTrends, competitiveChanges, allExclusions);

  const response = await callClaude({
    systemPrompt: 'You are a cannabis retail data analyst. Respond ONLY with valid JSON.',
    userMessage: prompt,
    maxTokens: 2048,
    temperature: 0.9,
  });

  const proposals = parseProposals(response);
  if (proposals.length === 0) {
    logger.warn('[CardDiscovery] No valid proposals from LLM', { orgId });
    return [];
  }

  // Convert proposals to definitions and write to Firestore
  const definitions: DiscoveredCardDefinition[] = proposals.slice(0, 3).map((p) => {
    const slug = slugify(`${orgId}:discovered:${p.title}`);
    return {
      id: slug,
      title: p.title,
      slug,
      description: p.description,
      category: p.category,
      agentId: p.agentId,
      agentName: getAgentDisplayName(p.agentId),
      dataSource: p.dataSource,
      queryConfig: p.queryConfig,
      headlineTemplate: p.headlineTemplate,
      subtextTemplate: p.subtextTemplate,
      ctaAction: p.ctaAction,
      severity: p.severity,
      proposedWeek: isoWeek,
      status: 'active' as const,
      generationCount: 0,
      proposedAt: now,
      activatedAt: now,
    };
  });

  await saveDefinitions(orgId, definitions);

  // Retire stale definitions (>2 weeks old, low generation count)
  await retireStaleDefinitions(orgId, isoWeek);

  logger.info('[CardDiscovery] Discovered new cards', {
    orgId,
    count: definitions.length,
    titles: definitions.map((d) => d.title),
  });

  return definitions;
}

// ============================================================================
// Data Gathering
// ============================================================================

async function gatherRedditTrends(): Promise<string> {
  try {
    const subreddits = ['trees', 'NewYorkMMJ', 'cannabiscultivation'];
    const results = await Promise.allSettled(
      subreddits.map((sub) => redditSearch('trending dispensary deals', sub, 'hot', 5))
    );

    const summaries: string[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        summaries.push(result.value);
      }
    }

    return summaries.length > 0
      ? summaries.join('\n\n')
      : 'No Reddit trends available this week.';
  } catch (err) {
    logger.warn('[CardDiscovery] Reddit trends fetch failed', { error: err });
    return 'Reddit trends unavailable.';
  }
}

async function gatherCompetitiveContext(orgId: string): Promise<string> {
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('tenants')
      .doc(orgId)
      .collection('competitive_intel')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    if (snap.empty) return 'No competitive intel available.';

    const entries = snap.docs.map((doc) => {
      const d = doc.data();
      return `- ${d.competitorName ?? 'Unknown'}: ${d.summary ?? JSON.stringify(d).slice(0, 200)}`;
    });

    return `Recent competitive changes:\n${entries.join('\n')}`;
  } catch (err) {
    logger.warn('[CardDiscovery] Competitive context fetch failed', { error: err });
    return 'Competitive intel unavailable.';
  }
}

async function getExistingDynamicTitles(orgId: string): Promise<string[]> {
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('tenants')
      .doc(orgId)
      .collection('discovered_card_definitions')
      .where('status', '==', 'active')
      .get();

    return snap.docs.map((doc) => doc.data().title as string);
  } catch (err) {
    logger.warn('[CardDiscovery] Failed to load existing dynamic titles', { error: err });
    return [];
  }
}

// ============================================================================
// LLM Prompt
// ============================================================================

function buildDiscoveryPrompt(
  redditTrends: string,
  competitiveChanges: string,
  exclusions: string[]
): string {
  return `You are a cannabis retail data analyst. Propose exactly 3 NEW insight cards for a dispensary owner's dashboard.

EXISTING CARDS (do NOT duplicate these): ${exclusions.join(', ')}

DATA CONTEXT:
${redditTrends}

${competitiveChanges}

Each card should make a dispensary owner say "I didn't know that!" — surprising correlations, emerging trends, or hidden opportunities.

Respond with a JSON array of exactly 3 objects. Each object must have:
- "title": string (ALL CAPS, max 25 chars, unique)
- "description": string (what this card shows, 1-2 sentences)
- "category": one of "velocity", "efficiency", "customer", "compliance", "market"
- "agentId": one of "money_mike", "pops", "smokey", "mrs_parker", "deebo", "ezal", "craig", "day_day"
- "dataSource": one of "pos", "competitive", "reddit", "jina", "crm", "multi"
- "queryConfig": { "type": one of "reddit_search", "pos_velocity", "pos_orders", "competitive_scan", "crm_segments", "jina_search", "composite", "query": "search term if applicable" }
- "headlineTemplate": string with {{placeholders}} for dynamic data
- "subtextTemplate": optional string
- "ctaAction": { "label": string, "threadType": one of "inventory_promo", "campaign", "performance", "market_intel", "customer_health", "churn_risk", "general", "threadPromptTemplate": string }
- "severity": one of "critical", "warning", "info", "success"

ONLY output the JSON array. No markdown, no explanation.`;
}

// ============================================================================
// Response Parsing & Validation
// ============================================================================

function parseProposals(response: string): CardProposal[] {
  try {
    // Strip potential markdown fencing
    const cleaned = response
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isValidProposal)
      .map((raw) => ({
        title: String(raw.title).slice(0, 25).toUpperCase(),
        description: String(raw.description),
        category: raw.category as InsightCategory,
        agentId: raw.agentId,
        agentName: getAgentDisplayName(raw.agentId) ?? raw.agentId,
        dataSource: raw.dataSource,
        queryConfig: {
          type: raw.queryConfig?.type ?? 'composite',
          query: raw.queryConfig?.query,
          subreddit: raw.queryConfig?.subreddit,
          posMetric: raw.queryConfig?.posMetric,
          filterCriteria: raw.queryConfig?.filterCriteria,
        },
        headlineTemplate: String(raw.headlineTemplate),
        subtextTemplate: raw.subtextTemplate ? String(raw.subtextTemplate) : undefined,
        ctaAction: {
          label: String(raw.ctaAction?.label ?? 'View Details'),
          threadType: raw.ctaAction?.threadType ?? 'general',
          threadPromptTemplate: String(raw.ctaAction?.threadPromptTemplate ?? ''),
        },
        severity: raw.severity ?? 'info',
      }));
  } catch (err) {
    logger.error('[CardDiscovery] Failed to parse LLM response', { error: err });
    return [];
  }
}

function isValidProposal(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;

  if (!r.title || typeof r.title !== 'string') return false;
  if (!r.category || !VALID_CATEGORIES.includes(r.category as InsightCategory)) return false;
  if (!r.agentId || !VALID_AGENT_IDS.includes(r.agentId as string)) return false;
  if (!r.headlineTemplate || typeof r.headlineTemplate !== 'string') return false;

  return true;
}

// ============================================================================
// Persistence
// ============================================================================

async function saveDefinitions(
  orgId: string,
  definitions: DiscoveredCardDefinition[]
): Promise<void> {
  const db = getAdminFirestore();
  const batch = db.batch();

  for (const def of definitions) {
    const ref = db
      .collection('tenants')
      .doc(orgId)
      .collection('discovered_card_definitions')
      .doc(def.slug);

    batch.set(ref, {
      ...def,
      proposedAt: FieldValue.serverTimestamp(),
      activatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
}

async function retireStaleDefinitions(orgId: string, currentWeek: string): Promise<void> {
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('tenants')
      .doc(orgId)
      .collection('discovered_card_definitions')
      .where('status', '==', 'active')
      .get();

    const batch = db.batch();
    let retireCount = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const proposedWeek = data.proposedWeek as string;

      // Keep cards from current week and last week
      if (proposedWeek === currentWeek) continue;
      const weekDiff = getWeekDiff(proposedWeek, currentWeek);
      if (weekDiff < 2) continue;

      // Retire if low generation count (never produced useful output)
      if ((data.generationCount ?? 0) < 3) {
        batch.update(doc.ref, {
          status: 'retired',
          retiredAt: FieldValue.serverTimestamp(),
        });
        retireCount++;
      }
    }

    if (retireCount > 0) {
      await batch.commit();
      logger.info('[CardDiscovery] Retired stale definitions', { orgId, retireCount });
    }
  } catch (err) {
    logger.error('[CardDiscovery] Failed to retire stale definitions', { error: err });
  }
}

// ============================================================================
// Helpers
// ============================================================================

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '_')
    .slice(0, 500);
}

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getWeekDiff(weekA: string, weekB: string): number {
  const parseWeek = (w: string) => {
    const match = w.match(/^(\d{4})-W(\d{2})$/);
    if (!match) return 0;
    return parseInt(match[1]) * 52 + parseInt(match[2]);
  };
  return Math.abs(parseWeek(weekB) - parseWeek(weekA));
}

/**
 * Get all active discovered card definitions for an org.
 * Used by DynamicCardGenerator and the generation cron.
 */
export async function getActiveCardDefinitions(
  orgId: string
): Promise<DiscoveredCardDefinition[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection('tenants')
    .doc(orgId)
    .collection('discovered_card_definitions')
    .where('status', '==', 'active')
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      proposedAt: data.proposedAt?.toDate?.() ?? new Date(),
      activatedAt: data.activatedAt?.toDate?.() ?? undefined,
      lastGeneratedAt: data.lastGeneratedAt?.toDate?.() ?? undefined,
      retiredAt: data.retiredAt?.toDate?.() ?? undefined,
    } as DiscoveredCardDefinition;
  });
}

/**
 * Increment generation count for a card definition after successful generation.
 */
export async function markDefinitionGenerated(
  orgId: string,
  slug: string
): Promise<void> {
  const db = getAdminFirestore();
  await db
    .collection('tenants')
    .doc(orgId)
    .collection('discovered_card_definitions')
    .doc(slug)
    .update({
      generationCount: FieldValue.increment(1),
      lastGeneratedAt: FieldValue.serverTimestamp(),
    });
}
