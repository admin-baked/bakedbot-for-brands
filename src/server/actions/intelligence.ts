/**
 * MERIDIAN Intelligence Server Actions
 *
 * Server actions for MERIDIAN-enhanced features:
 * - LiveHud cognitive state management
 * - Memory gardening and health
 * - Completeness metrics
 * - Cursed input incidents
 *
 * Inspired by: https://github.com/mattvideoproductions/MERIDIAN_Brain
 */

'use server';

import { requireUser } from '@/server/auth/auth';
import { cognitiveStateManager } from '@/server/services/letta/cognitive-state-manager';
import { memoryGardeningService } from '@/server/services/letta/memory-gardening';
import { completenessDoctrineService } from '@/server/services/letta/completeness-doctrine';
import {
    AgentCognitiveState,
    AgentPersonalityMode,
    AgentBehaviorSliders,
    SLIDER_PRESETS,
} from '@/types/agent-cognitive-state';
import {
    MemoryHealthMetrics,
    MemoryGardeningReport,
    MemoryConflict,
} from '@/server/services/letta/memory-types';
import { getAdminFirestore } from '@/firebase/admin';

const getFirestore = getAdminFirestore;

// =============================================================================
// COGNITIVE STATE ACTIONS (LiveHud Dashboard)
// =============================================================================

/**
 * Get cognitive state for an agent
 */
export async function getAgentCognitiveState(
    agentId: string
): Promise<AgentCognitiveState | null> {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const orgId = user.orgId || user.brandId || user.uid;

    return cognitiveStateManager.getState(agentId, orgId);
}

/**
 * Get all agent cognitive states for tenant (CEO Dashboard)
 */
export async function getAllAgentCognitiveStates(): Promise<AgentCognitiveState[]> {
    const user = await requireUser(['super_user']);
    const orgId = user.orgId || user.brandId || user.uid;

    return cognitiveStateManager.getAllAgentStates(orgId);
}

/**
 * Update personality mode for an agent
 */
export async function setAgentPersonalityMode(
    agentId: string,
    mode: AgentPersonalityMode
): Promise<AgentCognitiveState> {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const orgId = user.orgId || user.brandId || user.uid;

    return cognitiveStateManager.setPersonalityMode(agentId, orgId, mode);
}

/**
 * Update behavior sliders for an agent
 */
export async function updateAgentSliders(
    agentId: string,
    sliders: Partial<AgentBehaviorSliders>
): Promise<AgentCognitiveState> {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const orgId = user.orgId || user.brandId || user.uid;

    return cognitiveStateManager.updateSliders(agentId, orgId, sliders);
}

/**
 * Apply a slider preset
 */
export async function applySliderPreset(
    agentId: string,
    presetName: keyof typeof SLIDER_PRESETS
): Promise<AgentCognitiveState> {
    const user = await requireUser(['super_user', 'brand', 'dispensary']);
    const orgId = user.orgId || user.brandId || user.uid;

    return cognitiveStateManager.applyPreset(agentId, orgId, presetName);
}

/**
 * Get available slider presets
 */
export async function getSliderPresets(): Promise<typeof SLIDER_PRESETS> {
    await requireUser(['super_user', 'brand', 'dispensary']);
    return SLIDER_PRESETS;
}

// =============================================================================
// MEMORY HEALTH ACTIONS (Memory Dashboard)
// =============================================================================

/**
 * Get memory health metrics for an agent
 */
export async function getMemoryHealthMetrics(agentId: string): Promise<MemoryHealthMetrics> {
    const user = await requireUser(['super_user']);
    const orgId = user.orgId || user.brandId || user.uid;

    return memoryGardeningService.getHealthMetrics(agentId, orgId);
}

/**
 * Run memory gardening for an agent
 */
export async function runMemoryGardening(agentId: string): Promise<MemoryGardeningReport> {
    const user = await requireUser(['super_user']);
    const orgId = user.orgId || user.brandId || user.uid;

    return memoryGardeningService.gardenAgentMemory(agentId, orgId);
}

/**
 * Get recent memory gardening reports
 */
export async function getMemoryGardeningReports(
    limit: number = 10
): Promise<MemoryGardeningReport[]> {
    const user = await requireUser(['super_user']);
    const orgId = user.orgId || user.brandId || user.uid;

    const db = getFirestore();
    const snapshot = await db
        .collection('memory_gardening_reports')
        .where('tenantId', '==', orgId)
        .orderBy('startedAt', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
            ...data,
            startedAt: new Date(data.startedAt),
            completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
            conflictReports: data.conflictReports.map((c: Record<string, string>) => ({
                ...c,
                detectedAt: new Date(c.detectedAt),
                resolvedAt: c.resolvedAt ? new Date(c.resolvedAt) : undefined,
            })),
        } as MemoryGardeningReport;
    });
}

/**
 * Get unresolved memory conflicts
 */
export async function getUnresolvedConflicts(): Promise<MemoryConflict[]> {
    const user = await requireUser(['super_user']);
    const orgId = user.orgId || user.brandId || user.uid;

    const db = getFirestore();
    const snapshot = await db
        .collection('memory_conflicts')
        .where('tenantId', '==', orgId)
        .where('resolution', '==', 'unresolved')
        .orderBy('detectedAt', 'desc')
        .get();

    return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
            ...data,
            detectedAt: new Date(data.detectedAt),
            resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
        } as MemoryConflict;
    });
}

/**
 * Resolve a memory conflict manually
 */
export async function resolveMemoryConflict(
    conflictId: string,
    resolution: MemoryConflict['resolution']
): Promise<void> {
    const user = await requireUser(['super_user']);

    const db = getFirestore();
    await db
        .collection('memory_conflicts')
        .doc(conflictId)
        .update({
            resolution,
            resolvedAt: new Date().toISOString(),
            resolvedBy: user.uid,
        });
}

// =============================================================================
// COMPLETENESS METRICS ACTIONS
// =============================================================================

/**
 * Get completeness metrics for an agent
 */
export async function getCompletenessMetrics(agentId: string, days: number = 7) {
    const user = await requireUser(['super_user']);
    const orgId = user.orgId || user.brandId || user.uid;

    return completenessDoctrineService.getCompletenessMetrics(orgId, agentId, days);
}

/**
 * Get all completeness logs (for debugging)
 */
export async function getCompletenessLogs(limit: number = 50) {
    const user = await requireUser(['super_user']);
    const orgId = user.orgId || user.brandId || user.uid;

    const db = getFirestore();
    const snapshot = await db
        .collection('completeness_logs')
        .where('tenantId', '==', orgId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
    }));
}

// =============================================================================
// CURSED INPUT INCIDENTS
// =============================================================================

/**
 * Get recent cursed input incidents
 */
export async function getCursedInputIncidents(limit: number = 50) {
    const user = await requireUser(['super_user']);
    const orgId = user.orgId || user.brandId || user.uid;

    const db = getFirestore();
    const snapshot = await db
        .collection('cursed_input_incidents')
        .where('tenantId', '==', orgId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
    }));
}

/**
 * Get cursed input stats (for security dashboard)
 */
export async function getCursedInputStats(days: number = 30) {
    const user = await requireUser(['super_user']);
    const orgId = user.orgId || user.brandId || user.uid;

    const db = getFirestore();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const snapshot = await db
        .collection('cursed_input_incidents')
        .where('tenantId', '==', orgId)
        .where('timestamp', '>=', cutoff.toISOString())
        .get();

    const incidents = snapshot.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data());

    const stats = {
        total: incidents.length,
        byReason: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        blocked: incidents.filter((i: any) => i.blocked).length,
        recentIncidents: incidents.slice(0, 10),
    };

    for (const incident of incidents) {
        const reason = (incident as any).reason || 'unknown';
        const severity = (incident as any).severity || 'unknown';

        stats.byReason[reason] = (stats.byReason[reason] || 0) + 1;
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
    }

    return stats;
}

// =============================================================================
// SYSTEM-WIDE INTELLIGENCE METRICS
// =============================================================================

/**
 * Get overall BakedBot Intelligence metrics (for CEO Dashboard)
 */
export async function getIntelligenceSystemMetrics() {
    const user = await requireUser(['super_user']);
    const orgId = user.orgId || user.brandId || user.uid;

    const db = getFirestore();

    // Get all agent states
    const agentStates = await cognitiveStateManager.getAllAgentStates(orgId);

    // Get recent gardening reports
    const gardeningSnapshot = await db
        .collection('memory_gardening_reports')
        .where('tenantId', '==', orgId)
        .where('status', '==', 'completed')
        .orderBy('startedAt', 'desc')
        .limit(10)
        .get();

    const gardeningReports = gardeningSnapshot.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data());

    // Calculate averages
    const avgConfidence =
        agentStates.reduce((sum, s) => sum + s.averageConfidence, 0) / agentStates.length || 0;

    const avgCompleteness =
        agentStates.reduce((sum, s) => sum + s.completenessScore, 0) / agentStates.length || 0;

    const avgMemoryHealth =
        agentStates.reduce((sum, s) => sum + s.memoryHealth.healthScore, 0) / agentStates.length ||
        0;

    const totalConflicts = agentStates.reduce(
        (sum, s) => sum + s.memoryHealth.conflictsDetected,
        0
    );

    const totalMemories = agentStates.reduce(
        (sum, s) => sum + s.memoryHealth.totalMemories,
        0
    );

    const totalStaleMemories = agentStates.reduce(
        (sum, s) => sum + s.memoryHealth.staleMemories,
        0
    );

    const totalMemoriesRemoved = gardeningReports.reduce(
        (sum: number, r: any) => sum + (r.memoriesRemoved || 0),
        0
    );

    return {
        activeAgents: agentStates.filter((s) => s.status === 'active').length,
        totalAgents: agentStates.length,
        averageConfidence: avgConfidence,
        averageCompleteness: avgCompleteness,
        averageMemoryHealth: avgMemoryHealth,
        memoryStats: {
            total: totalMemories,
            stale: totalStaleMemories,
            conflicts: totalConflicts,
            removedLast10Runs: totalMemoriesRemoved,
        },
        gardeningRuns: gardeningReports.length,
        lastGardeningRun: gardeningReports[0]?.startedAt || null,
    };
}
