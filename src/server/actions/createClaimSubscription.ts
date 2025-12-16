'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { PRICING_PLANS } from '@/lib/config/pricing';

// Authorize.Net configuration
const API_LOGIN_ID = process.env.AUTHNET_API_LOGIN_ID;
const TRANSACTION_KEY = process.env.AUTHNET_TRANSACTION_KEY;
const IS_PRODUCTION = process.env.AUTHNET_ENV === 'production';

const API_ENDPOINT = IS_PRODUCTION
    ? 'https://api2.authorize.net/xml/v1/request.api'
    : 'https://apitest.authorize.net/xml/v1/request.api';

import { PlanId } from '@/lib/plans';

interface ClaimSubscriptionInput {
    // Business Info
    businessName: string;
    businessAddress: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    role: string;
    // Plan Selection
    planId: PlanId;
    // Payment (from Accept.js)
    opaqueData?: {
        dataDescriptor: string;
        dataValue: string;
    };
    // Fallback for testing
    cardNumber?: string;
    expirationDate?: string;
    cvv?: string;
    zip?: string;
}

interface ClaimSubscriptionResult {
    success: boolean;
    claimId?: string;
    subscriptionId?: string;
    error?: string;
}

/**
 * Get the current count of Founders Claim subscriptions
 */
export async function getFoundersClaimCount(): Promise<number> {
    try {
        const { firestore } = await createServerClient();
        const snapshot = await firestore
            .collection('foot_traffic')
            .doc('data')
            .collection('claims')
            .where('planId', '==', 'founders_claim')
            .where('status', 'in', ['pending', 'active', 'verified'])
            .count()
            .get();

        return snapshot.data().count;
    } catch (error: unknown) {
        logger.error('Error getting founders claim count:', error as Record<string, unknown>);
        return 0;
    }
}

/**
 * Create a claim with an Authorize.Net subscription
 */
export async function createClaimWithSubscription(
    input: ClaimSubscriptionInput
): Promise<ClaimSubscriptionResult> {
    try {
        const { firestore } = await createServerClient();

        // 1. Validate plan
        const plan = PRICING_PLANS.find(p => p.id === input.planId);
        if (!plan) {
            return { success: false, error: 'Invalid plan selected.' };
        }

        // 2. Check Founders Claim availability
        if (input.planId === 'founders_claim') {
            const currentCount = await getFoundersClaimCount();
            const limit = 250;
            if (currentCount >= limit) {
                return {
                    success: false,
                    error: 'Founders Claim spots are sold out. Please select Claim Pro instead.'
                };
            }
        }

        const price = plan.price || 0;

        // 3. Create the claim record first (pending status)
        const claimRef = await firestore
            .collection('foot_traffic')
            .doc('data')
            .collection('claims')
            .add({
                businessName: input.businessName,
                businessAddress: input.businessAddress,
                contactName: input.contactName,
                contactEmail: input.contactEmail,
                contactPhone: input.contactPhone,
                role: input.role,
                planId: input.planId,
                planPrice: price,
                status: 'pending_payment',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                source: 'claim_wizard'
            });

        const claimId = claimRef.id;

        // 4. If free plan (shouldn't happen for claim plans, but handle it)
        if (price === 0) {
            await claimRef.update({
                status: 'pending_verification',
                subscriptionId: null,
                updatedAt: FieldValue.serverTimestamp()
            });
            return { success: true, claimId };
        }

        // 5. Process payment via Authorize.Net
        if (!API_LOGIN_ID || !TRANSACTION_KEY) {
            logger.error('Authorize.Net credentials missing');
            await claimRef.update({ status: 'payment_config_error' });
            return { success: false, error: 'Payment system not configured.' };
        }

        // Create customer profile
        const customerProfilePayload = {
            createCustomerProfileRequest: {
                merchantAuthentication: {
                    name: API_LOGIN_ID,
                    transactionKey: TRANSACTION_KEY
                },
                profile: {
                    merchantCustomerId: claimId,
                    description: `Claim: ${input.businessName}`,
                    email: input.contactEmail,
                    paymentProfiles: [{
                        billTo: {
                            firstName: input.contactName.split(' ')[0] || input.contactName,
                            lastName: input.contactName.split(' ').slice(1).join(' ') || '',
                            company: input.businessName,
                            zip: input.zip
                        },
                        payment: input.opaqueData
                            ? {
                                opaqueData: {
                                    dataDescriptor: input.opaqueData.dataDescriptor,
                                    dataValue: input.opaqueData.dataValue
                                }
                            }
                            : {
                                creditCard: {
                                    cardNumber: input.cardNumber,
                                    expirationDate: input.expirationDate,
                                    cardCode: input.cvv
                                }
                            }
                    }]
                },
                validationMode: IS_PRODUCTION ? 'liveMode' : 'testMode'
            }
        };

        const profileResp = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerProfilePayload)
        });

        const profileJson: any = await profileResp.json().catch(() => null);

        if (profileJson?.messages?.resultCode !== 'Ok') {
            logger.error('Authorize.Net profile creation failed', profileJson);
            await claimRef.update({
                status: 'payment_failed',
                paymentError: profileJson?.messages?.message?.[0]?.text || 'Profile creation failed',
                updatedAt: FieldValue.serverTimestamp()
            });
            return {
                success: false,
                error: profileJson?.messages?.message?.[0]?.text || 'Failed to create payment profile.'
            };
        }

        const customerProfileId = profileJson.customerProfileId;
        const customerPaymentProfileId = profileJson.customerPaymentProfileIdList?.[0];

        if (!customerProfileId || !customerPaymentProfileId) {
            logger.error('Missing profile IDs from Authorize.Net', profileJson);
            await claimRef.update({ status: 'payment_error' });
            return { success: false, error: 'Payment profile incomplete.' };
        }

        // Create recurring subscription
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const startDateStr = startDate.toISOString().slice(0, 10);

        const createSubPayload = {
            ARBCreateSubscriptionRequest: {
                merchantAuthentication: {
                    name: API_LOGIN_ID,
                    transactionKey: TRANSACTION_KEY
                },
                subscription: {
                    name: `${input.planId === 'founders_claim' ? 'Founders Claim' : 'Claim Pro'} - ${input.businessName}`,
                    paymentSchedule: {
                        interval: { length: 1, unit: 'months' },
                        startDate: startDateStr,
                        totalOccurrences: 9999
                    },
                    amount: price.toFixed(2),
                    trialAmount: '0.00',
                    profile: {
                        customerProfileId,
                        customerPaymentProfileId
                    },
                    customer: {
                        id: claimId,
                        email: input.contactEmail
                    }
                }
            }
        };

        const subResp = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createSubPayload)
        });

        const subJson: any = await subResp.json().catch(() => null);

        if (subJson?.messages?.resultCode !== 'Ok') {
            logger.error('Authorize.Net subscription creation failed', subJson);
            await claimRef.update({
                status: 'subscription_failed',
                paymentError: subJson?.messages?.message?.[0]?.text || 'Subscription creation failed',
                updatedAt: FieldValue.serverTimestamp()
            });
            return {
                success: false,
                error: subJson?.messages?.message?.[0]?.text || 'Failed to create subscription.'
            };
        }

        const subscriptionId = subJson.subscriptionId;

        // 6. Update claim with successful subscription
        await claimRef.update({
            status: 'pending_verification',
            subscriptionId,
            customerProfileId,
            customerPaymentProfileId,
            subscriptionStartDate: startDateStr,
            updatedAt: FieldValue.serverTimestamp()
        });

        logger.info('Claim subscription created successfully', {
            claimId,
            subscriptionId,
            planId: input.planId,
            price
        });

        return {
            success: true,
            claimId,
            subscriptionId
        };

    } catch (error: any) {
        logger.error('Error creating claim subscription:', error);
        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.'
        };
    }
}
