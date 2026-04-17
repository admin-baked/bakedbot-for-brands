/**
 * Mrs. Parker Returning Customer Welcome-Back Email Service
 *
 * Sends personalized "great to see you again" emails 2 hours after
 * a returning customer checks in. Uses hello@bakedbot.ai via SES for paid orgs.
 */

'use server';

import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { getAdminFirestore } from '@/firebase/admin';

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

        const thriveHeader = isThrive ? `
                    <tr>
                        <td style="padding:28px 40px 24px;background:#0A803A;text-align:center;">
                            <img src="https://storage.googleapis.com/bakedbot-global-assets/logos/org_thrive_syracuse/thrive-logo.svg" alt="Thrive Cannabis Marketplace" height="44" style="display:block;margin:0 auto 12px;">
                            <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#4ade80;font-weight:600;">VIP Rewards</p>
                        </td>
                    </tr>
                    <tr><td style="height:4px;background:linear-gradient(90deg,#0A803A,#4ade80,#0A803A);"></td></tr>` : `
                    <tr>
                        <td style="padding:36px 36px 24px;background:linear-gradient(135deg,#1d7d4d 0%,#74d693 100%);color:#ffffff;">
                            <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">${brandName}</p>
                            <h1 style="margin:0;font-size:28px;line-height:1.2;">Great seeing you today${firstName ? `, ${firstName}` : ''}!</h1>
                        </td>
                    </tr>`;
        const thriveFooter = isThrive ? `
                    <tr>
                        <td style="padding:20px 40px;background:#f2f9f4;border-top:1px solid #d1f0dc;">
                            <p style="margin:0 0 4px;font-size:12px;color:#666;text-align:center;"><strong>Thrive Cannabis Marketplace</strong><br>3065 Erie Blvd E, Syracuse, NY 13224 · Mon–Sat 10:30 AM–8 PM · Sun 11 AM–6 PM</p>
                            <p style="margin:8px 0 0;font-size:11px;color:#aaa;text-align:center;"><a href="https://bakedbot.ai/unsubscribe" style="color:#0A803A;">Unsubscribe</a> · <a href="https://bakedbot.ai/privacy" style="color:#0A803A;">Privacy</a></p>
                        </td>
                    </tr>` : `
                    <tr>
                        <td style="padding:20px 36px;background:#f8faf9;border-top:1px solid #e5e7eb;">
                            <p style="margin:0;font-size:12px;color:#999;text-align:center;">
                                © ${new Date().getFullYear()} ${brandName}. All rights reserved.<br>
                                <a href="https://bakedbot.ai/unsubscribe" style="color:#1d7d4d;">Unsubscribe</a> · <a href="https://bakedbot.ai/privacy" style="color:#1d7d4d;">Privacy</a>
                            </p>
                        </td>
                    </tr>`;
        const ctaBg = isThrive ? '#0A803A' : 'linear-gradient(135deg,#1d7d4d,#0d5a33)';
        const outerBg = isThrive ? '#f2f9f4' : '#f4f7f2';

        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${outerBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:${outerBg};">
        <tr>
            <td align="center">
                <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(10,128,58,0.1);">
                    ${thriveHeader}
                    <tr>
                        <td style="padding:40px;">
                            ${isThrive ? `<h2 style="margin:0 0 16px;font-size:22px;color:#0d2b13;line-height:1.3;">Great seeing you today${firstName ? `, ${firstName}` : ''}!</h2>` : ''}
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">
                                Thanks for stopping by${firstName ? `, ${firstName}` : ''}! ${budtenderLine}
                            </p>
                            ${moodContent ? `
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">
                                ${moodContent}
                            </p>
                            ` : ''}
                            ${loyaltyPoints !== undefined && loyaltyPoints > 0 ? `
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f2f9f4;border-radius:10px;border-left:4px solid #0A803A;">
                                <tr><td style="padding:16px 20px;">
                                    <p style="margin:0;font-size:15px;color:#0d2b13;line-height:1.6;">🎁 <strong>You have ${loyaltyPoints} VIP points</strong> — keep earning with every visit!</p>
                                </td></tr>
                            </table>
                            ` : ''}
                            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#333;">
                                How was your experience today? A quick rating helps our team keep improving — takes 5 seconds.
                            </p>
                            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                                <tr><td style="background:${ctaBg};border-radius:8px;padding:14px 32px;">
                                    <a href="https://bakedbot.ai/${isThrive ? 'thrivesyracuse' : 'rewards'}?review=1" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Rate Your Visit ⭐</a>
                                </td></tr>
                            </table>
                            <p style="margin:0;font-size:14px;line-height:1.7;color:#555;">
                                Questions? Reply to this email — we're here to help!
                            </p>
                        </td>
                    </tr>
                    ${thriveFooter}
                </table>
            </td>
        </tr>
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
            fromName: 'Mrs. Parker',
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
