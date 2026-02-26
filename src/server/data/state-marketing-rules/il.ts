/**
 * Illinois Cannabis Marketing Rules
 * Source: IDFPR (Illinois Dept. of Financial & Professional Regulation)
 * Ref: Illinois Administrative Code Title 8 Part 1290 — Cannabis Regulation
 *
 * IL rules are similar to CO (70%+ 21+ audience threshold) but with
 * additional requirements from the Cannabis Regulation and Tax Act (CRTA).
 */
import type { StateMarketingRules } from './index';

export const IL_RULES: StateMarketingRules = {
  stateCode: 'IL',
  stateName: 'Illinois',
  lastUpdated: '2026-02-25',

  channels: {
    digital: {
      channel: 'digital',
      allowed: 'conditional',
      condition: 'Platform must provide tools to ensure audience is reasonably expected to be 71.6%+ aged 21+ (state demographic basis). Age gate required on landing pages.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.716,
      ageGateRequired: true,
      prohibitedContent: [
        'health or medical claims',
        'guaranteed effects',
        'content appealing to minors',
        'false or misleading statements',
        'claims cannabis is safe or risk-free',
        'depictions of persons who appear under 21 consuming cannabis',
      ],
      requiredDisclosures: [
        '"For adults 21 years of age or older only."',
        '"Keep out of reach of children."',
        'IDFPR license number',
      ],
      citations: ['8 Ill. Admin. Code §1290.510', 'CRTA 410 ILCS 705/55-21'],
    },

    sms: {
      channel: 'sms',
      allowed: 'conditional',
      condition: 'Opt-in required. TCPA compliance. Must confirm recipient is 21+. Cannot send to persons who have opted out.',
      audienceMinAge: 21,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        '"For adults 21+ only."',
        'Opt-out: "Reply STOP to unsubscribe."',
      ],
      citations: ['8 Ill. Admin. Code §1290.510', 'TCPA'],
    },

    email: {
      channel: 'email',
      allowed: 'conditional',
      condition: 'Opt-in required with age verification. CAN-SPAM compliance.',
      audienceMinAge: 21,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        '"For adults 21 and older only."',
        'Physical address and unsubscribe link',
        'IDFPR license number',
      ],
      citations: ['8 Ill. Admin. Code §1290.510', 'CAN-SPAM Act'],
    },

    organic_social: {
      channel: 'organic_social',
      allowed: 'conditional',
      condition: 'Age restriction settings required on all platforms that support it. Reasonable expectation that 71.6%+ of audience is 21+.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.716,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'content appealing to minors',
        'imagery encouraging overconsumption',
      ],
      requiredDisclosures: [
        '"21+ only" displayed in bio or post',
      ],
      citations: ['8 Ill. Admin. Code §1290.510(b)'],
    },

    paid_social: {
      channel: 'paid_social',
      allowed: 'conditional',
      condition: 'Age targeting (21+) required. Platform must support cannabis advertising. Must achieve 71.6%+ 21+ audience composition.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.716,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
        'consumption imagery',
      ],
      requiredDisclosures: [
        '"For adults 21 and older only."',
        'IDFPR license number on landing page',
      ],
      citations: ['8 Ill. Admin. Code §1290.510', 'CRTA 410 ILCS 705/55-21'],
    },

    ooh: {
      channel: 'ooh',
      allowed: 'conditional',
      condition: 'Prohibited within 1,000 feet of schools or facilities primarily serving persons under 21. Must meet 71.6%+ 21+ audience threshold for placement location.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.716,
      prohibitedContent: [
        'appeal to minors',
        'health claims',
        'guaranteed effects',
        'depictions of minors',
      ],
      requiredDisclosures: [
        '"For adults 21 years of age or older."',
        'IDFPR license number',
      ],
      citations: ['8 Ill. Admin. Code §1290.510(c)', 'CRTA 410 ILCS 705/55-21(b)'],
    },

    website: {
      channel: 'website',
      allowed: 'conditional',
      condition: 'Age gate (21+) required. IDFPR license number displayed.',
      audienceMinAge: 21,
      ageGateRequired: true,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        'Age gate: "Are you 21 years of age or older?"',
        '"For adults 21 years of age or older only."',
        'IDFPR license number',
      ],
      citations: ['8 Ill. Admin. Code §1290.510'],
    },

    loyalty: {
      channel: 'loyalty',
      allowed: true,
      audienceMinAge: 21,
      prohibitedContent: [
        'Health claims in reward descriptions',
        'Potency superiority claims',
        'Youth-targeted reward design',
      ],
      requiredDisclosures: [
        'Age verification (21+) at enrollment',
        'IDFPR license number in program materials',
      ],
      citations: ['8 Ill. Admin. Code §1290.510'],
    },
  },

  generalProhibitions: [
    'Health or medical claims (FDA has not approved cannabis for medical use)',
    'Guaranteed effect claims or potency superiority statements',
    'Content appealing to minors: cartoons, candy themes, youth celebrities, imagery typical of youth marketing',
    'False or misleading statements about products, pricing, or effects',
    'Claims that cannabis is safe, risk-free, or without health concerns',
    'Depictions of persons under 21 consuming cannabis',
    'Advertising in venues or on platforms where minors make up 28.4%+ of the audience',
    'Comparative advertising that disparages competitors with false claims',
  ],

  loyaltyProgramRules:
    'Loyalty programs permitted under IL CRTA. Enrollment requires age verification (21+). Reward descriptions must be neutral — no health claims, potency comparisons, or youth-targeted content. Promotions of loyalty programs must meet the 71.6% 21+ audience threshold for any broadcast channel.',

  websiteRequirements:
    'Age gate (21+) required before cannabis content is accessible. IDFPR license number displayed on all pages. "For adults 21 years of age or older only" prominently displayed. No cannabis-related content visible to unverified visitors.',
};
