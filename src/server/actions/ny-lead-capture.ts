/**
 * NY Dispensary Lead Capture Server Actions
 *
 * Handles lead capture from NY-specific lead magnets:
 * - Free Competitive Landscape Report
 * - NY Founding Partner Program
 * - CAURD Tech Grant Playbook
 * - ROI Calculator
 * - Syracuse Price War Report
 *
 * Stores in Firestore `email_leads` collection with NY-specific tags.
 */

'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface NYLeadCaptureRequest {
    email: string;
    dispensaryName: string;
    contactName?: string;
    phone?: string;
    location?: string;
    posSystem?: string;
    source: 'competitive-report' | 'founding-partner' | 'caurd-grant' | 'roi-calculator' | 'price-war';
    emailConsent: boolean;
    smsConsent?: boolean;
    metadata?: Record<string, unknown>;
}

export interface NYLeadResult {
    success: boolean;
    leadId?: string;
    error?: string;
}

export async function captureNYLead(request: NYLeadCaptureRequest): Promise<NYLeadResult> {
    try {
        if (!request.email?.trim()) {
            return { success: false, error: 'Email is required' };
        }
        if (!request.dispensaryName?.trim()) {
            return { success: false, error: 'Dispensary name is required' };
        }

        const now = Date.now();
        const db = getAdminFirestore();

        // Check for existing lead with same email + source
        const existingQuery = await db.collection('email_leads')
            .where('email', '==', request.email.trim().toLowerCase())
            .where('source', '==', `ny-${request.source}`)
            .limit(1)
            .get();

        const leadData = {
            email: request.email.trim().toLowerCase(),
            dispensaryName: request.dispensaryName.trim(),
            contactName: request.contactName?.trim() || null,
            phone: request.phone?.trim() || null,
            location: request.location?.trim() || null,
            posSystem: request.posSystem?.trim() || null,
            source: `ny-${request.source}`,
            emailConsent: request.emailConsent,
            smsConsent: request.smsConsent || false,
            state: 'NY',
            metadata: request.metadata || {},
            tags: [
                `ny-${request.source}`,
                'ny-expansion',
                request.emailConsent ? 'email-opt-in' : 'email-opt-out',
                request.smsConsent ? 'sms-opt-in' : 'sms-opt-out',
                request.posSystem ? `pos-${request.posSystem.toLowerCase()}` : 'pos-unknown',
            ].filter(Boolean),
            lastUpdated: now,
        };

        let leadId: string;

        if (!existingQuery.empty) {
            leadId = existingQuery.docs[0].id;
            await existingQuery.docs[0].ref.update(leadData);
            logger.info('[NYLeadCapture] Updated existing NY lead', {
                leadId,
                email: request.email,
                source: request.source,
            });
        } else {
            const docRef = await db.collection('email_leads').add({
                ...leadData,
                capturedAt: now,
                ageVerified: true,
                welcomeEmailSent: false,
                welcomeSmsSent: false,
            });
            leadId = docRef.id;
            logger.info('[NYLeadCapture] Created new NY lead', {
                leadId,
                email: request.email,
                dispensaryName: request.dispensaryName,
                source: request.source,
            });
        }

        return { success: true, leadId };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[NYLeadCapture] Error capturing NY lead', {
            error: err.message,
            source: request.source,
        });
        return { success: false, error: 'Failed to submit. Please try again.' };
    }
}

export async function getFoundingPartnerSpotsRemaining(): Promise<number> {
    try {
        const db = getAdminFirestore();
        const snapshot = await db.collection('email_leads')
            .where('source', '==', 'ny-founding-partner')
            .count()
            .get();
        const claimed = snapshot.data().count;
        return Math.max(0, 10 - claimed);
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[NYLeadCapture] Error getting founding partner spots', {
            error: err.message,
        });
        return 10; // Default to all spots available on error
    }
}
