'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { createCustomerProfile, createSubscriptionFromProfile } from '@/lib/payments/authorize-net';

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

export async function createHireSubscription(input: HireSubscriptionInput) {
    try {
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
            role: input.planId, // 'specialist' or 'empire' works as role? Or just 'subscriber'? 
            // Assuming 'specialist' and 'empire' are valid roles or we map to 'pro'/'enterprise'
            // For now, mapping to existing roles logic:
            // If plan is specialist -> role: 'pro' (maybe?)
            // Let's stick to the planId as the source of truth for features.
            planId: input.planId,
            subscriptionId: sub.subscriptionId,
            customerProfileId: profile.customerProfileId,
            customerPaymentProfileId: profile.customerPaymentProfileId,
            subscriptionStatus: 'active',
            updatedAt: FieldValue.serverTimestamp()
        });

        logger.info(`User ${input.userId} hired agent(s) on plan ${input.planId}`);

        return { success: true, subscriptionId: sub.subscriptionId };

    } catch (error: any) {
        logger.error('Hire Subscription Failed:', error);
        return { success: false, error: error.message || 'Subscription failed.' };
    }
}
