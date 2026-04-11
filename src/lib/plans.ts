export type PlanId =
  | 'free'
  | 'access_intel'
  | 'access_retention'
  | 'operator_core'
  | 'operator_growth'
  | 'enterprise'
  | 'signal'
  | 'convert'
  | 'retain'
  | 'optimize'
  | 'scout'
  | 'pro'
  | 'growth'
  | 'empire'
  | 'claim_pro'
  | 'founders_claim'
  | 'growth_5'
  | 'scale_10'
  | 'pro_25'
  | 'custom_25';

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  baseAmount: number;
  includedLocations: number;
  extraPerLocation: number | null;
  includedZips?: number;
}

export type CoveragePackId = 'pack_100' | 'pack_500';

export interface CoveragePackConfig {
  id: CoveragePackId;
  name: string;
  description: string;
  amount: number;
  zipCount: number;
}

export const COVERAGE_PACKS: Record<CoveragePackId, CoveragePackConfig> = {
  pack_100: {
    id: 'pack_100',
    name: 'Coverage Pack +100',
    description: 'Add 100 ZIP codes to your coverage.',
    amount: 49,
    zipCount: 100,
  },
  pack_500: {
    id: 'pack_500',
    name: 'Coverage Pack +500',
    description: 'Add 500 ZIP codes to your coverage.',
    amount: 149,
    zipCount: 500,
  },
};

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free Check-In',
    description: 'Start free with customer capture and a welcome starter flow.',
    baseAmount: 0,
    includedLocations: 1,
    extraPerLocation: null,
  },
  access_intel: {
    id: 'access_intel',
    name: 'Access Intel',
    description: 'Track your market before you buy managed execution.',
    baseAmount: 149,
    includedLocations: 1,
    extraPerLocation: null,
  },
  access_retention: {
    id: 'access_retention',
    name: 'Access Retention',
    description: 'Narrow welcome and retention proof of value.',
    baseAmount: 499,
    includedLocations: 1,
    extraPerLocation: null,
  },
  operator_core: {
    id: 'operator_core',
    name: 'Operator Core',
    description: 'Managed welcome and lifecycle execution.',
    baseAmount: 2500,
    includedLocations: 3,
    extraPerLocation: 250,
  },
  operator_growth: {
    id: 'operator_growth',
    name: 'Operator Growth',
    description: 'Managed revenue activation for multi-location operators.',
    baseAmount: 3500,
    includedLocations: 10,
    extraPerLocation: 200,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom implementation and governance.',
    baseAmount: 0,
    includedLocations: 999,
    extraPerLocation: null,
  },
  signal: {
    id: 'signal',
    name: 'Signal',
    description: 'Grandfathered visibility plan.',
    baseAmount: 149,
    includedLocations: 1,
    extraPerLocation: null,
  },
  convert: {
    id: 'convert',
    name: 'Convert',
    description: 'Grandfathered commerce performance plan.',
    baseAmount: 499,
    includedLocations: 1,
    extraPerLocation: null,
  },
  retain: {
    id: 'retain',
    name: 'Retain',
    description: 'Grandfathered lifecycle revenue plan.',
    baseAmount: 799,
    includedLocations: 3,
    extraPerLocation: 99,
  },
  optimize: {
    id: 'optimize',
    name: 'Optimize',
    description: 'Grandfathered advanced operator plan.',
    baseAmount: 1500,
    includedLocations: 10,
    extraPerLocation: 75,
  },
  scout: {
    id: 'scout',
    name: 'The Scout',
    description: 'Historic compatibility plan.',
    baseAmount: 0,
    includedLocations: 1,
    extraPerLocation: null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Historic compatibility plan.',
    baseAmount: 99,
    includedLocations: 1,
    extraPerLocation: 49,
    includedZips: 3,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: 'Historic compatibility plan.',
    baseAmount: 249,
    includedLocations: 5,
    extraPerLocation: 25,
    includedZips: 10,
  },
  empire: {
    id: 'empire',
    name: 'Empire',
    description: 'Historic compatibility plan.',
    baseAmount: 0,
    includedLocations: 999,
    extraPerLocation: null,
  },
  claim_pro: {
    id: 'claim_pro',
    name: 'Claim Pro',
    description: 'Historic compatibility plan.',
    baseAmount: 99,
    includedLocations: 1,
    extraPerLocation: 49,
  },
  founders_claim: {
    id: 'founders_claim',
    name: 'Founders Claim',
    description: 'Historic compatibility plan.',
    baseAmount: 79,
    includedLocations: 1,
    extraPerLocation: 49,
  },
  growth_5: {
    id: 'growth_5',
    name: 'Growth 5',
    description: 'Historic compatibility plan.',
    baseAmount: 249,
    includedLocations: 5,
    extraPerLocation: 25,
  },
  scale_10: {
    id: 'scale_10',
    name: 'Scale 10',
    description: 'Historic compatibility plan.',
    baseAmount: 349,
    includedLocations: 10,
    extraPerLocation: 25,
  },
  pro_25: {
    id: 'pro_25',
    name: 'Pro 25',
    description: 'Historic compatibility plan.',
    baseAmount: 499,
    includedLocations: 25,
    extraPerLocation: 20,
  },
  custom_25: {
    id: 'custom_25',
    name: 'Custom 25',
    description: '$25/month custom plan.',
    baseAmount: 25,
    includedLocations: 1,
    extraPerLocation: null,
  },
};

export function computeMonthlyAmount(
  planId: PlanId,
  locationCount: number,
  coveragePackIds: CoveragePackId[] = []
): number {
  const plan = PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  if (planId === 'enterprise' || planId === 'empire') {
    throw new Error('Enterprise pricing is handled via custom agreement.');
  }

  if (plan.baseAmount === 0 && locationCount <= 1) {
    return 0;
  }

  let total = plan.baseAmount;
  const extrasAllowed = plan.extraPerLocation != null;
  const extras =
    extrasAllowed && locationCount > plan.includedLocations
      ? locationCount - plan.includedLocations
      : 0;

  total += extrasAllowed ? extras * (plan.extraPerLocation || 0) : 0;

  for (const packId of coveragePackIds) {
    const pack = COVERAGE_PACKS[packId];
    if (pack) {
      total += pack.amount;
    }
  }

  return total;
}
