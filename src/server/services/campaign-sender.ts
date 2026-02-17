/**
 * Campaign Send Engine
 *
 * Resolves audience → personalizes content → sends per channel → updates performance.
 * Uses existing email (Mailjet/SendGrid) and SMS (Blackleaf) infrastructure.
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { BlackleafService } from '@/lib/notifications/blackleaf-service';
import type { Campaign, CampaignRecipient, CampaignPerformance, CampaignChannel } from '@/types/campaign';
import type { CustomerSegment } from '@/types/customers';

const blackleaf = new BlackleafService();

// =============================================================================
// RESOLVE AUDIENCE
// =============================================================================

interface ResolvedRecipient {
    customerId: string;
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    segment: CustomerSegment;
    totalSpent: number;
    orderCount: number;
    daysSinceLastOrder?: number;
    loyaltyPoints?: number;
}

/**
 * Resolve campaign audience to actual customer records.
 */
export async function resolveAudience(campaign: Campaign): Promise<ResolvedRecipient[]> {
    const { firestore } = await createServerClient();

    let query: FirebaseFirestore.Query = firestore.collection('customers')
        .where('orgId', '==', campaign.orgId);

    const snap = await query.get();

    const recipients: ResolvedRecipient[] = [];

    for (const doc of snap.docs) {
        const data = doc.data();

        // Compute segment from data
        const segment = (data.segment as CustomerSegment) || 'new';

        // Segment filter
        if (campaign.audience.type === 'segment' && campaign.audience.segments?.length) {
            if (!campaign.audience.segments.includes(segment)) continue;
        }

        // Must have email for email campaigns
        const email = data.email as string | undefined;
        const phone = data.phone as string | undefined;

        const hasEmail = !!email && campaign.channels.includes('email');
        const hasPhone = !!phone && campaign.channels.includes('sms');

        if (!hasEmail && !hasPhone) continue;

        const lastDate = data.lastOrderDate?.toDate?.() || (data.lastOrderDate ? new Date(data.lastOrderDate) : null);
        const daysSince = lastDate
            ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
            : undefined;

        recipients.push({
            customerId: doc.id,
            email: email || '',
            phone,
            firstName: data.firstName || data.displayName?.split(' ')[0] || undefined,
            lastName: data.lastName || undefined,
            segment,
            totalSpent: data.totalSpent || 0,
            orderCount: data.orderCount || 0,
            daysSinceLastOrder: daysSince,
            loyaltyPoints: data.loyaltyPoints || undefined,
        });
    }

    // Deduplication: filter out customers already contacted in the last 30 days
    // for the same campaign type (prevents spam from repeated sends)
    const DEDUP_LOOKBACK_DAYS = 30;
    const lookbackDate = new Date(Date.now() - DEDUP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const campaignType = campaign.goal === 'winback' ? 'winback'
        : campaign.goal === 'birthday' ? 'birthday'
        : campaign.goal === 'retention' || campaign.goal === 'loyalty' ? 'loyalty'
        : 'campaign';

    const recentCommsSnap = await firestore.collection('customer_communications')
        .where('orgId', '==', campaign.orgId)
        .where('type', '==', campaignType)
        .where('sentAt', '>=', lookbackDate)
        .get();

    const recentlyContactedEmails = new Set(
        recentCommsSnap.docs.map(d => d.data().customerEmail as string).filter(Boolean)
    );

    const deduped = recentlyContactedEmails.size > 0
        ? recipients.filter(r => !recentlyContactedEmails.has(r.email))
        : recipients;

    if (deduped.length < recipients.length) {
        logger.info('[CAMPAIGN_SENDER] Deduplication applied', {
            campaignId: campaign.id,
            original: recipients.length,
            deduped: deduped.length,
            removed: recipients.length - deduped.length,
            lookbackDays: DEDUP_LOOKBACK_DAYS,
            campaignType,
        });
    }

    logger.info('[CAMPAIGN_SENDER] Audience resolved', {
        campaignId: campaign.id,
        total: deduped.length,
        segmentBreakdown: deduped.reduce((acc, r) => {
            acc[r.segment] = (acc[r.segment] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
    });

    return deduped;
}

// =============================================================================
// PERSONALIZE CONTENT
// =============================================================================

/**
 * Replace template variables in content with customer data.
 */
export function personalize(template: string, recipient: ResolvedRecipient, orgName?: string): string {
    return template
        .replace(/\{\{firstName\}\}/g, recipient.firstName || 'there')
        .replace(/\{\{lastName\}\}/g, recipient.lastName || '')
        .replace(/\{\{segment\}\}/g, capitalize(recipient.segment))
        .replace(/\{\{totalSpent\}\}/g, `$${recipient.totalSpent.toLocaleString()}`)
        .replace(/\{\{orderCount\}\}/g, String(recipient.orderCount))
        .replace(/\{\{daysSinceLastVisit\}\}/g, String(recipient.daysSinceLastOrder ?? 'N/A'))
        .replace(/\{\{loyaltyPoints\}\}/g, String(recipient.loyaltyPoints ?? 0))
        .replace(/\{\{orgName\}\}/g, orgName || '');
}

function capitalize(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// =============================================================================
// EXECUTE CAMPAIGN
// =============================================================================

/**
 * Main send engine. Resolves audience, personalizes, sends per channel, tracks recipients.
 */
export async function executeCampaign(campaignId: string): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    error?: string;
}> {
    const { firestore } = await createServerClient();

    // Load campaign
    const campaignDoc = await firestore.collection('campaigns').doc(campaignId).get();
    if (!campaignDoc.exists) {
        return { success: false, sent: 0, failed: 0, error: 'Campaign not found' };
    }

    const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as Campaign;

    // Validate status
    if (!['scheduled', 'approved'].includes(campaign.status)) {
        return { success: false, sent: 0, failed: 0, error: `Invalid status: ${campaign.status}` };
    }

    logger.info('[CAMPAIGN_SENDER] Executing campaign', {
        campaignId,
        name: campaign.name,
        channels: campaign.channels,
    });

    // Mark as sending
    await firestore.collection('campaigns').doc(campaignId).update({
        status: 'sending',
        sentAt: new Date(),
        updatedAt: new Date(),
    });

    // Resolve audience
    const recipients = await resolveAudience(campaign);

    if (recipients.length === 0) {
        await firestore.collection('campaigns').doc(campaignId).update({
            status: 'sent',
            completedAt: new Date(),
            performance: {
                totalRecipients: 0, sent: 0, delivered: 0, opened: 0,
                clicked: 0, bounced: 0, unsubscribed: 0, revenue: 0,
                openRate: 0, clickRate: 0, bounceRate: 0, conversionRate: 0,
                lastUpdated: new Date(),
            },
            updatedAt: new Date(),
        });
        return { success: true, sent: 0, failed: 0 };
    }

    // Load org name for personalization
    const tenantDoc = await firestore.collection('tenants').doc(campaign.orgId).get();
    const orgName = tenantDoc.data()?.name || tenantDoc.data()?.businessName || '';

    let sentCount = 0;
    let failedCount = 0;
    const batch = firestore.batch();
    const recipientsRef = firestore.collection('campaigns').doc(campaignId).collection('recipients');

    for (const recipient of recipients) {
        for (const channel of campaign.channels) {
            const content = campaign.content[channel];
            if (!content) continue;

            // Check recipient has required contact info for this channel
            if (channel === 'email' && !recipient.email) continue;
            if (channel === 'sms' && !recipient.phone) continue;

            const recipientDocRef = recipientsRef.doc();
            const recipientData: Omit<CampaignRecipient, 'id'> = {
                campaignId,
                customerId: recipient.customerId,
                email: recipient.email,
                phone: recipient.phone,
                firstName: recipient.firstName,
                segment: recipient.segment,
                channel,
                status: 'pending',
            };

            try {
                const sendResult = await sendToRecipient(
                    channel, content, recipient, campaign, orgName,
                );

                if (sendResult.success) {
                    sentCount++;
                    recipientData.status = 'sent';
                    recipientData.sentAt = new Date();
                    recipientData.providerMessageId = sendResult.messageId;
                } else {
                    failedCount++;
                    recipientData.status = 'failed';
                    recipientData.error = sendResult.error;
                }
            } catch (error) {
                failedCount++;
                recipientData.status = 'failed';
                recipientData.error = (error as Error).message;
            }

            batch.set(recipientDocRef, recipientData);
        }
    }

    // Commit all recipient records
    await batch.commit();

    // Update campaign performance and status
    const performance: CampaignPerformance = {
        totalRecipients: recipients.length,
        sent: sentCount,
        delivered: sentCount, // Assume delivered = sent for now (tracking updates later)
        opened: 0,
        clicked: 0,
        bounced: failedCount,
        unsubscribed: 0,
        revenue: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: sentCount > 0 ? (failedCount / (sentCount + failedCount)) * 100 : 0,
        conversionRate: 0,
        lastUpdated: new Date(),
    };

    await firestore.collection('campaigns').doc(campaignId).update({
        status: 'sent',
        completedAt: new Date(),
        performance,
        'audience.resolvedCount': recipients.length,
        updatedAt: new Date(),
    });

    logger.info('[CAMPAIGN_SENDER] Campaign execution complete', {
        campaignId,
        sent: sentCount,
        failed: failedCount,
        totalRecipients: recipients.length,
    });

    return { success: true, sent: sentCount, failed: failedCount };
}

// =============================================================================
// SEND TO INDIVIDUAL RECIPIENT
// =============================================================================

async function sendToRecipient(
    channel: CampaignChannel,
    content: { subject?: string; body: string; htmlBody?: string; imageUrl?: string },
    recipient: ResolvedRecipient,
    campaign: Campaign,
    orgName: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (channel === 'email') {
        const personalizedSubject = personalize(content.subject || campaign.name, recipient, orgName);
        const personalizedBody = personalize(content.body, recipient, orgName);
        const personalizedHtml = content.htmlBody
            ? personalize(content.htmlBody, recipient, orgName)
            : undefined;

        const result = await sendGenericEmail({
            to: recipient.email,
            name: recipient.firstName,
            subject: personalizedSubject,
            htmlBody: personalizedHtml || `<p>${personalizedBody.replace(/\n/g, '<br>')}</p>`,
            textBody: personalizedBody,
            orgId: campaign.orgId,
            communicationType: 'campaign',
            agentName: campaign.createdByAgent || 'craig',
            campaignId: campaign.id,
        });

        return {
            success: result.success,
            error: result.error,
        };
    }

    if (channel === 'sms') {
        if (!recipient.phone) {
            return { success: false, error: 'No phone number' };
        }

        const personalizedBody = personalize(content.body, recipient, orgName);

        const success = await blackleaf.sendCustomMessage(
            recipient.phone,
            personalizedBody,
            content.imageUrl,
        );

        return { success };
    }

    return { success: false, error: `Unsupported channel: ${channel}` };
}
