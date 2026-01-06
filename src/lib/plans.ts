

export type PlanId = "free" | "claim_pro" | "founders_claim" | "growth_5" | "scale_10" | "pro_25" | "enterprise";

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
  free: {
    id: "free",
    name: "The Scout",
    description: "Unclaimed listing + Digital Worker Briefing.",
    baseAmount: 0,
    includedLocations: 1,
    extraPerLocation: null,
  },
  claim_pro: {
    id: "claim_pro",
    name: "Claim Pro",
    description: "Verified badge, edits, analytics, and control.",
    baseAmount: 99,
    includedLocations: 1,
    extraPerLocation: 49, // Assuming upsell for extra locations on Claim Pro? Or just keep it single? Plan implies "Upsell to Growth". Let's say null or high. Setting to 49 for now as standard add-on or null if strict. I'll use 49.
    includedZips: 25,
  },
  founders_claim: {
    id: "founders_claim",
    name: "Founders Claim",
    description: "Locked-in pricing for life. All Claim Pro benefits.",
    baseAmount: 79,
    includedLocations: 1,
    extraPerLocation: 49,
    includedZips: 25,
  },
  growth_5: {
    id: "growth_5",
    name: "Growth",
    description: "Up to 5 locations + marketing playbooks.",
    baseAmount: 350,
    includedLocations: 5,
    extraPerLocation: 25,
    includedZips: 50,
  },
  scale_10: {
    id: "scale_10",
    name: "Scale",
    description: "Up to 10 locations + automation.",
    baseAmount: 700,
    includedLocations: 10,
    extraPerLocation: 25,
    includedZips: 100,
  },
  pro_25: {
    id: "pro_25",
    name: "Pro",
    description: "Up to 25 locations.",
    baseAmount: 1500,
    includedLocations: 25,
    extraPerLocation: 15,
    includedZips: 250,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "25+ locations with custom pricing and terms.",
    baseAmount: 0,
    includedLocations: 0,
    extraPerLocation: null,
  },
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
