/**
 * Email Lead Capture Server Actions
 *
 * Handles email/phone capture from age gates and other lead magnets.
 * Stores in Firestore and triggers Craig welcome email workflow.
 */

'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface CaptureEmailLeadRequest {
    email?: string;
    phone?: string;
    firstName?: string;
    emailConsent: boolean;
    smsConsent: boolean;
    brandId?: string;
    dispensaryId?: string;
    state?: string;
    source: string; // 'menu', 'demo-shop', 'homepage', 'chatbot', etc.
    ageVerified?: boolean;
    dateOfBirth?: string;
}

export interface EmailLead {
    id: string;
    email?: string;
    phone?: string;
    firstName?: string;
    emailConsent: boolean;
    smsConsent: boolean;
    brandId?: string;
    dispensaryId?: string;
    state?: string;
    source: string;
    ageVerified: boolean;
    dateOfBirth?: string;
    capturedAt: number;
    lastUpdated: number;
    welcomeEmailSent?: boolean;
    welcomeSmsSent?: boolean;
    tags: string[];
}

/**
 * Capture email lead from age gate or other source
 */
export async function captureEmailLead(request: CaptureEmailLeadRequest): Promise<{ success: boolean; leadId?: string; error?: string }> {
    try {
        // Validate input
        if (!request.email && !request.phone) {
            return { success: false, error: 'Email or phone required' };
        }

        if (request.email && request.emailConsent === false) {
            logger.warn('[EmailCapture] Email provided but consent not given', { email: request.email });
            // Still capture but don't send marketing emails
        }

        if (request.phone && request.smsConsent === false) {
            logger.warn('[EmailCapture] Phone provided but SMS consent not given', { phone: request.phone });
            // Still capture but don't send marketing SMS
        }

        const now = Date.now();

        // Create lead document
        const leadData: Omit<EmailLead, 'id'> = {
            email: request.email,
            phone: request.phone,
            firstName: request.firstName,
            emailConsent: request.emailConsent,
            smsConsent: request.smsConsent,
            brandId: request.brandId,
            dispensaryId: request.dispensaryId,
            state: request.state,
            source: request.source,
            ageVerified: request.ageVerified || false,
            dateOfBirth: request.dateOfBirth,
            capturedAt: now,
            lastUpdated: now,
            tags: [
                request.source,
                request.ageVerified ? 'age-verified' : 'not-verified',
                request.emailConsent ? 'email-opt-in' : 'email-opt-out',
                request.smsConsent ? 'sms-opt-in' : 'sms-opt-out',
            ],
        };

        // Check if lead already exists (by email or phone)
        const db = getAdminFirestore();
        let existingLead = null;
        if (request.email) {
            const emailQuery = await db.collection('email_leads')
                .where('email', '==', request.email)
                .limit(1)
                .get();

            if (!emailQuery.empty) {
                existingLead = emailQuery.docs[0];
            }
        }

        if (!existingLead && request.phone) {
            const phoneQuery = await db.collection('email_leads')
                .where('phone', '==', request.phone)
                .limit(1)
                .get();

            if (!phoneQuery.empty) {
                existingLead = phoneQuery.docs[0];
            }
        }

        let leadId: string;

        if (existingLead) {
            // Update existing lead
            leadId = existingLead.id;
            await existingLead.ref.update({
                ...leadData,
                lastUpdated: now,
            });

            logger.info('[EmailCapture] Updated existing lead', {
                leadId,
                email: request.email,
                phone: request.phone,
                source: request.source,
            });
        } else {
            // Create new lead
            const docRef = await db.collection('email_leads').add(leadData);
            leadId = docRef.id;

            logger.info('[EmailCapture] Created new lead', {
                leadId,
                email: request.email,
                phone: request.phone,
                source: request.source,
            });

            // Trigger welcome email via Craig (async, don't block)
            if (request.email && request.emailConsent) {
                triggerWelcomeEmail(leadId, request.email, request.firstName, request.brandId, request.dispensaryId)
                    .catch(err => {
                        logger.error('[EmailCapture] Failed to trigger welcome email', {
                            leadId,
                            email: request.email,
                            error: err.message,
                        });
                    });
            }

            // Trigger welcome SMS via Craig (async, don't block)
            if (request.phone && request.smsConsent) {
                triggerWelcomeSms(leadId, request.phone, request.firstName, request.brandId, request.dispensaryId)
                    .catch(err => {
                        logger.error('[EmailCapture] Failed to trigger welcome SMS', {
                            leadId,
                            phone: request.phone,
                            error: err.message,
                        });
                    });
            }
        }

        return { success: true, leadId };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[EmailCapture] Error capturing lead', {
            error: err.message,
            request,
        });

        return {
            success: false,
            error: err.message || 'Failed to capture lead',
        };
    }
}

/**
 * Trigger welcome email via Craig (marketer agent)
 */
async function triggerWelcomeEmail(
    leadId: string,
    email: string,
    firstName?: string,
    brandId?: string,
    dispensaryId?: string
): Promise<void> {
    try {
        const db = getAdminFirestore();

        // Queue job for Craig to send welcome email
        await db.collection('jobs').add({
            type: 'send_welcome_email',
            agent: 'craig',
            status: 'pending',
            data: {
                leadId,
                email,
                firstName,
                brandId,
                dispensaryId,
            },
            createdAt: Date.now(),
            priority: 'normal',
        });

        // Mark lead as having welcome email sent
        await db.collection('email_leads').doc(leadId).update({
            welcomeEmailSent: true,
            lastUpdated: Date.now(),
        });

        logger.info('[EmailCapture] Queued welcome email job', {
            leadId,
            email,
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[EmailCapture] Failed to queue welcome email', {
            leadId,
            email,
            error: err.message,
        });
        throw err;
    }
}

/**
 * Trigger welcome SMS via Craig (marketer agent)
 */
async function triggerWelcomeSms(
    leadId: string,
    phone: string,
    firstName?: string,
    brandId?: string,
    dispensaryId?: string
): Promise<void> {
    try {
        const db = getAdminFirestore();

        // Queue job for Craig to send welcome SMS
        await db.collection('jobs').add({
            type: 'send_welcome_sms',
            agent: 'craig',
            status: 'pending',
            data: {
                leadId,
                phone,
                firstName,
                brandId,
                dispensaryId,
            },
            createdAt: Date.now(),
            priority: 'normal',
        });

        // Mark lead as having welcome SMS sent
        await db.collection('email_leads').doc(leadId).update({
            welcomeSmsSent: true,
            lastUpdated: Date.now(),
        });

        logger.info('[EmailCapture] Queued welcome SMS job', {
            leadId,
            phone,
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[EmailCapture] Failed to queue welcome SMS', {
            leadId,
            phone,
            error: err.message,
        });
        throw err;
    }
}

/**
 * Get all leads for a brand or dispensary
 */
export async function getLeads(brandId?: string, dispensaryId?: string): Promise<EmailLead[]> {
    try {
        const db = getAdminFirestore();
        let query = db.collection('email_leads').orderBy('capturedAt', 'desc');

        if (brandId) {
            query = query.where('brandId', '==', brandId) as any;
        }

        if (dispensaryId) {
            query = query.where('dispensaryId', '==', dispensaryId) as any;
        }

        const snapshot = await query.limit(1000).get();

        return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
            id: doc.id,
            ...doc.data(),
        } as EmailLead));
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[EmailCapture] Failed to get leads', {
            brandId,
            dispensaryId,
            error: err.message,
        });
        return [];
    }
}

/**
 * Get lead statistics
 */
export async function getLeadStats(brandId?: string, dispensaryId?: string): Promise<{
    total: number;
    emailOptIns: number;
    smsOptIns: number;
    ageVerified: number;
    bySource: Record<string, number>;
}> {
    try {
        const leads = await getLeads(brandId, dispensaryId);

        const stats = {
            total: leads.length,
            emailOptIns: leads.filter(l => l.emailConsent).length,
            smsOptIns: leads.filter(l => l.smsConsent).length,
            ageVerified: leads.filter(l => l.ageVerified).length,
            bySource: {} as Record<string, number>,
        };

        // Count by source
        leads.forEach(lead => {
            stats.bySource[lead.source] = (stats.bySource[lead.source] || 0) + 1;
        });

        return stats;
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[EmailCapture] Failed to get lead stats', {
            error: err.message,
        });

        return {
            total: 0,
            emailOptIns: 0,
            smsOptIns: 0,
            ageVerified: 0,
            bySource: {},
        };
    }
}
