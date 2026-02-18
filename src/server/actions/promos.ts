'use server';

import { PROMO_CODES, PromoCodeConfig, type PromoCodeId } from '@/config/promos';
import { type TierId } from '@/config/tiers';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

/**
 * Validates a promo code for a specific tier and organization.
 *
 * Checks:
 * - Code exists in PROMO_CODES
 * - Tier is in applicableTiers
 * - Redemption count (if maxRedemptions set)
 * - Verification status (if requiresVerification set)
 *
 * Returns validation result with promo config or error.
 */
export async function validatePromoCode(
  code: string,
  tierId: TierId,
  orgId: string
): Promise<{ valid: boolean; promo?: PromoCodeConfig; error?: string }> {
  try {
    if (!code || !tierId || !orgId) {
      return { valid: false, error: 'Missing required parameters' };
    }

    // Scout tier doesn't support promos
    if (tierId === 'scout') {
      return { valid: false, error: 'Promos not available for scout tier' };
    }

    // 1. Normalize code and look up in PROMO_CODES
    const normalizedCode = code.toUpperCase().trim();
    const promoKey = Object.keys(PROMO_CODES).find(
      (key) => key.toUpperCase() === normalizedCode
    ) as PromoCodeId | undefined;

    if (!promoKey) {
      return { valid: false, error: 'Promo code not found' };
    }

    const promo = PROMO_CODES[promoKey];

    // 2. Check if tier is applicable
    if (!promo.applicableTiers.includes(tierId as 'pro' | 'growth' | 'empire')) {
      return {
        valid: false,
        error: `Promo code not applicable for ${tierId} tier`,
      };
    }

    const { firestore } = await createServerClient();

    // 3. If maxRedemptions set, check redemption count
    if (promo.maxRedemptions !== null) {
      try {
        const redemptionsSnapshot = await firestore
          .collection('promo_redemptions')
          .where('code', '==', promo.code)
          .count()
          .get();

        const redemptionCount = redemptionsSnapshot.data().count;

        if (redemptionCount >= promo.maxRedemptions) {
          return {
            valid: false,
            error: `Promo code redemption limit (${promo.maxRedemptions}) reached`,
          };
        }
      } catch (error: any) {
        logger.warn('[promos] Error checking redemption count', {
          code: promo.code,
          error: error.message,
        });
        // Continue — don't fail on count check error
      }
    }

    // 4. If requiresVerification set, check SE application status
    if (promo.requiresVerification) {
      try {
        const seAppDoc = await firestore
          .collection('se_applications')
          .doc(orgId)
          .get();

        if (!seAppDoc.exists) {
          return {
            valid: false,
            error: 'Social Equity application not found',
          };
        }

        const seApp = seAppDoc.data();
        if (!seApp || seApp.status !== 'approved') {
          return {
            valid: false,
            error: seApp ? `Social Equity application status: ${seApp.status}` : 'Social Equity application not found',
          };
        }
      } catch (error: any) {
        logger.error('[promos] Error checking SE application', {
          orgId,
          error: error.message,
        });
        return {
          valid: false,
          error: 'Failed to verify Social Equity status',
        };
      }
    }

    // 5. All checks passed
    return { valid: true, promo };
  } catch (error: any) {
    logger.error('[promos] Validation error', {
      code,
      tierId,
      orgId,
      error: error.message,
    });
    return { valid: false, error: 'Promo validation failed' };
  }
}

/**
 * Gets promo code config by code (case-insensitive).
 * Used for UI displays.
 */
export async function getPromoCode(code: string): Promise<PromoCodeConfig | null> {
  const normalizedCode = code.toUpperCase().trim();
  const promoKey = Object.keys(PROMO_CODES).find(
    (key) => key.toUpperCase() === normalizedCode
  ) as PromoCodeId | undefined;

  return promoKey ? PROMO_CODES[promoKey] : null;
}
