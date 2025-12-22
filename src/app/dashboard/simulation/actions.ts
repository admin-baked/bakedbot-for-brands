'use server';

/**
 * Simulation Server Actions
 * 
 * CRUD for scenarios + async run triggers via Pub/Sub.
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';
import {
    SimScenario,
    SimRun,
    SimProfile,
    SimIntervention,
    SimAssumptions,
    SimDaySummary,
    SimRunStatus,
} from '@/types/simulation';
import { getProfileConfig } from '@/types/simulation-profiles';
import { loadScenario, loadSimInputs, createInputsSnapshot } from '@/server/services/simulation/inputs';
import { generatePopulation } from '@/server/services/simulation/population';
import { simulateDay } from '@/server/services/simulation/simulate-day';

// ==========================================
// Scenario CRUD
// ==========================================

export interface CreateScenarioInput {
    profile: SimProfile;
    name: string;
    description?: string;
    horizonDays: number;
    interventions: SimIntervention[];
    assumptions?: Partial<SimAssumptions>;
    competitorSetIds?: string[];
}

export async function createScenario(input: CreateScenarioInput): Promise<SimScenario> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const tenantId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    // Get default assumptions and merge with provided
    const profileConfig = getProfileConfig(input.profile);
    const assumptions: SimAssumptions = {
        ...profileConfig.defaultAssumptions,
        ...input.assumptions,
    };

    const scenarioData = {
        tenantId,
        profile: input.profile,
        name: input.name,
        description: input.description || null,
        horizonDays: input.horizonDays,
        interventions: input.interventions,
        assumptions,
        competitorSetIds: input.competitorSetIds || [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: user.uid,
    };

    const docRef = await firestore.collection(`tenants/${tenantId}/sim/scenarios`).add(scenarioData);

    return {
        id: docRef.id,
        ...input,
        tenantId,
        assumptions,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

export async function updateScenario(
    scenarioId: string,
    patch: Partial<Pick<SimScenario, 'name' | 'description' | 'interventions' | 'assumptions' | 'horizonDays'>>
): Promise<void> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const tenantId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    await firestore.doc(`tenants/${tenantId}/sim/scenarios/${scenarioId}`).update({
        ...patch,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function deleteScenario(scenarioId: string): Promise<void> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const tenantId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    await firestore.doc(`tenants/${tenantId}/sim/scenarios/${scenarioId}`).delete();
}

export async function getScenarios(): Promise<SimScenario[]> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const tenantId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    const snap = await firestore
        .collection(`tenants/${tenantId}/sim/scenarios`)
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .get();

    return snap.docs.map(doc => {
        const data = doc.data();
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
    });
}

export async function getScenario(scenarioId: string): Promise<SimScenario | null> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const tenantId = user.brandId || user.uid;

    return loadScenario(tenantId, scenarioId);
}

// ==========================================
// Run Management
// ==========================================

export interface RunSimulationInput {
    scenarioId: string;
    startDate?: string;
    horizonDays?: number;
    seed?: number;
}

export interface RunSimulationResult {
    runId: string;
    status: SimRunStatus;
    warnings: string[];
}

/**
 * Trigger a simulation run.
 * 
 * MVP: Runs synchronously (should move to Cloud Run worker in production).
 */
export async function runSimulation(input: RunSimulationInput): Promise<RunSimulationResult> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const tenantId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    // Load scenario
    const scenario = await loadScenario(tenantId, input.scenarioId);
    if (!scenario) {
        throw new Error('Scenario not found');
    }

    // Generate deterministic seed
    const seed = input.seed || Math.floor(Math.random() * 2147483647);
    const horizonDays = input.horizonDays || scenario.horizonDays;
    const startDate = input.startDate || new Date().toISOString().split('T')[0];

    // Calculate end date
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + horizonDays);

    // Create run document
    const runData = {
        tenantId,
        scenarioId: input.scenarioId,
        profile: scenario.profile,
        status: 'queued' as SimRunStatus,
        startDate,
        endDate: end.toISOString().split('T')[0],
        horizonDays,
        seed,
        dataRefs: { catalogSnapshotRef: '' },
        assumptions: scenario.assumptions,
        warnings: [],
        createdAt: FieldValue.serverTimestamp(),
        createdBy: user.uid,
    };

    const runRef = await firestore.collection(`tenants/${tenantId}/sim/runs`).add(runData);
    const runId = runRef.id;

    // Load inputs
    const { inputs, warnings } = await loadSimInputs(tenantId, scenario);

    // Update with warnings
    await runRef.update({ warnings, status: 'running' });

    // Create inputs snapshot
    const dataRefs = await createInputsSnapshot(tenantId, runId, inputs);
    await runRef.update({ dataRefs });

    // Generate population
    const populationSize = scenario.assumptions.customerPopulationSize || 500;
    const customers = generatePopulation(inputs, seed, { size: populationSize });

    // Simulate each day
    const summaryMetrics = {
        netRevenue: { total: 0, values: [] as number[] },
        orders: { total: 0, values: [] as number[] },
        discountTotal: { total: 0, values: [] as number[] },
    };

    for (let day = 0; day < horizonDays; day++) {
        const date = new Date(start);
        date.setDate(date.getDate() + day);

        const result = simulateDay(inputs, customers, seed, {
            date,
            runId,
            dayIndex: day,
        });

        // Store day summary in Firestore
        const dateStr = date.toISOString().split('T')[0];
        const daySummary: SimDaySummary = {
            ...result.summary,
            ledgerRef: {
                bucket: 'bakedbot-sim',
                path: `tenants/${tenantId}/sim/runs/${runId}/ledgers/${dateStr}.jsonl.gz`,
                contentType: 'application/gzip',
            },
        };

        await firestore.doc(`tenants/${tenantId}/sim/runs/${runId}/days/${dateStr}`).set(daySummary);

        // Accumulate for summary
        summaryMetrics.netRevenue.values.push(result.summary.netRevenue);
        summaryMetrics.orders.values.push(result.summary.orders);
        summaryMetrics.discountTotal.values.push(result.summary.discountTotal);
    }

    // Calculate p10/p50/p90 summary
    const calculatePercentile = (arr: number[], p: number) => {
        const sorted = [...arr].sort((a, b) => a - b);
        const idx = Math.floor(sorted.length * p);
        return sorted[idx] || 0;
    };

    const finalSummary = {
        netRevenue: {
            p10: calculatePercentile(summaryMetrics.netRevenue.values, 0.1),
            p50: calculatePercentile(summaryMetrics.netRevenue.values, 0.5),
            p90: calculatePercentile(summaryMetrics.netRevenue.values, 0.9),
        },
        orders: {
            p10: calculatePercentile(summaryMetrics.orders.values, 0.1),
            p50: calculatePercentile(summaryMetrics.orders.values, 0.5),
            p90: calculatePercentile(summaryMetrics.orders.values, 0.9),
        },
        discountTotal: {
            p10: calculatePercentile(summaryMetrics.discountTotal.values, 0.1),
            p50: calculatePercentile(summaryMetrics.discountTotal.values, 0.5),
            p90: calculatePercentile(summaryMetrics.discountTotal.values, 0.9),
        },
        units: { p10: 0, p50: 0, p90: 0 },
        aov: { p10: 0, p50: 0, p90: 0 },
    };

    // Mark complete
    await runRef.update({
        status: 'completed',
        summaryMetrics: finalSummary,
        completedAt: FieldValue.serverTimestamp(),
    });

    return {
        runId,
        status: 'completed',
        warnings,
    };
}

// ==========================================
// Run Retrieval
// ==========================================

export async function getRuns(): Promise<SimRun[]> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const tenantId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    const snap = await firestore
        .collection(`tenants/${tenantId}/sim/runs`)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

    return snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            tenantId,
            scenarioId: data.scenarioId,
            profile: data.profile,
            status: data.status,
            startDate: data.startDate,
            endDate: data.endDate,
            horizonDays: data.horizonDays,
            seed: data.seed,
            dataRefs: data.dataRefs,
            assumptions: data.assumptions,
            summaryMetrics: data.summaryMetrics,
            warnings: data.warnings || [],
            createdAt: data.createdAt?.toDate?.() || new Date(),
            createdBy: data.createdBy,
            completedAt: data.completedAt?.toDate?.(),
        };
    });
}

export async function getRun(runId: string): Promise<SimRun | null> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const tenantId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    const doc = await firestore.doc(`tenants/${tenantId}/sim/runs/${runId}`).get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;
    return {
        id: doc.id,
        tenantId,
        scenarioId: data.scenarioId,
        profile: data.profile,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
        horizonDays: data.horizonDays,
        seed: data.seed,
        dataRefs: data.dataRefs,
        assumptions: data.assumptions,
        summaryMetrics: data.summaryMetrics,
        warnings: data.warnings || [],
        createdAt: data.createdAt?.toDate?.() || new Date(),
        createdBy: data.createdBy,
        completedAt: data.completedAt?.toDate?.(),
    };
}

export async function getDaySummaries(runId: string): Promise<SimDaySummary[]> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const tenantId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    const snap = await firestore
        .collection(`tenants/${tenantId}/sim/runs/${runId}/days`)
        .orderBy('date', 'asc')
        .get();

    return snap.docs.map(doc => doc.data() as SimDaySummary);
}

export async function getDaySummary(runId: string, date: string): Promise<SimDaySummary | null> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const tenantId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    const doc = await firestore.doc(`tenants/${tenantId}/sim/runs/${runId}/days/${date}`).get();

    if (!doc.exists) {
        return null;
    }

    return doc.data() as SimDaySummary;
}
