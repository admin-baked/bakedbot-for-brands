/**
 * Mrs. Parker Retention Nudge Email Service
 *
 * Sends "we miss you" emails to customers who haven't visited in 7+ days.
 */

'use server';

import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { getAdminFirestore } from '@/firebase/admin';
import { thriveEmail, thriveCard, thriveCta, THRIVE } from '@/lib/email/thrive-template';

export interface RetentionNudgeContext {
    customerId: string;
    email: string;
    firstName: string;
    orgId: string;
    mood?: string;
}

const THRIVE_ORG_ID = 'org_thrive_syracuse';

/**
 * Send a 7-day retention nudge email
 */
export async function sendRetentionNudgeEmail(
    context: RetentionNudgeContext,
): Promise<{ success: boolean; error?: string }> {
    try {
        const { email, firstName, orgId, mood } = context;

        if (!email) {
            return { success: false, error: 'No email address' };
        }

        const isThrive = orgId === THRIVE_ORG_ID;
        const brandName = isThrive ? 'Thrive Syracuse' : 'your dispensary';
        const brandSlug = isThrive ? 'thrivesyracuse' : 'rewards';

        const subjects = [
            `We miss you, ${firstName}! 🌿`,
            `It's been a week, ${firstName}...`,
            `Hey ${firstName} — we have something new for you`,
        ];
        const subject = subjects[Math.floor(Math.random() * subjects.length)];

        // Mood-based recommendations
        const moodRecs = getMoodRecs(mood);
        const recsLine = moodRecs
            ? `Based on your last visit, we think you'd love our ${moodRecs} selection.`
            : 'We have new arrivals and weekly deals waiting for you!';

        const unsubUrl = `https://bakedbot.ai/api/email/unsubscribe?token=${Buffer.from(`${email}|${orgId}`).toString('base64url')}`;

        const htmlBody = isThrive ? thriveEmail({
            title: subject,
            badgeText: '🌿 We Miss You',
            unsubscribeUrl: unsubUrl,
            bodyRows: thriveCard(`
                <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:${THRIVE.BODY_HEADING};line-height:1.3;">
                    We miss you${firstName ? `, ${firstName}` : ''}! 🌿
                </p>
                <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
                    It's been about a week since your last visit, and we wanted to check in.
                </p>
                <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">${recsLine}</p>
                <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Here's what's new this week:</p>
                <ul style="margin:0 0 28px;padding-left:20px;color:#374151;font-size:15px;line-height:2.0;">
                    <li>New arrivals — fresh strains just in</li>
                    <li>Weekly deals — member pricing</li>
                    <li>Exclusive rewards points double</li>
                </ul>
                ${thriveCta({ label: "See What's New", url: `https://bakedbot.ai/${brandSlug}` })}
            `),
        })` : `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:Arial,sans-serif;color:#333;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;background:#fafafa;">
        <tr>
            <td align="center">
                <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <tr>
                        <td style="padding:28px 32px 20px;background:linear-gradient(135deg,#1d7d4d,#36b369);color:#ffffff;">
                            <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.9;">${brandName}</p>
                            <h1 style="margin:0;font-size:24px;line-height:1.3;">We miss you${firstName ? `, ${firstName}` : ''}!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">It's been about a week since your last visit, and we wanted to check in.</p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${recsLine}</p>
                            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">👉 Here's what's new this week:</p>
                            <ul style="margin:0 0 24px 20px;padding:0;font-size:14px;line-height:1.8;color:#555;">
                                <li>New arrivals — fresh strains just in</li>
                                <li>Weekly deals — member pricing</li>
                                <li>Exclusive rewards points double</li>
                            </ul>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr><td align="center">
                                    <a href="https://bakedbot.ai/${brandSlug}" style="display:inline-block;background:#1d7d4d;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:bold;font-size:15px;">See What's New →</a>
                                </td></tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;background:#f5f5f5;border-top:1px solid #eee;">
                            <p style="margin:0;font-size:12px;color:#888;text-align:center;">
                                © ${new Date().getFullYear()} ${brandName}<br>
                                <a href="https://bakedbot.ai/unsubscribe" style="color:#1d7d4d;">Unsubscribe</a> · <a href="https://bakedbot.ai/privacy" style="color:#1d7d4d;">Privacy</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

        const textBody = `
We miss you${firstName ? `, ${firstName}` : ''}!

It's been about a week since your last visit, and we wanted to check in.

${recsLine}

Here's what's new this week:
- New arrivals — fresh strains just in
- Weekly deals — member pricing
- Exclusive rewards points double

See what's new: https://bakedbot.ai/${brandSlug}

© ${new Date().getFullYear()} ${brandName}
`;

        const result = await sendGenericEmail({
            to: email,
            subject,
            htmlBody,
            textBody,
            communicationType: 'winback',
            agentName: 'mrs_parker',
            fromName: isThrive ? 'Thrive Cannabis Marketplace' : 'Mrs. Parker',
            fromEmail: 'hello@bakedbot.ai',
            orgId,
        });

        if (result.success) {
            logger.info('[RetentionNudge] Sent nudge email', { orgId, customerId: context.customerId });
            return { success: true };
        }

        return { success: false, error: result.error };
    } catch (error) {
        logger.error('[RetentionNudge] Failed to send', { orgId: context.orgId, error: String(error) });
        return { success: false, error: 'Failed to send email' };
    }
}

function getMoodRecs(mood?: string): string | null {
    if (!mood) return null;

    const recs: Record<string, string> = {
        relaxed: 'relaxing indica',
        energized: 'energizing sativa',
        creative: 'balanced hybrid',
        focused: 'focused hybrid',
        social: 'social-friendly strains',
        sleep: 'sleep-inducing options',
        hungry: 'appetite-stimulating',
    };

    return recs[mood.toLowerCase()] ?? null;
}
