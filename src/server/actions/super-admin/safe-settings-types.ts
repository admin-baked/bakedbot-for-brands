// Types for safe-settings server actions.
// Kept in a separate file because 'use server' files cannot export non-async values.

import type {
    ProactivePilotSettings,
    ProactiveRuntimeDiagnosticMode,
    ProactiveSeverity,
    ProactiveTaskStatus,
    ProactiveWorkflowKey,
} from '@/types/proactive';

export type SafeEmailProvider = 'sendgrid' | 'mailjet';
export type SafeVideoProvider = 'veo' | 'sora' | 'sora-pro' | 'kling' | 'wan' | 'remotion';

export interface SafeSystemSettings {
    emailProvider: SafeEmailProvider;
    videoProvider: SafeVideoProvider;
}

export interface SafeOrgProactivePilotSettings {
    orgId: string;
    disabled: boolean;
    workflows: Partial<Record<ProactiveWorkflowKey, boolean>>;
    notes?: string;
    updatedAt?: string;
    updatedBy?: string;
}

export interface SafeProactiveOpsTaskSummary {
    id: string;
    orgId: string;
    workflowKey: ProactiveWorkflowKey;
    status: ProactiveTaskStatus;
    severity: ProactiveSeverity;
    title: string;
    updatedAt: string;
    dueAt?: string;
    threadId?: string;
    artifactId?: string;
}

export interface SafeProactiveOpsCommitmentSummary {
    id: string;
    orgId: string;
    taskId: string;
    title: string;
    state: 'open' | 'resolved' | 'expired' | 'dismissed';
    dueAt?: string;
}

export interface SafeProactiveOpsOutcomeSummary {
    id: string;
    orgId?: string;
    taskId?: string;
    workflowKey: ProactiveWorkflowKey;
    outcomeType: 'opened' | 'snoozed' | 'dismissed' | 'approved' | 'rejected' | 'executed' | 'resolved' | 'business_lift';
    createdAt: string;
}

export interface SafeProactiveDiagnosticSummary {
    id: string;
    orgId: string;
    workflowKey?: ProactiveWorkflowKey;
    source: string;
    mode: ProactiveRuntimeDiagnosticMode;
    createdAt: string;
    message?: string;
}

export interface SafeProactiveOpsSummary {
    settings: ProactivePilotSettings;
    orgSettings: SafeOrgProactivePilotSettings | null;
    counts: {
        openTasks: number;
        draftReadyTasks: number;
        awaitingApprovalTasks: number;
        openCommitments: number;
        approvalsLast7Days: number;
        dismissalsLast7Days: number;
        outcomesLast7Days: number;
        fallbackEventsLast7Days: number;
    };
    recentTasks: SafeProactiveOpsTaskSummary[];
    recentCommitments: SafeProactiveOpsCommitmentSummary[];
    recentOutcomes: SafeProactiveOpsOutcomeSummary[];
    diagnostics: SafeProactiveDiagnosticSummary[];
}
