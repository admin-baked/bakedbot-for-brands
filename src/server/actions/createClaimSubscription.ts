'use server';

import { createServerClient, setUserRole } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { PRICING_PLANS, findPricingPlan } from '@/lib/config/pricing';
import { createCustomerProfile, createSubscriptionFromProfile } from '@/lib/payments/authorize-net';
import { PlanId, computeMonthlyAmount, CoveragePackId, COVERAGE_PACKS } from '@/lib/plans';
import { requireUser } from '@/server/auth/auth';
import { isCompanyPlanCheckoutEnabled } from '@/lib/feature-flags';

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
        if (process.env.NODE_ENV === 'production') {
            logger.error('Error getting founders claim count:', error as Record<string, unknown>);
        } else {
            logger.warn('Error getting founders claim count (local/dev fallback to 0):', {
                error: error instanceof Error ? error.message : String(error ?? 'unknown')
            });
        }
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
        if (!isCompanyPlanCheckoutEnabled()) {
            return { success: false, error: 'Subscription checkout is currently disabled. Please contact sales.' };
        }

        let session;
        try {
            session = await requireUser();
        } catch {
            return { success: false, error: 'Authentication required.' };
        }

        const sessionEmail = typeof session.email === 'string' ? session.email.toLowerCase() : '';
        const requestEmail = input.contactEmail.trim().toLowerCase();
        if (sessionEmail && requestEmail !== sessionEmail) {
            return { success: false, error: 'Contact email must match your signed-in account.' };
        }

        const userId = session.uid;
        const { firestore } = await createServerClient();

        // 1. Validate plan
        const plan = findPricingPlan(input.planId);
        if (!plan) {
            return { success: false, error: 'Invalid plan selected.' };
        }

        // 1b. Validate Existing Org (if claiming specific entity)
        // If the ID exists in our DB, check if it's already claimed.
        // If it doesn't exist (e.g. from external search like CannMenus), treat as a "New" claim (orgId = null for linking purposes momentarily).
        if (input.orgId) {
            const orgDoc = await firestore.collection('organizations').doc(input.orgId).get();
            if (orgDoc.exists) {
                if (orgDoc.data()?.claimStatus === 'claimed') {
                    return { success: false, error: 'This organization has already been claimed.' };
                }
            } else {
                // ID provided but not found in 'organizations'.
                // Check if it's a valid external ID format or just proceed as new.
                // For now, we'll assume it's a new import and proceed, but we won't link it to a non-existent doc.
                // We'll keep input.orgId in the claim record for future reconciliation if needed, 
                // but we won't fail the request.
                logger.warn(`Claim attempted for non-existent orgId: ${input.orgId}. Treating as new claim.`);
                // Setup for future: could trigger a background import here.
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
                userId: userId, // Link to User
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

        // 3a. Ensure User Document Exists & Set Role
        try {
            const userRef = firestore.collection('users').doc(userId);
            const userDoc = await userRef.get();

            // Prepare user data
            const userData: any = {
                email: input.contactEmail,
                displayName: input.contactName,
                phoneNumber: input.contactPhone,
                updatedAt: FieldValue.serverTimestamp(),
                // Flattened role/claims for easy access
                role: input.role,
            };

            // Link org if applicable (provisional, until claimed)
            if (input.orgId) {
                // Keep these fields aligned with the onboarding flow so CEO CRM can resolve org context.
                userData.currentOrgId = input.orgId;
                userData.orgId = input.orgId;
                userData.tenantId = input.orgId;

                if (input.role === 'brand') {
                    userData.brandId = input.orgId;
                }

                if (input.role === 'dispensary') {
                    // Legacy field (some older code paths expect it)
                    userData.dispensaryId = input.orgId;
                    // Canonical field used across most dashboard logic
                    userData.locationId = input.orgId;
                }
            }

            await userRef.set(userData, { merge: true });

            // Set Custom Claims for Auth
            // Cast input.role to valid type or fallback to 'owner' if generic
            const roleType = (input.role === 'brand' || input.role === 'dispensary') ? input.role : 'owner';
            const additionalData: { brandId?: string; locationId?: string; tenantId?: string } = {};
            if (input.role === 'brand' && input.orgId) {
                additionalData.brandId = input.orgId;
                additionalData.tenantId = input.orgId;
            }
            if (input.role === 'dispensary' && input.orgId) {
                additionalData.locationId = input.orgId;
                additionalData.tenantId = input.orgId;
            }
            await setUserRole(userId, roleType as any, additionalData);

            logger.info('User document updated and role set', { userId, role: roleType, claimId });

        } catch (err) {
            logger.error('Failed to update user document during claim', { userId, error: err });
            // Don't fail the claim, but this is critical for access.
        }

        // 3b. Update CRM Record if linked
        if (input.orgId) {
            try {
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
            } catch (error) {
                logger.warn('Failed to update CRM record during claim', { orgId: input.orgId, error });
                // Don't block the claim creation if CRM update fails
            }
        }

        // 4. If free plan - no payment needed
        if (price === 0) {
            await claimRef.update({
                status: 'pending_verification',
                subscriptionId: null,
                updatedAt: FieldValue.serverTimestamp()
            });

            if (input.orgId) {
                const orgRef = firestore.collection('organizations').doc(input.orgId);
                const orgSnap = await orgRef.get();
                if (orgSnap.exists) {
                    await orgRef.update({
                        claimStatus: 'pending_verification',
                        claimId: claimId,
                        updatedAt: FieldValue.serverTimestamp()
                    });
                }
            }

            // 4b. Initialize Free user competitive intelligence (async, non-blocking)
            // This discovers nearby competitors and sets up weekly playbook
            try {
                const { initializeFreeUserCompetitors } = await import('./free-user-setup');

                // Use claim data to construct location (best effort)
                // For now, we'll use the business address or default location
                // TODO: Parse address to get lat/lng or use geocoding
                const location = {
                    lat: 0, // Would be geocoded from businessAddress
                    lng: 0,
                    zip: input.zip || '',
                    city: '', // Would be parsed from businessAddress
                    state: '', // Would be parsed from businessAddress
                };

                // Run asynchronously - don't block claim completion
                initializeFreeUserCompetitors(claimId, location)
                    .then(result => {
                        logger.info('Free user competitor setup completed', {
                            claimId,
                            competitorsCreated: result.competitorsCreated
                        });
                    })
                    .catch(err => {
                        logger.warn('Free user competitor setup failed (non-blocking)', {
                            claimId,
                            error: err.message
                        });
                    });
            } catch (err) {
                logger.warn('Failed to initialize Free user competitors', { claimId, error: err });
                // Non-blocking - continue with successful claim
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

            // 7. Update Organization status if linked and exists
            if (input.orgId) {
                const orgDocRef = firestore.collection('organizations').doc(input.orgId);
                const orgDoc = await orgDocRef.get();
                if (orgDoc.exists) {
                    await orgDocRef.update({
                        claimStatus: 'pending_verification',
                        claimId: claimId,
                        updatedAt: FieldValue.serverTimestamp()
                    });
                }
            }

            // 8. Record subscription in top-level `subscriptions` so CEO analytics/CRM can count revenue.
            // Auth.Net subscription webhooks currently update org subscription docs; we also persist a
            // normalized record here for claim-based billing flows.
            try {
                const providerSubscriptionId = String(sub.subscriptionId);
                if (providerSubscriptionId) {
                    const subDocRef = firestore.collection('subscriptions').doc(providerSubscriptionId);
                    await subDocRef.set({
                        planId: input.planId,
                        planName: plan?.name || (input.planId === 'founders_claim' ? 'Founders Claim' : 'Claim Pro'),
                        price,
                        amount: price,
                        intervalMonths: 1,
                        billingPeriod: 'monthly',
                        status: 'active',
                        transactionId: providerSubscriptionId,
                        providerSubscriptionId,
                        customerProfileId: profile.customerProfileId,
                        customerPaymentProfileId: profile.customerPaymentProfileId,
                        subscriptionStartDate: startDate,
                        customer: {
                            email: input.contactEmail,
                            name: input.contactName,
                            company: input.businessName,
                            phone: input.contactPhone,
                        },
                        orgId: input.orgId || null,
                        userId: userId || null,
                        claimId,
                        source: 'claim_wizard',
                        createdAt: FieldValue.serverTimestamp(),
                        updatedAt: FieldValue.serverTimestamp(),
                    }, { merge: true });
                }
            } catch (error) {
                logger.warn('Failed to persist claim subscription record (non-blocking)', {
                    claimId,
                    providerSubscriptionId: sub?.subscriptionId,
                    error: error instanceof Error ? error.message : String(error ?? 'unknown'),
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
