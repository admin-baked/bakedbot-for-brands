// src/lib/authorize-net.ts
/**
 * Authorize.net Integration Library
 * Uses the JSON API to process payments
 */

import { logger } from '@/lib/logger';

const API_LOGIN_ID = process.env.AUTHNET_API_LOGIN_ID;
const TRANSACTION_KEY = process.env.AUTHNET_TRANSACTION_KEY;
const IS_PRODUCTION = process.env.AUTHNET_ENV === 'production';

const API_ENDPOINT = IS_PRODUCTION
    ? 'https://api2.authorize.net/xml/v1/request.api'
    : 'https://apitest.authorize.net/xml/v1/request.api';

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
    if (!API_LOGIN_ID || !TRANSACTION_KEY) {
        // MOCK fallback for local development
        if (process.env.NODE_ENV !== 'production') {
            logger.warn('Authorize.net credentials missing - Using MOCK transaction for dev');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
            return {
                success: true,
                transactionId: `mock_tx_${Date.now()}`,
                message: 'Transaction approved (MOCK)',
            };
        }

        logger.error('Authorize.net credentials missing');
        return {
            success: false,
            message: 'Payment configuration error',
            errors: ['Missing API credentials'],
        };
    }

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
                    errors: txResponse.errors?.map((e: any) => `${e.errorCode}: ${e.errorText}`) || [],
                };
            }
        } else {
            return {
                success: false,
                message: 'Transaction failed',
                errors: data.messages.message.map((m: any) => `${m.code}: ${m.text}`),
            };
        }
    } catch (error: any) {
        logger.error('Authorize.net transaction error:', error);
        return {
            success: false,
            message: 'Payment processing error',
            errors: [error.message],
        };
    }
}
