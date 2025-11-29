// [AI-THREAD P0-COMP-DEEBO-AGENT]
// [Dev1-Claude @ 2025-11-29]:
//   Implemented full Deebo compliance enforcement agent for checkout validation.
//   Replaces placeholder implementation with comprehensive state compliance checks.
//   Integrates with src/lib/compliance/compliance-rules.ts for all 51 jurisdictions.

/**
 * Deebo - The Compliance Enforcer
 *
 * Enforces cannabis compliance rules at checkout to ensure legal compliance:
 * - Age verification (21+ for recreational, 18+ for medical)
 * - State purchase limits (flower, concentrates, edibles)
 * - Medical card requirements (medical-only states)
 * - Geo-restrictions (blocks sales in illegal states)
 *
 * Named after the Friday character - Deebo enforces the rules.
 */

import { getStateRules, validatePurchaseLimit, type CartItem, type StateRules } from '@/lib/compliance/compliance-rules';

// ============================================================================
// MESSAGE COMPLIANCE (Legacy - for marketing messages)
// ============================================================================

type Channel = "email" | "sms" | "push" | "in_app";

interface ComplianceCheckInput {
  orgId: string;
  channel: Channel;
  stateCode?: string;
  content: string;
}

export type ComplianceResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Legacy message compliance check
 * TODO: Expand with state-specific marketing rules
 */
export async function deeboCheckMessage(
  input: ComplianceCheckInput
): Promise<ComplianceResult> {
  const { content, channel } = input;

  // Block SMS giveaways (restricted in many states)
  if (/giveaway/i.test(content) && channel === "sms") {
    return {
      ok: false,
      reason: "Promo looks like a giveaway; many states restrict SMS giveaways.",
    };
  }

  return { ok: true };
}

// ============================================================================
// CHECKOUT COMPLIANCE (Primary Implementation)
// ============================================================================

export interface CheckoutCustomer {
  uid: string;
  dateOfBirth?: string; // ISO date string (YYYY-MM-DD)
  hasMedicalCard?: boolean;
  state: string; // Two-letter state code (e.g., "IL", "CA")
}

export interface CheckoutCartItem {
  productType: 'flower' | 'concentrate' | 'edibles';
  quantity: number; // grams for flower/concentrate, mg THC for edibles
  name?: string; // Product name for error messages
}

export interface CheckoutComplianceInput {
  customer: CheckoutCustomer;
  cart: CheckoutCartItem[];
  dispensaryState: string; // State where dispensary is located
}

export interface CheckoutComplianceResult {
  allowed: boolean;
  errors: string[]; // Blocking violations
  warnings: string[]; // Non-blocking notices
  stateRules?: StateRules; // The rules that were applied
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust if birthday hasn't occurred this year yet
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Main Deebo compliance enforcement function
 * Call this before processing any checkout payment
 */
export async function deeboCheckCheckout(
  input: CheckoutComplianceInput
): Promise<CheckoutComplianceResult> {
  const { customer, cart, dispensaryState } = input;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get state compliance rules
  const stateRules = getStateRules(dispensaryState.toUpperCase());

  // CRITICAL CHECK 1: Is cannabis legal in this state?
  if (stateRules.legalStatus === 'illegal') {
    return {
      allowed: false,
      errors: [
        `Cannabis sales are not legal in ${stateRules.stateName}. This order cannot be processed.`
      ],
      warnings,
      stateRules,
    };
  }

  // CRITICAL CHECK 2: Age verification
  if (!customer.dateOfBirth) {
    errors.push('Date of birth is required for age verification');
  } else {
    const age = calculateAge(customer.dateOfBirth);
    const minAge = stateRules.minAge;

    if (age < minAge) {
      errors.push(
        `Customer is ${age} years old. ${stateRules.stateName} requires customers to be ${minAge}+`
      );
    }
  }

  // CRITICAL CHECK 3: Medical card requirement
  if (stateRules.requiresMedicalCard && !customer.hasMedicalCard) {
    errors.push(
      `${stateRules.stateName} requires a valid medical marijuana card for cannabis purchases`
    );
  }

  if (stateRules.requiresMedicalCard && customer.hasMedicalCard) {
    warnings.push(
      `Medical card verified for ${stateRules.stateName} purchase`
    );
  }

  // CRITICAL CHECK 4: Purchase limits validation
  const purchaseLimitResult = validatePurchaseLimit(
    cart.map(item => ({
      productType: item.productType,
      quantity: item.quantity
    })),
    dispensaryState
  );

  if (!purchaseLimitResult.valid) {
    errors.push(...purchaseLimitResult.errors);
  }

  warnings.push(...purchaseLimitResult.warnings);

  // CRITICAL CHECK 5: Decriminalized states (no sales, only possession)
  if (stateRules.legalStatus === 'decriminalized') {
    errors.push(
      `${stateRules.stateName} has decriminalized cannabis but does not allow retail sales`
    );
  }

  // Final result
  return {
    allowed: errors.length === 0,
    errors,
    warnings,
    stateRules,
  };
}

/**
 * Quick age-only check (for age gate UI)
 */
export function deeboCheckAge(
  dateOfBirth: string,
  state: string
): { allowed: boolean; reason?: string; minAge: number } {
  const stateRules = getStateRules(state.toUpperCase());
  const age = calculateAge(dateOfBirth);
  const minAge = stateRules.minAge;

  if (age < minAge) {
    return {
      allowed: false,
      reason: `You must be ${minAge}+ to access this site in ${stateRules.stateName}`,
      minAge,
    };
  }

  return {
    allowed: true,
    minAge,
  };
}

/**
 * Check if state allows cannabis sales at all
 */
export function deeboCheckStateAllowed(state: string): {
  allowed: boolean;
  reason?: string;
  status: string;
} {
  const stateRules = getStateRules(state.toUpperCase());

  if (stateRules.legalStatus === 'illegal') {
    return {
      allowed: false,
      reason: `Cannabis is not legal in ${stateRules.stateName}`,
      status: stateRules.legalStatus,
    };
  }

  if (stateRules.legalStatus === 'decriminalized') {
    return {
      allowed: false,
      reason: `${stateRules.stateName} has decriminalized cannabis but does not allow retail sales`,
      status: stateRules.legalStatus,
    };
  }

  return {
    allowed: true,
    status: stateRules.legalStatus,
  };
}
