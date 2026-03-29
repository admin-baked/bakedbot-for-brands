'use server';

/**
 * Jack (CRO) — AI-native CRM intelligence actions
 *
 * Surfaces proactive insights, natural language search, and per-user next-action
 * suggestions powered by Claude Haiku (fast + cheap for CRM tasks).
 *
 * All actions gated by super_user role.
 */

import { requireUser } from '@/server/auth/auth';
import { callClaude } from '@/ai/claude';
import { logger } from '@/lib/logger';
import { getPlatformUsers, getCRMUserStats, type CRMFilters } from '@/server/services/crm-service';

const HAIKU = 'claude-haiku-4-5-20251001';

import {
    CRMAIInsightType,
    CRMAIInsight,
    CRMAISearchResult
} from './action-types';

// =============================================================================
// Jack AI Insights (proactive CRM flags)
// =============================================================================

/**
 * Get Jack's proactive CRM insights based on current user snapshot.
 * Calls Claude Haiku — fast, cheap, and focused on actionable flags only.
 */
export async function getCRMAIInsights(): Promise<any> {
    logger.info('[JackAI] getCRMAIInsights started');
    try {
        await requireUser(['super_user']);

        const [stats, allUsers] = await Promise.all([
            getCRMUserStats(),
            getPlatformUsers({ includeTest: false, limit: 500 }),
        ]);

        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;

        // Build a compact CRM snapshot for Jack
        const staleProspects = allUsers.filter(u =>
            u.lifecycleStage === 'prospect' &&
            (now - new Date(u.signupAt).getTime()) > sevenDays
        );

        const stalledTrials = allUsers.filter(u =>
            u.lifecycleStage === 'trial' &&
            (now - new Date(u.signupAt).getTime()) > thirtyDays
        );

        const silentVIPs = allUsers.filter(u =>
            u.lifecycleStage === 'vip' &&
            u.lastLoginAt &&
            (now - new Date(u.lastLoginAt).getTime()) > thirtyDays
        );

        const highMRRChurned = allUsers.filter(u =>
            u.lifecycleStage === 'churned' && u.mrr > 0
        );

        const recentSignups = allUsers.filter(u =>
            (now - new Date(u.signupAt).getTime()) < 48 * 60 * 60 * 1000
        );

        const snapshot = {
            totalUsers: stats.totalUsers,
            totalMRR: stats.totalMRR,
            byLifecycle: stats.byLifecycle,
            staleProspectsCount: staleProspects.length,
            stalledTrialsCount: stalledTrials.length,
            silentVIPsCount: silentVIPs.length,
            highMRRChurnedCount: highMRRChurned.length,
            recentSignupsCount: recentSignups.length,
            stalledTrialExamples: stalledTrials.slice(0, 3).map(u => ({ email: u.email, plan: u.plan, signupAt: u.signupAt })),
            silentVIPExamples: silentVIPs.slice(0, 3).map(u => ({ email: u.email, mrr: u.mrr })),
        };

        const prompt = `You are Jack, BakedBot's CRO. Analyze this CRM snapshot and return 3-6 concise, actionable insights as JSON.

CRM Snapshot:
${JSON.stringify(snapshot, null, 2)}

Return a JSON array of insights. Each insight must be:
{
  "id": "unique-slug",
  "type": "flag" | "opportunity" | "alert",
  "message": "One sentence. Specific. Actionable. No fluff.",
  "action": "Short CTA label (optional, e.g. 'View Prospects')",
  "count": number (optional)
}

Rules:
- flag: something that needs immediate attention (stale prospects, churned high-value accounts)
- opportunity: revenue or growth action (trial → customer conversion, VIP upsell)
- alert: warning that needs monitoring (silent VIPs, stalled trials)
- If a count is 0, skip that insight entirely
- Max 6 insights. Prioritize by revenue impact.
- Return ONLY valid JSON array. No explanation text.`;

        const raw = await callClaude({
            model: HAIKU,
            userMessage: prompt,
            maxTokens: 800,
            autoRouteModel: false,
        });

        // Parse JSON from response (Claude may wrap in markdown code block)
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            logger.warn('[CRM-AI] Jack returned no JSON insights', { raw: raw.slice(0, 200) });
            return { success: true, insights: [] };
        }

        const parsed: CRMAIInsight[] = JSON.parse(jsonMatch[0]);
        return { success: true, insights: parsed };

    } catch (err) {
        logger.error('[CRM-AI] getCRMAIInsights failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

// =============================================================================
// Natural Language CRM Search
// =============================================================================

const VALID_STAGES: any[] = [
    'prospect', 'contacted', 'demo_scheduled', 'trial', 'customer', 'vip', 'churned', 'winback',
];

/**
 * Translate a natural language query into CRM filters and return matching users with an AI summary.
 * Uses Claude Haiku to parse the query; applies filters server-side.
 */
export async function queryCRMWithAI(query: string): Promise<CRMAISearchResult> {
    logger.info('[JackAI] queryCRMWithAI started', { query });
    try {
        await requireUser(['super_user']);

        if (!query || query.trim().length < 3) {
            return { success: false, error: 'Query too short' };
        }

        const parserPrompt = `You are Jack, BakedBot's CRO. Parse this natural language CRM query into filter params.

Query: "${query}"

Return a single JSON object (no markdown):
{
  "lifecycleStage": "prospect"|"contacted"|"demo_scheduled"|"trial"|"customer"|"vip"|"churned"|"winback"|null,
  "search": "text search string or null",
  "signupAfterDays": number (e.g. 7 = last 7 days) or null,
  "includeTest": boolean (default false),
  "summary": "One sentence describing what these results show"
}

Valid lifecycle stages: prospect, contacted, demo_scheduled, trial, customer, vip, churned, winback
Only include fields that the query actually specifies. Return ONLY JSON.`;

        const raw = await callClaude({
            model: HAIKU,
            userMessage: parserPrompt,
            maxTokens: 300,
            autoRouteModel: false,
        });

        let parsed: {
            lifecycleStage?: any | null;
            search?: string | null;
            signupAfterDays?: number | null;
            includeTest?: boolean;
            summary?: string;
        } = {};

        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        } catch {
            logger.warn('[CRM-AI] Failed to parse Jack filter response', { raw: raw.slice(0, 200) });
        }

        const filters: CRMFilters = {
            includeTest: parsed.includeTest ?? false,
        };

        if (parsed.lifecycleStage && VALID_STAGES.includes(parsed.lifecycleStage)) {
            filters.lifecycleStage = parsed.lifecycleStage;
        }
        if (parsed.search && parsed.search.trim()) {
            filters.search = parsed.search.trim();
        }
        if (parsed.signupAfterDays && parsed.signupAfterDays > 0) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - parsed.signupAfterDays);
            filters.signupAfter = cutoff;
        }

        const users = await getPlatformUsers(filters);

        const filtersApplied = [
            filters.lifecycleStage ? `stage: ${filters.lifecycleStage}` : null,
            filters.search ? `search: "${filters.search}"` : null,
            filters.signupAfter ? `signup after: ${filters.signupAfter.toLocaleDateString()}` : null,
        ].filter(Boolean).join(', ') || 'all users';

        logger.info('[JackAI] queryCRMWithAI completed', { 
            userCount: results.length,
            filters: completion.content[0].text 
        });

        return {
            success: true,
            result: {
                summary: parsed.summary || `Found ${users.length} users`,
                users,
                filtersApplied,
            },
        };
    } catch (err) {
        logger.error('[CRM-AI] queryCRMWithAI failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

// =============================================================================
// Per-User Next Action Suggestion
// =============================================================================

/**
 * Get Jack's recommended next action for a single CRM user.
 * Lightweight — single Claude Haiku call, returns a one-liner string.
 * Called lazily on row expand to avoid N+1 on initial load.
 */
export async function getNextActionForUser(userId: string): Promise<any> {
    try {
        await requireUser(['super_user']);

        const users = await getPlatformUsers({ search: userId, includeTest: true, limit: 1 });
        // Also try direct ID match if search didn't find it
        let user: any | undefined = users.find(u => u.id === userId);

        if (!user) {
            // Fall back: getPlatformUsers search works on email/name, try getting all and find by id
            const all = await getPlatformUsers({ includeTest: true, limit: 500 });
            user = all.find(u => u.id === userId);
        }

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        const now = Date.now();
        const daysSinceSignup = Math.floor((now - new Date(user.signupAt).getTime()) / (1000 * 60 * 60 * 24));
        const daysSinceLogin = user.lastLoginAt
            ? Math.floor((now - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
            : null;

        const context = {
            accountType: user.accountType,
            lifecycleStage: user.lifecycleStage,
            plan: user.plan,
            mrr: user.mrr,
            daysSinceSignup,
            daysSinceLogin,
            notes: user.notes,
        };

        const suggestion = await callClaude({
            model: HAIKU,
            userMessage: `You are Jack, BakedBot's CRO. Recommend the single best next action for this account in one sentence (max 12 words). Be specific and direct.

Account: ${JSON.stringify(context)}

Reply with ONLY the action text, no JSON, no explanation.`,
            maxTokens: 60,
            autoRouteModel: false,
        });

        return { success: true, nextAction: suggestion.trim() };
    } catch (err) {
        logger.error('[CRM-AI] getNextActionForUser failed', { userId, error: String(err) });
        return { success: false, error: String(err) };
    }
}
