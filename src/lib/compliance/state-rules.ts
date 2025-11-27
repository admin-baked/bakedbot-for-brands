/**
 * State-Specific Cannabis Compliance Rules
 * 
 * NEXT STEPS:
 * 1. Research and populate rules for all states
 * 2. Create admin UI for rule management
 * 3. Implement rules validation engine
 * 4. Add geolocation detection
 * 5. Create compliance warnings UI
 * 
 * IMPORTANT: These rules must be kept up-to-date with current regulations.
 * Consult with legal counsel before deployment.
 */

export interface StateComplianceRules {
    state: string;
    stateCode: string;
    legalStatus: 'legal-recreational' | 'legal-medical' | 'illegal' | 'decriminalized';
    ageRequirement: number;
    allowedProductTypes: string[];
    maxThcPercentage?: number;
    maxPurchaseAmount?: number; // in grams or dollars
    requiresMedicalCard: boolean;
    deliveryAllowed: boolean;
    restrictions: string[];
    lastUpdated: string; // ISO date
}

/**
 * Default compliance rules by state
 * TODO: Complete all states and verify with legal team
 */
export const STATE_RULES: Record<string, StateComplianceRules> = {
    'IL': {
        state: 'Illinois',
        stateCode: 'IL',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'vapes', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 30, // grams for residents
        requiresMedicalCard: false,
        deliveryAllowed: true,
        restrictions: [
            'Out-of-state residents limited to 15g',
            'No public consumption',
            'Must be purchased from licensed dispensary'
        ],
        lastUpdated: '2025-01-01'
    },
    'CA': {
        state: 'California',
        stateCode: 'CA',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'vapes', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 28.5, // grams
        requiresMedicalCard: false,
        deliveryAllowed: true,
        restrictions: [
            'No consumption in public',
            'No consumption while driving',
            'Must be purchased from licensed retailer'
        ],
        lastUpdated: '2025-01-01'
    },
    // TODO: Add remaining states
};

/**
 * Get compliance rules for a state
 */
export function getStateRules(stateCode: string): StateComplianceRules | null {
    return STATE_RULES[stateCode.toUpperCase()] || null;
}

/**
 * Validate if a product is allowed in a state
 * TODO: Implement full validation logic
 */
export function validateProduct(
    stateCode: string,
    productType: string,
    thcPercentage?: number
): { allowed: boolean; reason?: string } {
    const rules = getStateRules(stateCode);

    if (!rules) {
        return { allowed: false, reason: 'State not supported' };
    }

    if (rules.legalStatus === 'illegal') {
        return { allowed: false, reason: 'Cannabis is illegal in this state' };
    }

    if (!rules.allowedProductTypes.includes(productType)) {
        return { allowed: false, reason: `${productType} not allowed in ${rules.state}` };
    }

    if (rules.maxThcPercentage && thcPercentage && thcPercentage > rules.maxThcPercentage) {
        return { allowed: false, reason: `THC percentage exceeds ${rules.maxThcPercentage}% limit` };
    }

    return { allowed: true };
}

/**
 * Validate if an order complies with state rules
 * TODO: Implement order validation
 */
export function validateOrder(
    stateCode: string,
    totalAmount: number,
    hasMedicalCard: boolean
): { allowed: boolean; reason?: string } {
    const rules = getStateRules(stateCode);

    if (!rules) {
        return { allowed: false, reason: 'State not supported' };
    }

    if (rules.requiresMedicalCard && !hasMedicalCard) {
        return { allowed: false, reason: 'Medical card required in this state' };
    }

    if (rules.maxPurchaseAmount && totalAmount > rules.maxPurchaseAmount) {
        return {
            allowed: false,
            reason: `Purchase amount exceeds ${rules.maxPurchaseAmount}g limit`
        };
    }

    return { allowed: true };
}
