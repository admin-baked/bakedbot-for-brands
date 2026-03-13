import { logger } from '@/lib/logger';
import type { Playbook } from '@/types/playbook';
import type {
    CompiledPlaybookSpec,
    PlaybookArtifact,
    ValidationIssue,
} from '@/types/playbook-v2';
import {
    ArtifactPersistenceService,
    buildPlaybookSpecPaths,
} from '@/server/services/playbook-artifact-service';
import type {
    PlaybookRunRecord,
    StageRecord,
} from '@/server/services/playbook-run-coordinator';

type ApprovalRecord = Record<string, unknown> | null | undefined;
type DeliveryRecord = Record<string, unknown>;

function stableJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

function stringifyValue(value: unknown): string {
    if (value === undefined || value === null) {
        return 'none';
    }

    if (typeof value === 'string') {
        return value;
    }

    return stableJson(value);
}

function collectValidationIssues(run: PlaybookRunRecord): ValidationIssue[] {
    return (run.validationReport?.validators ?? [])
        .flatMap((validator) => validator.issues ?? [])
        .filter(Boolean);
}

function summarizeIssues(issues: ValidationIssue[]): string {
    if (issues.length === 0) {
        return 'none';
    }

    return issues
        .slice(0, 3)
        .map((issue) => `${issue.code}: ${issue.message}`)
        .join('; ');
}

function findWeakestStage(stages: StageRecord[]): string {
    if (stages.length === 0) {
        return 'unknown';
    }

    const failed = stages.find((stage) => stage.status === 'failed');
    if (failed) {
        return failed.stageName;
    }

    const longest = [...stages].sort((left, right) => {
        return (right.metrics?.durationMs ?? right.durationMs ?? 0)
            - (left.metrics?.durationMs ?? left.durationMs ?? 0);
    })[0];

    return longest?.stageName ?? 'unknown';
}

function findMissingDataIssues(issues: ValidationIssue[]): string {
    const relevant = issues.filter((issue) => {
        return issue.code.includes('MISSING') || issue.code.includes('EMPTY');
    });
    return summarizeIssues(relevant);
}

function buildFailurePostmortem(input: {
    run: PlaybookRunRecord;
    stageName: string;
    attempt: number;
    error: { code: string; message: string; retryable: boolean };
}): string {
    return [
        '# Playbook Failure Postmortem',
        '',
        '## Identity',
        `- Run ID: ${input.run.id}`,
        `- Playbook: ${input.run.playbookId}`,
        `- Workspace: ${input.run.orgId}`,
        '',
        '## Failure',
        `- Stage: ${input.stageName}`,
        `- Attempt: ${input.attempt}`,
        `- Code: ${input.error.code}`,
        `- Retryable: ${input.error.retryable ? 'yes' : 'no'}`,
        `- Message: ${input.error.message}`,
        '',
        '## Current state',
        `- Run status: ${input.run.status}`,
        `- Retry count: ${input.run.retryCount}`,
        `- Trigger: ${stringifyValue(input.run.triggerEvent)}`,
        '',
        '## Suggested next action',
        `- ${input.error.retryable ? 'retry_stage' : 'manual_investigation'}`,
    ].join('\n');
}

export function buildSummaryForAIEngineers(input: {
    run: PlaybookRunRecord;
    playbook: Pick<Playbook, 'id' | 'orgId' | 'version'> & {
        displayName?: string;
        name?: string;
    };
    spec?: CompiledPlaybookSpec | null;
    artifacts: PlaybookArtifact[];
    stages: StageRecord[];
    approval?: ApprovalRecord;
    deliveries?: DeliveryRecord[];
}): string {
    const issues = collectValidationIssues(input.run);
    const approvalStatus = input.approval
        ? String(input.approval.approved ?? input.approval.status ?? 'present')
        : 'none';
    const editedOutput = input.approval && input.approval.notes ? 'yes' : 'no';
    const deliveryResult = (input.deliveries ?? []).length > 0
        ? (input.deliveries ?? [])
            .map((delivery) => {
                const destination = String(delivery.destination ?? delivery.channel ?? 'unknown');
                const status = String(delivery.status ?? 'unknown');
                return `${destination}=${status}`;
            })
            .join(', ')
        : 'none';

    const sourceConflict = issues.some((issue) => issue.code.includes('CONFLICT')) ? 'present' : 'none';
    const outputGenerated = input.artifacts.some((artifact) => artifact.artifactType === 'generated_output')
        ? 'yes'
        : 'no';

    return [
        '# Run Summary for AI Engineers',
        '',
        '## Identity',
        `- Workspace: ${input.playbook.orgId}`,
        `- Playbook: ${input.playbook.displayName || input.playbook.name || input.spec?.playbookType || input.playbook.id}`,
        `- Run ID: ${input.run.id}`,
        `- Date: ${input.run.startedAt}`,
        `- Playbook Version: ${input.run.playbookVersion ?? input.playbook.version}`,
        '',
        '## What happened',
        `- Trigger: ${stringifyValue(input.run.triggerEvent)}`,
        `- Scope: ${stringifyValue(input.run.resolvedScope ?? input.spec?.scope ?? null)}`,
        `- Key changes detected: ${input.artifacts.length} persisted artifacts across ${input.stages.length} stages`,
        `- Output generated: ${outputGenerated}`,
        `- Delivery result: ${deliveryResult}`,
        '',
        '## Validation',
        `- Overall status: ${input.run.validationReport?.overallStatus ?? 'unknown'}`,
        `- Required approval: ${input.run.requiresApproval ? 'yes' : 'no'}`,
        `- Major warnings/errors: ${summarizeIssues(issues)}`,
        '',
        '## Human intervention',
        `- Was the output edited: ${editedOutput}`,
        `- What changed: ${typeof input.approval?.notes === 'string' && input.approval.notes.trim().length > 0 ? input.approval.notes.trim() : 'none recorded'}`,
        `- Why it changed: ${approvalStatus}`,
        '',
        '## Reliability notes',
        `- Weakest stage: ${findWeakestStage(input.stages)}`,
        `- Missing data: ${findMissingDataIssues(issues)}`,
        `- Source conflicts: ${sourceConflict}`,
        `- Retry behavior: ${input.run.retryCount}`,
        '',
        '## Patterns worth remembering',
        `- Good pattern: ${input.run.validationReport?.overallStatus === 'fail' ? 'n/a' : 'stage-bounded artifacts remained inspectable and replayable'}`,
        `- Bad pattern: ${issues.length > 0 ? summarizeIssues(issues) : 'none observed'}`,
        `- Suggested future guardrail: ${input.run.requiresApproval ? 'tighten validation thresholds or source grounding before auto-delivery' : 'keep summary_for_ai_engineers.md generation mandatory on terminal runs'}`,
    ].join('\n');
}

export class PlaybookArtifactMemoryService {
    constructor(private readonly artifactService: ArtifactPersistenceService) { }

    async persistSpecSnapshot(input: {
        workspaceId: string;
        playbookId: string;
        version: number;
        spec: CompiledPlaybookSpec;
    }): Promise<void> {
        const { repoPath, blobPath } = buildPlaybookSpecPaths({
            workspaceId: input.workspaceId,
            playbookId: input.playbookId,
            version: input.version,
        });

        await this.artifactService.writeDocument({
            blobPath,
            repoPath,
            body: stableJson(input.spec),
            contentType: 'application/json',
            commitToRepo: true,
            message: `[playbooks] ${input.workspaceId} ${input.playbookId} spec_v${input.version}`,
        });
    }

    async persistRunManifest(input: {
        run: PlaybookRunRecord;
        stageName?: string;
    }): Promise<void> {
        await this.artifactService.persist({
            runId: input.run.id,
            workspaceId: input.run.orgId,
            playbookId: input.run.playbookId,
            stageName: input.stageName ?? 'persistence',
            artifactType: 'run_manifest',
            filename: 'run.json',
            body: stableJson({
                ...input.run,
                artifactCount: input.run.artifactIds.length,
                stageCount: Object.keys(input.run.stageStatuses).length,
            }),
            contentType: 'application/json',
            commitToRepo: true,
            runDate: input.run.startedAt,
        });
    }

    async persistFailureArtifacts(input: {
        run: PlaybookRunRecord;
        stageName: string;
        attempt: number;
        error: {
            code: string;
            message: string;
            retryable: boolean;
        };
    }): Promise<void> {
        const postmortem = buildFailurePostmortem({
            run: input.run,
            stageName: input.stageName,
            attempt: input.attempt,
            error: input.error,
        });

        await this.artifactService.persistBatch([
            {
                runId: input.run.id,
                workspaceId: input.run.orgId,
                playbookId: input.run.playbookId,
                stageName: input.stageName,
                artifactType: 'error_report',
                filename: 'error.json',
                body: stableJson({
                    runId: input.run.id,
                    playbookId: input.run.playbookId,
                    stageName: input.stageName,
                    attempt: input.attempt,
                    retryCount: input.run.retryCount,
                    error: input.error,
                    triggerEvent: input.run.triggerEvent,
                }),
                contentType: 'application/json',
                commitToRepo: true,
                runDate: input.run.startedAt,
            },
            {
                runId: input.run.id,
                workspaceId: input.run.orgId,
                playbookId: input.run.playbookId,
                stageName: input.stageName,
                artifactType: 'retry_context',
                filename: 'retry_context.json',
                body: stableJson({
                    stageName: input.stageName,
                    attempt: input.attempt,
                    retryable: input.error.retryable,
                    retryCount: input.run.retryCount,
                    stageStatuses: input.run.stageStatuses,
                }),
                contentType: 'application/json',
                commitToRepo: true,
                runDate: input.run.startedAt,
            },
            {
                runId: input.run.id,
                workspaceId: input.run.orgId,
                playbookId: input.run.playbookId,
                stageName: input.stageName,
                artifactType: 'postmortem',
                filename: 'postmortem.md',
                body: postmortem,
                contentType: 'text/markdown',
                commitToRepo: true,
                runDate: input.run.startedAt,
            },
        ]);
    }

    async persistSummaryForAIEngineers(input: {
        run: PlaybookRunRecord;
        playbook: Pick<Playbook, 'id' | 'orgId' | 'version'> & {
            displayName?: string;
            name?: string;
        };
        spec?: CompiledPlaybookSpec | null;
        artifacts: PlaybookArtifact[];
        stages: StageRecord[];
        approval?: ApprovalRecord;
        deliveries?: DeliveryRecord[];
    }): Promise<void> {
        const body = buildSummaryForAIEngineers(input);

        await this.artifactService.persist({
            runId: input.run.id,
            workspaceId: input.playbook.orgId,
            playbookId: input.playbook.id,
            stageName: input.run.status,
            artifactType: 'summary_for_ai_engineers',
            filename: 'summary_for_ai_engineers.md',
            body,
            contentType: 'text/markdown',
            commitToRepo: true,
            runDate: input.run.startedAt,
            metadata: {
                terminalStatus: input.run.status,
                artifactCount: input.artifacts.length,
            },
        });
    }

    async safePersist<T>(label: string, operation: () => Promise<T>): Promise<T | null> {
        try {
            return await operation();
        } catch (error) {
            logger.error(`[PlaybookArtifactMemory] ${label} failed`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
}
