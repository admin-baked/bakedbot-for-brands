import {
    buildSafeProactiveOpsSummary,
} from '@/server/actions/super-admin/proactive-ops-summary';
import type {
    ProactiveCommitmentRecord,
    ProactiveOutcomeRecord,
    ProactivePilotSettings,
    ProactiveRuntimeDiagnosticRecord,
    ProactiveTaskRecord,
} from '@/types/proactive';

const settings: ProactivePilotSettings = {
    enabled: true,
    diagnosticsEnabled: true,
    defaultSnoozeHours: 24,
    workflows: {
        daily_dispensary_health: true,
        vip_retention_watch: true,
        competitor_pricing_watch: true,
    },
};

describe('buildSafeProactiveOpsSummary', () => {
    it('filters task triage results and keeps workflow/runtime analytics intact', () => {
        const now = new Date('2026-03-21T15:00:00.000Z');
        const tasks: ProactiveTaskRecord[] = [
            {
                id: 'task-vip-draft',
                tenantId: 'tenant-1',
                organizationId: 'org-1',
                workflowKey: 'vip_retention_watch',
                agentKey: 'mrs_parker',
                status: 'draft_ready',
                priority: 70,
                severity: 'high',
                title: 'Draft win-back for VIP cohort',
                summary: 'VIP cohort needs follow-up',
                businessObjectType: 'customer_segment',
                businessObjectId: 'segment-vip',
                dedupeKey: 'vip:2026-12',
                createdBy: 'system',
                createdAt: new Date('2026-03-21T14:00:00.000Z'),
                updatedAt: new Date('2026-03-21T14:20:00.000Z'),
            },
            {
                id: 'task-vip-blocked',
                tenantId: 'tenant-1',
                organizationId: 'org-1',
                workflowKey: 'vip_retention_watch',
                agentKey: 'mrs_parker',
                status: 'blocked',
                priority: 80,
                severity: 'critical',
                title: 'Blocked VIP outreach approval',
                summary: 'Approval is still missing',
                businessObjectType: 'customer_segment',
                businessObjectId: 'segment-vip',
                dedupeKey: 'vip:approval',
                createdBy: 'agent',
                createdAt: new Date('2026-03-20T14:00:00.000Z'),
                updatedAt: new Date('2026-03-21T13:50:00.000Z'),
            },
            {
                id: 'task-health',
                tenantId: 'tenant-1',
                organizationId: 'org-1',
                workflowKey: 'daily_dispensary_health',
                agentKey: 'pops',
                status: 'awaiting_approval',
                priority: 60,
                severity: 'medium',
                title: 'Margin alert needs review',
                summary: 'Margin dropped overnight',
                businessObjectType: 'store',
                businessObjectId: 'store-1',
                dedupeKey: 'health:store-1:2026-03-21',
                createdBy: 'system',
                createdAt: new Date('2026-03-21T09:00:00.000Z'),
                updatedAt: new Date('2026-03-21T09:10:00.000Z'),
            },
        ];

        const commitments: ProactiveCommitmentRecord[] = [
            {
                id: 'commitment-vip',
                tenantId: 'tenant-1',
                organizationId: 'org-1',
                taskId: 'task-vip-draft',
                commitmentType: 'follow_up',
                title: 'Wait for VIP send approval',
                state: 'open',
                payload: {},
                createdAt: new Date('2026-03-21T14:21:00.000Z'),
                updatedAt: new Date('2026-03-21T14:21:00.000Z'),
            },
            {
                id: 'commitment-health',
                tenantId: 'tenant-1',
                organizationId: 'org-1',
                taskId: 'task-health',
                commitmentType: 'approval_wait',
                title: 'Daily health approval wait',
                state: 'open',
                payload: {},
                createdAt: new Date('2026-03-21T09:15:00.000Z'),
                updatedAt: new Date('2026-03-21T09:15:00.000Z'),
            },
        ];

        const outcomes: ProactiveOutcomeRecord[] = [
            {
                id: 'outcome-vip-approved',
                tenantId: 'tenant-1',
                organizationId: 'org-1',
                taskId: 'task-vip-draft',
                workflowKey: 'vip_retention_watch',
                outcomeType: 'approved',
                payload: {},
                createdAt: new Date('2026-03-21T14:25:00.000Z'),
            },
            {
                id: 'outcome-vip-snoozed',
                tenantId: 'tenant-1',
                organizationId: 'org-1',
                taskId: 'task-vip-blocked',
                workflowKey: 'vip_retention_watch',
                outcomeType: 'snoozed',
                payload: {},
                createdAt: new Date('2026-03-21T14:26:00.000Z'),
            },
            {
                id: 'outcome-health-dismissed',
                tenantId: 'tenant-1',
                organizationId: 'org-1',
                taskId: 'task-health',
                workflowKey: 'daily_dispensary_health',
                outcomeType: 'dismissed',
                payload: {},
                createdAt: new Date('2026-03-21T09:20:00.000Z'),
            },
        ];

        const diagnostics: ProactiveRuntimeDiagnosticRecord[] = [
            {
                id: 'diagnostic-vip-fallback',
                tenantId: 'tenant-1',
                organizationId: 'org-1',
                workflowKey: 'vip_retention_watch',
                source: 'campaign_sender',
                mode: 'fallback',
                message: 'Fallback query path used',
                metadata: {},
                createdAt: new Date('2026-03-21T14:27:00.000Z'),
            },
            {
                id: 'diagnostic-vip-indexed',
                tenantId: 'tenant-1',
                organizationId: 'org-1',
                workflowKey: 'vip_retention_watch',
                source: 'campaign_sender',
                mode: 'indexed',
                message: 'Indexed query path used',
                metadata: {},
                createdAt: new Date('2026-03-21T14:28:00.000Z'),
            },
            {
                id: 'diagnostic-health-indexed',
                tenantId: 'tenant-1',
                organizationId: 'org-1',
                workflowKey: 'daily_dispensary_health',
                source: 'morning_briefing',
                mode: 'indexed',
                message: 'Indexed query path used',
                metadata: {},
                createdAt: new Date('2026-03-21T09:25:00.000Z'),
            },
        ];

        jest.useFakeTimers().setSystemTime(now);

        const summary = buildSafeProactiveOpsSummary({
            settings,
            orgSettings: null,
            tasks,
            commitments,
            outcomes,
            diagnostics,
            filters: {
                workflowKey: 'vip_retention_watch',
                severity: 'high',
            },
        });

        expect(summary.filters).toEqual({
            workflowKey: 'vip_retention_watch',
            taskStatus: undefined,
            severity: 'high',
        });
        expect(summary.filteredCounts).toEqual({
            matchingTasks: 1,
            matchingOpenTasks: 1,
            matchingCriticalTasks: 0,
            matchingBlockedTasks: 0,
            matchingAwaitingApprovalTasks: 0,
        });
        expect(summary.recentTasks.map((task) => task.id)).toEqual(['task-vip-draft']);
        expect(summary.recentCommitments.map((commitment) => commitment.id)).toEqual(['commitment-vip']);
        expect(summary.recentOutcomes.map((outcome) => outcome.id)).toEqual([
            'outcome-vip-snoozed',
            'outcome-vip-approved',
        ]);
        expect(summary.diagnostics.map((diagnostic) => diagnostic.id)).toEqual([
            'diagnostic-vip-indexed',
            'diagnostic-vip-fallback',
        ]);

        const vipWorkflow = summary.workflowSummaries.find(
            (workflow) => workflow.workflowKey === 'vip_retention_watch'
        );
        expect(vipWorkflow).toMatchObject({
            openTasks: 2,
            draftReadyTasks: 1,
            awaitingApprovalTasks: 0,
            openCommitments: 1,
            approvalsLast7Days: 1,
            dismissalsLast7Days: 0,
            snoozesLast7Days: 1,
            fallbackEventsLast7Days: 1,
            indexedEventsLast7Days: 1,
        });

        const runtimeSource = summary.diagnosticSourceSummaries.find(
            (diagnostic) =>
                diagnostic.source === 'campaign_sender' &&
                diagnostic.workflowKey === 'vip_retention_watch'
        );
        expect(runtimeSource).toMatchObject({
            indexedEventsLast7Days: 1,
            fallbackEventsLast7Days: 1,
        });

        jest.useRealTimers();
    });
});
