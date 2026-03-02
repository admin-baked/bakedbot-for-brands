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

  NYFOUNDINGPARTNER: {
    code: 'NYFOUNDINGPARTNER',
    type: 'graduated_discount',
    value: 50, // Initial discount percentage (Phase 1)
    maxRedemptions: 10, // Limited to first 10 NY dispensaries
    applicableTiers: ['pro', 'growth', 'empire'],
    expiresAt: null,
    requiresVerification: false,
    description: 'NY Founding Partner — 50% off first 60 days, 30% off next 6 months, then full price',
    marketingCopy: 'NY Founding Partner Program — Limited to 10 dispensaries',
    bannerText: 'NY Founding Partner — 50% off for your first 60 days. Only 10 spots available.',
    phases: [
      { discountPercent: 50, durationDays: 60 },
      { discountPercent: 30, durationDays: 180 },
    ],
  },

  ALLEAVES10: {
    code: 'ALLEAVES10',
    type: 'percent_off',
    value: 30, // 30% off for 6 months
    maxRedemptions: null, // unlimited
    applicableTiers: ['pro', 'growth'],
    expiresAt: null,
    requiresVerification: true, // Must verify Alleaves account
    description: 'Alleaves POS users get 30% off Pro or Growth for 6 months',
    marketingCopy: 'Alleaves Integration Discount — 30% off for 6 months',
    bannerText: 'Alleaves users get 30% off Pro or Growth plans for 6 months.',
    durationMonths: 6,
    verificationRequired: {
      fields: ['dispensaryName', 'posSystem'],
      posProviders: ['alleaves'],
      approvalFlow: 'automatic',
    },
  },
} as const;

/**
 * PROMO_CODE_RULES
 *
 * - EARLYBIRD50 expires on tier upgrade (promo resets when customer upgrades)
 * - SOCIALEQUITY is forever (follows customer across tier changes)
 * - NYFOUNDINGPARTNER is graduated: Phase 1 (50% off, 60 days) -> Phase 2 (30% off, 180 days) -> full price
 *   Tracked via organizations/{orgId}.activePromo.currentPhase + activatedAt
 * - ALLEAVES10 is time-limited: 30% off for 6 months from activation
 * - Max 1 active promo per subscription at a time
 * - Promo months decrement on each billing cycle (automated nightly cron)
 * - Graduated discount phase transitions handled by /api/cron/promo-transitions (daily)
 */

export type PromoCodeId = keyof typeof PROMO_CODES;
export type PromoCodeConfig = typeof PROMO_CODES[PromoCodeId];
