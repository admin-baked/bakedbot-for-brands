'use server';

/**
 * Loyalty Tablet Server Actions
 *
 * Handles email/phone capture from the in-store loyalty tablet at Thrive Syracuse.
 * Reuses the established email-capture pattern and upserts customer profiles.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const captureSchema = z.object({
    orgId: z.string().min(1),
    firstName: z.string().min(1).max(100),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    emailConsent: z.boolean(),
    smsConsent: z.boolean(),
});

export interface TabletLeadResult {
    success: boolean;
    isNewLead: boolean;
    customerId?: string;
    loyaltyPoints?: number;
    error?: string;
}

/**
 * Capture lead from loyalty tablet (in-store kiosk).
 * Creates/updates email_leads + customer profile.
 */
export async function captureTabletLead(params: {
    orgId: string;
    firstName: string;
    email?: string;
    phone?: string;
    emailConsent: boolean;
    smsConsent: boolean;
}): Promise<TabletLeadResult> {
    try {
        const validated = captureSchema.parse(params);
        const { orgId, firstName, email, phone, emailConsent, smsConsent } = validated;

        if (!email && !phone) {
            return { success: false, isNewLead: false, error: 'Email or phone required' };
        }

        const db = getAdminFirestore();
        const now = new Date();
        let isNewLead = false;

        // 1. Create or update email_leads (same pattern as age gate / vibe / academy)
        if (email) {
            const leadsRef = db.collection('email_leads');
            const existingSnap = await leadsRef
                .where('email', '==', email.toLowerCase())
                .where('brandId', '==', orgId)
                .limit(1)
                .get();

            if (existingSnap.empty) {
                isNewLead = true;
                await leadsRef.add({
                    email: email.toLowerCase(),
                    firstName,
                    phone: phone || null,
                    emailConsent,
                    smsConsent,
                    brandId: orgId,
                    dispensaryId: orgId,
                    source: 'loyalty_tablet',
                    ageVerified: true, // Physical store = already age-verified
                    capturedAt: Date.now(),
                    welcomeEmailSent: false,
                    tags: ['in_store', 'loyalty_tablet', emailConsent ? 'email_opt_in' : 'email_opt_out'],
                });
            } else {
                // Update consent flags if they opted in
                const existingDoc = existingSnap.docs[0];
                const updates: Record<string, unknown> = { updatedAt: now };
                if (emailConsent && !existingDoc.data().emailConsent) updates.emailConsent = true;
                if (smsConsent && !existingDoc.data().smsConsent) updates.smsConsent = true;
                if (phone && !existingDoc.data().phone) updates.phone = phone;
                await existingDoc.ref.update(updates);
            }
        }

        // 2. Upsert customer profile
        const customerId = email
            ? `${orgId}_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
            : `${orgId}_phone_${(phone || '').replace(/[^0-9]/g, '')}`;

        const customerRef = db.collection('customers').doc(customerId);
        const existingCustomer = await customerRef.get();

        if (!existingCustomer.exists) {
            await customerRef.set({
                id: customerId,
                orgId,
                email: email || null,
                phone: phone || null,
                firstName,
                totalSpent: 0,
                orderCount: 0,
                avgOrderValue: 0,
                segment: 'new',
                tier: 'bronze',
                points: 0,
                lifetimeValue: 0,
                emailConsent,
                smsConsent,
                source: 'loyalty_tablet',
                createdAt: now,
                updatedAt: now,
            });
            logger.info('[LoyaltyTablet] New customer created', { customerId, orgId });
        } else {
            // Update consent + name if not already set
            const existing = existingCustomer.data() || {};
            const updates: Record<string, unknown> = { updatedAt: now };
            if (!existing.firstName && firstName) updates.firstName = firstName;
            if (!existing.email && email) updates.email = email;
            if (!existing.phone && phone) updates.phone = phone;
            if (emailConsent) updates.emailConsent = true;
            if (smsConsent) updates.smsConsent = true;
            await customerRef.update(updates);
        }

        // 3. Get current loyalty points to show on success screen
        const customerData = (await customerRef.get()).data();
        const loyaltyPoints = customerData?.points || 0;

        logger.info('[LoyaltyTablet] Lead captured', {
            orgId,
            customerId,
            isNewLead,
            emailConsent,
            smsConsent,
        });

        return {
            success: true,
            isNewLead,
            customerId,
            loyaltyPoints,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, isNewLead: false, error: error.errors[0].message };
        }
        logger.error('[LoyaltyTablet] Capture failed', { error });
        return {
            success: false,
            isNewLead: false,
            error: error instanceof Error ? error.message : 'Failed to capture lead',
        };
    }
}
