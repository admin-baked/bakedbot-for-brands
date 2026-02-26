/**
 * California Cannabis Marketing Rules
 * Source: CA DCC (Department of Cannabis Control) regulations
 * Ref: 4 CCR §15040-15048 — Advertising & Marketing
 *
 * CA is an open/mature market. Rules are comprehensive but less strict
 * on audience composition documentation than MA.
 */
import type { StateMarketingRules } from './index';

export const CA_RULES: StateMarketingRules = {
  stateCode: 'CA',
  stateName: 'California',
  lastUpdated: '2026-02-25',

  channels: {
    digital: {
      channel: 'digital',
      allowed: 'conditional',
      condition: 'Age gate required. Advertising platform must have controls to prevent exposure to persons under 21.',
      audienceMinAge: 21,
      ageGateRequired: true,
      prohibitedContent: [
        'health or medical claims',
        'guaranteed effects ("gets you higher")',
        'appeal to minors (cartoons, candy-like themes)',
        'false or misleading statements',
        'claims that cannabis is safe or without risk',
        'consumption imagery targeting youth',
      ],
      requiredDisclosures: [
        '"For use only by adults 21 years of age or older."',
        '"Keep out of reach of children."',
        'DCC license number on commercial advertising',
      ],
      citations: ['4 CCR §15040', '4 CCR §15041', '4 CCR §15042'],
    },

    sms: {
      channel: 'sms',
      allowed: 'conditional',
      condition: 'Opt-in required. TCPA compliance. Must verify recipient is 21+.',
      audienceMinAge: 21,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        '"For adults 21+ only."',
        'Opt-out instructions',
        'DCC licensee identification',
      ],
      citations: ['4 CCR §15040', 'TCPA'],
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
        '"For adults 21 and older only."',
        'Physical address and unsubscribe link',
        'DCC license number',
      ],
      citations: ['4 CCR §15040', 'CAN-SPAM Act'],
    },

    organic_social: {
      channel: 'organic_social',
      allowed: 'conditional',
      condition: 'Must use platform age restriction settings. Cannot target or appeal to persons under 21.',
      audienceMinAge: 21,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
        'imagery encouraging overconsumption',
      ],
      requiredDisclosures: [
        '"21+ only" in bio or post',
        'DCC licensee identification in bio',
      ],
      citations: ['4 CCR §15040', '4 CCR §15041(a)'],
    },

    paid_social: {
      channel: 'paid_social',
      allowed: 'conditional',
      condition: 'Age targeting (21+) required. Platform must support cannabis advertising in CA (many platforms restrict this). DCC license number required in ad.',
      audienceMinAge: 21,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
        'consumption imagery targeting youth',
      ],
      requiredDisclosures: [
        '"For adults 21 and older only."',
        'DCC license number in ad or landing page',
      ],
      citations: ['4 CCR §15041', '4 CCR §15042'],
    },

    ooh: {
      channel: 'ooh',
      allowed: 'conditional',
      condition: 'No placement within 1,000 feet of schools, daycare centers, or youth facilities. Must not target areas where minors make up a significant portion of traffic.',
      audienceMinAge: 21,
      prohibitedContent: [
        'appeal to minors',
        'health claims',
        'guaranteed effects',
        'depictions of minors',
      ],
      requiredDisclosures: [
        '"For adults 21 and older only."',
        'DCC licensee name and license number',
      ],
      citations: ['4 CCR §15042(b)', '4 CCR §15042(c)'],
    },

    website: {
      channel: 'website',
      allowed: 'conditional',
      condition: 'Age gate (21+) required. DCC license number displayed.',
      audienceMinAge: 21,
      ageGateRequired: true,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        'Age gate: "You must be 21 years of age or older to enter."',
        '"For adults 21 and older only."',
        'DCC license number displayed prominently',
      ],
      citations: ['4 CCR §15040', '4 CCR §15041'],
    },

    loyalty: {
      channel: 'loyalty',
      allowed: true,
      audienceMinAge: 21,
      prohibitedContent: [
        'Health benefit claims in reward descriptions',
        'Potency superiority claims',
        'Youth-targeted reward structures',
      ],
      requiredDisclosures: [
        'Age verification (21+) at enrollment',
        '"For adults 21+ only."',
      ],
      citations: ['4 CCR §15040'],
    },
  },

  generalProhibitions: [
    'Medical or health claims (FDA has not approved cannabis)',
    'Guaranteed effect claims ("will get you high", "most potent")',
    'Content appealing to minors: cartoons, candy themes, youth-targeted colors/imagery',
    'False or misleading statements about product, price, or effects',
    'Claims that cannabis use is safe or risk-free',
    'Depictions of minors or persons who appear under 21',
    'Advertising without DCC license number where required',
    'Advertising to unlicensed retailers or out-of-state consumers',
  ],

  loyaltyProgramRules:
    'Loyalty programs are permitted. Must verify age 21+ at enrollment. Reward descriptions must not include health claims, potency comparisons, or content appealing to minors. DCC license number must be included in loyalty program materials.',

  websiteRequirements:
    'Age gate (21+) required on site entry. DCC license number displayed prominently on homepage and footer. "For adults 21 and older only" visible on landing pages. Cannabis content not accessible to unverified visitors.',
};
