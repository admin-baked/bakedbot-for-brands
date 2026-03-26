'use server';

import { getAdminFirestore } from '@/firebase/admin';
import {
    isNormalizedPhone,
    normalizeEmail,
    normalizePhone,
} from '@/lib/customer-import/column-mapping';
import { logger } from '@/lib/logger';
import { dispatchPlaybookEvent } from '@/server/services/playbook-event-dispatcher';
import { z } from 'zod';
import { captureEmailLead } from './email-capture';

const visitorCheckinSourceSchema = z.enum([
    'brand_rewards_checkin',
    'loyalty_tablet_checkin',
]);

const visitorAgeVerifiedMethodSchema = z.enum([
    'staff_visual_check',
    'staff_attested_public_flow',
]);

const captureVisitorCheckinSchema = z.object({
    orgId: z.string().min(1),
    firstName: z.string().trim().min(1).max(100),
    phone: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    emailConsent: z.boolean(),
    smsConsent: z.boolean(),
    source: visitorCheckinSourceSchema,
    ageVerifiedMethod: visitorAgeVerifiedMethodSchema,
    mood: z.string().optional(),
    cartProductIds: z.array(z.string()).optional(),
    bundleAdded: z.boolean().optional(),
});

export type VisitorCheckinSource = z.infer<typeof visitorCheckinSourceSchema>;
export type VisitorAgeVerifiedMethod = z.infer<typeof visitorAgeVerifiedMethodSchema>;

export interface CaptureVisitorCheckinRequest {
    orgId: string;
    firstName: string;
    phone: string;
    email?: string;
    emailConsent: boolean;
    smsConsent: boolean;
    source: VisitorCheckinSource;
    ageVerifiedMethod: VisitorAgeVerifiedMethod;
    mood?: string;
    cartProductIds?: string[];
    bundleAdded?: boolean;
}

export interface VisitorFollowupEligibility {
    emailWelcome: boolean;
    smsWelcome: boolean;
    reviewSequence: boolean;
}

export interface CaptureVisitorCheckinResult {
    success: boolean;
    isNewLead: boolean;
    isReturningCustomer: boolean;
    customerId?: string;
    leadId?: string;
    visitId?: string;
    loyaltyPoints?: number;
    followupEligibility?: VisitorFollowupEligibility;
    error?: string;
}

type CustomerSnapshot =
    | FirebaseFirestore.DocumentSnapshot
    | FirebaseFirestore.QueryDocumentSnapshot;

function digitsOnlyPhone(value: string): string {
    return value.replace(/\D/g, '');
}

function buildPhoneCustomerId(orgId: string, phone: string): string {
    return `${orgId}_phone_${digitsOnlyPhone(phone)}`;
}

async function findCustomerByField(
    field: 'phone' | 'email',
    value: string,
    orgId: string,
): Promise<CustomerSnapshot | null> {
    const db = getAdminFirestore();
    const snapshot = await db
        .collection('customers')
        .where(field, '==', value)
        .limit(10)
        .get();

    return snapshot.docs.find((doc) => doc.data()?.orgId === orgId) ?? null;
}

async function findExistingCustomer(
    orgId: string,
    normalizedPhone: string,
    normalizedEmail?: string,
): Promise<CustomerSnapshot | null> {
    const db = getAdminFirestore();
    const directPhoneDoc = await db
        .collection('customers')
        .doc(buildPhoneCustomerId(orgId, normalizedPhone))
        .get();

    if (directPhoneDoc.exists && directPhoneDoc.data()?.orgId === orgId) {
        return directPhoneDoc;
    }

    const phoneMatch = await findCustomerByField('phone', normalizedPhone, orgId);
    if (phoneMatch) {
        return phoneMatch;
    }

    if (normalizedEmail) {
        return findCustomerByField('email', normalizedEmail, orgId);
    }

    return null;
}

export async function captureVisitorCheckin(
    request: CaptureVisitorCheckinRequest,
): Promise<CaptureVisitorCheckinResult> {
    try {
        const validated = captureVisitorCheckinSchema.parse(request);
        const normalizedEmail = normalizeEmail(validated.email || undefined);
        const normalizedPhone = normalizePhone(validated.phone);

        if (!isNormalizedPhone(normalizedPhone)) {
            return {
                success: false,
                isNewLead: false,
                isReturningCustomer: false,
                error: 'Valid phone number required',
            };
        }

        const emailConsent = Boolean(normalizedEmail && validated.emailConsent);
        const smsConsent = validated.smsConsent;
        const cartProductIds = Array.from(new Set(validated.cartProductIds ?? []));
        const now = new Date();
        const db = getAdminFirestore();

        const leadResult = await captureEmailLead({
            email: normalizedEmail,
            phone: normalizedPhone,
            firstName: validated.firstName,
            emailConsent,
            smsConsent,
            brandId: validated.orgId,
            dispensaryId: validated.orgId,
            source: validated.source,
            ageVerified: true,
        });

        if (!leadResult.success) {
            return {
                success: false,
                isNewLead: false,
                isReturningCustomer: false,
                error: leadResult.error || 'Failed to capture visitor check-in',
            };
        }

        const existingCustomer = await findExistingCustomer(
            validated.orgId,
            normalizedPhone,
            normalizedEmail,
        );
        const existingCustomerData = existingCustomer?.data() ?? null;
        const customerId = existingCustomer?.id ?? buildPhoneCustomerId(validated.orgId, normalizedPhone);
        const customerRef = db.collection('customers').doc(customerId);
        const loyaltyPoints =
            typeof existingCustomerData?.points === 'number' ? existingCustomerData.points : 0;

        const batch = db.batch();

        if (!existingCustomerData) {
            batch.set(customerRef, {
                id: customerId,
                orgId: validated.orgId,
                email: normalizedEmail ?? null,
                phone: normalizedPhone,
                firstName: validated.firstName,
                totalSpent: 0,
                orderCount: 0,
                avgOrderValue: 0,
                segment: 'new',
                tier: 'bronze',
                points: 0,
                lifetimeValue: 0,
                emailConsent,
                smsConsent,
                source: validated.source,
                firstCheckinMood: validated.mood ?? null,
                createdAt: now,
                updatedAt: now,
                lastCheckinAt: now,
            });
        } else {
            const customerUpdates: Record<string, unknown> = {
                updatedAt: now,
                lastCheckinAt: now,
            };

            if (!existingCustomerData.firstName && validated.firstName) {
                customerUpdates.firstName = validated.firstName;
            }
            if (!existingCustomerData.email && normalizedEmail) {
                customerUpdates.email = normalizedEmail;
            }
            if (!existingCustomerData.phone && normalizedPhone) {
                customerUpdates.phone = normalizedPhone;
            }
            if (emailConsent && !existingCustomerData.emailConsent) {
                customerUpdates.emailConsent = true;
            }
            if (smsConsent && !existingCustomerData.smsConsent) {
                customerUpdates.smsConsent = true;
            }
            if (!existingCustomerData.source) {
                customerUpdates.source = validated.source;
            }
            if (validated.mood && !existingCustomerData.firstCheckinMood) {
                customerUpdates.firstCheckinMood = validated.mood;
            }

            batch.update(customerRef, customerUpdates);
        }

        const visitId = `${customerId}_visit_${now.getTime()}`;
        const reviewSequenceEnabled = Boolean(normalizedEmail && emailConsent);
        const visitRef = db.collection('checkin_visits').doc(visitId);

        batch.set(visitRef, {
            visitId,
            orgId: validated.orgId,
            customerId,
            leadId: leadResult.leadId ?? null,
            firstName: validated.firstName,
            email: normalizedEmail ?? null,
            phone: normalizedPhone,
            source: validated.source,
            ageVerified: true,
            ageVerifiedMethod: validated.ageVerifiedMethod,
            ageVerifiedAt: now,
            emailConsent,
            smsConsent,
            mood: validated.mood ?? null,
            cartProductIds,
            bundleAdded: Boolean(validated.bundleAdded),
            createdAt: now,
            visitedAt: now,
            reviewSequence: {
                status: reviewSequenceEnabled ? 'pending' : 'skipped_no_email',
                checkoutEmailScheduledAt: now,
                reviewNudgeScheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
                reviewLeft: false,
            },
        });

        await batch.commit();

        const isReturningCustomer = Boolean(existingCustomerData || !leadResult.isNewLead);

        if (leadResult.isNewLead) {
            dispatchPlaybookEvent(validated.orgId, 'customer.signup', {
                customerId,
                customerEmail: normalizedEmail ?? null,
                customerPhone: normalizedPhone,
                customerName: validated.firstName,
                leadId: leadResult.leadId ?? null,
                source: validated.source,
            }).catch((error) => {
                logger.warn('[VisitorCheckin] Failed to dispatch customer signup event', {
                    orgId: validated.orgId,
                    customerId,
                    leadId: leadResult.leadId,
                    error: error instanceof Error ? error.message : String(error),
                });
            });
        }

        logger.info('[VisitorCheckin] Captured visitor check-in', {
            orgId: validated.orgId,
            customerId,
            leadId: leadResult.leadId,
            visitId,
            source: validated.source,
            isNewLead: leadResult.isNewLead,
            isReturningCustomer,
        });

        return {
            success: true,
            isNewLead: leadResult.isNewLead,
            isReturningCustomer,
            customerId,
            leadId: leadResult.leadId,
            visitId,
            loyaltyPoints,
            followupEligibility: {
                emailWelcome: emailConsent,
                smsWelcome: smsConsent,
                reviewSequence: reviewSequenceEnabled,
            },
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                isNewLead: false,
                isReturningCustomer: false,
                error: error.errors[0]?.message || 'Invalid visitor check-in payload',
            };
        }

        logger.error('[VisitorCheckin] Failed to capture visitor check-in', {
            error: error instanceof Error ? error.message : String(error),
            request,
        });

        return {
            success: false,
            isNewLead: false,
            isReturningCustomer: false,
            error: error instanceof Error ? error.message : 'Failed to capture visitor check-in',
        };
    }
}
