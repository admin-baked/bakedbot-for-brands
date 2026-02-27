/**
 * Email Lead Capture Server Actions
 *
 * Handles email/phone capture from age gates and other lead magnets.
 * Stores in Firestore and triggers Mrs. Parker welcome email workflow.
 * Mrs. Parker uses Letta to personalize welcome messages with customer memory.
 */

'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';

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
    firstOrderDiscountCode?: string;
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
    firstOrderDiscountCode?: string;
    capturedAt: number;
    lastUpdated: number;
    welcomeEmailSent?: boolean;
    welcomeSmsSent?: boolean;
    tags: string[];
}

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;
    const token = user as {
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
        dispensaryId?: string;
        tenantId?: string;
        organizationId?: string;
    };
    return (
        token.currentOrgId ||
        token.orgId ||
        token.brandId ||
        token.dispensaryId ||
        token.tenantId ||
        token.organizationId ||
        null
    );
}

function mapLeadDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): EmailLead {
    return {
        id: doc.id,
        ...doc.data(),
    } as EmailLead;
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
            firstOrderDiscountCode: request.firstOrderDiscountCode,
            capturedAt: now,
            lastUpdated: now,
            tags: [
                request.source,
                request.ageVerified ? 'age-verified' : 'not-verified',
                request.emailConsent ? 'email-opt-in' : 'email-opt-out',
                request.smsConsent ? 'sms-opt-in' : 'sms-opt-out',
                request.firstOrderDiscountCode ? 'first-order-discount' : null,
            ].filter(Boolean) as string[],
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

                // ALSO trigger Welcome Email Campaign playbook for tracking
                triggerWelcomePlaybook(leadId, request.email, request.firstName, request.brandId, request.dispensaryId)
                    .catch(err => {
                        logger.error('[EmailCapture] Failed to trigger welcome playbook', {
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
 * Trigger welcome email via Mrs. Parker (retention agent)
 * Mrs. Parker uses Letta to personalize welcome emails with warm "Southern Hospitality"
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

        // Queue job for Mrs. Parker to send personalized welcome email
        await db.collection('jobs').add({
            type: 'send_welcome_email',
            agent: 'mrs_parker',
            status: 'pending',
            data: {
                leadId,
                email,
                firstName,
                brandId,
                dispensaryId,
                emailType: 'welcome', // Mrs. Parker's sendPersonalizedEmail tool
            },
            createdAt: Date.now(),
            priority: 'high', // Welcome emails are high priority for retention
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
 * Trigger welcome SMS via Mrs. Parker (retention agent)
 * Mrs. Parker uses Letta to personalize welcome SMS with warm "Southern Hospitality"
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

        // Queue job for Mrs. Parker to send personalized welcome SMS
        await db.collection('jobs').add({
            type: 'send_welcome_sms',
            agent: 'mrs_parker',
            status: 'pending',
            data: {
                leadId,
                phone,
                firstName,
                brandId,
                dispensaryId,
                messageType: 'welcome', // For Mrs. Parker's SMS tool
            },
            createdAt: Date.now(),
            priority: 'high', // Welcome messages are high priority for retention
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
        const user = await requireUser();
        const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
        const isSuper = isSuperRole(role);
        const actorOrgId = getActorOrgId(user);

        // Non-super users can only query their own org scope.
        if (!isSuper) {
            if (!actorOrgId) {
                return [];
            }
            if (brandId && brandId !== actorOrgId) {
                return [];
            }
            if (dispensaryId && dispensaryId !== actorOrgId) {
                return [];
            }
        }

        const db = getAdminFirestore();
        const leadsById = new Map<string, EmailLead>();

        const addQueryResults = async (field: 'brandId' | 'dispensaryId', value: string) => {
            const snapshot = await db
                .collection('email_leads')
                .where(field, '==', value)
                .orderBy('capturedAt', 'desc')
                .limit(1000)
                .get();
            snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
                leadsById.set(doc.id, mapLeadDoc(doc));
            });
        };

        if (isSuper && !brandId && !dispensaryId) {
            const snapshot = await db
                .collection('email_leads')
                .orderBy('capturedAt', 'desc')
                .limit(1000)
                .get();
            return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => mapLeadDoc(doc));
        }

        if (brandId) {
            await addQueryResults('brandId', brandId);
        } else if (dispensaryId) {
            await addQueryResults('dispensaryId', dispensaryId);
        } else if (actorOrgId) {
            // Default non-super scope: actor org only (for brand OR dispensary ownership).
            await Promise.all([
                addQueryResults('brandId', actorOrgId),
                addQueryResults('dispensaryId', actorOrgId),
            ]);
        }

        return Array.from(leadsById.values())
            .sort((a, b) => b.capturedAt - a.capturedAt)
            .slice(0, 1000);
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
 * Trigger Welcome Email Campaign playbook
 * Logs lead in playbook system for tracking and future automation
 */
async function triggerWelcomePlaybook(
    leadId: string,
    email: string,
    firstName?: string,
    brandId?: string,
    dispensaryId?: string
): Promise<void> {
    try {
        const db = getAdminFirestore();

        // Create a user.signup event to trigger the Welcome Email Campaign playbook
        await db.collection('events').add({
            type: 'user.signup',
            eventPattern: 'user.signup',
            source: 'age_gate',
            data: {
                leadId,
                email,
                firstName,
                brandId,
                dispensaryId,
                accountType: 'customer', // Age gate captures are always customers
                signupContext: 'age_verification',
                timestamp: Date.now(),
            },
            triggeredAt: Date.now(),
            processed: false,
        });

        logger.info('[EmailCapture] Welcome playbook event triggered', {
            leadId,
            email,
            eventType: 'user.signup',
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[EmailCapture] Failed to trigger welcome playbook event', {
            leadId,
            email,
            error: err.message,
        });
        throw err;
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
