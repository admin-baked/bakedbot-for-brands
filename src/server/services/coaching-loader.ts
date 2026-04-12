/**
 * Coaching Patch Loader
 *
 * Loads the latest coaching patch for an agent from Firestore.
 * Patches are generated nightly by the daily-response-audit cron
 * via Opus+Gemini deliberation and persisted to `agent_coaching/{agent}_latest`.
 *
 * Agents call `loadCoachingRules(agentName)` during initialization to
 * inject behavioral coaching into their system prompt.
 *
 * Cache: In-memory TTL cache (5 min) to avoid hitting Firestore on every message.
 */

import { logger } from '@/lib/logger';

interface CachedCoaching {
    rules: string[];
    fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const coachingCache = new Map<string, CachedCoaching>();

/**
 * Load coaching rules for an agent. Returns empty array if no patch exists.
 * Results are cached in memory for 5 minutes to avoid Firestore reads per message.
 */
export async function loadCoachingRules(agentName: string): Promise<string[]> {
    const cacheKey = agentName.toLowerCase();
    const cached = coachingCache.get(cacheKey);

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.rules;
    }

    try {
        const { getAdminFirestore } = await import('@/firebase/admin');
        const db = getAdminFirestore();
        const doc = await db.collection('agent_coaching').doc(`${cacheKey}_latest`).get();

        if (!doc.exists) {
            coachingCache.set(cacheKey, { rules: [], fetchedAt: Date.now() });
            return [];
        }

        const data = doc.data();
        const instructions: string[] = data?.instructions || [];

        // Log when coaching is loaded for observability
        if (instructions.length > 0) {
            logger.info('[CoachingLoader] Loaded coaching patch', {
                agent: agentName,
                instructionCount: instructions.length,
                priority: data?.priority,
                auditDate: data?.auditDate,
            });
        }

        coachingCache.set(cacheKey, { rules: instructions, fetchedAt: Date.now() });
        return instructions;
    } catch (err) {
        // Never crash agent startup due to coaching load failure
        logger.warn('[CoachingLoader] Failed to load coaching', {
            agent: agentName,
            error: err instanceof Error ? err.message : String(err),
        });
        return [];
    }
}

/**
 * Enrich an AgentContext with coaching rules from the latest audit patch.
 * Call this before passing agentContext to executeWithTools/buildSystemPrompt.
 */
export async function enrichWithCoaching<T extends { name: string; coachingRules?: string[] }>(
    agentContext: T
): Promise<T> {
    const rules = await loadCoachingRules(agentContext.name);
    if (rules.length === 0) return agentContext;
    return { ...agentContext, coachingRules: rules };
}

/**
 * Invalidate the coaching cache for an agent.
 * Called after a new coaching patch is saved so the next request picks it up.
 */
export function invalidateCoachingCache(agentName?: string): void {
    if (agentName) {
        coachingCache.delete(agentName.toLowerCase());
    } else {
        coachingCache.clear();
    }
}
