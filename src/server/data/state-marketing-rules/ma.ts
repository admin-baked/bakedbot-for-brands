/**
 * Massachusetts Cannabis Marketing Rules
 * Source: Massachusetts Cannabis Control Commission (CCC) regulations
 * Ref: 935 CMR 500.105 — Advertising, Marketing and Branding
 *
 * MA is the STRICTEST state in this dataset. All channels require documented
 * proof that 85%+ of the audience is 21+.
 */
import type { StateMarketingRules } from './index';

export const MA_RULES: StateMarketingRules = {
  stateCode: 'MA',
  stateName: 'Massachusetts',
  lastUpdated: '2026-02-25',

  channels: {
    digital: {
      channel: 'digital',
      allowed: 'conditional',
      condition: 'Must have documented evidence that 85%+ of audience is 21+. Age gate required on all landing pages.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.85,
      ageGateRequired: true,
      prohibitedContent: [
        'health or medical claims',
        'guaranteed effects',
        'appeal to minors',
        'imagery of someone who appears under 21',
        'content designed to appeal to youth',
        'false statements',
      ],
      requiredDisclosures: [
        '"This product has not been analyzed or approved by the Food and Drug Administration (FDA)."',
        '"There is limited information on the side effects of using this product."',
        '"Keep this product away from children."',
        '"There may be health risks associated with consumption of this product."',
        '"For use only by adults 21 years of age or older."',
      ],
      citations: ['935 CMR 500.105(1)', '935 CMR 500.105(3)'],
    },

    sms: {
      channel: 'sms',
      allowed: 'conditional',
      condition: 'Opt-in required. Must verify recipient is 21+. TCPA mandatory. Must have documented 85%+ 21+ audience evidence.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.85,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        '"For adults 21+ only."',
        'Opt-out: "Reply STOP to unsubscribe."',
        'Required MA warning disclosures in full or abbreviated format',
      ],
      citations: ['935 CMR 500.105(1)', '935 CMR 500.105(3)', 'TCPA'],
    },

    email: {
      channel: 'email',
      allowed: 'conditional',
      condition: 'Opt-in with age verification required. Must document audience is 85%+ aged 21+. CAN-SPAM compliance.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.85,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        'Full MA CCC required health warning disclosures',
        '"For adults 21 and older only."',
        'Physical address and unsubscribe mechanism',
      ],
      citations: ['935 CMR 500.105(1)', 'CAN-SPAM Act'],
    },

    organic_social: {
      channel: 'organic_social',
      allowed: 'conditional',
      condition: 'Must use all available age restriction settings on platform. Must have documented evidence audience is 85%+ aged 21+. Required MA warning disclosures on all posts.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.85,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
        'consumption imagery',
        'imagery of persons under 21',
      ],
      requiredDisclosures: [
        '"21+ only" clearly in post or bio',
        'MA CCC required health warnings (abbreviated acceptable for social)',
      ],
      citations: ['935 CMR 500.105(1)', '935 CMR 500.105(3)(g)'],
    },

    paid_social: {
      channel: 'paid_social',
      allowed: 'conditional',
      condition: 'Must provide documented proof (e.g., platform audience report) that 85%+ of reached audience is 21+. Cannot run broad campaigns. Platform must support age-gated targeting.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.85,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
        'consumption imagery',
      ],
      requiredDisclosures: [
        'MA required health disclosures on landing page',
        '"For adults 21 and older only."',
      ],
      citations: ['935 CMR 500.105(3)(g)', '935 CMR 500.105(3)(h)'],
    },

    ooh: {
      channel: 'ooh',
      allowed: 'conditional',
      condition: 'Permitted only if documented evidence shows 85%+ of audience exposed is 21+. Must submit placement request to CCC for approval in some cases. No placement near schools.',
      audienceMinAge: 21,
      audienceCompositionRequired: 0.85,
      prohibitedContent: [
        'health claims',
        'appeal to minors',
        'guaranteed effects',
        'consumption imagery',
        'imagery of persons under 21',
      ],
      requiredDisclosures: [
        '"This product has not been approved by the FDA."',
        '"For adults 21 and older only."',
        'CCC license number',
      ],
      citations: ['935 CMR 500.105(3)(f)', '935 CMR 500.105(3)(j)'],
    },

    website: {
      channel: 'website',
      allowed: 'conditional',
      condition: 'Age gate (21+) mandatory. Must display all required MA health warnings prominently.',
      audienceMinAge: 21,
      ageGateRequired: true,
      prohibitedContent: [
        'health claims',
        'guaranteed effects',
        'appeal to minors',
      ],
      requiredDisclosures: [
        'MA CCC full health warning disclosures (5 required statements)',
        'Age gate: "Are you 21 years of age or older?"',
        'CCC license number displayed',
      ],
      citations: ['935 CMR 500.105(1)', '935 CMR 500.105(3)(a)'],
    },

    loyalty: {
      channel: 'loyalty',
      allowed: 'conditional',
      condition: 'Must not be advertised in a way that circumvents audience composition requirements. Cannot be promoted via channels that don\'t meet the 85% 21+ threshold.',
      audienceMinAge: 21,
      prohibitedContent: [
        'Health benefit framing of loyalty rewards',
        'Potency claims in reward descriptions',
        'Youth-oriented reward design or imagery',
      ],
      requiredDisclosures: [
        'Enrollment must verify age 21+',
        'Program materials must include MA warning disclosures',
      ],
      citations: ['935 CMR 500.105(1)', '935 CMR 500.105(3)'],
    },
  },

  generalProhibitions: [
    'Medical or health claims of any kind (FDA has not approved cannabis for any medical use)',
    'Guaranteed effect claims or potency superiority claims',
    'Content that could appeal to persons under 21 (cartoons, candy imagery, youth celebrities, bright primary-color designs typical of youth marketing)',
    'Testimonials implying medical benefit or therapeutic effect',
    'False or misleading statements about products, pricing, or effects',
    'Images of persons who appear to be under 21 years of age',
    'Imagery that glamorizes or encourages overconsumption',
    'Advertising that claims cannabis is safe or free from health risks',
    'Advertising not approved by CCC for applicable licensees',
  ],

  loyaltyProgramRules:
    'Loyalty programs are permitted but cannot circumvent advertising restrictions. Programs must not be promoted via channels that fail the 85% 21+ audience composition threshold. Enrollment requires age verification. Reward descriptions must be neutral — no potency, effect, or health language. All loyalty program communications require MA CCC-mandated health disclosures.',

  websiteRequirements:
    'Age gate mandatory before any cannabis content is visible. Must display all 5 MA CCC required health warning statements prominently: (1) not FDA approved, (2) limited info on side effects, (3) keep away from children, (4) health risks associated with use, (5) for adults 21+ only. CCC license number must be displayed. No cannabis-related content accessible to unverified visitors.',
};
