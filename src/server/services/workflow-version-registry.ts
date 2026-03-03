/**
 * Workflow Version Registry
 *
 * Extends the existing workflow registry with version tracking.
 * Supports multiple versions per workflow, activation, deprecation,
 * and version comparison/diffing.
 */

import { logger } from '@/lib/logger';
import { registerWorkflow } from './workflow-registry';
import type { WorkflowDefinition } from '@/types/workflow';

// ---------------------------------------------------------------------------
// Version Types
// ---------------------------------------------------------------------------

export type WorkflowVersionStatus = 'draft' | 'active' | 'deprecated';

export interface WorkflowVersion {
    workflowId: string;
    version: number;
    definition: WorkflowDefinition;
    status: WorkflowVersionStatus;
    createdAt: Date;
    activatedAt?: Date;
    deprecatedAt?: Date;
    changeLog?: string;
}

export interface WorkflowVersionFilter {
    workflowId?: string;
    status?: WorkflowVersionStatus;
}

export interface VersionDiff {
    workflowId: string;
    v1: number;
    v2: number;
    stepsAdded: string[];
    stepsRemoved: string[];
    stepsModified: string[];
    triggerChanged: boolean;
    gatesChanged: boolean;
}

// ---------------------------------------------------------------------------
// In-memory store: Map<workflowId, Map<version, WorkflowVersion>>
// ---------------------------------------------------------------------------

const versionStore = new Map<string, Map<number, WorkflowVersion>>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Register a new version of a workflow */
export function registerVersion(version: WorkflowVersion): void {
    let versions = versionStore.get(version.workflowId);
    if (!versions) {
        versions = new Map();
        versionStore.set(version.workflowId, versions);
    }

    if (versions.has(version.version)) {
        logger.info(`[VersionRegistry] Replacing version ${version.version} of ${version.workflowId}`);
    } else {
        logger.info(`[VersionRegistry] Registering version ${version.version} of ${version.workflowId}`);
    }

    versions.set(version.version, version);
}

/** Get a specific version of a workflow */
export function getVersion(workflowId: string, version: number): WorkflowVersion | null {
    return versionStore.get(workflowId)?.get(version) ?? null;
}

/** Get the active version of a workflow */
export function getActiveVersion(workflowId: string): WorkflowVersion | null {
    const versions = versionStore.get(workflowId);
    if (!versions) return null;

    for (const v of versions.values()) {
        if (v.status === 'active') return v;
    }
    return null;
}

/** List all versions of a workflow (sorted by version number descending) */
export function listVersions(workflowId: string): WorkflowVersion[] {
    const versions = versionStore.get(workflowId);
    if (!versions) return [];

    return Array.from(versions.values()).sort((a, b) => b.version - a.version);
}

/**
 * Activate a specific version — deactivates any current active version
 * and syncs to the main workflow registry.
 */
export function activateVersion(workflowId: string, version: number): boolean {
    const versions = versionStore.get(workflowId);
    if (!versions) return false;

    const target = versions.get(version);
    if (!target) return false;

    // Deactivate any currently active version
    for (const v of versions.values()) {
        if (v.status === 'active' && v.version !== version) {
            v.status = 'deprecated';
            v.deprecatedAt = new Date();
        }
    }

    // Activate target
    target.status = 'active';
    target.activatedAt = new Date();

    // Sync to main workflow registry
    registerWorkflow(target.definition);

    logger.info(`[VersionRegistry] Activated version ${version} of ${workflowId}`);
    return true;
}

/** Deprecate a specific version */
export function deprecateVersion(workflowId: string, version: number): boolean {
    const v = versionStore.get(workflowId)?.get(version);
    if (!v) return false;

    v.status = 'deprecated';
    v.deprecatedAt = new Date();

    logger.info(`[VersionRegistry] Deprecated version ${version} of ${workflowId}`);
    return true;
}

/** Compare two versions and return a diff */
export function compareVersions(workflowId: string, v1: number, v2: number): VersionDiff | null {
    const versions = versionStore.get(workflowId);
    if (!versions) return null;

    const ver1 = versions.get(v1);
    const ver2 = versions.get(v2);
    if (!ver1 || !ver2) return null;

    const def1 = ver1.definition;
    const def2 = ver2.definition;

    const steps1 = new Map(def1.steps.map(s => [s.id ?? s.action, s]));
    const steps2 = new Map(def2.steps.map(s => [s.id ?? s.action, s]));

    const stepsAdded: string[] = [];
    const stepsRemoved: string[] = [];
    const stepsModified: string[] = [];

    // Find added and modified steps
    for (const [id, step2] of steps2) {
        const step1 = steps1.get(id);
        if (!step1) {
            stepsAdded.push(id);
        } else if (JSON.stringify(step1) !== JSON.stringify(step2)) {
            stepsModified.push(id);
        }
    }

    // Find removed steps
    for (const id of steps1.keys()) {
        if (!steps2.has(id)) {
            stepsRemoved.push(id);
        }
    }

    return {
        workflowId,
        v1,
        v2,
        stepsAdded,
        stepsRemoved,
        stepsModified,
        triggerChanged: JSON.stringify(def1.trigger) !== JSON.stringify(def2.trigger),
        gatesChanged: JSON.stringify(def1.gates) !== JSON.stringify(def2.gates),
    };
}

/** List all versioned workflows (optionally filtered) */
export function listVersionedWorkflows(filter?: WorkflowVersionFilter): WorkflowVersion[] {
    const results: WorkflowVersion[] = [];

    for (const [workflowId, versions] of versionStore) {
        if (filter?.workflowId && workflowId !== filter.workflowId) continue;

        for (const v of versions.values()) {
            if (filter?.status && v.status !== filter.status) continue;
            results.push(v);
        }
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Get total count of versioned entries */
export function getVersionCount(): number {
    let count = 0;
    for (const versions of versionStore.values()) {
        count += versions.size;
    }
    return count;
}

/** Clear all versions (for testing) */
export function clearVersionStore(): void {
    versionStore.clear();
}
