import type {
    SafeOrgProactivePilotSettings,
    SafeProactiveDiagnosticSourceSummary,
    SafeProactiveDiagnosticSummary,
    SafeProactiveOpsCommitmentSummary,
    SafeProactiveOpsFilteredCounts,
    SafeProactiveOpsOutcomeSummary,
    SafeProactiveOpsSummary,
    SafeProactiveOpsSummaryFilters,
    SafeProactiveOpsTaskSummary,
    SafeProactiveOpsWorkflowSummary,
} from './safe-settings-types';
import type {
    ProactiveCommitmentRecord,
    ProactiveOutcomeRecord,
    ProactivePilotSettings,
    ProactiveRuntimeDiagnosticRecord,
    ProactiveSeverity,
    ProactiveTaskRecord,
    ProactiveTaskStatus,
    ProactiveWorkflowKey,
} from '@/types/proactive';

const ACTIVE_PROACTIVE_TASK_STATUSES = new Set<ProactiveTaskStatus>([
    'detected',
    'triaged',
    'investigating',
    'draft_ready',
    'awaiting_approval',
    'approved',
    'executing',
    'executed',
    'blocked',
]);

const PROACTIVE_WORKFLOW_KEYS: readonly ProactiveWorkflowKey[] = [
    'daily_dispensary_health',
    'vip_retention_watch',
    'competitor_pricing_watch',
] as const;

function toDate(value: unknown): Date | undefined {
    if (!value) {
        return undefined;
    }

    if (value instanceof Date) {
        return value;
    }

    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate: () => Date }).toDate === 'function'
    ) {
        return (value as { toDate: () => Date }).toDate();
    }

    return undefined;
}

function toIsoString(value: unknown): string | undefined {
    return toDate(value)?.toISOString();
}

function countRecentDiagnostics(
    diagnostics: ProactiveRuntimeDiagnosticRecord[],
    mode: ProactiveRuntimeDiagnosticRecord['mode'],
    cutoff: number
): number {
    return diagnostics.filter((diagnostic) => {
        if (diagnostic.mode !== mode) {
            return false;
        }

        return (toDate(diagnostic.createdAt)?.getTime() ?? 0) >= cutoff;
    }).length;
}

function countRecentOutcomes(
    outcomes: ProactiveOutcomeRecord[],
    outcomeType: ProactiveOutcomeRecord['outcomeType'],
    cutoff: number
): number {
    return outcomes.filter((outcome) => {
        if (outcome.outcomeType !== outcomeType) {
            return false;
        }

        return (toDate(outcome.createdAt)?.getTime() ?? 0) >= cutoff;
    }).length;
}

function normalizeFilters(
    filters?: SafeProactiveOpsSummaryFilters
): SafeProactiveOpsSummaryFilters {
    return {
        workflowKey: filters?.workflowKey,
        taskStatus: filters?.taskStatus,
        severity: filters?.severity,
    };
}

function matchesTaskFilters(
    task: ProactiveTaskRecord,
    filters: SafeProactiveOpsSummaryFilters
): boolean {
    if (filters.workflowKey && task.workflowKey !== filters.workflowKey) {
        return false;
    }

    if (filters.taskStatus && task.status !== filters.taskStatus) {
        return false;
    }

    if (filters.severity && task.severity !== filters.severity) {
        return false;
    }

    return true;
}

function sortByNewestTimestamp<T>(
    items: T[],
    getValue: (item: T) => unknown
): T[] {
    return [...items].sort((left, right) => {
        const leftTime = toDate(getValue(left))?.getTime() ?? 0;
        const rightTime = toDate(getValue(right))?.getTime() ?? 0;
        return rightTime - leftTime;
    });
}

function buildFilteredCounts(tasks: ProactiveTaskRecord[]): SafeProactiveOpsFilteredCounts {
    return {
        matchingTasks: tasks.length,
        matchingOpenTasks: tasks.filter((task) => ACTIVE_PROACTIVE_TASK_STATUSES.has(task.status)).length,
        matchingCriticalTasks: tasks.filter((task) => task.severity === 'critical').length,
        matchingBlockedTasks: tasks.filter((task) => task.status === 'blocked').length,
        matchingAwaitingApprovalTasks: tasks.filter((task) => task.status === 'awaiting_approval').length,
    };
}

function toTaskSummary(task: ProactiveTaskRecord): SafeProactiveOpsTaskSummary {
    return {
        id: String(task.id),
        orgId: String(task.organizationId),
        workflowKey: task.workflowKey,
        status: task.status,
        severity: task.severity,
        title: String(task.title ?? 'Untitled task'),
        updatedAt: toIsoString(task.updatedAt) ?? new Date().toISOString(),
        dueAt: toIsoString(task.dueAt),
        threadId: typeof task.threadId === 'string' ? task.threadId : undefined,
        artifactId: typeof task.artifactId === 'string' ? task.artifactId : undefined,
    };
}

function toCommitmentSummary(
    commitment: ProactiveCommitmentRecord
): SafeProactiveOpsCommitmentSummary {
    return {
        id: String(commitment.id),
        orgId: String(commitment.organizationId),
        taskId: String(commitment.taskId),
        title: String(commitment.title ?? 'Untitled commitment'),
        state: commitment.state,
        dueAt: toIsoString(commitment.dueAt),
    };
}

function toOutcomeSummary(outcome: ProactiveOutcomeRecord): SafeProactiveOpsOutcomeSummary {
    return {
        id: String(outcome.id),
        orgId: typeof outcome.organizationId === 'string' ? outcome.organizationId : undefined,
        taskId: typeof outcome.taskId === 'string' ? outcome.taskId : undefined,
        workflowKey: outcome.workflowKey,
        outcomeType: outcome.outcomeType,
        createdAt: toIsoString(outcome.createdAt) ?? new Date().toISOString(),
    };
}

function toDiagnosticSummary(
    diagnostic: ProactiveRuntimeDiagnosticRecord
): SafeProactiveDiagnosticSummary {
    return {
        id: String(diagnostic.id),
        orgId: String(diagnostic.organizationId),
        workflowKey: diagnostic.workflowKey,
        source: String(diagnostic.source ?? 'unknown'),
        mode: diagnostic.mode,
        createdAt: toIsoString(diagnostic.createdAt) ?? new Date().toISOString(),
        message: typeof diagnostic.message === 'string' ? diagnostic.message : undefined,
    };
}

function buildWorkflowSummaries(input: {
    tasks: ProactiveTaskRecord[];
    commitments: ProactiveCommitmentRecord[];
    outcomes: ProactiveOutcomeRecord[];
    diagnostics: ProactiveRuntimeDiagnosticRecord[];
    cutoff: number;
}): SafeProactiveOpsWorkflowSummary[] {
    return PROACTIVE_WORKFLOW_KEYS.map((workflowKey) => {
        const workflowTasks = input.tasks.filter((task) => task.workflowKey === workflowKey);
        const workflowTaskIds = new Set(workflowTasks.map((task) => task.id));
        const workflowCommitments = input.commitments.filter((commitment) => workflowTaskIds.has(commitment.taskId));
        const workflowOutcomes = input.outcomes.filter((outcome) => outcome.workflowKey === workflowKey);
        const workflowDiagnostics = input.diagnostics.filter((diagnostic) => diagnostic.workflowKey === workflowKey);
        const lastTaskUpdatedAt = sortByNewestTimestamp(workflowTasks, (task) => task.updatedAt)[0];

        return {
            workflowKey,
            openTasks: workflowTasks.filter((task) => ACTIVE_PROACTIVE_TASK_STATUSES.has(task.status)).length,
            draftReadyTasks: workflowTasks.filter((task) => task.status === 'draft_ready').length,
            awaitingApprovalTasks: workflowTasks.filter((task) => task.status === 'awaiting_approval').length,
            openCommitments: workflowCommitments.filter((commitment) => commitment.state === 'open').length,
            approvalsLast7Days: countRecentOutcomes(workflowOutcomes, 'approved', input.cutoff),
            dismissalsLast7Days: countRecentOutcomes(workflowOutcomes, 'dismissed', input.cutoff),
            snoozesLast7Days: countRecentOutcomes(workflowOutcomes, 'snoozed', input.cutoff),
            executionsLast7Days: countRecentOutcomes(workflowOutcomes, 'executed', input.cutoff),
            resolvedLast7Days: countRecentOutcomes(workflowOutcomes, 'resolved', input.cutoff),
            fallbackEventsLast7Days: countRecentDiagnostics(workflowDiagnostics, 'fallback', input.cutoff),
            indexedEventsLast7Days: countRecentDiagnostics(workflowDiagnostics, 'indexed', input.cutoff),
            lastTaskUpdatedAt: lastTaskUpdatedAt ? toIsoString(lastTaskUpdatedAt.updatedAt) : undefined,
        };
    });
}

function buildDiagnosticSourceSummaries(
    diagnostics: ProactiveRuntimeDiagnosticRecord[],
    cutoff: number
): SafeProactiveDiagnosticSourceSummary[] {
    const recentDiagnostics = diagnostics.filter(
        (diagnostic) => (toDate(diagnostic.createdAt)?.getTime() ?? 0) >= cutoff
    );
    const bySource = new Map<string, SafeProactiveDiagnosticSourceSummary>();

    for (const diagnostic of recentDiagnostics) {
        const key = `${diagnostic.source}::${diagnostic.workflowKey ?? 'runtime'}`;
        const current = bySource.get(key) ?? {
            source: diagnostic.source,
            workflowKey: diagnostic.workflowKey,
            indexedEventsLast7Days: 0,
            fallbackEventsLast7Days: 0,
            lastSeenAt: undefined,
        };

        if (diagnostic.mode === 'indexed') {
            current.indexedEventsLast7Days += 1;
        } else {
            current.fallbackEventsLast7Days += 1;
        }

        const createdAt = toIsoString(diagnostic.createdAt);
        if (!current.lastSeenAt || (createdAt && createdAt > current.lastSeenAt)) {
            current.lastSeenAt = createdAt;
        }

        bySource.set(key, current);
    }

    return [...bySource.values()].sort((left, right) => {
        if (right.fallbackEventsLast7Days !== left.fallbackEventsLast7Days) {
            return right.fallbackEventsLast7Days - left.fallbackEventsLast7Days;
        }

        if (right.indexedEventsLast7Days !== left.indexedEventsLast7Days) {
            return right.indexedEventsLast7Days - left.indexedEventsLast7Days;
        }

        return (right.lastSeenAt ?? '').localeCompare(left.lastSeenAt ?? '');
    });
}

function buildEmptyCounts(): SafeProactiveOpsSummary['counts'] {
    return {
        openTasks: 0,
        draftReadyTasks: 0,
        awaitingApprovalTasks: 0,
        openCommitments: 0,
        approvalsLast7Days: 0,
        dismissalsLast7Days: 0,
        outcomesLast7Days: 0,
        fallbackEventsLast7Days: 0,
    };
}

export function buildEmptySafeProactiveOpsSummary(input: {
    settings: ProactivePilotSettings;
    orgSettings: SafeOrgProactivePilotSettings | null;
    filters?: SafeProactiveOpsSummaryFilters;
}): SafeProactiveOpsSummary {
    return {
        settings: input.settings,
        orgSettings: input.orgSettings,
        filters: normalizeFilters(input.filters),
        counts: buildEmptyCounts(),
        filteredCounts: buildFilteredCounts([]),
        workflowSummaries: PROACTIVE_WORKFLOW_KEYS.map((workflowKey) => ({
            workflowKey,
            openTasks: 0,
            draftReadyTasks: 0,
            awaitingApprovalTasks: 0,
            openCommitments: 0,
            approvalsLast7Days: 0,
            dismissalsLast7Days: 0,
            snoozesLast7Days: 0,
            executionsLast7Days: 0,
            resolvedLast7Days: 0,
            fallbackEventsLast7Days: 0,
            indexedEventsLast7Days: 0,
            lastTaskUpdatedAt: undefined,
        })),
        diagnosticSourceSummaries: [],
        recentTasks: [],
        recentCommitments: [],
        recentOutcomes: [],
        diagnostics: [],
    };
}

export function buildSafeProactiveOpsSummary(input: {
    settings: ProactivePilotSettings;
    orgSettings: SafeOrgProactivePilotSettings | null;
    tasks: ProactiveTaskRecord[];
    commitments: ProactiveCommitmentRecord[];
    outcomes: ProactiveOutcomeRecord[];
    diagnostics: ProactiveRuntimeDiagnosticRecord[];
    limit?: number;
    filters?: SafeProactiveOpsSummaryFilters;
}): SafeProactiveOpsSummary {
    const limit = input.limit ?? 8;
    const cutoff = Date.now() - 7 * 86_400_000;
    const filters = normalizeFilters(input.filters);
    const filteredTasks = input.tasks.filter((task) => matchesTaskFilters(task, filters));
    const workflowScopedTaskIds = filters.workflowKey
        ? new Set(
            input.tasks
                .filter((task) => task.workflowKey === filters.workflowKey)
                .map((task) => task.id)
        )
        : null;
    const scopedCommitments = workflowScopedTaskIds
        ? input.commitments.filter((commitment) => workflowScopedTaskIds.has(commitment.taskId))
        : input.commitments;
    const scopedOutcomes = filters.workflowKey
        ? input.outcomes.filter((outcome) => outcome.workflowKey === filters.workflowKey)
        : input.outcomes;
    const scopedDiagnostics = filters.workflowKey
        ? input.diagnostics.filter((diagnostic) => diagnostic.workflowKey === filters.workflowKey)
        : input.diagnostics;

    return {
        settings: input.settings,
        orgSettings: input.orgSettings,
        filters,
        counts: {
            openTasks: input.tasks.filter((task) => ACTIVE_PROACTIVE_TASK_STATUSES.has(task.status)).length,
            draftReadyTasks: input.tasks.filter((task) => task.status === 'draft_ready').length,
            awaitingApprovalTasks: input.tasks.filter((task) => task.status === 'awaiting_approval').length,
            openCommitments: input.commitments.filter((commitment) => commitment.state === 'open').length,
            approvalsLast7Days: countRecentOutcomes(input.outcomes, 'approved', cutoff),
            dismissalsLast7Days: countRecentOutcomes(input.outcomes, 'dismissed', cutoff),
            outcomesLast7Days: input.outcomes.filter(
                (outcome) => (toDate(outcome.createdAt)?.getTime() ?? 0) >= cutoff
            ).length,
            fallbackEventsLast7Days: countRecentDiagnostics(input.diagnostics, 'fallback', cutoff),
        },
        filteredCounts: buildFilteredCounts(filteredTasks),
        workflowSummaries: buildWorkflowSummaries({
            tasks: input.tasks,
            commitments: input.commitments,
            outcomes: input.outcomes,
            diagnostics: input.diagnostics,
            cutoff,
        }),
        diagnosticSourceSummaries: buildDiagnosticSourceSummaries(input.diagnostics, cutoff),
        recentTasks: sortByNewestTimestamp(filteredTasks, (task) => task.updatedAt)
            .slice(0, limit)
            .map(toTaskSummary),
        recentCommitments: sortByNewestTimestamp(scopedCommitments, (commitment) => commitment.updatedAt)
            .slice(0, limit)
            .map(toCommitmentSummary),
        recentOutcomes: sortByNewestTimestamp(scopedOutcomes, (outcome) => outcome.createdAt)
            .slice(0, limit)
            .map(toOutcomeSummary),
        diagnostics: sortByNewestTimestamp(scopedDiagnostics, (diagnostic) => diagnostic.createdAt)
            .slice(0, limit)
            .map(toDiagnosticSummary),
    };
}

export type {
    ProactiveSeverity,
    ProactiveTaskStatus,
    ProactiveWorkflowKey,
};
