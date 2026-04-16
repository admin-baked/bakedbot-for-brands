/**
 * Generate Insights Megacron
 *
 * One route for all insight generators — replaces 6 separate route files.
 * Routes internally by the `type` field in the request body (or `?type=` query param).
 *
 * Consolidated from:
 *   generate-insights-customer         (hourly, ['dispensary','brand'])
 *   generate-insights-velocity         (hourly, ['dispensary'])
 *   generate-insights-regulatory       (daily,  ['dispensary','brand'])
 *   generate-insights-competitive-pricing (hourly, ['brand'])
 *   generate-insights-dynamic          (every 2h, ['dispensary'])
 *   generate-insights-goal-progress    (daily, all orgs via 'orgs' collection)
 *
 * Cloud Scheduler — update existing jobs to point here with typed body:
 *   BASE="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app"
 *
 *   gcloud scheduler jobs update http generate-insights-customer \
 *     --uri="$BASE/api/cron/generate-insights" \
 *     --message-body='{"type":"customer"}'
 *
 *   gcloud scheduler jobs update http generate-insights-velocity \
 *     --uri="$BASE/api/cron/generate-insights" \
 *     --message-body='{"type":"velocity"}'
 *
 *   gcloud scheduler jobs update http generate-insights-regulatory \
 *     --uri="$BASE/api/cron/generate-insights" \
 *     --message-body='{"type":"regulatory"}'
 *
 *   gcloud scheduler jobs update http generate-insights-competitive-pricing \
 *     --uri="$BASE/api/cron/generate-insights" \
 *     --message-body='{"type":"competitive-pricing"}'
 *
 *   gcloud scheduler jobs update http generate-insights-dynamic \
 *     --uri="$BASE/api/cron/generate-insights" \
 *     --message-body='{"type":"dynamic"}'
 *
 *   gcloud scheduler jobs update http generate-insights-goal-progress \
 *     --uri="$BASE/api/cron/generate-insights" \
 *     --message-body='{"type":"goal-progress"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { getInsightTargetOrgs } from '@/server/services/insights/target-orgs';
import { notifySlackOnCriticalInsights } from '@/server/services/insights/insight-notifier';
import { createThreadsFromInsights } from '@/server/actions/create-insight-thread';
import type { InsightCard } from '@/types/insight-cards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

// ---------------------------------------------------------------------------
// Type routing
// ---------------------------------------------------------------------------

type InsightType = 'customer' | 'velocity' | 'regulatory' | 'competitive-pricing' | 'dynamic' | 'goal-progress';

const VALID_TYPES = new Set<InsightType>([
    'customer', 'velocity', 'regulatory', 'competitive-pricing', 'dynamic', 'goal-progress',
]);

function parseType(req: NextRequest, body: Record<string, unknown>): InsightType | null {
    const t = (body.type as string) ?? req.nextUrl.searchParams.get('type');
    return VALID_TYPES.has(t as InsightType) ? (t as InsightType) : null;
}

// ---------------------------------------------------------------------------
// Standard generator runner (customer / velocity / regulatory / competitive-pricing)
// ---------------------------------------------------------------------------

type OrgType = 'dispensary' | 'brand';

interface InsightGenerator {
    generate(): Promise<InsightCard[]>;
}

async function runStandardGenerator(
    label: string,
    orgTypes: OrgType[],
    makeGenerator: (orgId: string) => InsightGenerator,
) {
    const targetOrgs = await getInsightTargetOrgs(orgTypes);
    const results: unknown[] = [];

    for (const { orgId } of targetOrgs) {
        try {
            logger.info(`[generate-insights/${label}] Generating`, { orgId });
            const generator = makeGenerator(orgId);
            const insights = await generator.generate();
            const slackResult = await notifySlackOnCriticalInsights(orgId, insights);
            const threadResult = await createThreadsFromInsights(orgId, insights);
            results.push({ orgId, success: true, insightsGenerated: insights.length, slackNotified: slackResult.notified, threadsCreated: threadResult.created });
        } catch (error) {
            logger.error(`[generate-insights/${label}] Failed for org`, { error, orgId });
            results.push({ orgId, success: false, error: error instanceof Error ? error.message : String(error) });
        }
    }

    return results;
}

// ---------------------------------------------------------------------------
// Dynamic cards generator (needs card definition pre-step)
// ---------------------------------------------------------------------------

async function runDynamic() {
    const { DynamicCardGenerator } = await import('@/server/services/insights/generators/dynamic-card-generator');
    const { getActiveCardDefinitions, markDefinitionGenerated } = await import('@/server/services/insights/card-discovery-service');
    const targetOrgs = await getInsightTargetOrgs(['dispensary']);
    const results: unknown[] = [];

    for (const { orgId } of targetOrgs) {
        try {
            const definitions = await getActiveCardDefinitions(orgId);
            if (definitions.length === 0) {
                results.push({ orgId, success: true, insightsGenerated: 0, skipped: true });
                continue;
            }

            let totalInsights = 0;
            for (const def of definitions) {
                try {
                    const generator = new DynamicCardGenerator(orgId, def);
                    const insights = await generator.generate();
                    if (insights.length > 0) {
                        totalInsights += insights.length;
                        await markDefinitionGenerated(orgId, def.slug);
                        await notifySlackOnCriticalInsights(orgId, insights);
                        await createThreadsFromInsights(orgId, insights);
                    }
                } catch (err) {
                    logger.error('[generate-insights/dynamic] Card generation failed', { error: err, orgId, title: def.title });
                }
            }
            results.push({ orgId, success: true, definitionsProcessed: definitions.length, insightsGenerated: totalInsights });
        } catch (error) {
            logger.error('[generate-insights/dynamic] Failed for org', { error, orgId });
            results.push({ orgId, success: false, error: error instanceof Error ? error.message : String(error) });
        }
    }

    return results;
}

// ---------------------------------------------------------------------------
// Goal progress generator (different org query + different method)
// ---------------------------------------------------------------------------

async function runGoalProgress() {
    const { GoalProgressGenerator } = await import('@/server/services/insights/goal-progress-generator');
    const db = getAdminFirestore();
    const orgsSnapshot = await db.collection('orgs').limit(100).get();
    const orgIds = orgsSnapshot.docs.map(doc => doc.id);

    let goalsUpdatedCount = 0;
    let errorCount = 0;

    for (const orgId of orgIds) {
        try {
            const generator = new GoalProgressGenerator(orgId);
            const updatedGoals = await generator.updateGoalProgress();
            goalsUpdatedCount += updatedGoals.length;
        } catch (error) {
            errorCount++;
            logger.error('[generate-insights/goal-progress] Error processing org', { orgId, error });
        }
    }

    return { orgsProcessed: orgIds.length, goalsUpdated: goalsUpdatedCount, errors: errorCount };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

async function handler(request: NextRequest) {
    const authError = await requireCronSecret(request, 'generate-insights');
    if (authError) return authError;

    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { /* body may be empty for GET */ }

    const type = parseType(request, body);
    if (!type) {
        return NextResponse.json(
            { error: `Missing or invalid type. Valid values: ${[...VALID_TYPES].join(', ')}` },
            { status: 400 }
        );
    }

    logger.info('[generate-insights] Firing', { type });

    try {
        let result: unknown;

        switch (type) {
            case 'customer': {
                const { CustomerInsightsGenerator } = await import('@/server/services/insights/generators/customer-insights-generator');
                result = await runStandardGenerator('customer', ['dispensary', 'brand'], (id) => new CustomerInsightsGenerator(id));
                break;
            }
            case 'velocity': {
                const { InventoryVelocityGenerator } = await import('@/server/services/insights/generators/inventory-velocity-generator');
                result = await runStandardGenerator('velocity', ['dispensary'], (id) => new InventoryVelocityGenerator(id));
                break;
            }
            case 'regulatory': {
                const { RegulatoryInsightsGenerator } = await import('@/server/services/insights/generators/regulatory-insights-generator');
                result = await runStandardGenerator('regulatory', ['dispensary', 'brand'], (id) => new RegulatoryInsightsGenerator(id));
                break;
            }
            case 'competitive-pricing': {
                const { CompetitivePricingInsightsGenerator } = await import('@/server/services/insights/generators/competitive-pricing-insights-generator');
                result = await runStandardGenerator('competitive-pricing', ['brand'], (id) => new CompetitivePricingInsightsGenerator(id));
                break;
            }
            case 'dynamic':
                result = await runDynamic();
                break;
            case 'goal-progress':
                result = await runGoalProgress();
                break;
        }

        return NextResponse.json({ success: true, type, result, timestamp: new Date().toISOString() });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('[generate-insights] Failed', { type, error: msg });
        return NextResponse.json({ success: false, type, error: msg }, { status: 500 });
    }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
