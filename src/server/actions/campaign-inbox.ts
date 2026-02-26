'use server';

/**
 * Campaign Inbox Fast-Path Actions
 *
 * Phase 1 of the unified Campaign & Playbook NL system.
 * Allows dispensary/brand admins to send, schedule, or convert
 * an outreach_draft artifact to a playbook without leaving the inbox.
 *
 * Key decisions (per user sign-off):
 * - Email-first channel
 * - Self-approve: Deebo compliance pass = send (no second human approval)
 * - Fast path: bypasses the multi-step campaign wizard
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import type { UserRole } from '@/types/roles';
import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { deebo } from '@/server/agents/deebo';
import { resolveAudience, personalize } from '@/server/services/campaign-sender';
import type { OutreachDraftData } from '@/types/inbox';
import type { Campaign, CampaignContent } from '@/types/campaign';
import type { Playbook, PlaybookTrigger, PlaybookStep } from '@/types/playbook';

// ---------------------------------------------------------------------------
// Role gate — same as campaign management
// ---------------------------------------------------------------------------

const ALLOWED_ROLES: UserRole[] = ['dispensary_admin', 'brand_admin', 'super_user'];

function getOrgId(user: { orgId?: string; brandId?: string; currentOrgId?: string; uid: string }): string {
    return user.orgId || user.brandId || user.currentOrgId || user.uid;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read an outreach_draft artifact from Firestore.
 * Throws if not found, unauthorized, or wrong type.
 */
async function loadOutreachArtifact(artifactId: string, orgId: string) {
    const db = getAdminFirestore();
    const doc = await db.collection('inbox_artifacts').doc(artifactId).get();
    if (!doc.exists) throw new Error('Artifact not found');

    const data = doc.data()!;
    if (data.orgId !== orgId) throw new Error('Unauthorized');
    if (data.type !== 'outreach_draft') throw new Error('Not an outreach draft');

    return { doc, data: data.data as OutreachDraftData, artifact: data };
}

/**
 * Patch the artifact's data field in-place (merges into data sub-object).
 */
async function patchArtifactData(artifactId: string, patch: Partial<OutreachDraftData>) {
    const db = getAdminFirestore();
    const doc = await db.collection('inbox_artifacts').doc(artifactId).get();
    if (!doc.exists) return;

    const existing = (doc.data()!.data ?? {}) as OutreachDraftData;
    await db.collection('inbox_artifacts').doc(artifactId).update({
        data: { ...existing, ...patch },
        updatedAt: new Date(),
    });
}

// ---------------------------------------------------------------------------
// Action 1: Send Campaign From Inbox (fast path)
// ---------------------------------------------------------------------------

export async function sendCampaignFromInbox(params: {
    artifactId: string;
    /** User-set campaign name shown in the campaigns list */
    campaignName?: string;
    /** If true, skip compliance block on 'warning' result (user override) */
    overrideWarning?: boolean;
}): Promise<{
    success: boolean;
    sent?: number;
    failed?: number;
    campaignId?: string;
    complianceStatus?: 'passed' | 'failed' | 'warning';
    complianceViolations?: string[];
    complianceSuggestions?: string[];
    error?: string;
}> {
    try {
        const user = await requireUser(ALLOWED_ROLES);
        const orgId = getOrgId(user);

        const { data } = await loadOutreachArtifact(params.artifactId, orgId);

        if (!data.body) {
            return { success: false, error: 'Draft has no body content.' };
        }

        // ── 1. Inline Deebo compliance check ────────────────────────────────
        const textToCheck = data.channel === 'email'
            ? `Subject: ${data.subject ?? ''}\n\n${data.body}`
            : data.body;

        const compliance = await deebo.checkContent('NY', data.channel, textToCheck);

        if (compliance.status === 'fail') {
            await patchArtifactData(params.artifactId, {
                complianceStatus: 'failed',
                complianceViolations: compliance.violations,
                complianceSuggestions: compliance.suggestions,
            });
            return {
                success: false,
                complianceStatus: 'failed',
                complianceViolations: compliance.violations,
                error: `Content failed compliance review. Fix violations before sending.`,
            };
        }

        if (compliance.status === 'warning' && !params.overrideWarning) {
            await patchArtifactData(params.artifactId, {
                complianceStatus: 'warning',
                complianceViolations: compliance.violations,
                complianceSuggestions: compliance.suggestions,
            });
            return {
                success: false,
                complianceStatus: 'warning',
                complianceViolations: compliance.violations,
                error: `Content has compliance warnings. Review and confirm to send anyway.`,
            };
        }

        // Mark checking → sending in artifact
        await patchArtifactData(params.artifactId, {
            complianceStatus: 'passed',
            sendStatus: 'sending',
        });

        // ── 2. Build a minimal Campaign object for resolveAudience() ────────
        const db = getAdminFirestore();
        const now = new Date();
        const campaignRef = db.collection('campaigns').doc();
        const campaignId = campaignRef.id;

        const emailContent: CampaignContent = {
            channel: 'email',
            subject: data.subject || 'Message from us',
            body: data.body,
            htmlBody: data.htmlBody || `<p>${data.body.replace(/\n/g, '<br>')}</p>`,
            complianceStatus: 'passed',
        };

        const campaign: Campaign = {
            id: campaignId,
            orgId,
            createdBy: user.uid,
            name: params.campaignName || `Inbox Campaign — ${now.toLocaleDateString()}`,
            goal: 'drive_sales',
            status: 'approved',
            channels: ['email'],
            audience: {
                type: data.targetSegments?.length ? 'segment' : 'all',
                segments: data.targetSegments?.length ? data.targetSegments : undefined,
                estimatedCount: data.estimatedRecipients ?? 0,
            },
            content: { email: emailContent },
            complianceStatus: 'passed',
            complianceReviewedAt: now,
            approvedAt: now,
            approvedBy: user.uid,
            createdAt: now,
            updatedAt: now,
        };

        // ── 3. Persist campaign document ────────────────────────────────────
        await campaignRef.set({ ...campaign, status: 'sending', sentAt: now });

        // ── 4. Resolve audience ─────────────────────────────────────────────
        const recipients = await resolveAudience(campaign);

        if (recipients.length === 0) {
            await campaignRef.update({ status: 'sent', completedAt: now });
            await patchArtifactData(params.artifactId, {
                sendStatus: 'sent',
                sentAt: now.toISOString(),
                recipientCount: 0,
                campaignId,
            });
            return { success: true, sent: 0, failed: 0, campaignId };
        }

        // ── 5. Fetch org name for personalization ────────────────────────────
        const tenantDoc = await db.collection('tenants').doc(orgId).get();
        const orgName = tenantDoc.data()?.name || tenantDoc.data()?.businessName || '';

        // ── 6. Send emails ──────────────────────────────────────────────────
        let sentCount = 0;
        let failedCount = 0;
        const recipientsRef = campaignRef.collection('recipients');
        const batch = db.batch();
        const commsRef = db.collection('customer_communications');

        for (const recipient of recipients) {
            if (data.channel === 'email' && !recipient.email) continue;

            const personalizedBody = personalize(emailContent.body, recipient, orgName);
            const personalizedHtml = personalize(
                emailContent.htmlBody ?? `<p>${emailContent.body.replace(/\n/g, '<br>')}</p>`,
                recipient,
                orgName,
            );
            const personalizedSubject = personalize(emailContent.subject ?? '', recipient, orgName);

            try {
                const result = await sendGenericEmail({
                    to: recipient.email,
                    name: recipient.firstName ? `${recipient.firstName} ${recipient.lastName ?? ''}`.trim() : undefined,
                    subject: personalizedSubject,
                    htmlBody: personalizedHtml,
                    textBody: personalizedBody,
                    orgId,
                    communicationType: 'campaign',
                });

                if (result.success) {
                    sentCount++;
                    const recipientRef = recipientsRef.doc();
                    batch.set(recipientRef, {
                        campaignId,
                        customerId: recipient.customerId,
                        email: recipient.email,
                        firstName: recipient.firstName,
                        segment: recipient.segment,
                        channel: 'email',
                        status: 'sent',
                        sentAt: now,
                    });
                    // Write dedup record
                    const commRef = commsRef.doc();
                    batch.set(commRef, {
                        orgId,
                        customerEmail: recipient.email,
                        customerId: recipient.customerId,
                        campaignId,
                        type: 'campaign',
                        channel: 'email',
                        sentAt: now,
                    });
                } else {
                    failedCount++;
                }
            } catch (err) {
                failedCount++;
                logger.error('[CAMPAIGN_INBOX] Send failed for recipient', {
                    email: recipient.email,
                    error: (err as Error).message,
                });
            }
        }

        await batch.commit();

        // ── 7. Finalize campaign doc ────────────────────────────────────────
        const performanceData = {
            totalRecipients: recipients.length,
            sent: sentCount,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: failedCount,
            unsubscribed: 0,
            revenue: 0,
            openRate: 0,
            clickRate: 0,
            bounceRate: sentCount > 0 ? failedCount / recipients.length : 0,
            conversionRate: 0,
            lastUpdated: now,
        };

        await campaignRef.update({
            status: 'sent',
            completedAt: now,
            'performance': performanceData,
        });

        // ── 8. Update artifact ──────────────────────────────────────────────
        await patchArtifactData(params.artifactId, {
            sendStatus: 'sent',
            sentAt: now.toISOString(),
            recipientCount: sentCount,
            campaignId,
        });

        logger.info('[CAMPAIGN_INBOX] Campaign sent from inbox', {
            campaignId,
            orgId,
            sent: sentCount,
            failed: failedCount,
        });

        return { success: true, sent: sentCount, failed: failedCount, campaignId };
    } catch (error) {
        logger.error('[CAMPAIGN_INBOX] sendCampaignFromInbox error', {
            error: (error as Error).message,
            artifactId: params.artifactId,
        });
        // Best-effort: revert artifact send state
        try {
            await patchArtifactData(params.artifactId, { sendStatus: 'failed' });
        } catch { /* ignore */ }
        return { success: false, error: (error as Error).message };
    }
}

// ---------------------------------------------------------------------------
// Action 2: Schedule Campaign From Inbox
// ---------------------------------------------------------------------------

export async function scheduleCampaignFromInbox(params: {
    artifactId: string;
    scheduledAt: string;  // ISO string
    campaignName?: string;
    overrideWarning?: boolean;
}): Promise<{
    success: boolean;
    campaignId?: string;
    complianceStatus?: 'passed' | 'failed' | 'warning';
    complianceViolations?: string[];
    error?: string;
}> {
    try {
        const user = await requireUser(ALLOWED_ROLES);
        const orgId = getOrgId(user);

        const { data } = await loadOutreachArtifact(params.artifactId, orgId);

        if (!data.body) {
            return { success: false, error: 'Draft has no body content.' };
        }

        const scheduledAt = new Date(params.scheduledAt);
        if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
            return { success: false, error: 'Scheduled time must be in the future.' };
        }

        // ── 1. Inline compliance check ───────────────────────────────────────
        const textToCheck = data.channel === 'email'
            ? `Subject: ${data.subject ?? ''}\n\n${data.body}`
            : data.body;

        const compliance = await deebo.checkContent('NY', data.channel, textToCheck);

        if (compliance.status === 'fail') {
            await patchArtifactData(params.artifactId, {
                complianceStatus: 'failed',
                complianceViolations: compliance.violations,
                complianceSuggestions: compliance.suggestions,
            });
            return {
                success: false,
                complianceStatus: 'failed',
                complianceViolations: compliance.violations,
                error: `Content failed compliance review. Fix violations before scheduling.`,
            };
        }

        if (compliance.status === 'warning' && !params.overrideWarning) {
            await patchArtifactData(params.artifactId, {
                complianceStatus: 'warning',
                complianceViolations: compliance.violations,
                complianceSuggestions: compliance.suggestions,
            });
            return {
                success: false,
                complianceStatus: 'warning',
                complianceViolations: compliance.violations,
                error: `Content has compliance warnings. Review and confirm to schedule anyway.`,
            };
        }

        // ── 2. Create scheduled campaign in Firestore ────────────────────────
        const db = getAdminFirestore();
        const now = new Date();
        const campaignRef = db.collection('campaigns').doc();
        const campaignId = campaignRef.id;

        const emailContent: CampaignContent = {
            channel: 'email',
            subject: data.subject || 'Message from us',
            body: data.body,
            htmlBody: data.htmlBody || `<p>${data.body.replace(/\n/g, '<br>')}</p>`,
            complianceStatus: 'passed',
        };

        await campaignRef.set({
            id: campaignId,
            orgId,
            createdBy: user.uid,
            name: params.campaignName || `Scheduled Campaign — ${scheduledAt.toLocaleDateString()}`,
            goal: 'drive_sales',
            status: 'scheduled',
            channels: ['email'],
            audience: {
                type: data.targetSegments?.length ? 'segment' : 'all',
                segments: data.targetSegments?.length ? data.targetSegments : undefined,
                estimatedCount: data.estimatedRecipients ?? 0,
            },
            content: { email: emailContent },
            complianceStatus: 'passed',
            complianceReviewedAt: now,
            approvedAt: now,
            approvedBy: user.uid,
            scheduledAt,
            createdAt: now,
            updatedAt: now,
        });

        // ── 3. Update artifact ───────────────────────────────────────────────
        await patchArtifactData(params.artifactId, {
            complianceStatus: 'passed',
            sendStatus: 'scheduled',
            scheduledAt: scheduledAt.toISOString(),
            campaignId,
        });

        logger.info('[CAMPAIGN_INBOX] Campaign scheduled from inbox', {
            campaignId,
            orgId,
            scheduledAt: scheduledAt.toISOString(),
        });

        return { success: true, campaignId };
    } catch (error) {
        logger.error('[CAMPAIGN_INBOX] scheduleCampaignFromInbox error', {
            error: (error as Error).message,
            artifactId: params.artifactId,
        });
        return { success: false, error: (error as Error).message };
    }
}

// ---------------------------------------------------------------------------
// Action 3: Convert Outreach Draft → Repeating Playbook
// ---------------------------------------------------------------------------

export async function convertOutreachToPlaybook(params: {
    artifactId: string;
    playbookName: string;
    /** Cron expression for the schedule, e.g. '0 10 * * 1' (Mondays 10am) */
    cronSchedule?: string;
    timezone?: string;
    description?: string;
}): Promise<{
    success: boolean;
    playbookId?: string;
    error?: string;
}> {
    try {
        const user = await requireUser(ALLOWED_ROLES);
        const orgId = getOrgId(user);

        const { data } = await loadOutreachArtifact(params.artifactId, orgId);

        if (!data.body) {
            return { success: false, error: 'Draft has no body content.' };
        }

        const db = getAdminFirestore();
        const now = new Date();
        const playbookRef = db.collection('playbooks').doc();
        const playbookId = playbookRef.id;

        const trigger: PlaybookTrigger = params.cronSchedule
            ? { type: 'schedule', cron: params.cronSchedule, timezone: params.timezone || 'America/New_York' }
            : { type: 'manual' };

        const step: PlaybookStep = {
            id: 'step_1',
            label: 'Send campaign email',
            action: 'send_email_campaign',
            agent: 'craig',
            params: {
                channel: data.channel,
                subject: data.subject || '',
                body: data.body,
                htmlBody: data.htmlBody || '',
                targetSegments: data.targetSegments || [],
            },
        };

        const playbook: Omit<Playbook, 'id'> = {
            name: params.playbookName,
            description: params.description || `Repeating campaign created from inbox draft`,
            status: 'draft',
            agent: 'craig',
            category: 'marketing',
            triggers: [trigger],
            steps: [step],
            ownerId: user.uid,
            isCustom: true,
            requiresApproval: false,
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            createdAt: now,
            updatedAt: now,
            createdBy: user.uid,
            orgId,
            version: 1,
        };

        await playbookRef.set({ id: playbookId, ...playbook });

        logger.info('[CAMPAIGN_INBOX] Outreach draft converted to playbook', {
            playbookId,
            orgId,
            cronSchedule: params.cronSchedule,
        });

        return { success: true, playbookId };
    } catch (error) {
        logger.error('[CAMPAIGN_INBOX] convertOutreachToPlaybook error', {
            error: (error as Error).message,
            artifactId: params.artifactId,
        });
        return { success: false, error: (error as Error).message };
    }
}
