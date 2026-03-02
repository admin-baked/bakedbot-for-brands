'use server';

/**
 * Server actions for the CEO Outreach Dashboard tab.
 * All actions gated by super_user role.
 *
 * Includes draft-first approval flow:
 * - generateOutreachDrafts() — creates preview drafts from lead queue
 * - getOutreachDrafts() — fetch pending/all drafts
 * - updateOutreachDraft() — edit subject/body before approving
 * - approveAndSendDraft() — approve + send single draft via Gmail
 * - approveAndSendAllDrafts() — batch approve all pending drafts
 * - rejectDraft() — reject a draft
 */

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import {
    getOutreachStats,
    sendTestOutreachBatch,
    trackInCRM,
    type OutreachDraft,
    type OutreachLead,
} from '@/server/services/ny-outreach/outreach-service';
import { researchNewLeads } from '@/server/services/ny-outreach/contact-research';
import { generateOutreachEmails, type OutreachEmailData } from '@/server/services/ny-outreach/email-templates';
import { verifyEmail } from '@/server/services/email-verification';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { logger } from '@/lib/logger';

const DAILY_SEND_LIMIT = parseInt(process.env.NY_OUTREACH_DAILY_LIMIT || '5', 10);

// Re-export for the UI
export type { OutreachDraft } from '@/server/services/ny-outreach/outreach-service';

// =============================================================================
// Template selection (shared with cron runner)
// =============================================================================

function selectTemplate(lead: { posSystem?: string }): string {
    const templates = [
        'competitive-report',
        'founding-partner',
        'direct-personal',
        'social-proof',
        'behind-glass-demo',
    ];

    if (lead.posSystem?.toLowerCase().includes('alleaves')) return 'pos-integration';
    if (lead.posSystem?.toLowerCase().includes('dutchie') || lead.posSystem?.toLowerCase().includes('treez')) return 'pos-integration';

    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return templates[dayOfYear % templates.length];
}

// =============================================================================
// Dashboard Data
// =============================================================================

/**
 * Load all dashboard data in a single call.
 */
export async function getOutreachDashboardData(): Promise<{
    success: boolean;
    data?: {
        stats: Awaited<ReturnType<typeof getOutreachStats>>;
        queueDepth: number;
        queueLeads: Array<{
            id: string;
            dispensaryName: string;
            email?: string;
            city: string;
            contactFormUrl?: string;
            source: string;
            createdAt: number;
        }>;
        crmContacts: Array<{
            id: string;
            dispensaryName: string;
            email: string;
            contactName?: string;
            city: string;
            status: string;
            outreachCount: number;
            lastOutreachAt: number;
            lastTemplateId: string;
        }>;
        dailyLimit: number;
        sentToday: number;
        pendingDrafts: number;
    };
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();

        // Fetch all data in parallel
        const [stats, queueSnap, leadsSnap, crmSnap, todaySentSnap, pendingDraftsSnap] = await Promise.all([
            getOutreachStats(Date.now() - 24 * 60 * 60 * 1000),
            db.collection('ny_dispensary_leads')
                .where('status', '==', 'researched')
                .where('outreachSent', '==', false)
                .count()
                .get(),
            db.collection('ny_dispensary_leads')
                .where('status', '==', 'researched')
                .where('outreachSent', '==', false)
                .orderBy('createdAt', 'asc')
                .limit(20)
                .get(),
            db.collection('crm_outreach_contacts')
                .orderBy('lastOutreachAt', 'desc')
                .limit(50)
                .get(),
            (() => {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                return db.collection('ny_outreach_log')
                    .where('timestamp', '>=', todayStart.getTime())
                    .where('emailSent', '==', true)
                    .count()
                    .get();
            })(),
            db.collection('ny_outreach_drafts')
                .where('status', '==', 'draft')
                .count()
                .get(),
        ]);

        const queueLeads = leadsSnap.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                dispensaryName: d.dispensaryName || 'Unknown',
                email: d.email || undefined,
                city: d.city || 'NY',
                contactFormUrl: d.contactFormUrl || undefined,
                source: d.source || 'research',
                createdAt: d.createdAt || d.researchedAt || Date.now(),
            };
        });

        const crmContacts = crmSnap.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                dispensaryName: d.dispensaryName || 'Unknown',
                email: d.email || '',
                contactName: d.contactName || undefined,
                city: d.city || 'NY',
                status: d.status || 'unknown',
                outreachCount: d.outreachCount || 0,
                lastOutreachAt: d.lastOutreachAt || 0,
                lastTemplateId: d.lastTemplateId || '',
            };
        });

        return {
            success: true,
            data: {
                stats,
                queueDepth: queueSnap.data().count,
                queueLeads,
                crmContacts,
                dailyLimit: DAILY_SEND_LIMIT,
                sentToday: todaySentSnap.data().count,
                pendingDrafts: pendingDraftsSnap.data().count,
            },
        };
    } catch (err) {
        logger.error('[OutreachDashboard] Failed to load data', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

// =============================================================================
// Draft Generation
// =============================================================================

/**
 * Generate outreach drafts from the lead queue.
 * Replaces the old triggerOutreachRun which sent immediately.
 */
export async function generateOutreachDrafts(): Promise<{
    success: boolean;
    draftsCreated?: number;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();

        // Get uncontacted leads with email
        const leadsSnap = await db.collection('ny_dispensary_leads')
            .where('status', '==', 'researched')
            .where('outreachSent', '==', false)
            .orderBy('createdAt', 'asc')
            .limit(DAILY_SEND_LIMIT)
            .get();

        const leads = leadsSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((l: Record<string, unknown>) => !!l.email);

        if (leads.length === 0) {
            return { success: true, draftsCreated: 0 };
        }

        let draftsCreated = 0;

        for (const lead of leads) {
            const data = lead as Record<string, unknown>;
            const templateId = selectTemplate({ posSystem: data.posSystem as string | undefined });
            const emailData: OutreachEmailData = {
                dispensaryName: (data.dispensaryName as string) || 'Unknown',
                contactName: data.contactName as string | undefined,
                city: (data.city as string) || 'New York',
                state: (data.state as string) || 'NY',
                posSystem: data.posSystem as string | undefined,
            };

            const templates = generateOutreachEmails(emailData);
            const template = templates.find(t => t.id === templateId);
            if (!template) continue;

            // Verify email
            let emailVerified = false;
            let verificationResult = 'pending';
            try {
                const v = await verifyEmail({ email: data.email as string });
                emailVerified = v.safe_to_send;
                verificationResult = `${v.result}: ${v.reason}`;
            } catch {
                emailVerified = true;
                verificationResult = 'service_unavailable';
            }

            await db.collection('ny_outreach_drafts').add({
                leadId: lead.id,
                dispensaryName: (data.dispensaryName as string) || 'Unknown',
                contactName: data.contactName || null,
                email: data.email,
                city: (data.city as string) || 'New York',
                state: (data.state as string) || 'NY',
                posSystem: data.posSystem || null,
                websiteUrl: data.websiteUrl || null,
                templateId,
                templateName: template.name,
                subject: template.subject,
                htmlBody: template.htmlBody,
                textBody: template.textBody,
                status: 'draft',
                createdAt: Date.now(),
                createdBy: user.uid,
                emailVerified,
                verificationResult,
            });

            // Update lead status
            await db.collection('ny_dispensary_leads').doc(lead.id).update({
                status: 'draft_generated',
                draftGeneratedAt: Date.now(),
                outreachTemplateId: templateId,
                updatedAt: Date.now(),
            });

            draftsCreated++;
        }

        logger.info('[OutreachDashboard] Drafts generated', { count: draftsCreated, by: user.uid });
        return { success: true, draftsCreated };
    } catch (err) {
        logger.error('[OutreachDashboard] Draft generation failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

// =============================================================================
// Draft CRUD
// =============================================================================

/**
 * Fetch outreach drafts filtered by status.
 */
export async function getOutreachDrafts(status?: string): Promise<{
    success: boolean;
    drafts?: OutreachDraft[];
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();
        let query: FirebaseFirestore.Query = db.collection('ny_outreach_drafts')
            .orderBy('createdAt', 'desc')
            .limit(50);

        if (status) {
            query = db.collection('ny_outreach_drafts')
                .where('status', '==', status)
                .orderBy('createdAt', 'desc')
                .limit(50);
        }

        const snap = await query.get();
        const drafts = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as OutreachDraft[];

        return { success: true, drafts };
    } catch (err) {
        logger.error('[OutreachDashboard] Failed to load drafts', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Edit a draft's subject and/or body before approving.
 */
export async function updateOutreachDraft(
    draftId: string,
    updates: { subject?: string; htmlBody?: string; textBody?: string }
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();
        const ref = db.collection('ny_outreach_drafts').doc(draftId);
        const doc = await ref.get();

        if (!doc.exists) return { success: false, error: 'Draft not found' };
        if (doc.data()?.status !== 'draft') return { success: false, error: 'Can only edit drafts with status "draft"' };

        const updateData: Record<string, unknown> = { updatedAt: Date.now() };
        if (updates.subject !== undefined) updateData.subject = updates.subject;
        if (updates.htmlBody !== undefined) updateData.htmlBody = updates.htmlBody;
        if (updates.textBody !== undefined) updateData.textBody = updates.textBody;

        await ref.update(updateData);
        return { success: true };
    } catch (err) {
        logger.error('[OutreachDashboard] Draft update failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Reject a draft so it won't be sent.
 */
export async function rejectDraft(
    draftId: string,
    reason?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();
        const ref = db.collection('ny_outreach_drafts').doc(draftId);
        const doc = await ref.get();

        if (!doc.exists) return { success: false, error: 'Draft not found' };
        if (doc.data()?.status !== 'draft') return { success: false, error: 'Can only reject drafts with status "draft"' };

        await ref.update({
            status: 'rejected',
            rejectedAt: Date.now(),
            rejectedBy: user.uid,
            rejectionReason: reason || null,
        });

        return { success: true };
    } catch (err) {
        logger.error('[OutreachDashboard] Draft rejection failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

// =============================================================================
// Approval + Send (via Gmail)
// =============================================================================

/**
 * Approve and send a single draft via Gmail (or Mailjet fallback).
 * Uses sendGenericEmail({ userId }) which routes to Gmail when connected.
 */
export async function approveAndSendDraft(draftId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();
        const ref = db.collection('ny_outreach_drafts').doc(draftId);
        const doc = await ref.get();

        if (!doc.exists) return { success: false, error: 'Draft not found' };
        const draft = { id: doc.id, ...doc.data() } as OutreachDraft;
        if (draft.status !== 'draft') return { success: false, error: `Draft is already "${draft.status}"` };

        // Mark as approved
        await ref.update({
            status: 'approved',
            approvedAt: Date.now(),
            approvedBy: user.uid,
        });

        // Send via Gmail (userId routes to Gmail when connected, Mailjet fallback)
        const result = await sendGenericEmail({
            to: draft.email,
            name: draft.contactName || draft.dispensaryName,
            fromEmail: 'martez@bakedbot.ai',
            fromName: 'Martez — BakedBot AI',
            subject: draft.subject,
            htmlBody: draft.htmlBody,
            textBody: draft.textBody,
            communicationType: 'manual',
            agentName: 'martez-outreach',
            userId: user.uid,
        });

        if (result.success) {
            // Update draft status
            await ref.update({
                status: 'sent',
                sentAt: Date.now(),
            });

            // Update lead status
            await db.collection('ny_dispensary_leads').doc(draft.leadId).update({
                outreachSent: true,
                outreachSentAt: Date.now(),
                outreachResult: 'sent',
                status: 'contacted',
                updatedAt: Date.now(),
            });

            // Log to outreach log
            await db.collection('ny_outreach_log').add({
                dispensaryName: draft.dispensaryName,
                email: draft.email,
                templateId: draft.templateId,
                templateName: draft.templateName,
                subject: draft.subject,
                emailVerified: draft.emailVerified ?? true,
                emailSent: true,
                status: 'sent',
                timestamp: Date.now(),
                createdAt: Date.now(),
                sentVia: 'gmail',
                approvedBy: user.uid,
            });

            // Track in CRM
            const lead: OutreachLead = {
                dispensaryName: draft.dispensaryName,
                contactName: draft.contactName,
                email: draft.email,
                city: draft.city,
                state: draft.state,
                posSystem: draft.posSystem,
                websiteUrl: draft.websiteUrl,
                source: 'ny-outreach',
            };
            await trackInCRM(lead, {
                leadId: draft.leadId,
                dispensaryName: draft.dispensaryName,
                email: draft.email,
                templateId: draft.templateId,
                emailVerified: draft.emailVerified ?? true,
                emailSent: true,
                timestamp: Date.now(),
            });

            return { success: true };
        } else {
            await ref.update({
                status: 'failed',
                sendError: result.error || 'Send failed',
            });
            return { success: false, error: result.error || 'Email send failed' };
        }
    } catch (err) {
        logger.error('[OutreachDashboard] Approve+send failed', { draftId, error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Batch approve and send all pending drafts.
 */
export async function approveAndSendAllDrafts(): Promise<{
    success: boolean;
    sent?: number;
    failed?: number;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();
        const snap = await db.collection('ny_outreach_drafts')
            .where('status', '==', 'draft')
            .orderBy('createdAt', 'asc')
            .get();

        if (snap.empty) {
            return { success: true, sent: 0, failed: 0 };
        }

        let sent = 0;
        let failed = 0;

        for (const doc of snap.docs) {
            const result = await approveAndSendDraft(doc.id);
            if (result.success) {
                sent++;
            } else {
                failed++;
            }
            // 1-second delay between sends to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        logger.info('[OutreachDashboard] Batch approve complete', { sent, failed, by: user.uid });
        return { success: true, sent, failed };
    } catch (err) {
        logger.error('[OutreachDashboard] Batch approve failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

// =============================================================================
// Legacy Actions (kept for backward compatibility)
// =============================================================================

/**
 * Manually trigger draft generation via the cron endpoint.
 */
export async function triggerOutreachRun(): Promise<{
    success: boolean;
    summary?: {
        draftsCreated: number;
        draftsFailed: number;
        newLeadsResearched: number;
    };
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai';
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            return { success: false, error: 'CRON_SECRET not configured' };
        }

        const response = await fetch(`${baseUrl}/api/cron/ny-outreach-runner`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cronSecret}`,
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();

        if (result.success) {
            return {
                success: true,
                summary: {
                    draftsCreated: result.summary?.draftsCreated || 0,
                    draftsFailed: result.summary?.draftsFailed || 0,
                    newLeadsResearched: result.summary?.newLeadsResearched || 0,
                },
            };
        }

        return { success: false, error: result.error || 'Draft generation failed' };
    } catch (err) {
        logger.error('[OutreachDashboard] Trigger outreach failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Send test batch of all 10 templates to internal recipients.
 */
export async function triggerTestBatch(): Promise<{
    success: boolean;
    count?: number;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const recipients = ['martez@bakedbot.ai', 'jack@bakedbot.ai'];
        const results = await sendTestOutreachBatch(recipients);
        const sentCount = results.filter(r => r.emailSent).length;

        return { success: true, count: sentCount };
    } catch (err) {
        logger.error('[OutreachDashboard] Test batch failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Trigger contact research to discover new dispensary leads.
 */
export async function triggerContactResearch(): Promise<{
    success: boolean;
    leadsFound?: number;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const leads = await researchNewLeads(10);
        return { success: true, leadsFound: leads.length };
    } catch (err) {
        logger.error('[OutreachDashboard] Contact research failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

// =============================================================================
// Gmail Connection Check
// =============================================================================

/**
 * Check if the current user has Gmail connected for outreach sending.
 */
export async function checkGmailConnection(): Promise<{
    connected: boolean;
    email?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { connected: false };

        const db = getAdminFirestore();
        const tokenDoc = await db.collection('users').doc(user.uid)
            .collection('integrations').doc('gmail').get();

        if (!tokenDoc.exists) return { connected: false };

        const data = tokenDoc.data();
        return {
            connected: !!data?.refreshToken,
            email: data?.email as string | undefined,
        };
    } catch {
        return { connected: false };
    }
}
