import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import {
    sendPlatformOnboardingEmail,
    type PlatformOnboardingEmailJobData,
} from '@/server/services/platform-onboarding-email';
import type { UserSegment } from '@/types/welcome-system';

/**
 * Weekly Nurture Email Processor
 *
 * Sends weekly feature spotlights to onboarded users of a specific segment.
 * Called by Cloud Scheduler (every Monday for most segments).
 *
 * Body: { segment: 'customer' | 'super_user' | 'dispensary_owner' | 'brand_marketer' | 'lead', playbookId?: string }
 */

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // Verify CRON_SECRET authorization
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            logger.warn('[WeeklyNurture] Unauthorized request');
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { segment, playbookId } = body as { segment: UserSegment; playbookId?: string };

        if (!segment) {
            return NextResponse.json(
                { success: false, error: 'Missing segment' },
                { status: 400 }
            );
        }

        logger.info('[WeeklyNurture] Processing weekly nurture emails', {
            segment,
            playbookId: playbookId ?? null,
        });

        const db = getAdminFirestore();

        // Get all users of this segment who signed up more than 7 days ago
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        // Query users by role
        const roleMap: Record<UserSegment, string[]> = {
            customer: ['customer'],
            super_user: ['super_user', 'admin'],
            dispensary_owner: ['dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender', 'dispensary_manager', 'dispensary_budtender'],
            brand_marketer: ['brand', 'brand_admin', 'brand_member', 'brand_manager', 'grower'],
            lead: ['lead'],
        };

        const roles = roleMap[segment] || [];
        const recipients = [];

        // 1. Get standard users of this segment
        const usersSnapshot = await db
            .collection('users')
            .where('role', 'in', roles)
            .where('onboardingCompletedAt', '<', new Date(sevenDaysAgo).toISOString())
            .limit(100)
            .get();

        for (const doc of usersSnapshot.docs) {
            recipients.push({ ...doc.data(), id: doc.id, source: 'user' });
        }

        // 2. Specialty: Ecstatic Edibles Brand Leads (from email_leads)
        if (segment === 'lead') {
            const emailLeadsSnapshot = await db
                .collection('email_leads')
                .where('brandId', '==', 'brand_ecstatic_edibles')
                .where('capturedAt', '<', sevenDaysAgo) // Only nurture if captured > 7 days ago
                .limit(50)
                .get();

            for (const doc of emailLeadsSnapshot.docs) {
                recipients.push({
                    ...doc.data(),
                    id: doc.id,
                    role: 'lead',
                    source: 'email_lead',
                    brandId: 'brand_ecstatic_edibles'
                });
            }
        }

        logger.info('[WeeklyNurture] Found recipients to nurture', {
            segment,
            count: recipients.length,
        });

        const results = [];

        for (const recipientData of recipients) {
            const userId = recipientData.id;
            const email = (recipientData as any).email;
            // Try multiple field names - different signup paths store name differently
            const fullName = (recipientData as any).displayName || (recipientData as any).name || (recipientData as any).firstName || '';
            const firstName = (recipientData as any).firstName || fullName.split(' ')[0] || undefined;

            if (!email) {
                logger.warn('[WeeklyNurture] Skipping user without email', { userId });
                continue;
            }

            try {
                const onboardingCompletedAtMs = Date.parse(String((recipientData as any).onboardingCompletedAt || (recipientData as any).capturedAt || ''));
                const elapsedWeeks = Number.isFinite(onboardingCompletedAtMs)
                    ? Math.floor((Date.now() - onboardingCompletedAtMs) / (7 * 24 * 60 * 60 * 1000))
                    : 1;
                const weekIndex = Math.max(elapsedWeeks - 1, 0);
                const currentOrgId = (recipientData as any).currentOrgId;
                const orgMemberships = (recipientData as any).orgMemberships;
                const workspaceName =
                    (currentOrgId && orgMemberships?.[currentOrgId]?.orgName)
                    || (recipientData as any).organizationName
                    || (recipientData as any).orgName
                    || (recipientData as any).brandName
                    || (recipientData as any).dispensaryName
                    || ((recipientData as any).brandId === 'brand_ecstatic_edibles' ? 'Ecstatic Edibles' : undefined)
                    || undefined;

                const delivery = await sendPlatformOnboardingEmail({
                    userId,
                    email,
                    firstName,
                    role: (recipientData as any).role,
                    orgId: (recipientData as any).orgId || (recipientData as any).brandId || (recipientData as any).currentOrgId,
                    brandId: (recipientData as any).brandId,
                    dispensaryId: (recipientData as any).dispensaryId,
                    primaryGoal: (recipientData as any).onboarding?.primaryGoal,
                    workspaceName,
                    sequenceType: 'weekly_feature',
                    weekIndex,
                    scheduledAt: Date.now(),
                } satisfies PlatformOnboardingEmailJobData);

                if (!delivery.success) {
                    throw new Error(delivery.error || 'Failed to send weekly nurture email');
                }

                results.push({
                    userId,
                    email,
                    status: 'sent',
                    weekIndex,
                });

                logger.info('[WeeklyNurture] Nurture email sent successfully', {
                    userId,
                    email,
                    weekIndex,
                });
            } catch (error: unknown) {
                const err = error as Error;
                results.push({
                    userId,
                    email,
                    status: 'failed',
                    error: err.message,
                });

                logger.error('[WeeklyNurture] Failed to send nurture email', {
                    userId,
                    email,
                    error: err.message,
                });
            }
        }

        return NextResponse.json({
            success: true,
            segment,
            processed: results.length,
            results,
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[WeeklyNurture] Job processor failed', {
            error: err.message,
        });

        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * GET endpoint for manual testing
 */
export async function GET(request: NextRequest) {
    return NextResponse.json({
        message: 'Weekly Nurture Email Processor',
        usage: 'POST with { segment, playbookId? }',
        segments: ['customer', 'super_user', 'dispensary_owner', 'brand_marketer', 'lead'],
    });
}
