import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { executeCampaign } from '@/server/services/campaign-sender';
import { sendAgentNotification } from '@/server/services/agent-notifier';
import { getWarmupStatus, recordWarmupSend } from '@/server/services/email-warmup';

/**
 * Campaign Sender Cron Job
 *
 * Processes scheduled campaigns that are due to send.
 * Should be called every 30 minutes by Cloud Scheduler.
 *
 * Deploy: gcloud scheduler jobs create http campaign-sender-cron \
 *   --schedule="*\/30 * * * *" \
 *   --uri="https://bakedbot.ai/api/cron/campaign-sender"
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            logger.error('[CRON:CAMPAIGN_SENDER] CRON_SECRET not configured');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = getAdminFirestore();
        const now = new Date();

        logger.info('[CRON:CAMPAIGN_SENDER] Starting campaign send processing');

        // Query campaigns that are scheduled and due
        const campaignsSnapshot = await db
            .collection('campaigns')
            .where('status', '==', 'scheduled')
            .where('scheduledAt', '<=', now)
            .limit(10)
            .get();

        if (campaignsSnapshot.empty) {
            return NextResponse.json({
                success: true,
                message: 'No campaigns due',
                processed: 0,
            });
        }

        logger.info('[CRON:CAMPAIGN_SENDER] Found campaigns to send', {
            count: campaignsSnapshot.size,
        });

        let processed = 0;
        let failed = 0;

        for (const doc of campaignsSnapshot.docs) {
            const campaignData = doc.data();

            try {
                const orgId = campaignData.orgId as string;

                // Cache warmup status once — reused for both limit check and recording
                const warmup = orgId ? await getWarmupStatus(orgId) : null;
                if (warmup?.active && warmup.remainingToday !== undefined && warmup.remainingToday <= 0) {
                    logger.warn('[CRON:CAMPAIGN_SENDER] Warm-up daily limit reached, deferring campaign', {
                        campaignId: doc.id,
                        orgId,
                        dailyLimit: warmup.dailyLimit,
                        sentToday: warmup.sentToday,
                    });
                    continue;
                }

                // Claim campaign atomically — prevents double-send if cron fires twice concurrently
                let claimed = false;
                await db.runTransaction(async (tx) => {
                    const snap = await tx.get(db.collection('campaigns').doc(doc.id));
                    if (snap.data()?.status === 'scheduled') {
                        tx.update(db.collection('campaigns').doc(doc.id), { status: 'sending', claimedAt: new Date() });
                        claimed = true;
                    }
                });
                if (!claimed) {
                    logger.info('[CRON:CAMPAIGN_SENDER] Campaign already claimed by another instance, skipping', { campaignId: doc.id });
                    continue;
                }

                const result = await executeCampaign(doc.id);

                // Record warm-up sends using cached status
                if (orgId && result.success && result.sent > 0 && warmup?.active) {
                    await recordWarmupSend(orgId, result.sent);
                }

                if (result.success) {
                    processed++;

                    // Send agent notification to campaign creator
                    if (campaignData.createdBy) {
                        await sendAgentNotification({
                            orgId: campaignData.orgId,
                            userId: campaignData.createdBy,
                            agent: (campaignData.createdByAgent || 'craig') as 'craig',
                            type: 'campaign_sent',
                            priority: 'medium',
                            title: `Campaign "${campaignData.name}" Sent`,
                            message: `Successfully sent to ${result.sent} recipients. ${result.failed > 0 ? `${result.failed} failed.` : ''}`,
                            actionUrl: `/dashboard/campaigns/${doc.id}`,
                            actionLabel: 'View Campaign',
                            campaignId: doc.id,
                        });
                    }
                } else {
                    failed++;
                    logger.error('[CRON:CAMPAIGN_SENDER] Campaign execution failed', {
                        campaignId: doc.id,
                        error: result.error,
                    });
                }
            } catch (error) {
                failed++;
                logger.error('[CRON:CAMPAIGN_SENDER] Campaign send error', {
                    campaignId: doc.id,
                    error: (error as Error).message,
                });

                // Mark as failed
                await db.collection('campaigns').doc(doc.id).update({
                    status: 'failed',
                    updatedAt: new Date(),
                });
            }
        }

        logger.info('[CRON:CAMPAIGN_SENDER] Completed', { processed, failed });

        return NextResponse.json({
            success: true,
            processed,
            failed,
        });
    } catch (error) {
        logger.error('[CRON:CAMPAIGN_SENDER] Fatal error', {
            error: (error as Error).message,
        });
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}

/**
 * POST handler for Cloud Scheduler compatibility
 * Cloud Scheduler sends POST requests by default
 */
export async function POST(request: NextRequest) {
    return GET(request);
}
