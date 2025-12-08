/**
 * State-Specific Cannabis Compliance Rules
 * 
 * ⚠️ CRITICAL LEGAL NOTICE:
 * These rules are approximate and must be verified with legal counsel.
 * Cannabis regulations change frequently and vary significantly by state.
 * BakedBot AI is NOT responsible for compliance violations.
 * 
 * BEFORE LAUNCHING IN ANY STATE:
 * 1. Have a cannabis attorney review all rules
 * 2. Verify current regulations from official state sources
 * 3. Implement geolocation verification
 * 4. Set up audit logging for all compliance checks
 * 5. Add legal disclaimers to user interfaces
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
    'CO': {
        state: 'Colorado',
        stateCode: 'CO',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'vapes', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 28, // grams
        requiresMedicalCard: false,
        deliveryAllowed: true,
        restrictions: [
            'No public consumption',
            'No consumption in vehicles',
            'Purchase limit 1oz flower or 8g concentrate'
        ],
        lastUpdated: '2025-01-01'
    },
    'WA': {
        state: 'Washington',
        stateCode: 'WA',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'vapes', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 28, // grams
        requiresMedicalCard: false,
        deliveryAllowed: false, // WA does not allow recreational delivery
        restrictions: [
            'No home cultivation',
            'No public consumption',
            'No delivery for recreational use'
        ],
        lastUpdated: '2025-01-01'
    },
    // EXPANDED STATE RULES - 2025 Legal Status
    'NY': {
        state: 'New York',
        stateCode: 'NY',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 113, // grams (4oz)
        requiresMedicalCard: false,
        deliveryAllowed: true,
        restrictions: [
            'No public consumption',
            'No consumption while driving',
            'Age verification required'
        ],
        lastUpdated: '2025-01-01'
    },
    'MA': {
        state: 'Massachusetts',
        stateCode: 'MA',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'vapes', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 113, // grams (4oz)
        requiresMedicalCard: false,
        deliveryAllowed: true,
        restrictions: [
            'Edibles must be clearly labeled',
            'No vaping in vehicles',
            'Age verification at purchase required'
        ],
        lastUpdated: '2025-01-01'
    },
    'ME': {
        state: 'Maine',
        stateCode: 'ME',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'vapes', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 113, // grams
        requiresMedicalCard: false,
        deliveryAllowed: true,
        restrictions: [
            'No consumption while driving',
            'No open containers in vehicles'
        ],
        lastUpdated: '2025-01-01'
    },
    'VT': {
        state: 'Vermont',
        stateCode: 'VT',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 113, // grams
        requiresMedicalCard: false,
        deliveryAllowed: false,
        restrictions: [
            'No consumption in public',
            'No DUI implications same as alcohol'
        ],
        lastUpdated: '2025-01-01'
    },
    'CT': {
        state: 'Connecticut',
        stateCode: 'CT',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'vapes', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 113, // grams
        requiresMedicalCard: false,
        deliveryAllowed: true,
        restrictions: [
            'No home cultivation until retailers operational',
            'Age verification required',
            'Social equity program in place'
        ],
        lastUpdated: '2025-01-01'
    },
    'MI': {
        state: 'Michigan',
        stateCode: 'MI',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'vapes', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 113, // grams
        requiresMedicalCard: false,
        deliveryAllowed: true,
        restrictions: [
            'Edibles clearly labeled',
            'No public consumption',
            'Home cultivation allowed (up to 12 plants)'
        ],
        lastUpdated: '2025-01-01'
    },
    'OH': {
        state: 'Ohio',
        stateCode: 'OH',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'vapes', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 113, // grams
        requiresMedicalCard: false,
        deliveryAllowed: true,
        restrictions: [
            'No consumption while driving',
            'Age verification required',
            'Packaging requirements strict'
        ],
        lastUpdated: '2025-01-01'
    },
    'MO': {
        state: 'Missouri',
        stateCode: 'MO',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'vapes', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 113, // grams
        requiresMedicalCard: false,
        deliveryAllowed: true,
        restrictions: [
            'MOCANNABIS Track and Trace system required',
            'Age verification mandatory'
        ],
        lastUpdated: '2025-01-01'
    },
    'NV': {
        state: 'Nevada',
        stateCode: 'NV',
        legalStatus: 'legal-recreational',
        ageRequirement: 21,
        allowedProductTypes: ['flower', 'edibles', 'concentrates', 'vapes', 'topicals'],
        maxThcPercentage: undefined,
        maxPurchaseAmount: 113, // grams (non-residents: 28g)
        requiresMedicalCard: false,
        deliveryAllowed: true,
        restrictions: [
            'Non-residents limited to 28g per purchase',
            'No consumption in public spaces',
            'State system tracking required'
        ],
        lastUpdated: '2025-01-01'
    },
};

/**
 * IMPORTANT: This is a partial list of U.S. states with recreational cannabis legalization as of 2025.
 * 
 * LEGAL REQUIREMENTS:
 * - Research each state's specific regulations before launch
 * - Consult with legal counsel specializing in cannabis compliance
 * - Update rules quarterly as regulations change
 * - Maintain audit trail of all compliance rule changes
 * - Implement geolocation verification for multi-state operations
 * 
 * MISSING: Additional states, tribal territories, and international jurisdictions
 * TODO: Complete implementation for all target markets before going live

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

/**
 * Validate state compliance for product
 */
export function validateStateCompliance(
    state: string,
    product: {
        category: string;
        thcContent: number;
        quantity: number;
        price: number;
    }
): { allowed: boolean; violations: string[]; warnings: string[] } {
    const violations: string[] = [];
    const warnings: string[] = [];

    const productValidation = validateProduct(state, product.category, product.thcContent);
    if (!productValidation.allowed && productValidation.reason) {
        violations.push(productValidation.reason);
    }

    return {
        allowed: violations.length === 0,
        violations,
        warnings,
    };
}
