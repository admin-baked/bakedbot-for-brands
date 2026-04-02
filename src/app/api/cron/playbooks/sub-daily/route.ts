/**
 * Sub-Daily Playbook Cron
 * POST /api/cron/playbooks/sub-daily
 *
 * Runs every 15 minutes. Evaluates intra-day threshold conditions for each
 * active org and fires the `revenue-pace-alert` playbook when thresholds are
 * crossed. Deduplicates — alerts fire at most once per hour per org.
 *
 * Cloud Scheduler:
 *   Schedule: "* /15 * * * *"  (every 15 minutes)
 *   Time zone: America/New_York
 *   gcloud scheduler jobs create http playbooks-sub-daily \
 *     --schedule="* /15 * * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/playbooks/sub-daily" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 *
 * Revenue threshold config stored per org in:
 *   tenants/{orgId}/settings.revenueAlertThresholdUsd  (default: 100)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';
import { requireCronSecret } from '@/server/auth/cron';

export const maxDuration = 120;

const DEFAULT_REVENUE_THRESHOLD_USD = 100;

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'playbooks-sub-daily');
    if (authError) return authError;

    const firestore = getAdminFirestore();
    const results: Array<{ orgId: string; action: string; detail?: string }> = [];

    try {
        // Get all active dispensary subscriptions (limit prevents unbounded scans as org count grows)
        const subsSnap = await firestore
            .collection('subscriptions')
            .where('status', '==', 'active')
            .limit(100)
            .get();

        if (subsSnap.size === 100) {
            logger.warn('[SubDailyCron] Hit subscription limit — some orgs may be skipped. Paginate when org count exceeds 100.');
        }

        const now = new Date();
        // ISO-style key: YYYY-MM-DD-HH (all 1-indexed, zero-padded)
        const currentHourKey = now.toISOString().slice(0, 13).replace('T', '-');

        await Promise.allSettled(
            subsSnap.docs.map(async (subDoc) => {
                const sub = subDoc.data();
                const orgId = (sub.customerId ?? sub.orgId) as string | undefined;
                if (!orgId) return;

                try {
                    await evaluateRevenueAlert(firestore, orgId, currentHourKey, results);
                } catch (err) {
                    logger.warn('[SubDailyCron] Eval failed for org', { orgId, error: err });
                }
            })
        );

        logger.info('[SubDailyCron] Complete', { checked: subsSnap.size, results: results.length });
        return NextResponse.json({ success: true, checked: subsSnap.size, results });
    } catch (err: unknown) {
        logger.error('[SubDailyCron] Fatal error', { error: err });
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}

// ---------------------------------------------------------------------------
// Revenue threshold evaluator
// ---------------------------------------------------------------------------

async function evaluateRevenueAlert(
    firestore: ReturnType<typeof getAdminFirestore>,
    orgId: string,
    currentHourKey: string,
    results: Array<{ orgId: string; action: string; detail?: string }>
): Promise<void> {
    // Check dedup — has this hour already been alerted?
    const dedupRef = firestore.doc(`revenue_alert_dedup/${orgId}_${currentHourKey}`);
    const dedupSnap = await dedupRef.get();
    if (dedupSnap.exists) {
        results.push({ orgId, action: 'skipped', detail: 'Already alerted this hour' });
        return;
    }

    // Fetch tenant config and current-hour orders in parallel
    const windowStart = new Date(Date.now() - 60 * 60 * 1000);
    const windowTs = Timestamp.fromDate(windowStart);

    const [tenantSnap, ordersSnap] = await Promise.all([
        firestore.doc(`tenants/${orgId}`).get(),
        firestore
            .collection('orders')
            .where('orgId', '==', orgId)
            .where('createdAt', '>=', windowTs)
            .where('status', 'in', ['completed', 'packed'])
            .get(),
    ]);

    const tenantData = tenantSnap.data() ?? {};
    const threshold: number =
        (tenantData.settings as Record<string, unknown> | undefined)?.revenueAlertThresholdUsd as number
        ?? DEFAULT_REVENUE_THRESHOLD_USD;

    const hourlyRevenue = ordersSnap.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + ((data.totalAmount ?? data.total ?? 0) as number);
    }, 0);

    if (hourlyRevenue < threshold) {
        results.push({ orgId, action: 'below_threshold', detail: `$${hourlyRevenue.toFixed(2)} < $${threshold}` });
        return;
    }

    // Threshold crossed — fire alert
    logger.info('[SubDailyCron] Revenue threshold crossed', { orgId, hourlyRevenue, threshold });

    await dedupRef.set({ orgId, hourKey: currentHourKey, firedAt: Timestamp.now(), hourlyRevenue });

    // Post to Slack
    const orgName = (tenantData.organizationName ?? orgId) as string;
    const message = buildRevenueAlertMessage(orgName, hourlyRevenue, threshold);

    // Determine Slack channel — org-specific or fallback to #ops
    const channelName = (tenantData.slackChannel ?? 'ops') as string;
    const channel = await slackService.findChannelByName(channelName);
    if (channel) {
        await slackService.postMessage(channel.id, message.fallback, message.blocks);
    }

    // Write inbox notification
    await firestore.collection('inbox_notifications').add({
        orgId,
        type: 'revenue_alert',
        title: 'Revenue Pace Alert 🚀',
        body: `Hourly revenue hit $${hourlyRevenue.toFixed(0)} — above your $${threshold} threshold.`,
        severity: 'success',
        createdAt: Timestamp.now(),
        read: false,
    });

    results.push({ orgId, action: 'alert_fired', detail: `$${hourlyRevenue.toFixed(2)} > $${threshold}` });
}

// ---------------------------------------------------------------------------
// Slack Block Kit message builder
// ---------------------------------------------------------------------------

function buildRevenueAlertMessage(
    orgName: string,
    hourlyRevenue: number,
    threshold: number
): { fallback: string; blocks: unknown[] } {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    const fallback = `🚀 Revenue Pace Alert — ${orgName}: $${hourlyRevenue.toFixed(0)} in the last hour (threshold: $${threshold})`;

    const blocks = [
        {
            type: 'header',
            text: { type: 'plain_text', text: `🚀 Revenue Pace Alert — ${orgName}`, emoji: true },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*$${hourlyRevenue.toFixed(0)}* in the last 60 minutes\nThreshold: $${threshold} · Time: ${time}`,
            },
        },
        {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: `_BakedBot AI · Revenue Pace Monitor_` }],
        },
    ];

    return { fallback, blocks };
}
