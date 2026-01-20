

export type PlanId = "scout" | "pro" | "growth" | "empire" | "free" | "claim_pro" | "founders_claim" | "growth_5" | "scale_10" | "pro_25" | "enterprise";

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  baseAmount: number;          // USD / month
  includedLocations: number;
  extraPerLocation: number | null; // null = no automatic extras / custom
  includedZips?: number;       // Number of ZIP pages included (if applicable)
}

export type CoveragePackId = "pack_100" | "pack_500";
export interface CoveragePackConfig {
  id: CoveragePackId;
  name: string;
  description: string;
  amount: number;
  zipCount: number;
}

export const COVERAGE_PACKS: Record<CoveragePackId, CoveragePackConfig> = {
  pack_100: {
    id: "pack_100",
    name: "Coverage Pack +100",
    description: "Add 100 ZIP codes to your coverage.",
    amount: 49,
    zipCount: 100
  },
  pack_500: {
    id: "pack_500",
    name: "Coverage Pack +500",
    description: "Add 500 ZIP codes to your coverage.",
    amount: 149,
    zipCount: 500
  }
};

export const PLANS: Record<PlanId, PlanConfig> = {
  scout: {
    id: "scout",
    name: "The Scout",
    description: "Monitor your market and keep an eye on competitors.",
    baseAmount: 0,
    includedLocations: 1,
    extraPerLocation: null,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Turn your menu into your #1 sales channel.",
    baseAmount: 99,
    includedLocations: 1,
    extraPerLocation: 49,
    includedZips: 3,
  },
  growth: {
    id: "growth",
    name: "Growth",
    description: "Scale your reach and automate retention.",
    baseAmount: 249,
    includedLocations: 5,
    extraPerLocation: 25,
    includedZips: 10,
  },
  empire: {
    id: "empire",
    name: "Empire",
    description: "Full autonomy at scale.",
    baseAmount: 0, // Custom
    includedLocations: 999,
    extraPerLocation: null,
  },
  // Legacy mappings for safety
  free: { id: "scout", name: "The Scout", description: "", baseAmount: 0, includedLocations: 1, extraPerLocation: null },
  claim_pro: { id: "pro", name: "Pro", description: "", baseAmount: 99, includedLocations: 1, extraPerLocation: 49 },
  founders_claim: { id: "pro", name: "Founders Claim", description: "", baseAmount: 79, includedLocations: 1, extraPerLocation: 49 },
};

export function computeMonthlyAmount(planId: PlanId, locationCount: number, coveragePackIds: CoveragePackId[] = []): number {
  const plan = PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  // Enterprise handled offline
  if (planId === "enterprise") {
    throw new Error("Enterprise pricing is handled via custom agreement.");
  }

  if (plan.baseAmount === 0 && locationCount <= 1) {
    // Free stays free
    return 0;
  }

  // Calculate Base + Extra Locations
  let total = plan.baseAmount;

  const extrasAllowed = plan.extraPerLocation != null;
  const extras =
    extrasAllowed && locationCount > plan.includedLocations
      ? locationCount - plan.includedLocations
      : 0;

  const extraAmount = extrasAllowed ? extras * (plan.extraPerLocation || 0) : 0;
  total += extraAmount;

  // Calculate Coverage Packs
  for (const packId of coveragePackIds) {
    const pack = COVERAGE_PACKS[packId];
    if (pack) {
      total += pack.amount;
    }
  }

  return total;
}
