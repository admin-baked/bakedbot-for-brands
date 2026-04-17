'use server';

/**
 * Agency Partner Lead Capture
 *
 * Captures agency partner applications and newsletter signups.
 * Enrolls leads into Craig's email campaign pipeline via platform-campaign service.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { upsertLeadAsCustomer, createAndSchedulePlatformCampaign } from '@/server/services/platform-campaign';
import { agencyWelcomeEmail } from '@/server/services/email-templates/agency';

export interface AgencyPartnerLeadInput {
    name: string;
    email: string;
    agencyName: string;
    website?: string;
    specialty: 'seo' | 'pos_operations' | 'marketing' | 'other';
    dispensaryClientCount: string;
}

export interface AgencyNewsletterInput {
    email: string;
}

export interface AgencyLeadResult {
    success: boolean;
    leadId?: string;
    error?: string;
}

export async function captureAgencyPartnerLead(input: AgencyPartnerLeadInput): Promise<AgencyLeadResult> {
    try {
        const email = input.email.toLowerCase().trim();
        if (!email || !input.name || !input.agencyName) {
            return { success: false, error: 'Name, email, and agency name are required' };
        }

        const db = getAdminFirestore();
        const now = Date.now();

        // Upsert to email_leads
        const leadId = `agency_${email.replace(/[^a-z0-9]/g, '_')}`;
        await db.collection('email_leads').doc(leadId).set({
            email,
            contactName: input.name.trim(),
            agencyName: input.agencyName.trim(),
            website: input.website?.trim() || null,
            specialty: input.specialty,
            dispensaryClientCount: input.dispensaryClientCount,
            source: 'agency-partner',
            emailConsent: true,
            smsConsent: false,
            tags: ['agency-partner', `specialty:${input.specialty}`, 'craig-nurture'],
            capturedAt: now,
            lastUpdated: now,
        }, { merge: true });

        // Upsert as customer so Craig's campaign-sender can resolve them
        const customerId = await upsertLeadAsCustomer({
            email,
            firstName: input.name.split(' ')[0],
            leadSource: 'agency-partner',
        });

        // Craig welcome campaign — send immediately (5 min from now for warmup)
        const welcome = agencyWelcomeEmail(input.name.split(' ')[0], input.agencyName);
        await createAndSchedulePlatformCampaign({
            name: `Agency Welcome — ${input.agencyName}`,
            description: 'Immediate welcome email for new agency partner applicant',
            goal: 'awareness',
            channels: ['email'],
            audience: {
                type: 'custom',
                customFilter: { customerIds: [customerId] },
                estimatedCount: 1,
            },
            email: welcome,
            scheduledAt: new Date(Date.now() + 5 * 60 * 1000),
            tags: ['agency-partner', 'welcome', 'craig'],
            createdByAgent: 'craig',
        });

        logger.info('[AgencyLeads] Agency partner lead captured', { leadId, customerId, agencyName: input.agencyName });
        return { success: true, leadId };
    } catch (e) {
        logger.error('[AgencyLeads] Failed to capture agency lead', { error: (e as Error).message });
        return { success: false, error: 'Something went wrong. Please try again.' };
    }
}

export async function captureAgencyNewsletterSignup(input: AgencyNewsletterInput): Promise<AgencyLeadResult> {
    try {
        const email = input.email.toLowerCase().trim();
        if (!email) return { success: false, error: 'Email is required' };

        const db = getAdminFirestore();
        const now = Date.now();

        const leadId = `agency_news_${email.replace(/[^a-z0-9]/g, '_')}`;
        await db.collection('email_leads').doc(leadId).set({
            email,
            source: 'agency-newsletter',
            emailConsent: true,
            smsConsent: false,
            tags: ['agency-newsletter', 'craig-nurture'],
            capturedAt: now,
            lastUpdated: now,
        }, { merge: true });

        // Upsert as customer for Craig targeting
        const customerId = await upsertLeadAsCustomer({
            email,
            leadSource: 'agency-newsletter',
        });

        // Light welcome email — no agency name for popup signups
        const welcome = agencyWelcomeEmail('there', 'your team');
        await createAndSchedulePlatformCampaign({
            name: `Agency Newsletter Welcome — ${email}`,
            description: 'Welcome email for agency newsletter popup signup',
            goal: 'awareness',
            channels: ['email'],
            audience: {
                type: 'custom',
                customFilter: { customerIds: [customerId] },
                estimatedCount: 1,
            },
            email: {
                ...welcome,
                subject: 'You\'re subscribed to the Cannabis Marketing Intel Brief 🌿',
            },
            scheduledAt: new Date(Date.now() + 5 * 60 * 1000),
            tags: ['agency-newsletter', 'welcome', 'craig'],
            createdByAgent: 'craig',
        });

        logger.info('[AgencyLeads] Newsletter signup captured', { leadId, customerId });
        return { success: true, leadId };
    } catch (e) {
        logger.error('[AgencyLeads] Newsletter signup failed', { error: (e as Error).message });
        return { success: false, error: 'Something went wrong. Please try again.' };
    }
}
