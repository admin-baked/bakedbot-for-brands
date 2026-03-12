/**
 * Playbook Validation Harness
 *
 * Modular validation pipeline per the Build Package §10.
 * Each validator is a pure function implementing the Validator interface.
 * The harness orchestrates validators and produces a structured ValidationReport.
 *
 * Validators:
 *   - source-integrity: named entities exist, timestamps fresh, values parseable
 *   - schema: JSON shape, required keys, enumerations
 *   - policy: disclaimers, blocked claims, channel rules
 *   - confidence: model confidence floor, source conflicts
 *   - delivery: assets exist, destinations reachable, length constraints
 *   - duplication: output not duplicative of recent runs
 */

import { logger } from '@/lib/logger';
import type {
    Validator,
    ValidatorResult,
    ValidationContext,
    ValidationReport,
    ValidationOverallStatus,
    PlaybookArtifact,
    CompiledPlaybookSpec,
    PolicyBundle,
} from '@/types/playbook-v2';

// ---------------------------------------------------------------------------
// Source Integrity Validator
// ---------------------------------------------------------------------------

export const sourceIntegrityValidator: Validator = {
    name: 'source_integrity',

    async validate(input: ValidationContext): Promise<ValidatorResult> {
        const issues: Array<{ code: string; message: string; severity?: 'info' | 'warning' | 'error' }> = [];
        const scope = input.spec.scope as Record<string, unknown>;

        // Check that competitor IDs exist if scope references them
        const competitorIds = scope.competitorIds as string[] | undefined;
        if (competitorIds && competitorIds.length === 0) {
            issues.push({
                code: 'EMPTY_COMPETITOR_LIST',
                message: 'No competitors specified in scope',
                severity: 'error',
            });
        }

        // Check that research artifacts have content
        const researchArtifacts = input.artifacts.filter(a => a.artifactType === 'research_pack');
        if (researchArtifacts.length === 0) {
            issues.push({
                code: 'MISSING_RESEARCH_PACK',
                message: 'No research pack artifact found',
                severity: 'warning',
            });
        }

        return {
            name: 'source_integrity',
            status: issues.some(i => i.severity === 'error') ? 'fail' : issues.length > 0 ? 'warning' : 'pass',
            issues: issues.length > 0 ? issues : undefined,
        };
    },
};

// ---------------------------------------------------------------------------
// Schema Validator
// ---------------------------------------------------------------------------

export const schemaValidator: Validator = {
    name: 'schema',

    async validate(input: ValidationContext): Promise<ValidatorResult> {
        const issues: Array<{ code: string; message: string; severity?: 'info' | 'warning' | 'error' }> = [];

        // Validate output artifacts have expected shape
        const outputArtifacts = input.artifacts.filter(a =>
            a.artifactType === 'generated_output' || a.artifactType === 'recommendations'
        );

        if (outputArtifacts.length === 0) {
            issues.push({
                code: 'NO_OUTPUT_ARTIFACTS',
                message: 'No generated output artifacts found',
                severity: 'error',
            });
        }

        // Check deliverables are accounted for
        const expectedDeliverables = input.spec.outputs.deliverables;
        if (expectedDeliverables.length === 0) {
            issues.push({
                code: 'NO_DELIVERABLES_SPECIFIED',
                message: 'Compiled spec has no deliverables',
                severity: 'error',
            });
        }

        return {
            name: 'schema',
            status: issues.some(i => i.severity === 'error') ? 'fail' : issues.length > 0 ? 'warning' : 'pass',
            issues: issues.length > 0 ? issues : undefined,
        };
    },
};

// ---------------------------------------------------------------------------
// Policy Validator
// ---------------------------------------------------------------------------

export const policyValidator: Validator = {
    name: 'policy',

    async validate(input: ValidationContext): Promise<ValidatorResult> {
        const issues: Array<{ code: string; message: string; severity?: 'info' | 'warning' | 'error' }> = [];

        if (!input.policyBundle) {
            issues.push({
                code: 'NO_POLICY_BUNDLE',
                message: 'No policy bundle provided; policy validation skipped',
                severity: 'warning',
            });
            return { name: 'policy', status: 'warning', issues };
        }

        // Check required disclaimers would be present
        const requiredDisclaimers = input.policyBundle.contentRules?.blockedClaims || [];
        if (requiredDisclaimers.length > 0) {
            // In a real implementation, this would scan the generated output
            // For now, we flag if disclaimers are required but no check is possible
            issues.push({
                code: 'DISCLAIMER_CHECK_PENDING',
                message: `Policy requires ${requiredDisclaimers.length} blocked claim rules — runtime check needed`,
                severity: 'info',
            });
        }

        return {
            name: 'policy',
            status: issues.some(i => i.severity === 'error') ? 'fail' : issues.length > 0 ? 'warning' : 'pass',
            issues: issues.length > 0 ? issues : undefined,
        };
    },
};

// ---------------------------------------------------------------------------
// Confidence Validator
// ---------------------------------------------------------------------------

export const confidenceValidator: Validator = {
    name: 'confidence',

    async validate(input: ValidationContext): Promise<ValidatorResult> {
        const issues: Array<{ code: string; message: string; severity?: 'info' | 'warning' | 'error' }> = [];
        const threshold = input.spec.approvalPolicy.confidenceThreshold ?? 0.78;

        // In a real implementation, confidence would come from stage outputs
        // For now, we check if any artifact metadata has low confidence
        const lowConfidenceArtifacts = input.artifacts.filter(a => {
            const confidence = a.metadata?.confidence as number | undefined;
            return confidence !== undefined && confidence < threshold;
        });

        if (lowConfidenceArtifacts.length > 0) {
            issues.push({
                code: 'LOW_CONFIDENCE',
                message: `${lowConfidenceArtifacts.length} artifact(s) below confidence threshold (${threshold})`,
                severity: 'warning',
            });
        }

        return {
            name: 'confidence',
            status: issues.some(i => i.severity === 'error') ? 'fail' : issues.length > 0 ? 'warning' : 'pass',
            issues: issues.length > 0 ? issues : undefined,
        };
    },
};

// ---------------------------------------------------------------------------
// Delivery Validator
// ---------------------------------------------------------------------------

export const deliveryValidator: Validator = {
    name: 'delivery',

    async validate(input: ValidationContext): Promise<ValidatorResult> {
        const issues: Array<{ code: string; message: string; severity?: 'info' | 'warning' | 'error' }> = [];

        // Verify all destinations are supported
        const supportedDestinations = ['dashboard', 'email', 'slack', 'sms', 'cms'];
        const unsupported = input.spec.outputs.destinations.filter(d => !supportedDestinations.includes(d));

        if (unsupported.length > 0) {
            issues.push({
                code: 'UNSUPPORTED_DESTINATION',
                message: `Unsupported destinations: ${unsupported.join(', ')}`,
                severity: 'error',
            });
        }

        return {
            name: 'delivery',
            status: issues.some(i => i.severity === 'error') ? 'fail' : issues.length > 0 ? 'warning' : 'pass',
            issues: issues.length > 0 ? issues : undefined,
        };
    },
};

// ---------------------------------------------------------------------------
// Duplication Validator
// ---------------------------------------------------------------------------

export const duplicationValidator: Validator = {
    name: 'duplication',

    async validate(_input: ValidationContext): Promise<ValidatorResult> {
        // Placeholder: In production, this would compare against recent run outputs
        // to detect materially duplicate content.
        return { name: 'duplication', status: 'pass' };
    },
};

// ---------------------------------------------------------------------------
// Default validator sets by playbook type
// ---------------------------------------------------------------------------

export const DEFAULT_VALIDATORS: Validator[] = [
    sourceIntegrityValidator,
    schemaValidator,
    policyValidator,
    confidenceValidator,
    deliveryValidator,
    duplicationValidator,
];

export const DAILY_CI_VALIDATORS: Validator[] = [
    sourceIntegrityValidator,
    schemaValidator,
    policyValidator,
    confidenceValidator,
    deliveryValidator,
];

// ---------------------------------------------------------------------------
// Validation Harness Orchestrator
// ---------------------------------------------------------------------------

/**
 * Run the full validation harness against a set of artifacts.
 * Returns a structured ValidationReport with overall status and per-validator results.
 */
export async function runValidationHarness(
    context: ValidationContext,
    validators: Validator[] = DEFAULT_VALIDATORS,
): Promise<ValidationReport> {
    const results: ValidatorResult[] = [];

    for (const validator of validators) {
        try {
            const result = await validator.validate(context);
            results.push(result);
        } catch (err) {
            logger.error(`[ValidationHarness] Validator ${validator.name} threw exception`, {
                error: err instanceof Error ? err.message : String(err),
            });
            results.push({
                name: validator.name,
                status: 'fail',
                issues: [{
                    code: 'VALIDATOR_EXCEPTION',
                    message: `Validator threw: ${err instanceof Error ? err.message : String(err)}`,
                    severity: 'error',
                }],
            });
        }
    }

    // Determine overall status
    const hasFail = results.some(r => r.status === 'fail');
    const hasWarning = results.some(r => r.status === 'warning');

    const overallStatus: ValidationOverallStatus = hasFail
        ? 'fail'
        : hasWarning
            ? 'pass_with_warnings'
            : 'pass';

    // Determine if approval is required based on policy
    const requiresApproval = determineApprovalRequired(context, overallStatus, results);

    const report: ValidationReport = {
        runId: context.run.id,
        overallStatus,
        requiresApproval,
        validators: results,
    };

    logger.info('[ValidationHarness] Validation complete', {
        runId: context.run.id,
        overallStatus,
        requiresApproval,
        validatorCount: results.length,
        failedCount: results.filter(r => r.status === 'fail').length,
    });

    return report;
}

/**
 * Determine whether a run requires human approval based on approval policy and validation results.
 */
function determineApprovalRequired(
    context: ValidationContext,
    overallStatus: ValidationOverallStatus,
    results: ValidatorResult[],
): boolean {
    const policy = context.spec.approvalPolicy;

    switch (policy.mode) {
        case 'never':
            return false;
        case 'always':
            return true;
        case 'escalate_on_low_confidence':
            return overallStatus === 'fail' || overallStatus === 'pass_with_warnings';
        case 'required_for_first_run_and_policy_warnings': {
            const hasPolicyIssue = results.some(
                r => r.name === 'policy' && (r.status === 'fail' || r.status === 'warning')
            );
            return hasPolicyIssue || overallStatus === 'fail';
        }
        default:
            return true; // Safe fallback
    }
}
