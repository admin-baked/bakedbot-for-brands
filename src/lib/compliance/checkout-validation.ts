/**
 * Checkout Age Verification Middleware
 * Ensures age verification before checkout
 */

import { isAgeVerified } from '@/components/compliance/age-gate';
import { validateStateCompliance } from '@/lib/compliance/state-rules';

export interface CheckoutValidation {
    canProceed: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate checkout compliance
 */
export async function validateCheckout(
    state: string,
    items: any[]
): Promise<CheckoutValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check age verification
    if (!isAgeVerified()) {
        errors.push('Age verification required');
    }

    // Check state compliance for each item
    for (const item of items) {
        const compliance = validateStateCompliance(state, {
            category: item.category,
            thcContent: item.thcPercent || 0,
            quantity: item.qty,
            price: item.price,
        });

        if (!compliance.allowed) {
            errors.push(...compliance.violations);
        }
        if (compliance.warnings.length > 0) {
            warnings.push(...compliance.warnings);
        }
    }

    return {
        canProceed: errors.length === 0,
        errors,
        warnings,
    };
}
