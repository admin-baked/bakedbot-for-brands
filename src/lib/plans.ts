
export type PlanId = "free" | "growth_5" | "scale_10" | "pro_25" | "enterprise";

export interface PlanConfig {
  id: PlanId;
  name: string;
  baseAmount: number;          // USD per month
  includedLocations: number;
  extraPerLocation: number | null; // null = not allowed / custom only
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    baseAmount: 0,
    includedLocations: 1,
    extraPerLocation: null, // keep it simple: no extras on free
  },
  growth_5: {
    id: "growth_5",
    name: "Growth (up to 5 locations)",
    baseAmount: 350,
    includedLocations: 5,
    extraPerLocation: 25,
  },
  scale_10: {
    id: "scale_10",
    name: "Scale (up to 10 locations)",
    baseAmount: 700,
    includedLocations: 10,
    extraPerLocation: 25,
  },
  pro_25: {
    id: "pro_25",
    name: "Pro (up to 25 locations)",
    baseAmount: 1500,
    includedLocations: 25,
    extraPerLocation: 15,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    baseAmount: 0,             // handled manually
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
    throw new Error("Enterprise billing is handled via custom contract.");
  }

  if (plan.baseAmount === 0) {
    // free tier, ignore location count for billing
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
