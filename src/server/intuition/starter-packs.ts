/**
 * Intuition OS - Starter Packs (Cold Start Solution)
 * 
 * Pre-configured defaults for new tenants until real data accumulates.
 * These provide industry-average heuristics and patterns.
 */

import {
    StarterPack,
    StarterPackType,
    Heuristic,
    PatternCluster,
    DailyMetrics,
} from './schema';
import { createHeuristic, HEURISTIC_TEMPLATES } from './heuristics';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// --- Starter Pack Definitions ---

const STARTER_PACKS: Record<StarterPackType, Omit<StarterPack, 'id'>> = {
    dispensary_urban: {
        type: 'dispensary_urban',
        name: 'Urban Dispensary Starter',
        description: 'Default configuration for urban dispensaries with high foot traffic',
        defaultHeuristics: [
            HEURISTIC_TEMPLATES.new_user_low_thc,
            HEURISTIC_TEMPLATES.prefer_in_stock,
            HEURISTIC_TEMPLATES.avoid_high_potency_edibles,
        ],
        defaultPatterns: [
            {
                label: 'Value Seekers',
                type: 'customer_cluster',
                supportCount: 100,
                topProducts: [],
                topEffects: ['relaxing', 'focus'],
            },
            {
                label: 'Premium Enthusiasts',
                type: 'customer_cluster',
                supportCount: 50,
                topProducts: [],
                topEffects: ['creative', 'euphoric'],
            },
            {
                label: 'Medical Focus',
                type: 'customer_cluster',
                supportCount: 75,
                topProducts: [],
                topEffects: ['pain relief', 'sleep'],
            },
        ],
        baselineMetrics: {
            totalSales: 5000,
            orders: 80,
            avgOrderValue: 62.5,
            newCustomers: 20,
            returningCustomers: 60,
            channelBreakdown: { web: 1500, inStore: 3000, sms: 500 },
        },
    },

    dispensary_rural: {
        type: 'dispensary_rural',
        name: 'Rural Dispensary Starter',
        description: 'Default configuration for rural dispensaries with destination shoppers',
        defaultHeuristics: [
            HEURISTIC_TEMPLATES.new_user_low_thc,
            HEURISTIC_TEMPLATES.prefer_in_stock,
        ],
        defaultPatterns: [
            {
                label: 'Bulk Buyers',
                type: 'customer_cluster',
                supportCount: 80,
                topProducts: [],
                topEffects: ['relaxing'],
            },
            {
                label: 'Occasional Visitors',
                type: 'customer_cluster',
                supportCount: 40,
                topProducts: [],
                topEffects: ['sleep', 'pain relief'],
            },
        ],
        baselineMetrics: {
            totalSales: 3000,
            orders: 40,
            avgOrderValue: 75,
            newCustomers: 10,
            returningCustomers: 30,
            channelBreakdown: { web: 500, inStore: 2400, sms: 100 },
        },
    },

    brand: {
        type: 'brand',
        name: 'Cannabis Brand Starter',
        description: 'Default configuration for cannabis brands (B2B focus)',
        defaultHeuristics: [
            HEURISTIC_TEMPLATES.prefer_in_stock,
        ],
        defaultPatterns: [
            {
                label: 'High Volume Retailers',
                type: 'customer_cluster',
                supportCount: 30,
                topProducts: [],
                topEffects: [],
            },
            {
                label: 'Boutique Shops',
                type: 'customer_cluster',
                supportCount: 50,
                topProducts: [],
                topEffects: [],
            },
        ],
        baselineMetrics: {
            totalSales: 50000,
            orders: 20,
            avgOrderValue: 2500,
            newCustomers: 5,
            returningCustomers: 15,
            channelBreakdown: { web: 20000, inStore: 0, sms: 30000 },
        },
    },

    delivery: {
        type: 'delivery',
        name: 'Delivery Service Starter',
        description: 'Default configuration for cannabis delivery services',
        defaultHeuristics: [
            HEURISTIC_TEMPLATES.new_user_low_thc,
            HEURISTIC_TEMPLATES.prefer_in_stock,
            HEURISTIC_TEMPLATES.avoid_high_potency_edibles,
        ],
        defaultPatterns: [
            {
                label: 'Convenience Seekers',
                type: 'customer_cluster',
                supportCount: 120,
                topProducts: [],
                topEffects: ['relaxing', 'sleep'],
            },
            {
                label: 'Regular Subscribers',
                type: 'customer_cluster',
                supportCount: 60,
                topProducts: [],
                topEffects: ['focus', 'creative'],
            },
        ],
        baselineMetrics: {
            totalSales: 4000,
            orders: 60,
            avgOrderValue: 66.7,
            newCustomers: 30,
            returningCustomers: 30,
            channelBreakdown: { web: 3200, inStore: 0, sms: 800, delivery: 4000 },
        },
    },
};

// --- Starter Pack Application ---

/**
 * Gets a starter pack definition.
 */
export function getStarterPackDefinition(type: StarterPackType): StartPack | undefined {
    const pack = STARTER_PACKS[type];
    if (!pack) return undefined;

    return {
        id: `starter_${type}`,
        ...pack,
    } as StarterPack;
}

/**
 * Applies a starter pack to a tenant.
 * Creates default heuristics and patterns.
 */
export async function applyStarterPack(
    tenantId: string,
    packType: StarterPackType
): Promise<{
    heuristicsCreated: number;
    patternsCreated: number;
}> {
    const pack = STARTER_PACKS[packType];
    if (!pack) {
        throw new Error(`Unknown starter pack type: ${packType}`);
    }

    logger.info(`[StarterPacks] Applying ${packType} pack to tenant ${tenantId}`);

    // Create heuristics
    let heuristicsCreated = 0;
    for (const heuristicDef of pack.defaultHeuristics) {
        try {
            await createHeuristic(tenantId, heuristicDef);
            heuristicsCreated++;
        } catch (error) {
            logger.error(`[StarterPacks] Failed to create heuristic: ${heuristicDef.name}`,
                error instanceof Error ? error : new Error(String(error)));
        }
    }

    // Create patterns
    let patternsCreated = 0;
    const { firestore } = await createServerClient();
    const now = new Date().toISOString();

    for (const patternDef of pack.defaultPatterns) {
        try {
            const pattern: PatternCluster = {
                id: uuidv4(),
                tenantId,
                ...patternDef,
                createdAt: now,
                updatedAt: now,
            };

            await firestore
                .collection(`tenants/${tenantId}/patterns`)
                .doc(pattern.id)
                .set(pattern);

            patternsCreated++;
        } catch (error) {
            logger.error(`[StarterPacks] Failed to create pattern: ${patternDef.label}`,
                error instanceof Error ? error : new Error(String(error)));
        }
    }

    // Store starter pack reference
    await firestore
        .collection(`tenants/${tenantId}/starterPacks`)
        .doc(packType)
        .set({
            type: packType,
            appliedAt: now,
            heuristicsCreated,
            patternsCreated,
        });

    logger.info(`[StarterPacks] Applied: ${heuristicsCreated} heuristics, ${patternsCreated} patterns`);

    return { heuristicsCreated, patternsCreated };
}

/**
 * Gets baseline metrics from starter pack (for comparison).
 */
export function getBaselineMetrics(packType: StarterPackType): Partial<DailyMetrics> {
    const pack = STARTER_PACKS[packType];
    return pack?.baselineMetrics || {};
}

/**
 * Checks if tenant has any starter pack applied.
 */
export async function hasStarterPack(tenantId: string): Promise<boolean> {
    try {
        const { firestore } = await createServerClient();
        const snapshot = await firestore
            .collection(`tenants/${tenantId}/starterPacks`)
            .limit(1)
            .get();

        return !snapshot.empty;
    } catch (error) {
        return false;
    }
}

// Type alias for external use
type StartPack = StarterPack;
