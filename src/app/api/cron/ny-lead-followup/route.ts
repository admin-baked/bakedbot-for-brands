/**
 * NY Lead Follow-up Cron — 3-Touch Sequence
 *
 * Sends follow-up emails to contacted leads who haven't replied:
 *   Touch 2 (Day 4):  light check-in — "followup-t2" template
 *   Touch 3 (Day 9):  urgency/last touch — "followup-t3" founding partner angle
 *
 * Skips if:
 *   - Lead has status 'replied' or 'converted'
 *   - Lead already received this touch number
 *   - Lead opted out (unsubscribed)
 *
 * Logs every outcome to Marty's learning loop (agent_learning_log, category: outreach_followup).
 *
 * Cloud Scheduler:
 *   Name:     ny-lead-followup
 *   Schedule: 0 15 * * 1-5  (10 AM EST = 3 PM UTC, weekdays)
 *   URL:      /api/cron/ny-lead-followup
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { generateOutreachEmails, type OutreachEmailData } from '@/server/services/ny-outreach/email-templates';
import { executeOutreach, trackInCRM, type OutreachLead } from '@/server/services/ny-outreach/outreach-service';
import { logAgentLearning } from '@/server/services/agent-learning-loop';

export const dynamic = 'force-dynamic';

const DAILY_FOLLOWUP_LIMIT = parseInt(process.env.NY_FOLLOWUP_DAILY_LIMIT || '25', 10);

// Touch timing windows
const T2_MIN_DAYS = 3;
const T2_MAX_DAYS = 5;
const T3_MIN_DAYS = 8;
const T3_MAX_DAYS = 11;

const DAY_MS = 24 * 60 * 60 * 1000;

interface FollowupCandidate {
    id: string;
    dispensaryName: string;
    email: string;
    contactName?: string;
    city: string;
    state: string;
    posSystem?: string;
    websiteUrl?: string;
    source: string;
    sentAt: number;
    touchNumber: number; // last touch sent
}

async function getFollowupCandidates(limit: number): Promise<FollowupCandidate[]> {
    const db = getAdminFirestore();
    const now = Date.now();

    // Find leads contacted but not yet replied or converted.
    // Note: no orderBy to avoid composite index requirement; we sort in-memory below.
    const snap = await db.collection('ny_dispensary_leads')
        .where('status', '==', 'contacted')
        .where('outreachSent', '==', true)
        .limit(limit * 10) // over-fetch to filter by timing
        .get();

    const candidates: FollowupCandidate[] = [];

    for (const doc of snap.docs) {
        if (candidates.length >= limit) break;
        const data = doc.data();
        if (!data.email || !data.sentAt) continue;

        const touchNumber: number = data.touchNumber || 1;
        const sentAt: number = data.sentAt;
        const daysSinceSent = (now - sentAt) / DAY_MS;

        // Determine which touch is due
        const needsT2 = touchNumber === 1 && daysSinceSent >= T2_MIN_DAYS && daysSinceSent <= T2_MAX_DAYS;
        const needsT3 = touchNumber >= 1 && !data.t3SentAt && daysSinceSent >= T3_MIN_DAYS && daysSinceSent <= T3_MAX_DAYS;

        // For T2, skip if already sent
        if (needsT2 && data.t2SentAt) continue;
        if (!needsT2 && !needsT3) continue;

        candidates.push({
            id: doc.id,
            dispensaryName: data.dispensaryName || 'Unknown',
            email: data.email,
            contactName: data.contactName || undefined,
            city: data.city || 'Unknown City',
            state: data.state || 'NY',
            posSystem: data.posSystem || undefined,
            websiteUrl: data.websiteUrl || undefined,
            source: data.source || 'outreach',
            sentAt,
            touchNumber: needsT2 ? 2 : 3,
        });
    }

    // Sort oldest-first (matching the original orderBy sentAt ASC intent)
    candidates.sort((a, b) => a.sentAt - b.sentAt);
    return candidates;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'ny-lead-followup');
    if (authError) return authError;

    logger.info('[NYLeadFollowup] Starting follow-up run', { limit: DAILY_FOLLOWUP_LIMIT });

    try {
        const db = getAdminFirestore();
        const candidates = await getFollowupCandidates(DAILY_FOLLOWUP_LIMIT);

        if (candidates.length === 0) {
            logger.info('[NYLeadFollowup] No candidates due for follow-up');
            return NextResponse.json({ success: true, summary: { sent: 0, failed: 0, message: 'No follow-ups due today' } });
        }

        let sent = 0, failed = 0;
        const results: Array<{ dispensary: string; touch: number; action: 'sent' | 'failed' }> = [];

        for (const lead of candidates) {
            const templateId = lead.touchNumber === 2 ? 'followup-t2' : 'followup-t3';

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
                logger.warn('[NYLeadFollowup] Template not found', { templateId });
                failed++;
                continue;
            }

            try {
                const outreachLead: OutreachLead = {
                    dispensaryName: lead.dispensaryName,
                    contactName: lead.contactName,
                    email: lead.email,
                    city: lead.city,
                    state: lead.state,
                    posSystem: lead.posSystem,
                    websiteUrl: lead.websiteUrl,
                    source: lead.source,
                };

                const result = await executeOutreach(outreachLead, templateId, { skipVerification: true });
                await trackInCRM(outreachLead, result);

                if (result.emailSent) {
                    sent++;
                    const updateFields: Record<string, unknown> = {
                        touchNumber: lead.touchNumber,
                        updatedAt: Date.now(),
                    };
                    if (lead.touchNumber === 2) updateFields.t2SentAt = Date.now();
                    if (lead.touchNumber === 3) updateFields.t3SentAt = Date.now();

                    await db.collection('ny_dispensary_leads').doc(lead.id).update(updateFields);

                    results.push({ dispensary: lead.dispensaryName, touch: lead.touchNumber, action: 'sent' });

                    await logAgentLearning({
                        agentId: 'marty',
                        action: `followup_sent: T${lead.touchNumber} → ${lead.dispensaryName} (${lead.city}, ${lead.state})`,
                        result: 'success',
                        category: 'outreach_followup',
                        reason: `Touch ${lead.touchNumber} sent via ${templateId}`,
                        nextStep: lead.touchNumber === 2
                            ? 'Monitor for reply. Final touch at Day 9 if no response.'
                            : 'No further automated touches. Flag for manual outreach if high-value lead.',
                        metadata: { template: templateId, dispensary: lead.dispensaryName, city: lead.city, touchNumber: lead.touchNumber },
                    });

                } else {
                    failed++;
                    results.push({ dispensary: lead.dispensaryName, touch: lead.touchNumber, action: 'failed' });
                    await logAgentLearning({
                        agentId: 'marty',
                        action: `followup_failed: T${lead.touchNumber} → ${lead.dispensaryName}`,
                        result: 'failure',
                        category: 'outreach_followup',
                        reason: result.sendError || 'Send failed',
                        nextStep: 'Check if email is still valid. Lead may have been removed from list.',
                        metadata: { template: templateId, dispensary: lead.dispensaryName, touchNumber: lead.touchNumber, sendError: result.sendError || null },
                    });
                }

            } catch (err) {
                failed++;
                logger.error('[NYLeadFollowup] Send error', { leadId: lead.id, error: String(err) });
                results.push({ dispensary: lead.dispensaryName, touch: lead.touchNumber, action: 'failed' });
            }
        }

        logger.info('[NYLeadFollowup] Run complete', { sent, failed });

        return NextResponse.json({
            success: true,
            summary: {
                candidates: candidates.length,
                sent,
                failed,
                message: sent > 0 ? `Sent ${sent} follow-up emails` : 'No follow-ups sent',
            },
            results,
        });

    } catch (error) {
        logger.error('[NYLeadFollowup] Unexpected error', { error: String(error) });
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
