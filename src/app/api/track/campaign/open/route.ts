import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * Campaign Open Tracking (1x1 pixel)
 *
 * Embedded in campaign emails as:
 * <img src="https://bakedbot.ai/api/track/campaign/open?rid=RECIPIENT_ID&cid=CAMPAIGN_ID" width="1" height="1" />
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('rid');
    const campaignId = searchParams.get('cid');

    if (recipientId && campaignId) {
        // Fire-and-forget tracking update
        trackOpen(campaignId, recipientId).catch(() => {});
    }

    // Return 1x1 transparent GIF
    const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64',
    );

    return new NextResponse(pixel, {
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });
}

async function trackOpen(campaignId: string, recipientId: string): Promise<void> {
    const db = getAdminFirestore();
    const now = new Date();

    try {
        // Update recipient record
        const recipientRef = db
            .collection('campaigns')
            .doc(campaignId)
            .collection('recipients')
            .doc(recipientId);

        const recipientDoc = await recipientRef.get();
        if (recipientDoc.exists && !recipientDoc.data()?.openedAt) {
            await recipientRef.update({
                status: 'opened',
                openedAt: now,
            });

            // Increment campaign performance
            const campaignRef = db.collection('campaigns').doc(campaignId);
            const campaignDoc = await campaignRef.get();
            if (campaignDoc.exists) {
                const perf = campaignDoc.data()?.performance || {};
                const opened = (perf.opened || 0) + 1;
                const sent = perf.sent || 1;
                await campaignRef.update({
                    'performance.opened': opened,
                    'performance.openRate': (opened / sent) * 100,
                    'performance.lastUpdated': now,
                });
            }
        }
    } catch (error) {
        logger.error('[TRACK:CAMPAIGN_OPEN] Failed to track open', {
            campaignId,
            recipientId,
            error: (error as Error).message,
        });
    }
}
