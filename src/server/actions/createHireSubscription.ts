'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { createCustomerProfile, createSubscriptionFromProfile } from '@/lib/payments/authorize-net';
import { requireUser } from '@/server/auth/auth';
import { isCompanyPlanCheckoutEnabled } from '@/lib/feature-flags';

export interface HireSubscriptionInput {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    planId: 'specialist' | 'empire'; // 'scout' is free
    payment: {
        cardNumber?: string;
        expirationDate?: string;
        cardCode?: string;
        opaqueData?: {
            dataDescriptor: string;
            dataValue: string;
        };
    };
    zip: string;
}

function hasValidOpaqueData(payment: HireSubscriptionInput['payment']): boolean {
    return !!(
        payment?.opaqueData &&
        typeof payment.opaqueData.dataDescriptor === 'string' &&
        payment.opaqueData.dataDescriptor.trim().length > 0 &&
        typeof payment.opaqueData.dataValue === 'string' &&
        payment.opaqueData.dataValue.trim().length > 0
    );
}

function hasCardFallback(payment: HireSubscriptionInput['payment']): boolean {
    return !!(
        typeof payment?.cardNumber === 'string' &&
        payment.cardNumber.trim().length > 0 &&
        typeof payment?.expirationDate === 'string' &&
        payment.expirationDate.trim().length > 0 &&
        typeof payment?.cardCode === 'string' &&
        payment.cardCode.trim().length > 0
    );
}

function isValidUsZip(zip?: string): boolean {
    if (typeof zip !== 'string') return false;
    return /^\d{5}(-\d{4})?$/.test(zip.trim());
}

function isVerifiedSession(session: any): boolean {
    return session?.email_verified !== false && session?.emailVerified !== false;
}

export async function createHireSubscription(input: HireSubscriptionInput) {
    try {
        if (!isCompanyPlanCheckoutEnabled()) {
            return { success: false, error: 'Subscription checkout is currently disabled. Please contact sales.' };
        }

        let session;
        try {
            session = await requireUser();
        } catch {
            return { success: false, error: 'Authentication required.' };
        }

        if (!isVerifiedSession(session)) {
            return { success: false, error: 'Email verification is required before starting a paid subscription.' };
        }

        const isProduction = process.env.NODE_ENV === 'production';
        const sessionEmail = typeof session.email === 'string' ? session.email.toLowerCase() : '';
        const requestEmail = input.email.trim().toLowerCase();
        if (session.uid !== input.userId || (sessionEmail && sessionEmail !== requestEmail)) {
            return { success: false, error: 'Forbidden: identity mismatch for subscription request.' };
        }
        if (!isValidUsZip(input.zip)) {
            return { success: false, error: 'A valid billing ZIP code is required for paid subscriptions.' };
        }

        const hasOpaqueData = hasValidOpaqueData(input.payment);
        const hasRawCardFallback = hasCardFallback(input.payment);
        if (!hasOpaqueData && !hasRawCardFallback) {
            return { success: false, error: 'Payment information is required for paid subscriptions.' };
        }
        if (isProduction && !hasOpaqueData) {
            return { success: false, error: 'Tokenized payment data is required in production.' };
        }

        const { firestore } = await createServerClient();
        const userRef = firestore.collection('users').doc(input.userId);
        
        // 1. Validate User
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return { success: false, error: 'User not found.' };
        }

        // 2. Define Plan Details
        const pricing = {
            specialist: { amount: 499.00, name: 'BakedBot Specialist - 1 Agent' },
            empire: { amount: 1499.00, name: 'BakedBot Empire - Full Fleet' }
        };
        const selectedPlan = pricing[input.planId];
        if (!selectedPlan) return { success: false, error: 'Invalid plan.' };

        // 3. Create Auth.net Profile
        const address = {
            firstName: input.firstName,
            lastName: input.lastName,
            zip: input.zip
        };

        const profile = await createCustomerProfile(
            input.userId,
            input.email,
            address,
            input.payment,
            `Hire: ${selectedPlan.name}`
        );

        if (!profile.customerPaymentProfileId) {
            throw new Error('Failed to create payment profile.');
        }

        // 4. Create Subscription
        // Start tomorrow
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const startDate = tomorrow.toISOString().split('T')[0];

        const sub = await createSubscriptionFromProfile(
            {
                name: selectedPlan.name,
                amount: selectedPlan.amount,
                startDate: startDate,
                intervalMonths: 1
            },
            profile.customerProfileId,
            profile.customerPaymentProfileId,
            input.userId
        );

        // 5. Upgrade User Role
        await userRef.update({
            role: input.planId, 
            planId: input.planId,
            subscriptionId: sub.subscriptionId,
            customerProfileId: profile.customerProfileId,
            customerPaymentProfileId: profile.customerPaymentProfileId,
            subscriptionStatus: 'active',
            updatedAt: FieldValue.serverTimestamp()
        });

        // 5b. Update Custom Claims (Crucial for instant Frontend update)
        try {
            const { getAuth } = await import('firebase-admin/auth');
            const auth = getAuth();
            const currentClaims = (await auth.getUser(input.userId)).customClaims || {};
            
            await auth.setCustomUserClaims(input.userId, {
                ...currentClaims,
                role: input.planId, // 'specialist' or 'empire'
                planId: input.planId,
                subscriptionId: sub.subscriptionId
            });
            logger.info(`Updated custom claims for user ${input.userId} to role ${input.planId}`);
        } catch (claimError) {
            logger.error('Failed to update custom claims:', claimError as Record<string, any>);
            // Non-fatal, but frontend might lag until token refresh
        }

        logger.info(`User ${input.userId} hired agent(s) on plan ${input.planId}`);

        return { success: true, subscriptionId: sub.subscriptionId };

    } catch (error: any) {
        logger.error('Hire Subscription Failed:', error as Record<string, any>);
        return { success: false, error: error.message || 'Subscription failed.' };
    }
}
