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
        const usersSnapshot = await db
            .collection('users')
            .where('role', 'in', roles)
            .where('onboardingCompletedAt', '<', new Date(sevenDaysAgo).toISOString())
            .limit(100) // Process max 100 users per run
            .get();

        logger.info('[WeeklyNurture] Found users to nurture', {
            segment,
            count: usersSnapshot.size,
        });

        const results = [];

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const email = userData.email;
            // Try multiple field names - different signup paths store name differently
            const fullName = userData.displayName || userData.name || userData.firstName || '';
            const firstName = userData.firstName || fullName.split(' ')[0] || undefined;

            if (!email) {
                logger.warn('[WeeklyNurture] Skipping user without email', { userId });
                continue;
            }

            try {
                const onboardingCompletedAtMs = Date.parse(String(userData.onboardingCompletedAt || ''));
                const elapsedWeeks = Number.isFinite(onboardingCompletedAtMs)
                    ? Math.floor((Date.now() - onboardingCompletedAtMs) / (7 * 24 * 60 * 60 * 1000))
                    : 1;
                const weekIndex = Math.max(elapsedWeeks - 1, 0);
                const currentOrgId = typeof userData.currentOrgId === 'string' ? userData.currentOrgId : null;
                const orgMemberships = userData.orgMemberships && typeof userData.orgMemberships === 'object'
                    ? userData.orgMemberships as Record<string, { orgName?: string }>
                    : null;
                const workspaceName =
                    (currentOrgId && orgMemberships?.[currentOrgId]?.orgName)
                    || userData.organizationName
                    || userData.orgName
                    || userData.brandName
                    || userData.dispensaryName
                    || undefined;

                const delivery = await sendPlatformOnboardingEmail({
                    userId,
                    email,
                    firstName,
                    role: userData.role,
                    orgId: userData.orgId || userData.brandId || userData.currentOrgId,
                    brandId: userData.brandId,
                    dispensaryId: userData.dispensaryId,
                    primaryGoal: userData.onboarding?.primaryGoal,
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
