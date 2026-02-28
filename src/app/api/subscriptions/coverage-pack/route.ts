// src/app/api/subscriptions/coverage-pack/route.ts
/**
 * Coverage Pack Subscription API
 * Uses Authorize.net for recurring payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import { z } from 'zod';
import { COVERAGE_PACKS, type CoveragePackTier } from '@/types/subscriptions';
import { requireUser } from '@/server/auth/auth';
import { isCompanyPlanCheckoutEnabled } from '@/lib/feature-flags';

function getAuthNetEndpoint(): string {
    const env = (process.env.AUTHNET_ENV || '').toLowerCase();
    const isProduction = env === 'production' || (process.env.NODE_ENV || '').toLowerCase() === 'production';
    return isProduction
        ? 'https://api2.authorize.net/xml/v1/request.api'
        : 'https://apitest.authorize.net/xml/v1/request.api';
}

function getAuthNetCredentials(): { loginId: string; transactionKey: string } | null {
    const loginId =
        process.env.AUTHORIZE_NET_LOGIN_ID ||
        process.env.AUTHNET_API_LOGIN_ID ||
        process.env.AUTHORIZENET_LOGIN_ID ||
        process.env.AUTHORIZENET_API_LOGIN_ID ||
        '';
    const transactionKey =
        process.env.AUTHORIZE_NET_TRANSACTION_KEY ||
        process.env.AUTHNET_TRANSACTION_KEY ||
        process.env.AUTHORIZENET_TRANSACTION_KEY ||
        '';

    if (!loginId || !transactionKey) {
        return null;
    }

    return { loginId, transactionKey };
}

const subscribeSchema = z.object({
    packId: z.custom<CoveragePackTier>((value) => {
        return typeof value === 'string' && COVERAGE_PACKS.some(p => p.id === value);
    }, 'Invalid coverage pack'),
    billingPeriod: z.enum(['monthly', 'annual']),
    opaqueData: z.object({
        dataDescriptor: z.string().trim().min(1).max(120),
        dataValue: z.string().trim().min(1),
    }),
    zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code').optional(),
    businessName: z.string().trim().min(1).max(160),
    contactName: z.string().trim().min(1).max(120),
    contactEmail: z.string().trim().email(),
}).strict();

export async function POST(request: NextRequest) {
    try {
        if (!isCompanyPlanCheckoutEnabled()) {
            return NextResponse.json(
                { success: false, error: 'Subscription checkout is currently disabled. Please contact sales.' },
                { status: 503 }
            );
        }

        let session;
        try {
            session = await requireUser();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        if ((session as any).email_verified === false || (session as any).emailVerified === false) {
            return NextResponse.json(
                { success: false, error: 'Email verification is required before starting a paid subscription.' },
                { status: 403 }
            );
        }
        const body = subscribeSchema.parse(await request.json());
        const {
            packId,
            billingPeriod,
            opaqueData,
            zip,
            businessName,
            contactName,
            contactEmail,
        } = body;
        const userId = session.uid;
        const sessionEmail = typeof session.email === 'string' ? session.email.toLowerCase() : '';
        const normalizedContactEmail = contactEmail.toLowerCase();

        if (sessionEmail && normalizedContactEmail !== sessionEmail) {
            return NextResponse.json(
                { success: false, error: 'Contact email must match your signed-in account.' },
                { status: 403 }
            );
        }

        // Validate pack
        const pack = COVERAGE_PACKS.find(p => p.id === packId);
        if (!pack) {
            return NextResponse.json(
                { success: false, error: 'Invalid coverage pack' },
                { status: 400 }
            );
        }

        const authnetCredentials = getAuthNetCredentials();
        // Check Authorize.net credentials
        if (!authnetCredentials) {
            logger.error('Authorize.net credentials missing');
            return NextResponse.json(
                { success: false, error: 'Payment processing unavailable' },
                { status: 500 }
            );
        }
        const apiEndpoint = getAuthNetEndpoint();

        const firestore = getAdminFirestore();

        // Calculate amount (pack.price is in cents)
        // Annual = 10 months for price of 12 (discount)
        const monthlyAmount = pack.price / 100; // Convert cents to dollars
        const amount = billingPeriod === 'annual'
            ? monthlyAmount * 10  // 2 months free on annual
            : monthlyAmount;

        const intervalLength = billingPeriod === 'annual' ? 12 : 1;

        const paymentData = {
            opaqueData: {
                dataDescriptor: opaqueData.dataDescriptor,
                dataValue: opaqueData.dataValue,
            },
        };

        const nameParts = contactName.split(/\s+/);
        const firstName = nameParts[0] || 'Customer';
        const lastName = nameParts.slice(1).join(' ') || firstName;

        // Create customer profile
        const profileRequest = {
            createCustomerProfileRequest: {
                merchantAuthentication: {
                    name: authnetCredentials.loginId,
                    transactionKey: authnetCredentials.transactionKey,
                },
                profile: {
                    email: contactEmail,
                    description: `${businessName} - ${pack.name}`,
                    paymentProfiles: {
                        billTo: {
                            firstName,
                            lastName,
                            company: businessName,
                            zip: zip || '00000',
                        },
                        payment: paymentData,
                    },
                },
                validationMode: 'none',
            },
        };

        const profileResponse = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileRequest),
        });

        const profileJson = await profileResponse.json();

        if (profileJson.messages?.resultCode !== 'Ok') {
            logger.error('Authorize.net profile creation failed', profileJson);
            return NextResponse.json(
                { success: false, error: profileJson.messages?.message?.[0]?.text || 'Payment failed' },
                { status: 400 }
            );
        }

        const customerProfileId = profileJson.customerProfileId;
        const paymentProfileId =
            profileJson.customerPaymentProfileIdList?.[0] ??
            profileJson.customerPaymentProfileIdList?.customerPaymentProfileId;

        if (!customerProfileId || !paymentProfileId) {
            logger.error('Missing profile IDs from Authorize.net');
            return NextResponse.json(
                { success: false, error: 'Payment setup failed' },
                { status: 400 }
            );
        }

        // Create subscription
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() + 1);

        const subscriptionRequest = {
            ARBCreateSubscriptionRequest: {
                merchantAuthentication: {
                    name: authnetCredentials.loginId,
                    transactionKey: authnetCredentials.transactionKey,
                },
                subscription: {
                    name: `${pack.name} Coverage Pack`,
                    paymentSchedule: {
                        interval: {
                            length: intervalLength,
                            unit: 'months',
                        },
                        startDate: startDate.toISOString().split('T')[0],
                        totalOccurrences: 9999,
                    },
                    amount: amount.toFixed(2),
                    profile: {
                        customerProfileId,
                        customerPaymentProfileId: paymentProfileId,
                    },
                },
            },
        };

        const subResponse = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscriptionRequest),
        });

        const subJson = await subResponse.json();

        if (subJson.messages?.resultCode !== 'Ok') {
            logger.error('Authorize.net subscription creation failed', subJson);
            return NextResponse.json(
                { success: false, error: subJson.messages?.message?.[0]?.text || 'Subscription failed' },
                { status: 400 }
            );
        }

        const subscriptionId = subJson.subscriptionId;

        // Save subscription to Firestore
        const subscriptionRef = firestore.collection('subscriptions').doc();
        const now = new Date();

        await subscriptionRef.set({
            id: subscriptionRef.id,
            userId,
            packId,
            packName: pack.name,
            tier: pack.id,
            status: 'active',
            billingPeriod,
            amount,
            authorizeNetSubscriptionId: subscriptionId,
            authorizeNetCustomerProfileId: customerProfileId,
            authorizeNetPaymentProfileId: paymentProfileId,
            businessName,
            contactEmail,
            createdAt: now,
            currentPeriodStart: startDate,
            currentPeriodEnd: new Date(startDate.getTime() + intervalLength * 30 * 24 * 60 * 60 * 1000),
        });

        // Update user's subscription
        await firestore.collection('users').doc(userId).update({
            'subscription.packId': packId,
            'subscription.tier': pack.id,
            'subscription.status': 'active',
            'subscription.subscriptionId': subscriptionRef.id,
            'subscription.updatedAt': now,
        });

        // Log event
        await firestore.collection('events').add({
            type: 'subscription.created',
            userId,
            payload: {
                subscriptionId: subscriptionRef.id,
                packId,
                amount,
                billingPeriod,
            },
            createdAt: now,
        });

        logger.info('Coverage pack subscription created', {
            subscriptionId: subscriptionRef.id,
            userId,
            packId,
        });

        return NextResponse.json({
            success: true,
            subscriptionId: subscriptionRef.id,
            packId,
            packName: pack.name,
        });

    } catch (error: any) {
        logger.error('Coverage pack subscription failed:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.issues[0]?.message || 'Invalid request payload' },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// GET: Retrieve current subscription
export async function GET(request: NextRequest) {
    try {
        let session;
        try {
            session = await requireUser();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }
        const userId = session.uid;

        const firestore = getAdminFirestore();

        const userDoc = await firestore.collection('users').doc(userId).get();
        const user = userDoc.data();

        if (!user?.subscription) {
            return NextResponse.json({
                success: true,
                subscription: null,
            });
        }

        return NextResponse.json({
            success: true,
            subscription: user.subscription,
        });

    } catch (error: any) {
        logger.error('Get subscription failed:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
