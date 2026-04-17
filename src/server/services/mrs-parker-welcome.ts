/**
 * Mrs. Parker Welcome Email/SMS Service
 *
 * Handles personalized welcome messages for new leads captured via age gates.
 * Uses Letta for personalization and memory management.
 */

'use server';

import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { THRIVE_CUSTOMER_SENDER_NAME } from '@/lib/email/sender-branding';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { getAdminFirestore } from '@/firebase/admin';
import { thriveEmail, thriveCard, thriveCta, THRIVE } from '@/lib/email/thrive-template';

export interface WelcomeEmailContext {
    leadId: string;
    email: string;
    firstName?: string;
    brandId?: string;
    dispensaryId?: string;
    state?: string;
    source?: string;
}

export interface WelcomeSmsContext {
    leadId: string;
    phone: string;
    firstName?: string;
    brandId?: string;
    dispensaryId?: string;
    state?: string;
    source?: string;
}

const THRIVE_WELCOME_ORG_ID = 'org_thrive_syracuse';
const THRIVE_CHECKIN_SOURCES = new Set([
    'brand_rewards_checkin',
    'loyalty_tablet_checkin',
]);

function getThriveCheckinUrl(): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bakedbot.ai';
    return `${appUrl}/loyalty-tablet?orgId=${THRIVE_WELCOME_ORG_ID}`;
}

const ECSTATIC_EDIBLES_BRAND_ID = 'brand_ecstatic_edibles';

function resolveWelcomeOrgId(context: {
    brandId?: string;
    dispensaryId?: string;
}): string | undefined {
    return context.dispensaryId || context.brandId;
}

function isThriveVipWelcome(context: {
    brandId?: string;
    dispensaryId?: string;
    source?: string;
}): boolean {
    const orgId = resolveWelcomeOrgId(context);
    return orgId === THRIVE_WELCOME_ORG_ID && THRIVE_CHECKIN_SOURCES.has(context.source ?? '');
}

function isEcstaticEdiblesWelcome(context: {
    brandId?: string;
    dispensaryId?: string;
}): boolean {
    return context.brandId === ECSTATIC_EDIBLES_BRAND_ID || context.dispensaryId === ECSTATIC_EDIBLES_BRAND_ID;
}

function buildThriveVipWelcomeEmail(context: {
    displayName: string;
}): { subject: string; htmlBody: string; textBody: string } {
    const { displayName } = context;
    const checkinUrl = getThriveCheckinUrl();
    const subject = 'Welcome to Thrive VIP Rewards';
    const unsubUrl = `https://bakedbot.ai/api/email/unsubscribe?token=${Buffer.from(`${checkinUrl}|org_thrive_syracuse`).toString('base64url')}`;
    const htmlBody = thriveEmail({
        title: subject,
        badgeText: '🌿 VIP Rewards',
        unsubscribeUrl: unsubUrl,
        bodyRows: thriveCard(`
            <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:${THRIVE.BODY_HEADING};line-height:1.3;">
                Welcome, ${displayName}! 🌿
            </p>
            <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
                You're officially part of Thrive VIP Rewards. We'll use what you share with us to make every visit faster, smarter, and more personal.
            </p>
            <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">Here's what to expect:</p>
            <ul style="margin:0 0 28px;padding-left:20px;color:#374151;font-size:15px;line-height:2.0;">
                <li>Weekly deals and VIP perks from Thrive</li>
                <li>Faster budtender handoff — we'll have your favorites ready</li>
                <li>Smokey-powered recommendations based on your profile</li>
                <li>Pre-check-in from your phone — skip the wait</li>
            </ul>
            ${thriveCta({ label: 'Pre-Check In From Your Phone', url: checkinUrl })}
            <p style="margin:16px 0 0;font-size:14px;color:#6b7280;text-align:center;">
                Keep an eye on your inbox for deals and post-visit follow-ups.
            </p>
        `),
    });
    const textBody = `
Hi ${displayName},

You are officially checked in with Thrive Syracuse VIP Rewards.

We will use what you share with us to make recommendations faster, smarter, and more personal every time you come back.

What to expect:
- Weekly deals from Thrive Syracuse
- Better budtender handoff before you shop
- Smokey-powered recommendations based on your feedback and favorites
- Pre-check-in from your phone before you visit

Pre-check in next time: ${checkinUrl}

Thanks for being part of Thrive VIP Rewards.
    `.trim();

    return { subject, htmlBody, textBody };
}

function buildEcstaticEdiblesWelcomeEmail(context: {
    displayName: string;
}): { subject: string; htmlBody: string; textBody: string } {
    const { displayName } = context;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bakedbot.ai';
    const brandUrl = `${appUrl}/ecstaticedibles`;
    
    const logoUrl = 'https://storage.googleapis.com/bakedbot-global-assets/brands/brand_ecstatic_edibles/logo/ecstatic_logo.png';
    const primaryColor = '#e11d48'; // Ecstatic Red
    
    const subject = '🍪 Welcome to the Ecstatic Family! (Something special is coming...)';
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#fff5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#4a0416;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 12px;background:#fff5f7;">
        <tr>
            <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(225,29,72,0.1);">
                    <tr>
                        <td style="padding:40px;text-align:center;background:linear-gradient(135deg,#e11d48 0%,#be123c 100%);">
                            <img src="${logoUrl}" alt="Ecstatic Edibles" width="200" style="margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;">
                            <h1 style="margin:0;font-size:32px;color:#ffffff;letter-spacing:-0.02em;">Welcome, Honey! 🍪</h1>
                            <p style="margin:12px 0 0;font-size:16px;color:rgba(255,255,255,0.9);font-weight:500;">From Los Angeles with Love • Founded by Melanie Comarcho</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:48px 40px;">
                            <p style="margin:0 0 20px;font-size:20px;line-height:1.5;font-weight:600;">Hi ${displayName},</p>
                            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
                                We are so thrilled to have you in our inner circle! Founded by actress and comedianne <strong>Melanie Comarcho</strong>, Ecstatic Edibles is all about bringing pure joy and premium flavor to your day—straight from the heart of LA.
                            </p>
                            
                            <div style="background:#fff1f2;border-radius:16px;padding:24px;margin-bottom:32px;border:1px dashed #f43f5e;">
                                <h3 style="margin:0 0 12px;font-size:18px;color:#e11d48;">🔥 4/20 Countdown is ON!</h3>
                                <p style="margin:0;font-size:15px;line-height:1.6;color:#831843;">
                                    As a new member of the Ecstatic family, you'll be the first to know when our <strong>4/20 Mystery Drop</strong> goes live. Trust us, you don't want to miss what we have baking in the oven.
                                </p>
                            </div>

                            <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
                                Until then, why not browse what's coming soon? From our signature <strong>Snickerdoodle Bites</strong> to our <strong>Cheesecake Bliss Gummies</strong>, we're redefining the edible experience.
                            </p>

                            <table cellpadding="0" cellspacing="0" style="margin:32px 0">
                                <tr><td style="background:#e11d48;border-radius:12px;padding:16px 32px">
                                    <a href="${brandUrl}" style="color:#fff;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
                                        Browse the Collection →
                                    </a>
                                </td></tr>
                            </table>

                            <hr style="border:none;border-top:1px solid #fee2e2;margin:40px 0;">

                            <p style="margin:0;font-size:15px;line-height:1.6;color:#9d174d;font-style:italic;">
                                Stay sweet,<br>
                                <strong style="font-size:18px;color:#e11d48;">Melanie & The Ecstatic Team 💜</strong><br>
                                <span style="font-size:13px;color:#be185d;">Los Angeles, CA</span>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
    const textBody = `
Hi ${displayName},

Welcome to the Ecstatic Edibles family! 🍪

You've just unlocked early access to the most anticipated drops in the edible world.

🔥 4/20 COUNTDOWN IS ON!
As a new member, you'll be the first to know when our 4/20 Mystery Drop goes live. Trust us, you don't want to miss what we have baking.

Browse the collection: ${brandUrl}

Stay sweet,
Mrs. Parker 💜
    `.trim();

    return { subject, htmlBody, textBody };
}

function buildThriveVipWelcomeSms(context: {
    displayName: string;
}): string {
    const checkinUrl = getThriveCheckinUrl();
    return `Hi ${context.displayName}, welcome to Thrive VIP Rewards! Pre-check in next time from your phone: ${checkinUrl} — Smokey will have your recs ready. Reply STOP to opt out.`;
}

/**
 * Send personalized welcome email via Mrs. Parker
 * Uses AI-powered content generation + Letta memory for deep personalization
 */
export async function sendWelcomeEmail(context: WelcomeEmailContext): Promise<{ success: boolean; error?: string }> {
    try {
        const { email, firstName, brandId, leadId, dispensaryId, state, source } = context;
        const orgId = resolveWelcomeOrgId(context);
        const isThriveCheckinWelcome = isThriveVipWelcome(context);

        logger.info('[MrsParker:Welcome] Sending welcome email', {
            leadId,
            email,
            brandId,
            source,
            isThriveCheckinWelcome,
        });

        // === LETTA INTEGRATION ===
        // Save lead information to Letta for future personalization
        try {
            await saveleadToLetta({
                leadId,
                email,
                firstName,
                brandId,
                state,
                source: source || 'age_gate_welcome',
                capturedAt: Date.now(),
            });
        } catch (lettaError) {
            logger.warn('[MrsParker:Welcome] Failed to save to Letta (non-fatal)', {
                leadId,
                error: lettaError instanceof Error ? lettaError.message : String(lettaError),
            });
        }

        let subject: string;
        let htmlBody: string;
        let textBody: string | undefined;
        let fromName: string | undefined;
        let fromEmail: string | undefined;

        if (isThriveCheckinWelcome) {
            const thriveWelcome = buildThriveVipWelcomeEmail({
                displayName: firstName || 'there',
            });
            subject = thriveWelcome.subject;
            htmlBody = thriveWelcome.htmlBody;
            textBody = thriveWelcome.textBody;
            fromName = THRIVE_CUSTOMER_SENDER_NAME;
            fromEmail = undefined; // Resolved by dispatcher via orgId
        } else if (isEcstaticEdiblesWelcome(context)) {
            const ecstaticWelcome = buildEcstaticEdiblesWelcomeEmail({
                displayName: firstName || 'there',
            });
            subject = ecstaticWelcome.subject;
            htmlBody = ecstaticWelcome.htmlBody;
            textBody = ecstaticWelcome.textBody;
            fromName = 'Ecstatic Edibles';
            fromEmail = undefined; // Resolved by dispatcher via brandId
        } else {
            // === AI-POWERED CONTENT GENERATION ===
            const { generateWelcomeEmail } = await import('./mrs-parker-ai-welcome');

            const aiContext = {
                leadId,
                email,
                firstName,
                brandId,
                dispensaryId,
                state,
                segment: 'customer' as const,
                signupContext: 'age_gate' as const,
                source: 'age_verification',
                signupTimestamp: Date.now(),
            };

            const generated = await generateWelcomeEmail(aiContext);
            subject = generated.subject;
            htmlBody = generated.htmlBody;
            textBody = generated.textBody;
            fromName = generated.fromName;
            fromEmail = undefined; // Resolved by dispatcher via orgId
        }

        // Send email via Mailjet
        const sendResult = await sendGenericEmail({
            to: email,
            subject,
            textBody,
            htmlBody,
            fromName,
            fromEmail,
            orgId,
            communicationType: 'welcome',
            agentName: 'mrs_parker',
        });

        if (!sendResult.success) {
            throw new Error(sendResult.error || 'Failed to send welcome email');
        }

        logger.info('[MrsParker:Welcome] AI-generated welcome email sent successfully', {
            leadId,
            email,
            subject,
        });

        return { success: true };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[MrsParker:Welcome] Failed to send welcome email', {
            leadId: context.leadId,
            email: context.email,
            error: err.message,
        });

        return {
            success: false,
            error: err.message || 'Failed to send welcome email',
        };
    }
}

/**
 * Send personalized welcome SMS via Mrs. Parker
 * Uses Letta to remember customer preferences and personalize message
 */
export async function sendWelcomeSms(context: WelcomeSmsContext): Promise<{ success: boolean; error?: string }> {
    try {
        const { phone, firstName, brandId, leadId, state, source } = context;
        const isThriveCheckinWelcome = isThriveVipWelcome(context);

        // Get brand information for personalization
        const brandName = await getBrandName(brandId);
        const displayName = firstName || 'friend';

        logger.info('[MrsParker:Welcome] Sending welcome SMS', {
            leadId,
            phone,
            brandId,
            source,
            isThriveCheckinWelcome,
        });

        // === LETTA INTEGRATION ===
        // Save lead information to Letta for future personalization
        try {
            await saveleadToLetta({
                leadId,
                phone,
                firstName,
                brandId,
                state,
                source: source || 'age_gate_welcome',
                capturedAt: Date.now(),
            });
        } catch (lettaError) {
            logger.warn('[MrsParker:Welcome] Failed to save to Letta (non-fatal)', {
                leadId,
                error: lettaError instanceof Error ? lettaError.message : String(lettaError),
            });
        }

        // Generate personalized SMS content (max 160 characters for single message)
        const message = isThriveCheckinWelcome
            ? buildThriveVipWelcomeSms({ displayName })
            : `Hey ${displayName}! Welcome to ${brandName}. Thanks for stopping by! We'll keep you updated on exclusive deals & new drops. Reply STOP to opt out.`;

        // Send SMS via Blackleaf
        const smsSent = await blackleafService.sendCustomMessage(phone, message);
        if (!smsSent) {
            throw new Error('Failed to send welcome SMS');
        }

        logger.info('[MrsParker:Welcome] Welcome SMS sent successfully', {
            leadId,
            phone,
        });

        return { success: true };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[MrsParker:Welcome] Failed to send welcome SMS', {
            leadId: context.leadId,
            phone: context.phone,
            error: err.message,
        });

        return {
            success: false,
            error: err.message || 'Failed to send welcome SMS',
        };
    }
}

/**
 * Save lead to Letta for personalization
 * Mrs. Parker uses Letta memory to remember customer details for future interactions
 */
async function saveleadToLetta(leadData: {
    leadId: string;
    email?: string;
    phone?: string;
    firstName?: string;
    brandId?: string;
    state?: string;
    source: string;
    capturedAt: number;
}): Promise<void> {
    try {
        const { archivalTagsService, CATEGORY_TAGS, AGENT_TAGS } = await import('@/server/services/letta');

        // Build memory content with customer details
        const customerIdentifier = leadData.firstName || leadData.email || leadData.phone || 'Unknown Customer';
        const contact = leadData.email || leadData.phone || 'No contact provided';
        const captureDate = new Date(leadData.capturedAt).toLocaleDateString();

        const memoryContent = `
New customer lead captured from age gate:
- Name: ${customerIdentifier}
- Contact: ${contact}
- State: ${leadData.state || 'Unknown'}
- Source: ${leadData.source}
- Captured: ${captureDate}
- Lead ID: ${leadData.leadId}

This customer opted in through the age verification process and wants to receive updates about exclusive deals and new product drops. They showed initial interest in cannabis products and should be treated as a warm lead for future marketing campaigns.
        `.trim();

        // Create tags for filtering and search
        const tags = [
            CATEGORY_TAGS.CUSTOMER,         // category:customer
            AGENT_TAGS.MRS_PARKER,          // agent:mrs_parker
            `source:${leadData.source}`,    // source:age_gate_welcome
            `state:${leadData.state || 'unknown'}`, // state:IL
            'priority:high',                 // High priority - new lead
        ];

        // Get or create Mrs. Parker's Letta agent ID
        // For now, use a fixed agent ID per brand
        const agentId = `mrs_parker_${leadData.brandId || 'default'}`;

        // Save to Letta archival memory with tags
        await archivalTagsService.insertWithTags(agentId, {
            content: memoryContent,
            tags,
            agentId,
            tenantId: leadData.brandId || 'default',
        });

        logger.info('[MrsParker:Letta] Lead saved to memory successfully', {
            leadId: leadData.leadId,
            brandId: leadData.brandId,
            agentId,
            tags: tags.join(', '),
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[MrsParker:Letta] Failed to save lead to memory', {
            leadId: leadData.leadId,
            error: err.message,
        });
        // Non-fatal: don't throw, just log
        // Welcome email should still be sent even if memory save fails
    }
}

/**
 * Get brand name from Firestore
 */
async function getBrandName(brandId?: string): Promise<string> {
    if (!brandId) return 'Our Brand';

    try {
        const db = getAdminFirestore();
        const brandDoc = await db.collection('organizations').doc(brandId).get();

        if (brandDoc.exists) {
            const brandData = brandDoc.data();
            return brandData?.name || 'Our Brand';
        }
    } catch (error) {
        logger.warn('[MrsParker:Welcome] Failed to fetch brand name', {
            brandId,
            error: error instanceof Error ? error.message : String(error),
        });
    }

    return 'Our Brand';
}

/**
 * Generate welcome email HTML
 * Mrs. Parker's warm, Southern Hospitality style
 */
function generateWelcomeEmailHtml(context: {
    displayName: string;
    brandName: string;
    state?: string;
}): string {
    const { displayName, brandName } = context;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${brandName}</title>
</head>
<body style="font-family: 'Georgia', serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
            Welcome, Sugar! 🌿
        </h1>
    </div>

    <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="font-size: 18px; margin-bottom: 20px;">
            Hey ${displayName},
        </p>

        <p style="font-size: 16px; margin-bottom: 20px;">
            Well aren't you just a breath of fresh air! I'm Mrs. Parker, and I'll be taking care of you here at <strong>${brandName}</strong>.
        </p>

        <p style="font-size: 16px; margin-bottom: 20px;">
            You've just joined a very special family, honey. We're all about quality, community, and making sure you feel right at home every time you visit.
        </p>

        <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <p style="font-size: 16px; margin: 0; font-style: italic;">
                💜 <strong>Here's what's coming your way:</strong><br>
                • Exclusive deals before anyone else<br>
                • New product drops you'll love<br>
                • VIP perks just for being part of the family
            </p>
        </div>

        <p style="font-size: 16px; margin-bottom: 20px;">
            We're so glad you're here, dear. If you ever need anything at all, just reach out. I'm always happy to help!
        </p>

        <p style="font-size: 16px; margin-bottom: 10px;">
            With love and good vibes,
        </p>

        <p style="font-size: 18px; font-style: italic; color: #667eea; margin: 0;">
            Mrs. Parker 💜<br>
            <span style="font-size: 14px; color: #666;">Customer Happiness Manager, ${brandName}</span>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="font-size: 12px; color: #999; text-align: center;">
            You're receiving this because you opted in to receive updates from ${brandName}.<br>
            <a href="#" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | <a href="#" style="color: #667eea; text-decoration: none;">Update Preferences</a>
        </p>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Generate welcome email plain text
 */
function generateWelcomeEmailText(context: {
    displayName: string;
    brandName: string;
    state?: string;
}): string {
    const { displayName, brandName } = context;

    return `
Hey ${displayName},

Well aren't you just a breath of fresh air! I'm Mrs. Parker, and I'll be taking care of you here at ${brandName}.

You've just joined a very special family, honey. We're all about quality, community, and making sure you feel right at home every time you visit.

💜 HERE'S WHAT'S COMING YOUR WAY:
• Exclusive deals before anyone else
• New product drops you'll love
• VIP perks just for being part of the family

We're so glad you're here, dear. If you ever need anything at all, just reach out. I'm always happy to help!

With love and good vibes,
Mrs. Parker 💜
Customer Happiness Manager, ${brandName}

---

You're receiving this because you opted in to receive updates from ${brandName}.
Unsubscribe: [link] | Update Preferences: [link]
    `.trim();
}
