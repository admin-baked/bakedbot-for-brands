import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { generateWelcomeEmail } from '@/server/services/mrs-parker-ai-welcome';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import type { UserSegment } from '@/types/welcome-system';

/**
 * Weekly Nurture Email Processor
 *
 * Sends weekly nurture emails to all users of a specific segment.
 * Called by Cloud Scheduler (every Monday for most segments).
 *
 * Body: { segment: 'customer' | 'super_user' | 'dispensary_owner' | 'brand_marketer' | 'lead', playbookId: string }
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
        const { segment, playbookId } = body as { segment: UserSegment; playbookId: string };

        if (!segment || !playbookId) {
            return NextResponse.json(
                { success: false, error: 'Missing segment or playbookId' },
                { status: 400 }
            );
        }

        logger.info('[WeeklyNurture] Processing weekly nurture emails', {
            segment,
            playbookId,
        });

        const db = getAdminFirestore();

        // Get all users of this segment who signed up more than 7 days ago
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        // Query users by role
        const roleMap: Record<UserSegment, string[]> = {
            customer: ['customer'],
            super_user: ['super_user', 'admin'],
            dispensary_owner: ['dispensary', 'dispensary_manager', 'dispensary_budtender'],
            brand_marketer: ['brand', 'brand_manager'],
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
                // Generate AI-powered nurture email
                const welcomeEmail = await generateWelcomeEmail({
                    userId,
                    email,
                    firstName,
                    segment,
                    signupContext: 'platform_signup',
                    source: 'weekly_nurture',
                    signupTimestamp: new Date(userData.onboardingCompletedAt).getTime(),
                    orgId: userData.orgId || userData.brandId || userData.currentOrgId,
                    brandId: userData.brandId,
                    dispensaryId: userData.dispensaryId,
                    role: userData.role,
                });

                // Send email
                await sendGenericEmail({
                    to: email,
                    subject: welcomeEmail.subject,
                    textBody: welcomeEmail.textBody,
                    htmlBody: welcomeEmail.htmlBody,
                    fromName: welcomeEmail.fromName,
                    fromEmail: welcomeEmail.fromEmail,
                });

                results.push({
                    userId,
                    email,
                    status: 'sent',
                });

                logger.info('[WeeklyNurture] Nurture email sent successfully', {
                    userId,
                    email,
                    subject: welcomeEmail.subject,
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
        usage: 'POST with { segment, playbookId }',
        segments: ['customer', 'super_user', 'dispensary_owner', 'brand_marketer', 'lead'],
    });
}
