/**
 * Outreach Runner Cron — Auto-Send Mode
 *
 * Pipeline (auto-send with flagged-draft fallback):
 * 1. Check queue depth — seed + enrich from CRM if low
 * 2. Pick next N leads with emails (status=researched, outreachSent=false)
 * 3. Score each lead for confidence (contact name, city, POS, email verified)
 * 4. High-confidence (score ≥ 40): auto-send immediately
 * 5. Low-confidence (score < 40): write as flagged draft for manual review
 * 6. Log every outcome to Marty's learning loop (agent_learning_log)
 * 7. Update lead status: contacted (sent) or draft_flagged (needs review)
 *
 * Cloud Scheduler:
 *   Name:     ny-outreach-runner
 *   Schedule: 0 14 * * 1-5  (9 AM EST = 2 PM UTC, weekdays)
 *   URL:      /api/cron/ny-outreach-runner
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { researchNewLeads } from '@/server/services/ny-outreach/contact-research';
import { generateOutreachEmails, type OutreachEmailData } from '@/server/services/ny-outreach/email-templates';
import { enrichLeadBatch } from '@/server/services/ny-outreach/lead-enrichment';
import { syncCRMDispensariesToOutreachQueue } from '@/server/services/ny-outreach/crm-queue-sync';
import { executeOutreach, trackInCRM, type OutreachLead } from '@/server/services/ny-outreach/outreach-service';
import { logAgentLearning } from '@/server/services/agent-learning-loop';

export const dynamic = 'force-dynamic';

/** Daily send cap — default 25, override via env */
const DAILY_SEND_LIMIT = parseInt(process.env.NY_OUTREACH_DAILY_LIMIT || '25', 10);

const MIN_LEAD_QUEUE = 10;
const CRM_SYNC_LIMIT = 30;
const ENRICH_BATCH_SIZE = 20;

// ---------------------------------------------------------------------------
// Confidence scoring — determines auto-send vs flagged draft
// ---------------------------------------------------------------------------

interface LeadScore {
    score: number;
    autoSend: boolean;
    flags: string[];
}

function scoreLeadConfidence(lead: {
    email?: string;
    emailVerified?: boolean;
    contactName?: string;
    city?: string;
    posSystem?: string;
    source?: string;
}): LeadScore {
    let score = 0;
    const flags: string[] = [];

    if (!lead.email) return { score: 0, autoSend: false, flags: ['no_email'] };

    // Email presence is the baseline (required). Verification is a bonus.
    score += 20;
    if (lead.emailVerified) {
        score += 20;
    } else {
        flags.push('email_unverified');
    }

    if (lead.contactName) {
        score += 25;
    } else {
        flags.push('no_contact_name');
    }

    const cityClean = (lead.city || '').toLowerCase();
    if (cityClean && cityClean !== 'unknown city' && cityClean !== 'unknown') {
        score += 20;
    } else {
        flags.push('unknown_city');
    }

    if (lead.posSystem) {
        score += 15;
    }

    // Auto-send threshold: score ≥ 40 (email + at least one of: name, city, or verified)
    return { score, autoSend: score >= 40, flags };
}

// ---------------------------------------------------------------------------
// Template selection
// ---------------------------------------------------------------------------

const SEND_TEMPLATES = [
    'competitive-report',
    'founding-partner',
    'direct-personal',
    'social-proof',
    'behind-glass-demo',
];

function selectTemplate(lead: { posSystem?: string }): string {
    if (lead.posSystem?.toLowerCase().includes('alleaves') ||
        lead.posSystem?.toLowerCase().includes('dutchie') ||
        lead.posSystem?.toLowerCase().includes('treez')) {
        return 'pos-integration';
    }
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return SEND_TEMPLATES[dayOfYear % SEND_TEMPLATES.length];
}

// ---------------------------------------------------------------------------
// Lead queue — only leads with emails
// ---------------------------------------------------------------------------

interface QueuedLead {
    id: string;
    dispensaryName: string;
    email: string;
    contactName?: string;
    phone?: string;
    city: string;
    state: string;
    posSystem?: string;
    websiteUrl?: string;
    contactFormUrl?: string;
    emailVerified: boolean;
    source: string;
}

async function getNextLeadBatch(limit: number): Promise<QueuedLead[]> {
    const db = getAdminFirestore();

    // Check how many we've already processed today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySnap = await db.collection('ny_outreach_drafts')
        .where('createdAt', '>=', todayStart.getTime())
        .get();
    const processedToday = todaySnap.size;

    if (processedToday >= limit) {
        logger.info('[NYOutreachRunner] Daily limit already reached', { processedToday, limit });
        return [];
    }

    const remaining = limit - processedToday;

    // Fetch researched + unsent leads (larger batch so we can filter for email)
    const leadsSnap = await db.collection('ny_dispensary_leads')
        .where('status', '==', 'researched')
        .where('outreachSent', '==', false)
        .orderBy('createdAt', 'asc')
        .limit(remaining * 5) // over-fetch to account for leads without emails
        .get();

    const leads: QueuedLead[] = [];
    for (const doc of leadsSnap.docs) {
        if (leads.length >= remaining) break;
        const data = doc.data();
        if (!data.email) continue; // skip leads without emails — enrichment pipeline handles those
        leads.push({
            id: doc.id,
            dispensaryName: data.dispensaryName || 'Unknown Dispensary',
            email: data.email,
            contactName: data.contactName || undefined,
            phone: data.phone || undefined,
            city: data.city || 'Unknown City',
            state: data.state || 'NY',
            posSystem: data.posSystem || undefined,
            websiteUrl: data.websiteUrl || undefined,
            contactFormUrl: data.contactFormUrl || undefined,
            emailVerified: data.emailVerified === true,
            source: data.source || 'research',
        });
    }

    return leads;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'ny-outreach-runner');
    if (authError) return authError;

    logger.info('[NYOutreachRunner] Starting auto-send run', { limit: DAILY_SEND_LIMIT });

    try {
        const db = getAdminFirestore();
        let crmSeedAttempted = false;
        let crmSeeded = 0, crmLeadRefreshes = 0, enrichedLeads = 0, enrichedWithEmail = 0, newLeadsResearched = 0;

        // Check queue depth (leads with emails ready to send)
        const queueSnap = await db.collection('ny_dispensary_leads')
            .where('status', '==', 'researched')
            .where('outreachSent', '==', false)
            .count()
            .get();
        const queueDepth = queueSnap.data().count;

        logger.info('[NYOutreachRunner] Queue depth', { queueDepth, threshold: MIN_LEAD_QUEUE });

        // Seed + enrich if queue is low
        if (queueDepth < MIN_LEAD_QUEUE) {
            try {
                crmSeedAttempted = true;
                const crmSync = await syncCRMDispensariesToOutreachQueue({ limit: CRM_SYNC_LIMIT });
                crmSeeded += crmSync.created;
                crmLeadRefreshes += crmSync.updated;
            } catch (err) {
                logger.warn('[NYOutreachRunner] CRM seed failed', { error: String(err) });
            }
            try {
                const enrichment = await enrichLeadBatch(ENRICH_BATCH_SIZE);
                enrichedLeads += enrichment.enriched;
                enrichedWithEmail += enrichment.withEmail;
            } catch (err) {
                logger.warn('[NYOutreachRunner] Enrich failed', { error: String(err) });
            }
        }

        // Get next batch (only leads with emails)
        let leads = await getNextLeadBatch(DAILY_SEND_LIMIT);

        // If still empty after seeding, try legacy research
        if (leads.length === 0 && !crmSeedAttempted) {
            try {
                crmSeedAttempted = true;
                const crmSync = await syncCRMDispensariesToOutreachQueue({ limit: CRM_SYNC_LIMIT });
                crmSeeded += crmSync.created;
                crmLeadRefreshes += crmSync.updated;
            } catch (err) {
                logger.warn('[NYOutreachRunner] CRM seed (retry) failed', { error: String(err) });
            }
            try {
                const researched = await researchNewLeads(10);
                newLeadsResearched = researched.length;
            } catch (err) {
                logger.warn('[NYOutreachRunner] Legacy research failed', { error: String(err) });
            }
            try {
                const enrichment = await enrichLeadBatch(ENRICH_BATCH_SIZE);
                enrichedLeads += enrichment.enriched;
                enrichedWithEmail += enrichment.withEmail;
            } catch (err) {
                logger.warn('[NYOutreachRunner] Enrich (retry) failed', { error: String(err) });
            }
            leads = await getNextLeadBatch(DAILY_SEND_LIMIT);
        }

        if (leads.length === 0) {
            logger.info('[NYOutreachRunner] No leads with emails to process');
            return NextResponse.json({
                success: true,
                summary: { leadsInQueue: queueDepth, draftsCreated: 0, emailsSent: 0, flaggedDrafts: 0, message: 'No leads with emails in queue' },
            });
        }

        // Process each lead
        let emailsSent = 0, flaggedDrafts = 0, failures = 0;
        const results: Array<{ dispensary: string; template: string; action: 'sent' | 'flagged' | 'failed'; flags?: string[] }> = [];

        for (const lead of leads) {
            const templateId = selectTemplate(lead);
            const { score, autoSend, flags } = scoreLeadConfidence(lead);

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
                logger.warn('[NYOutreachRunner] Template not found', { templateId });
                failures++;
                continue;
            }

            if (autoSend) {
                // High-confidence: send immediately
                try {
                    const outreachLead: OutreachLead = {
                        dispensaryName: lead.dispensaryName,
                        contactName: lead.contactName,
                        email: lead.email,
                        phone: lead.phone,
                        city: lead.city,
                        state: lead.state,
                        posSystem: lead.posSystem,
                        websiteUrl: lead.websiteUrl,
                        contactFormUrl: lead.contactFormUrl,
                        source: lead.source,
                    };

                    const result = await executeOutreach(outreachLead, templateId, { skipVerification: lead.emailVerified });
                    await trackInCRM(outreachLead, result);

                    if (result.emailSent) {
                        emailsSent++;
                        // Mark lead as contacted
                        await db.collection('ny_dispensary_leads').doc(lead.id).update({
                            status: 'contacted',
                            outreachSent: true,
                            sentAt: Date.now(),
                            outreachTemplateId: templateId,
                            touchNumber: 1,
                            updatedAt: Date.now(),
                        });

                        // Write to drafts as audit trail with status=sent
                        await db.collection('ny_outreach_drafts').add({
                            leadId: lead.id,
                            dispensaryName: lead.dispensaryName,
                            contactName: lead.contactName || null,
                            email: lead.email,
                            city: lead.city,
                            state: lead.state,
                            posSystem: lead.posSystem || null,
                            templateId,
                            templateName: template.name,
                            subject: template.subject,
                            status: 'sent',
                            confidence: score,
                            flags,
                            touchNumber: 1,
                            createdAt: Date.now(),
                            sentAt: Date.now(),
                            createdBy: 'cron-auto',
                        });

                        results.push({ dispensary: lead.dispensaryName, template: templateId, action: 'sent' });

                        // Learning loop: log successful send
                        await logAgentLearning({
                            agentId: 'marty',
                            action: `outreach_sent: ${templateId} → ${lead.dispensaryName} (${lead.city}, ${lead.state})`,
                            result: 'success',
                            category: 'outreach',
                            reason: `${templateId} angle — confidence ${score}, touch 1`,
                            nextStep: 'Monitor for reply. Follow up at Day 4 if no response.',
                            metadata: { template: templateId, dispensary: lead.dispensaryName, city: lead.city, state: lead.state, posSystem: lead.posSystem || null, confidence: score, touchNumber: 1, flags },
                        });

                    } else {
                        failures++;
                        results.push({ dispensary: lead.dispensaryName, template: templateId, action: 'failed' });
                        await logAgentLearning({
                            agentId: 'marty',
                            action: `outreach_failed: ${templateId} → ${lead.dispensaryName}`,
                            result: 'failure',
                            category: 'outreach',
                            reason: result.sendError || 'Send failed',
                            nextStep: 'Check email validity. Try contact form if available.',
                            metadata: { template: templateId, dispensary: lead.dispensaryName, sendError: result.sendError || null },
                        });
                    }
                } catch (err) {
                    failures++;
                    logger.error('[NYOutreachRunner] Send failed', { leadId: lead.id, error: String(err) });
                    results.push({ dispensary: lead.dispensaryName, template: templateId, action: 'failed' });
                }

            } else {
                // Low-confidence: write flagged draft for manual review
                flaggedDrafts++;
                await db.collection('ny_outreach_drafts').add({
                    leadId: lead.id,
                    dispensaryName: lead.dispensaryName,
                    contactName: lead.contactName || null,
                    email: lead.email,
                    city: lead.city,
                    state: lead.state,
                    posSystem: lead.posSystem || null,
                    templateId,
                    templateName: template.name,
                    subject: template.subject,
                    htmlBody: template.htmlBody,
                    textBody: template.textBody,
                    status: 'draft',
                    confidence: score,
                    flags,
                    touchNumber: 1,
                    createdAt: Date.now(),
                    createdBy: 'cron-flagged',
                });

                await db.collection('ny_dispensary_leads').doc(lead.id).update({
                    status: 'draft_flagged',
                    draftGeneratedAt: Date.now(),
                    outreachTemplateId: templateId,
                    updatedAt: Date.now(),
                });

                results.push({ dispensary: lead.dispensaryName, template: templateId, action: 'flagged', flags });
            }
        }

        logger.info('[NYOutreachRunner] Run complete', { emailsSent, flaggedDrafts, failures, crmSeeded, enrichedLeads });

        return NextResponse.json({
            success: true,
            summary: {
                leadsInQueue: queueDepth + crmSeeded + newLeadsResearched - leads.length,
                crmSeeded,
                crmLeadRefreshes,
                newLeadsResearched,
                enrichedLeads,
                enrichedWithEmail,
                emailsSent,
                flaggedDrafts,
                failures,
                dailyLimit: DAILY_SEND_LIMIT,
                message: emailsSent > 0
                    ? `Sent ${emailsSent} emails. ${flaggedDrafts} flagged for review.`
                    : `${flaggedDrafts} drafts flagged for review — no auto-sends today`,
            },
            results,
        });

    } catch (error) {
        logger.error('[NYOutreachRunner] Unexpected error', { error: String(error) });
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
