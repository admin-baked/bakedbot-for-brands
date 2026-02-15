/**
 * Payment Configuration & Business Rules
 * Defines supported payment methods and rules for their availability.
 *
 * AI-THREAD: [Claude @ 2026-02-15] AEROPAY-INTEGRATION
 * Added Aeropay as bank transfer payment method for cannabis products.
 */

export enum PaymentMethod {
    PAY_AT_PICKUP = 'PAY_AT_PICKUP',
    CANNPAY = 'CANNPAY', // SmokeyPay (Loyalty/Bank)
    AEROPAY = 'AEROPAY', // Aeropay (Bank Transfer)
    CREDIT_CARD = 'CREDIT_CARD', // Authorize.net
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
 * 2. CANNPAY is an online payment method for CANNABIS (bank transfer + loyalty).
 * 3. AEROPAY is an online payment method for CANNABIS (bank transfer).
 * 4. CREDIT_CARD (Authorize.net) is ONLY for HEMP, ACCESSORIES, or SUBSCRIPTIONS.
 * 5. If cart contains ANY Cannabis items, Credit Card must be disabled.
 */
export function getAvailablePaymentMethods(
    cartHasCannabis: boolean,
    retailerConfig: { hasCannPay: boolean; hasAeropay: boolean; hasCreditCard: boolean }
): PaymentOption[] {
    const options: PaymentOption[] = [
        {
            id: PaymentMethod.PAY_AT_PICKUP,
            label: 'Pay at Pickup',
            description: 'Pay when you pick up your order at dispensary.',
            isAvailable: true, // Always available
        },
    ];

    // Cannabis Payment Rules
    if (retailerConfig.hasCannPay) {
        options.push({
            id: PaymentMethod.CANNPAY,
            label: 'Smokey Pay',
            description: 'Secure bank transfer or loyalty points.',
            isAvailable: true, // Valid for both Cannabis and Non-Cannabis
        });
    }

    if (retailerConfig.hasAeropay) {
        options.push({
            id: PaymentMethod.AEROPAY,
            label: 'Aeropay',
            description: 'Secure bank transfer powered by Aeropay.',
            isAvailable: true, // Valid for both Cannabis and Non-Cannabis
        });
    }

    // Hemp/Accessory Payment Rule (Strict Separation)
    if (!cartHasCannabis) {
        if (retailerConfig.hasCreditCard) {
            options.push({
                id: PaymentMethod.CREDIT_CARD,
                label: 'Credit Card',
                description: 'Secure credit card payment.',
                isAvailable: true,
            });
        }
    }

    return options;
}
