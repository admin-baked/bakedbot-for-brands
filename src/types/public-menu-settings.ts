export interface PublicLoyaltyTier {
  name: string;
  pointsRequired: number;
  multiplier: number;
}

export interface PublicRedemptionTier {
  points: number;
  value: number;
}

export interface PublicDiscountProgram {
  enabled: boolean;
  name: string;
  description: string;
}

export interface PublicMenuSettings {
  pointsPerDollar?: number;
  tiers?: PublicLoyaltyTier[];
  redemptionTiers?: PublicRedemptionTier[];
  discountPrograms?: PublicDiscountProgram[];
}
