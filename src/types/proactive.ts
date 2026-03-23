export type ProactiveWorkflowKey =
    // Dispensary
    | 'daily_dispensary_health'
    | 'vip_retention_watch'
    | 'competitor_pricing_watch'
    | 'slow_inventory_watch'
    | 'campaign_opportunity_watch'
    // Brand
    | 'competitor_creative_watch'
    | 'market_narrative_watch'
    | 'product_launch_prep'
    | 'retail_partner_outreach_watch'
    // Super User
    | 'executive_morning_intelligence'
    | 'pipeline_risk_watch'
    // Grower
    | 'yield_anomaly_watch'
    | 'wholesale_availability_prep';

export interface ProactiveWorkflowToggles {
    // Dispensary (on by default)
    daily_dispensary_health: boolean;
    vip_retention_watch: boolean;
    competitor_pricing_watch: boolean;
    // Dispensary extended (off by default)
    slow_inventory_watch: boolean;
    campaign_opportunity_watch: boolean;
    // Brand (off by default — enabled per org)
    competitor_creative_watch: boolean;
    market_narrative_watch: boolean;
    product_launch_prep: boolean;
    retail_partner_outreach_watch: boolean;
    // Super User (off by default)
    executive_morning_intelligence: boolean;
    pipeline_risk_watch: boolean;
    // Grower (off by default)
    yield_anomaly_watch: boolean;
    wholesale_availability_prep: boolean;
}

export interface ProactivePilotSettings {
    enabled: boolean;
    diagnosticsEnabled: boolean;
    defaultSnoozeHours: number;
    workflows: ProactiveWorkflowToggles;
}

export interface OrgProactivePilotSettings {
    orgId: string;
    disabled: boolean;
    workflows?: Partial<ProactiveWorkflowToggles>;
    notes?: string;
    updatedAt?: Date;
    updatedBy?: string;
}

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
        | 'snoozed'
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

export type ProactiveRuntimeDiagnosticMode = 'indexed' | 'fallback';

export interface ProactiveRuntimeDiagnosticRecord {
    id: string;
    tenantId: string;
    organizationId: string;
    workflowKey?: ProactiveWorkflowKey;
    source: string;
    mode: ProactiveRuntimeDiagnosticMode;
    message?: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
}
