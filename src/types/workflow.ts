/**
 * Workflow DSL — Declarative Orchestration Layer
 *
 * Extends the existing PlaybookStep/Playbook types with:
 * - Parallel composition (Promise.allSettled semantics)
 * - Typed I/O schemas between steps
 * - Control flow (onSuccess/onFailure/goto)
 * - Compliance gates (Deebo first-class primitive)
 * - forEach batch iteration
 * - Sub-workflow invocation
 * - Timeout management
 *
 * Every existing PlaybookStep is a valid WorkflowStep.
 */

import type { PlaybookStep, PlaybookTrigger, PlaybookCategory } from './playbook';

// ---------------------------------------------------------------------------
// Step I/O Schema
// ---------------------------------------------------------------------------

export interface WorkflowIO {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description?: string;
    required?: boolean;
    default?: unknown;
}

// ---------------------------------------------------------------------------
// Compliance Gate (cannabis domain first-class primitive)
// ---------------------------------------------------------------------------

export interface ComplianceGate {
    agent: 'deebo';
    rulePack?: string;              // e.g. 'ny-retail', 'ca-retail'
    onFail: 'abort' | 'flag_and_continue';
}

// ---------------------------------------------------------------------------
// forEach Batch Processing
// ---------------------------------------------------------------------------

export interface ForEachConfig {
    source: string;                 // variable path to iterate over
    as: string;                     // variable name for current item
    batchSize?: number;             // items per batch (default: 10)
    concurrency?: 'parallel' | 'sequential'; // default: 'sequential'
}

// ---------------------------------------------------------------------------
// WorkflowStep — extends PlaybookStep with orchestration primitives
// ---------------------------------------------------------------------------

export interface WorkflowStep extends PlaybookStep {
    // Typed I/O schemas
    inputs?: Record<string, WorkflowIO>;
    outputs?: Record<string, WorkflowIO>;

    // Control flow
    onSuccess?: string;             // step ID to jump to (default: next step)
    onFailure?: string;             // step ID to jump to, or 'abort' | 'continue'

    // Parallel composition — run N steps concurrently
    parallel?: WorkflowStep[];

    // Sub-workflow invocation
    workflow?: string;              // ID of another workflow to invoke

    // Timeout (per-step)
    timeoutMs?: number;             // default: 60_000 (1 min)

    // Compliance gate
    complianceGate?: ComplianceGate;

    // Batch iteration
    forEach?: ForEachConfig;
}

// ---------------------------------------------------------------------------
// Workflow Trigger — extends PlaybookTrigger with additional types
// ---------------------------------------------------------------------------

export type WorkflowTriggerType = 'cron' | 'event' | 'manual' | 'webhook';

export type WorkflowTrigger =
    | { type: 'cron'; schedule: string; timezone?: string }
    | { type: 'event'; eventName: string }
    | { type: 'manual' }
    | { type: 'webhook'; path: string }
    | PlaybookTrigger;

// ---------------------------------------------------------------------------
// Workflow Gate — pre-conditions checked before workflow starts
// ---------------------------------------------------------------------------

export interface WorkflowGate {
    name: string;
    check: string;                  // function name or expression
    required: boolean;
    onFail?: 'abort' | 'warn';     // default: 'abort' when required
}

// ---------------------------------------------------------------------------
// WorkflowDefinition — the top-level declarative workflow object
// ---------------------------------------------------------------------------

export interface WorkflowDefinition {
    id: string;
    name: string;
    description: string;
    version: number;

    // Trigger
    trigger: WorkflowTrigger;

    // Pre-conditions
    gates?: WorkflowGate[];

    // Steps
    steps: WorkflowStep[];

    // Workflow-level config
    timeoutMs?: number;             // total workflow timeout (default: 300_000 = 5 min)
    maxRetries?: number;            // workflow-level retry (default: 0)

    // Metadata
    agent?: string;                 // primary agent
    category?: PlaybookCategory;
    tags?: string[];

    // Source format tracking
    source?: 'typescript' | 'yaml';
}

// ---------------------------------------------------------------------------
// Workflow Execution — runtime record persisted to Firestore
// ---------------------------------------------------------------------------

export type WorkflowExecutionStatus =
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'timed_out';

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    workflowName: string;
    status: WorkflowExecutionStatus;
    startedAt: Date;
    completedAt?: Date;
    durationMs?: number;

    // Accumulated variable context
    context: Record<string, unknown>;

    // Per-step results
    stepResults: WorkflowStepResult[];

    // Error info (for failed/timed_out)
    error?: string;

    // Provenance
    triggeredBy: string;            // 'cron' | 'manual' | userId
    orgId?: string;
    proactiveTaskId?: string;

    // Retry tracking
    retryCount?: number;

    // Agentic Workflows Doctrine extensions
    autonomyLevel?: 1 | 2 | 3 | 4;
    confidence?: number;
    artifacts?: string[];           // artifact IDs produced by this execution
    policyBundleId?: string;
}

// ---------------------------------------------------------------------------
// WorkflowStepResult — per-step execution record
// ---------------------------------------------------------------------------

export type WorkflowStepStatus =
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'skipped'
    | 'timed_out';

export interface WorkflowStepResult {
    stepId: string;
    action: string;
    agent?: string;
    label?: string;
    status: WorkflowStepStatus;
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;

    // Step output (merged into workflow context)
    output?: unknown;

    // Error info
    error?: string;

    // Validation (self-validating agent pattern)
    validation?: {
        valid: boolean;
        score: number;
        issues: string[];
        remediation?: string;
    };

    // Retry tracking
    retryCount?: number;

    // Parallel sub-step results (when step.parallel is set)
    parallelResults?: WorkflowStepResult[];

    // Compliance gate result
    complianceResult?: {
        passed: boolean;
        violations?: string[];
        rulePack?: string;
    };

    // forEach iteration summary
    forEachSummary?: {
        totalItems: number;
        processedItems: number;
        failedItems: number;
        batchCount: number;
    };

    // Stage-level telemetry (Agentic Workflows Doctrine)
    stageTelemetry?: {
        modelUsed?: string;
        tokensIn?: number;
        tokensOut?: number;
        toolCalls?: number;
        connectorCalls?: number;
        warnings?: string[];
        confidence?: number;
    };
}

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

/** Filter options for listing workflows */
export interface WorkflowFilter {
    category?: PlaybookCategory;
    tag?: string;
    agent?: string;
}

/** Options for executing a workflow */
export interface ExecuteWorkflowOptions {
    orgId?: string;
    userId?: string;
    triggeredBy: string;
    variables?: Record<string, unknown>;
    dryRun?: boolean;
    proactiveTaskId?: string;
    /** Execute a specific version from the version registry */
    version?: number;
}

/** Result of workflow validation */
export interface WorkflowValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

// ---------------------------------------------------------------------------
// Workflow Versioning
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const WORKFLOW_DEFAULTS = {
    stepTimeoutMs: 60_000,          // 1 minute per step
    workflowTimeoutMs: 300_000,     // 5 minutes total
    forEachBatchSize: 10,
    maxRetries: 0,
    maxStepRetries: 3,
} as const;
