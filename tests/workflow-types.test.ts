// tests/workflow-types.test.ts
// Unit tests for Workflow DSL type definitions and validation

import type {
    WorkflowStep,
    WorkflowDefinition,
    WorkflowExecution,
    WorkflowStepResult,
    ComplianceGate,
    ForEachConfig,
    WorkflowGate,
    WorkflowTrigger,
    WorkflowIO,
    ExecuteWorkflowOptions,
    WorkflowValidationResult,
    WorkflowFilter,
} from '../src/types/workflow';
import { WORKFLOW_DEFAULTS } from '../src/types/workflow';
import type { PlaybookStep } from '../src/types/playbook';

// ─────────────────────────────────────────────────────────────────────────────
// Backward Compatibility: PlaybookStep → WorkflowStep
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkflowStep backward compatibility with PlaybookStep', () => {
    test('a plain PlaybookStep is assignable to WorkflowStep', () => {
        const playbookStep: PlaybookStep = {
            id: 'step_1',
            action: 'delegate',
            params: { task: 'do_something' },
            agent: 'smokey',
            label: 'Test step',
        };

        // If this compiles, PlaybookStep is structurally compatible
        const workflowStep: WorkflowStep = playbookStep;
        expect(workflowStep.id).toBe('step_1');
        expect(workflowStep.action).toBe('delegate');
        expect(workflowStep.agent).toBe('smokey');
    });

    test('WorkflowStep accepts all PlaybookStep fields', () => {
        const step: WorkflowStep = {
            id: 'retry_step',
            action: 'generate',
            params: { task: 'generate_copy' },
            agent: 'craig',
            label: 'Generate marketing copy',
            condition: '{{hasBrand}}',
            retryOnFailure: true,
            maxRetries: 2,
            validationThreshold: 0.8,
        };

        expect(step.retryOnFailure).toBe(true);
        expect(step.maxRetries).toBe(2);
        expect(step.validationThreshold).toBe(0.8);
        expect(step.condition).toBe('{{hasBrand}}');
    });

    test('WorkflowStep adds orchestration fields beyond PlaybookStep', () => {
        const step: WorkflowStep = {
            id: 'full_step',
            action: 'delegate',
            params: {},
            // New WorkflowStep fields
            inputs: { orgId: { type: 'string', required: true } },
            outputs: { result: { type: 'object', description: 'Step output' } },
            onSuccess: 'next_step',
            onFailure: 'error_handler',
            timeoutMs: 30_000,
            complianceGate: { agent: 'deebo', onFail: 'abort' },
            forEach: { source: 'items', as: 'item', batchSize: 5, concurrency: 'parallel' },
        };

        expect(step.inputs?.orgId?.required).toBe(true);
        expect(step.outputs?.result?.type).toBe('object');
        expect(step.onSuccess).toBe('next_step');
        expect(step.onFailure).toBe('error_handler');
        expect(step.timeoutMs).toBe(30_000);
        expect(step.complianceGate?.agent).toBe('deebo');
        expect(step.forEach?.concurrency).toBe('parallel');
    });

    test('WorkflowStep supports parallel sub-steps', () => {
        const step: WorkflowStep = {
            id: 'parallel_block',
            action: 'parallel',
            params: {},
            parallel: [
                { id: 'sub_a', action: 'query', params: {} },
                { id: 'sub_b', action: 'delegate', params: {} },
            ],
        };

        expect(step.parallel).toHaveLength(2);
        expect(step.parallel![0].id).toBe('sub_a');
    });

    test('WorkflowStep supports sub-workflow reference', () => {
        const step: WorkflowStep = {
            id: 'invoke_sub',
            action: 'delegate',
            params: {},
            workflow: 'morning-briefing',
        };

        expect(step.workflow).toBe('morning-briefing');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ComplianceGate Type
// ─────────────────────────────────────────────────────────────────────────────

describe('ComplianceGate', () => {
    test('requires agent = deebo', () => {
        const gate: ComplianceGate = {
            agent: 'deebo',
            onFail: 'abort',
        };
        expect(gate.agent).toBe('deebo');
    });

    test('supports rulePack for state-specific compliance', () => {
        const gate: ComplianceGate = {
            agent: 'deebo',
            rulePack: 'ny-retail',
            onFail: 'flag_and_continue',
        };
        expect(gate.rulePack).toBe('ny-retail');
        expect(gate.onFail).toBe('flag_and_continue');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ForEachConfig Type
// ─────────────────────────────────────────────────────────────────────────────

describe('ForEachConfig', () => {
    test('sequential is default concurrency', () => {
        const config: ForEachConfig = {
            source: 'orgIds',
            as: 'currentOrgId',
        };
        expect(config.source).toBe('orgIds');
        expect(config.as).toBe('currentOrgId');
        expect(config.concurrency).toBeUndefined(); // defaults to sequential at runtime
    });

    test('supports parallel concurrency with batch size', () => {
        const config: ForEachConfig = {
            source: 'campaigns',
            as: 'campaign',
            batchSize: 5,
            concurrency: 'parallel',
        };
        expect(config.batchSize).toBe(5);
        expect(config.concurrency).toBe('parallel');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// WorkflowTrigger Type
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkflowTrigger', () => {
    test('cron trigger with timezone', () => {
        const trigger: WorkflowTrigger = { type: 'cron', schedule: '0 13 * * *', timezone: 'UTC' };
        expect(trigger).toMatchObject({ type: 'cron', schedule: '0 13 * * *' });
    });

    test('event trigger', () => {
        const trigger: WorkflowTrigger = { type: 'event', eventName: 'order.created' };
        expect(trigger).toMatchObject({ type: 'event', eventName: 'order.created' });
    });

    test('manual trigger', () => {
        const trigger: WorkflowTrigger = { type: 'manual' };
        expect(trigger).toMatchObject({ type: 'manual' });
    });

    test('webhook trigger', () => {
        const trigger: WorkflowTrigger = { type: 'webhook', path: '/api/webhooks/order' };
        expect(trigger).toMatchObject({ type: 'webhook', path: '/api/webhooks/order' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// WorkflowDefinition Type
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkflowDefinition', () => {
    test('minimal valid definition', () => {
        const def: WorkflowDefinition = {
            id: 'test-workflow',
            name: 'Test',
            description: 'A test workflow',
            version: 1,
            trigger: { type: 'manual' },
            steps: [{ id: 'step_1', action: 'notify', params: {} }],
        };
        expect(def.id).toBe('test-workflow');
        expect(def.steps).toHaveLength(1);
    });

    test('full definition with all fields', () => {
        const def: WorkflowDefinition = {
            id: 'full-workflow',
            name: 'Full Workflow',
            description: 'Full workflow with all optional fields',
            version: 2,
            trigger: { type: 'cron', schedule: '0 6 * * *' },
            gates: [{ name: 'has_api_key', check: 'apiKeyExists', required: true }],
            steps: [{ id: 's1', action: 'query', params: {} }],
            timeoutMs: 600_000,
            maxRetries: 2,
            agent: 'pops',
            category: 'analytics',
            tags: ['daily', 'reporting'],
            source: 'typescript',
        };
        expect(def.gates).toHaveLength(1);
        expect(def.timeoutMs).toBe(600_000);
        expect(def.maxRetries).toBe(2);
        expect(def.source).toBe('typescript');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// WorkflowExecution Type
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkflowExecution', () => {
    test('running execution shape', () => {
        const exec: WorkflowExecution = {
            id: 'exec_001',
            workflowId: 'morning-briefing',
            workflowName: 'Daily Morning Briefing',
            status: 'running',
            startedAt: new Date(),
            context: {},
            stepResults: [],
            triggeredBy: 'cron',
        };
        expect(exec.status).toBe('running');
        expect(exec.stepResults).toHaveLength(0);
    });

    test('completed execution with timing', () => {
        const start = new Date('2026-03-02T06:00:00Z');
        const end = new Date('2026-03-02T06:02:30Z');
        const exec: WorkflowExecution = {
            id: 'exec_002',
            workflowId: 'content-engine',
            workflowName: 'Daily Content Engine',
            status: 'completed',
            startedAt: start,
            completedAt: end,
            durationMs: 150_000,
            context: { processed: 3 },
            stepResults: [
                { stepId: 's1', action: 'query', status: 'completed', durationMs: 200 },
            ],
            triggeredBy: 'cli',
            orgId: 'org_test',
        };
        expect(exec.durationMs).toBe(150_000);
        expect(exec.orgId).toBe('org_test');
    });

    test('failed execution with error', () => {
        const exec: WorkflowExecution = {
            id: 'exec_003',
            workflowId: 'campaign-sender',
            workflowName: 'Campaign Sender',
            status: 'failed',
            startedAt: new Date(),
            completedAt: new Date(),
            error: 'Gate "has_api_key" failed (required)',
            context: {},
            stepResults: [],
            triggeredBy: 'cron',
        };
        expect(exec.status).toBe('failed');
        expect(exec.error).toContain('Gate');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// WorkflowStepResult
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkflowStepResult', () => {
    test('completed step with output', () => {
        const result: WorkflowStepResult = {
            stepId: 'load_templates',
            action: 'query',
            status: 'completed',
            output: { dueTemplates: ['t1', 't2'] },
            durationMs: 450,
        };
        expect(result.status).toBe('completed');
        expect(result.durationMs).toBe(450);
    });

    test('step with compliance result', () => {
        const result: WorkflowStepResult = {
            stepId: 'generate',
            action: 'generate',
            status: 'failed',
            complianceResult: {
                passed: false,
                violations: ['Medical claim detected', 'Unverified health benefit'],
                rulePack: 'ny-retail',
            },
        };
        expect(result.complianceResult?.passed).toBe(false);
        expect(result.complianceResult?.violations).toHaveLength(2);
    });

    test('step with forEach summary', () => {
        const result: WorkflowStepResult = {
            stepId: 'batch_process',
            action: 'delegate',
            status: 'completed',
            forEachSummary: {
                totalItems: 50,
                processedItems: 48,
                failedItems: 2,
                batchCount: 5,
            },
        };
        expect(result.forEachSummary?.totalItems).toBe(50);
        expect(result.forEachSummary?.failedItems).toBe(2);
    });

    test('step with parallel results', () => {
        const result: WorkflowStepResult = {
            stepId: 'parallel_fetch',
            action: 'parallel',
            status: 'completed',
            parallelResults: [
                { stepId: 'fetch_a', action: 'query', status: 'completed' },
                { stepId: 'fetch_b', action: 'query', status: 'failed', error: 'Timeout' },
            ],
        };
        expect(result.parallelResults).toHaveLength(2);
        expect(result.parallelResults![1].status).toBe('failed');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

describe('WORKFLOW_DEFAULTS', () => {
    test('step timeout is 60 seconds', () => {
        expect(WORKFLOW_DEFAULTS.stepTimeoutMs).toBe(60_000);
    });

    test('workflow timeout is 5 minutes', () => {
        expect(WORKFLOW_DEFAULTS.workflowTimeoutMs).toBe(300_000);
    });

    test('default forEach batch size is 10', () => {
        expect(WORKFLOW_DEFAULTS.forEachBatchSize).toBe(10);
    });

    test('default max retries is 0', () => {
        expect(WORKFLOW_DEFAULTS.maxRetries).toBe(0);
    });

    test('max step retries is 3', () => {
        expect(WORKFLOW_DEFAULTS.maxStepRetries).toBe(3);
    });
});
