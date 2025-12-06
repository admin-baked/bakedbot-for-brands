import { PlanId } from './plans';

interface CannMenusLimit {
    maxRetailers: number;
    maxProducts: number;
}

export const CANNMENUS_LIMITS: Record<PlanId, CannMenusLimit> = {
    free: {
        maxRetailers: 1,
        maxProducts: 10
    },
    growth_5: {
        maxRetailers: 5,
        maxProducts: 10000 // Effectively unlimited
    },
    scale_10: {
        maxRetailers: 10,
        maxProducts: 25000
    },
    pro_25: {
        maxRetailers: 25,
        maxProducts: 50000
    },
    enterprise: {
        maxRetailers: 1000,
        maxProducts: 100000
    }
};

export function getPlanLimits(planId: string): CannMenusLimit {
    const limits = CANNMENUS_LIMITS[planId as PlanId];
    if (limits) return limits;

    // Default fallback (safe/restrictive)
    return CANNMENUS_LIMITS.free;
}
