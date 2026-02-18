// src/lib/authorize-net.ts
/**
 * Authorize.net Integration Library
 * Uses the JSON API to process payments
 */

import { logger } from '@/lib/logger';

function getConfig() {
    const authnetEnv = (process.env.AUTHNET_ENV || '').toLowerCase();
    const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();

    return {
        API_LOGIN_ID: process.env.AUTHNET_API_LOGIN_ID,
        TRANSACTION_KEY: process.env.AUTHNET_TRANSACTION_KEY,
        AUTHNET_ENV: authnetEnv || 'sandbox',
        IS_PRODUCTION: authnetEnv === 'production' || nodeEnv === 'production',
        FORCE_MOCK: process.env.AUTHNET_FORCE_MOCK === 'true',
    };
}

function getAPIEndpoint(isProduction: boolean) {
    return isProduction
        ? 'https://api2.authorize.net/xml/v1/request.api'
        : 'https://apitest.authorize.net/xml/v1/request.api';
}

export type PaymentRequest = {
    amount: number;
    cardNumber?: string;
    expirationDate?: string;
    cvv?: string;
    opaqueData?: {
        dataDescriptor: string;
        dataValue: string;
    };
    orderId?: string;
    description?: string;
    customer?: {
        email?: string;
        firstName?: string;
        lastName?: string;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
    };
};

export type PaymentResponse = {
    success: boolean;
    transactionId?: string;
    responseCode?: string;
    message?: string;
    errors?: string[];
};

/**
 * Create a transaction (Auth & Capture)
 */
export async function createTransaction(payment: PaymentRequest): Promise<PaymentResponse> {
    const { API_LOGIN_ID, TRANSACTION_KEY, IS_PRODUCTION, AUTHNET_ENV, FORCE_MOCK } = getConfig();
    const hasCredentials = !!(API_LOGIN_ID && TRANSACTION_KEY);

    const shouldMock = FORCE_MOCK || (!IS_PRODUCTION && !hasCredentials);

    // Never allow mock transactions in production.
    if (shouldMock && !IS_PRODUCTION) {
        logger.warn('Using MOCK transaction for non-production Authorize.net checkout', {
            nodeEnv: process.env.NODE_ENV,
            authnetEnv: AUTHNET_ENV,
            amount: payment.amount,
            hasCredentials,
            forced: FORCE_MOCK,
        });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        return {
            success: true,
            transactionId: `mock_tx_${Date.now()}`,
            message: 'Transaction approved (MOCK)',
        };
    }

    if (!hasCredentials) {
        logger.error('Authorize.net credentials missing');
        return {
            success: false,
            message: 'Payment configuration error',
            errors: ['Missing API credentials'],
        };
    }

    const API_ENDPOINT = getAPIEndpoint(IS_PRODUCTION);

    const requestBody = {
        createTransactionRequest: {
            merchantAuthentication: {
                name: API_LOGIN_ID,
                transactionKey: TRANSACTION_KEY,
            },
            refId: payment.orderId || `ref_${Date.now()}`,
            transactionRequest: {
                transactionType: 'authCaptureTransaction',
                amount: payment.amount.toFixed(2),
                payment: payment.opaqueData
                    ? {
                        opaqueData: {
                            dataDescriptor: payment.opaqueData.dataDescriptor,
                            dataValue: payment.opaqueData.dataValue,
                        },
                    }
                    : {
                        creditCard: {
                            cardNumber: payment.cardNumber,
                            expirationDate: payment.expirationDate,
                            cardCode: payment.cvv,
                        },
                    },
                order: {
                    invoiceNumber: payment.orderId,
                    description: payment.description || 'BakedBot Order',
                },
                customer: {
                    email: payment.customer?.email,
                },
                billTo: {
                    firstName: payment.customer?.firstName,
                    lastName: payment.customer?.lastName,
                    address: payment.customer?.address,
                    city: payment.customer?.city,
                    state: payment.customer?.state,
                    zip: payment.customer?.zip,
                    country: 'US',
                },
            },
        },
    };

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        // The API returns a BOM (Byte Order Mark) sometimes, so we need to handle that or just parse JSON
        const data = await response.json();

        if (data.messages.resultCode === 'Ok') {
            const txResponse = data.transactionResponse;
            if (txResponse.responseCode === '1') {
                return {
                    success: true,
                    transactionId: txResponse.transId,
                    message: 'Transaction approved',
                };
            } else {
                return {
                    success: false,
                    transactionId: txResponse.transId,
                    responseCode: txResponse.responseCode,
                    message: 'Transaction declined',
                    errors: txResponse.errors?.map((e: { errorCode: string; errorText: string }) => `${e.errorCode}: ${e.errorText}`) || [],
                };
            }
        } else {
            const errors = data.messages.message.map((m: { code: string; text: string }) => `${m.code}: ${m.text}`);
            logger.error('[Authorize.net] Transaction failed', {
                resultCode: data.messages.resultCode,
                errors,
                amount: payment.amount
            });
            return {
                success: false,
                message: 'Transaction failed',
                errors,
            };
        }
    } catch (error: unknown) {
        logger.error('Authorize.net transaction error:', error as Record<string, unknown>);
        return {
            success: false,
            message: 'Payment processing error',
            errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
    }
}
