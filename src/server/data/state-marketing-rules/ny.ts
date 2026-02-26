/**
 * New York Cannabis Marketing Rules
 * Source: NY OCM (Office of Cannabis Management) regulations
 * Ref: 9 NYCRR Part 116 — Cannabis Advertising & Marketing
 */
import type { StateMarketingRules } from './index';

export const NY_RULES: StateMarketingRules = {
  stateCode: 'NY',
  stateName: 'New York',
  lastUpdated: '2026-02-25',

  channels: {
    digital: {
      channel: 'digital',
      allowed: true,
      audienceMinAge: 21,
      ageGateRequired: true,
      prohibitedContent: [
        'health or medical claims (cure, treat, prevent, therapeutic)',
        'guaranteed effect or potency claims',
        'cartoon characters or imagery appealing to minors',
        'celebrity endorsements appealing to youth',
        'false or misleading statements about product',
      ],
      requiredDisclosures: [
        'Age disclaimer: "For adults 21 and older only."',
        'Prominent display on all digital ads',
      ],
      citations: ['9 NYCRR §116.4', '9 NYCRR §116.5'],
    },

    sms: {
      channel: 'sms',
      allowed: 'conditional',
      condition: 'First-party opt-in required. TCPA compliance mandatory. No cold outreach.',
      audienceMinAge: 21,
      prohibitedContent: [
        'health or medical claims',
        'guaranteed effects',
        'appeal to minors',
        'false pricing claims',
      ],
      requiredDisclosures: [
        '"For adults 21+ only."',
        'Opt-out instructions: "Reply STOP to unsubscribe."',
        'Message and data rates may apply disclosure.',
      ],
      citations: ['9 NYCRR §116.4', 'TCPA 47 U.S.C. §227'],
    },

    email: {
      channel: 'email',
      allowed: 'conditional',
      condition: 'Opt-in required. CAN-SPAM compliance. Must include physical address and unsubscribe mechanism.',
      audienceMinAge: 21,
      prohibitedContent: [
        'health or medical claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        '"For adults 21 and older only."',
        'Physical mailing address',
        'Unsubscribe link',
      ],
      citations: ['9 NYCRR §116.4', 'CAN-SPAM Act 15 U.S.C. §7701'],
    },

    organic_social: {
      channel: 'organic_social',
      allowed: 'conditional',
      condition: 'Age restriction settings required where platform allows. Required age disclaimers on all posts.',
      audienceMinAge: 21,
      prohibitedContent: [
        'health or medical claims',
        'appeal to minors (cartoon imagery, youth-oriented language)',
        'guaranteed effect claims',
        'pricing that implies deep discounting is standard',
      ],
      requiredDisclosures: [
        '"21+ only" in post text or bio',
        'Bio/profile must clearly identify as adult-use cannabis',
      ],
      citations: ['9 NYCRR §116.5'],
    },

    paid_social: {
      channel: 'paid_social',
      allowed: 'conditional',
      condition: 'Audience targeting must be configured to 21+ only. No broad/untargeted reach campaigns. Platform must support age-gated targeting.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.9,
      prohibitedContent: [
        'health or medical claims',
        'appeal to minors',
        'guaranteed effect claims',
        'imagery of consumption',
      ],
      requiredDisclosures: [
        '"For adults 21 and older only."',
        'Must include age-gate destination landing page',
      ],
      citations: ['9 NYCRR §116.5', '9 NYCRR §116.6'],
    },

    ooh: {
      channel: 'ooh',
      allowed: 'conditional',
      condition: 'No placement within 500 feet of schools, playgrounds, or youth-oriented facilities. No content appealing to minors.',
      audienceMinAge: 21,
      prohibitedContent: [
        'cartoon characters or imagery appealing to minors',
        'health claims',
        'guaranteed effects',
        'consumption imagery',
      ],
      requiredDisclosures: [
        '"For adults 21 and older."',
        'OCM licensee name/license number where required',
      ],
      citations: ['9 NYCRR §116.6', '9 NYCRR §116.7'],
    },

    website: {
      channel: 'website',
      allowed: 'conditional',
      condition: 'Age gate (21+) required on all pages before content is accessible. Age gate must be visible on entry.',
      audienceMinAge: 21,
      ageGateRequired: true,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        'Age gate splash screen: "Are you 21 or older?"',
        '"This website is intended for adults 21 years of age or older."',
      ],
      citations: ['9 NYCRR §116.4'],
    },

    loyalty: {
      channel: 'loyalty',
      allowed: 'conditional',
      condition: 'Loyalty programs allowed but cannot be "advertised" in ways that promote product potency/effects. Reward language must be neutral.',
      audienceMinAge: 21,
      prohibitedContent: [
        '"Earn points on our strongest products" — implies potency',
        '"Get rewarded for buying premium THC products" — product-specific claims',
        'Health benefit framing of loyalty rewards',
      ],
      requiredDisclosures: [
        'Program must verify 21+ age at enrollment',
      ],
      citations: ['9 NYCRR §116.4', '9 NYCRR §116.5'],
    },
  },

  generalProhibitions: [
    'Medical or therapeutic claims (cure, treat, prevent, health benefit, therapeutic effect)',
    'Guaranteed effect or potency claims ("get you higher", "strongest", "most potent")',
    'Content appealing to minors: cartoon characters, candy-like imagery, youth celebrities, bright primary colors in youth contexts',
    'Product efficacy guarantees',
    'False or misleading statements about product, brand, price, or effects',
    'Advertising that promotes overconsumption',
    'Consumption imagery in public-facing ads',
    'Testimonials that imply medical benefit',
  ],

  loyaltyProgramRules:
    'Loyalty programs are permitted. Points and rewards must be described neutrally without referencing potency, effects, or health benefits. Enrollment must verify age 21+. Cannot advertise loyalty in ways that circumvent channel-specific audience restrictions.',

  websiteRequirements:
    'Age gate (21+) required on website entry. Must display "For adults 21 and older only" prominently. No cannabis content visible to unverified visitors. Licensed dispensary name/license number displayed per OCM requirements.',
};
