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
import { researchNewLeads, importNYLicensedLeads, bulkImportAllNYLeads } from '@/server/services/ny-outreach/contact-research';
import { generateOutreachEmails, type OutreachEmailData } from '@/server/services/ny-outreach/email-templates';
import { verifyEmail } from '@/server/services/email-verification';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { apolloSearchPeople, apolloEnrichByDomain, getApolloCreditStatus, type ApolloCreditStatus } from '@/server/services/ny-outreach/apollo-enrichment';
import { enrichLeadBatch } from '@/server/services/ny-outreach/lead-enrichment';
import { logger } from '@/lib/logger';

// Re-export Apollo credit type for UI
export type { ApolloCreditStatus } from '@/server/services/ny-outreach/apollo-enrichment';

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

        // Helper: convert any Timestamp/Date/number to milliseconds
        const toMs = (val: unknown): number => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            if (val instanceof Date) return val.getTime();
            if (typeof (val as any).toDate === 'function') return (val as any).toDate().getTime();
            return 0;
        };

        const queueLeads = leadsSnap.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                dispensaryName: d.dispensaryName || 'Unknown',
                email: d.email || undefined,
                city: d.city || 'NY',
                contactFormUrl: d.contactFormUrl || undefined,
                source: d.source || 'research',
                createdAt: toMs(d.createdAt) || toMs(d.researchedAt) || Date.now(),
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
                lastOutreachAt: toMs(d.lastOutreachAt),
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

        // Fetch ALL uncontacted leads (no limit before email filter — bulk imports
        // create 500+ leads with email=null, so limiting first misses email-having
        // leads that were researched earlier and sit at higher createdAt values).
        const leadsSnap = await db.collection('ny_dispensary_leads')
            .where('status', '==', 'researched')
            .where('outreachSent', '==', false)
            .orderBy('createdAt', 'asc')
            .limit(600) // covers full 500+ bulk import corpus
            .get();

        // Cast result as indexed type — TypeScript strips index signatures from object literal spreads,
        // so we assert the whole expression to preserve property access on lead fields
        const allLeads = leadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; [key: string]: unknown }));

        // Split into two tracks
        const emailLeads = allLeads.filter(l => !!l.email).slice(0, DAILY_SEND_LIMIT);
        const formLeads = allLeads
            .filter(l => !l.email && !!l.contactFormUrl)
            .slice(0, DAILY_SEND_LIMIT); // separate quota for form track

        if (emailLeads.length === 0 && formLeads.length === 0) {
            return { success: true, draftsCreated: 0 };
        }

        let draftsCreated = 0;

        // --- Track A: email drafts ---
        for (const lead of emailLeads) {
            const data = lead;
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
                outreachType: 'email',
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

            await db.collection('ny_dispensary_leads').doc(lead.id).update({
                status: 'draft_generated',
                draftGeneratedAt: Date.now(),
                outreachTemplateId: templateId,
                updatedAt: Date.now(),
            });

            draftsCreated++;
        }

        // --- Track B: contact-form drafts (no email, has contactFormUrl) ---
        for (const lead of formLeads) {
            const data = lead;
            const emailData: OutreachEmailData = {
                dispensaryName: (data.dispensaryName as string) || 'Unknown',
                contactName: data.contactName as string | undefined,
                city: (data.city as string) || 'New York',
                state: (data.state as string) || 'NY',
                posSystem: data.posSystem as string | undefined,
            };
            const templates = generateOutreachEmails(emailData);
            const template = templates[0]; // use first template for form messages
            if (!template) continue;

            await db.collection('ny_outreach_drafts').add({
                leadId: lead.id,
                outreachType: 'form',
                dispensaryName: (data.dispensaryName as string) || 'Unknown',
                contactName: data.contactName || null,
                email: null,
                contactFormUrl: data.contactFormUrl,
                city: (data.city as string) || 'New York',
                state: (data.state as string) || 'NY',
                posSystem: data.posSystem || null,
                websiteUrl: data.websiteUrl || null,
                templateId: template.id,
                templateName: template.name,
                subject: template.subject,
                htmlBody: template.htmlBody,
                textBody: template.textBody,
                status: 'draft',
                createdAt: Date.now(),
                createdBy: user.uid,
                emailVerified: false,
                verificationResult: 'form_only',
            });

            await db.collection('ny_dispensary_leads').doc(lead.id).update({
                status: 'draft_generated',
                draftGeneratedAt: Date.now(),
                updatedAt: Date.now(),
            });

            draftsCreated++;
        }

        logger.info('[OutreachDashboard] Drafts generated', { count: draftsCreated, emailTrack: emailLeads.length, formTrack: formLeads.length, by: user.uid });
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

        // ── Form-submission track: user manually submitted the contact form ──
        if (draft.outreachType === 'form') {
            await ref.update({ status: 'sent', sentAt: Date.now(), sentVia: 'contact_form' });
            await db.collection('ny_dispensary_leads').doc(draft.leadId).update({
                outreachSent: true,
                outreachSentAt: Date.now(),
                outreachResult: 'form_submitted',
                status: 'contacted',
                updatedAt: Date.now(),
            });
            await db.collection('ny_outreach_log').add({
                dispensaryName: draft.dispensaryName,
                email: null,
                contactFormUrl: draft.contactFormUrl || null,
                templateId: draft.templateId,
                emailSent: false,
                status: 'form_submitted',
                timestamp: Date.now(),
                createdAt: Date.now(),
                sentVia: 'contact_form',
                approvedBy: user.uid,
            });
            return { success: true };
        }

        // ── Email track: send via Gmail (userId routes to Gmail, Mailjet fallback) ──
        const result = await sendGenericEmail({
            to: draft.email as string,
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
                email: draft.email as string,
                city: draft.city,
                state: draft.state,
                posSystem: draft.posSystem,
                websiteUrl: draft.websiteUrl,
                source: 'ny-outreach',
            };
            await trackInCRM(lead, {
                leadId: draft.leadId,
                dispensaryName: draft.dispensaryName,
                email: draft.email as string,
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

/**
 * Bulk import ALL active NY licensed dispensaries — fast, no enrichment.
 * Saves all 471 official records in ~5s. Run "Enrich NY Leads" afterward
 * to add websites/emails in batches.
 */
export async function triggerBulkNYImport(): Promise<{
    success: boolean;
    total?: number;
    imported?: number;
    skipped?: number;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const result = await bulkImportAllNYLeads();
        return { success: true, ...result };
    } catch (err) {
        logger.error('[OutreachDashboard] Bulk NY import failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Enrich NY API leads (no email yet) with targeted web search to find website/email.
 * Processes 20 un-enriched leads per call — call repeatedly to enrich all.
 */
export async function triggerNYLeadEnrichment(): Promise<{
    success: boolean;
    enriched?: number;
    withEmail?: number;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const result = await enrichLeadBatch(20);
        return { success: true, enriched: result.enriched, withEmail: result.withEmail };
    } catch (err) {
        logger.error('[OutreachDashboard] Enrichment failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Import leads from NY State official cannabis license database.
 * 471 active adult-use retail dispensaries with contact names + addresses.
 * Enriches each with targeted web search to find website/email.
 *
 * @param offset Pagination offset — pass multiples of 20 to import batches
 */
export async function triggerNYAPIImport(offset: number = 0): Promise<{
    success: boolean;
    leadsFound?: number;
    withEmail?: number;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const leads = await importNYLicensedLeads(20, offset);
        const withEmail = leads.filter(l => l.email).length;
        return { success: true, leadsFound: leads.length, withEmail };
    } catch (err) {
        logger.error('[OutreachDashboard] NY API import failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

// =============================================================================
// CRM View — NY Outreach Leads
// =============================================================================

export interface NYOutreachCRMLead {
    id: string;
    dispensaryName: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    city: string;
    address: string | null;
    websiteUrl: string | null;
    licenseNumber: string | null;
    status: string;          // researched | draft_generated | contacted | responded | not_interested
    outreachSent: boolean;
    enriched: boolean;
    notes: string | null;
    createdAt: number;
    updatedAt: number;
    // Data quality fields
    dataQualityScore?: number;  // 0–100: % of key fields filled
    isDuplicate?: boolean;
    duplicateOf?: string | null;
}

/**
 * Fetch NY outreach leads for the CRM view.
 * @param filter 'all' | 'has_email' | 'contacted' | 'no_email' | 'responded'
 */
export async function getNYOutreachForCRM(filter: string = 'all', search: string = ''): Promise<{
    success: boolean;
    leads?: NYOutreachCRMLead[];
    total?: number;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();
        let query: FirebaseFirestore.Query = db.collection('ny_dispensary_leads')
            .orderBy('createdAt', 'desc');

        if (filter === 'has_email') {
            query = db.collection('ny_dispensary_leads')
                .where('email', '!=', null)
                .orderBy('email')
                .orderBy('createdAt', 'desc');
        } else if (filter === 'contacted') {
            query = db.collection('ny_dispensary_leads')
                .where('outreachSent', '==', true)
                .orderBy('createdAt', 'desc');
        } else if (filter === 'no_email') {
            query = db.collection('ny_dispensary_leads')
                .where('enriched', '==', true)
                .where('email', '==', null)
                .orderBy('createdAt', 'desc');
        } else if (filter === 'responded') {
            query = db.collection('ny_dispensary_leads')
                .where('status', '==', 'responded')
                .orderBy('createdAt', 'desc');
        }

        const snap = await query.limit(500).get();

        let leads: NYOutreachCRMLead[] = snap.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                dispensaryName: d.dispensaryName || 'Unknown',
                contactName: d.contactName || null,
                email: d.email || null,
                phone: d.phone || null,
                city: d.city || 'NY',
                address: d.address || null,
                websiteUrl: d.websiteUrl || null,
                licenseNumber: d.licenseNumber || null,
                status: d.status || 'researched',
                outreachSent: !!d.outreachSent,
                enriched: !!d.enriched,
                notes: d.notes || null,
                createdAt: d.createdAt || 0,
                updatedAt: d.updatedAt || 0,
                dataQualityScore: typeof d.dataQualityScore === 'number' ? d.dataQualityScore : undefined,
                isDuplicate: d.isDuplicate === true,
                duplicateOf: d.duplicateOf || null,
            };
        });

        // Client-side search filter
        if (search) {
            const q = search.toLowerCase();
            leads = leads.filter(l =>
                l.dispensaryName.toLowerCase().includes(q) ||
                (l.contactName?.toLowerCase().includes(q)) ||
                (l.city?.toLowerCase().includes(q)) ||
                (l.email?.toLowerCase().includes(q))
            );
        }

        return { success: true, leads, total: leads.length };
    } catch (err) {
        logger.error('[OutreachCRM] Failed to load leads', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Add a team note to a NY outreach lead.
 */
export async function addNYLeadNote(leadId: string, note: string): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();
        const ref = db.collection('ny_dispensary_leads').doc(leadId);
        const doc = await ref.get();
        if (!doc.exists) return { success: false, error: 'Lead not found' };

        const existing = doc.data()?.notes || '';
        const timestamp = new Date().toLocaleDateString();
        const newNote = existing ? `${existing}\n[${timestamp}] ${note}` : `[${timestamp}] ${note}`;

        await ref.update({ notes: newNote, updatedAt: Date.now() });
        return { success: true };
    } catch (err) {
        logger.error('[OutreachCRM] Add note failed', { leadId, error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Update the status of a NY outreach lead (team tracking).
 */
export async function markNYLeadStatus(
    leadId: string,
    status: 'responded' | 'not_interested' | 'researched'
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();
        await db.collection('ny_dispensary_leads').doc(leadId).update({
            status,
            updatedAt: Date.now(),
        });
        return { success: true };
    } catch (err) {
        logger.error('[OutreachCRM] Mark status failed', { leadId, error: String(err) });
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
            connected: !!data?.refreshTokenEncrypted,
            email: data?.email as string | undefined,
        };
    } catch {
        return { connected: false };
    }
}

// =============================================================================
// Apollo.io Credit Tracking
// =============================================================================

/**
 * Get current Apollo.io credit usage for the dashboard.
 * Free tier: 195 credits/month (cycle: Mar 03 – Apr 03, 2026).
 */
export async function getApolloCreditsAction(): Promise<{
    success: boolean;
    credits?: ApolloCreditStatus;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const credits = await getApolloCreditStatus();
        return { success: true, credits };
    } catch (err) {
        logger.error('[OutreachDashboard] Failed to load Apollo credits', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

// =============================================================================
// Super User Status Counts — CEO Dashboard Proactive Banner
// =============================================================================

export interface SuperUserStatusCounts {
    pendingOutreachDrafts: number;  // ny_outreach_drafts where status='draft'
    unenrichedLeads: number;        // ny_dispensary_leads where enriched=false
    pendingBlogDrafts: number;      // blog_posts where status='draft'
    leadQueueDepth: number;         // researched leads ready for outreach
    apolloCreditsRemaining: number; // Apollo.io credits left this cycle
}

// Matches BIZ_DEV_CACHE_DOC in executive-context-prewarm/route.ts
const BIZ_DEV_CACHE_DOC = 'biz_dev_context_today';
// 30-min TTL — dashboard data is more time-sensitive than exec context (4h)
const BIZ_DEV_CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Fast parallel Firestore counts powering the CEO dashboard proactive status banner.
 * Returns everything awaiting super user attention in a single call.
 * Designed to be called non-blocking on dashboard mount.
 *
 * Fast path: reads from biz_dev_context_today cache written by 7:45 AM prewarm cron.
 * Fallback: live Firestore queries (used if cache is stale or missing).
 */
export async function getSuperUserStatusCounts(): Promise<{
    success: boolean;
    counts?: SuperUserStatusCounts;
    error?: string;
}> {
    try {
        const user = await requireUser(['super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();

        // Fast path: try biz dev cache first (written by executive-context-prewarm cron at 7:45 AM)
        try {
            const cacheDoc = await db.collection('platform_cache').doc(BIZ_DEV_CACHE_DOC).get();
            if (cacheDoc.exists) {
                const d = cacheDoc.data()!;
                const ageMs = Date.now() - new Date(d.cachedAt as string).getTime();
                if (ageMs < BIZ_DEV_CACHE_TTL_MS) {
                    // Cache hit — still need blog drafts + Apollo credits (not in biz dev cache)
                    const [blogDraftsSnap, apolloCredits] = await Promise.all([
                        db.collection('blog_posts').where('status', '==', 'draft').count().get(),
                        getApolloCreditStatus(),
                    ]);
                    logger.info('[OutreachDashboard] Status counts served from cache', { ageMinutes: Math.round(ageMs / 60000) });
                    return {
                        success: true,
                        counts: {
                            pendingOutreachDrafts: (d.pendingDrafts as number) ?? 0,
                            unenrichedLeads: (d.unenrichedLeads as number) ?? 0,
                            pendingBlogDrafts: blogDraftsSnap.data().count,
                            leadQueueDepth: (d.queueDepth as number) ?? 0,
                            apolloCreditsRemaining: apolloCredits.remaining,
                        },
                    };
                }
            }
        } catch {
            // Cache miss or read error — fall through to live queries
        }

        // Fallback: live Firestore queries
        const [
            pendingDraftsSnap,
            unenrichedSnap,
            blogDraftsSnap,
            leadQueueSnap,
            apolloCredits,
        ] = await Promise.all([
            db.collection('ny_outreach_drafts').where('status', '==', 'draft').count().get(),
            db.collection('ny_dispensary_leads').where('enriched', '==', false).count().get(),
            db.collection('blog_posts').where('status', '==', 'draft').count().get(),
            db.collection('ny_dispensary_leads')
                .where('status', '==', 'researched')
                .where('outreachSent', '==', false)
                .count()
                .get(),
            getApolloCreditStatus(),
        ]);

        return {
            success: true,
            counts: {
                pendingOutreachDrafts: pendingDraftsSnap.data().count,
                unenrichedLeads: unenrichedSnap.data().count,
                pendingBlogDrafts: blogDraftsSnap.data().count,
                leadQueueDepth: leadQueueSnap.data().count,
                apolloCreditsRemaining: apolloCredits.remaining,
            },
        };
    } catch (err) {
        logger.error('[OutreachDashboard] Failed to load status counts', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

// =============================================================================
// NY Data Quality — Dedup, Scoring, Bulk Cleanup
// =============================================================================

/** Calculate data completeness score (0-100) for a lead document */
function calcDataQualityScore(d: Record<string, unknown>): number {
    const required = ['dispensaryName', 'email', 'phone', 'city', 'state', 'posSystem', 'websiteUrl'] as const;
    const filled = required.filter(f => d[f] != null && String(d[f]).trim() !== '').length;
    return Math.round((filled / required.length) * 100);
}

/**
 * Get NY lead data quality summary (counts for the quality banner)
 */
export async function getNYLeadDataQuality(): Promise<{
    success: boolean;
    totalLeads?: number;
    dupCount?: number;
    noEmailCount?: number;
    incompleteCount?: number;
    avgScore?: number;
    error?: string;
}> {
    try {
        await requireUser(['super_user']);
        const db = getAdminFirestore();
        const snap = await db.collection('ny_dispensary_leads').get();

        const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));

        // Count dupes: group by email (non-null) and by dispensaryName+city
        const emailGroups = new Map<string, string[]>();
        const nameGroups = new Map<string, string[]>();
        for (const { id, data } of docs) {
            const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
            if (email) {
                const existing = emailGroups.get(email) || [];
                existing.push(id);
                emailGroups.set(email, existing);
            }
            const nameKey = `${String(data.dispensaryName || '').toLowerCase().trim()}|${String(data.city || '').toLowerCase().trim()}`;
            if (nameKey !== '|') {
                const existing = nameGroups.get(nameKey) || [];
                existing.push(id);
                nameGroups.set(nameKey, existing);
            }
        }

        const dupIds = new Set<string>();
        for (const ids of emailGroups.values()) {
            if (ids.length > 1) ids.slice(1).forEach(id => dupIds.add(id));
        }
        for (const ids of nameGroups.values()) {
            if (ids.length > 1) ids.slice(1).forEach(id => dupIds.add(id));
        }

        const scores = docs.map(({ data }) => calcDataQualityScore(data as Record<string, unknown>));
        const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const noEmailCount = docs.filter(({ data }) => !data.email).length;
        const incompleteCount = scores.filter(s => s < 60).length;

        return {
            success: true,
            totalLeads: docs.length,
            dupCount: dupIds.size,
            noEmailCount,
            incompleteCount,
            avgScore,
        };
    } catch (err) {
        logger.error('[DataQuality] Failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Detect duplicate NY leads and mark them with isDuplicate + duplicateOf fields.
 * Also writes dataQualityScore to ALL leads.
 * Keeps the "best" record (most filled fields) per group; marks the rest as duplicates.
 */
export async function deduplicateNYLeads(): Promise<{ success: boolean; marked?: number; scored?: number; error?: string }> {
    try {
        await requireUser(['super_user']);
        const db = getAdminFirestore();
        const snap = await db.collection('ny_dispensary_leads').get();

        const docs = snap.docs.map(d => ({ id: d.id, ref: d.ref, data: d.data() }));

        // Score all leads
        const scores = new Map<string, number>();
        for (const { id, data } of docs) {
            scores.set(id, calcDataQualityScore(data as Record<string, unknown>));
        }

        // Build dupe groups by email and by dispensaryName+city
        const emailGroups = new Map<string, { id: string; data: FirebaseFirestore.DocumentData }[]>();
        const nameGroups = new Map<string, { id: string; data: FirebaseFirestore.DocumentData }[]>();
        for (const { id, data } of docs) {
            const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
            if (email) {
                const g = emailGroups.get(email) || [];
                g.push({ id, data });
                emailGroups.set(email, g);
            }
            const nameKey = `${String(data.dispensaryName || '').toLowerCase().trim()}|${String(data.city || '').toLowerCase().trim()}`;
            if (nameKey !== '|') {
                const g = nameGroups.get(nameKey) || [];
                g.push({ id, data });
                nameGroups.set(nameKey, g);
            }
        }

        // For each group with >1 member: pick best (highest score), mark rest as dup
        const dupMap = new Map<string, string>(); // dupId → masterId
        const processGroup = (group: { id: string; data: FirebaseFirestore.DocumentData }[]) => {
            if (group.length <= 1) return;
            const sorted = [...group].sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
            const master = sorted[0];
            for (const dup of sorted.slice(1)) {
                if (!dupMap.has(dup.id)) dupMap.set(dup.id, master.id);
            }
        };
        for (const g of emailGroups.values()) processGroup(g);
        for (const g of nameGroups.values()) processGroup(g);

        // Write in batches of 500
        const BATCH_SIZE = 500;
        let marked = 0;
        let scored = 0;

        // Score updates for all docs
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const batch = db.batch();
            for (const { id, ref } of docs.slice(i, i + BATCH_SIZE)) {
                const isDuplicate = dupMap.has(id);
                const duplicateOf = dupMap.get(id) || null;
                batch.update(ref, {
                    dataQualityScore: scores.get(id) ?? 0,
                    isDuplicate,
                    duplicateOf,
                    dataQualityUpdatedAt: Date.now(),
                });
                if (isDuplicate) marked++;
                scored++;
            }
            await batch.commit();
        }

        logger.info('[DataQuality] Dedup complete', { marked, scored });
        return { success: true, marked, scored };
    } catch (err) {
        logger.error('[DataQuality] Dedup failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Bulk delete NY leads matching a filter.
 * 'duplicates' — isDuplicate == true
 * 'no_email'   — email == null (not enriched or enriched with no result)
 * 'incomplete' — dataQualityScore < 40 (very low completeness)
 */
export async function bulkDeleteNYLeads(
    filter: 'duplicates' | 'no_email' | 'incomplete'
): Promise<{ success: boolean; deleted?: number; error?: string }> {
    try {
        await requireUser(['super_user']);
        const db = getAdminFirestore();

        let snap: FirebaseFirestore.QuerySnapshot;
        if (filter === 'duplicates') {
            snap = await db.collection('ny_dispensary_leads').where('isDuplicate', '==', true).get();
        } else if (filter === 'no_email') {
            snap = await db.collection('ny_dispensary_leads').where('email', '==', null).get();
        } else {
            // incomplete: dataQualityScore < 40 — query for docs with score set
            snap = await db.collection('ny_dispensary_leads').where('dataQualityScore', '<', 40).get();
        }

        if (snap.empty) return { success: true, deleted: 0 };

        const BATCH_SIZE = 500;
        let deleted = 0;
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const batch = db.batch();
            docs.slice(i, i + BATCH_SIZE).forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            deleted += Math.min(BATCH_SIZE, docs.length - i);
        }

        logger.info('[DataQuality] Bulk delete complete', { filter, deleted });
        return { success: true, deleted };
    } catch (err) {
        logger.error('[DataQuality] Bulk delete failed', { filter, error: String(err) });
        return { success: false, error: String(err) };
    }
}
