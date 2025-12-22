/**
 * Agent Tools - Simulation Domain
 * 
 * Allows agents to create, run, and analyze simulations.
 */

import { z } from 'zod';
import {
    createScenario,
    runSimulation,
    getScenarios,
    getRun,
    getDaySummary,
    getDaySummaries
} from '@/app/dashboard/simulation/actions';
import { SimProfile } from '@/types/simulation';

// ==========================================
// Tools
// ==========================================

export const createSimulationScenario = async (input: {
    name: string;
    profile: SimProfile;
    description?: string;
    horizonDays: number;
    goal?: string;
}) => {
    // Agents would typically infer interventions based on the "goal"
    // For MVP, we create a base scenario and let them guide the user to the builder
    // or we could add simple presets later.

    return await createScenario({
        name: input.name,
        profile: input.profile,
        description: input.description || input.goal,
        horizonDays: input.horizonDays,
        interventions: [], // Agents start with blank slate for now
        assumptions: {},
    });
};

export const runSimulationTool = async (input: {
    scenarioId: string;
    horizonDays?: number;
}) => {
    return await runSimulation({
        scenarioId: input.scenarioId,
        horizonDays: input.horizonDays,
    });
};

export const listSimulationScenarios = async () => {
    const scenarios = await getScenarios();
    return scenarios.map(s => ({
        id: s.id,
        name: s.name,
        profile: s.profile,
        horizonDays: s.horizonDays,
        interventionCount: s.interventions.length,
        updatedAt: s.updatedAt,
    }));
};

export const getSimulationRunResults = async (input: { runId: string }) => {
    const run = await getRun(input.runId);
    if (!run) return null;

    return {
        id: run.id,
        status: run.status,
        profile: run.profile,
        summaryMetrics: run.summaryMetrics,
        warnings: run.warnings,
    };
};

export const analyzeSimulationDay = async (input: { runId: string; date: string }) => {
    const day = await getDaySummary(input.runId, input.date);
    if (!day) return null;

    // Omit heavy ledger ref for agent context
    const { ledgerRef, ...summary } = day;
    return summary;
};
