/**
 * PROMOS.ts - Promotional Codes
 *
 * Single source of truth for all active promos.
 * Checked during checkout and on tier upgrade.
 */

export const PROMO_CODES = {
  EARLYBIRD50: {
    code: 'EARLYBIRD50',
    type: 'free_months',
    value: 3, // 3 months free
    maxRedemptions: 50,
    applicableTiers: ['pro', 'growth', 'empire'],
    expiresAt: null, // no expiry, just slot limit
    requiresVerification: false,
    description: 'First 50 dispensaries get 3 months free on any paid plan',
    marketingCopy: 'Early Adopter Program — Limited to 50 dispensaries',
    bannerText: '🚀 Early Adopter Program — First 50 dispensaries get 3 months free. Use code EARLYBIRD50 at signup.',
  },

  SOCIALEQUITY: {
    code: 'SOCIALEQUITY',
    type: 'percent_off',
    value: 50, // 50% off forever
    maxRedemptions: null, // unlimited
    applicableTiers: ['pro', 'growth', 'empire'],
    expiresAt: null,
    requiresVerification: true, // Manual verification required
    description: 'Licensed social equity dispensaries get 50% off any plan — forever',
    marketingCopy: 'Social Equity Pricing — 50% off forever for licensed SE dispensaries',
    verificationRequired: {
      fields: ['dispensaryName', 'licenseNumber', 'licenseType', 'state', 'licenseImage'],
      licenseTypes: ['social_equity', 'equity_applicant'],
      approvalFlow: 'manual',
    },
  },
} as const;

/**
 * PROMO_CODE_RULES
 *
 * - EARLYBIRD50 expires on tier upgrade (promo resets when customer upgrades)
 * - SOCIALEQUITY is forever (follows customer across tier changes)
 * - Max 1 active promo per subscription at a time
 * - Promo months decrement on each billing cycle (automated nightly cron)
 */

export type PromoCodeId = keyof typeof PROMO_CODES;
export type PromoCodeConfig = typeof PROMO_CODES[PromoCodeId];
