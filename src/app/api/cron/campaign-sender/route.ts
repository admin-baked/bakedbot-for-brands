import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { executeCampaign } from '@/server/services/campaign-sender';
import { sendAgentNotification } from '@/server/services/agent-notifier';

/**
 * Campaign Sender Cron Job
 *
 * Processes scheduled campaigns that are due to send.
 * Should be called every 5 minutes by Cloud Scheduler.
 *
 * Deploy: gcloud scheduler jobs create http campaign-sender-cron \
 *   --schedule="*\/5 * * * *" \
 *   --uri="https://bakedbot.ai/api/cron/campaign-sender"
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
                const result = await executeCampaign(doc.id);

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
