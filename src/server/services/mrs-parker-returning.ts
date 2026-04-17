/**
 * Mrs. Parker Returning Customer Welcome-Back Email Service
 *
 * Sends personalized "great to see you again" emails 2 hours after
 * a returning customer checks in. Uses hello@bakedbot.ai via SES for paid orgs.
 */

'use server';

import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { THRIVE_CUSTOMER_SENDER_NAME } from '@/lib/email/sender-branding';
import { getAdminFirestore } from '@/firebase/admin';
import { thriveEmail, thriveCard, thriveCta, thriveLoyaltyBlock, THRIVE } from '@/lib/email/thrive-template';

export interface ReturningCustomerEmailContext {
    customerId: string;
    email: string;
    firstName: string;
    orgId: string;
    mood?: string;
    budtenderName?: string;
    visitId?: string;
    loyaltyPoints?: number;
}

const THRIVE_ORG_ID = 'org_thrive_syracuse';

/**
 * Send a welcome-back email to a returning customer (2 hours post check-in)
 */
export async function sendReturningCustomerEmail(
    context: ReturningCustomerEmailContext,
): Promise<{ success: boolean; error?: string }> {
    try {
        const { email, firstName, orgId, mood, budtenderName, loyaltyPoints } = context;

        if (!email) {
            return { success: false, error: 'No email address' };
        }

        const isThrive = orgId === THRIVE_ORG_ID;
        const brandName = isThrive ? 'Thrive Syracuse' : 'your dispensary';

        // Build personalized subject
        const subjects = [
            `Great seeing you today, ${firstName}! 🌿`,
            `Your visit to ${brandName} today`,
            `${firstName}, your picks are ready`,
        ];
        const subject = subjects[Math.floor(Math.random() * subjects.length)];

        // Build personalized body with mood-based content
        const moodContent = getMoodContent(mood);
        const budtenderLine = budtenderName
            ? `${budtenderName} was on duty today — ask for them next time!`
            : 'Your budtender has your picks ready!';

        const unsubUrl = `https://bakedbot.ai/api/email/unsubscribe?token=${Buffer.from(`${email}|${orgId}`).toString('base64url')}`;

        const htmlBody = isThrive ? thriveEmail({
            title: subject,
            badgeText: '🌿 VIP Rewards',
            unsubscribeUrl: unsubUrl,
            bodyRows: thriveCard(`
                <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:${THRIVE.BODY_HEADING};line-height:1.3;">
                    Great seeing you today${firstName ? `, ${firstName}` : ''}! 🌿
                </p>
                <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
                    Thanks for stopping by! ${budtenderLine}
                </p>
                ${moodContent ? `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${moodContent}</p>` : ''}
                ${loyaltyPoints !== undefined && loyaltyPoints > 0 ? thriveLoyaltyBlock(loyaltyPoints) : ''}
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                    How was your experience today? A quick rating helps our team keep improving — takes 5 seconds.
                </p>
                ${thriveCta({ label: 'Rate Your Visit ⭐', url: `https://bakedbot.ai/thrivesyracuse?review=1` })}
                <p style="margin:16px 0 0;font-size:14px;color:#6b7280;text-align:center;">
                    Questions? Reply to this email — we're here to help!
                </p>
            `),
        }) : `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:#f4f7f2;">
        <tr><td align="center">
            <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
                <tr><td style="padding:36px 36px 24px;background:linear-gradient(135deg,#1d7d4d 0%,#74d693 100%);color:#ffffff;">
                    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">${brandName}</p>
                    <h1 style="margin:0;font-size:28px;line-height:1.2;">Great seeing you today${firstName ? `, ${firstName}` : ''}!</h1>
                </td></tr>
                <tr><td style="padding:40px;">
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">Thanks for stopping by! ${budtenderLine}</p>
                    ${moodContent ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">${moodContent}</p>` : ''}
                    <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#333;">How was your experience today?</p>
                    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                        <tr><td style="background:linear-gradient(135deg,#1d7d4d,#0d5a33);border-radius:8px;padding:14px 32px;">
                            <a href="https://bakedbot.ai/rewards?review=1" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Rate Your Visit ⭐</a>
                        </td></tr>
                    </table>
                </td></tr>
                <tr><td style="padding:20px 36px;background:#f8faf9;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:12px;color:#999;text-align:center;">
                        © ${new Date().getFullYear()} ${brandName}.<br>
                        <a href="${unsubUrl}" style="color:#1d7d4d;">Unsubscribe</a>
                    </p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
`;

        const textBody = `
Great seeing you today${firstName ? `, ${firstName}` : ''}!

Thanks for stopping by${firstName ? `, ${firstName}` : ''}! We hope you're enjoying your visit.

${budtenderLine}

${moodContent ? moodContent + '\n' : ''}${loyaltyPoints !== undefined && loyaltyPoints > 0 ? `You have ${loyaltyPoints} loyalty points!\n` : ''}

How was your experience? Your feedback helps us serve you better.

Rate your visit: https://bakedbot.ai/${isThrive ? 'thrivesyracuse' : 'rewards'}

Questions? Reply to this email — we're here to help!

© ${new Date().getFullYear()} ${brandName}
`;

        const result = await sendGenericEmail({
            to: email,
            subject,
            htmlBody,
            textBody,
            orgId,
            communicationType: 'transactional',
            agentName: 'mrs_parker',
            fromName: isThrive ? THRIVE_CUSTOMER_SENDER_NAME : 'Mrs. Parker',
            fromEmail: 'hello@bakedbot.ai',
        });

        if (result.success) {
            logger.info('[ReturningCustomerEmail] Sent welcome-back email', {
                orgId,
                customerId: context.customerId,
                email,
                visitId: context.visitId,
            });

            // Log communication
            try {
                const db = getAdminFirestore();
                await db.collection('customer_communications').add({
                    customerId: context.customerId,
                    orgId,
                    type: 'returning_welcome_email',
                    channel: 'email',
                    sentAt: new Date(),
                    subject,
                    rating: mood ?? null,
                });
            } catch { /* non-critical */ }

            return { success: true };
        } else {
            return { success: false, error: result.error };
        }
    } catch (error) {
        logger.error('[ReturningCustomerEmail] Failed to send', {
            orgId: context.orgId,
            customerId: context.customerId,
            error: String(error),
        });
        return { success: false, error: 'Failed to send email' };
    }
}

function getMoodContent(mood?: string): string | null {
    if (!mood) return null;

    const moodRecommendations: Record<string, string> = {
        relaxed: 'Looking for more calming vibes? Try our indica selection — perfect for unwinding.',
        energized: 'Need a boost? Check out our sativa strains for energy and focus.',
        creative: 'Exploring your creative side? Our hybrid strains might be your next favorite.',
        focused: 'Staying productive? Ask your budtender about our targeted selections.',
        social: 'Planning to hang out? Our party strains are crowd-pleasers!',
        sleep: 'Need rest? Our nighttime strains are here to help you drift off.',
        hungry: 'Got the munchies? Check out our tasty edibles and strains!',
    };

    const recommendation = moodRecommendations[mood.toLowerCase()];
    return recommendation ?? null;
}

/**
 * Queue a welcome-back email to be sent 2 hours after check-in
 */
export async function queueReturningWelcomeEmail(
    context: ReturningCustomerEmailContext,
): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
        const db = getAdminFirestore();
        const now = new Date();
        const scheduledAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

        const jobRef = await db.collection('jobs').add({
            type: 'send_returning_welcome_email',
            agent: 'mrs_parker',
            status: 'pending',
            scheduledAt,
            data: {
                customerId: context.customerId,
                email: context.email,
                firstName: context.firstName,
                orgId: context.orgId,
                mood: context.mood,
                budtenderName: context.budtenderName,
                visitId: context.visitId,
                loyaltyPoints: context.loyaltyPoints,
            },
            priority: 'normal',
            createdAt: now,
            updatedAt: now,
        });

        logger.info('[ReturningCustomerEmail] Queued welcome-back email', {
            orgId: context.orgId,
            customerId: context.customerId,
            jobId: jobRef.id,
            scheduledAt,
        });

        return { success: true, jobId: jobRef.id };
    } catch (error) {
        logger.error('[ReturningCustomerEmail] Failed to queue email', {
            orgId: context.orgId,
            customerId: context.customerId,
            error: String(error),
        });
        return { success: false, error: 'Failed to queue email' };
    }
}
