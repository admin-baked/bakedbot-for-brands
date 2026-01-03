'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { PRICING_PLANS } from '@/lib/config/pricing';
import { createCustomerProfile, createSubscriptionFromProfile } from '@/lib/payments/authorize-net';
import { PlanId, computeMonthlyAmount, CoveragePackId, COVERAGE_PACKS } from '@/lib/plans';

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
    coveragePackIds?: CoveragePackId[];
    // Payment (from Accept.js)
    opaqueData?: {
        dataDescriptor: string;
        dataValue: string;
    };
    // Fallback for testing
    // Fallback for testing
    cardNumber?: string;
    expirationDate?: string;
    cvv?: string;
    zip?: string;
    // Linking
    orgId?: string;
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

        // 1b. Validate Existing Org (if claiming specific entity)
        if (input.orgId) {
            const orgDoc = await firestore.collection('organizations').doc(input.orgId).get();
            if (!orgDoc.exists) {
                return { success: false, error: 'Organization not found.' };
            }
            if (orgDoc.data()?.claimStatus === 'claimed') {
                return { success: false, error: 'This organization has already been claimed.' };
            }
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

        const price = computeMonthlyAmount(input.planId, 1, input.coveragePackIds);

        // 3. Create the claim record first (pending status)
        const claimRef = await firestore
            .collection('foot_traffic')
            .doc('data')
            .collection('claims')
            .add({
                orgId: input.orgId || null, // Link to existing org
                businessName: input.businessName,
                businessAddress: input.businessAddress,
                contactName: input.contactName,
                contactEmail: input.contactEmail,
                contactPhone: input.contactPhone,
                role: input.role,
                planId: input.planId,
                packIds: input.coveragePackIds || [],
                planPrice: price,
                status: 'pending_payment',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                source: 'claim_wizard'
            });

        const claimId = claimRef.id;

        // 3b. Update CRM Record if linked
        if (input.orgId) {
            // Try to update in both CRM collections
            // First try by ID (if it's a CRM ID) then by seoPageId (if it's a page ID)
            const collections = ['crm_brands', 'crm_dispensaries'];
            for (const coll of collections) {
                // Try direct ID
                const docRef = firestore.collection(coll).doc(input.orgId);
                const doc = await docRef.get();
                if (doc.exists) {
                    await docRef.update({ 
                        claimStatus: 'claimed', 
                        updatedAt: FieldValue.serverTimestamp() 
                    });
                    break;
                }
                
                // Try seoPageId query
                const snap = await firestore.collection(coll).where('seoPageId', '==', input.orgId).limit(1).get();
                if (!snap.empty) {
                    await snap.docs[0].ref.update({ 
                        claimStatus: 'claimed', 
                        updatedAt: FieldValue.serverTimestamp() 
                    });
                    break;
                }
            }
        }

        // 4. If free plan (shouldn't happen for claim plans, but handle it)
        if (price === 0) {
            await claimRef.update({
                status: 'pending_verification',
                subscriptionId: null,
                updatedAt: FieldValue.serverTimestamp()
            });

            if (input.orgId) {
                await firestore.collection('organizations').doc(input.orgId).update({
                    claimStatus: 'pending_verification',
                    claimId: claimId,
                    updatedAt: FieldValue.serverTimestamp()
                });
            }

            return { success: true, claimId };
        }

        // 5. Process payment via Authorize.Net
        try {
            // Create customer profile
            const address = {
                firstName: input.contactName.split(' ')[0] || input.contactName,
                lastName: input.contactName.split(' ').slice(1).join(' ') || '',
                company: input.businessName,
                zip: input.zip
            };

            const paymentProfile = {
                cardNumber: input.cardNumber,
                expirationDate: input.expirationDate,
                cardCode: input.cvv,
                opaqueData: input.opaqueData
            };
            
            const profile = await createCustomerProfile(
                claimId,
                input.contactEmail,
                address,
                paymentProfile,
                `Claim: ${input.businessName}`
            );

            // Create recurring subscription
            // Start tomorrow
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const startDate = tomorrow.toISOString().split('T')[0];

            const planName = `${input.planId === 'founders_claim' ? 'Founders Claim' : 'Claim Pro'} - ${input.businessName}`;

            const sub = await createSubscriptionFromProfile(
                {
                    name: planName,
                    amount: price,
                    startDate: startDate,
                    intervalMonths: 1
                },
                profile.customerProfileId,
                profile.customerPaymentProfileId,
                claimId
            );

            // 6. Update claim with successful subscription
            await claimRef.update({
                status: 'pending_verification',
                subscriptionId: sub.subscriptionId,
                customerProfileId: profile.customerProfileId,
                customerPaymentProfileId: profile.customerPaymentProfileId,
                subscriptionStartDate: startDate,
                updatedAt: FieldValue.serverTimestamp()
            });

            // 7. Update Organization status if linked
            if (input.orgId) {
                await firestore.collection('organizations').doc(input.orgId).update({
                    claimStatus: 'pending_verification',
                    claimId: claimId,
                    updatedAt: FieldValue.serverTimestamp()
                });
            }

            logger.info('Claim subscription created successfully', {
                claimId,
                subscriptionId: sub.subscriptionId,
                planId: input.planId,
                price
            });

            return {
                success: true,
                claimId,
                subscriptionId: sub.subscriptionId
            };
            
        } catch (error: any) {
             logger.error('Payment processing failed:', error);
             await claimRef.update({
                status: 'payment_failed',
                paymentError: error.message || 'Payment processing failed',
                updatedAt: FieldValue.serverTimestamp()
            });
            return {
                success: false,
                error: error.message || 'Payment processing failed.'
            };
        }
    } catch (error: any) {
        logger.error('Claim creation failed:', error);
        return { success: false, error: error.message || 'An unknown error occurred.' };
    }
}

/**
 * Fetch organization details to pre-fill claim form
 */
export async function getOrganizationForClaim(orgId: string): Promise<{ 
    id: string; 
    name: string; 
    address?: string; 
    claimStatus?: string 
} | null> {
    try {
        const { firestore } = await createServerClient();
        const doc = await firestore.collection('organizations').doc(orgId).get();
        if (doc.exists) {
            const data = doc.data();
            return {
                id: doc.id,
                name: data?.name || '',
                address: data?.address || '',
                claimStatus: data?.claimStatus || 'unclaimed'
            };
        }

        // Search CRM collections if not found in organizations
        const collections = ['crm_brands', 'crm_dispensaries'];
        for (const coll of collections) {
            // Check by ID
            const crmDoc = await firestore.collection(coll).doc(orgId).get();
            if (crmDoc.exists) {
                const data = crmDoc.data();
                return {
                    id: crmDoc.id,
                    name: data?.name || '',
                    address: data?.address || '',
                    claimStatus: data?.claimStatus || 'unclaimed'
                };
            }

            // Check by seoPageId
            const snap = await firestore.collection(coll).where('seoPageId', '==', orgId).limit(1).get();
            if (!snap.empty) {
                const data = snap.docs[0].data();
                return {
                    id: snap.docs[0].id,
                    name: data?.name || '',
                    address: data?.address || '',
                    claimStatus: data?.claimStatus || 'unclaimed'
                };
            }
        }

        return null;
    } catch (e) {
        console.error("Error fetching org for claim", e);
        return null;
    }
}
