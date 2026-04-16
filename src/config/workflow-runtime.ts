/**
 * Canonical Workflow Runtime Declaration
 *
 * This file is the single source of truth for which workflow runtime is canonical.
 * All new playbook work must target the V2 stage-based runtime.
 *
 * ADR: .agent/refs/workflow-runtime-decision.md
 */

// ---------------------------------------------------------------------------
// Runtime declaration
// ---------------------------------------------------------------------------

/**
 * The canonical runtime for all new workflow execution.
 *
 * V2 (stage-based) is the target runtime for:
 *   - new playbook templates
 *   - new action types
 *   - new workflow system features
 *
 * V1 (step-based, playbook-executor.ts) is LEGACY — maintenance only.
 * See LEGACY_RUNTIME_POSTURE below.
 */
export const CANONICAL_RUNTIME = 'v2-stage-based' as const;

/**
 * The legacy runtime — maintenance-only.
 *
 * Allowed on V1:
 *   - Bug fixes
 *   - Compatibility fixes for existing assigned playbooks
 *   - Stability fixes
 *
 * Not allowed on V1:
 *   - New workflow concepts or action types
 *   - New playbook templates
 *   - New execution infrastructure
 */
export const LEGACY_RUNTIME = 'v1-step-based' as const;
export const LEGACY_RUNTIME_POSTURE = 'maintenance-only' as const;

// ---------------------------------------------------------------------------
// Execution readiness labels
// ---------------------------------------------------------------------------

/**
 * Execution readiness labels for playbooks.
 * All playbooks in the catalog must have one of these labels.
 *
 * Surfaced in:
 *   - Internal product UI (playbook catalog views)
 *   - Engineering docs and agent context
 *   - Drift-prevention checks (scripts/check-playbook-drift.ts)
 */
export type PlaybookReadiness =
    | 'executable_now'   // Fires, runs real logic, produces verified output
    | 'partial_support'  // Some steps run; others are stubs or unverified end-to-end
    | 'template_only'    // Structure defined; underlying logic is placeholder
    | 'experimental'     // Speculative feature; may not complete successfully
    | 'legacy';          // Old pattern; still runs but not the target execution model

export const READINESS_LABELS: Record<PlaybookReadiness, string> = {
    executable_now:  'Executable Now',
    partial_support: 'Partial Support',
    template_only:   'Template Only',
    experimental:    'Experimental',
    legacy:          'Legacy',
};

export const READINESS_DESCRIPTIONS: Record<PlaybookReadiness, string> = {
    executable_now:  'This playbook fires, runs real logic, and produces verified output.',
    partial_support: 'Some steps run correctly. Others are stubs or have not been verified end-to-end.',
    template_only:   'The playbook structure is defined but underlying agent logic is placeholder. Not safe for production.',
    experimental:    'Speculative feature. May not complete successfully. Do not enable for live customers without testing.',
    legacy:          'Runs on the legacy V1 executor. Maintained for compatibility only — not the canonical execution path.',
};
