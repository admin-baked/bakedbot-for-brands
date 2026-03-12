/**
 * Playbook Runtime Integration Tests
 *
 * Verifies the interaction between:
 * - PlaybookCompilerService
 * - PlaybookRunCoordinator
 * - PlaybookValidationHarness
 * - State Machine transitions
 */

import { PlaybookCompilerService } from '@/server/services/playbook-compiler';
import { PlaybookRunCoordinator } from '@/server/services/playbook-run-coordinator';
import { runValidationHarness } from '@/server/services/playbook-validation';
import {
    getNextRunStatus,
    type CompiledPlaybookSpec,
    type PlaybookArtifact
} from '@/types/playbook-v2';

// Mocking Dependencies
const mockRunRepo = {
    createRun: jest.fn().mockResolvedValue(undefined),
    getRun: jest.fn(),
    updateRun: jest.fn().mockResolvedValue(undefined),
    appendStage: jest.fn().mockResolvedValue(undefined),
    getStages: jest.fn().mockResolvedValue([]),
};

const mockPlaybookRepo = {
    getCompiledSpec: jest.fn(),
    getPolicyBundle: jest.fn().mockResolvedValue({ id: 'pol_1', name: 'Default' }),
};

const mockTaskDispatcher = {
    enqueueStage: jest.fn().mockResolvedValue(undefined),
};

describe('Playbook Runtime Integration', () => {
    const compiler = new PlaybookCompilerService();
    const coordinator = new PlaybookRunCoordinator(
        mockRunRepo as any,
        mockPlaybookRepo as any,
        mockTaskDispatcher as any
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('PlaybookCompilerService', () => {
        it('should compile a natural language competitive intel request', async () => {
            const result = await compiler.compile({
                userId: 'user_1',
                orgId: 'org_1',
                naturalLanguageInput: 'Create a daily competitive intelligence report for my dispensary',
                autonomyLevel: 'managed_autopilot'
            });

            expect(result.spec.playbookType).toBe('daily_competitive_intelligence');
            expect(result.spec.approvalPolicy.mode).toBe('escalate_on_low_confidence');
            expect(result.spec.trigger.type).toBe('schedule');
        });

        it('should default to manual approval for assist autonomy', async () => {
            const result = await compiler.compile({
                userId: 'user_1',
                orgId: 'org_1',
                naturalLanguageInput: 'Help me with a promo',
                autonomyLevel: 'assist'
            });

            expect(result.spec.approvalPolicy.mode).toBe('always');
        });
    });

    describe('PlaybookRunCoordinator & State Machine', () => {
        it('should start a run and transition to the first stage', async () => {
            const runId = await coordinator.startRun({
                playbookId: 'pb_1',
                playbookVersion: 1,
                triggerEvent: { type: 'manual' }
            });

            expect(runId.runId).toMatch(/^run_/);
            expect(mockRunRepo.createRun).toHaveBeenCalled();
            expect(mockRunRepo.updateRun).toHaveBeenCalledWith(expect.any(String), { status: 'resolving_scope' });
            expect(mockTaskDispatcher.enqueueStage).toHaveBeenCalledWith(expect.objectContaining({
                stageName: 'resolving_scope'
            }));
        });

        it('should transition from resolving_scope to extracting_questions', () => {
            const next = getNextRunStatus({ currentStatus: 'resolving_scope' });
            expect(next).toBe('extracting_questions');
        });

        it('should transition to awaiting_approval if validation warns in escalate mode', async () => {
            const spec: CompiledPlaybookSpec = {
                playbookId: 'pb_1',
                approvalPolicy: { mode: 'escalate_on_low_confidence', confidenceThreshold: 0.8 },
                // ... other fields mocked as partial
            } as any;

            const artifacts: PlaybookArtifact[] = [
                { id: 'art_1', artifactType: 'generated_output', metadata: { confidence: 0.7 } } as any
            ];

            const report = await runValidationHarness({
                run: { id: 'run_1', startedAt: new Date().toISOString() },
                spec,
                artifacts
            });

            expect(report.overallStatus).toBe('pass_with_warnings');
            expect(report.requiresApproval).toBe(true);

            const next = getNextRunStatus({
                currentStatus: 'validating' as any,
                validation: report
            });
            expect(next).toBe('awaiting_approval');
        });

        it('should transition directly to delivering if validation passes in escalate mode', async () => {
            const spec: CompiledPlaybookSpec = {
                playbookId: 'pb_1',
                approvalPolicy: { mode: 'escalate_on_low_confidence', confidenceThreshold: 0.8 },
            } as any;

            const artifacts: PlaybookArtifact[] = [
                { id: 'art_1', artifactType: 'generated_output', metadata: { confidence: 0.9 } } as any
            ];

            const report = await runValidationHarness({
                run: { id: 'run_1', startedAt: new Date().toISOString() },
                spec,
                artifacts
            });

            expect(report.overallStatus).toBe('pass');
            expect(report.requiresApproval).toBe(false);

            const next = getNextRunStatus({
                currentStatus: 'validating' as any,
                validation: report
            });
            expect(next).toBe('delivering');
        });
    });
});
