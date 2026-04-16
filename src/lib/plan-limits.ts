import { PlanId } from './plans';

interface CannMenusLimit {
    maxRetailers: number;
    maxProducts: number;
}

interface EzalLimit {
    frequencyMinutes: number;
    maxCompetitors: number;
}

export const CANNMENUS_LIMITS: Record<PlanId, CannMenusLimit> = {
    free: { maxRetailers: 1, maxProducts: 10 },
    access_intel: { maxRetailers: 1, maxProducts: 5000 },
    access_retention: { maxRetailers: 3, maxProducts: 50000 },
    access_complete: { maxRetailers: 3, maxProducts: 50000 },
    operator_core: { maxRetailers: 3, maxProducts: 75000 },
    operator_growth: { maxRetailers: 10, maxProducts: 250000 },
    enterprise: { maxRetailers: 1000, maxProducts: 1000000 },
    signal: { maxRetailers: 1, maxProducts: 5000 },
    convert: { maxRetailers: 1, maxProducts: 25000 },
    retain: { maxRetailers: 3, maxProducts: 50000 },
    optimize: { maxRetailers: 10, maxProducts: 250000 },
    scout: { maxRetailers: 1, maxProducts: 10 },
    pro: { maxRetailers: 1, maxProducts: 10000 },
    growth: { maxRetailers: 5, maxProducts: 10000 },
    empire: { maxRetailers: 10000, maxProducts: 1000000 },
    claim_pro: { maxRetailers: 1, maxProducts: 10000 },
    founders_claim: { maxRetailers: 1, maxProducts: 10000 },
    growth_5: { maxRetailers: 5, maxProducts: 10000 },
    scale_10: { maxRetailers: 10, maxProducts: 25000 },
    pro_25: { maxRetailers: 25, maxProducts: 50000 },
    custom_25: { maxRetailers: 1, maxProducts: 10000 },
};

export const EZAL_LIMITS: Record<PlanId, EzalLimit> = {
    free: { frequencyMinutes: 60 * 24 * 7, maxCompetitors: 3 },
    access_intel: { frequencyMinutes: 60 * 24, maxCompetitors: 10 },
    access_retention: { frequencyMinutes: 60 * 24, maxCompetitors: 15 },
    access_complete: { frequencyMinutes: 60 * 24, maxCompetitors: 15 },
    operator_core: { frequencyMinutes: 60 * 12, maxCompetitors: 30 },
    operator_growth: { frequencyMinutes: 60 * 6, maxCompetitors: 100 },
    enterprise: { frequencyMinutes: 60, maxCompetitors: 500 },
    signal: { frequencyMinutes: 60 * 24 * 7, maxCompetitors: 5 },
    convert: { frequencyMinutes: 60 * 24, maxCompetitors: 15 },
    retain: { frequencyMinutes: 60 * 12, maxCompetitors: 30 },
    optimize: { frequencyMinutes: 60 * 6, maxCompetitors: 100 },
    scout: { frequencyMinutes: 60 * 24 * 7, maxCompetitors: 3 },
    pro: { frequencyMinutes: 60 * 24, maxCompetitors: 10 },
    growth: { frequencyMinutes: 60 * 24, maxCompetitors: 20 },
    empire: { frequencyMinutes: 15, maxCompetitors: 1000 },
    claim_pro: { frequencyMinutes: 60 * 24, maxCompetitors: 10 },
    founders_claim: { frequencyMinutes: 60 * 24, maxCompetitors: 10 },
    growth_5: { frequencyMinutes: 60 * 24, maxCompetitors: 20 },
    scale_10: { frequencyMinutes: 60 * 12, maxCompetitors: 50 },
    pro_25: { frequencyMinutes: 60 * 6, maxCompetitors: 100 },
    custom_25: { frequencyMinutes: 60 * 24, maxCompetitors: 10 },
};

export function getPlanLimits(planId: string): CannMenusLimit {
    const limits = CANNMENUS_LIMITS[planId as PlanId];
    if (limits) return limits;
    return CANNMENUS_LIMITS.free;
}

export function getEzalLimits(planId: string): EzalLimit {
    const limits = EZAL_LIMITS[planId as PlanId];
    if (limits) return limits;
    return EZAL_LIMITS.free;
}
