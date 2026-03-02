/**
 * Cannabis Compliance Rules by State
 *
 * Pre-loaded compliance rules for cannabis marketing, advertising, and
 * content restrictions across legal states.
 *
 * Sources:
 * - State cannabis control boards
 * - Marketing compliance guidelines
 * - Industry best practices
 *
 * Last updated: 2026-02-06
 */

import type { ComplianceRule, USState } from '@/types/brand-guide';

// ============================================================================
// US STATES
// ============================================================================

export const US_STATES: USState[] = [
  'CA', 'CO', 'MA', 'MI', 'NV', 'OR', 'WA', 'AZ', 'IL', 'NJ',
  'NY', 'CT', 'VT', 'ME', 'MT', 'NM', 'VA', 'RI', 'MD', 'MO',
  'AK', 'DC', 'OK', 'PA', 'AL', 'MS'
];

// ============================================================================
// COMPLIANCE RULES BY STATE
// ============================================================================

export const COMPLIANCE_RULES_BY_STATE: Record<USState, ComplianceRule[]> = {
  CA: [
    {
      state: 'CA',
      category: 'marketing',
      rule: 'No advertising within 1,000 feet of schools, daycares, or playgrounds',
      required: true,
      penalty: 'License suspension or revocation',
      reference: 'BPC Section 26152',
    },
    {
      state: 'CA',
      category: 'advertising',
      rule: 'At least 71.6% of audience must be 21+ for advertising placement',
      required: true,
      penalty: 'Civil penalty up to $10,000',
      reference: 'BPC Section 26152(h)',
    },
    {
      state: 'CA',
      category: 'claims',
      rule: 'No health, curative, or medicinal claims without scientific evidence',
      required: true,
      penalty: 'False advertising penalties',
      reference: 'BPC Section 26152(g)',
    },
    {
      state: 'CA',
      category: 'age_verification',
      rule: 'Must verify age before displaying products or prices',
      required: true,
      penalty: 'Administrative penalties',
      reference: 'BPC Section 26140',
    },
    {
      state: 'CA',
      category: 'labeling',
      rule: 'Must include "For use only by adults 21 years of age and older. Keep out of reach of children."',
      required: true,
      penalty: 'Product recall, fines',
      reference: 'BPC Section 26120',
    },
    {
      state: 'CA',
      category: 'marketing',
      rule: 'No images, cartoons, or mascots that appeal to minors',
      required: true,
      penalty: 'License suspension',
      reference: 'BPC Section 26152(f)',
    },
    {
      state: 'CA',
      category: 'marketing',
      rule: 'No statements that cannabis is safe or lacks risks',
      required: true,
      penalty: 'Civil penalties',
      reference: 'BPC Section 26152(g)',
    },
  ],

  CO: [
    {
      state: 'CO',
      category: 'advertising',
      rule: 'At least 70% of audience must be 21+ for advertising placement',
      required: true,
      penalty: 'License suspension or fines',
      reference: 'CCR 212-2',
    },
    {
      state: 'CO',
      category: 'marketing',
      rule: 'No unsolicited pop-up ads on websites',
      required: true,
      penalty: 'Administrative action',
      reference: 'CCR 212-2',
    },
    {
      state: 'CO',
      category: 'marketing',
      rule: 'No marketing depicting consumption of marijuana',
      required: true,
      penalty: 'License action',
      reference: 'CCR 212-2',
    },
    {
      state: 'CO',
      category: 'labeling',
      rule: 'Must include universal THC symbol and "Keep out of reach of children"',
      required: true,
      penalty: 'Product holds, fines',
      reference: 'CCR 212-2',
    },
    {
      state: 'CO',
      category: 'claims',
      rule: 'No health or physical benefit claims',
      required: true,
      penalty: 'License action',
      reference: 'CCR 212-2',
    },
  ],

  MA: [
    {
      state: 'MA',
      category: 'advertising',
      rule: 'Advertising only in media where 85% of audience is 21+',
      required: true,
      penalty: 'Civil penalties up to $50,000',
      reference: '935 CMR 500.140',
    },
    {
      state: 'MA',
      category: 'marketing',
      rule: 'No outdoor advertising visible from public ways',
      required: true,
      penalty: 'License suspension',
      reference: '935 CMR 500.140',
    },
    {
      state: 'MA',
      category: 'marketing',
      rule: 'No advertising that makes marijuana use attractive to minors',
      required: true,
      penalty: 'License revocation possible',
      reference: '935 CMR 500.140',
    },
    {
      state: 'MA',
      category: 'labeling',
      rule: 'Must include "Keep out of reach of children" and universal symbol',
      required: true,
      penalty: 'Product embargo',
      reference: '935 CMR 500.105',
    },
  ],

  MI: [
    {
      state: 'MI',
      category: 'advertising',
      rule: 'Advertising only where 70% of audience is 21+',
      required: true,
      penalty: 'License suspension',
      reference: 'MRTMA Section 8',
    },
    {
      state: 'MI',
      category: 'marketing',
      rule: 'No outdoor advertising except at licensed facilities',
      required: true,
      penalty: 'Administrative penalties',
      reference: 'MRTMA Section 8',
    },
    {
      state: 'MI',
      category: 'claims',
      rule: 'No health, therapeutic, or medicinal claims for adult-use products',
      required: true,
      penalty: 'License action',
      reference: 'MRTMA Section 8',
    },
    {
      state: 'MI',
      category: 'labeling',
      rule: 'Must include "This product has not been tested or approved by the FDA"',
      required: true,
      penalty: 'Product recalls',
      reference: 'MRTMA Section 8',
    },
  ],

  NV: [
    {
      state: 'NV',
      category: 'advertising',
      rule: 'Advertising only where 70% of audience is 21+',
      required: true,
      penalty: 'License suspension',
      reference: 'NAC 453D.500',
    },
    {
      state: 'NV',
      category: 'marketing',
      rule: 'No marketing within 1,000 feet of schools or facilities for children',
      required: true,
      penalty: 'Fines and license action',
      reference: 'NAC 453D.500',
    },
    {
      state: 'NV',
      category: 'claims',
      rule: 'No statements that cannabis is safe or FDA-approved',
      required: true,
      penalty: 'Administrative penalties',
      reference: 'NAC 453D.500',
    },
  ],

  OR: [
    {
      state: 'OR',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'Civil penalties up to $5,000 per violation',
      reference: 'OAR 845-025-7000',
    },
    {
      state: 'OR',
      category: 'marketing',
      rule: 'No outdoor advertising visible from public roads',
      required: true,
      penalty: 'License suspension',
      reference: 'OAR 845-025-7000',
    },
    {
      state: 'OR',
      category: 'marketing',
      rule: 'No images or language that appeals to minors',
      required: true,
      penalty: 'License action',
      reference: 'OAR 845-025-7000',
    },
    {
      state: 'OR',
      category: 'labeling',
      rule: 'Must include "Keep out of reach of children" in 11-point font or larger',
      required: true,
      penalty: 'Product holds',
      reference: 'OAR 845-025-7000',
    },
  ],

  WA: [
    {
      state: 'WA',
      category: 'advertising',
      rule: 'Advertising only where 70% of audience is 21+',
      required: true,
      penalty: 'Administrative violations',
      reference: 'WAC 314-55-155',
    },
    {
      state: 'WA',
      category: 'marketing',
      rule: 'No outdoor advertising except at licensed premises',
      required: true,
      penalty: 'License suspension',
      reference: 'WAC 314-55-155',
    },
    {
      state: 'WA',
      category: 'claims',
      rule: 'No health or physical benefit claims',
      required: true,
      penalty: 'License action',
      reference: 'WAC 314-55-155',
    },
    {
      state: 'WA',
      category: 'labeling',
      rule: 'Must include "This product is not approved by the FDA to treat, cure, or prevent any disease"',
      required: true,
      penalty: 'Product recalls',
      reference: 'WAC 314-55-155',
    },
  ],

  AZ: [
    {
      state: 'AZ',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'License suspension',
      reference: 'AAC R9-18-316',
    },
    {
      state: 'AZ',
      category: 'marketing',
      rule: 'No marketing that appeals to minors',
      required: true,
      penalty: 'Administrative penalties',
      reference: 'AAC R9-18-316',
    },
    {
      state: 'AZ',
      category: 'labeling',
      rule: 'Must include universal symbol and health warnings',
      required: true,
      penalty: 'Product holds',
      reference: 'AAC R9-18-316',
    },
  ],

  IL: [
    {
      state: 'IL',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'Fines up to $10,000 per violation',
      reference: '410 ILCS 705/55-21',
    },
    {
      state: 'IL',
      category: 'marketing',
      rule: 'No marketing within 1,000 feet of schools',
      required: true,
      penalty: 'License suspension',
      reference: '410 ILCS 705/55-21',
    },
    {
      state: 'IL',
      category: 'claims',
      rule: 'No health claims for adult-use products',
      required: true,
      penalty: 'Administrative action',
      reference: '410 ILCS 705/55-21',
    },
    {
      state: 'IL',
      category: 'marketing',
      rule: 'No cannabis consumption depicted in advertising',
      required: true,
      penalty: 'License action',
      reference: '410 ILCS 705/55-21',
    },
  ],

  NJ: [
    {
      state: 'NJ',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'Civil penalties',
      reference: 'NJAC 17:30-9.16',
    },
    {
      state: 'NJ',
      category: 'marketing',
      rule: 'No outdoor advertising visible from public areas',
      required: true,
      penalty: 'License suspension',
      reference: 'NJAC 17:30-9.16',
    },
    {
      state: 'NJ',
      category: 'marketing',
      rule: 'No advertising that makes cannabis use attractive to minors',
      required: true,
      penalty: 'Administrative penalties',
      reference: 'NJAC 17:30-9.16',
    },
  ],

  NY: [
    {
      state: 'NY',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'License suspension',
      reference: 'OCM Regulations',
    },
    {
      state: 'NY',
      category: 'marketing',
      rule: 'No outdoor advertising except at licensed premises',
      required: true,
      penalty: 'Administrative penalties',
      reference: 'OCM Regulations',
    },
    {
      state: 'NY',
      category: 'marketing',
      rule: 'No images or language that appeals to minors',
      required: true,
      penalty: 'License action',
      reference: 'OCM Regulations',
    },
  ],

  CT: [
    {
      state: 'CT',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'Fines and license suspension',
      reference: 'CT DCP Regulations',
    },
    {
      state: 'CT',
      category: 'marketing',
      rule: 'No advertising visible from public roads or public places',
      required: true,
      penalty: 'Administrative action',
      reference: 'CT DCP Regulations',
    },
  ],

  VT: [
    {
      state: 'VT',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'License penalties',
      reference: '7 V.S.A. § 881',
    },
    {
      state: 'VT',
      category: 'marketing',
      rule: 'No outdoor advertising',
      required: true,
      penalty: 'Administrative action',
      reference: '7 V.S.A. § 881',
    },
  ],

  ME: [
    {
      state: 'ME',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'License suspension',
      reference: 'MRS Title 28-B',
    },
    {
      state: 'ME',
      category: 'marketing',
      rule: 'No marketing that appeals to minors',
      required: true,
      penalty: 'Administrative penalties',
      reference: 'MRS Title 28-B',
    },
  ],

  MT: [
    {
      state: 'MT',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'License action',
      reference: 'ARM 42.39.301',
    },
    {
      state: 'MT',
      category: 'marketing',
      rule: 'No outdoor advertising visible from public areas',
      required: true,
      penalty: 'Administrative penalties',
      reference: 'ARM 42.39.301',
    },
  ],

  NM: [
    {
      state: 'NM',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'License suspension',
      reference: 'NMAC 16.8.2',
    },
    {
      state: 'NM',
      category: 'marketing',
      rule: 'No outdoor advertising',
      required: true,
      penalty: 'Administrative action',
      reference: 'NMAC 16.8.2',
    },
  ],

  VA: [
    {
      state: 'VA',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'License penalties',
      reference: 'VA Cannabis Control Act',
    },
    {
      state: 'VA',
      category: 'marketing',
      rule: 'No advertising that appeals to minors',
      required: true,
      penalty: 'Administrative action',
      reference: 'VA Cannabis Control Act',
    },
  ],

  RI: [
    {
      state: 'RI',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'License suspension',
      reference: 'RI Gen. Laws § 21-28.11',
    },
    {
      state: 'RI',
      category: 'marketing',
      rule: 'No outdoor advertising',
      required: true,
      penalty: 'Administrative penalties',
      reference: 'RI Gen. Laws § 21-28.11',
    },
  ],

  MD: [
    {
      state: 'MD',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'License action',
      reference: 'COMAR 10.62.35',
    },
    {
      state: 'MD',
      category: 'marketing',
      rule: 'No marketing within 500 feet of schools',
      required: true,
      penalty: 'Administrative penalties',
      reference: 'COMAR 10.62.35',
    },
  ],

  MO: [
    {
      state: 'MO',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'License suspension',
      reference: 'MO Amendment 3',
    },
    {
      state: 'MO',
      category: 'marketing',
      rule: 'No outdoor advertising',
      required: true,
      penalty: 'Administrative action',
      reference: 'MO Amendment 3',
    },
  ],

  AK: [
    {
      state: 'AK',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'License penalties',
      reference: '3 AAC 306.360',
    },
    {
      state: 'AK',
      category: 'marketing',
      rule: 'No outdoor advertising except at licensed premises',
      required: true,
      penalty: 'Administrative action',
      reference: '3 AAC 306.360',
    },
  ],

  DC: [
    {
      state: 'DC',
      category: 'advertising',
      rule: 'Advertising only where 71.6% of audience is 21+',
      required: true,
      penalty: 'License suspension',
      reference: 'DC Initiative 71',
    },
    {
      state: 'DC',
      category: 'marketing',
      rule: 'No public advertising of cannabis products',
      required: true,
      penalty: 'Administrative penalties',
      reference: 'DC Initiative 71',
    },
  ],

  OK: [
    {
      state: 'OK',
      category: 'advertising',
      rule: 'Medical marijuana advertising must comply with state guidelines',
      required: true,
      penalty: 'License suspension',
      reference: 'OAC 310:681-5-6',
    },
    {
      state: 'OK',
      category: 'marketing',
      rule: 'No advertising that appeals to minors',
      required: true,
      penalty: 'Administrative action',
      reference: 'OAC 310:681-5-6',
    },
  ],

  PA: [
    {
      state: 'PA',
      category: 'advertising',
      rule: 'Medical marijuana advertising must comply with state guidelines',
      required: true,
      penalty: 'License suspension',
      reference: 'PA Medical Marijuana Act',
    },
    {
      state: 'PA',
      category: 'marketing',
      rule: 'No advertising within 1,000 feet of schools or daycares',
      required: true,
      penalty: 'Administrative penalties',
      reference: 'PA Medical Marijuana Act',
    },
    {
      state: 'PA',
      category: 'marketing',
      rule: 'No advertising that appeals to minors',
      required: true,
      penalty: 'License action',
      reference: 'PA Medical Marijuana Act',
    },
  ],
  AL: [
    {
      state: 'AL',
      category: 'marketing',
      rule: 'Alabama medical cannabis marketing must remain purely informational and not appeal to minors',
      required: true,
      penalty: 'Administrative fines',
      reference: 'Alabama Medical Cannabis Commission Rules',
    },
    {
      state: 'AL',
      category: 'advertising',
      rule: 'No advertising that promotes adult-use (recreational) cannabis',
      required: true,
      penalty: 'License suspension',
      reference: 'Alabama State Law',
    }
  ],
  MS: [
    {
      state: 'MS',
      category: 'marketing',
      rule: 'No marketing or advertising within 1,000 feet of schools or facilities for children',
      required: true,
      penalty: 'License revocation',
      reference: 'Mississippi Medical Cannabis Act',
    },
    {
      state: 'MS',
      category: 'age_verification',
      rule: 'Must verify medical cannabis patient status before displaying product inventory',
      required: true,
      penalty: 'Criminal penalties possible',
      reference: 'MDOH Regulations',
    }
  ],
};

// ============================================================================
// UNIVERSAL COMPLIANCE BEST PRACTICES
// ============================================================================

export const UNIVERSAL_COMPLIANCE_RULES: ComplianceRule[] = [
  {
    state: 'CA', // Applied to all
    category: 'age_verification',
    rule: 'Age-gate all cannabis-related content with 21+ verification',
    required: true,
    penalty: 'Varies by state',
    reference: 'Industry best practice',
  },
  {
    state: 'CA',
    category: 'claims',
    rule: 'Never claim FDA approval or make unsupported medical claims',
    required: true,
    penalty: 'Federal enforcement action possible',
    reference: 'FDA guidelines',
  },
  {
    state: 'CA',
    category: 'marketing',
    rule: 'Never target marketing to minors or use content that appeals to minors',
    required: true,
    penalty: 'Varies by state',
    reference: 'All state regulations',
  },
  {
    state: 'CA',
    category: 'labeling',
    rule: 'Include child-resistant packaging warnings',
    required: true,
    penalty: 'Varies by state',
    reference: 'All state regulations',
  },
  {
    state: 'CA',
    category: 'advertising',
    rule: 'Do not advertise on platforms primarily used by minors',
    required: true,
    penalty: 'Platform bans, state penalties',
    reference: 'Industry best practice',
  },
];

// ============================================================================
// SOCIAL MEDIA PLATFORM RESTRICTIONS
// ============================================================================

export const SOCIAL_MEDIA_RESTRICTIONS = {
  instagram: {
    allowed: true,
    restrictions: [
      'No direct product sales',
      'No tagging product posts as shoppable',
      'Age-restricted content only',
      'Risk of account suspension',
    ],
    bestPractices: [
      'Focus on education and brand awareness',
      'Avoid showing consumption',
      'Use lifestyle imagery',
      'Include disclaimers',
    ],
  },
  facebook: {
    allowed: true,
    restrictions: [
      'No paid advertising for THC products',
      'No marketplace listings',
      'CBD products only with restrictions',
      'Age-restricted content',
    ],
    bestPractices: [
      'Educational content only',
      'Community building',
      'Event promotion',
      'News and updates',
    ],
  },
  twitter: {
    allowed: true,
    restrictions: [
      'No paid promotion of THC products',
      'Sensitive content warnings',
      'May limit reach',
    ],
    bestPractices: [
      'Industry news and education',
      'Brand personality',
      'Customer engagement',
      'Compliance-focused content',
    ],
  },
  tiktok: {
    allowed: false,
    restrictions: [
      'No cannabis content allowed',
      'Immediate account bans',
      'CBD may be restricted',
    ],
    bestPractices: [
      'Do not post cannabis-related content',
      'Consider educational wellness content only',
    ],
  },
  youtube: {
    allowed: true,
    restrictions: [
      'No paid advertising',
      'Age-restricted content',
      'Educational content preferred',
      'Demonetization risk',
    ],
    bestPractices: [
      'Educational videos',
      'Strain reviews (careful)',
      'Industry news',
      'How-to guides (non-consumption)',
    ],
  },
  linkedin: {
    allowed: true,
    restrictions: [
      'Professional content only',
      'B2B focus acceptable',
      'Industry news and analysis',
    ],
    bestPractices: [
      'Industry insights',
      'Company updates',
      'Professional networking',
      'Thought leadership',
    ],
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getComplianceRulesByState(state: USState): ComplianceRule[] {
  return COMPLIANCE_RULES_BY_STATE[state] || [];
}

export function getAllComplianceRules(): ComplianceRule[] {
  const allRules: ComplianceRule[] = [];
  Object.values(COMPLIANCE_RULES_BY_STATE).forEach((rules) => {
    allRules.push(...rules);
  });
  return [...new Set(allRules)]; // Deduplicate
}

export function getComplianceRulesByCategory(
  state: USState,
  category: ComplianceRule['category']
): ComplianceRule[] {
  const stateRules = getComplianceRulesByState(state);
  return stateRules.filter((rule) => rule.category === category);
}

export function getRequiredDisclaimers(state: USState): string[] {
  const stateRules = getComplianceRulesByState(state);
  const labelingRules = stateRules.filter(
    (rule) => rule.category === 'labeling' && rule.required
  );
  return labelingRules.map((rule) => rule.rule);
}

export function validateComplianceForStates(states: USState[]): {
  state: USState;
  rules: ComplianceRule[];
  criticalRules: ComplianceRule[];
}[] {
  return states.map((state) => {
    const rules = getComplianceRulesByState(state);
    const criticalRules = rules.filter((rule) => rule.required);
    return { state, rules, criticalRules };
  });
}

export function getSocialMediaGuidelines() {
  return SOCIAL_MEDIA_RESTRICTIONS;
}
