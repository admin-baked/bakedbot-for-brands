/**
 * NY Outreach Runner Cron
 *
 * Daily automated outreach pipeline:
 * 1. Check if there are enough researched leads in the queue
 * 2. If below threshold, research new dispensaries via Jina web scraping
 * 3. Pick next N uncontacted leads (default 5/day for testing)
 * 4. Send personalized outreach via Mailjet
 * 5. Log results to Firestore + sync to Drive spreadsheet
 * 6. Track in CRM
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
import { executeOutreach, getOutreachStats } from '@/server/services/ny-outreach/outreach-service';
import { syncToDriverSpreadsheet } from '@/server/services/ny-outreach/lead-research';
import { researchNewLeads } from '@/server/services/ny-outreach/contact-research';
import type { OutreachLead, OutreachResult } from '@/server/services/ny-outreach/outreach-service';

export const dynamic = 'force-dynamic';

/** Daily send cap — set to 5 for testing phase */
const DAILY_SEND_LIMIT = parseInt(process.env.NY_OUTREACH_DAILY_LIMIT || '5', 10);

/** Minimum leads in queue before triggering research */
const MIN_LEAD_QUEUE = 10;

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

    // Check how many we've already sent today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySentSnap = await db.collection('ny_outreach_log')
        .where('timestamp', '>=', todayStart.getTime())
        .where('emailSent', '==', true)
        .get();
    const sentToday = todaySentSnap.size;

    if (sentToday >= limit) {
        logger.info('[NYOutreachRunner] Daily limit already reached', { sentToday, limit });
        return [];
    }

    const remaining = limit - sentToday;

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
                city: data.city || 'New York',
                state: data.state || 'NY',
                posSystem: data.posSystem || undefined,
                websiteUrl: data.websiteUrl || undefined,
                contactFormUrl: data.contactFormUrl || undefined,
                source: data.source || 'research',
            };
        })
        .filter((l): l is NonNullable<typeof l> => l !== null);
}

/**
 * Track outreach in CRM by creating/updating a record.
 */
async function trackInCRM(lead: OutreachLead, result: OutreachResult): Promise<void> {
    const db = getAdminFirestore();

    try {
        // Check if CRM contact exists for this email
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
        logger.warn('[NYOutreachRunner] CRM tracking failed (non-fatal)', {
            email: lead.email,
            error: String(err),
        });
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'ny-outreach-runner');
    if (authError) return authError;

    logger.info('[NYOutreachRunner] Starting daily outreach run', { limit: DAILY_SEND_LIMIT });

    try {
        const db = getAdminFirestore();

        // Step 1: Check lead queue depth
        const queueSnap = await db.collection('ny_dispensary_leads')
            .where('status', '==', 'researched')
            .where('outreachSent', '==', false)
            .count()
            .get();
        const queueDepth = queueSnap.data().count;

        logger.info('[NYOutreachRunner] Lead queue depth', { queueDepth, threshold: MIN_LEAD_QUEUE });

        // Step 2: Research new leads if queue is low
        let newLeadsResearched = 0;
        if (queueDepth < MIN_LEAD_QUEUE) {
            try {
                const researched = await researchNewLeads(10);
                newLeadsResearched = researched.length;
                logger.info('[NYOutreachRunner] Researched new leads', { count: newLeadsResearched });
            } catch (err) {
                logger.warn('[NYOutreachRunner] Lead research failed (continuing with existing queue)', {
                    error: String(err),
                });
            }
        }

        // Step 3: Get next batch of leads
        const leads = await getNextLeadBatch(DAILY_SEND_LIMIT);

        if (leads.length === 0) {
            logger.info('[NYOutreachRunner] No leads to contact (limit reached or queue empty)');
            return NextResponse.json({
                success: true,
                summary: {
                    leadsInQueue: queueDepth,
                    newLeadsResearched,
                    emailsSent: 0,
                    emailsFailed: 0,
                    dailyLimit: DAILY_SEND_LIMIT,
                    message: 'No leads to contact',
                },
            });
        }

        // Step 4: Execute outreach for each lead
        const results: OutreachResult[] = [];
        for (const lead of leads) {
            const templateId = selectTemplate(lead);
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

            try {
                const result = await executeOutreach(outreachLead, templateId);
                results.push(result);

                // Update lead status
                await db.collection('ny_dispensary_leads').doc(lead.id).update({
                    outreachSent: true,
                    outreachSentAt: Date.now(),
                    outreachTemplateId: templateId,
                    outreachResult: result.emailSent ? 'sent' : 'failed',
                    status: result.emailSent ? 'contacted' : 'outreach_failed',
                    updatedAt: Date.now(),
                });

                // Track in CRM
                await trackInCRM(outreachLead, result);

                // Small delay between sends to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                logger.error('[NYOutreachRunner] Outreach failed for lead', {
                    leadId: lead.id,
                    email: lead.email,
                    error: String(err),
                });
            }
        }

        // Step 5: Sync results to Drive spreadsheet
        try {
            await syncToDriverSpreadsheet();
        } catch (err) {
            logger.warn('[NYOutreachRunner] Drive sync failed (non-fatal)', { error: String(err) });
        }

        const sent = results.filter(r => r.emailSent).length;
        const failed = results.filter(r => !r.emailSent).length;

        // Step 6: Get updated stats
        const stats = await getOutreachStats();

        logger.info('[NYOutreachRunner] Daily outreach complete', {
            sent,
            failed,
            newLeadsResearched,
            totalSentToday: stats.totalSent,
        });

        return NextResponse.json({
            success: true,
            summary: {
                leadsInQueue: queueDepth + newLeadsResearched - leads.length,
                newLeadsResearched,
                emailsSent: sent,
                emailsFailed: failed,
                dailyLimit: DAILY_SEND_LIMIT,
                totalSentAllTime: stats.totalSent,
            },
            results: results.map(r => ({
                dispensary: r.dispensaryName,
                template: r.templateId,
                sent: r.emailSent,
                error: r.sendError || null,
            })),
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
