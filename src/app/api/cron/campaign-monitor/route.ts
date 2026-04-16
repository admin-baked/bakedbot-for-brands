export const dynamic = 'force-dynamic';

/**
 * Campaign Monitor Cron
 *
 * Runs every 30 minutes. Checks all active/recently-sent campaigns for:
 *   - High bounce rates (warn >5%, critical >10%)
 *   - Complaint rates (warn >0.2%)
 *   - Low open rates after 24h (<5%)
 *   - Posts a daily performance digest to #ceo at 10AM ET
 *
 * Deploy:
 *   gcloud scheduler jobs create http campaign-monitor-cron \
 *     --schedule="*\/30 * * * *" \
 *     --uri="https://bakedbot.ai/api/cron/campaign-monitor" \
 *     --message-body='{}' \
 *     --headers="Authorization=Bearer $CRON_SECRET" \
 *     --time-zone="America/New_York"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import { ingestCampaignHistoryKnowledge } from '@/server/services/knowledge-engine/ingest-campaign-history';

const BOUNCE_RATE_WARN    = 0.05;   // 5%
const BOUNCE_RATE_CRIT    = 0.10;   // 10%
const COMPLAINT_RATE_WARN = 0.002;  // 0.2%
const LOW_OPEN_RATE_WARN  = 0.05;   // 5% after 24h
const MONITOR_WINDOW_DAYS = 7;

interface CampaignPerf {
    id: string;
    name: string;
    orgId: string;
    status: string;
    sentAt?: string;
    performance?: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        unsubscribed: number;
    };
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const firestore = getAdminFirestore();

        const windowStart = new Date();
        windowStart.setDate(windowStart.getDate() - MONITOR_WINDOW_DAYS);
        const windowStartIso = windowStart.toISOString();

        const [sentSnap, sendingSnap] = await Promise.all([
            firestore.collection('campaigns')
                .where('status', '==', 'sent')
                .where('sentAt', '>=', windowStartIso)
                .orderBy('sentAt', 'desc')
                .limit(50)
                .get(),
            firestore.collection('campaigns')
                .where('status', '==', 'sending')
                .limit(10)
                .get(),
        ]);

        const campaigns: CampaignPerf[] = [
            ...sentSnap.docs.map(d => ({ id: d.id, ...d.data() } as CampaignPerf)),
            ...sendingSnap.docs.map(d => ({ id: d.id, ...d.data() } as CampaignPerf)),
        ];

        if (campaigns.length === 0) {
            return NextResponse.json({ ok: true, checked: 0 });
        }

        const alertLines: string[] = [];
        const digestLines: string[] = [];
        const now = Date.now();

        for (const campaign of campaigns) {
            const perf = campaign.performance;
            if (!perf || perf.sent < 5) continue;

            const bounceRate    = perf.bounced / perf.sent;
            const complaintRate = perf.unsubscribed / perf.sent;
            const openRate      = perf.opened / perf.sent;
            const clickRate     = perf.clicked / perf.sent;

            // Write computed rates back — non-blocking, best-effort
            firestore.collection('campaigns').doc(campaign.id).update({
                'performance.bounceRate':   bounceRate,
                'performance.openRate':     openRate,
                'performance.clickRate':    clickRate,
                'performance.lastUpdated':  new Date().toISOString(),
            }).catch(e => logger.warn('[CAMPAIGN_MONITOR] Rate update failed', { id: campaign.id, error: String(e) }));

            // Alert checks
            if (bounceRate >= BOUNCE_RATE_CRIT) {
                alertLines.push(`🚨 *CRITICAL* — "${campaign.name}" bounce rate *${(bounceRate * 100).toFixed(1)}%* (${perf.bounced}/${perf.sent}). SES suspension risk.`);
            } else if (bounceRate >= BOUNCE_RATE_WARN) {
                alertLines.push(`⚠️ "${campaign.name}" bounce *${(bounceRate * 100).toFixed(1)}%* — nearing 5% threshold.`);
            }

            if (complaintRate >= COMPLAINT_RATE_WARN) {
                alertLines.push(`⚠️ "${campaign.name}" complaints *${(complaintRate * 100).toFixed(2)}%* — ISPs flag >0.1%.`);
            }

            const sentAt = campaign.sentAt ? new Date(campaign.sentAt).getTime() : 0;
            const hoursElapsed = (now - sentAt) / 3_600_000;
            if (hoursElapsed > 24 && openRate < LOW_OPEN_RATE_WARN && campaign.status === 'sent') {
                alertLines.push(`📭 "${campaign.name}" open rate *${(openRate * 100).toFixed(1)}%* after 24h — check subject line & sender reputation.`);
            }

            // Digest line
            digestLines.push(
                `• *${campaign.name}* — Sent: ${perf.sent} | Opens: ${perf.opened} (${(openRate * 100).toFixed(0)}%) | Clicks: ${perf.clicked} (${(clickRate * 100).toFixed(0)}%) | Bounces: ${perf.bounced} (${(bounceRate * 100).toFixed(1)}%) | Unsubs: ${perf.unsubscribed}`
            );

            // Ingest final results into Knowledge Engine once per campaign (24h+ = stable metrics)
            // createSourceIfNew inside deduplicates by campaignId — safe to call every hour
            if (hoursElapsed >= 24 && campaign.status === 'sent' && campaign.orgId) {
                const summaryText = `Campaign "${campaign.name}" sent ${perf.sent} emails. Open rate: ${(openRate * 100).toFixed(1)}%, click rate: ${(clickRate * 100).toFixed(1)}%, bounce rate: ${(bounceRate * 100).toFixed(2)}%, unsubscribe rate: ${(complaintRate * 100).toFixed(2)}%.`;
                ingestCampaignHistoryKnowledge({
                    tenantId:     campaign.orgId,
                    campaignId:   campaign.id,
                    campaignName: campaign.name,
                    metrics: { sent: perf.sent, delivered: perf.delivered, opened: perf.opened, clicked: perf.clicked, bounced: perf.bounced, unsubscribed: perf.unsubscribed, openRate, clickRate, bounceRate, complaintRate },
                    summaryText,
                    observedAt: new Date(campaign.sentAt!),
                }).catch(e => logger.warn('[CAMPAIGN_MONITOR] KE ingestion failed', { id: campaign.id, error: String(e) }));
            }
        }

        // Post alerts immediately
        if (alertLines.length > 0) {
            await postLinusIncidentSlack({
                source: 'campaign-monitor',
                channelName: 'ceo',
                fallbackText: `Campaign alerts: ${alertLines.length} issue(s) found`,
                blocks: [
                    { type: 'section', text: { type: 'mrkdwn', text: `*📊 Campaign Monitor Alerts*\n\n${alertLines.join('\n')}` } },
                ],
            });
        }

        // Daily digest at 10AM ET
        const etHour = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false });
        if (etHour === '10' && digestLines.length > 0) {
            await postLinusIncidentSlack({
                source: 'campaign-monitor',
                channelName: 'ceo',
                fallbackText: `Daily campaign digest: ${digestLines.length} campaign(s)`,
                blocks: [
                    { type: 'section', text: { type: 'mrkdwn', text: `*📊 Campaign Performance Digest*\n\n${digestLines.join('\n')}` } },
                ],
            });
        }

        logger.info('[CAMPAIGN_MONITOR] Check complete', {
            total: campaigns.length,
            alerts: alertLines.length,
            digestPosted: etHour === '10',
        });

        return NextResponse.json({ ok: true, checked: campaigns.length, alerts: alertLines.length });

    } catch (error) {
        logger.error('[CAMPAIGN_MONITOR] Error', { error: (error as Error).message });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) { return GET(req); }
