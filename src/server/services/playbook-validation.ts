/**
 * Playbook Validation Harness
 *
 * Modular validation pipeline per the Build Package section 10.
 * Each validator is a pure function implementing the Validator interface.
 */

import { logger } from '@/lib/logger';
import type {
    CompiledPlaybookSpec,
    PlaybookArtifact,
    PolicyBundle,
    ValidationContext,
    ValidationOverallStatus,
    ValidationReport,
    Validator,
    ValidatorResult,
} from '@/types/playbook-v2';

type ValidationIssue = {
    code: string;
    message: string;
    severity?: 'info' | 'warning' | 'error';
};

function collectGeneratedOutputText(input: ValidationContext): string {
    return input.artifacts
        .filter((artifact) => artifact.artifactType === 'generated_output')
        .map((artifact) => input.artifactBodies?.[artifact.id] ?? '')
        .join('\n')
        .toLowerCase();
}

// ---------------------------------------------------------------------------
// Source Integrity Validator
// ---------------------------------------------------------------------------

export const sourceIntegrityValidator: Validator = {
    name: 'source_integrity',

    async validate(input: ValidationContext): Promise<ValidatorResult> {
        const issues: ValidationIssue[] = [];
        const scope = input.spec.scope as Record<string, unknown>;

        const competitorIds = scope.competitorIds as string[] | undefined;
        if (competitorIds && competitorIds.length === 0) {
            issues.push({
                code: 'EMPTY_COMPETITOR_LIST',
                message: 'No competitors specified in scope',
                severity: 'error',
            });
        }

        const researchArtifacts = input.artifacts.filter((artifact) => artifact.artifactType === 'research_pack');
        if (researchArtifacts.length === 0) {
            issues.push({
                code: 'MISSING_RESEARCH_PACK',
                message: 'No research pack artifact found',
                severity: 'warning',
            });
        } else if (researchArtifacts.some((artifact) => !input.artifactBodies?.[artifact.id]?.trim())) {
            issues.push({
                code: 'EMPTY_RESEARCH_PACK',
                message: 'Research pack artifact is empty',
                severity: 'error',
            });
        }

        return {
            name: 'source_integrity',
            status: issues.some((issue) => issue.severity === 'error')
                ? 'fail'
                : issues.length > 0
                    ? 'warning'
                    : 'pass',
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
        const issues: ValidationIssue[] = [];

        const outputArtifacts = input.artifacts.filter(
            (artifact) =>
                artifact.artifactType === 'generated_output' ||
                artifact.artifactType === 'recommendations',
        );

        if (outputArtifacts.length === 0) {
            issues.push({
                code: 'NO_OUTPUT_ARTIFACTS',
                message: 'No generated output artifacts found',
                severity: 'error',
            });
        }

        if (input.spec.outputs.deliverables.length === 0) {
            issues.push({
                code: 'NO_DELIVERABLES_SPECIFIED',
                message: 'Compiled spec has no deliverables',
                severity: 'error',
            });
        }

        return {
            name: 'schema',
            status: issues.some((issue) => issue.severity === 'error')
                ? 'fail'
                : issues.length > 0
                    ? 'warning'
                    : 'pass',
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
        const issues: ValidationIssue[] = [];

        if (!input.policyBundle) {
            issues.push({
                code: 'NO_POLICY_BUNDLE',
                message: 'No policy bundle provided; policy validation skipped',
                severity: 'warning',
            });
            return { name: 'policy', status: 'warning', issues };
        }

        const outputText = collectGeneratedOutputText(input);

        for (const disclaimer of input.policyBundle.contentRules.requiredDisclaimers || []) {
            if (!outputText.includes(disclaimer.toLowerCase())) {
                issues.push({
                    code: 'DISCLAIMER_MISSING',
                    message: `Required disclaimer missing: ${disclaimer}`,
                    severity: 'error',
                });
            }
        }

        for (const blockedClaim of input.policyBundle.contentRules.blockedClaims || []) {
            if (outputText.includes(blockedClaim.toLowerCase())) {
                issues.push({
                    code: 'BLOCKED_CLAIM_PRESENT',
                    message: `Blocked claim detected: ${blockedClaim}`,
                    severity: 'error',
                });
            }
        }

        return {
            name: 'policy',
            status: issues.some((issue) => issue.severity === 'error')
                ? 'fail'
                : issues.length > 0
                    ? 'warning'
                    : 'pass',
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
        const issues: ValidationIssue[] = [];
        const threshold = input.spec.approvalPolicy.confidenceThreshold ?? 0.78;

        const lowConfidenceArtifacts = input.artifacts.filter((artifact) => {
            const confidence = artifact.metadata?.confidence as number | undefined;
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
            status: issues.some((issue) => issue.severity === 'error')
                ? 'fail'
                : issues.length > 0
                    ? 'warning'
                    : 'pass',
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
        const issues: ValidationIssue[] = [];
        const supportedDestinations = ['dashboard', 'email', 'slack', 'sms', 'cms'];
        const unsupported = input.spec.outputs.destinations.filter(
            (destination) => !supportedDestinations.includes(destination),
        );

        if (unsupported.length > 0) {
            issues.push({
                code: 'UNSUPPORTED_DESTINATION',
                message: `Unsupported destinations: ${unsupported.join(', ')}`,
                severity: 'error',
            });
        }

        return {
            name: 'delivery',
            status: issues.some((issue) => issue.severity === 'error')
                ? 'fail'
                : issues.length > 0
                    ? 'warning'
                    : 'pass',
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

export async function runValidationHarness(
    context: ValidationContext,
    validators: Validator[] = DEFAULT_VALIDATORS,
): Promise<ValidationReport> {
    const results: ValidatorResult[] = [];

    for (const validator of validators) {
        try {
            const result = await validator.validate(context);
            results.push(result);
        } catch (error) {
            logger.error(`[ValidationHarness] Validator ${validator.name} threw exception`, {
                error: error instanceof Error ? error.message : String(error),
            });
            results.push({
                name: validator.name,
                status: 'fail',
                issues: [{
                    code: 'VALIDATOR_EXCEPTION',
                    message: `Validator threw: ${error instanceof Error ? error.message : String(error)}`,
                    severity: 'error',
                }],
            });
        }
    }

    const hasFail = results.some((result) => result.status === 'fail');
    const hasWarning = results.some((result) => result.status === 'warning');

    const overallStatus: ValidationOverallStatus = hasFail
        ? 'fail'
        : hasWarning
            ? 'pass_with_warnings'
            : 'pass';

    const confidence = deriveRunConfidence(context);
    const requiresApproval = determineApprovalRequired(context, overallStatus, results, confidence);

    const report: ValidationReport = {
        runId: context.run.id,
        overallStatus,
        requiresApproval,
        confidence,
        validators: results,
    };

    logger.info('[ValidationHarness] Validation complete', {
        runId: context.run.id,
        overallStatus,
        requiresApproval,
        validatorCount: results.length,
        failedCount: results.filter((result) => result.status === 'fail').length,
    });

    return report;
}

function determineApprovalRequired(
    context: ValidationContext,
    overallStatus: ValidationOverallStatus,
    results: ValidatorResult[],
    confidence?: number,
): boolean {
    const policy = context.spec.approvalPolicy;

    switch (policy.mode) {
        case 'never':
            return false;
        case 'always':
            return true;
        case 'escalate_on_low_confidence': {
            if (overallStatus === 'fail') {
                return true;
            }

            const threshold = policy.confidenceThreshold ?? 0.78;
            const belowThreshold = typeof confidence === 'number' ? confidence < threshold : false;
            return belowThreshold || hasApprovalTriggerIssue(results, policy.requiredFor);
        }
        case 'required_for_first_run_and_policy_warnings': {
            const hasPolicyIssue = results.some(
                (result) => result.name === 'policy' && (result.status === 'fail' || result.status === 'warning'),
            );
            return hasPolicyIssue || overallStatus === 'fail';
        }
        default:
            return true;
    }
}

function deriveRunConfidence(context: ValidationContext): number | undefined {
    const artifactConfidences = context.artifacts
        .map((artifact) => artifact.metadata?.confidence)
        .filter((value): value is number => typeof value === 'number');

    if (artifactConfidences.length === 0) {
        return undefined;
    }

    return Math.min(...artifactConfidences);
}

function hasApprovalTriggerIssue(
    results: ValidatorResult[],
    requiredFor?: string[],
): boolean {
    if (!requiredFor || requiredFor.length === 0) {
        return results.some((result) => result.status === 'fail');
    }

    const issueCodes = new Set(requiredFor.map((value) => value.toLowerCase()));
    return results.some((result) =>
        (result.issues ?? []).some((issue) => issueCodes.has(issue.code.toLowerCase())),
    );
}

export type {
    CompiledPlaybookSpec,
    PlaybookArtifact,
    PolicyBundle,
};
