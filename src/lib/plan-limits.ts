import { PlanId } from './plans';

interface CannMenusLimit {
    maxRetailers: number;
    maxProducts: number;
}

interface EzalLimit {
    frequencyMinutes: number; // How often to refresh competitor data
    maxCompetitors: number;
}

export const CANNMENUS_LIMITS: Record<PlanId, CannMenusLimit> = {
    // Current plan IDs
    scout: {
        maxRetailers: 1,
        maxProducts: 10
    },
    pro: {
        maxRetailers: 1,
        maxProducts: 10000
    },
    growth: {
        maxRetailers: 5,
        maxProducts: 10000
    },
    empire: {
        maxRetailers: 10000,
        maxProducts: 1000000
    },
    // Legacy plan IDs (mapped to equivalents)
    free: {
        maxRetailers: 1,
        maxProducts: 10
    },
    claim_pro: {
        maxRetailers: 1,
        maxProducts: 10000
    },
    founders_claim: {
        maxRetailers: 1,
        maxProducts: 10000
    },
    growth_5: {
        maxRetailers: 5,
        maxProducts: 10000
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

// Ezal Lite: Free = weekly (10080 mins), Paid = daily (1440 mins)
export const EZAL_LIMITS: Record<PlanId, EzalLimit> = {
    // Current plan IDs
    scout: { frequencyMinutes: 60 * 24 * 7, maxCompetitors: 3 }, // Weekly, 3 competitors
    pro: { frequencyMinutes: 60 * 24, maxCompetitors: 10 }, // Daily
    growth: { frequencyMinutes: 60 * 24, maxCompetitors: 20 }, // Daily
    empire: { frequencyMinutes: 15, maxCompetitors: 1000 }, // 15 mins
    // Legacy plan IDs
    free: { frequencyMinutes: 60 * 24 * 7, maxCompetitors: 3 }, // Weekly, 3 competitors
    claim_pro: { frequencyMinutes: 60 * 24, maxCompetitors: 10 }, // Daily
    founders_claim: { frequencyMinutes: 60 * 24, maxCompetitors: 10 },
    growth_5: { frequencyMinutes: 60 * 24, maxCompetitors: 20 },
    scale_10: { frequencyMinutes: 60 * 12, maxCompetitors: 50 }, // Twice daily
    pro_25: { frequencyMinutes: 60 * 6, maxCompetitors: 100 }, // Every 6 hours
    enterprise: { frequencyMinutes: 60, maxCompetitors: 500 } // Hourly
};

export function getPlanLimits(planId: string): CannMenusLimit {
    const limits = CANNMENUS_LIMITS[planId as PlanId];
    if (limits) return limits;

    // Default fallback (safe/restrictive)
    return CANNMENUS_LIMITS.free;
}

export function getEzalLimits(planId: string): EzalLimit {
    const limits = EZAL_LIMITS[planId as PlanId];
    if (limits) return limits;

    return EZAL_LIMITS.free;
}
