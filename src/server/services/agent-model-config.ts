/**
 * Agent Model Config Service
 *
 * Dynamic model routing for Slack agents (Linus, Elroy, etc.).
 * Stored in Firestore so it can be changed at runtime via Slack
 * without a redeploy.
 *
 * Firestore: system_config/agent_model_config
 *
 * Tiers (cheapest → most capable):
 *   1. glm        — GLM-5 via Z.ai ($1.20/$4, tool calling)
 *   2. gemini     — Gemini Flash via Opencode Cloud Run ($0.10/$0.40, no tools)
 *   3. haiku      — Claude Haiku ($0.80/$4, tool calling)
 *   4. sonnet     — Claude Sonnet ($3/$15, tool calling)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

const CONFIG_DOC = 'system_config/agent_model_config';

export type ModelTier = 'glm' | 'gemini' | 'haiku' | 'sonnet';

export interface AgentModelConfig {
    /** Primary tier for Slack agent messages */
    slackTier: ModelTier;
    /** Fallback chain when primary fails (ordered) */
    fallbackChain: ModelTier[];
    /** Who last changed it */
    updatedBy: string;
    /** When */
    updatedAt: number;
}

const DEFAULT_CONFIG: AgentModelConfig = {
    slackTier: 'glm',
    fallbackChain: ['gemini', 'haiku', 'sonnet'],
    updatedBy: 'system',
    updatedAt: Date.now(),
};

/** Read current agent model config. Returns defaults if doc missing. */
export async function getAgentModelConfig(): Promise<AgentModelConfig> {
    try {
        const db = getAdminFirestore();
        const doc = await db.doc(CONFIG_DOC).get();
        if (!doc.exists) return DEFAULT_CONFIG;
        const data = doc.data() as Partial<AgentModelConfig>;
        return {
            slackTier: data.slackTier ?? DEFAULT_CONFIG.slackTier,
            fallbackChain: data.fallbackChain ?? DEFAULT_CONFIG.fallbackChain,
            updatedBy: data.updatedBy ?? 'unknown',
            updatedAt: data.updatedAt ?? Date.now(),
        };
    } catch (err) {
        logger.error('[AgentModelConfig] Failed to read config', { error: String(err) });
        return DEFAULT_CONFIG;
    }
}

/** Update the Slack model tier + fallback chain. */
export async function setAgentModelTier(
    tier: ModelTier,
    updatedBy: string
): Promise<AgentModelConfig> {
    const VALID_TIERS: ModelTier[] = ['glm', 'gemini', 'haiku', 'sonnet'];
    if (!VALID_TIERS.includes(tier)) {
        throw new Error(`Invalid tier "${tier}". Valid: ${VALID_TIERS.join(', ')}`);
    }

    // Auto-build fallback chain: everything after the selected tier
    const tierIndex = VALID_TIERS.indexOf(tier);
    const fallbackChain = VALID_TIERS.slice(tierIndex + 1);

    const config: AgentModelConfig = {
        slackTier: tier,
        fallbackChain,
        updatedBy,
        updatedAt: Date.now(),
    };

    try {
        const db = getAdminFirestore();
        await db.doc(CONFIG_DOC).set(config);
        logger.info('[AgentModelConfig] Tier updated', { tier, fallbackChain, updatedBy });
        return config;
    } catch (err) {
        logger.error('[AgentModelConfig] Failed to update', { error: String(err) });
        throw err;
    }
}
