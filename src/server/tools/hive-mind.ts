/**
 * Hive Mind Tools
 *
 * Shared knowledge layer for all BakedBot agents.
 * Agents can query verified compliance facts and share novel discoveries
 * with the whole squad via Letta archival memory.
 *
 * Tool definitions use the ClaudeTool format (plain objects with input_schema)
 * so they drop directly into ELROY_TOOLS and any other ClaudeTool[] array.
 *
 * Safety rule: agents share competitor behavior, industry trends, compliance
 * updates, product knowledge, and operational best practices — NEVER BakedBot
 * pricing strategy, customer PII, internal financials, or proprietary methods.
 */

import type { ClaudeTool } from '@/ai/claude';
import { lettaClient } from '@/server/services/letta/client';
import { archivalTagsService } from '@/server/services/letta/archival-tags';
import { logger } from '@/lib/logger';

// ============================================================================
// CONSTANTS
// ============================================================================

const HIVE_MIND_AGENT_NAME = 'BakedBot Hive Mind';

// ============================================================================
// TOOL DEFINITIONS (ClaudeTool format)
// ============================================================================

export const HIVE_MIND_TOOLS: ClaudeTool[] = [
    {
        name: 'get_compliance_context',
        description: 'Query the BakedBot Hive Mind for verified cannabis compliance facts for a given US state and topic. Use this BEFORE answering any compliance, advertising, packaging, licensing, delivery, or tax question. Returns verified facts written by Deebo (the compliance enforcer).',
        input_schema: {
            type: 'object' as const,
            properties: {
                state: {
                    type: 'string',
                    description: 'Two-letter US state code (NY, CA, CO, IL, MA, WA, NV, NJ, MI)',
                },
                topic: {
                    type: 'string',
                    description: 'The compliance topic (e.g. "advertising", "possession limits", "packaging", "delivery", "tax")',
                },
            },
            required: ['state', 'topic'],
        },
    },
    {
        name: 'share_with_hive',
        description: `Share a novel discovery, insight, or important fact with all BakedBot agents via the Hive Mind.

BEFORE calling this tool, self-assess:
- SAFE to share: competitor behavior, industry trends, compliance updates, product knowledge, operational best practices, customer behavior patterns (anonymized)
- DO NOT share: BakedBot pricing strategy, customer PII (names/phones/addresses), internal financial targets, proprietary algorithms or methods, anything that gives competitors an edge against BakedBot

Only call this if the insight is genuinely novel and useful to other agents or operators. Don't over-share routine observations.`,
        input_schema: {
            type: 'object' as const,
            properties: {
                fact: {
                    type: 'string',
                    description: 'The insight or discovery to share',
                },
                category: {
                    type: 'string',
                    enum: ['compliance', 'competitor_intel', 'product_knowledge', 'customer_behavior', 'market_trend', 'operational', 'platform_update'],
                    description: 'Category of knowledge',
                },
                confidence: {
                    type: 'string',
                    enum: ['observed', 'inferred', 'verified'],
                    description: 'How confident you are: observed=directly saw it, inferred=logical conclusion, verified=confirmed from authoritative source',
                },
            },
            required: ['fact', 'category', 'confidence'],
        },
    },
    {
        name: 'get_hive_knowledge',
        description: 'Query the BakedBot Hive Mind for any shared knowledge on a topic. Useful before answering questions about competitors, market trends, product knowledge, or operational best practices.',
        input_schema: {
            type: 'object' as const,
            properties: {
                query: {
                    type: 'string',
                    description: 'What you want to know — use natural language',
                },
                category: {
                    type: 'string',
                    enum: ['compliance', 'competitor_intel', 'product_knowledge', 'customer_behavior', 'market_trend', 'operational', 'platform_update'],
                    description: 'Optional: filter by category',
                },
            },
            required: ['query'],
        },
    },
];

// ============================================================================
// HIVE MIND AGENT BOOTSTRAP
// ============================================================================

async function getOrCreateHiveMindAgent(): Promise<{ id: string }> {
    try {
        const agents = await lettaClient.listAgents();
        const existing = agents.find(a => a.name === HIVE_MIND_AGENT_NAME);
        if (existing) return existing;

        logger.info('[HiveMind] Creating Hive Mind agent');
        return await lettaClient.createAgent(
            HIVE_MIND_AGENT_NAME,
            'You are the BakedBot Hive Mind — the shared long-term memory for the entire BakedBot agent squad. You store verified compliance facts, competitive intelligence, product knowledge, and operational best practices. Every agent can read from and write to you. Be precise and well-tagged.'
        );
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('[HiveMind] Failed to get/create Hive Mind agent', { error: msg });
        throw err;
    }
}

// ============================================================================
// IMPLEMENTATION FUNCTIONS
// ============================================================================

/**
 * Query verified compliance facts for a state + topic.
 * Called by Elroy (and other agents) via the get_compliance_context tool.
 */
export async function executeGetComplianceContext(
    state: string,
    topic: string,
    _orgId: string
): Promise<string> {
    try {
        const agent = await getOrCreateHiveMindAgent();
        const results = await archivalTagsService.searchByTags(agent.id, [
            'hive-mind',
            'compliance',
            `state:${state.toUpperCase()}`,
        ], {
            query: `${state} ${topic} compliance`,
            requireAllTags: false,
            limit: 5,
        });

        if (results.length === 0) {
            return `No verified compliance facts found for ${state} / ${topic} in the Hive Mind — Deebo has not yet populated this knowledge. Use general training knowledge and recommend verifying with a compliance officer.`;
        }

        // Filter for topic relevance (tags + text match)
        const topicLower = topic.toLowerCase();
        const relevant = results.filter(r => r.toLowerCase().includes(topicLower));
        const toReturn = (relevant.length > 0 ? relevant : results).slice(0, 3);

        return `[HIVE MIND — Compliance / ${state} / ${topic}]\n\n${toReturn.join('\n\n---\n\n')}`;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('[HiveMind] executeGetComplianceContext failed', { state, topic, error: msg });
        return `Hive Mind temporarily unavailable — use general training knowledge and recommend verifying with a compliance officer. (Error: ${msg})`;
    }
}

/**
 * Share a novel discovery with the entire squad via Hive Mind archival memory.
 * Called by any agent via the share_with_hive tool.
 */
export async function executeShareWithHive(
    fact: string,
    category: string,
    confidence: string,
    sourceAgent: string,
    _orgId: string
): Promise<string> {
    try {
        const agent = await getOrCreateHiveMindAgent();
        const timestamp = new Date().toISOString();
        const header = `[HIVE MIND | ${category} | ${confidence} | from: ${sourceAgent} | ${timestamp}]`;
        const taggedContent = `${header}\n\n${fact}`;

        await archivalTagsService.insertWithTags(agent.id, {
            content: taggedContent,
            tags: [
                'hive-mind',
                `category:${category}`,
                `confidence:${confidence}`,
                `agent:${sourceAgent}`,
            ],
            agentId: agent.id,
            tenantId: 'hive-mind-global',
        });

        logger.info('[HiveMind] Fact shared', { category, confidence, sourceAgent });
        return `Shared with Hive Mind — category: ${category}, confidence: ${confidence}. All agents will see this on their next query.`;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('[HiveMind] executeShareWithHive failed', { category, sourceAgent, error: msg });
        return `Could not share with Hive Mind right now (${msg}) — knowledge not persisted this round.`;
    }
}

/**
 * General knowledge query across all Hive Mind categories.
 * Called by any agent via the get_hive_knowledge tool.
 */
export async function executeGetHiveKnowledge(
    query: string,
    category: string | undefined,
    _orgId: string
): Promise<string> {
    try {
        const agent = await getOrCreateHiveMindAgent();
        const tags = category ? ['hive-mind', `category:${category}`] : ['hive-mind'];

        const results = await archivalTagsService.searchByTags(agent.id, tags, {
            query,
            requireAllTags: false,
            limit: 5,
        });

        if (results.length === 0) {
            return `No Hive Mind knowledge found for "${query}"${category ? ` (category: ${category})` : ''}. The squad hasn't shared anything on this topic yet.`;
        }

        const formatted = results
            .slice(0, 3)
            .map((r, i) => `${i + 1}. ${r.slice(0, 500)}`)
            .join('\n\n');

        return `[HIVE MIND — ${category ?? 'all categories'}]\n\n${formatted}`;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('[HiveMind] executeGetHiveKnowledge failed', { query, category, error: msg });
        return `Hive Mind temporarily unavailable (${msg}). Proceed with available knowledge.`;
    }
}

/**
 * Deebo-specific write: store a verified compliance fact.
 * Called programmatically by Deebo's compliance service, not via agent tool.
 */
export async function writeComplianceFact(
    state: string,
    topic: string,
    rule: string,
    source: string
): Promise<void> {
    try {
        const agent = await getOrCreateHiveMindAgent();
        const timestamp = new Date().toISOString();
        const header = `[HIVE MIND | compliance | verified | from: deebo | source: ${source} | ${timestamp}]`;
        const taggedContent = `${header}\nState: ${state.toUpperCase()} | Topic: ${topic}\n\n${rule}`;

        await archivalTagsService.insertWithTags(agent.id, {
            content: taggedContent,
            tags: [
                'hive-mind',
                'compliance',
                'verified',
                `state:${state.toUpperCase()}`,
                `topic:${topic.toLowerCase()}`,
                'agent:deebo',
            ],
            agentId: agent.id,
            tenantId: 'hive-mind-global',
        });

        logger.info('[HiveMind] Compliance fact written', { state, topic, source });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('[HiveMind] writeComplianceFact failed', { state, topic, error: msg });
        throw err;
    }
}
