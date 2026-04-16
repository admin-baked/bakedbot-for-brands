/**
 * YAML Playbook System
 * Persistent automation workflows created by agents
 *
 * Extended for Agentic Workflows Doctrine (2026-03-12):
 * - Deterministic stage-based execution
 * - Autonomy levels (assist → full_auto)
 * - Compiled specs, policy bundles, artifacts
 * - Stage-aware runs with confidence scoring
 */

import { AgentTrigger } from './agent-config';
import type { CompiledPlaybookSpec } from './playbook-v2';
import type { PlaybookReadiness } from '@/config/workflow-runtime';

// ---------------------------------------------------------------------------
// Status & Enums
// ---------------------------------------------------------------------------

/** Original 4 statuses + 3 new for compiled playbook lifecycle */
export type PlaybookStatus =
    | 'draft'
    | 'needs_clarification'
    | 'compiled'
    | 'active'
    | 'paused'
    | 'archived'
    | 'error';

export type PlaybookCategory = 'intel' | 'intelligence' | 'marketing' | 'ops' | 'seo' | 'reporting' | 'compliance' | 'custom' | 'operations' | 'growth' | 'customer_success';
export type TriggerType = 'manual' | 'schedule' | 'event' | 'calendar' | 'webhook';

/** Autonomy levels per the Agentic Workflows Doctrine */
export type AutonomyLevel = 'assist' | 'guided' | 'managed_autopilot' | 'full_auto';

/** Approval routing policy */
export interface ApprovalPolicy {
    mode:
    | 'never'
    | 'always'
    | 'escalate_on_low_confidence'
    | 'required_for_first_run_and_policy_warnings';
    requiredFor?: string[];
    confidenceThreshold?: number;
}

// ---------------------------------------------------------------------------
// Trigger & Step
// ---------------------------------------------------------------------------

export interface PlaybookTrigger {
    type: TriggerType;
    cron?: string;           // For schedule type
    timezone?: string;       // For schedule type
    eventName?: string;      // For event type (e.g., 'lead.created', 'page.claimed')
    // Legacy support fields
    id?: string;
    name?: string;
    config?: Record<string, unknown>;
    enabled?: boolean;
}

export interface PlaybookStep {
    id?: string;             // Unique step ID for ordering (auto-generated if missing)
    action: string;
    params: Record<string, unknown>;
    agent?: string;          // For delegation
    condition?: string;      // Optional if condition
    label?: string;          // Human-readable step name

    // Validation & Retry (Self-Validating Agent Pattern)
    retryOnFailure?: boolean;       // Retry step if validation fails
    maxRetries?: number;            // Max retry attempts (default: 3)
    validationThreshold?: number;   // Override pass threshold (0-100)
}

// ---------------------------------------------------------------------------
// Playbook
// ---------------------------------------------------------------------------

export interface Playbook {
    id: string;
    name: string;
    description: string;
    status: PlaybookStatus;

    // Agent & Category
    agent: string;           // Responsible agent (smokey, craig, pops, etc.)
    category: PlaybookCategory;
    icon?: string;           // Lucide icon name

    // YAML source (optional - for advanced users)
    yaml?: string;

    // Parsed structure
    triggers: PlaybookTrigger[];
    steps: PlaybookStep[];

    // Ownership & Access
    ownerId: string;         // User who owns this playbook
    ownerName?: string;      // Display name for owner
    isCustom: boolean;       // true = user-created, false = system template
    templateId?: string;     // If cloned from a template

    // Approval
    requiresApproval: boolean; // Auto-detected based on customer-facing email steps

    // Execution stats
    lastRunAt?: Date;
    runCount: number;
    successCount: number;
    failureCount: number;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;       // Original creator (may differ from owner)
    orgId: string;

    // Version control
    version: number;

    // Arbitrary metadata for context (brand info, search params, etc.)
    metadata?: Record<string, unknown>;

    // --- Agentic Workflows Doctrine extensions (all optional) ---

    /** Compiled spec from the NLP compiler or template system */
    compiledSpec?: CompiledPlaybookSpec;

    /** Display name for UI (e.g. "Weekday Gummy Competitor Watch") */
    displayName?: string;

    /** Playbook type slug (e.g. 'daily_competitive_intelligence') */
    playbookType?: string;

    /** Autonomy level: how much human involvement is required */
    autonomyLevel?: AutonomyLevel;

    /** Approval routing policy */
    approvalPolicy?: ApprovalPolicy;

    /** Reference to a PolicyBundle document */
    policyBundleId?: string;

    /** Legacy compatibility fields */
    playbookTemplateId?: string;

    // --- Slack Notification Control ---

    /**
     * Execution readiness classification for this playbook.
     * Controls catalog display and gating in the playbook UI.
     * See src/config/workflow-runtime.ts for label definitions.
     *
     * - executable_now:  fires, runs real logic, produces verified output
     * - partial_support: some steps run; others are stubs or unverified end-to-end
     * - template_only:   structure defined; logic is placeholder
     * - experimental:    speculative; may not complete successfully
     * - legacy:          runs on V1 executor; maintained for compatibility only
     */
    executionReadiness?: PlaybookReadiness;

    /**
     * true = pre-installed system playbook owned by BakedBot.
     * Cannot be deleted by dispensary users; can be toggled/configured.
     */
    isSystem?: boolean;

    /**
     * Stable key matching OrgNotificationPreferences.slack.notifications.
     * e.g. 'thrive_daily_briefing' | 'thrive_competitive_intel'
     */
    systemKey?: string;
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

export interface PlaybookVersion {
    playbookId: string;
    version: number;
    yaml: string;
    changedBy: string;
    changedAt: Date;
    changeNote?: string;
    /** Compiled spec snapshot for this version */
    compiledSpec?: CompiledPlaybookSpec;
}

// ---------------------------------------------------------------------------
// Run — Stage-aware execution record
// ---------------------------------------------------------------------------

/** Run-level status for the stage-based state machine */
export type RunStatus =
    | 'queued'
    | 'resolving_scope'
    | 'extracting_questions'
    | 'assembling_context'
    | 'generating_output'
    | 'validating'
    | 'awaiting_approval'
    | 'delivering'
    | 'completed'
    | 'failed'
    | 'rolled_back';

/** Per-stage status */
export type StageStatus = 'queued' | 'running' | 'completed' | 'failed' | 'skipped';

export interface PlaybookRun {
    id: string;
    playbookId: string;
    triggerId: string;
    triggerType: string;

    status: 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;

    steps: {
        action: string;
        status: 'pending' | 'running' | 'completed' | 'failed';
        result?: unknown;
        error?: string;
        durationMs?: number;
        validation?: {
            valid: boolean;
            score: number;
            issues: string[];
            remediation?: string;
        };
        retryCount?: number;
    }[];

    // --- Agentic Workflows Doctrine extensions (all optional) ---

    /** Version of the playbook spec used for this run */
    playbookVersion?: number;

    /** Stage-based run status (superset of basic status) */
    runStatus?: RunStatus;

    /** Per-stage status map */
    stageStatuses?: Record<string, StageStatus>;

    /** Overall confidence score (0..1) */
    confidence?: number;

    /** Resolved scope for this run */
    resolvedScope?: Record<string, unknown>;

    /** Whether this run requires approval */
    requiresApproval?: boolean;

    /** Delivery status */
    deliveryStatus?: string;

    /** Retry count */
    retryCount?: number;

    /** Artifact IDs produced by this run */
    artifactIds?: string[];

    /** Trigger event details */
    triggerEvent?: Record<string, unknown>;
}

// Example YAML structure for reference:
// ---
// name: Weekly Competitor Watch
// triggers:
//   - type: schedule
//     cron: "0 9 * * 1"
// steps:
//   - action: delegate
//     agent: researcher
//     task: Scan competitor prices
//   - action: email
//     to: "{{user.email}}"
//     subject: Weekly Report
