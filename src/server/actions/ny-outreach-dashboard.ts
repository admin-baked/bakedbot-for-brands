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
import { logger } from '@/lib/logger';
import type { ApolloCreditStatus } from '@/server/services/ny-outreach/apollo-enrichment';
import type { OutreachEmailData } from '@/server/services/ny-outreach/email-templates';
import type { OutreachDraft, OutreachLead } from '@/server/services/ny-outreach/outreach-service';

// Re-export Apollo credit type for UI
export type { ApolloCreditStatus } from '@/server/services/ny-outreach/apollo-enrichment';

const DAILY_SEND_LIMIT = parseInt(process.env.NY_OUTREACH_DAILY_LIMIT || '5', 10);

// Re-export for the UI
export type { OutreachDraft } from '@/server/services/ny-outreach/outreach-service';

type DashboardStats = {
    totalSent: number;
    totalFailed: number;
    totalBadEmails: number;
    totalPending: number;
    recentResults: Array<{
        leadId: string;
        dispensaryName: string;
        email: string;
        templateId: string;
        emailVerified: boolean;
        verificationResult?: string;
        emailSent: boolean;
        sendError?: string;
        timestamp: number;
    }>;
};

const EMPTY_OUTREACH_STATS: DashboardStats = {
    totalSent: 0,
    totalFailed: 0,
    totalBadEmails: 0,
    totalPending: 0,
    recentResults: [],
};

async function loadOutreachStats(since?: number): Promise<DashboardStats> {
    const { getOutreachStats } = await import('@/server/services/ny-outreach/outreach-read-model');
    return getOutreachStats(since);
}

function getOptionalTrimmedString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function getNullableTrimmedString(value: unknown): string | null {
    return getOptionalTrimmedString(value) ?? null;
}

function getDisplayString(value: unknown, fallback: string): string {
    return getOptionalTrimmedString(value) ?? fallback;
}

function toMillisOrZero(value: unknown): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    if (typeof (value as { toDate?: unknown }).toDate === 'function') {
        try {
            return (value as { toDate(): Date }).toDate().getTime();
        } catch {
            return 0;
        }
    }
    return 0;
}

function isMissingIndexError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const code = 'code' in error ? (error as { code?: unknown }).code : undefined;
    const message = 'message' in error ? String((error as { message?: unknown }).message) : String(error);

    return code === 9 || message.includes('FAILED_PRECONDITION') || message.includes('requires an index');
}

async function getCountWithFallback(
    query: FirebaseFirestore.Query,
    logLabel: string
): Promise<number> {
    try {
        const countSnapshot = await query.count().get();
        return countSnapshot.data().count;
    } catch (error) {
        if (!isMissingIndexError(error)) {
            throw error;
        }

        logger.warn(`[OutreachDashboard] Missing Firestore index, falling back to document scan for ${logLabel}`, {
            error: String(error),
        });
        const snapshot = await query.get();
        return snapshot.size;
    }
}

async function getSentTodayCount(db: FirebaseFirestore.Firestore): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const baseQuery = db.collection('ny_outreach_log')
        .where('timestamp', '>=', todayStart.getTime());

    try {
        const countSnapshot = await baseQuery
            .where('emailSent', '==', true)
            .count()
            .get();
        return countSnapshot.data().count;
    } catch (error) {
        if (!isMissingIndexError(error)) {
            throw error;
        }

        logger.warn('[OutreachDashboard] Missing Firestore index, falling back to client-side sent-today count', {
            error: String(error),
        });

        const snapshot = await baseQuery.get();
        return snapshot.docs.reduce((count, doc) => count + (doc.data().emailSent === true ? 1 : 0), 0);
    }
}

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
        stats: DashboardStats;
        queueDepth: number;
        queueLeads: Array<{
            id: string;
            dispensaryName: string;
            email?: string;
            city: string;
            state: string;
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
            state: string;
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

        const queueQuery = db.collection('ny_dispensary_leads')
            .where('status', '==', 'researched')
            .where('outreachSent', '==', false);
        const pendingDraftsQuery = db.collection('ny_outreach_drafts')
            .where('status', '==', 'draft');

        const results = await Promise.allSettled([
            loadOutreachStats(Date.now() - 24 * 60 * 60 * 1000),
            getCountWithFallback(queueQuery, 'queueDepth'),
            queueQuery
                .orderBy('createdAt', 'asc')
                .limit(20)
                .get()
                .catch(async (error) => {
                    if (!isMissingIndexError(error)) {
                        throw error;
                    }

                    logger.warn('[OutreachDashboard] Missing Firestore index, falling back to unsorted queue preview', {
                        error: String(error),
                    });

                    const fallbackSnapshot = await queueQuery.limit(20).get();
                    const sortedDocs = [...fallbackSnapshot.docs].sort(
                        (left, right) =>
                            toMillisOrZero(left.data().createdAt ?? left.data().researchedAt) -
                            toMillisOrZero(right.data().createdAt ?? right.data().researchedAt)
                    );

                    return { docs: sortedDocs } as Pick<FirebaseFirestore.QuerySnapshot, 'docs'>;
                }),
            db.collection('crm_outreach_contacts')
                .orderBy('lastOutreachAt', 'desc')
                .limit(50)
                .get(),
            getSentTodayCount(db),
            getCountWithFallback(pendingDraftsQuery, 'pendingDrafts'),
        ]);

        const partialFailures = results.flatMap((result, index) => {
            if (result.status !== 'rejected') {
                return [];
            }

            return [{
                index,
                error: String(result.reason),
            }];
        });

        if (partialFailures.length > 0) {
            logger.warn('[OutreachDashboard] Loaded with partial data', {
                partialFailures,
                userId: user.uid,
            });
        }

        const stats = results[0].status === 'fulfilled' ? results[0].value : EMPTY_OUTREACH_STATS;
        const queueDepth = results[1].status === 'fulfilled' ? results[1].value : 0;
        const leadsDocs = results[2].status === 'fulfilled' ? results[2].value.docs : [];
        const crmDocs = results[3].status === 'fulfilled' ? results[3].value.docs : [];
        const sentToday = results[4].status === 'fulfilled' ? results[4].value : 0;
        const pendingDrafts = results[5].status === 'fulfilled' ? results[5].value : 0;

        const queueLeads = leadsDocs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                dispensaryName: getDisplayString(d.dispensaryName, 'Unknown'),
                email: getOptionalTrimmedString(d.email),
                city: getDisplayString(d.city, 'Unknown City'),
                state: getDisplayString(d.state, 'NY'),
                contactFormUrl: getOptionalTrimmedString(d.contactFormUrl),
                source: getDisplayString(d.source, 'research'),
                createdAt: toMillisOrZero(d.createdAt) || toMillisOrZero(d.researchedAt) || Date.now(),
            };
        });

        const crmContacts = crmDocs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                dispensaryName: getDisplayString(d.dispensaryName, 'Unknown'),
                email: getDisplayString(d.email, ''),
                contactName: getOptionalTrimmedString(d.contactName),
                city: getDisplayString(d.city, 'Unknown City'),
                state: getDisplayString(d.state, 'NY'),
                status: getDisplayString(d.status, 'unknown'),
                outreachCount: typeof d.outreachCount === 'number' ? d.outreachCount : 0,
                lastOutreachAt: toMillisOrZero(d.lastOutreachAt),
                lastTemplateId: getDisplayString(d.lastTemplateId, ''),
            };
        });

        return {
            success: true,
            data: {
                stats,
                queueDepth,
                queueLeads,
                crmContacts,
                dailyLimit: DAILY_SEND_LIMIT,
                sentToday,
                pendingDrafts,
            },
        };
    } catch (err) {
        try {
            await logger.error('[OutreachDashboard] Failed to load data', { error: String(err) });
        } catch {
            console.error('[OutreachDashboard] Failed to load data (logger also failed):', err);
        }
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
        const [{ generateOutreachEmails }, { verifyEmail }] = await Promise.all([
            import('@/server/services/ny-outreach/email-templates'),
            import('@/server/services/email-verification'),
        ]);

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
        const emailLeads = allLeads
            .filter(lead => getOptionalTrimmedString(lead.email))
            .slice(0, DAILY_SEND_LIMIT);
        const formLeads = allLeads
            .filter(lead => !getOptionalTrimmedString(lead.email) && getOptionalTrimmedString(lead.contactFormUrl))
            .slice(0, DAILY_SEND_LIMIT); // separate quota for form track

        if (emailLeads.length === 0 && formLeads.length === 0) {
            return { success: true, draftsCreated: 0 };
        }

        let draftsCreated = 0;

        // --- Track A: email drafts ---
        for (const lead of emailLeads) {
            const data = lead;
            const email = getOptionalTrimmedString(data.email);
            if (!email) continue;

            const dispensaryName = getDisplayString(data.dispensaryName, 'Unknown');
            const contactName = getOptionalTrimmedString(data.contactName);
            const city = getDisplayString(data.city, 'Unknown City');
            const state = getDisplayString(data.state, 'NY');
            const posSystem = getOptionalTrimmedString(data.posSystem);
            const websiteUrl = getOptionalTrimmedString(data.websiteUrl);
            const templateId = selectTemplate({ posSystem });
            const emailData: OutreachEmailData = {
                dispensaryName,
                contactName,
                city,
                state,
                posSystem,
            };

            const templates = generateOutreachEmails(emailData);
            const template = templates.find(t => t.id === templateId);
            if (!template) continue;

            // Verify email
            let emailVerified = false;
            let verificationResult = 'pending';
            try {
                const v = await verifyEmail({ email });
                emailVerified = v.safe_to_send;
                verificationResult = `${v.result}: ${v.reason}`;
            } catch {
                emailVerified = true;
                verificationResult = 'service_unavailable';
            }

            await db.collection('ny_outreach_drafts').add({
                leadId: lead.id,
                outreachType: 'email',
                dispensaryName,
                contactName: contactName ?? null,
                email,
                city,
                state,
                posSystem: posSystem ?? null,
                websiteUrl: websiteUrl ?? null,
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
            const contactFormUrl = getOptionalTrimmedString(data.contactFormUrl);
            if (!contactFormUrl) continue;

            const dispensaryName = getDisplayString(data.dispensaryName, 'Unknown');
            const contactName = getOptionalTrimmedString(data.contactName);
            const city = getDisplayString(data.city, 'Unknown City');
            const state = getDisplayString(data.state, 'NY');
            const posSystem = getOptionalTrimmedString(data.posSystem);
            const websiteUrl = getOptionalTrimmedString(data.websiteUrl);
            const emailData: OutreachEmailData = {
                dispensaryName,
                contactName,
                city,
                state,
                posSystem,
            };
            const templates = generateOutreachEmails(emailData);
            const template = templates[0]; // use first template for form messages
            if (!template) continue;

            await db.collection('ny_outreach_drafts').add({
                leadId: lead.id,
                outreachType: 'form',
                dispensaryName,
                contactName: contactName ?? null,
                email: null,
                contactFormUrl,
                city,
                state,
                posSystem: posSystem ?? null,
                websiteUrl: websiteUrl ?? null,
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
        let snap: FirebaseFirestore.QuerySnapshot | { docs: FirebaseFirestore.QueryDocumentSnapshot[] };

        if (status) {
            const statusQuery = db.collection('ny_outreach_drafts')
                .where('status', '==', status);

            try {
                snap = await statusQuery
                    .orderBy('createdAt', 'desc')
                    .limit(50)
                    .get();
            } catch (error) {
                if (!isMissingIndexError(error)) {
                    throw error;
                }

                logger.warn('[OutreachDashboard] Missing Firestore index, falling back to client-side draft sort', {
                    error: String(error),
                    status,
                });

                const fallbackSnapshot = await statusQuery.limit(50).get();
                snap = {
                    docs: [...fallbackSnapshot.docs].sort((left, right) => {
                        const leftCreatedAt = typeof left.data().createdAt === 'number' ? left.data().createdAt : 0;
                        const rightCreatedAt = typeof right.data().createdAt === 'number' ? right.data().createdAt : 0;
                        return rightCreatedAt - leftCreatedAt;
                    }),
                };
            }
        } else {
            snap = await db.collection('ny_outreach_drafts')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
        }

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
        const [{ sendGenericEmail }, { trackInCRM }] = await Promise.all([
            import('@/lib/email/dispatcher'),
            import('@/server/services/ny-outreach/outreach-service'),
        ]);

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
        const { sendTestOutreachBatch } = await import('@/server/services/ny-outreach/outreach-service');

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
        const { researchNewLeads } = await import('@/server/services/ny-outreach/contact-research');

        const leads = await researchNewLeads(10);
        return { success: true, leadsFound: leads.length };
    } catch (err) {
        logger.error('[OutreachDashboard] Contact research failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

export async function triggerCRMLeadSync(): Promise<{
    success: boolean;
    created?: number;
    updated?: number;
    skipped?: number;
    states?: string[];
    error?: string;
}> {
    try {
        await requireUser(['super_user']);
        const { syncCRMDispensariesToOutreachQueue } = await import('@/server/services/ny-outreach/crm-queue-sync');

        const result = await syncCRMDispensariesToOutreachQueue({ limit: 30 });

        return {
            success: true,
            created: result.created,
            updated: result.updated,
            skipped: result.skipped,
            states: result.states,
        };
    } catch (err) {
        logger.error('[OutreachDashboard] CRM lead sync failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Bulk import ALL active NY licensed dispensaries — fast, no enrichment.
 * Saves all 471 official records in ~5s. Run "Enrich Queue" afterward
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
        const { bulkImportAllNYLeads } = await import('@/server/services/ny-outreach/contact-research');

        const result = await bulkImportAllNYLeads();
        return { success: true, ...result };
    } catch (err) {
        logger.error('[OutreachDashboard] Bulk NY import failed', { error: String(err) });
        return { success: false, error: String(err) };
    }
}

/**
 * Enrich queue leads (including CRM-seeded records) with targeted web search.
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
        const { enrichLeadBatch } = await import('@/server/services/ny-outreach/lead-enrichment');

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
        const { importNYLicensedLeads } = await import('@/server/services/ny-outreach/contact-research');

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
                dispensaryName: getDisplayString(d.dispensaryName, 'Unknown'),
                contactName: getNullableTrimmedString(d.contactName),
                email: getNullableTrimmedString(d.email),
                phone: getNullableTrimmedString(d.phone),
                city: getDisplayString(d.city, 'NY'),
                address: getNullableTrimmedString(d.address),
                websiteUrl: getNullableTrimmedString(d.websiteUrl),
                licenseNumber: getNullableTrimmedString(d.licenseNumber),
                status: getDisplayString(d.status, 'researched'),
                outreachSent: !!d.outreachSent,
                enriched: !!d.enriched,
                notes: getNullableTrimmedString(d.notes),
                createdAt: toMillisOrZero(d.createdAt),
                updatedAt: toMillisOrZero(d.updatedAt),
                dataQualityScore: typeof d.dataQualityScore === 'number' ? d.dataQualityScore : undefined,
                isDuplicate: d.isDuplicate === true,
                duplicateOf: getNullableTrimmedString(d.duplicateOf),
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

        // Check existence of the encrypted token via Admin SDK — no decryption needed
        // to determine connection status. This avoids ENCRYPTION_KEY mismatches.
        const db = getAdminFirestore();
        const doc = await db
            .collection('users')
            .doc(user.uid)
            .collection('integrations')
            .doc('gmail')
            .get();

        const connected = doc.exists && !!(doc.data()?.refreshTokenEncrypted);
        return { connected, email: connected ? (user.email || undefined) : undefined };
    } catch (error) {
        try {
            await logger.warn('[OutreachDashboard] Failed to check Gmail connection', {
                error: String(error),
            });
        } catch { /* ignore logger failures */ }
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
        const { getApolloCreditStatus } = await import('@/server/services/ny-outreach/apollo-enrichment');

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
    glmPercentUsed?: number;        // GLM usage percentage (0-100)
    glmProvider?: 'glm' | 'anthropic';  // Current AI provider preference
    glmCycleEnd?: number;            // Timestamp when GLM cycle resets
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
        const [{ getApolloCreditStatus }, { getGLMUsageStatus }] = await Promise.all([
            import('@/server/services/ny-outreach/apollo-enrichment'),
            import('@/server/services/glm-usage'),
        ]);

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
                    // Also fetch GLM status (not cached, always live)
                    const glmStatus = await getGLMUsageStatus();

                    return {
                        success: true,
                        counts: {
                            pendingOutreachDrafts: (d.pendingDrafts as number) ?? 0,
                            unenrichedLeads: (d.unenrichedLeads as number) ?? 0,
                            pendingBlogDrafts: blogDraftsSnap.data().count,
                            leadQueueDepth: (d.queueDepth as number) ?? 0,
                            apolloCreditsRemaining: apolloCredits.remaining,
                            glmPercentUsed: glmStatus.percentUsed,
                            glmProvider: glmStatus.provider,
                            glmCycleEnd: glmStatus.cycleEnd,
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
            glmStatus,
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
            getGLMUsageStatus(),
        ]);

        return {
            success: true,
            counts: {
                pendingOutreachDrafts: pendingDraftsSnap.data().count,
                unenrichedLeads: unenrichedSnap.data().count,
                pendingBlogDrafts: blogDraftsSnap.data().count,
                leadQueueDepth: leadQueueSnap.data().count,
                apolloCreditsRemaining: apolloCredits.remaining,
                glmPercentUsed: glmStatus.percentUsed,
                glmProvider: glmStatus.provider,
                glmCycleEnd: glmStatus.cycleEnd,
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
