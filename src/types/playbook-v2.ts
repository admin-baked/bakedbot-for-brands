/**
 * Playbook V2 — Compiled Specs, Artifacts, Validation, Policy Bundles
 *
 * New domain types for the Agentic Workflows Doctrine.
 * These types are referenced by the extended Playbook/PlaybookRun in playbook.ts
 * and implement the Build Package §3-§5 and §10.
 *
 * Zod schemas are colocated with interfaces (established BakedBot pattern).
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Trigger Specs (discriminated union)
// ---------------------------------------------------------------------------

export const scheduleTriggerSchema = z.object({
    type: z.literal('schedule'),
    schedule: z.object({
        frequency: z.enum(['daily', 'weekday', 'weekly', 'monthly']),
        dayOfWeek: z.string().optional(),
        timeLocal: z.string(),
        timezone: z.string(),
        skipHolidays: z.boolean().optional(),
    }),
});

export const eventTriggerSchema = z.object({
    type: z.literal('event'),
    eventName: z.string(),
    filters: z.record(z.unknown()).optional(),
    debounceWindowMinutes: z.number().int().nonnegative().optional(),
});

export const manualTriggerSchema = z.object({
    type: z.literal('manual'),
});

export const webhookTriggerSchema = z.object({
    type: z.literal('webhook'),
    webhookName: z.string(),
    filters: z.record(z.unknown()).optional(),
});

export const triggerSpecSchema = z.discriminatedUnion('type', [
    scheduleTriggerSchema,
    eventTriggerSchema,
    manualTriggerSchema,
    webhookTriggerSchema,
]);

export type TriggerSpec = z.infer<typeof triggerSpecSchema>;

// ---------------------------------------------------------------------------
// Output Spec
// ---------------------------------------------------------------------------

export const outputSpecSchema = z.object({
    deliverables: z.array(z.string()).min(1),
    destinations: z.array(z.string()).min(1),
});

export type OutputSpec = z.infer<typeof outputSpecSchema>;

// ---------------------------------------------------------------------------
// Approval Policy (Zod twin of the interface in playbook.ts)
// ---------------------------------------------------------------------------

export const approvalPolicySchema = z.object({
    mode: z.enum([
        'never',
        'always',
        'escalate_on_low_confidence',
        'required_for_first_run_and_policy_warnings',
    ]),
    requiredFor: z.array(z.string()).optional(),
    confidenceThreshold: z.number().min(0).max(1).optional(),
});

// ---------------------------------------------------------------------------
// Compiled Playbook Spec
// ---------------------------------------------------------------------------

export const compiledPlaybookSpecSchema = z.object({
    playbookId: z.string(),
    version: z.number().int().positive(),
    playbookType: z.string(),
    trigger: triggerSpecSchema,
    scope: z.record(z.unknown()),
    objectives: z.array(z.string()),
    inputs: z.record(z.unknown()),
    outputs: outputSpecSchema,
    approvalPolicy: approvalPolicySchema,
    policyBundleId: z.string().optional(),
    telemetryProfile: z.string(),
});

export type CompiledPlaybookSpec = z.infer<typeof compiledPlaybookSpecSchema>;

// ---------------------------------------------------------------------------
// Playbook Status & Autonomy (Zod twins)
// ---------------------------------------------------------------------------

export const playbookStatusSchema = z.enum([
    'draft',
    'needs_clarification',
    'compiled',
    'active',
    'paused',
    'archived',
    'error',
]);

export const autonomyLevelSchema = z.enum([
    'assist',
    'guided',
    'managed_autopilot',
    'full_auto',
]);

// ---------------------------------------------------------------------------
// Artifact
// ---------------------------------------------------------------------------

export interface PlaybookArtifact {
    id: string;
    runId: string;
    stageName: string;
    artifactType: string;
    storagePath: string;
    mimeType?: string;
    checksum?: string;
    metadata?: Record<string, unknown>;
    sourceRefs?: string[];
    createdAt: string;
}

export const playbookArtifactSchema = z.object({
    id: z.string(),
    runId: z.string(),
    stageName: z.string(),
    artifactType: z.string(),
    storagePath: z.string(),
    mimeType: z.string().optional(),
    checksum: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    sourceRefs: z.array(z.string()).optional(),
    createdAt: z.string(),
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationOverallStatus = 'pass' | 'pass_with_warnings' | 'fail';

export interface ValidationIssue {
    code: string;
    message: string;
    severity?: 'info' | 'warning' | 'error';
    artifactId?: string;
    fieldPath?: string;
}

export interface ValidatorResult {
    name: string;
    status: 'pass' | 'warning' | 'fail';
    issues?: ValidationIssue[];
}

export interface ValidationReport {
    runId: string;
    overallStatus: ValidationOverallStatus;
    requiresApproval: boolean;
    confidence?: number;
    validators: ValidatorResult[];
}

// ---------------------------------------------------------------------------
// Policy Bundle
// ---------------------------------------------------------------------------

export interface PolicyBundle {
    id: string;
    workspaceId: string;
    name: string;
    jurisdiction?: string;
    channelRules: Record<string, Record<string, unknown>>;
    contentRules: {
        blockedClaims: string[];
        requiredDisclaimers: string[];
    };
    brandRules?: {
        tone: string[];
        avoid: string[];
    };
    alertThresholds?: Record<string, number>;
    currentVersion: number;
    createdAt: string;
    updatedAt: string;
}

export const policyBundleSchema = z.object({
    id: z.string(),
    workspaceId: z.string(),
    name: z.string(),
    jurisdiction: z.string().optional(),
    channelRules: z.record(z.record(z.unknown())),
    contentRules: z.object({
        blockedClaims: z.array(z.string()),
        requiredDisclaimers: z.array(z.string()),
    }),
    brandRules: z.object({
        tone: z.array(z.string()),
        avoid: z.array(z.string()),
    }).optional(),
    alertThresholds: z.record(z.number()).optional(),
    currentVersion: z.number().int().positive(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

// ---------------------------------------------------------------------------
// Run Stage (per-stage execution record)
// ---------------------------------------------------------------------------

export interface RunStage {
    runId: string;
    stageName: string;
    attempt: number;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped';
    stateIn?: Record<string, unknown>;
    stateOut?: Record<string, unknown>;
    confidence?: number;
    errorCode?: string;
    errorMessage?: string;
    durationMs?: number;
    startedAt?: string;
    completedAt?: string;
}

// ---------------------------------------------------------------------------
// State Machine
// ---------------------------------------------------------------------------

import type { RunStatus } from './playbook';

export const RUN_STAGE_ORDER = [
    'resolving_scope',
    'extracting_questions',
    'assembling_context',
    'generating_output',
    'validating',
    'awaiting_approval',
    'delivering',
] as const;

export type OrderedRunStage = (typeof RUN_STAGE_ORDER)[number];

/**
 * Deterministic state transition function.
 * Given current status + context flags, returns the next status.
 * No AI involved — pure logic.
 */
export function getNextRunStatus(input: {
    currentStatus: RunStatus;
    validation?: ValidationReport;
    approvalResolved?: boolean;
    deliverySucceeded?: boolean;
    failed?: boolean;
}): RunStatus {
    if (input.failed) return 'failed';

    switch (input.currentStatus) {
        case 'queued':
            return 'resolving_scope';
        case 'resolving_scope':
            return 'extracting_questions';
        case 'extracting_questions':
            return 'assembling_context';
        case 'assembling_context':
            return 'generating_output';
        case 'generating_output':
            return 'validating';
        case 'validating':
            if (!input.validation) throw new Error('Validation result required to transition from validating');
            return input.validation.requiresApproval ? 'awaiting_approval' : 'delivering';
        case 'awaiting_approval':
            return input.approvalResolved ? 'delivering' : 'awaiting_approval';
        case 'delivering':
            return input.deliverySucceeded ? 'completed' : 'failed';
        default:
            return input.currentStatus;
    }
}

// ---------------------------------------------------------------------------
// Stage Executor Contract (Build Package §5.3)
// ---------------------------------------------------------------------------

export interface StageExecutionInput<TIn = unknown> {
    run: {
        id: string;
        playbookId: string;
        playbookVersion: number;
        orgId?: string;
        startedAt?: string;
    };
    spec: CompiledPlaybookSpec;
    stageInput: TIn;
    priorArtifacts: PlaybookArtifact[];
    policyBundle?: PolicyBundle;
    attempt: number;
}

export interface StageExecutionResult<TOut = unknown> {
    status: 'completed' | 'failed' | 'skipped';
    stageOutput?: TOut;
    artifactsCreated?: PlaybookArtifact[];
    confidence?: number;
    alerts?: Array<{ code: string; message: string }>;
    error?: {
        code: string;
        message: string;
        retryable: boolean;
    };
    metrics?: {
        durationMs: number;
        tokenInput?: number;
        tokenOutput?: number;
        toolCalls?: number;
    };
}

export interface StageExecutor<TIn = unknown, TOut = unknown> {
    stageName: OrderedRunStage;
    run(input: StageExecutionInput<TIn>): Promise<StageExecutionResult<TOut>>;
}

// ---------------------------------------------------------------------------
// Validator Contract (Build Package §10)
// ---------------------------------------------------------------------------

export interface ValidationContext {
    run: { id: string; playbookId: string };
    spec: CompiledPlaybookSpec;
    artifacts: PlaybookArtifact[];
    policyBundle?: PolicyBundle;
    artifactBodies?: Record<string, string>;
}

export interface Validator {
    name: string;
    validate(input: ValidationContext): Promise<ValidatorResult>;
}

// ---------------------------------------------------------------------------
// Cloud Tasks Job Payload (BakedBot-specific, replaces build package queues)
// ---------------------------------------------------------------------------

export interface PlaybookJobPayload {
    runId: string;
    playbookId: string;
    stageName: OrderedRunStage;
    attempt: number;
    triggerEvent: Record<string, unknown>;
}
