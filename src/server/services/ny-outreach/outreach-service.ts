/**
 * NY Dispensary Outreach Service
 *
 * Orchestrates the outreach pipeline:
 * 1. Verify email via QuickEmailVerification
 * 2. Send personalized outreach email via Mailjet
 * 3. Log results to Firestore (for Drive spreadsheet sync)
 * 4. Track delivery status
 *
 * All emails sent from: Martez, Founder (martez@bakedbot.ai)
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { verifyEmail, type EmailVerificationResult } from '@/server/services/email-verification';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { generateOutreachEmails, type OutreachEmailData } from './email-templates';

const SENDER_EMAIL = 'martez@bakedbot.ai';
const SENDER_NAME = 'Martez — BakedBot AI';
const OUTREACH_COLLECTION = 'ny_outreach_log';

export interface OutreachLead {
    dispensaryName: string;
    contactName?: string;
    email: string;
    phone?: string;
    city: string;
    state: string;
    posSystem?: string;
    websiteUrl?: string;
    contactFormUrl?: string;
    source: string; // 'manual', 'research', 'ocm-registry', etc.
}

export interface OutreachResult {
    leadId: string;
    dispensaryName: string;
    email: string;
    templateId: string;
    emailVerified: boolean;
    verificationResult?: string;
    emailSent: boolean;
    sendError?: string;
    timestamp: number;
}

/**
 * Execute outreach for a single lead.
 * Verifies email, sends template, logs result.
 */
export async function executeOutreach(
    lead: OutreachLead,
    templateId: string,
    options?: { skipVerification?: boolean; testMode?: boolean; testRecipients?: string[] }
): Promise<OutreachResult> {
    const db = getAdminFirestore();
    const now = Date.now();

    // Step 1: Verify email (unless skipping or test mode)
    let verification: EmailVerificationResult | null = null;
    let emailVerified = false;

    if (options?.testMode) {
        emailVerified = true;
    } else if (!options?.skipVerification) {
        try {
            verification = await verifyEmail({ email: lead.email });
            emailVerified = verification.safe_to_send;

            if (!emailVerified) {
                // Log bad email
                const logRef = await db.collection(OUTREACH_COLLECTION).add({
                    dispensaryName: lead.dispensaryName,
                    contactName: lead.contactName || null,
                    email: lead.email,
                    phone: (lead as any).phone || null,
                    city: lead.city,
                    state: lead.state,
                    posSystem: (lead as any).posSystem || null,
                    source: (lead as any).source || null,
                    templateId,
                    emailVerified: false,
                    verificationResult: verification.result,
                    verificationReason: verification.reason,
                    emailSent: false,
                    sendError: `Email not safe to send: ${verification.result} - ${verification.reason}`,
                    status: 'bad_email',
                    timestamp: now,
                    createdAt: now,
                });

                logger.warn('[NYOutreach] Email failed verification', {
                    email: lead.email,
                    dispensary: lead.dispensaryName,
                    result: verification.result,
                    reason: verification.reason,
                });

                return {
                    leadId: logRef.id,
                    dispensaryName: lead.dispensaryName,
                    email: lead.email,
                    templateId,
                    emailVerified: false,
                    verificationResult: `${verification.result}: ${verification.reason}`,
                    emailSent: false,
                    sendError: `Email not safe to send: ${verification.result}`,
                    timestamp: now,
                };
            }
        } catch (err: unknown) {
            const error = err as Error;
            logger.error('[NYOutreach] Email verification failed', {
                email: lead.email,
                error: error.message,
            });
            // Continue with sending if verification service is down
            emailVerified = true;
        }
    }

    // Step 2: Generate email content
    const emailData: OutreachEmailData = {
        dispensaryName: lead.dispensaryName,
        contactName: lead.contactName,
        city: lead.city,
        state: lead.state,
        posSystem: lead.posSystem,
    };

    const templates = generateOutreachEmails(emailData);
    const template = templates.find(t => t.id === templateId);

    if (!template) {
        throw new Error(`Template not found: ${templateId}`);
    }

    // Step 3: Send email
    const recipients = options?.testRecipients || [lead.email];
    let emailSent = false;
    let sendError: string | undefined;

    for (const recipient of recipients) {
        try {
            const result = await sendGenericEmail({
                to: recipient,
                name: lead.contactName || lead.dispensaryName,
                fromEmail: SENDER_EMAIL,
                fromName: SENDER_NAME,
                subject: template.subject,
                htmlBody: template.htmlBody,
                textBody: template.textBody,
                communicationType: 'manual',
                agentName: 'martez-outreach',
            });

            if (result.success) {
                emailSent = true;
                logger.info('[NYOutreach] Email sent', {
                    to: recipient,
                    dispensary: lead.dispensaryName,
                    template: templateId,
                    testMode: options?.testMode || false,
                });
            } else {
                sendError = result.error;
                logger.error('[NYOutreach] Email send failed', {
                    to: recipient,
                    error: result.error,
                });
            }
        } catch (err: unknown) {
            const error = err as Error;
            sendError = error.message;
            logger.error('[NYOutreach] Email send exception', {
                to: recipient,
                error: error.message,
            });
        }
    }

    // Step 4: Log result
    const logRef = await db.collection(OUTREACH_COLLECTION).add({
        dispensaryName: lead.dispensaryName,
        contactName: lead.contactName || null,
        email: lead.email,
        phone: (lead as any).phone || null,
        city: lead.city,
        state: lead.state,
        posSystem: (lead as any).posSystem || null,
        source: (lead as any).source || null,
        templateId,
        templateName: template.name,
        subject: template.subject,
        emailVerified,
        verificationResult: verification?.result || 'skipped',
        emailSent,
        sendError: sendError || null,
        recipients,
        status: emailSent ? 'sent' : 'failed',
        testMode: options?.testMode || false,
        timestamp: now,
        createdAt: now,
    });

    return {
        leadId: logRef.id,
        dispensaryName: lead.dispensaryName,
        email: lead.email,
        templateId,
        emailVerified,
        verificationResult: verification?.result,
        emailSent,
        sendError,
        timestamp: now,
    };
}

/**
 * Send test outreach emails to internal recipients.
 * Uses all 10 templates with sample dispensary data.
 */
export async function sendTestOutreachBatch(
    testRecipients: string[]
): Promise<OutreachResult[]> {
    const sampleLeads: OutreachLead[] = [
        { dispensaryName: 'Empire Cannabis Club', contactName: 'Owner', email: 'test@example.com', city: 'New York', state: 'NY', posSystem: 'Dutchie', source: 'test' },
        { dispensaryName: 'Housing Works Cannabis Co.', contactName: 'Manager', email: 'test@example.com', city: 'New York', state: 'NY', posSystem: 'Treez', source: 'test' },
        { dispensaryName: 'SMACKED Village', contactName: 'Owner', email: 'test@example.com', city: 'New York', state: 'NY', source: 'test' },
        { dispensaryName: 'Green Thumb Dispensary', contactName: 'Director', email: 'test@example.com', city: 'Syracuse', state: 'NY', posSystem: 'Alleaves', source: 'test' },
        { dispensaryName: 'Strain Stars', contactName: 'Founder', email: 'test@example.com', city: 'Brooklyn', state: 'NY', source: 'test' },
        { dispensaryName: 'The Cannabis Place', contactName: 'GM', email: 'test@example.com', city: 'Buffalo', state: 'NY', posSystem: 'Flowhub', source: 'test' },
        { dispensaryName: 'Gotham Cannabis', contactName: 'Owner', email: 'test@example.com', city: 'Manhattan', state: 'NY', source: 'test' },
        { dispensaryName: 'Upstate Remedies', contactName: 'Partner', email: 'test@example.com', city: 'Albany', state: 'NY', posSystem: 'Alleaves', source: 'test' },
        { dispensaryName: 'Rochester Green', contactName: 'CEO', email: 'test@example.com', city: 'Rochester', state: 'NY', source: 'test' },
        { dispensaryName: 'Hudson Valley Cannabis', contactName: 'Owner', email: 'test@example.com', city: 'Poughkeepsie', state: 'NY', posSystem: 'Dutchie', source: 'test' },
    ];

    const templateIds = [
        'competitive-report',
        'founding-partner',
        'caurd-grant',
        'roi-calculator',
        'price-war',
        'pos-integration',
        'loyalty-program',
        'behind-glass-demo',
        'social-proof',
        'direct-personal',
    ];

    const results: OutreachResult[] = [];

    for (let i = 0; i < sampleLeads.length; i++) {
        const result = await executeOutreach(
            sampleLeads[i],
            templateIds[i],
            {
                testMode: true,
                testRecipients,
                skipVerification: true,
            }
        );
        results.push(result);

        // Small delay between sends
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
}

/**
 * Get outreach stats for digest.
 */
export async function getOutreachStats(since?: number): Promise<{
    totalSent: number;
    totalFailed: number;
    totalBadEmails: number;
    totalPending: number;
    recentResults: OutreachResult[];
}> {
    const db = getAdminFirestore();
    const sinceTimestamp = since || Date.now() - (12 * 60 * 60 * 1000); // Last 12 hours

    const snapshot = await db.collection(OUTREACH_COLLECTION)
        .where('timestamp', '>=', sinceTimestamp)
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

    const results = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
        leadId: doc.id,
        ...doc.data(),
    })) as OutreachResult[];

    return {
        totalSent: results.filter(r => r.emailSent).length,
        totalFailed: results.filter(r => !r.emailSent && r.emailVerified).length,
        totalBadEmails: results.filter(r => !r.emailVerified).length,
        totalPending: 0,
        recentResults: results.slice(0, 20),
    };
}

// =============================================================================
// Draft Types
// =============================================================================

export interface OutreachDraft {
    id: string;
    leadId: string;
    dispensaryName: string;
    contactName?: string;
    email: string;
    city: string;
    state: string;
    posSystem?: string;
    websiteUrl?: string;

    // Generated email content (editable before approve)
    templateId: string;
    templateName: string;
    subject: string;
    htmlBody: string;
    textBody: string;

    // Status lifecycle
    status: 'draft' | 'approved' | 'sent' | 'rejected' | 'failed';

    // Tracking
    createdAt: number;
    createdBy: string; // 'cron' or userId
    approvedAt?: number;
    approvedBy?: string;
    rejectedAt?: number;
    rejectedBy?: string;
    rejectionReason?: string;
    sentAt?: number;
    sendError?: string;

    // Email verification
    emailVerified?: boolean;
    verificationResult?: string;

    // Inbox artifact link
    inboxArtifactId?: string;
    inboxThreadId?: string;
}

// =============================================================================
// CRM Tracking (shared by cron runner + approval flow)
// =============================================================================

/**
 * Track outreach in CRM by creating/updating a record.
 */
export async function trackInCRM(lead: OutreachLead, result: OutreachResult): Promise<void> {
    const db = getAdminFirestore();

    try {
        const existingSnap = await db.collection('crm_outreach_contacts')
            .where('email', '==', lead.email.toLowerCase())
            .limit(1)
            .get();

        const crmData = {
            email: lead.email.toLowerCase(),
            dispensaryName: lead.dispensaryName,
            contactName: lead.contactName || null,
            phone: lead.phone || null,
            city: lead.city,
            state: lead.state,
            posSystem: lead.posSystem || null,
            websiteUrl: lead.websiteUrl || null,
            source: 'ny-outreach',
            lastOutreachAt: Date.now(),
            lastTemplateId: result.templateId,
            emailVerified: result.emailVerified,
            outreachCount: 1,
            status: result.emailSent ? 'contacted' : 'failed',
            updatedAt: Date.now(),
        };

        if (existingSnap.empty) {
            await db.collection('crm_outreach_contacts').add({
                ...crmData,
                createdAt: Date.now(),
                outreachHistory: [{
                    templateId: result.templateId,
                    sentAt: result.timestamp,
                    emailSent: result.emailSent,
                    error: result.sendError || null,
                }],
            });
        } else {
            const doc = existingSnap.docs[0];
            const existing = doc.data();
            await doc.ref.update({
                ...crmData,
                outreachCount: (existing.outreachCount || 0) + 1,
                outreachHistory: [
                    ...(existing.outreachHistory || []),
                    {
                        templateId: result.templateId,
                        sentAt: result.timestamp,
                        emailSent: result.emailSent,
                        error: result.sendError || null,
                    },
                ],
            });
        }
    } catch (err) {
        logger.warn('[NYOutreach] CRM tracking failed (non-fatal)', {
            email: lead.email,
            error: String(err),
        });
    }
}

/**
 * Send outreach status digest to specified email.
 */
export async function sendOutreachDigest(recipientEmail: string): Promise<void> {
    const stats = await getOutreachStats();
    const now = new Date();
    const timeLabel = now.getHours() < 12 ? 'Morning' : 'Evening';

    const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
  <h2 style="color: #059669; margin-bottom: 4px;">NY Outreach ${timeLabel} Digest</h2>
  <p style="color: #64748b; margin-top: 0;">${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>

  <div style="display: flex; gap: 16px; margin: 24px 0;">
    <div style="flex: 1; background: #ecfdf5; border-radius: 12px; padding: 16px; text-align: center;">
      <div style="font-size: 28px; font-weight: 700; color: #059669;">${stats.totalSent}</div>
      <div style="font-size: 13px; color: #047857;">Emails Sent</div>
    </div>
    <div style="flex: 1; background: #fef2f2; border-radius: 12px; padding: 16px; text-align: center;">
      <div style="font-size: 28px; font-weight: 700; color: #dc2626;">${stats.totalBadEmails}</div>
      <div style="font-size: 13px; color: #b91c1c;">Bad Emails</div>
    </div>
    <div style="flex: 1; background: #fff7ed; border-radius: 12px; padding: 16px; text-align: center;">
      <div style="font-size: 28px; font-weight: 700; color: #ea580c;">${stats.totalFailed}</div>
      <div style="font-size: 13px; color: #c2410c;">Send Failures</div>
    </div>
  </div>

  ${stats.recentResults.length > 0 ? `
  <h3 style="margin-bottom: 8px;">Recent Activity</h3>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <thead>
      <tr style="background: #f1f5f9;">
        <th style="text-align: left; padding: 8px;">Dispensary</th>
        <th style="text-align: left; padding: 8px;">Template</th>
        <th style="text-align: center; padding: 8px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${stats.recentResults.map(r => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px;">${r.dispensaryName}</td>
        <td style="padding: 8px;">${r.templateId}</td>
        <td style="padding: 8px; text-align: center;">
          ${r.emailSent ? '<span style="color: #059669;">Sent</span>' : `<span style="color: #dc2626;">${r.sendError || 'Failed'}</span>`}
        </td>
      </tr>`).join('')}
    </tbody>
  </table>` : '<p style="color: #94a3b8;">No outreach activity in this period.</p>'}

  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
    BakedBot AI — NY Outreach Automation
  </div>
</div>`;

    await sendGenericEmail({
        to: recipientEmail,
        name: 'Martez',
        fromEmail: 'notifications@bakedbot.ai',
        fromName: 'BakedBot Outreach Bot',
        subject: `NY Outreach ${timeLabel} Digest — ${stats.totalSent} sent, ${stats.totalBadEmails} bad emails`,
        htmlBody,
    });

    logger.info('[NYOutreach] Digest sent', { to: recipientEmail, stats });
}
