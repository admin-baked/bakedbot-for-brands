/**
 * NY Form Outreach Cron
 *
 * Contacts dispensaries that have a contact form URL but no email address.
 * Uses rtrvr browser automation (discovery.fillForm) to submit personalized
 * messages via their website's contact form.
 *
 * Filters out bad form URLs (cannabis.ny.gov, chamber sites — marked contactFormBad=true).
 * Only submits to actual dispensary website contact forms.
 *
 * Rate: 10/day (form submissions are slower and carry higher spam risk than email).
 * Logs every outcome to Marty's learning loop (category: outreach_form).
 *
 * Cloud Scheduler:
 *   Name:     ny-form-outreach
 *   Schedule: 0 16 * * 1-5  (11 AM EST = 4 PM UTC, weekdays)
 *   URL:      /api/cron/ny-form-outreach
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { fillForm } from '@/server/services/rtrvr/agent';
import { logAgentLearning } from '@/server/services/agent-learning-loop';

export const dynamic = 'force-dynamic';

const DAILY_FORM_LIMIT = parseInt(process.env.NY_FORM_OUTREACH_DAILY_LIMIT || '10', 10);

// Domains we skip — generic/government forms that aren't the dispensary's own
const SKIP_FORM_DOMAINS = [
    'cannabis.ny.gov',
    'ocm.ny.gov',
    '.gov',
    'greaterrochesterchamber',
    'chamber.com',
    'yelp.com',
    'google.com',
    'facebook.com',
    'leafly.com',
    'weedmaps.com',
    'dutchie.com',
];

function isValidDispensaryForm(url: string): boolean {
    const lower = url.toLowerCase();
    return !SKIP_FORM_DOMAINS.some(d => lower.includes(d));
}

function buildFormMessage(dispensaryName: string, contactName: string | undefined, city: string): string {
    const greeting = contactName ? `Hi ${contactName},` : `Hi there,`;
    return `${greeting}

I'm Martez, founder of BakedBot AI. I wanted to reach out directly to ${dispensaryName}.

I built an AI platform specifically for cannabis operators in ${city} — it handles competitor tracking, customer retention campaigns, compliance monitoring, and weekly reporting automatically.

We're live with Thrive Syracuse in NY, and I'm looking for a small group of dispensaries to partner with next.

If any of this sounds useful, I'd love to connect — even just a quick 10-minute call to see if there's a fit.

Best,
Martez
Founder, BakedBot AI
martez@bakedbot.ai
https://bakedbot.ai`;
}

interface FormLead {
    id: string;
    dispensaryName: string;
    contactFormUrl: string;
    contactName?: string;
    city: string;
    state: string;
}

async function getFormLeads(limit: number): Promise<FormLead[]> {
    const db = getAdminFirestore();

    // Fetch researched leads with contact forms but no email
    const snap = await db.collection('ny_dispensary_leads')
        .where('status', '==', 'researched')
        .where('outreachSent', '==', false)
        .orderBy('createdAt', 'asc')
        .limit(limit * 8) // over-fetch since many will be filtered out
        .get();

    const leads: FormLead[] = [];
    for (const doc of snap.docs) {
        if (leads.length >= limit) break;
        const data = doc.data();

        // Skip if has email (email runner handles those)
        if (data.email) continue;
        // Skip if no form URL
        if (!data.contactFormUrl) continue;
        // Skip bad forms
        if (data.contactFormBad === true) continue;
        if (!isValidDispensaryForm(data.contactFormUrl)) continue;

        leads.push({
            id: doc.id,
            dispensaryName: data.dispensaryName || 'Unknown Dispensary',
            contactFormUrl: data.contactFormUrl,
            contactName: data.contactName || undefined,
            city: data.city || 'Unknown City',
            state: data.state || 'NY',
        });
    }

    return leads;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'ny-form-outreach');
    if (authError) return authError;

    const limitOverride = request.nextUrl.searchParams.get('limit');
    const effectiveLimit = limitOverride ? Math.min(parseInt(limitOverride, 10), DAILY_FORM_LIMIT) : DAILY_FORM_LIMIT;

    logger.info('[NYFormOutreach] Starting form outreach run', { limit: effectiveLimit });

    try {
        const db = getAdminFirestore();
        const leads = await getFormLeads(effectiveLimit);

        if (leads.length === 0) {
            return NextResponse.json({ success: true, summary: { submitted: 0, failed: 0, message: 'No form leads ready' } });
        }

        let submitted = 0, failed = 0;
        const results: Array<{ dispensary: string; action: 'submitted' | 'failed'; reason?: string }> = [];

        for (const lead of leads) {
            const message = buildFormMessage(lead.dispensaryName, lead.contactName, lead.city);

            // Standard contact form field mapping — covers most dispensary WordPress/Webflow sites
            const formData: Record<string, string> = {
                name: 'Martez',
                'your-name': 'Martez',
                full_name: 'Martez',
                fullname: 'Martez',
                email: 'martez@bakedbot.ai',
                'your-email': 'martez@bakedbot.ai',
                email_address: 'martez@bakedbot.ai',
                subject: `Partnership inquiry — BakedBot AI`,
                message,
                comment: message,
                'your-message': message,
            };

            try {
                const result = await fillForm(lead.contactFormUrl, formData, 'Send');

                const success = result.success === true;

                if (success) {
                    submitted++;

                    await db.collection('ny_dispensary_leads').doc(lead.id).update({
                        status: 'form_submitted',
                        outreachSent: true,
                        formSubmittedAt: Date.now(),
                        outreachType: 'form',
                        updatedAt: Date.now(),
                    });

                    await db.collection('ny_outreach_log').add({
                        dispensaryName: lead.dispensaryName,
                        contactName: lead.contactName || null,
                        email: null,
                        contactFormUrl: lead.contactFormUrl,
                        city: lead.city,
                        state: lead.state,
                        outreachType: 'form',
                        templateId: 'contact-form-message',
                        emailSent: false,
                        formSubmitted: true,
                        status: 'submitted',
                        timestamp: Date.now(),
                        createdAt: Date.now(),
                    });

                    results.push({ dispensary: lead.dispensaryName, action: 'submitted' });

                    await logAgentLearning({
                        agentId: 'marty',
                        action: `form_submitted: contact form → ${lead.dispensaryName} (${lead.city}, ${lead.state})`,
                        result: 'success',
                        category: 'outreach_form',
                        reason: `Contact form submitted at ${lead.contactFormUrl}`,
                        nextStep: 'Monitor for email reply from dispensary. If no reply in 5 days, try email enrichment via Apollo.',
                        metadata: { dispensary: lead.dispensaryName, city: lead.city, formUrl: lead.contactFormUrl },
                    });

                } else {
                    failed++;
                    results.push({ dispensary: lead.dispensaryName, action: 'failed', reason: result.error || 'Form submission returned failure' });

                    await logAgentLearning({
                        agentId: 'marty',
                        action: `form_failed: ${lead.dispensaryName} at ${lead.contactFormUrl}`,
                        result: 'failure',
                        category: 'outreach_form',
                        reason: result.error || 'rtrvr could not fill or submit the form',
                        nextStep: 'Try direct email if we can find one via Apollo. Flag form URL as broken.',
                        metadata: { dispensary: lead.dispensaryName, formUrl: lead.contactFormUrl, error: result.error || null },
                    });

                    // Mark the form as broken so we don't retry
                    await db.collection('ny_dispensary_leads').doc(lead.id).update({
                        contactFormBad: true,
                        contactFormError: result.error || 'submission_failed',
                        updatedAt: Date.now(),
                    });
                }

            } catch (err) {
                failed++;
                logger.error('[NYFormOutreach] fillForm error', { leadId: lead.id, error: String(err) });
                results.push({ dispensary: lead.dispensaryName, action: 'failed', reason: String(err) });
            }

            // Delay between form submissions to avoid triggering rate limits
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        logger.info('[NYFormOutreach] Run complete', { submitted, failed });

        return NextResponse.json({
            success: true,
            summary: {
                candidates: leads.length,
                submitted,
                failed,
                message: submitted > 0 ? `Submitted ${submitted} contact forms` : 'No forms submitted',
            },
            results,
        });

    } catch (error) {
        logger.error('[NYFormOutreach] Unexpected error', { error: String(error) });
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
