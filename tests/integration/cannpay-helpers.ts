/**
 * CannPay Testing Helpers
 * Utilities for testing CannPay integration in sandbox environment
 */

import crypto from 'crypto';

/**
 * Generate HMAC SHA-256 signature for webhook verification testing
 */
export function generateCannPaySignature(
    payload: string,
    secret: string
): string {
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
}

/**
 * Create mock CannPay webhook payload for testing
 */
export function createMockWebhookPayload(overrides?: Partial<CannPayWebhookData>) {
    const defaultPayload: CannPayWebhook = {
        type: 'transaction.completed',
        data: {
            intent_id: `int_test_${Date.now()}`,
            transaction_number: `txn_test_${Date.now()}`,
            amount: 10050,
            tip_amount: 0,
            delivery_fee: 50,
            status: 'Success',
            passthrough: JSON.stringify({
                orderId: 'test-order-123',
                organizationId: 'test-org-456'
            }),
            ...overrides
        }
    };

    return defaultPayload;
}

/**
 * Simulate CannPay webhook POST request
 */
export async function simulateCannPayWebhook(
    payload: CannPayWebhook,
    secret: string,
    webhookUrl: string = '/api/webhooks/cannpay'
) {
    const body = JSON.stringify(payload);
    const signature = generateCannPaySignature(body, secret);

    const response = await fetch(`http://localhost:3001${webhookUrl}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-cannpay-signature': signature
        },
        body
    });

    return {
        status: response.status,
        data: await response.json()
    };
}

/**
 * Create test payment intent (sandbox only)
 */
export async function createTestPaymentIntent(amount: number = 10050) {
    if (process.env.CANPAY_ENVIRONMENT !== 'sandbox') {
        throw new Error('Test payment intents can only be created in sandbox environment');
    }

    const response = await fetch('http://localhost:3001/api/checkout/cannpay/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            amount,
            deliveryFee: 50,
            merchantOrderId: `test_${Date.now()}`
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to create payment intent: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Test scenarios for CannPay integration
 */
export const testScenarios = {
    successfulPayment: {
        type: 'transaction.completed' as const,
        data: {
            intent_id: 'int_success_123',
            transaction_number: 'txn_success_456',
            amount: 10050,
            status: 'Success' as const,
            tip_amount: 0,
            delivery_fee: 50
        }
    },

    failedPayment: {
        type: 'transaction.failed' as const,
        data: {
            intent_id: 'int_failed_123',
            status: 'Failed' as const,
            error_message: 'Insufficient funds'
        }
    },

    cancelledPayment: {
        type: 'transaction.cancelled' as const,
        data: {
            intent_id: 'int_cancelled_123',
            status: 'Voided' as const
        }
    },

    settledPayment: {
        type: 'transaction.settled' as const,
        data: {
            intent_id: 'int_settled_123',
            transaction_number: 'txn_settled_456',
            amount: 10050,
            status: 'Settled' as const
        }
    }
};

/**
 * Webhook event types
 */
interface CannPayWebhook {
    type: 'transaction.completed' | 'transaction.failed' | 'transaction.cancelled' | 'transaction.settled';
    data: CannPayWebhookData;
}

interface CannPayWebhookData {
    intent_id: string;
    transaction_number?: string;
    amount?: number;
    tip_amount?: number;
    delivery_fee?: number;
    status: 'Success' | 'Failed' | 'Voided' | 'Settled' | 'Pending';
    error_message?: string;
    passthrough?: string;
}

/**
 * Verify CannPay sandbox credentials are configured
 */
export function verifySandboxSetup(): { isValid: boolean; missing: string[] } {
    const required = [
        'CANPAY_APP_KEY',
        'CANPAY_API_SECRET',
        'CANPAY_INTEGRATOR_ID',
        'CANPAY_INTERNAL_VERSION'
    ];

    const missing = required.filter(key => !process.env[key]);

    return {
        isValid: missing.length === 0 && process.env.CANPAY_ENVIRONMENT === 'sandbox',
        missing
    };
}

/**
 * Generate ngrok configuration for webhook testing
 */
export function getNgrokConfig() {
    return {
        message: 'Start ngrok with: npx ngrok http 3001',
        webhookPath: '/api/webhooks/cannpay',
        exampleUrl: 'https://YOUR_NGROK_URL.ngrok.io/api/webhooks/cannpay',
        inspectorUrl: 'http://localhost:4040'
    };
}
