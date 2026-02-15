/**
 * Platform Signup Handler
 *
 * Handles welcome emails and onboarding for users who create accounts
 * on BakedBot.ai (not age gate leads).
 *
 * Triggered by user registration flow.
 */

'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { UserRole } from '@/types/roles';

export interface PlatformSignupContext {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    orgId?: string;
    brandId?: string;
    dispensaryId?: string;
    referrer?: string;
    utmParams?: {
        source?: string;
        medium?: string;
        campaign?: string;
        term?: string;
        content?: string;
    };
}

/**
 * Trigger welcome email and onboarding playbook for platform signup
 */
export async function handlePlatformSignup(
    context: PlatformSignupContext
): Promise<{ success: boolean; error?: string }> {
    try {
        const { userId, email, firstName, lastName, role, orgId, brandId, dispensaryId } = context;

        logger.info('[PlatformSignup] Handling new user signup', {
            userId,
            email,
            role,
        });

        // Determine user segment based on role
        const segment = determineUserSegment(role);

        // Create welcome email job
        const db = getAdminFirestore();

        await db.collection('jobs').add({
            type: 'send_welcome_email',
            agent: role === 'brand' ? 'craig' : 'mrs_parker',
            status: 'pending',
            data: {
                userId,
                email,
                firstName,
                lastName,
                segment,
                signupContext: 'platform_signup',
                role,
                orgId,
                brandId,
                dispensaryId,
                source: 'bakedbot_platform',
                referrer: context.referrer,
                utmParams: context.utmParams,
            },
            createdAt: Date.now(),
            priority: 'high',
        });

        logger.info('[PlatformSignup] Welcome email job created', {
            userId,
            email,
            segment,
        });

        // Trigger platform signup event for playbook system
        await db.collection('events').add({
            type: 'user.signup.platform',
            eventPattern: 'user.signup.platform',
            source: 'platform_registration',
            data: {
                userId,
                email,
                firstName,
                lastName,
                role,
                segment,
                orgId,
                brandId,
                dispensaryId,
                signupContext: 'platform',
                timestamp: Date.now(),
            },
            triggeredAt: Date.now(),
            processed: false,
        });

        logger.info('[PlatformSignup] Platform signup event triggered', {
            userId,
            email,
            eventType: 'user.signup.platform',
            segment,
        });

        // Create dashboard welcome notification for some roles
        if (role === 'super_user' || role === 'dispensary' || role === 'brand') {
            await createDashboardWelcomeNotification(userId, firstName, segment);
        }

        return { success: true };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[PlatformSignup] Failed to handle platform signup', {
            userId: context.userId,
            email: context.email,
            error: err.message,
        });

        return {
            success: false,
            error: err.message || 'Failed to handle platform signup',
        };
    }
}

/**
 * Determine user segment from role
 */
function determineUserSegment(role?: UserRole): string {
    if (!role) return 'lead';

    const segmentMap: Record<string, string> = {
        super_user: 'super_user',
        admin: 'super_user',
        dispensary: 'dispensary_owner',
        dispensary_manager: 'dispensary_owner',
        dispensary_budtender: 'dispensary_owner',
        brand: 'brand_marketer',
        brand_manager: 'brand_marketer',
        customer: 'customer',
        intern: 'super_user', // Training program participants
    };

    return segmentMap[role] || 'lead';
}

/**
 * Create dashboard welcome notification
 */
async function createDashboardWelcomeNotification(
    userId: string,
    firstName: string | undefined,
    segment: string
): Promise<void> {
    try {
        const db = getAdminFirestore();

        const welcomeMessages: Record<string, { title: string; message: string }> = {
            super_user: {
                title: 'Welcome to the BakedBot team! 🚀',
                message: `Hey ${firstName || 'there'}! Check your email for onboarding resources. Let's grow to $100k MRR together!`,
            },
            dispensary_owner: {
                title: 'Welcome to BakedBot! 💼',
                message: `Hi ${firstName || 'there'}! Your Cannabis OS is ready. Check your email for a quick setup guide.`,
            },
            brand_marketer: {
                title: 'Welcome to BakedBot! 🎨',
                message: `Hey ${firstName || 'there'}! Your marketing AI is live. Check your email to get started with Craig, Ezal, and Deebo.`,
            },
        };

        const notification = welcomeMessages[segment] || welcomeMessages.brand_marketer;

        await db.collection('inbox').add({
            userId,
            type: 'system',
            category: 'onboarding',
            title: notification.title,
            message: notification.message,
            priority: 'high',
            read: false,
            createdAt: Date.now(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        });

        logger.info('[PlatformSignup] Dashboard notification created', {
            userId,
            segment,
        });
    } catch (error) {
        logger.error('[PlatformSignup] Failed to create dashboard notification', {
            userId,
            error: error instanceof Error ? error.message : String(error),
        });
        // Non-fatal, don't throw
    }
}

/**
 * Get user signup stats
 */
export async function getSignupStats(
    days: number = 30
): Promise<{
    total: number;
    bySegment: Record<string, number>;
    bySource: Record<string, number>;
    trend: 'up' | 'down' | 'flat';
}> {
    try {
        const db = getAdminFirestore();
        const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

        // Query recent signup events
        const eventsSnapshot = await db
            .collection('events')
            .where('type', '==', 'user.signup.platform')
            .where('triggeredAt', '>=', startTime)
            .get();

        const signups = eventsSnapshot.docs.map(doc => doc.data());

        const stats = {
            total: signups.length,
            bySegment: {} as Record<string, number>,
            bySource: {} as Record<string, number>,
            trend: 'flat' as 'up' | 'down' | 'flat',
        };

        // Count by segment
        signups.forEach(signup => {
            const segment = signup.data?.segment || 'unknown';
            stats.bySegment[segment] = (stats.bySegment[segment] || 0) + 1;

            const source = signup.source || 'unknown';
            stats.bySource[source] = (stats.bySource[source] || 0) + 1;
        });

        // Calculate trend (compare last 7 days vs previous 7 days)
        const midpoint = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentSignups = signups.filter(s => (s.triggeredAt || 0) >= midpoint);
        const previousSignups = signups.filter(s => (s.triggeredAt || 0) < midpoint);

        if (recentSignups.length > previousSignups.length * 1.1) {
            stats.trend = 'up';
        } else if (recentSignups.length < previousSignups.length * 0.9) {
            stats.trend = 'down';
        }

        return stats;
    } catch (error) {
        logger.error('[PlatformSignup] Failed to get signup stats', {
            error: error instanceof Error ? error.message : String(error),
        });

        return {
            total: 0,
            bySegment: {},
            bySource: {},
            trend: 'flat',
        };
    }
}
