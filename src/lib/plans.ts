
export type PlanId = "free" | "growth_5" | "scale_10" | "pro_25" | "enterprise";

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  baseAmount: number;          // USD / month
  includedLocations: number;
  extraPerLocation: number | null; // null = no automatic extras / custom
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "Smokey Lite, 1 location, basic menu.",
    baseAmount: 0,
    includedLocations: 1,
    extraPerLocation: null,
  },
  growth_5: {
    id: "growth_5",
    name: "Growth",
    description: "Up to 5 locations.",
    baseAmount: 350,
    includedLocations: 5,
    extraPerLocation: 25,
  },
  scale_10: {
    id: "scale_10",
    name: "Scale",
    description: "Up to 10 locations, $25/mo each additional location.",
    baseAmount: 700,
    includedLocations: 10,
    extraPerLocation: 25,
  },
  pro_25: {
    id: "pro_25",
    name: "Pro",
    description: "Up to 25 locations, $15/mo each additional location.",
    baseAmount: 1500,
    includedLocations: 25,
    extraPerLocation: 15,
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

export function computeMonthlyAmount(planId: PlanId, locationCount: number): number {
  const plan = PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  // Enterprise handled offline
  if (planId === "enterprise") {
    throw new Error("Enterprise pricing is handled via custom agreement.");
  }

  if (plan.baseAmount === 0) {
    // Free stays free, even if they try to hack locationCount
    return 0;
  }

  const extrasAllowed = plan.extraPerLocation != null;
  const extras =
    extrasAllowed && locationCount > plan.includedLocations
      ? locationCount - plan.includedLocations
      : 0;

  const extraAmount = extrasAllowed ? extras * (plan.extraPerLocation || 0) : 0;

  return plan.baseAmount + extraAmount;
}
