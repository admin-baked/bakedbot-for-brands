/**
 * Workflow Registry
 *
 * In-memory registry for workflow definitions. Provides:
 * - Registration (add/replace by ID)
 * - Lookup by ID
 * - Filtered listing (category, tag, agent)
 * - Validation (step references, cycle detection, I/O contracts)
 */

import { logger } from '@/lib/logger';
import type {
    WorkflowDefinition,
    WorkflowFilter,
    WorkflowStep,
    WorkflowValidationResult,
} from '@/types/workflow';

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const registry = new Map<string, WorkflowDefinition>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Register (or replace) a workflow definition by ID */
export function registerWorkflow(definition: WorkflowDefinition): void {
    if (registry.has(definition.id)) {
        logger.info(`[WorkflowRegistry] Replacing workflow: ${definition.id} (v${definition.version})`);
    } else {
        logger.info(`[WorkflowRegistry] Registering workflow: ${definition.id} (v${definition.version})`);
    }
    registry.set(definition.id, definition);
}

/** Look up a workflow by ID */
export function getWorkflow(id: string): WorkflowDefinition | null {
    return registry.get(id) ?? null;
}

/** List all registered workflows, optionally filtered */
export function listWorkflows(filter?: WorkflowFilter): WorkflowDefinition[] {
    let workflows = Array.from(registry.values());

    if (filter?.category) {
        workflows = workflows.filter(w => w.category === filter.category);
    }
    if (filter?.tag) {
        workflows = workflows.filter(w => w.tags?.includes(filter.tag!));
    }
    if (filter?.agent) {
        workflows = workflows.filter(w => w.agent === filter.agent);
    }

    return workflows;
}

/** Remove a workflow from the registry */
export function unregisterWorkflow(id: string): boolean {
    return registry.delete(id);
}

/** Clear all registered workflows (for testing) */
export function clearRegistry(): void {
    registry.clear();
}

/** Get the count of registered workflows */
export function getWorkflowCount(): number {
    return registry.size;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validate a workflow definition for structural correctness */
export function validateWorkflow(definition: WorkflowDefinition): WorkflowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic required fields
    if (!definition.id) errors.push('Workflow ID is required');
    if (!definition.name) errors.push('Workflow name is required');
    if (!definition.steps || definition.steps.length === 0) {
        errors.push('Workflow must have at least one step');
    }
    if (!definition.trigger) errors.push('Workflow must have a trigger');

    // Collect all step IDs
    const stepIds = new Set<string>();
    const duplicateIds = new Set<string>();

    for (const step of definition.steps ?? []) {
        if (step.id) {
            if (stepIds.has(step.id)) {
                duplicateIds.add(step.id);
            }
            stepIds.add(step.id);
        }
    }

    if (duplicateIds.size > 0) {
        errors.push(`Duplicate step IDs: ${Array.from(duplicateIds).join(', ')}`);
    }

    // Validate step references (onSuccess/onFailure targets exist)
    for (const step of definition.steps ?? []) {
        if (step.onSuccess && step.onSuccess !== 'abort' && step.onSuccess !== 'continue') {
            if (!stepIds.has(step.onSuccess)) {
                errors.push(`Step "${step.id ?? step.action}": onSuccess references unknown step "${step.onSuccess}"`);
            }
        }
        if (step.onFailure && step.onFailure !== 'abort' && step.onFailure !== 'continue') {
            if (!stepIds.has(step.onFailure)) {
                errors.push(`Step "${step.id ?? step.action}": onFailure references unknown step "${step.onFailure}"`);
            }
        }

        // Validate forEach config
        if (step.forEach) {
            if (!step.forEach.source) {
                errors.push(`Step "${step.id ?? step.action}": forEach.source is required`);
            }
            if (!step.forEach.as) {
                errors.push(`Step "${step.id ?? step.action}": forEach.as is required`);
            }
        }

        // Validate parallel steps recursively
        if (step.parallel) {
            for (const pStep of step.parallel) {
                if (pStep.parallel) {
                    warnings.push(`Step "${step.id ?? step.action}": nested parallel blocks may cause unexpected concurrency`);
                }
            }
        }

        // Validate sub-workflow reference
        if (step.workflow) {
            const subWorkflow = registry.get(step.workflow);
            if (!subWorkflow) {
                warnings.push(`Step "${step.id ?? step.action}": sub-workflow "${step.workflow}" not found in registry (may be registered later)`);
            }
        }

        // Validate compliance gate
        if (step.complianceGate) {
            if (step.complianceGate.agent !== 'deebo') {
                errors.push(`Step "${step.id ?? step.action}": complianceGate.agent must be "deebo"`);
            }
        }
    }

    // Detect goto cycles
    const cycleErrors = detectGotoCycles(definition.steps ?? []);
    errors.push(...cycleErrors);

    // Validate I/O contracts — outputs from earlier steps satisfy inputs of later steps
    const ioWarnings = validateIOContracts(definition.steps ?? []);
    warnings.push(...ioWarnings);

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Detect cycles in onSuccess/onFailure goto chains */
function detectGotoCycles(steps: WorkflowStep[]): string[] {
    const errors: string[] = [];
    const stepIndexMap = new Map<string, number>();

    for (let i = 0; i < steps.length; i++) {
        if (steps[i].id) {
            stepIndexMap.set(steps[i].id!, i);
        }
    }

    // For each step with a goto, trace the chain and check for cycles
    for (const step of steps) {
        for (const target of [step.onSuccess, step.onFailure]) {
            if (!target || target === 'abort' || target === 'continue') continue;

            const visited = new Set<string>();
            let current: string | undefined = target;

            while (current && current !== 'abort' && current !== 'continue') {
                if (visited.has(current)) {
                    errors.push(`Cycle detected in goto chain: ${Array.from(visited).join(' -> ')} -> ${current}`);
                    break;
                }
                visited.add(current);

                const idx = stepIndexMap.get(current);
                if (idx === undefined) break;

                const nextStep = steps[idx];
                // Follow onSuccess chain (the "happy path" through gotos)
                current = (nextStep.onSuccess ?? undefined) as string | undefined;
            }
        }
    }

    return errors;
}

/** Check that step inputs are satisfied by earlier step outputs */
function validateIOContracts(steps: WorkflowStep[]): string[] {
    const warnings: string[] = [];
    const availableOutputs = new Set<string>();

    for (const step of steps) {
        // Check inputs against available outputs
        if (step.inputs) {
            for (const [key, io] of Object.entries(step.inputs)) {
                if (io.required && !availableOutputs.has(key) && io.default === undefined) {
                    warnings.push(
                        `Step "${step.id ?? step.action}": required input "${key}" not produced by any earlier step`
                    );
                }
            }
        }

        // Register outputs
        if (step.outputs) {
            for (const key of Object.keys(step.outputs)) {
                availableOutputs.add(key);
            }
        }
    }

    return warnings;
}
