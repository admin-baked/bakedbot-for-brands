/**
 * Colorado Cannabis Marketing Rules
 * Source: CO MED (Marijuana Enforcement Division) regulations
 * Ref: 1 CCR 212-3 §M1601-M1604 — Advertising & Marketing
 *
 * CO uses the 30% overhang rule: advertising allowed only if 70%+ of
 * the audience is reasonably expected to be 21+.
 */
import type { StateMarketingRules } from './index';

export const CO_RULES: StateMarketingRules = {
  stateCode: 'CO',
  stateName: 'Colorado',
  lastUpdated: '2026-02-25',

  channels: {
    digital: {
      channel: 'digital',
      allowed: 'conditional',
      condition: 'Platform must have controls to ensure 70%+ of audience is 21+. Age gate required on landing pages.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.70,
      ageGateRequired: true,
      prohibitedContent: [
        'health or medical claims',
        'guaranteed or implied effects',
        'appeal to minors (cartoons, candy themes, youth celebrities)',
        'false or misleading statements',
        'claims cannabis is safe or without health risks',
        'imagery of consumption by persons who appear under 21',
      ],
      requiredDisclosures: [
        '"This product is only for use in persons 21 years of age or older."',
        '"Keep out of reach of children."',
        'MED license number',
      ],
      citations: ['1 CCR 212-3 §M1601', '1 CCR 212-3 §M1602'],
    },

    sms: {
      channel: 'sms',
      allowed: 'conditional',
      condition: 'Opt-in required. TCPA compliance. Must verify recipient is 21+.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.70,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        '"For persons 21+ only."',
        'Opt-out instructions',
      ],
      citations: ['1 CCR 212-3 §M1601', 'TCPA'],
    },

    email: {
      channel: 'email',
      allowed: 'conditional',
      condition: 'Opt-in required. CAN-SPAM compliance. Age verification at sign-up.',
      audienceMinAge: 21,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        '"For persons 21 years of age or older only."',
        'Unsubscribe mechanism',
        'Physical address',
      ],
      citations: ['1 CCR 212-3 §M1601', 'CAN-SPAM Act'],
    },

    organic_social: {
      channel: 'organic_social',
      allowed: 'conditional',
      condition: 'Platform age restriction settings required. Reasonable expectation that 70%+ of followers are 21+.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.70,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
        'imagery that glamorizes overconsumption',
      ],
      requiredDisclosures: [
        '"21+ only" in bio or on post',
      ],
      citations: ['1 CCR 212-3 §M1601(C)', '1 CCR 212-3 §M1602'],
    },

    paid_social: {
      channel: 'paid_social',
      allowed: 'conditional',
      condition: 'Must use audience targeting to achieve 70%+ 21+ composition. Cannot run broad untargeted campaigns.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.70,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
        'consumption imagery',
      ],
      requiredDisclosures: [
        '"For persons 21 years of age or older."',
        'MED license number on ad or landing page',
      ],
      citations: ['1 CCR 212-3 §M1602', '1 CCR 212-3 §M1603'],
    },

    ooh: {
      channel: 'ooh',
      allowed: 'conditional',
      condition: 'Prohibited within 1,000 feet of schools, child care centers, or facilities primarily for minors. Must pass 70% 21+ audience threshold.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.70,
      prohibitedContent: [
        'appeal to minors',
        'health claims',
        'guaranteed effects',
        'depictions of minors',
      ],
      requiredDisclosures: [
        '"For persons 21 years of age or older."',
        'MED license number',
      ],
      citations: ['1 CCR 212-3 §M1603(B)', '1 CCR 212-3 §M1604'],
    },

    website: {
      channel: 'website',
      allowed: 'conditional',
      condition: 'Age gate (21+) required. MED license number displayed.',
      audienceMinAge: 21,
      ageGateRequired: true,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        'Age gate: "You must be 21 or older to enter."',
        '"For persons 21 years of age or older."',
        'MED license number',
      ],
      citations: ['1 CCR 212-3 §M1601'],
    },

    loyalty: {
      channel: 'loyalty',
      allowed: true,
      audienceMinAge: 21,
      prohibitedContent: [
        'Health claims in reward descriptions',
        'Potency superiority claims',
      ],
      requiredDisclosures: [
        'Age verification (21+) at enrollment',
      ],
      citations: ['1 CCR 212-3 §M1601'],
    },
  },

  generalProhibitions: [
    'Health or medical claims of any kind',
    'Guaranteed or implied effect claims',
    'Content appealing to minors: cartoons, candy themes, youth celebrities, bright primary colors in youth marketing contexts',
    'False or misleading statements about products, pricing, or effects',
    'Claims that cannabis is safe or without risk',
    'Depictions of persons under 21 consuming cannabis',
    'Advertising to persons under 21 or in venues primarily attended by minors',
    'Advertising on platforms where 30%+ of audience is reasonably expected to be under 21 (the "30% overhang rule")',
  ],

  loyaltyProgramRules:
    'Loyalty programs permitted. Age verification (21+) at enrollment required. Reward descriptions must be neutral — no health claims, potency comparisons, or youth-targeted content. Loyalty program promotions must comply with the 70% 21+ audience threshold for any broadcast.',

  websiteRequirements:
    'Age gate (21+) required before cannabis content is accessible. MED license number displayed on all pages. "For persons 21 years of age or older only" prominently displayed. No cannabis-related content visible to unverified visitors.',
};
