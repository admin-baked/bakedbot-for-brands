/**
 * Mrs. Parker Welcome Email/SMS Service
 *
 * Handles personalized welcome messages for new leads captured via age gates.
 * Uses Letta for personalization and memory management.
 */

'use server';

import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { getAdminFirestore } from '@/firebase/admin';

export interface WelcomeEmailContext {
    leadId: string;
    email: string;
    firstName?: string;
    brandId?: string;
    dispensaryId?: string;
    state?: string;
}

export interface WelcomeSmsContext {
    leadId: string;
    phone: string;
    firstName?: string;
    brandId?: string;
    dispensaryId?: string;
    state?: string;
}

/**
 * Send personalized welcome email via Mrs. Parker
 * Uses Letta to remember customer preferences and personalize message
 */
export async function sendWelcomeEmail(context: WelcomeEmailContext): Promise<{ success: boolean; error?: string }> {
    try {
        const { email, firstName, brandId, leadId, dispensaryId, state } = context;

        // Get brand information for personalization
        const brandName = await getBrandName(brandId);
        const displayName = firstName || 'Friend';

        logger.info('[MrsParker:Welcome] Sending welcome email', {
            leadId,
            email,
            brandId,
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
                source: 'age_gate_welcome',
                capturedAt: Date.now(),
            });
        } catch (lettaError) {
            logger.warn('[MrsParker:Welcome] Failed to save to Letta (non-fatal)', {
                leadId,
                error: lettaError instanceof Error ? lettaError.message : String(lettaError),
            });
        }

        // Generate personalized email content
        const subject = `Welcome to ${brandName}, ${displayName}! 🌿`;
        const htmlContent = generateWelcomeEmailHtml({
            displayName,
            brandName,
            state,
        });
        const textContent = generateWelcomeEmailText({
            displayName,
            brandName,
            state,
        });

        // Send email via Mailjet
        await sendGenericEmail({
            to: email,
            subject,
            textBody: textContent,
            htmlBody: htmlContent,
            fromName: 'Mrs. Parker',
            fromEmail: 'hello@bakedbot.ai',
        });

        logger.info('[MrsParker:Welcome] Welcome email sent successfully', {
            leadId,
            email,
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
        const { phone, firstName, brandId, leadId, state } = context;

        // Get brand information for personalization
        const brandName = await getBrandName(brandId);
        const displayName = firstName || 'friend';

        logger.info('[MrsParker:Welcome] Sending welcome SMS', {
            leadId,
            phone,
            brandId,
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
                source: 'age_gate_welcome',
                capturedAt: Date.now(),
            });
        } catch (lettaError) {
            logger.warn('[MrsParker:Welcome] Failed to save to Letta (non-fatal)', {
                leadId,
                error: lettaError instanceof Error ? lettaError.message : String(lettaError),
            });
        }

        // Generate personalized SMS content (max 160 characters for single message)
        const message = `Hey ${displayName}! Welcome to ${brandName}. Thanks for stopping by! We'll keep you updated on exclusive deals & new drops. Reply STOP to opt out.`;

        // Send SMS via Blackleaf
        await blackleafService.sendCustomMessage(phone, message);

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
 * TODO: Implement Letta memory integration for customer retention
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
        // === FUTURE: LETTA MEMORY INTEGRATION ===
        // When Letta is fully integrated, save customer facts here
        // const { lettaBlockManager } = await import('@/server/services/letta');
        // await lettaBlockManager.saveFact(brandId, agentId, fact, metadata);

        logger.info('[MrsParker:Letta] Lead saved (memory integration pending)', {
            leadId: leadData.leadId,
            brandId: leadData.brandId,
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[MrsParker:Letta] Failed to save lead', {
            leadId: leadData.leadId,
            error: err.message,
        });
        // Non-fatal: don't throw, just log
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
