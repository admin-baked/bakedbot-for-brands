// src/lib/smokey-pay.ts
/**
 * SmokeyPay (CannPay) payment integration
 * Flexible integration layer with test mode support
 */

export type PaymentMethod = 'smokey_pay' | 'cash' | 'debit';

export type PaymentIntent = {
    id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
    customerId?: string;
    metadata?: Record<string, any>;
    createdAt: string;
};

export type PaymentResult = {
    success: boolean;
    paymentIntentId?: string;
    error?: string;
    transactionId?: string;
};

const SMOKEY_PAY_API_URL = process.env.SMOKEY_PAY_API_URL || 'https://api.smokeypay.com/v1';
const SMOKEY_PAY_API_KEY = process.env.SMOKEY_PAY_API_KEY;
const SMOKEY_PAY_TEST_MODE = process.env.SMOKEY_PAY_TEST_MODE === 'true' || !SMOKEY_PAY_API_KEY;

/**
 * Create a payment intent for SmokeyPay
 */
export async function createPaymentIntent(
    amount: number,
    metadata?: Record<string, any>
): Promise<PaymentIntent> {
    // Test mode - return mock payment intent
    if (SMOKEY_PAY_TEST_MODE) {
        return {
            id: `pi_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            amount,
            currency: 'usd',
            status: 'pending',
            metadata,
            createdAt: new Date().toISOString(),
        };
    }

    // Real API call
    try {
        const response = await fetch(`${SMOKEY_PAY_API_URL}/payment_intents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SMOKEY_PAY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // Convert to cents
                currency: 'usd',
                metadata,
            }),
        });

        if (!response.ok) {
            throw new Error(`SmokeyPay API error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to create payment intent:', error);
        throw error;
    }
}

/**
 * Confirm a payment intent
 */
export async function confirmPayment(
    paymentIntentId: string,
    paymentMethodId?: string
): Promise<PaymentResult> {
    // Test mode - simulate success
    if (SMOKEY_PAY_TEST_MODE) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        return {
            success: true,
            paymentIntentId,
            transactionId: `txn_test_${Date.now()}`,
        };
    }

    // Real API call
    try {
        const response = await fetch(
            `${SMOKEY_PAY_API_URL}/payment_intents/${paymentIntentId}/confirm`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SMOKEY_PAY_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: paymentMethodId ? JSON.stringify({ payment_method: paymentMethodId }) : undefined,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                error: error.message || 'Payment failed',
            };
        }

        const result = await response.json();

        return {
            success: result.status === 'succeeded',
            paymentIntentId: result.id,
            transactional: result.transaction_id,
        };
    } catch (error) {
        console.error('Failed to confirm payment:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Payment failed',
        };
    }
}

/**
 * Get payment intent status
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
    // Test mode - return mock
    if (SMOKEY_PAY_TEST_MODE) {
        return {
            id: paymentIntentId,
            amount: 0,
            currency: 'usd',
            status: 'succeeded',
            createdAt: new Date().toISOString(),
        };
    }

    // Real API call
    try {
        const response = await fetch(`${SMOKEY_PAY_API_URL}/payment_intents/${paymentIntentId}`, {
            headers: {
                'Authorization': `Bearer ${SMOKEY_PAY_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to get payment intent:', error);
        return null;
    }
}

/**
 * Cancel a payment intent
 */
export async function cancelPayment(paymentIntentId: string): Promise<boolean> {
    // Test mode - return success
    if (SMOKEY_PAY_TEST_MODE) {
        return true;
    }

    // Real API call
    try {
        const response = await fetch(
            `${SMOKEY_PAY_API_URL}/payment_intents/${paymentIntentId}/cancel`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SMOKEY_PAY_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.ok;
    } catch (error) {
        console.error('Failed to cancel payment:', error);
        return false;
    }
}

/**
 * Check if SmokeyPay is in test mode
 */
export function isTestMode(): boolean {
    return SMOKEY_PAY_TEST_MODE;
}
