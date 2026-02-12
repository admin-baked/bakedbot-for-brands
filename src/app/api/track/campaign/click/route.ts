import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * Campaign Click Tracking (Redirect)
 *
 * Wraps links in campaign emails:
 * https://bakedbot.ai/api/track/campaign/click?rid=RECIPIENT_ID&cid=CAMPAIGN_ID&url=ENCODED_DESTINATION
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('rid');
    const campaignId = searchParams.get('cid');
    const destination = searchParams.get('url');

    if (recipientId && campaignId) {
        // Fire-and-forget tracking update
        trackClick(campaignId, recipientId).catch(() => {});
    }

    // Redirect to destination
    if (destination) {
        return NextResponse.redirect(destination, 302);
    }

    // Fallback
    return NextResponse.redirect('https://bakedbot.ai', 302);
}

async function trackClick(campaignId: string, recipientId: string): Promise<void> {
    const db = getAdminFirestore();
    const now = new Date();

    try {
        const recipientRef = db
            .collection('campaigns')
            .doc(campaignId)
            .collection('recipients')
            .doc(recipientId);

        const recipientDoc = await recipientRef.get();
        if (recipientDoc.exists && !recipientDoc.data()?.clickedAt) {
            await recipientRef.update({
                status: 'clicked',
                clickedAt: now,
            });

            // Increment campaign performance
            const campaignRef = db.collection('campaigns').doc(campaignId);
            const campaignDoc = await campaignRef.get();
            if (campaignDoc.exists) {
                const perf = campaignDoc.data()?.performance || {};
                const clicked = (perf.clicked || 0) + 1;
                const sent = perf.sent || 1;
                const opened = perf.opened || 1;
                await campaignRef.update({
                    'performance.clicked': clicked,
                    'performance.clickRate': (clicked / sent) * 100,
                    'performance.conversionRate': (clicked / opened) * 100,
                    'performance.lastUpdated': now,
                });
            }
        }
    } catch (error) {
        logger.error('[TRACK:CAMPAIGN_CLICK] Failed to track click', {
            campaignId,
            recipientId,
            error: (error as Error).message,
        });
    }
}
