/**
 * Server-Side Age Verification
 *
 * CRITICAL: Age verification MUST happen server-side before any transaction is committed.
 * Client-side verification is strictly for UX only and is NOT enforceable.
 */

'use server';

import { logger } from '@/lib/logger';
import { validateStateCompliance } from '@/lib/compliance/state-rules';
import { deeboCheckAge, deeboCheckStateAllowed } from '@/server/agents/deebo';

export interface AgeVerificationInput {
  dateOfBirth: string; // ISO date string: YYYY-MM-DD
  stateCode: string;
  userId: string;
}

export interface AgeVerificationResult {
  verified: boolean;
  ageInYears: number;
  meetsRequirement: boolean;
  stateMinimumAge: number;
  reason?: string;
}

/**
 * Server-side age verification.
 * MUST be called before processing any cannabis purchases.
 * 
 * @throws Error if age cannot be verified or verification fails
 */
export async function verifyAge(input: AgeVerificationInput): Promise<AgeVerificationResult> {
  try {
    // Validate input
    if (!input.dateOfBirth || !input.stateCode || !input.userId) {
      logger.error('[AGE_VERIFICATION] Missing required fields', {
        userId: input.userId,
        stateCode: input.stateCode,
      });
      throw new Error('Invalid age verification request: Missing required fields');
    }

    // Parse date of birth
    const dob = new Date(input.dateOfBirth);
    const today = new Date();

    // Validate date is in the past
    if (dob > today) {
      logger.warn('[AGE_VERIFICATION] Future date of birth submitted', {
        userId: input.userId,
        dob: input.dateOfBirth,
      });
      throw new Error('Invalid date of birth: Cannot be in the future');
    }

    // Calculate age
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    // Get state minimum age requirement
    const stateRules = (await import('@/lib/compliance/state-rules')).getStateRules(input.stateCode);

    if (!stateRules) {
      logger.error('[AGE_VERIFICATION] State not supported', {
        userId: input.userId,
        stateCode: input.stateCode,
      });
      throw new Error(`Age verification not available for state: ${input.stateCode}`);
    }

    const minimumAge = stateRules.ageRequirement;
    const meetsRequirement = age >= minimumAge;

    // Log age verification attempt
    logger.info('[AGE_VERIFICATION] Age verification processed', {
      userId: input.userId,
      stateCode: input.stateCode,
      ageInYears: age,
      minimumAge,
      meetsRequirement,
    });

    // If verification fails, log prominently
    if (!meetsRequirement) {
      logger.warn('[AGE_VERIFICATION_FAILED] Customer age does not meet state requirement', {
        userId: input.userId,
        stateCode: input.stateCode,
        ageInYears: age,
        minimumAge,
        reason: `Customer is ${minimumAge - age} years under the minimum age requirement`,
      });
    }

    return {
      verified: true,
      ageInYears: age,
      meetsRequirement,
      stateMinimumAge: minimumAge,
      reason: meetsRequirement ? undefined : `Must be at least ${minimumAge} years old in ${input.stateCode}`,
    };
  } catch (error) {
    logger.error('[AGE_VERIFICATION_ERROR] Age verification failed', {
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Pre-order age verification check.
 * Called before order is submitted for payment processing.
 * 
 * @throws Error if customer is not of legal age
 */
export async function requireMinimumAge(input: AgeVerificationInput): Promise<void> {
  const result = await verifyAge(input);

  if (!result.meetsRequirement) {
    logger.error('[AGE_COMPLIANCE] Order rejected: Customer underage', {
      userId: input.userId,
      stateCode: input.stateCode,
      ageInYears: result.ageInYears,
      minimumAge: result.stateMinimumAge,
    });

    throw new Error(
      `Age Requirement Not Met: ${result.reason}`
    );
  }
}

/**
 * Audit trail: Log all age verification decisions for compliance
 */
export async function logAgeVerificationDecision(
  userId: string,
  decision: AgeVerificationResult,
  action: 'approved' | 'rejected'
): Promise<void> {
  logger.info('[AGE_VERIFICATION_AUDIT] Age verification decision logged', {
    userId,
    decision,
    action,
    timestamp: new Date().toISOString(),
  });

  // TODO: Store in Firestore for audit trail
  // await createAuditLog({
  //   userId,
  //   action: 'age_verification',
  //   decision: action,
  //   metadata: decision,
  //   timestamp: serverTimestamp(),
  // });
}

// ============================================================================
// Age Gate Component Support (using Deebo for state-aware verification)
// ============================================================================

export interface DeeboAgeVerificationResult {
    allowed: boolean;
    minAge: number;
    reason?: string;
    stateBlocked?: boolean;
}

export interface StateCheckResult {
    allowed: boolean;
    reason?: string;
}

/**
 * Verify user's age for age gate component (Deebo-powered)
 */
export async function verifyAgeForGate(
    dateOfBirth: string,
    state: string = 'IL'
): Promise<DeeboAgeVerificationResult> {
    try {
        // Check if state allows cannabis sales
        const stateCheck = deeboCheckStateAllowed(state);
        if (!stateCheck.allowed) {
            logger.warn('[AgeGate] State blocked', { state });
            return {
                allowed: false,
                minAge: 21,
                reason: stateCheck.reason || 'Cannabis sales are not available in your state',
                stateBlocked: true
            };
        }

        // Verify age
        const ageCheck = deeboCheckAge(dateOfBirth, state);

        logger.info('[AgeGate] Age check completed', {
            state,
            allowed: ageCheck.allowed,
            minAge: ageCheck.minAge
        });

        return {
            allowed: ageCheck.allowed,
            minAge: ageCheck.minAge,
            reason: ageCheck.reason,
            stateBlocked: false
        };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[AgeGate] Error verifying age', {
            error: err.message,
            state
        });

        return {
            allowed: false,
            minAge: 21,
            reason: 'Failed to verify age. Please try again.',
            stateBlocked: false
        };
    }
}

/**
 * Check if a state allows cannabis sales
 */
export async function checkStateAllowed(state: string): Promise<StateCheckResult> {
    try {
        const result = deeboCheckStateAllowed(state);

        logger.info('[AgeGate] State check completed', {
            state,
            allowed: result.allowed
        });

        return result;
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[AgeGate] Error checking state', {
            error: err.message,
            state
        });

        return {
            allowed: false,
            reason: 'Failed to verify state availability'
        };
    }
}

/**
 * Get minimum age for a state
 */
export async function getMinimumAge(state: string = 'IL'): Promise<number> {
    try {
        // Use a test DOB to get the minimum age for the state
        const testDob = new Date(2000, 0, 1).toISOString().split('T')[0];
        const ageCheck = deeboCheckAge(testDob, state);

        return ageCheck.minAge;
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[AgeGate] Error getting minimum age', {
            error: err.message,
            state
        });

        return 21; // Default to 21
    }
}

/**
 * Simplified age verification - always 21+ requirement
 * Used for simplified Yes/No age gates without state detection
 */
export async function verifyAgeSimple(): Promise<{ allowed: boolean; minAge: 21 }> {
    return {
        allowed: true,
        minAge: 21
    };
}
