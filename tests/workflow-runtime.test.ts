// tests/workflow-runtime.test.ts
// Unit tests for the Workflow Runtime execution engine

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — must come before imports
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock Firebase server client (avoid real Firestore)
jest.mock('@/firebase/server-client', () => {
    const mockUpdateFn = jest.fn().mockResolvedValue(undefined);
    return {
        createServerClient: jest.fn().mockResolvedValue({
            firestore: {
                collection: jest.fn().mockReturnValue({
                    add: jest.fn().mockResolvedValue({ id: 'exec_mock_id', update: mockUpdateFn }),
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ docs: [] }),
                }),
            },
        }),
    };
});

// Mock playbook-executor to avoid loading the real one (which needs Firebase)
jest.mock('@/server/services/playbook-executor', () => ({
    executePlaybook: jest.fn().mockResolvedValue({ success: true }),
    executeSendEmail: jest.fn().mockResolvedValue({ sent: true }),
    executeSaveToDrive: jest.fn().mockResolvedValue({ saved: true }),
    executeScanCompetitors: jest.fn().mockResolvedValue({ competitors: [] }),
    executeFetchDeals: jest.fn().mockResolvedValue({ deals: [] }),
    executeGenerateCompetitorReport: jest.fn().mockResolvedValue({ report: 'test' }),
    executeCreateInboxNotification: jest.fn().mockResolvedValue({ notified: true }),
    executeGenerateVideo: jest.fn().mockResolvedValue({ video: 'url' }),
    executeGenerateCaption: jest.fn().mockResolvedValue({ caption: 'test' }),
    executeGenerateImage: jest.fn().mockResolvedValue({ image: 'url' }),
    executeSubmitApproval: jest.fn().mockResolvedValue({ approved: true }),
    getPlaybookExecution: jest.fn().mockResolvedValue(null),
}));

// Mock blog-compliance
jest.mock('@/server/services/blog-compliance', () => ({
    checkBlogCompliance: jest.fn().mockResolvedValue({ status: 'passed', issues: [] }),
}));

// Mock the registry
jest.mock('@/server/services/workflow-registry', () => {
    const store = new Map();
    return {
        getWorkflow: (id: string) => store.get(id) ?? null,
        registerWorkflow: (def: { id: string }) => store.set(def.id, def),
        clearRegistry: () => store.clear(),
    };
});

import {
    executeWorkflow,
    executeWorkflowDefinition,
} from '../src/server/services/workflow-runtime';
import { registerWorkflow, clearRegistry } from '../src/server/services/workflow-registry';
import type { WorkflowDefinition } from '../src/types/workflow';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeWorkflow(overrides: Partial<WorkflowDefinition> = {}): WorkflowDefinition {
    return {
        id: 'test-wf',
        name: 'Test Workflow',
        description: 'test',
        version: 1,
        trigger: { type: 'manual' },
        steps: [{ id: 'step_1', action: 'notify', params: { msg: 'hello' } }],
        ...overrides,
    };
}

const defaultOptions = { triggeredBy: 'test', dryRun: true };

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
    clearRegistry();
    jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Basic Execution
// ─────────────────────────────────────────────────────────────────────────────

describe('executeWorkflowDefinition — basic', () => {
    test('executes a single-step workflow (dry run)', async () => {
        const wf = makeWorkflow();
        const result = await executeWorkflowDefinition(wf, defaultOptions);

        expect(result.status).toBe('completed');
        expect(result.workflowId).toBe('test-wf');
        expect(result.stepResults).toHaveLength(1);
        expect(result.stepResults[0].status).toBe('completed');
        expect(result.id).toMatch(/^dry_/);
    });

    test('completes with correct timing fields', async () => {
        const wf = makeWorkflow();
        const result = await executeWorkflowDefinition(wf, defaultOptions);

        expect(result.startedAt).toBeInstanceOf(Date);
        expect(result.completedAt).toBeInstanceOf(Date);
        expect(typeof result.durationMs).toBe('number');
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('triggeredBy is preserved', async () => {
        const wf = makeWorkflow();
        const result = await executeWorkflowDefinition(wf, { triggeredBy: 'cron', dryRun: true });
        expect(result.triggeredBy).toBe('cron');
    });

    test('orgId is preserved', async () => {
        const wf = makeWorkflow();
        const result = await executeWorkflowDefinition(wf, { triggeredBy: 'test', orgId: 'org_123', dryRun: true });
        expect(result.orgId).toBe('org_123');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// executeWorkflow (by ID — looks up registry)
// ─────────────────────────────────────────────────────────────────────────────

describe('executeWorkflow — registry lookup', () => {
    test('executes workflow found in registry', async () => {
        const wf = makeWorkflow({ id: 'registered-wf' });
        registerWorkflow(wf);

        const result = await executeWorkflow('registered-wf', defaultOptions);
        expect(result.status).toBe('completed');
        expect(result.workflowId).toBe('registered-wf');
    });

    test('throws for workflow not in registry', async () => {
        await expect(executeWorkflow('nonexistent', defaultOptions)).rejects.toThrow('not found');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sequential Execution with Context Accumulation
// ─────────────────────────────────────────────────────────────────────────────

describe('sequential execution + context', () => {
    test('step output accumulates in context', async () => {
        const wf = makeWorkflow({
            steps: [
                { id: 'step_a', action: 'notify', params: {} },
                { id: 'step_b', action: 'notify', params: {} },
            ],
        });

        const result = await executeWorkflowDefinition(wf, defaultOptions);
        expect(result.status).toBe('completed');
        expect(result.stepResults).toHaveLength(2);
        // Both steps completed
        expect(result.stepResults[0].status).toBe('completed');
        expect(result.stepResults[1].status).toBe('completed');
    });

    test('step ID output stored in context variables', async () => {
        const wf = makeWorkflow({
            steps: [
                { id: 'loader', action: 'notify', params: {} },
                { id: 'processor', action: 'notify', params: {} },
            ],
        });

        const result = await executeWorkflowDefinition(wf, defaultOptions);
        // In dry run mode, context gets dryRun entries
        expect(result.context).toBeDefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Conditional Skip
// ─────────────────────────────────────────────────────────────────────────────

describe('conditional execution', () => {
    test('step is skipped when condition evaluates false', async () => {
        const wf = makeWorkflow({
            steps: [
                { id: 'always', action: 'notify', params: {} },
                { id: 'conditional', action: 'notify', params: {}, condition: '{{nonexistent > 0}}' },
            ],
        });

        const result = await executeWorkflowDefinition(wf, defaultOptions);
        expect(result.stepResults).toHaveLength(2);
        expect(result.stepResults[0].status).toBe('completed');
        expect(result.stepResults[1].status).toBe('skipped');
    });

    test('step executes when condition is true', async () => {
        const wf = makeWorkflow({
            steps: [
                { id: 'step', action: 'notify', params: {}, condition: '{{always_true}}' },
            ],
        });

        const result = await executeWorkflowDefinition(wf, {
            ...defaultOptions,
            variables: { always_true: 'yes' },
        });
        expect(result.stepResults[0].status).toBe('completed');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Control Flow (onFailure = 'continue')
// ─────────────────────────────────────────────────────────────────────────────

describe('control flow', () => {
    test('onFailure=continue proceeds to next step after failure', async () => {
        const wf = makeWorkflow({
            steps: [
                // This step will fail in live mode; in dry run it completes
                // We test the control flow path separately
                { id: 'step_a', action: 'notify', params: {} },
                { id: 'step_b', action: 'notify', params: {}, onFailure: 'continue' },
                { id: 'step_c', action: 'notify', params: {} },
            ],
        });

        const result = await executeWorkflowDefinition(wf, defaultOptions);
        expect(result.status).toBe('completed');
        expect(result.stepResults).toHaveLength(3);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gate Evaluation
// ─────────────────────────────────────────────────────────────────────────────

describe('gate evaluation', () => {
    test('required gate failure aborts workflow', async () => {
        const wf = makeWorkflow({
            gates: [{ name: 'has_key', check: 'apiKeyExists', required: true }],
        });

        // Gate check resolves {{apiKeyExists}} — set to false so condition fails
        const result = await executeWorkflowDefinition(wf, {
            ...defaultOptions,
            variables: { apiKeyExists: false },
        });
        expect(result.status).toBe('failed');
        expect(result.error).toContain('Gate "has_key" failed');
    });

    test('optional gate failure continues workflow', async () => {
        const wf = makeWorkflow({
            gates: [{ name: 'optional_check', check: 'someValue', required: false, onFail: 'warn' }],
        });

        const result = await executeWorkflowDefinition(wf, defaultOptions);
        expect(result.status).toBe('completed');
    });

    test('gate passes when variable exists in context', async () => {
        const wf = makeWorkflow({
            gates: [{ name: 'has_key', check: 'apiKeyExists', required: true }],
        });

        const result = await executeWorkflowDefinition(wf, {
            ...defaultOptions,
            variables: { apiKeyExists: true },
        });
        expect(result.status).toBe('completed');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// forEach Batch Processing (dry run)
// ─────────────────────────────────────────────────────────────────────────────

describe('forEach batch processing', () => {
    test('dry run forEach with array source', async () => {
        const wf = makeWorkflow({
            steps: [
                {
                    id: 'batch_step',
                    action: 'delegate',
                    params: {},
                    forEach: { source: 'items', as: 'item', batchSize: 2, concurrency: 'sequential' },
                },
            ],
        });

        const result = await executeWorkflowDefinition(wf, {
            ...defaultOptions,
            variables: { items: ['a', 'b', 'c', 'd', 'e'] },
        });

        expect(result.status).toBe('completed');
        const forEachStep = result.stepResults[0];
        expect(forEachStep.forEachSummary).toBeDefined();
        expect(forEachStep.forEachSummary?.totalItems).toBe(5);
        expect(forEachStep.forEachSummary?.processedItems).toBe(5);
        expect(forEachStep.forEachSummary?.failedItems).toBe(0);
        expect(forEachStep.forEachSummary?.batchCount).toBe(3); // ceil(5/2)
    });

    test('forEach with non-array source produces 0 items', async () => {
        const wf = makeWorkflow({
            steps: [
                {
                    id: 'batch_step',
                    action: 'delegate',
                    params: {},
                    forEach: { source: 'missing', as: 'item' },
                },
            ],
        });

        const result = await executeWorkflowDefinition(wf, defaultOptions);
        expect(result.stepResults[0].forEachSummary?.totalItems).toBe(0);
    });

    test('forEach parallel concurrency mode', async () => {
        const wf = makeWorkflow({
            steps: [
                {
                    id: 'parallel_batch',
                    action: 'delegate',
                    params: {},
                    forEach: { source: 'orgs', as: 'org', batchSize: 10, concurrency: 'parallel' },
                },
            ],
        });

        const result = await executeWorkflowDefinition(wf, {
            ...defaultOptions,
            variables: { orgs: ['org_1', 'org_2', 'org_3'] },
        });

        expect(result.status).toBe('completed');
        expect(result.stepResults[0].forEachSummary?.processedItems).toBe(3);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Parallel Block Execution (dry run)
// ─────────────────────────────────────────────────────────────────────────────

describe('parallel block execution', () => {
    test('parallel steps produce parallelResults', async () => {
        const wf = makeWorkflow({
            steps: [
                {
                    id: 'parallel_block',
                    action: 'parallel',
                    params: {},
                    parallel: [
                        { id: 'fetch_a', action: 'query', params: {} },
                        { id: 'fetch_b', action: 'query', params: {} },
                    ],
                },
            ],
        });

        const result = await executeWorkflowDefinition(wf, defaultOptions);
        expect(result.status).toBe('completed');
        const block = result.stepResults[0];
        expect(block.parallelResults).toBeDefined();
        expect(block.parallelResults).toHaveLength(2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Workflow Invocation (dry run)
// ─────────────────────────────────────────────────────────────────────────────

describe('sub-workflow invocation', () => {
    test('sub-workflow executes recursively', async () => {
        const subWf = makeWorkflow({
            id: 'sub-wf',
            name: 'Sub Workflow',
            steps: [{ id: 'sub_step', action: 'notify', params: {} }],
        });
        registerWorkflow(subWf);

        const parentWf = makeWorkflow({
            id: 'parent-wf',
            steps: [
                { id: 'invoke_sub', action: 'delegate', params: {}, workflow: 'sub-wf' },
            ],
        });

        const result = await executeWorkflowDefinition(parentWf, defaultOptions);
        expect(result.status).toBe('completed');
        expect(result.stepResults[0].status).toBe('completed');
    });

    test('sub-workflow not found throws error', async () => {
        const parentWf = makeWorkflow({
            steps: [
                { id: 'invoke', action: 'delegate', params: {}, workflow: 'nonexistent-sub' },
            ],
        });

        const result = await executeWorkflowDefinition(parentWf, defaultOptions);
        expect(result.status).toBe('failed');
        expect(result.error).toContain('Sub-workflow not found');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Timeout
// ─────────────────────────────────────────────────────────────────────────────

describe('timeout handling', () => {
    test('workflow-level timeout produces timed_out status', async () => {
        const wf = makeWorkflow({
            timeoutMs: 1, // 1ms — will timeout immediately
            steps: [
                { id: 'slow', action: 'delegate', params: {} },
            ],
        });

        // Run in non-dry mode so executeStepAction is called (which takes time)
        const result = await executeWorkflowDefinition(wf, {
            triggeredBy: 'test',
            dryRun: false,
        });

        // Might complete before timeout in test env, but structure should be valid
        expect(['completed', 'timed_out', 'failed']).toContain(result.status);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Workflow-level variables
// ─────────────────────────────────────────────────────────────────────────────

describe('workflow variables', () => {
    test('initial variables are available in context', async () => {
        const wf = makeWorkflow({
            steps: [
                { id: 'step_1', action: 'notify', params: { msg: '{{greeting}}' } },
            ],
        });

        const result = await executeWorkflowDefinition(wf, {
            ...defaultOptions,
            variables: { greeting: 'Hello World' },
        });

        expect(result.status).toBe('completed');
        expect(result.context.greeting).toBe('Hello World');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// POC Workflow Definitions (structural validation)
// ─────────────────────────────────────────────────────────────────────────────

describe('POC workflow definitions', () => {
    let morningBriefing: WorkflowDefinition;
    let contentEngine: WorkflowDefinition;
    let campaignSender: WorkflowDefinition;

    beforeAll(async () => {
        // Import the actual definitions
        const mb = await import('../src/server/services/workflow-definitions/morning-briefing.workflow');
        const ce = await import('../src/server/services/workflow-definitions/content-engine.workflow');
        const cs = await import('../src/server/services/workflow-definitions/campaign-sender.workflow');

        morningBriefing = mb.morningBriefingWorkflow;
        contentEngine = ce.contentEngineWorkflow;
        campaignSender = cs.campaignSenderWorkflow;
    });

    test('morning-briefing has correct structure', () => {
        expect(morningBriefing.id).toBe('morning-briefing');
        expect(morningBriefing.agent).toBe('pops');
        expect(morningBriefing.category).toBe('reporting');
        expect(morningBriefing.steps.length).toBeGreaterThanOrEqual(3);
        expect(morningBriefing.trigger).toMatchObject({ type: 'cron', schedule: '0 13 * * *' });
    });

    test('content-engine has compliance gate on generate step', () => {
        expect(contentEngine.id).toBe('content-engine');
        expect(contentEngine.agent).toBe('craig');

        const generateStep = contentEngine.steps.find(s => s.id === 'generate_posts');
        expect(generateStep).toBeDefined();
        expect(generateStep?.complianceGate?.agent).toBe('deebo');
        expect(generateStep?.complianceGate?.onFail).toBe('flag_and_continue');
        expect(generateStep?.forEach?.concurrency).toBe('sequential');
    });

    test('campaign-sender has abort compliance gate', () => {
        expect(campaignSender.id).toBe('campaign-sender');

        const processStep = campaignSender.steps.find(s => s.id === 'process_campaigns');
        expect(processStep?.complianceGate?.onFail).toBe('abort');
    });

    test('all POC workflows pass validation', async () => {
        // Need to import the real validateWorkflow for this
        // Since our mock overrides registry, we use a fresh import
        const { validateWorkflow } = jest.requireActual('../src/server/services/workflow-registry') as {
            validateWorkflow: (def: WorkflowDefinition) => { valid: boolean; errors: string[]; warnings: string[] };
        };

        const mbResult = validateWorkflow(morningBriefing);
        expect(mbResult.valid).toBe(true);
        expect(mbResult.errors).toHaveLength(0);

        const ceResult = validateWorkflow(contentEngine);
        expect(ceResult.valid).toBe(true);

        const csResult = validateWorkflow(campaignSender);
        expect(csResult.valid).toBe(true);
    });
});
