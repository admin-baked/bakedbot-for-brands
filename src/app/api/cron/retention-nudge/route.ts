import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';

const THRIVE_ORG_ID = 'org_thrive_syracuse';

export const dynamic = 'force-dynamic';

/**
 * 7-Day Retention Nudge Cron
 * 
 * Runs every 6 hours. Finds customers who checked in 7+ days ago but haven't returned.
 * Sends a gentle "we miss you" email with current deals and mood-based recommendations.
 * 
 * Filters:
 * - Skip customers who received a nudge in the last 7 days
 * - Skip customers who have visited in the last 7 days
 * - Only for orgs with email consent
 */
export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'retention-nudge');
    if (authError) return authError;

    const db = getAdminFirestore();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysPlusOneDayAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    try {
        // Get customers who checked in between 7 and 8 days ago
        const visitsSnapshot = await db.collection('checkin_visits')
            .where('visitedAt', '>=', sevenDaysPlusOneDayAgo)
            .where('visitedAt', '<', sevenDaysAgo)
            .where('emailConsent', '==', true)
            .where('email', '!=', null)
            .get();

        if (visitsSnapshot.empty) {
            return NextResponse.json({ success: true, processed: 0, message: 'No customers due for nudge' });
        }

        const results = [];

        for (const doc of visitsSnapshot.docs.slice(0, 20)) {
            const visit = doc.data();
            const customerId = visit.customerId;
            const email = visit.email;
            const firstName = visit.firstName;

            if (!customerId || !email) continue;

            try {
                // Check if customer has visited since (don't nudge if they're active)
                const recentVisit = await db.collection('checkin_visits')
                    .where('customerId', '==', customerId)
                    .where('visitedAt', '>=', sevenDaysAgo)
                    .limit(1)
                    .get();

                if (!recentVisit.empty) continue;

                // Check if we already sent a nudge recently
                const existingNudge = await db.collection('customer_communications')
                    .where('customerId', '==', customerId)
                    .where('type', '==', 'retention_nudge')
                    .orderBy('sentAt', 'desc')
                    .limit(1)
                    .get();

                if (!existingNudge.empty) {
                    const lastNudge = existingNudge.docs[0].data().sentAt;
                    const lastNudgeDate = lastNudge?.toDate?.() ?? new Date(lastNudge);
                    const daysSinceNudge = (now.getTime() - lastNudgeDate.getTime()) / (24 * 60 * 60 * 1000);
                    if (daysSinceNudge < 7) continue;
                }

                // Send the nudge email
                const { sendRetentionNudgeEmail } = await import('@/server/services/mrs-parker-retention-nudge');
                const result = await sendRetentionNudgeEmail({
                    customerId,
                    email,
                    firstName,
                    orgId: visit.orgId,
                    mood: visit.mood,
                });

                if (result.success) {
                    // Log the communication
                    await db.collection('customer_communications').add({
                        customerId,
                        orgId: visit.orgId,
                        type: 'retention_nudge',
                        channel: 'email',
                        sentAt: now,
                        subject: 'We miss you! 🌿',
                    });
                    results.push({ customerId, status: 'sent' });
                } else {
                    results.push({ customerId, status: 'failed', error: result.error });
                }
            } catch (err) {
                logger.error('[RetentionNudge] Failed to process customer', { customerId, error: String(err) });
                results.push({ customerId, status: 'error', error: String(err) });
            }
        }

        logger.info('[RetentionNudge] Processed nudge emails', { processed: results.length });

        return NextResponse.json({
            success: true,
            processed: results.length,
            results,
        });
    } catch (error) {
        logger.error('[RetentionNudge] Cron failed', { error: String(error) });
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
