export type ProactiveWorkflowKey =
    | 'daily_dispensary_health'
    | 'vip_retention_watch'
    | 'competitor_pricing_watch';

export type ProactiveTaskStatus =
    | 'detected'
    | 'triaged'
    | 'investigating'
    | 'draft_ready'
    | 'awaiting_approval'
    | 'approved'
    | 'executing'
    | 'executed'
    | 'blocked'
    | 'resolved'
    | 'expired'
    | 'dismissed';

export type ProactiveSeverity = 'low' | 'medium' | 'high' | 'critical';

export const TERMINAL_PROACTIVE_TASK_STATUSES: readonly ProactiveTaskStatus[] = [
    'resolved',
    'expired',
    'dismissed',
] as const;

export const PROACTIVE_TASK_ALLOWED_TRANSITIONS: Readonly<
    Record<ProactiveTaskStatus, readonly ProactiveTaskStatus[]>
> = {
    detected: ['triaged'],
    triaged: ['investigating', 'dismissed', 'blocked'],
    investigating: ['draft_ready', 'awaiting_approval', 'executing', 'blocked', 'resolved'],
    draft_ready: ['awaiting_approval', 'executing', 'dismissed'],
    awaiting_approval: ['approved', 'blocked', 'expired'],
    approved: ['executing'],
    executing: ['executed', 'blocked'],
    executed: ['resolved'],
    blocked: ['investigating', 'dismissed', 'resolved'],
    resolved: [],
    expired: [],
    dismissed: [],
} as const;

export interface ProactiveTaskRecord {
    id: string;
    tenantId: string;
    organizationId: string;
    workflowKey: ProactiveWorkflowKey;
    agentKey: string;
    status: ProactiveTaskStatus;
    priority: number;
    severity: ProactiveSeverity;
    title: string;
    summary: string;
    businessObjectType: string;
    businessObjectId: string;
    dedupeKey: string;
    workflowExecutionId?: string;
    threadId?: string;
    artifactId?: string;
    approvalId?: string;
    dueAt?: Date;
    createdBy: 'system' | 'agent' | 'user';
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
}

export interface ProactiveTaskEvidenceRecord {
    id: string;
    taskId: string;
    tenantId: string;
    evidenceType: string;
    refId?: string;
    payload: Record<string, unknown>;
    createdAt: Date;
}

export interface ProactiveCommitmentRecord {
    id: string;
    tenantId: string;
    organizationId: string;
    taskId: string;
    commitmentType: 'approval_wait' | 'follow_up' | 'deadline' | 'blocked_issue';
    title: string;
    state: 'open' | 'resolved' | 'expired' | 'dismissed';
    dueAt?: Date;
    payload: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProactiveEventRecord {
    id: string;
    tenantId: string;
    organizationId?: string;
    taskId?: string;
    actorType: 'user' | 'agent' | 'system';
    actorId?: string;
    eventType: string;
    businessObjectType?: string;
    businessObjectId?: string;
    payload: Record<string, unknown>;
    createdAt: Date;
}

export interface ProactiveOutcomeRecord {
    id: string;
    tenantId: string;
    organizationId?: string;
    taskId?: string;
    workflowKey: ProactiveWorkflowKey;
    outcomeType:
        | 'opened'
        | 'dismissed'
        | 'approved'
        | 'rejected'
        | 'executed'
        | 'resolved'
        | 'business_lift';
    score?: number;
    payload: Record<string, unknown>;
    createdAt: Date;
}
