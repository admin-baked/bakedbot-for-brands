/**
 * Payment Configuration & Business Rules
 * Defines supported payment methods and rules for their availability.
 */

export enum PaymentMethod {
    PAY_AT_PICKUP = 'PAY_AT_PICKUP',
    CANNPAY = 'CANNPAY', // SmokeyPay (Loyalty/Bank)
    STRIPE = 'STRIPE',
    AUTHORIZE_NET = 'AUTHORIZE_NET',
}

export enum ProductType {
    CANNABIS = 'CANNABIS',
    HEMP = 'HEMP',
    ACCESSORY = 'ACCESSORY',
    SUBSCRIPTION = 'SUBSCRIPTION',
}

export interface PaymentOption {
    id: PaymentMethod;
    label: string;
    description: string;
    isAvailable: boolean;
}

/**
 * Determines available payment methods based on cart contents and retailer configuration.
 * 
 * RULES:
 * 1. PAY_AT_PICKUP is always available (Core Option).
 * 2. CANNPAY is the ONLY online payment method for CANNABIS.
 * 3. STRIPE/AUTHORIZE_NET are ONLY for HEMP, ACCESSORIES, or SUBSCRIPTIONS.
 * 4. If cart contains ANY Cannabis items, Stripe/AuthNet must be disabled.
 */
export function getAvailablePaymentMethods(
    cartHasCannabis: boolean,
    retailerConfig: { hasCannPay: boolean; hasStripe: boolean; hasAuthNet: boolean }
): PaymentOption[] {
    const options: PaymentOption[] = [
        {
            id: PaymentMethod.PAY_AT_PICKUP,
            label: 'Pay at Pickup',
            description: 'Pay when you pick up your order at the dispensary.',
            isAvailable: true, // Always available
        },
    ];

    // Cannabis Payment Rule
    if (retailerConfig.hasCannPay) {
        options.push({
            id: PaymentMethod.CANNPAY,
            label: 'CannPay (SmokeyPay)',
            description: 'Secure bank transfer or loyalty points.',
            isAvailable: true, // Valid for both Cannabis and Non-Cannabis
        });
    }

    // Hemp/Accessory Payment Rule (Strict Separation)
    if (!cartHasCannabis) {
        if (retailerConfig.hasStripe) {
            options.push({
                id: PaymentMethod.STRIPE,
                label: 'Credit Card (Stripe)',
                description: 'Secure credit card payment.',
                isAvailable: true,
            });
        }
        if (retailerConfig.hasAuthNet) {
            options.push({
                id: PaymentMethod.AUTHORIZE_NET,
                label: 'Credit Card (Authorize.net)',
                description: 'Secure credit card payment.',
                isAvailable: true,
            });
        }
    }

    return options;
}
