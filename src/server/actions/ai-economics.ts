'use server';
/**
 * AI Economics Server Actions
 *
 * Three actions for the CEO AI Economics dashboard:
 * 1. getAgentTelemetrySummary — platform AI spend by agent/model/day
 * 2. getDevToolsSavings — GLM cycle + jcodemunch token savings
 * 3. getPlatformAIBudgetStatus — today's spend vs $200/day budget
 *
 * All guarded by requireSuperUser().
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireSuperUser } from '@/server/auth/auth';
import { getGLMUsageStatus, getDaysUntilReset } from '@/server/services/glm-usage';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Sonnet price per token (for savings estimates)
const SONNET_INPUT_PRICE_PER_TOKEN = 3.0 / 1_000_000; // $3/1M

const DAILY_BUDGET_USD = 200;
const PER_AGENT_ALERT_USD = 50;

// ============================================================================
// Types
// ============================================================================

export interface AgentTelemetrySummary {
    totalCostUsd: number;
    totalTokens: number;
    totalInvocations: number;
    byAgent: { agentName: string; costUsd: number; tokens: number; invocations: number }[];
    byModel: { model: string; costUsd: number; tokens: number }[];
    dailyTrend: { date: string; costUsd: number; tokens: number }[];
    budgetStatus: { dailyAvg: number; projectedMonthly: number; alertThreshold: number };
}

export interface DevToolsSavings {
    glm: {
        used: number;
        limit: number;
        percentUsed: number;
        daysUntilReset: number;
        savedVsAnthropic: number;
    };
    jcodemunch: {
        totalTokensSaved: number;
        estimatedSavingsUsd: number;
    };
    totalSavingsUsd: number;
}

export interface PlatformAIBudgetStatus {
    todayCostUsd: number;
    dailyBudget: number;
    percentUsed: number;
    agentsOverThreshold: { agentName: string; costUsd: number }[];
}

// ============================================================================
// 1. Agent Telemetry Summary
// ============================================================================

export async function getAgentTelemetrySummary(
    period: 'week' | 'month' | 'quarter' = 'month'
): Promise<{ success: true; data: AgentTelemetrySummary } | { success: false; error: string }> {
    await requireSuperUser();

    const now = new Date();
    let startDate: Date;

    switch (period) {
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'quarter':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
    }

    try {
        const db = getAdminFirestore();
        const snapshot = await db
            .collection('agent_telemetry')
            .where('timestamp', '>=', startDate)
            .orderBy('timestamp', 'desc')
            .limit(2000)
            .get();

        // Group in-memory
        const byAgent: Record<string, { costUsd: number; tokens: number; invocations: number }> = {};
        const byModel: Record<string, { costUsd: number; tokens: number }> = {};
        const byDay: Record<string, { costUsd: number; tokens: number }> = {};

        let totalCostUsd = 0;
        let totalTokens = 0;
        let totalInvocations = 0;

        for (const doc of snapshot.docs) {
            const agentName = doc.get('agentName') as string || 'unknown';
            const model = doc.get('model') as string || 'unknown';
            const costEstimateUsd = (doc.get('costEstimateUsd') as number) || 0;
            const totalTokensDoc = (doc.get('totalTokens') as number) || 0;
            const timestamp = doc.get('timestamp');
            const dateStr: string = timestamp?.toDate
                ? timestamp.toDate().toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];

            totalCostUsd += costEstimateUsd;
            totalTokens += totalTokensDoc;
            totalInvocations++;

            // By agent
            if (!byAgent[agentName]) byAgent[agentName] = { costUsd: 0, tokens: 0, invocations: 0 };
            byAgent[agentName].costUsd += costEstimateUsd;
            byAgent[agentName].tokens += totalTokensDoc;
            byAgent[agentName].invocations++;

            // By model
            if (!byModel[model]) byModel[model] = { costUsd: 0, tokens: 0 };
            byModel[model].costUsd += costEstimateUsd;
            byModel[model].tokens += totalTokensDoc;

            // By day
            if (!byDay[dateStr]) byDay[dateStr] = { costUsd: 0, tokens: 0 };
            byDay[dateStr].costUsd += costEstimateUsd;
            byDay[dateStr].tokens += totalTokensDoc;
        }

        const daysInPeriod = period === 'week' ? 7 : period === 'month' ? 30 : 90;
        const dailyAvg = totalCostUsd / daysInPeriod;
        const projectedMonthly = dailyAvg * 30;

        return {
            success: true,
            data: {
                totalCostUsd,
                totalTokens,
                totalInvocations,
                byAgent: Object.entries(byAgent)
                    .map(([agentName, v]) => ({ agentName, ...v }))
                    .sort((a, b) => b.costUsd - a.costUsd),
                byModel: Object.entries(byModel)
                    .map(([model, v]) => ({ model, ...v }))
                    .sort((a, b) => b.costUsd - a.costUsd),
                dailyTrend: Object.entries(byDay)
                    .map(([date, v]) => ({ date, ...v }))
                    .sort((a, b) => a.date.localeCompare(b.date)),
                budgetStatus: {
                    dailyAvg,
                    projectedMonthly,
                    alertThreshold: DAILY_BUDGET_USD,
                },
            },
        };
    } catch (err) {
        logger.error('[AI Economics] getAgentTelemetrySummary failed', { error: String(err) });
        return { success: false, error: 'Failed to load agent telemetry' };
    }
}

// ============================================================================
// 2. Dev Tools Savings
// ============================================================================

export async function getDevToolsSavings(): Promise<
    { success: true; data: DevToolsSavings } | { success: false; error: string }
> {
    await requireSuperUser();

    try {
        const glmStatus = await getGLMUsageStatus();
        const daysUntilReset = getDaysUntilReset(glmStatus.cycleEnd);

        // GLM savings: tokens used × (Sonnet price - GLM price ~$0)
        // z.ai DevPack is a flat subscription, so GLM marginal cost ≈ $0
        const savedVsAnthropic = glmStatus.used * SONNET_INPUT_PRICE_PER_TOKEN;

        // jcodemunch savings from local index file
        let totalTokensSaved = 0;
        let estimatedSavingsUsd = 0;
        try {
            const savingsPath = path.join(os.homedir(), '.code-index', '_savings.json');
            const raw = fs.readFileSync(savingsPath, 'utf8');
            const parsed = JSON.parse(raw) as { total_tokens_saved?: number };
            totalTokensSaved = parsed.total_tokens_saved ?? 0;
            estimatedSavingsUsd = totalTokensSaved * SONNET_INPUT_PRICE_PER_TOKEN;
        } catch {
            // File may not exist in production — silently use 0
        }

        return {
            success: true,
            data: {
                glm: {
                    used: glmStatus.used,
                    limit: glmStatus.limit,
                    percentUsed: glmStatus.percentUsed,
                    daysUntilReset,
                    savedVsAnthropic,
                },
                jcodemunch: {
                    totalTokensSaved,
                    estimatedSavingsUsd,
                },
                totalSavingsUsd: savedVsAnthropic + estimatedSavingsUsd,
            },
        };
    } catch (err) {
        logger.error('[AI Economics] getDevToolsSavings failed', { error: String(err) });
        return { success: false, error: 'Failed to load dev tools savings' };
    }
}

// ============================================================================
// 3. Platform AI Budget Status (today)
// ============================================================================

export async function getPlatformAIBudgetStatus(): Promise<
    { success: true; data: PlatformAIBudgetStatus } | { success: false; error: string }
> {
    await requireSuperUser();

    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        const db = getAdminFirestore();
        const snapshot = await db
            .collection('agent_telemetry')
            .where('_date', '==', todayStr)
            .get();

        const byAgent: Record<string, number> = {};
        let todayCostUsd = 0;

        for (const doc of snapshot.docs) {
            const agentName = doc.get('agentName') as string || 'unknown';
            const cost = (doc.get('costEstimateUsd') as number) || 0;
            todayCostUsd += cost;
            byAgent[agentName] = (byAgent[agentName] ?? 0) + cost;
        }

        const agentsOverThreshold = Object.entries(byAgent)
            .filter(([, cost]) => cost >= PER_AGENT_ALERT_USD)
            .map(([agentName, costUsd]) => ({ agentName, costUsd }))
            .sort((a, b) => b.costUsd - a.costUsd);

        return {
            success: true,
            data: {
                todayCostUsd,
                dailyBudget: DAILY_BUDGET_USD,
                percentUsed: Math.round((todayCostUsd / DAILY_BUDGET_USD) * 100),
                agentsOverThreshold,
            },
        };
    } catch (err) {
        logger.error('[AI Economics] getPlatformAIBudgetStatus failed', { error: String(err) });
        return { success: false, error: 'Failed to load budget status' };
    }
}
