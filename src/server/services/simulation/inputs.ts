/**
 * Simulation Engine - Inputs Loader
 * 
 * Loads and snapshots all inputs for a simulation run.
 * Creates a reproducible inputs.json.gz for auditability.
 */

import { createServerClient } from '@/firebase/server-client';
import {
    SimProfile,
    SimScenario,
    SimInputs,
    SimProduct,
    SimCompetitorSnapshot,
    SimHistoricalStats,
} from '@/types/simulation';
import { getProfileConfig, SIM_WARNINGS } from '@/types/simulation-profiles';

// ==========================================
// Load Catalog
// ==========================================

export async function loadCatalog(tenantId: string): Promise<SimProduct[]> {
    const { firestore } = await createServerClient();

    const snap = await firestore
        .collection(`tenants/${tenantId}/catalog/products`)
        .where('active', '!=', false)
        .limit(1000)
        .get();

    // Fallback: check brands/{brandId}/products
    if (snap.empty) {
        const brandSnap = await firestore
            .collection(`brands/${tenantId}/products`)
            .limit(1000)
            .get();

        return brandSnap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || 'Unknown',
            brandId: doc.data().brandId || tenantId,
            category: doc.data().category || 'other',
            price: doc.data().price || 0,
            cogs: doc.data().cogs,
            inStock: doc.data().inStock !== false,
        }));
    }

    return snap.docs.map(doc => ({
        id: doc.id,
        variantId: doc.data().variantId,
        name: doc.data().name || 'Unknown',
        brandId: doc.data().brandId || '',
        category: doc.data().category || 'other',
        price: doc.data().price || 0,
        cogs: doc.data().cogs,
        inStock: doc.data().inStock !== false,
    }));
}

// ==========================================
// Load Inventory (Dispensary)
// ==========================================

export async function loadInventory(
    tenantId: string,
    locationId?: string
): Promise<Record<string, number>> {
    const { firestore } = await createServerClient();
    const inventory: Record<string, number> = {};

    const path = locationId
        ? `tenants/${tenantId}/inventory/${locationId}/items`
        : `tenants/${tenantId}/inventory`;

    try {
        const snap = await firestore.collection(path).limit(5000).get();
        snap.forEach(doc => {
            const data = doc.data();
            inventory[doc.id] = data.quantity || data.qty || 0;
        });
    } catch (e) {
        // Inventory may not exist
    }

    return inventory;
}

// ==========================================
// Load Competitor Snapshots (via Ezal)
// ==========================================

export async function loadCompetitorSnapshots(
    tenantId: string,
    competitorIds?: string[]
): Promise<SimCompetitorSnapshot[]> {
    const { firestore } = await createServerClient();
    const snapshots: SimCompetitorSnapshot[] = [];

    try {
        // Check intel/snapshots
        const snap = await firestore
            .collection(`tenants/${tenantId}/intel/snapshots`)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        snap.forEach(doc => {
            const data = doc.data();
            if (!competitorIds || competitorIds.includes(data.competitorId)) {
                snapshots.push({
                    competitorId: data.competitorId || doc.id,
                    snapshotDate: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                    categoryMedians: data.categoryMedians || {},
                    activePromos: data.activePromos || [],
                });
            }
        });
    } catch (e) {
        // Competitor data may not exist
    }

    return snapshots;
}

// ==========================================
// Load Historical Stats (for calibration)
// ==========================================

export async function loadHistoricalStats(
    tenantId: string,
    _days: number = 90
): Promise<SimHistoricalStats | undefined> {
    const { firestore } = await createServerClient();

    try {
        // Try to load from pre-computed stats
        const doc = await firestore.doc(`tenants/${tenantId}/analytics/summary`).get();

        if (doc.exists) {
            const data = doc.data()!;
            return {
                avgOrdersPerDay: data.avgOrdersPerDay || 50,
                avgAov: data.avgAov || 55,
                segmentMix: data.segmentMix || {
                    new: 0.25,
                    returning: 0.35,
                    vip: 0.10,
                    deal_seeker: 0.20,
                    connoisseur: 0.10,
                },
                categoryMix: data.categoryMix || {},
            };
        }
    } catch (e) {
        // No historical data
    }

    return undefined;
}

// ==========================================
// Load Scenario
// ==========================================

export async function loadScenario(tenantId: string, scenarioId: string): Promise<SimScenario | null> {
    const { firestore } = await createServerClient();

    const doc = await firestore.doc(`tenants/${tenantId}/sim/scenarios/${scenarioId}`).get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;
    return {
        id: doc.id,
        tenantId,
        profile: data.profile,
        name: data.name,
        description: data.description,
        horizonDays: data.horizonDays,
        interventions: data.interventions || [],
        assumptions: data.assumptions,
        competitorSetIds: data.competitorSetIds,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        createdBy: data.createdBy,
    };
}

// ==========================================
// Build Complete Inputs
// ==========================================

export interface LoadInputsResult {
    inputs: SimInputs;
    warnings: string[];
}

export async function loadSimInputs(
    tenantId: string,
    scenario: SimScenario
): Promise<LoadInputsResult> {
    const warnings: string[] = [];
    const profileConfig = getProfileConfig(scenario.profile);

    // Load catalog (required)
    const products = await loadCatalog(tenantId);
    if (products.length === 0) {
        throw new Error('No products found in catalog. Cannot run simulation.');
    }

    // Check for costs
    const hasCosts = products.some(p => p.cogs !== undefined);
    if (!hasCosts) {
        warnings.push(SIM_WARNINGS.NO_COSTS);
    }

    // Load inventory (soft requirement for Dispensary)
    let inventory: Record<string, number> | undefined;
    if (scenario.profile === 'DISPENSARY') {
        inventory = await loadInventory(tenantId);
        if (Object.keys(inventory).length === 0) {
            warnings.push(SIM_WARNINGS.NO_INVENTORY);
            inventory = undefined;
        }
    }

    // Load competitor snapshots
    const competitorSnapshots = await loadCompetitorSnapshots(tenantId, scenario.competitorSetIds);
    if (competitorSnapshots.length === 0) {
        warnings.push(SIM_WARNINGS.NO_COMPETITORS);
    }

    // Load historical stats
    const historicalStats = await loadHistoricalStats(tenantId);
    if (!historicalStats) {
        warnings.push(SIM_WARNINGS.THIN_HISTORY);
    }

    // Brand-specific check
    if (scenario.profile === 'BRAND' && !scenario.competitorSetIds?.length) {
        warnings.push(SIM_WARNINGS.BRAND_NEEDS_PARTNERS);
    }

    const inputs: SimInputs = {
        tenantId,
        profile: scenario.profile,
        scenario,
        products,
        inventory,
        competitorSnapshots,
        historicalStats,
    };

    return { inputs, warnings };
}

// ==========================================
// Snapshot Inputs to GCS (for reproducibility)
// ==========================================

export interface SnapshotRefs {
    catalogSnapshotRef: string;
    inventorySnapshotRef?: string;
    competitorSnapshotRefs: string[];
}

export async function createInputsSnapshot(
    tenantId: string,
    runId: string,
    inputs: SimInputs
): Promise<SnapshotRefs> {
    // In production, this would write to GCS
    // For MVP, we store refs as path strings

    const refs: SnapshotRefs = {
        catalogSnapshotRef: `tenants/${tenantId}/sim/runs/${runId}/inputs/catalog.json`,
        competitorSnapshotRefs: inputs.competitorSnapshots?.map((_, i) =>
            `tenants/${tenantId}/sim/runs/${runId}/inputs/competitor_${i}.json`
        ) || [],
    };

    if (inputs.inventory) {
        refs.inventorySnapshotRef = `tenants/${tenantId}/sim/runs/${runId}/inputs/inventory.json`;
    }

    return refs;
}
