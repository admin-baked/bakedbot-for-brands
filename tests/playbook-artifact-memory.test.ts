import { buildSummaryForAIEngineers } from '@/server/services/playbook-artifact-memory';

describe('buildSummaryForAIEngineers', () => {
    it('includes validation, approval, and reliability details', () => {
        const summary = buildSummaryForAIEngineers({
            run: {
                id: 'run_1',
                playbookId: 'pb_1',
                playbookVersion: 2,
                orgId: 'org_1',
                status: 'completed',
                triggerEvent: { type: 'schedule' },
                resolvedScope: { competitorIds: ['cmp_1', 'cmp_2'] },
                requiresApproval: true,
                retryCount: 1,
                artifactIds: ['art_1'],
                stageStatuses: {
                    resolving_scope: 'completed',
                    validating: 'completed',
                },
                validationReport: {
                    runId: 'run_1',
                    overallStatus: 'pass_with_warnings',
                    requiresApproval: true,
                    validators: [
                        {
                            name: 'policy',
                            status: 'warning',
                            issues: [
                                {
                                    code: 'DISCLAIMER_MISSING',
                                    message: 'Required disclaimer missing',
                                    severity: 'error',
                                },
                            ],
                        },
                    ],
                },
                startedAt: '2026-03-12T13:00:00.000Z',
                createdAt: '2026-03-12T13:00:00.000Z',
            },
            playbook: {
                id: 'pb_1',
                orgId: 'org_1',
                version: 2,
                displayName: 'Daily Competitive Intelligence',
            },
            spec: {
                playbookId: 'pb_1',
                version: 2,
                playbookType: 'daily_competitive_intelligence',
                trigger: { type: 'manual' },
                scope: { competitorIds: ['cmp_1', 'cmp_2'] },
                objectives: [],
                inputs: {},
                outputs: { deliverables: ['dashboard_report'], destinations: ['dashboard'] },
                approvalPolicy: { mode: 'always' },
                telemetryProfile: 'default',
            },
            artifacts: [
                {
                    id: 'art_1',
                    runId: 'run_1',
                    stageName: 'generating_output',
                    artifactType: 'generated_output',
                    storagePath: 'artifacts/playbooks/org_1/pb_1/runs/2026/03/12/run_1/output.md',
                    createdAt: '2026-03-12T13:05:00.000Z',
                },
            ],
            stages: [
                {
                    runId: 'run_1',
                    stageName: 'assembling_context',
                    attempt: 1,
                    status: 'completed',
                    artifactIds: [],
                    metrics: { durationMs: 2400 },
                },
                {
                    runId: 'run_1',
                    stageName: 'validating',
                    attempt: 1,
                    status: 'completed',
                    artifactIds: [],
                    metrics: { durationMs: 300 },
                },
            ],
            approval: {
                approved: true,
                notes: 'Softened recommendation language',
            },
            deliveries: [
                {
                    destination: 'dashboard',
                    status: 'success',
                },
            ],
        });

        expect(summary).toContain('Run Summary for AI Engineers');
        expect(summary).toContain('Daily Competitive Intelligence');
        expect(summary).toContain('Overall status: pass_with_warnings');
        expect(summary).toContain('Required approval: yes');
        expect(summary).toContain('Weakest stage: assembling_context');
        expect(summary).toContain('Softened recommendation language');
    });
});
