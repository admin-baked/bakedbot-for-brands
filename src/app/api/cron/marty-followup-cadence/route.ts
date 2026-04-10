export const dynamic = 'force-dynamic';
/**
 * Marty Follow-Up Cadence Cron
 * POST /api/cron/marty-followup-cadence
 *
 * Runs daily at 10 AM ET. Checks CRM contacts for follow-up due dates:
 * - Day 3: follow-up email (different template)
 * - Day 7: contact form submission (if URL available)
 * - Day 14: LinkedIn connection request
 * - Day 21: final push email
 *
 * Posts a summary to #ceo with what was sent and what needs manual attention.
 *
 * Cloud Scheduler:
 *   gcloud scheduler jobs create http marty-followup-cadence \
 *     --schedule="0 10 * * *" --time-zone="America/New_York" \
 *     --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/marty-followup-cadence" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';

export const maxDuration = 120;

const DAY_MS = 24 * 60 * 60 * 1000;

interface FollowUpAction {
    contactId: string;
    dispensaryName: string;
    email: string | null;
    websiteUrl: string | null;
    daysSinceFirst: number;
    action: 'email_followup' | 'contact_form' | 'linkedin_connect' | 'final_push';
    status: 'sent' | 'skipped' | 'failed';
    reason?: string;
}

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'marty-followup-cadence');
    if (authError) return authError;

    try {
        const result = await runFollowUpCadence();
        return NextResponse.json({ success: true, ...result });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('[MartyFollowUp] Failed', { error: msg });
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}

async function runFollowUpCadence() {
    const db = getAdminFirestore();
    const now = Date.now();

    // Get all contacted leads from CRM
    const snap = await db.collection('crm_outreach_contacts')
        .where('status', 'in', ['contacted', 'prospect'])
        .get();

    const actions: FollowUpAction[] = [];

    for (const doc of snap.docs) {
        const data = doc.data();
        const lastOutreach = data.lastOutreachAt || data.createdAt || 0;
        const daysSince = Math.floor((now - lastOutreach) / DAY_MS);
        const outreachCount = data.outreachCount || 1;
        const history = data.outreachHistory || [];

        // Determine follow-up stage based on outreach count and days since last contact
        let action: FollowUpAction['action'] | null = null;

        if (outreachCount === 1 && daysSince >= 3 && daysSince < 7) {
            action = 'email_followup';
        } else if (outreachCount === 2 && daysSince >= 4 && daysSince < 10 && (data.websiteUrl || data.contactFormUrl)) {
            action = 'contact_form';
        } else if (outreachCount >= 3 && daysSince >= 5 && daysSince < 18) {
            action = 'linkedin_connect';
        } else if (outreachCount >= 3 && daysSince >= 14) {
            action = 'final_push';
        }

        if (!action) continue;

        // Check if we already did this action today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const alreadyDoneToday = history.some((h: any) =>
            h.sentAt > todayStart.getTime() && h.templateId?.includes(action)
        );
        if (alreadyDoneToday) continue;

        // Execute the follow-up (emails only — contact forms and LinkedIn need Marty's active tools)
        if (action === 'email_followup' || action === 'final_push') {
            if (!data.email) {
                actions.push({
                    contactId: doc.id,
                    dispensaryName: data.dispensaryName,
                    email: null,
                    websiteUrl: data.websiteUrl || null,
                    daysSinceFirst: daysSince,
                    action,
                    status: 'skipped',
                    reason: 'No email address',
                });
                continue;
            }

            try {
                const { executeOutreach } = await import('@/server/services/ny-outreach/outreach-service');
                const templateId = action === 'email_followup' ? 'direct-personal' : 'roi-calculator';
                const result = await executeOutreach({
                    dispensaryName: data.dispensaryName,
                    email: data.email,
                    contactName: data.contactName,
                    city: data.city,
                    state: data.state || 'NY',
                    source: `marty-followup-${action}`,
                }, templateId);

                // Update CRM
                await doc.ref.update({
                    lastOutreachAt: now,
                    outreachCount: (data.outreachCount || 1) + 1,
                    outreachHistory: [
                        ...history,
                        { templateId: `followup:${action}:${templateId}`, sentAt: now, emailSent: result.emailSent },
                    ],
                    updatedAt: now,
                });

                actions.push({
                    contactId: doc.id,
                    dispensaryName: data.dispensaryName,
                    email: data.email,
                    websiteUrl: data.websiteUrl || null,
                    daysSinceFirst: daysSince,
                    action,
                    status: result.emailSent ? 'sent' : 'failed',
                    reason: result.sendError,
                });
            } catch (err) {
                actions.push({
                    contactId: doc.id,
                    dispensaryName: data.dispensaryName,
                    email: data.email,
                    websiteUrl: data.websiteUrl || null,
                    daysSinceFirst: daysSince,
                    action,
                    status: 'failed',
                    reason: String(err),
                });
            }
        } else {
            // contact_form and linkedin_connect need Marty's active browser tools
            // Log them as pending for Marty to pick up during his briefing
            actions.push({
                contactId: doc.id,
                dispensaryName: data.dispensaryName,
                email: data.email || null,
                websiteUrl: data.websiteUrl || null,
                daysSinceFirst: daysSince,
                action,
                status: 'skipped',
                reason: `Needs Marty's active tools — queued for next briefing`,
            });
        }
    }

    // Post summary to #ceo
    if (actions.length > 0) {
        const sent = actions.filter(a => a.status === 'sent');
        const queued = actions.filter(a => a.status === 'skipped');
        const failed = actions.filter(a => a.status === 'failed');

        const lines = [
            `:recycle: *Follow-Up Cadence Report*`,
            ``,
            sent.length > 0 ? `*Sent (${sent.length}):*\n${sent.map(a => `• ${a.dispensaryName} — ${a.action} (Day ${a.daysSinceFirst})`).join('\n')}` : '',
            queued.length > 0 ? `\n*Queued for Marty (${queued.length}):*\n${queued.map(a => `• ${a.dispensaryName} — ${a.action} (${a.reason})`).join('\n')}` : '',
            failed.length > 0 ? `\n*Failed (${failed.length}):*\n${failed.map(a => `• ${a.dispensaryName} — ${a.reason}`).join('\n')}` : '',
        ].filter(Boolean).join('\n');

        await postLinusIncidentSlack({
            source: 'marty-followup-cadence',
            channelName: 'ceo',
            fallbackText: `Follow-up cadence: ${sent.length} sent, ${queued.length} queued, ${failed.length} failed`,
            blocks: [{
                type: 'section',
                text: { type: 'mrkdwn', text: lines },
            }],
        });
    }

    logger.info('[MartyFollowUp] Cadence complete', {
        total: actions.length,
        sent: actions.filter(a => a.status === 'sent').length,
        queued: actions.filter(a => a.status === 'skipped').length,
        failed: actions.filter(a => a.status === 'failed').length,
    });

    return {
        total: actions.length,
        sent: actions.filter(a => a.status === 'sent').length,
        queued: actions.filter(a => a.status === 'skipped').length,
        failed: actions.filter(a => a.status === 'failed').length,
        actions,
    };
}
