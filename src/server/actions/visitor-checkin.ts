'use server';

import { firestore } from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import {
    isNormalizedPhone,
    normalizeEmail,
    normalizePhone,
} from '@/lib/customer-import/column-mapping';
import { logger } from '@/lib/logger';
import { getGoogleReviewUrl } from '@/lib/reviews/google-review-url';
import { dispatchPlaybookEvent } from '@/server/services/playbook-event-dispatcher';
import { getCustomerHistory } from '@/server/tools/crm-tools';
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

const favoriteCategorySchema = z.enum([
    'flower',
    'pre-rolls',
    'vapes',
    'edibles',
    'concentrates',
    'tinctures',
]);

const thriveCheckinUiVersionSchema = z.enum([
    'thrive_checkin_v2',
]);

const visitorOfferTypeSchema = z.enum([
    'email',
    'favorite_categories',
]);

const getVisitorCheckinContextSchema = z.object({
    orgId: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
});

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
    favoriteCategories: z.array(favoriteCategorySchema).max(6).optional(),
    uiVersion: thriveCheckinUiVersionSchema.optional(),
    offerType: visitorOfferTypeSchema.nullable().optional(),
});

export type VisitorCheckinSource = z.infer<typeof visitorCheckinSourceSchema>;
export type VisitorAgeVerifiedMethod = z.infer<typeof visitorAgeVerifiedMethodSchema>;
export type VisitorFavoriteCategory = z.infer<typeof favoriteCategorySchema>;
export type VisitorCheckinUiVersion = z.infer<typeof thriveCheckinUiVersionSchema>;
export type VisitorCheckinOfferType = z.infer<typeof visitorOfferTypeSchema>;

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
    favoriteCategories?: VisitorFavoriteCategory[];
    uiVersion?: VisitorCheckinUiVersion;
    offerType?: VisitorCheckinOfferType | null;
}

export interface GetVisitorCheckinContextRequest {
    orgId: string;
    phone: string;
    email?: string;
}

export interface VisitorFollowupEligibility {
    emailWelcome: boolean;
    smsWelcome: boolean;
    reviewSequence: boolean;
}

export interface VisitorLastPurchase {
    orderId: string;
    primaryItemName: string;
    itemCount: number;
    total: number;
    purchasedAt: string | null;
    orderDateLabel: string | null;
}

export interface VisitorCheckinContextResult {
    success: boolean;
    normalizedPhone?: string;
    isReturningCustomer: boolean;
    customerId?: string;
    savedEmail?: string;
    savedEmailConsent?: boolean;
    lastPurchase?: VisitorLastPurchase;
    googleReviewUrl?: string;
    enrichmentMode?: 'email' | 'favorite_categories';
    error?: string;
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
    | firestore.DocumentSnapshot
    | firestore.QueryDocumentSnapshot;

type LeadScope = {
    brandId?: string;
    dispensaryId?: string;
};

type LeadSnapshot = {
    id: string;
    data: Record<string, unknown>;
};

function digitsOnlyPhone(value: string): string {
    return value.replace(/\D/g, '');
}

function buildPhoneCustomerId(orgId: string, phone: string): string {
    return `${orgId}_phone_${digitsOnlyPhone(phone)}`;
}

function sameLeadScope(existing: LeadScope, incoming: LeadScope): boolean {
    const existingBrand = existing.brandId || '';
    const existingDispensary = existing.dispensaryId || '';
    const incomingBrand = incoming.brandId || '';
    const incomingDispensary = incoming.dispensaryId || '';

    if (incomingBrand || existingBrand) {
        return incomingBrand !== '' && existingBrand !== '' && incomingBrand === existingBrand;
    }

    if (incomingDispensary || existingDispensary) {
        return (
            incomingDispensary !== '' &&
            existingDispensary !== '' &&
            incomingDispensary === existingDispensary
        );
    }

    return true;
}

function normalizeStoredEmail(value: unknown): string | undefined {
    return normalizeEmail(typeof value === 'string' ? value : undefined) || undefined;
}

function normalizeStoredCategories(value: unknown): VisitorFavoriteCategory[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return Array.from(new Set(
        value.filter((category): category is VisitorFavoriteCategory => (
            typeof category === 'string' &&
            favoriteCategorySchema.safeParse(category).success
        )),
    ));
}

function mergePreferredCategories(
    existing: unknown,
    incoming: VisitorFavoriteCategory[],
): VisitorFavoriteCategory[] {
    return Array.from(new Set([
        ...normalizeStoredCategories(existing),
        ...incoming,
    ]));
}

function toDate(value: unknown): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (
        value &&
        typeof value === 'object' &&
        typeof (value as { toDate?: () => Date }).toDate === 'function'
    ) {
        const parsed = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
}

function toCurrencyNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

function summarizeLastPurchase(order: Record<string, unknown>): VisitorLastPurchase | null {
    const items = Array.isArray(order.items) ? order.items : [];
    const primaryItem = items.find((item): item is Record<string, unknown> => (
        !!item &&
        typeof item === 'object' &&
        typeof (item as { name?: string }).name === 'string'
    ));
    const purchasedAt = toDate(order.date);
    const total = toCurrencyNumber(order.total);

    if (!primaryItem) {
        return null;
    }

    return {
        orderId: String(order.id || ''),
        primaryItemName: String(primaryItem.name || 'Recent order'),
        itemCount: items.length,
        total,
        purchasedAt: purchasedAt ? purchasedAt.toISOString() : null,
        orderDateLabel: purchasedAt
            ? purchasedAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            })
            : null,
    };
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

async function findExistingLead(
    orgId: string,
    normalizedPhone: string,
    normalizedEmail?: string,
): Promise<LeadSnapshot | null> {
    const db = getAdminFirestore();

    if (normalizedEmail) {
        const emailQuery = await db.collection('email_leads')
            .where('email', '==', normalizedEmail)
            .get();

        const emailDoc = emailQuery.docs.find((doc) => sameLeadScope(
            {
                brandId: doc.get('brandId'),
                dispensaryId: doc.get('dispensaryId'),
            },
            {
                brandId: orgId,
                dispensaryId: orgId,
            },
        ));

        if (emailDoc) {
            return {
                id: emailDoc.id,
                data: emailDoc.data(),
            };
        }
    }

    const phoneQuery = await db.collection('email_leads')
        .where('phone', '==', normalizedPhone)
        .get();

    const phoneDoc = phoneQuery.docs.find((doc) => sameLeadScope(
        {
            brandId: doc.get('brandId'),
            dispensaryId: doc.get('dispensaryId'),
        },
        {
            brandId: orgId,
            dispensaryId: orgId,
        },
    ));

    if (!phoneDoc) {
        return null;
    }

    return {
        id: phoneDoc.id,
        data: phoneDoc.data(),
    };
}

async function resolveLastPurchase(
    customerId: string,
    orgId: string,
): Promise<VisitorLastPurchase | null> {
    try {
        const history = await getCustomerHistory(customerId, orgId, 1);
        const firstOrder = history.orders[0];

        if (!firstOrder || typeof firstOrder !== 'object') {
            return null;
        }

        return summarizeLastPurchase(firstOrder as Record<string, unknown>);
    } catch (error) {
        logger.warn('[VisitorCheckin] Failed to resolve last purchase', {
            orgId,
            customerId,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

export async function getVisitorCheckinContext(
    request: GetVisitorCheckinContextRequest,
): Promise<VisitorCheckinContextResult> {
    try {
        const validated = getVisitorCheckinContextSchema.parse(request);
        const normalizedPhone = normalizePhone(validated.phone);
        const normalizedEmail = normalizeEmail(validated.email || undefined);

        if (!isNormalizedPhone(normalizedPhone)) {
            return {
                success: false,
                isReturningCustomer: false,
                error: 'Valid phone number required',
            };
        }

        const existingCustomer = await findExistingCustomer(
            validated.orgId,
            normalizedPhone,
            normalizedEmail,
        );
        const existingCustomerData = existingCustomer?.data() ?? null;
        const existingLead = await findExistingLead(
            validated.orgId,
            normalizedPhone,
            normalizedEmail,
        );

        const savedEmail = normalizeStoredEmail(
            existingCustomerData?.email ?? existingLead?.data.email ?? undefined,
        );
        const savedEmailConsent = Boolean(
            savedEmail && (
                existingCustomerData?.emailConsent === true ||
                existingLead?.data.emailConsent === true
            )
        );
        const isReturningCustomer = Boolean(existingCustomerData || existingLead);
        const lastPurchase = existingCustomer?.id
            ? await resolveLastPurchase(existingCustomer.id, validated.orgId)
            : null;
        const googleReviewUrl = isReturningCustomer && lastPurchase
            ? await getGoogleReviewUrl(validated.orgId)
            : null;
        const enrichmentMode = savedEmail ? 'favorite_categories' : 'email';

        logger.info('[VisitorCheckin] Resolved public check-in context', {
            orgId: validated.orgId,
            normalizedPhone,
            customerId: existingCustomer?.id ?? null,
            isReturningCustomer,
            lastPurchaseFound: Boolean(lastPurchase),
            reviewUrlFound: Boolean(googleReviewUrl),
            enrichmentMode,
        });

        return {
            success: true,
            normalizedPhone,
            isReturningCustomer,
            customerId: existingCustomer?.id,
            savedEmail,
            savedEmailConsent,
            lastPurchase: lastPurchase || undefined,
            googleReviewUrl: googleReviewUrl || undefined,
            enrichmentMode,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                isReturningCustomer: false,
                error: error.errors[0]?.message || 'Invalid visitor context payload',
            };
        }

        logger.error('[VisitorCheckin] Failed to resolve public check-in context', {
            error: error instanceof Error ? error.message : String(error),
            request,
        });

        return {
            success: false,
            isReturningCustomer: false,
            error: error instanceof Error ? error.message : 'Failed to resolve visitor context',
        };
    }
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

        const favoriteCategories = Array.from(new Set(validated.favoriteCategories ?? []));
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

        const [existingCustomer, existingLead] = await Promise.all([
            findExistingCustomer(validated.orgId, normalizedPhone, normalizedEmail),
            findExistingLead(validated.orgId, normalizedPhone, normalizedEmail),
        ]);
        const existingCustomerData = existingCustomer?.data() ?? null;
        const recoveredLeadData = !existingCustomerData ? (existingLead?.data ?? null) : null;

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
                visitCount: 1,
                avgOrderValue: 0,
                segment: 'new',
                tier: 'bronze',
                points: 0,
                lifetimeValue: 0,
                emailConsent,
                smsConsent,
                source: validated.source,
                firstCheckinMood: validated.mood ?? null,
                lastCheckinMood: validated.mood ?? null,
                preferredCategories: favoriteCategories,
                lastCheckinUiVersion: validated.uiVersion ?? null,
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
            if (validated.mood) {
                customerUpdates.lastCheckinMood = validated.mood;
            }
            if (favoriteCategories.length > 0) {
                customerUpdates.preferredCategories = mergePreferredCategories(
                    existingCustomerData.preferredCategories,
                    favoriteCategories,
                );
            }
            if (validated.uiVersion) {
                customerUpdates.lastCheckinUiVersion = validated.uiVersion;
            }
            customerUpdates.visitCount = FieldValue.increment(1);

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
            favoriteCategories,
            uiVersion: validated.uiVersion ?? null,
            offerType: validated.offerType ?? null,
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

        // 9. Dispatch Playbook Events
        const resolvedEmail = normalizedEmail ?? existingCustomerData?.email ?? recoveredLeadData?.email ?? null;
        const resolvedName = validated.firstName || existingCustomerData?.firstName || recoveredLeadData?.firstName;

        if (leadResult.isNewLead) {
            dispatchPlaybookEvent(validated.orgId, 'customer.signup', {
                customerId,
                customerEmail: resolvedEmail,
                customerPhone: normalizedPhone,
                customerName: resolvedName,
                leadId: leadResult.leadId ?? null,
                source: validated.source,
                eventName: 'customer.signup',
                priorVisits: 0,
            }).catch((error) => {
                logger.warn('[VisitorCheckin] Failed to dispatch customer signup event', {
                    orgId: validated.orgId,
                    customerId,
                    leadId: leadResult.leadId,
                    error: error instanceof Error ? error.message : String(error),
                });
            });
        } else if (isReturningCustomer) {
            dispatchPlaybookEvent(validated.orgId, 'customer.checkin', {
                customerId,
                customerEmail: resolvedEmail,
                customerPhone: normalizedPhone,
                customerName: resolvedName,
                eventName: 'customer.checkin',
                source: validated.source,
                priorVisits: existingCustomerData?.visitCount ?? 1,
            }).catch((error) => {
                logger.warn('[VisitorCheckin] Failed to dispatch customer checkin event', {
                    orgId: validated.orgId,
                    customerId,
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
            uiVersion: validated.uiVersion ?? null,
            mood: validated.mood ?? null,
            favoriteCategories,
            offerType: validated.offerType ?? null,
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
