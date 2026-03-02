// tests/workflow-registry.test.ts
// Unit tests for the Workflow Registry

// Mock logger to avoid console noise
jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
    registerWorkflow,
    getWorkflow,
    listWorkflows,
    unregisterWorkflow,
    clearRegistry,
    getWorkflowCount,
    validateWorkflow,
} from '../src/server/services/workflow-registry';
import type { WorkflowDefinition, WorkflowStep } from '../src/types/workflow';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeWorkflow(overrides: Partial<WorkflowDefinition> = {}): WorkflowDefinition {
    return {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        version: 1,
        trigger: { type: 'manual' },
        steps: [{ id: 'step_1', action: 'notify', params: { msg: 'hello' } }],
        ...overrides,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup / Teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
    clearRegistry();
});

// ─────────────────────────────────────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────────────────────────────────────

describe('registerWorkflow / getWorkflow', () => {
    test('registers and retrieves a workflow by ID', () => {
        const wf = makeWorkflow({ id: 'wf-1' });
        registerWorkflow(wf);
        expect(getWorkflow('wf-1')).toEqual(wf);
    });

    test('returns null for non-existent ID', () => {
        expect(getWorkflow('does-not-exist')).toBeNull();
    });

    test('replaces existing workflow with same ID (last-write-wins)', () => {
        registerWorkflow(makeWorkflow({ id: 'wf-1', version: 1, name: 'V1' }));
        registerWorkflow(makeWorkflow({ id: 'wf-1', version: 2, name: 'V2' }));
        const wf = getWorkflow('wf-1');
        expect(wf?.version).toBe(2);
        expect(wf?.name).toBe('V2');
        expect(getWorkflowCount()).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Listing & Filtering
// ─────────────────────────────────────────────────────────────────────────────

describe('listWorkflows', () => {
    beforeEach(() => {
        registerWorkflow(makeWorkflow({ id: 'briefing', agent: 'pops', category: 'analytics', tags: ['daily'] }));
        registerWorkflow(makeWorkflow({ id: 'content', agent: 'craig', category: 'marketing', tags: ['daily', 'seo'] }));
        registerWorkflow(makeWorkflow({ id: 'campaign', agent: 'craig', category: 'marketing', tags: ['campaigns'] }));
    });

    test('lists all workflows when no filter', () => {
        expect(listWorkflows()).toHaveLength(3);
    });

    test('filters by category', () => {
        const marketing = listWorkflows({ category: 'marketing' });
        expect(marketing).toHaveLength(2);
        expect(marketing.map(w => w.id).sort()).toEqual(['campaign', 'content']);
    });

    test('filters by tag', () => {
        const daily = listWorkflows({ tag: 'daily' });
        expect(daily).toHaveLength(2);
    });

    test('filters by agent', () => {
        const craig = listWorkflows({ agent: 'craig' });
        expect(craig).toHaveLength(2);
    });

    test('combined filter (category + agent)', () => {
        const popsAnalytics = listWorkflows({ agent: 'pops', category: 'analytics' });
        expect(popsAnalytics).toHaveLength(1);
        expect(popsAnalytics[0].id).toBe('briefing');
    });

    test('empty result for non-matching filter', () => {
        expect(listWorkflows({ agent: 'deebo' })).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unregister / Clear
// ─────────────────────────────────────────────────────────────────────────────

describe('unregisterWorkflow', () => {
    test('removes a registered workflow', () => {
        registerWorkflow(makeWorkflow({ id: 'wf-x' }));
        expect(unregisterWorkflow('wf-x')).toBe(true);
        expect(getWorkflow('wf-x')).toBeNull();
    });

    test('returns false for non-existent workflow', () => {
        expect(unregisterWorkflow('nope')).toBe(false);
    });
});

describe('clearRegistry', () => {
    test('removes all workflows', () => {
        registerWorkflow(makeWorkflow({ id: 'a' }));
        registerWorkflow(makeWorkflow({ id: 'b' }));
        expect(getWorkflowCount()).toBe(2);
        clearRegistry();
        expect(getWorkflowCount()).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('validateWorkflow', () => {
    test('valid workflow passes', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 'load', action: 'query', params: {}, outputs: { items: { type: 'array' } } },
                { id: 'process', action: 'delegate', params: {} },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('missing ID is an error', () => {
        const wf = makeWorkflow({ id: '' });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Workflow ID is required');
    });

    test('missing name is an error', () => {
        const wf = makeWorkflow({ name: '' });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Workflow name is required');
    });

    test('empty steps array is an error', () => {
        const wf = makeWorkflow({ steps: [] });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('at least one step'))).toBe(true);
    });

    test('duplicate step IDs are an error', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 'dup', action: 'a', params: {} },
                { id: 'dup', action: 'b', params: {} },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Duplicate step IDs'))).toBe(true);
    });

    test('onSuccess references unknown step', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 's1', action: 'query', params: {}, onSuccess: 'nonexistent' },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('onSuccess') && e.includes('nonexistent'))).toBe(true);
    });

    test('onFailure references unknown step', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 's1', action: 'query', params: {}, onFailure: 'unknown_step' },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('onFailure') && e.includes('unknown_step'))).toBe(true);
    });

    test('onFailure = "continue" is valid (not an error)', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 's1', action: 'query', params: {}, onFailure: 'continue' },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(true);
    });

    test('onFailure = "abort" is valid', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 's1', action: 'query', params: {}, onFailure: 'abort' },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(true);
    });

    test('forEach missing source is an error', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 's1', action: 'delegate', params: {}, forEach: { source: '', as: 'item' } },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('forEach.source'))).toBe(true);
    });

    test('forEach missing as is an error', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 's1', action: 'delegate', params: {}, forEach: { source: 'items', as: '' } },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('forEach.as'))).toBe(true);
    });

    test('nested parallel blocks produce a warning', () => {
        const wf = makeWorkflow({
            steps: [
                {
                    id: 's1',
                    action: 'parallel',
                    params: {},
                    parallel: [
                        { id: 'inner', action: 'query', params: {}, parallel: [{ id: 'nested', action: 'q', params: {} }] },
                    ],
                },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.warnings.some(w => w.includes('nested parallel'))).toBe(true);
    });

    test('sub-workflow not in registry produces a warning (not error)', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 's1', action: 'delegate', params: {}, workflow: 'unregistered-wf' },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(true); // warning, not error
        expect(result.warnings.some(w => w.includes('unregistered-wf'))).toBe(true);
    });

    test('complianceGate with non-deebo agent is an error', () => {
        const wf = makeWorkflow({
            steps: [
                {
                    id: 's1',
                    action: 'generate',
                    params: {},
                    complianceGate: { agent: 'smokey' as 'deebo', onFail: 'abort' },
                },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('complianceGate.agent') && e.includes('deebo'))).toBe(true);
    });

    test('goto cycle detection — A → B → A', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 'a', action: 'q', params: {}, onSuccess: 'b' },
                { id: 'b', action: 'q', params: {}, onSuccess: 'a' },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Cycle'))).toBe(true);
    });

    test('I/O contract warning — required input not produced by earlier step', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 's1', action: 'query', params: {} }, // no outputs declared
                { id: 's2', action: 'delegate', params: {}, inputs: { orgIds: { type: 'array', required: true } } },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.warnings.some(w => w.includes('orgIds') && w.includes('not produced'))).toBe(true);
    });

    test('I/O contract satisfied — output declared before input consumed', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 's1', action: 'query', params: {}, outputs: { orgIds: { type: 'array' } } },
                { id: 's2', action: 'delegate', params: {}, inputs: { orgIds: { type: 'array', required: true } } },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.warnings.filter(w => w.includes('orgIds'))).toHaveLength(0);
    });

    test('required input with default value does not produce warning', () => {
        const wf = makeWorkflow({
            steps: [
                { id: 's1', action: 'delegate', params: {}, inputs: { limit: { type: 'number', required: true, default: 50 } } },
            ],
        });
        const result = validateWorkflow(wf);
        expect(result.warnings.filter(w => w.includes('limit'))).toHaveLength(0);
    });
});
