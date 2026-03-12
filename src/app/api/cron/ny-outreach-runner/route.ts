/**
 * Outreach Runner Cron
 *
 * Daily automated outreach pipeline (draft-first approval flow):
 * 1. Check if there are enough researched leads in the queue
 * 2. Seed NY / MI / IL dispensaries from CRM first and enrich the queue
 * 3. Fall back to legacy NY research only if the queue is still short
 * 4. Pick next N uncontacted leads (default 5/day for testing)
 * 5. Generate personalized email drafts (NOT send immediately)
 * 6. User reviews + approves drafts in CEO dashboard or Inbox
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
import { verifyEmail } from '@/server/services/email-verification';

export const dynamic = 'force-dynamic';

/** Daily send cap — set to 5 for testing phase */
const DAILY_SEND_LIMIT = parseInt(process.env.NY_OUTREACH_DAILY_LIMIT || '5', 10);

/** Minimum leads in queue before triggering research */
const MIN_LEAD_QUEUE = 10;
const CRM_SYNC_LIMIT = 30;
const ENRICH_BATCH_SIZE = 20;

/** Template selection based on lead characteristics */
function selectTemplate(lead: { posSystem?: string; contactFormUrl?: string; email?: string }): string {
    // Rotate through templates for variety
    const templates = [
        'competitive-report',  // Highest converting — lead with value
        'founding-partner',    // Exclusivity angle
        'direct-personal',     // Personal touch
        'social-proof',        // Thrive case study
        'behind-glass-demo',   // Live demo offer
    ];

    // POS-specific override
    if (lead.posSystem?.toLowerCase().includes('alleaves')) {
        return 'pos-integration';
    }
    if (lead.posSystem?.toLowerCase().includes('dutchie') || lead.posSystem?.toLowerCase().includes('treez')) {
        return 'pos-integration';
    }

    // Rotate based on time to get variety
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return templates[dayOfYear % templates.length];
}

/**
 * Get the next batch of leads to contact.
 * Picks leads from ny_dispensary_leads where:
 * - status = 'researched' (not yet contacted)
 * - has email
 * - not already sent outreach today
 */
async function getNextLeadBatch(limit: number): Promise<Array<{
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
    source: string;
}>> {
    const db = getAdminFirestore();

    // Check how many drafts we've already generated today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayDraftsSnap = await db.collection('ny_outreach_drafts')
        .where('createdAt', '>=', todayStart.getTime())
        .get();
    const draftsToday = todayDraftsSnap.size;

    if (draftsToday >= limit) {
        logger.info('[NYOutreachRunner] Daily draft limit already reached', { draftsToday, limit });
        return [];
    }

    const remaining = limit - draftsToday;

    // Get uncontacted leads with email
    const leadsSnap = await db.collection('ny_dispensary_leads')
        .where('status', '==', 'researched')
        .where('outreachSent', '==', false)
        .orderBy('createdAt', 'asc')
        .limit(remaining)
        .get();

    return leadsSnap.docs
        .map(doc => {
            const data = doc.data();
            if (!data.email) return null;
            return {
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
                source: data.source || 'research',
            };
        })
        .filter((l): l is NonNullable<typeof l> => l !== null);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'ny-outreach-runner');
    if (authError) return authError;

    logger.info('[NYOutreachRunner] Starting daily outreach run', { limit: DAILY_SEND_LIMIT });

    try {
        const db = getAdminFirestore();
        let crmSeedAttempted = false;

        // Step 1: Check lead queue depth
        const queueSnap = await db.collection('ny_dispensary_leads')
            .where('status', '==', 'researched')
            .where('outreachSent', '==', false)
            .count()
            .get();
        const queueDepth = queueSnap.data().count;

        logger.info('[NYOutreachRunner] Lead queue depth', { queueDepth, threshold: MIN_LEAD_QUEUE });

        // Step 2: Seed CRM leads first if queue is low
        let newLeadsResearched = 0;
        let crmSeeded = 0;
        let crmLeadRefreshes = 0;
        let enrichedLeads = 0;
        let enrichedWithEmail = 0;
        if (queueDepth < MIN_LEAD_QUEUE) {
            try {
                crmSeedAttempted = true;
                const crmSync = await syncCRMDispensariesToOutreachQueue({ limit: CRM_SYNC_LIMIT });
                crmSeeded += crmSync.created;
                crmLeadRefreshes += crmSync.updated;
                logger.info('[NYOutreachRunner] Seeded CRM leads into queue', {
                    created: crmSync.created,
                    updated: crmSync.updated,
                    states: crmSync.states,
                });
            } catch (err) {
                logger.warn('[NYOutreachRunner] CRM lead sync failed (continuing with existing queue)', {
                    error: String(err),
                });
            }

            try {
                const enrichment = await enrichLeadBatch(ENRICH_BATCH_SIZE);
                enrichedLeads += enrichment.enriched;
                enrichedWithEmail += enrichment.withEmail;
                logger.info('[NYOutreachRunner] Enriched queue after CRM sync', {
                    enriched: enrichment.enriched,
                    withEmail: enrichment.withEmail,
                });
            } catch (err) {
                logger.warn('[NYOutreachRunner] Queue enrichment failed after CRM sync', {
                    error: String(err),
                });
            }
        }

        // Step 3: Get next batch of leads
        let leads = await getNextLeadBatch(DAILY_SEND_LIMIT);

        if (leads.length === 0) {
            if (!crmSeedAttempted) {
                try {
                    crmSeedAttempted = true;
                    const crmSync = await syncCRMDispensariesToOutreachQueue({ limit: CRM_SYNC_LIMIT });
                    crmSeeded += crmSync.created;
                    crmLeadRefreshes += crmSync.updated;
                    logger.info('[NYOutreachRunner] Seeded CRM leads after empty actionable queue', {
                        created: crmSync.created,
                        updated: crmSync.updated,
                        states: crmSync.states,
                    });
                } catch (err) {
                    logger.warn('[NYOutreachRunner] CRM lead sync failed after empty actionable queue', {
                        error: String(err),
                    });
                }

                try {
                    const enrichment = await enrichLeadBatch(ENRICH_BATCH_SIZE);
                    enrichedLeads += enrichment.enriched;
                    enrichedWithEmail += enrichment.withEmail;
                    logger.info('[NYOutreachRunner] Enriched queue after empty actionable queue', {
                        enriched: enrichment.enriched,
                        withEmail: enrichment.withEmail,
                    });
                } catch (err) {
                    logger.warn('[NYOutreachRunner] Queue enrichment failed after empty actionable queue', {
                        error: String(err),
                    });
                }
            }

            try {
                const researched = await researchNewLeads(10);
                newLeadsResearched = researched.length;
                logger.info('[NYOutreachRunner] Researched legacy NY leads', { count: newLeadsResearched });
            } catch (err) {
                logger.warn('[NYOutreachRunner] Legacy NY lead research failed', {
                    error: String(err),
                });
            }

            if (newLeadsResearched > 0) {
                try {
                    const enrichment = await enrichLeadBatch(ENRICH_BATCH_SIZE);
                    enrichedLeads += enrichment.enriched;
                    enrichedWithEmail += enrichment.withEmail;
                    logger.info('[NYOutreachRunner] Enriched queue after legacy research', {
                        enriched: enrichment.enriched,
                        withEmail: enrichment.withEmail,
                    });
                } catch (err) {
                    logger.warn('[NYOutreachRunner] Queue enrichment failed after legacy research', {
                        error: String(err),
                    });
                }
            }

            leads = await getNextLeadBatch(DAILY_SEND_LIMIT);
        }

        if (leads.length === 0) {
            logger.info('[NYOutreachRunner] No leads to contact (limit reached or queue empty)');
            return NextResponse.json({
                success: true,
                summary: {
                    leadsInQueue: queueDepth + crmSeeded + newLeadsResearched,
                    crmSeeded,
                    crmLeadRefreshes,
                    newLeadsResearched,
                    enrichedLeads,
                    enrichedWithEmail,
                    draftsCreated: 0,
                    draftsFailed: 0,
                    dailyLimit: DAILY_SEND_LIMIT,
                    message: 'No leads to contact',
                },
            });
        }

        // Step 4: Generate drafts for each lead (NOT send)
        let draftsCreated = 0;
        let draftsFailed = 0;
        const draftResults: Array<{ dispensary: string; template: string; verified: boolean; error?: string }> = [];

        for (const lead of leads) {
            const templateId = selectTemplate(lead);
            const emailData: OutreachEmailData = {
                dispensaryName: lead.dispensaryName,
                contactName: lead.contactName,
                city: lead.city,
                state: lead.state,
                posSystem: lead.posSystem,
            };

            try {
                // Generate email content
                const templates = generateOutreachEmails(emailData);
                const template = templates.find(t => t.id === templateId);
                if (!template) {
                    logger.warn('[NYOutreachRunner] Template not found', { templateId });
                    draftsFailed++;
                    continue;
                }

                // Verify email (non-blocking — draft still created if verification fails)
                let emailVerified = false;
                let verificationResult = 'pending';
                try {
                    const verification = await verifyEmail({ email: lead.email });
                    emailVerified = verification.safe_to_send;
                    verificationResult = `${verification.result}: ${verification.reason}`;
                } catch {
                    emailVerified = true; // Assume OK if verification service is down
                    verificationResult = 'service_unavailable';
                }

                // Write draft to Firestore
                const draftDoc = {
                    leadId: lead.id,
                    dispensaryName: lead.dispensaryName,
                    contactName: lead.contactName || null,
                    email: lead.email,
                    city: lead.city,
                    state: lead.state,
                    posSystem: lead.posSystem || null,
                    websiteUrl: lead.websiteUrl || null,
                    templateId,
                    templateName: template.name,
                    subject: template.subject,
                    htmlBody: template.htmlBody,
                    textBody: template.textBody,
                    status: 'draft',
                    createdAt: Date.now(),
                    createdBy: 'cron',
                    emailVerified,
                    verificationResult,
                };

                await db.collection('ny_outreach_drafts').add(draftDoc);

                // Update lead status to draft_generated (NOT outreachSent)
                await db.collection('ny_dispensary_leads').doc(lead.id).update({
                    status: 'draft_generated',
                    draftGeneratedAt: Date.now(),
                    outreachTemplateId: templateId,
                    updatedAt: Date.now(),
                });

                draftsCreated++;
                draftResults.push({
                    dispensary: lead.dispensaryName,
                    template: templateId,
                    verified: emailVerified,
                });

                logger.info('[NYOutreachRunner] Draft created', {
                    leadId: lead.id,
                    dispensary: lead.dispensaryName,
                    template: templateId,
                    emailVerified,
                });
            } catch (err) {
                draftsFailed++;
                draftResults.push({
                    dispensary: lead.dispensaryName,
                    template: templateId,
                    verified: false,
                    error: String(err),
                });
                logger.error('[NYOutreachRunner] Draft generation failed for lead', {
                    leadId: lead.id,
                    email: lead.email,
                    error: String(err),
                });
            }
        }

        logger.info('[NYOutreachRunner] Daily draft generation complete', {
            draftsCreated,
            draftsFailed,
            crmSeeded,
            crmLeadRefreshes,
            newLeadsResearched,
            enrichedLeads,
            enrichedWithEmail,
        });

        return NextResponse.json({
            success: true,
            summary: {
                leadsInQueue: queueDepth + crmSeeded + newLeadsResearched - leads.length,
                crmSeeded,
                crmLeadRefreshes,
                newLeadsResearched,
                enrichedLeads,
                enrichedWithEmail,
                draftsCreated,
                draftsFailed,
                dailyLimit: DAILY_SEND_LIMIT,
                message: draftsCreated > 0
                    ? `Generated ${draftsCreated} drafts — review in CEO dashboard`
                    : 'No drafts generated',
            },
            results: draftResults,
        });
    } catch (error) {
        logger.error('[NYOutreachRunner] Unexpected error', { error: String(error) });
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
