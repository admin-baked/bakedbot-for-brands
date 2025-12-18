// src/app/api/subscriptions/coverage-pack/route.ts
/**
 * Coverage Pack Subscription API
 * Uses Authorize.net for recurring payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import { cookies } from 'next/headers';
import { COVERAGE_PACKS, type CoveragePackTier } from '@/types/subscriptions';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const AUTHORIZE_LOGIN_ID = process.env.AUTHORIZE_NET_LOGIN_ID;
const AUTHORIZE_TRANSACTION_KEY = process.env.AUTHORIZE_NET_TRANSACTION_KEY;

const API_ENDPOINT = IS_PRODUCTION
    ? 'https://api2.authorize.net/xml/v1/request.api'
    : 'https://apitest.authorize.net/xml/v1/request.api';

interface SubscribeToCoveragePackRequest {
    packId: CoveragePackTier;
    billingPeriod: 'monthly' | 'annual';
    opaqueData?: {
        dataDescriptor: string;
        dataValue: string;
    };
    cardNumber?: string;
    expirationDate?: string;
    cvv?: string;
    zip?: string;
    businessName: string;
    contactName: string;
    contactEmail: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: SubscribeToCoveragePackRequest = await request.json();
        const {
            packId,
            billingPeriod,
            opaqueData,
            cardNumber,
            expirationDate,
            cvv,
            zip,
            businessName,
            contactName,
            contactEmail,
        } = body;

        // Get user ID from session
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
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

        // Check Authorize.net credentials
        if (!AUTHORIZE_LOGIN_ID || !AUTHORIZE_TRANSACTION_KEY) {
            logger.error('Authorize.net credentials missing');
            return NextResponse.json(
                { success: false, error: 'Payment processing unavailable' },
                { status: 500 }
            );
        }

        const firestore = getAdminFirestore();

        // Calculate amount (pack.price is in cents)
        // Annual = 10 months for price of 12 (discount)
        const monthlyAmount = pack.price / 100; // Convert cents to dollars
        const amount = billingPeriod === 'annual'
            ? monthlyAmount * 10  // 2 months free on annual
            : monthlyAmount;

        const intervalLength = billingPeriod === 'annual' ? 12 : 1;

        // Build payment data
        let paymentData: any;
        if (opaqueData) {
            paymentData = {
                opaqueData: {
                    dataDescriptor: opaqueData.dataDescriptor,
                    dataValue: opaqueData.dataValue,
                },
            };
        } else if (cardNumber && expirationDate) {
            paymentData = {
                creditCard: {
                    cardNumber,
                    expirationDate,
                    cardCode: cvv,
                },
            };
        } else {
            return NextResponse.json(
                { success: false, error: 'Payment method required' },
                { status: 400 }
            );
        }

        // Create customer profile
        const profileRequest = {
            createCustomerProfileRequest: {
                merchantAuthentication: {
                    name: AUTHORIZE_LOGIN_ID,
                    transactionKey: AUTHORIZE_TRANSACTION_KEY,
                },
                profile: {
                    email: contactEmail,
                    description: `${businessName} - ${pack.name}`,
                    paymentProfiles: {
                        billTo: {
                            firstName: contactName.split(' ')[0],
                            lastName: contactName.split(' ').slice(1).join(' ') || contactName,
                            company: businessName,
                            zip: zip || '00000',
                        },
                        payment: paymentData,
                    },
                },
            },
        };

        const profileResponse = await fetch(API_ENDPOINT, {
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
        const paymentProfileId = profileJson.customerPaymentProfileIdList?.[0];

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
                    name: AUTHORIZE_LOGIN_ID,
                    transactionKey: AUTHORIZE_TRANSACTION_KEY,
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

        const subResponse = await fetch(API_ENDPOINT, {
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
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// GET: Retrieve current subscription
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

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
