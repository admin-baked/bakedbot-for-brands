import { logger } from '@/lib/logger';

const AUTHNET_API_LOGIN_ID = process.env.AUTHNET_API_LOGIN_ID;
const AUTHNET_TRANSACTION_KEY = process.env.AUTHNET_TRANSACTION_KEY;
const AUTHNET_ENV = process.env.AUTHNET_ENV || 'sandbox';

const API_ENDPOINT = AUTHNET_ENV === 'production' 
    ? 'https://api2.authorize.net/xml/v1/request.api'
    : 'https://apitest.authorize.net/xml/v1/request.api';

// --- Types ---
interface Address {
    firstName: string;
    lastName: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phoneNumber?: string;
}

interface PaymentDetails {
    cardNumber?: string;
    expirationDate?: string; // YYYY-MM
    cardCode?: string;
    opaqueData?: {
        dataDescriptor: string;
        dataValue: string;
    };
}

interface SubscriptionDetails {
    name: string;
    amount: number;
    startDate: string; // YYYY-MM-DD
    intervalMonths: number;
}

// --- Helper: Execute Request ---
async function executeAuthNetRequest(requestBody: any) {
    if (!AUTHNET_API_LOGIN_ID || !AUTHNET_TRANSACTION_KEY) {
        throw new Error('Authorize.Net credentials missing');
    }

    // Inject credentials
    const payload = {
        [Object.keys(requestBody)[0]]: {
            merchantAuthentication: {
                name: AUTHNET_API_LOGIN_ID,
                transactionKey: AUTHNET_TRANSACTION_KEY,
            },
            ...Object.values(requestBody)[0] as any
        }
    };

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        
        // Handle "BOM" or other JSON parsing artifacts if any (rare in fetch, common in axios)
        return data; 
    } catch (error) {
        logger.error('[AuthNet] Network Error:', error as Record<string, any>);
        throw error;
    }
}

// --- Public Methods ---

export async function createCustomerProfile(
    merchantCustomerId: string,
    email: string,
    billTo: Address,
    payment: PaymentDetails,
    description?: string
) {
    const paymentType = payment.opaqueData 
        ? { opaqueData: payment.opaqueData }
        : { creditCard: { cardNumber: payment.cardNumber, expirationDate: payment.expirationDate, cardCode: payment.cardCode } };

    const request = {
        createCustomerProfileRequest: {
            profile: {
                merchantCustomerId,
                description,
                email,
                paymentProfiles: [{
                    customerType: 'individual',
                    billTo,
                    payment: paymentType
                }]
            },
            // Prevent unsolicited auth-only validation transactions during profile creation.
            // Payment authority is enforced at subscription/order creation time.
            validationMode: 'none'
        }
    };

    const data = await executeAuthNetRequest(request);

    if (data.messages?.resultCode !== 'Ok') {
        const error = data.messages?.message?.[0]?.text;
        logger.error('[AuthNet] createCustomerProfile failed:', error);
        throw new Error(error || 'Profile creation failed');
    }

    return {
        customerProfileId: data.customerProfileId,
        customerPaymentProfileId: data.customerPaymentProfileIdList?.[0]
    };
}

export async function createSubscriptionFromProfile(
    subscription: SubscriptionDetails,
    customerProfileId: string,
    customerPaymentProfileId: string,
    customerIdRef?: string
) {
    const request = {
        ARBCreateSubscriptionRequest: {
            subscription: {
                name: subscription.name,
                paymentSchedule: {
                    interval: { length: subscription.intervalMonths, unit: 'months' },
                    startDate: subscription.startDate,
                    totalOccurrences: 9999,
                },
                amount: subscription.amount.toFixed(2),
                trialAmount: '0.00',
                profile: {
                    customerProfileId,
                    customerPaymentProfileId
                },
                // Optional customer explicit link
                ...(customerIdRef && { customer: { id: customerIdRef } }) // email logic if needed
            }
        }
    };

    const data = await executeAuthNetRequest(request);

    if (data.messages?.resultCode !== 'Ok') {
        const error = data.messages?.message?.[0]?.text;
        logger.error('[AuthNet] createSubscription failed:', error);
        throw new Error(error || 'Subscription creation failed');
    }

    return {
        subscriptionId: data.subscriptionId
    };
}

export async function cancelARBSubscription(subscriptionId: string): Promise<void> {
    const request = {
        ARBCancelSubscriptionRequest: {
            subscriptionId
        }
    };

    const data = await executeAuthNetRequest(request);

    if (data.messages?.resultCode !== 'Ok') {
        const error = data.messages?.message?.[0]?.text;
        logger.error('[AuthNet] cancelARBSubscription failed:', error);
        throw new Error(error || 'Subscription cancellation failed');
    }
}

export async function updateARBSubscription(
    subscriptionId: string,
    newAmount: number
): Promise<void> {
    const request = {
        ARBUpdateSubscriptionRequest: {
            subscriptionId,
            subscription: {
                amount: newAmount.toFixed(2)
            }
        }
    };

    const data = await executeAuthNetRequest(request);

    if (data.messages?.resultCode !== 'Ok') {
        const error = data.messages?.message?.[0]?.text;
        logger.error('[AuthNet] updateARBSubscription failed:', error);
        throw new Error(error || 'Subscription update failed');
    }
}
