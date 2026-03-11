/**
 * Agent Virtual Machine Types
 *
 * Shared execution contract for VM-backed agent runs.
 */

export type AgentRoleScope = 'super_user' | 'dispensary' | 'brand' | 'grower';

export type RuntimeBackendId =
    | 'browser'
    | 'terminal'
    | 'analysis_js'
    | 'cloud_run_code_runner'
    | 'python_sidecar_notebooklm'
    | 'node_vm'
    | 'python_vm';

export type ApprovalType =
    | 'read_only'
    | 'internal_write'
    | 'external_write'
    | 'publish'
    | 'shell'
    | 'browser_submit'
    | 'compliance_sensitive'
    | 'tool';

export type VmRunStatus =
    | 'queued'
    | 'running'
    | 'awaiting_approval'
    | 'completed'
    | 'failed'
    | 'cancelled';

export type VmRunStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export type VmRunOutputKind =
    | 'markdown'
    | 'code'
    | 'image'
    | 'video'
    | 'json'
    | 'link'
    | 'file';

export interface VmRunStep {
    id: string;
    title: string;
    detail?: string;
    status: VmRunStepStatus;
    startedAt?: string;
    completedAt?: string;
}

export interface VmRunOutput {
    kind: VmRunOutputKind;
    title: string;
    content?: string;
    url?: string;
    language?: string;
}

export interface VmRunApproval {
    type: ApprovalType;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    resolvedAt?: string;
    approvalId?: string;
    label?: string;
}

export interface VmRunArtifactData {
    runId: string;
    threadId?: string;
    jobId?: string;
    agentId: string;
    roleScope: AgentRoleScope;
    runtimeBackend: RuntimeBackendId;
    status: VmRunStatus;
    title: string;
    summary?: string;
    plan: string[];
    steps: VmRunStep[];
    outputs: VmRunOutput[];
    approvals: VmRunApproval[];
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

export interface AgentExecutionProfile {
    agentId: string;
    roleScopes: AgentRoleScope[];
    personaPrompt?: string;
    memoryPolicyId: string;
    defaultSkills: string[];
    defaultToolGroups: string[];
    runtimeBackends: RuntimeBackendId[];
    approvalPolicyId: string;
    artifactPolicyId: string;
}

interface VmRunArtifactInput {
    runId: string;
    title: string;
    agentId: string;
    roleScope: AgentRoleScope;
    runtimeBackend: RuntimeBackendId;
    threadId?: string;
    jobId?: string;
    status?: VmRunStatus;
    summary?: string;
    plan?: string[];
    steps?: VmRunStep[];
    outputs?: VmRunOutput[];
    approvals?: VmRunApproval[];
    createdAt?: string;
    updatedAt?: string;
    completedAt?: string;
}

interface ThoughtLike {
    id: string;
    title: string;
    detail?: string;
    timestamp?: unknown;
}

interface ToolCallLike {
    id?: string;
    name: string;
    status?: string;
    result?: string;
}

export function normalizeRoleScope(role?: string | null): AgentRoleScope {
    if (!role) return 'super_user';
    if (role.includes('grower')) return 'grower';
    if (role.includes('dispensary')) return 'dispensary';
    if (role.includes('brand')) return 'brand';
    return 'super_user';
}

export function getDefaultRuntimeBackend(agentId?: string | null): RuntimeBackendId {
    switch (agentId) {
        case 'big_worm':
        case 'bigworm':
        case 'roach':
            return 'python_sidecar_notebooklm';
        case 'linus':
            return 'terminal';
        case 'leo':
        case 'jack':
        case 'glenda':
        case 'mike':
        case 'mike_exec':
            return 'browser';
        default:
            return 'analysis_js';
    }
}

export function createVmRunArtifactData(input: VmRunArtifactInput): VmRunArtifactData {
    const now = new Date().toISOString();

    return {
        runId: input.runId,
        threadId: input.threadId,
        jobId: input.jobId,
        agentId: input.agentId,
        roleScope: input.roleScope,
        runtimeBackend: input.runtimeBackend,
        status: input.status ?? 'running',
        title: input.title,
        summary: input.summary,
        plan: input.plan ?? [],
        steps: input.steps ?? [],
        outputs: input.outputs ?? [],
        approvals: input.approvals ?? [],
        createdAt: input.createdAt ?? now,
        updatedAt: input.updatedAt ?? now,
        completedAt: input.completedAt,
    };
}

export function mapThoughtsToVmRunSteps(
    thoughts: ThoughtLike[],
    status: VmRunStatus = 'running'
): VmRunStep[] {
    return thoughts.map((thought, index) => {
        const isLast = index === thoughts.length - 1;
        const stepStatus: VmRunStepStatus =
            status === 'failed' && isLast
                ? 'failed'
                : status === 'running' && isLast
                    ? 'running'
                    : 'completed';

        const startedAt = toIsoTimestamp(thought.timestamp);
        const completedAt = stepStatus === 'completed' ? startedAt : undefined;

        return {
            id: thought.id,
            title: thought.title,
            detail: thought.detail,
            status: stepStatus,
            startedAt,
            completedAt,
        };
    });
}

export function mapVmRunStatusToInboxStatus(
    status: VmRunStatus
): 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected' {
    switch (status) {
        case 'awaiting_approval':
            return 'pending_review';
        case 'completed':
            return 'published';
        case 'failed':
        case 'cancelled':
            return 'rejected';
        case 'queued':
        case 'running':
        default:
            return 'draft';
    }
}

export function upsertVmRunOutput(
    vmRun: VmRunArtifactData,
    output: VmRunOutput,
    nextStatus: VmRunStatus = vmRun.status
): VmRunArtifactData {
    const filteredOutputs = vmRun.outputs.filter((existing) => existing.title !== output.title);
    const updatedAt = new Date().toISOString();

    return {
        ...vmRun,
        status: nextStatus,
        outputs: [...filteredOutputs, output],
        updatedAt,
        completedAt: nextStatus === 'completed' || nextStatus === 'failed' || nextStatus === 'cancelled'
            ? updatedAt
            : vmRun.completedAt,
    };
}

export function resolveVmRunApproval(
    vmRun: VmRunArtifactData,
    approvalIndex: number,
    decision: 'approved' | 'rejected'
): VmRunArtifactData {
    if (!vmRun.approvals[approvalIndex]) {
        return vmRun;
    }

    const updatedAt = new Date().toISOString();
    const approvals = vmRun.approvals.map((approval, index) =>
        index === approvalIndex
            ? {
                ...approval,
                status: decision,
                resolvedAt: updatedAt,
            }
            : approval
    );

    const hasPendingApprovals = approvals.some((approval) => approval.status === 'pending');
    const hasToolApprovals = approvals.some((approval) => approval.type === 'tool');
    const nextStatus: VmRunStatus =
        decision === 'rejected'
            ? 'cancelled'
            : hasPendingApprovals
                ? 'awaiting_approval'
                : hasToolApprovals
                    ? 'running'
                    : vmRun.outputs.length > 0
                    ? 'completed'
                    : 'running';
    const nextSummary =
        decision === 'rejected'
            ? 'Approval rejected'
            : hasPendingApprovals
                ? 'Waiting for approval'
                : hasToolApprovals
                    ? 'Approval recorded. Re-run to continue.'
                    : vmRun.outputs.length > 0
                    ? 'Completed'
                    : 'Running';

    return {
        ...vmRun,
        approvals,
        status: nextStatus,
        summary: nextSummary,
        updatedAt,
        completedAt:
            nextStatus === 'completed' || nextStatus === 'failed' || nextStatus === 'cancelled'
                ? updatedAt
                : vmRun.completedAt,
    };
}

export function queueVmRunResume(vmRun: VmRunArtifactData, jobId: string): VmRunArtifactData {
    const updatedAt = new Date().toISOString();

    return {
        ...vmRun,
        jobId,
        status: 'queued',
        summary: 'Approval recorded. Resuming run...',
        steps: [],
        updatedAt,
        completedAt: undefined,
    };
}

export function extractVmApprovalsFromToolCalls(toolCalls?: ToolCallLike[]): VmRunApproval[] {
    if (!toolCalls || toolCalls.length === 0) {
        return [];
    }

    return toolCalls.flatMap((toolCall) => {
        const result = toolCall.result || '';
        const parsed = parseBlockedToolCallResult(result);
        if (!parsed) {
            return [];
        }

        return [{
            type: 'tool',
            status: 'pending',
            requestedAt: new Date().toISOString(),
            approvalId: parsed.approvalId,
            label: `Tool approval: ${toolCall.name}`,
        }];
    });
}

function parseBlockedToolCallResult(result: string): { approvalId?: string } | null {
    if (!result) return null;

    try {
        const parsed = JSON.parse(result) as { blocked?: boolean; approvalId?: string };
        if (parsed.blocked) {
            return { approvalId: parsed.approvalId };
        }
    } catch {
        // Fall through to regex parse.
    }

    const match = result.match(/Approval required\. Request ID:\s*([A-Za-z0-9_-]+)/i);
    if (!match) {
        return null;
    }

    return { approvalId: match[1] };
}

function toIsoTimestamp(value: unknown): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;

    if (typeof value === 'object' && value !== null) {
        const maybeToDate = (value as { toDate?: () => Date }).toDate;
        if (typeof maybeToDate === 'function') {
            return maybeToDate.call(value).toISOString();
        }
    }

    return undefined;
}
