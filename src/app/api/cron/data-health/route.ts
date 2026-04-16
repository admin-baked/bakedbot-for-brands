export const dynamic = 'force-dynamic';
/**
 * Data Health Cron
 *
 * Runs every Monday at 9 AM ET. Posts a structured health report to Slack #ops
 * covering three layers that silently fail without it:
 *
 *   1. Customer profile completeness — what % have alleaves_id, real LTV, correct segments
 *   2. Insight freshness — are deliberative pipeline docs current (< 2h for velocity)
 *   3. Knowledge Engine pipeline recency — which KE ingestion pipelines last ran
 *
 * Dark features become visible. If something is broken, it shows up here before
 * a customer or staff member trips over it.
 *
 * Deploy:
 *   gcloud scheduler jobs create http data-health-cron \
 *     --schedule="0 9 * * 1" \
 *     --uri="https://bakedbot.ai/api/cron/data-health" \
 *     --message-body='{}' \
 *     --headers="Authorization=Bearer $CRON_SECRET" \
 *     --time-zone="America/New_York"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import { logger } from '@/lib/logger';

// Insight docs we care about freshness for, per org
const CRITICAL_INSIGHTS = [
    { docSuffix: ':velocity:slow_movers',       label: 'Slow Movers',        maxAgeHours: 2  },
    { docSuffix: ':velocity:top_seller_this_week', label: 'Top Sellers',     maxAgeHours: 2  },
    { docSuffix: ':customer:',                  label: 'Customer Insights',  maxAgeHours: 4  },
    { docSuffix: ':price_match:',               label: 'Competitive Pricing', maxAgeHours: 26 },
];

// KE pipelines we track
const KE_PIPELINES = ['campaign_history', 'competitive_intel', 'agent_observations', 'playbook_420'];

const STATUS = { ok: '✅', warn: '⚠️', crit: '🚨', dark: '🔴' };

function ageLabel(ms: number): string {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m ago` : `${m}m ago`;
}

interface OrgHealthReport {
    orgId: string;
    customers: {
        total: number;
        withAlleavesId: number;
        withRealSpend: number;
        segmentDistribution: Record<string, number>;
        lastSyncedAt: string | null;
    };
    insights: Array<{
        label: string;
        ageMs: number | null;
        maxAgeHours: number;
        status: 'ok' | 'warn' | 'dark';
    }>;
    kePipelines: Array<{
        pipeline: string;
        lastRunAt: string | null;
        lastStatus: string | null;
        ageMs: number | null;
    }>;
}

async function auditOrg(firestore: FirebaseFirestore.Firestore, orgId: string): Promise<OrgHealthReport> {
    const now = Date.now();

    // ── 1. Customer completeness (sampled — count queries are expensive) ─────
    const [totalSnap, linkedSnap, spendSnap, recentSyncSnap] = await Promise.all([
        firestore.collection('customers').where('orgId', '==', orgId).count().get(),
        firestore.collection('customers').where('orgId', '==', orgId).where('alleaves_synced', '==', true).count().get(),
        firestore.collection('customers').where('orgId', '==', orgId).where('totalSpent', '>', 0).count().get(),
        firestore.collection('customers').where('orgId', '==', orgId)
            .orderBy('alleaves_synced_at', 'desc').limit(1).get(),
    ]);

    // Segment distribution (sample up to 200 for performance)
    const segSnap = await firestore.collection('customers')
        .where('orgId', '==', orgId)
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get();
    const segDist: Record<string, number> = {};
    for (const doc of segSnap.docs) {
        const seg = (doc.data().segment as string) || 'unknown';
        segDist[seg] = (segDist[seg] || 0) + 1;
    }

    const lastSyncDoc = recentSyncSnap.docs[0]?.data();
    const lastSyncedAt = (lastSyncDoc?.alleaves_synced_at as string) || null;

    // ── 2. Insight freshness ─────────────────────────────────────────────────
    // Insights are stored as tenants/{orgId}/insights/{orgId}:category:title
    // We query the collection and filter by prefix since doc IDs vary by title
    const insightsSnap = await firestore
        .collection('tenants').doc(orgId).collection('insights')
        .orderBy('generatedAt', 'desc')
        .limit(50)
        .get();

    const insightDocs = insightsSnap.docs.map(d => ({ id: d.id, data: d.data() }));

    const insights = CRITICAL_INSIGHTS.map(({ docSuffix, label, maxAgeHours }) => {
        const match = insightDocs.find(d => d.id.includes(docSuffix));
        if (!match) return { label, ageMs: null, maxAgeHours, status: 'dark' as const };

        const genAt = match.data.generatedAt?.toDate?.()?.getTime()
            ?? (match.data.lastUpdated ? new Date(match.data.lastUpdated as string).getTime() : null);

        if (!genAt) return { label, ageMs: null, maxAgeHours, status: 'dark' as const };

        const ageMs = now - genAt;
        const ageHours = ageMs / 3_600_000;
        return {
            label,
            ageMs,
            maxAgeHours,
            status: ageHours <= maxAgeHours ? 'ok' as const : 'warn' as const,
        };
    });

    // ── 3. KE pipeline recency ───────────────────────────────────────────────
    const kePipelines = await Promise.all(KE_PIPELINES.map(async (pipeline) => {
        const snap = await firestore.collection('knowledge_ingestion_runs')
            .where('tenantId', '==', orgId)
            .where('pipeline', '==', pipeline)
            .orderBy('startedAt', 'desc')
            .limit(1)
            .get();

        if (snap.empty) return { pipeline, lastRunAt: null, lastStatus: null, ageMs: null };

        const run = snap.docs[0].data();
        const startedAt = run.startedAt?.toDate?.()?.getTime()
            ?? (run.startedAt ? new Date(run.startedAt as string).getTime() : null);

        return {
            pipeline,
            lastRunAt: startedAt ? new Date(startedAt).toISOString() : null,
            lastStatus: (run.status as string) || null,
            ageMs: startedAt ? now - startedAt : null,
        };
    }));

    return {
        orgId,
        customers: {
            total:          totalSnap.data().count,
            withAlleavesId: linkedSnap.data().count,
            withRealSpend:  spendSnap.data().count,
            segmentDistribution: segDist,
            lastSyncedAt,
        },
        insights,
        kePipelines,
    };
}

function formatOrgReport(report: OrgHealthReport): string {
    const { orgId, customers, insights, kePipelines } = report;
    const lines: string[] = [`\n*${orgId}*`];

    // Customers
    const pctLinked = customers.total > 0 ? Math.round(customers.withAlleavesId / customers.total * 100) : 0;
    const pctSpend  = customers.total > 0 ? Math.round(customers.withRealSpend  / customers.total * 100) : 0;
    const linkedIcon = pctLinked >= 70 ? STATUS.ok : pctLinked >= 30 ? STATUS.warn : STATUS.dark;
    lines.push(
        `  *Customers* — ${customers.total.toLocaleString()} total`,
        `  ${linkedIcon} Alleaves linked: ${customers.withAlleavesId} (${pctLinked}%)`,
        `  ${pctSpend >= 70 ? STATUS.ok : STATUS.warn} Real spend data: ${customers.withRealSpend} (${pctSpend}%)`,
    );

    const lastSync = customers.lastSyncedAt
        ? `Last sync: ${ageLabel(Date.now() - new Date(customers.lastSyncedAt).getTime())}`
        : `${STATUS.dark} Never synced`;
    lines.push(`  ${lastSync}`);

    // Segment sample
    const topSegs = Object.entries(customers.segmentDistribution)
        .sort(([, a], [, b]) => b - a).slice(0, 4)
        .map(([seg, n]) => `${seg}: ${n}`).join(' · ');
    if (topSegs) lines.push(`  Segments (sample 200): ${topSegs}`);

    // Insights
    lines.push(`  *Insight Freshness*`);
    for (const insight of insights) {
        const icon = insight.status === 'ok' ? STATUS.ok : insight.status === 'warn' ? STATUS.warn : STATUS.dark;
        const age  = insight.ageMs !== null ? ageLabel(insight.ageMs) : 'never generated';
        lines.push(`  ${icon} ${insight.label}: ${age}`);
    }

    // KE pipelines
    lines.push(`  *KE Pipelines*`);
    for (const ke of kePipelines) {
        if (!ke.lastRunAt) {
            lines.push(`  ${STATUS.dark} ${ke.pipeline}: never run`);
        } else {
            const ageDays = ke.ageMs ? Math.round(ke.ageMs / 86_400_000) : 0;
            const icon = ageDays <= 1 ? STATUS.ok : ageDays <= 3 ? STATUS.warn : STATUS.crit;
            lines.push(`  ${icon} ${ke.pipeline}: ${ageLabel(ke.ageMs!)} (${ke.lastStatus ?? 'unknown'})`);
        }
    }

    return lines.join('\n');
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const firestore = getAdminFirestore();

        // Find all Alleaves-connected orgs
        const locSnap = await firestore.collection('locations')
            .where('posConfig.provider', '==', 'alleaves')
            .where('posConfig.status', '==', 'active')
            .get();

        const orgIds = [...new Set(
            locSnap.docs.map(d => d.data().orgId as string).filter(Boolean)
        )];

        if (orgIds.length === 0) {
            return NextResponse.json({ ok: true, message: 'No Alleaves orgs to audit' });
        }

        const reports = await Promise.all(orgIds.map(orgId => auditOrg(firestore, orgId).catch(err => {
            logger.warn('[DATA_HEALTH] Org audit failed', { orgId, error: (err as Error).message });
            return null;
        })));

        const validReports = reports.filter((r): r is OrgHealthReport => r !== null);

        // Build Slack report
        const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'short', day: 'numeric' });
        const bodyLines = validReports.map(formatOrgReport).join('\n');

        const hasIssues = validReports.some(r =>
            r.customers.lastSyncedAt === null ||
            r.insights.some(i => i.status !== 'ok') ||
            r.kePipelines.some(ke => ke.lastRunAt === null)
        );

        await postLinusIncidentSlack({
            source: 'connection-health-cron',
            channelName: 'ops',
            fallbackText: `Data Health Report — ${today}`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${hasIssues ? '⚠️' : '✅'} Data Health Report — ${today}*\n${bodyLines}`,
                    },
                },
            ],
        });

        logger.info('[DATA_HEALTH] Report posted', { orgs: orgIds.length, hasIssues });
        return NextResponse.json({ ok: true, orgsAudited: orgIds.length, hasIssues });

    } catch (error: any) {
        logger.error('[DATA_HEALTH] Error', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) { return GET(req); }
