// tests/workflow-versioning.test.ts
// Unit tests for Workflow Version Registry

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
    registerVersion,
    getVersion,
    getActiveVersion,
    listVersions,
    activateVersion,
    deprecateVersion,
    compareVersions,
    listVersionedWorkflows,
    getVersionCount,
    clearVersionStore,
} from '../src/server/services/workflow-version-registry';
import type { WorkflowVersion } from '../src/server/services/workflow-version-registry';
import { clearRegistry, getWorkflow } from '../src/server/services/workflow-registry';
import type { WorkflowDefinition } from '../src/types/workflow';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeDefinition(overrides: Partial<WorkflowDefinition> = {}): WorkflowDefinition {
    return {
        id: 'test-wf',
        name: 'Test Workflow',
        description: 'A test workflow',
        version: 1,
        trigger: { type: 'manual' },
        steps: [{ id: 'step_1', action: 'notify', params: { msg: 'hello' } }],
        ...overrides,
    };
}

function makeVersion(overrides: Partial<WorkflowVersion> = {}): WorkflowVersion {
    return {
        workflowId: 'test-wf',
        version: 1,
        definition: makeDefinition(),
        status: 'draft',
        createdAt: new Date(),
        ...overrides,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup / Teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
    clearVersionStore();
    clearRegistry();
});

// ─────────────────────────────────────────────────────────────────────────────
// Registration & Retrieval
// ─────────────────────────────────────────────────────────────────────────────

describe('registerVersion / getVersion', () => {
    test('registers and retrieves a version', () => {
        const v = makeVersion({ version: 1 });
        registerVersion(v);
        const retrieved = getVersion('test-wf', 1);
        expect(retrieved).toEqual(v);
    });

    test('returns null for non-existent version', () => {
        expect(getVersion('test-wf', 99)).toBeNull();
    });

    test('returns null for non-existent workflow', () => {
        expect(getVersion('does-not-exist', 1)).toBeNull();
    });

    test('replaces existing version', () => {
        registerVersion(makeVersion({ version: 1, changeLog: 'First' }));
        registerVersion(makeVersion({ version: 1, changeLog: 'Updated' }));

        const v = getVersion('test-wf', 1);
        expect(v?.changeLog).toBe('Updated');
        expect(getVersionCount()).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Listing
// ─────────────────────────────────────────────────────────────────────────────

describe('listVersions', () => {
    test('lists all versions sorted by version desc', () => {
        registerVersion(makeVersion({ version: 1 }));
        registerVersion(makeVersion({ version: 3 }));
        registerVersion(makeVersion({ version: 2 }));

        const versions = listVersions('test-wf');
        expect(versions).toHaveLength(3);
        expect(versions.map(v => v.version)).toEqual([3, 2, 1]);
    });

    test('returns empty for unknown workflow', () => {
        expect(listVersions('unknown')).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Activation
// ─────────────────────────────────────────────────────────────────────────────

describe('activateVersion', () => {
    test('activates a version and sets activatedAt', () => {
        registerVersion(makeVersion({ version: 1, status: 'draft' }));

        const result = activateVersion('test-wf', 1);
        expect(result).toBe(true);

        const v = getVersion('test-wf', 1);
        expect(v?.status).toBe('active');
        expect(v?.activatedAt).toBeDefined();
    });

    test('deactivates previous active version', () => {
        registerVersion(makeVersion({ version: 1, status: 'active' }));
        registerVersion(makeVersion({ version: 2, status: 'draft' }));

        activateVersion('test-wf', 2);

        expect(getVersion('test-wf', 1)?.status).toBe('deprecated');
        expect(getVersion('test-wf', 2)?.status).toBe('active');
    });

    test('syncs to main workflow registry', () => {
        const def = makeDefinition({ id: 'test-wf', version: 2, name: 'V2' });
        registerVersion(makeVersion({ version: 2, definition: def }));

        activateVersion('test-wf', 2);

        const main = getWorkflow('test-wf');
        expect(main?.name).toBe('V2');
        expect(main?.version).toBe(2);
    });

    test('only one active version at a time', () => {
        registerVersion(makeVersion({ version: 1, status: 'active' }));
        registerVersion(makeVersion({ version: 2, status: 'active' }));
        registerVersion(makeVersion({ version: 3, status: 'draft' }));

        activateVersion('test-wf', 3);

        const versions = listVersions('test-wf');
        const activeVersions = versions.filter(v => v.status === 'active');
        expect(activeVersions).toHaveLength(1);
        expect(activeVersions[0].version).toBe(3);
    });

    test('returns false for non-existent version', () => {
        expect(activateVersion('test-wf', 99)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Deprecation
// ─────────────────────────────────────────────────────────────────────────────

describe('deprecateVersion', () => {
    test('deprecates a version and sets deprecatedAt', () => {
        registerVersion(makeVersion({ version: 1, status: 'active' }));

        const result = deprecateVersion('test-wf', 1);
        expect(result).toBe(true);

        const v = getVersion('test-wf', 1);
        expect(v?.status).toBe('deprecated');
        expect(v?.deprecatedAt).toBeDefined();
    });

    test('returns false for non-existent version', () => {
        expect(deprecateVersion('test-wf', 99)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getActiveVersion
// ─────────────────────────────────────────────────────────────────────────────

describe('getActiveVersion', () => {
    test('returns active version', () => {
        registerVersion(makeVersion({ version: 1, status: 'deprecated' }));
        registerVersion(makeVersion({ version: 2, status: 'active' }));
        registerVersion(makeVersion({ version: 3, status: 'draft' }));

        const active = getActiveVersion('test-wf');
        expect(active?.version).toBe(2);
    });

    test('returns null when no active version', () => {
        registerVersion(makeVersion({ version: 1, status: 'draft' }));
        expect(getActiveVersion('test-wf')).toBeNull();
    });

    test('returns null for unknown workflow', () => {
        expect(getActiveVersion('unknown')).toBeNull();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// compareVersions
// ─────────────────────────────────────────────────────────────────────────────

describe('compareVersions', () => {
    test('detects added steps', () => {
        registerVersion(makeVersion({
            version: 1,
            definition: makeDefinition({
                steps: [{ id: 'a', action: 'query', params: {} }],
            }),
        }));
        registerVersion(makeVersion({
            version: 2,
            definition: makeDefinition({
                steps: [
                    { id: 'a', action: 'query', params: {} },
                    { id: 'b', action: 'notify', params: {} },
                ],
            }),
        }));

        const diff = compareVersions('test-wf', 1, 2);
        expect(diff?.stepsAdded).toContain('b');
        expect(diff?.stepsRemoved).toHaveLength(0);
    });

    test('detects removed steps', () => {
        registerVersion(makeVersion({
            version: 1,
            definition: makeDefinition({
                steps: [
                    { id: 'a', action: 'query', params: {} },
                    { id: 'b', action: 'notify', params: {} },
                ],
            }),
        }));
        registerVersion(makeVersion({
            version: 2,
            definition: makeDefinition({
                steps: [{ id: 'a', action: 'query', params: {} }],
            }),
        }));

        const diff = compareVersions('test-wf', 1, 2);
        expect(diff?.stepsRemoved).toContain('b');
    });

    test('detects modified steps', () => {
        registerVersion(makeVersion({
            version: 1,
            definition: makeDefinition({
                steps: [{ id: 'a', action: 'query', params: { limit: 10 } }],
            }),
        }));
        registerVersion(makeVersion({
            version: 2,
            definition: makeDefinition({
                steps: [{ id: 'a', action: 'query', params: { limit: 50 } }],
            }),
        }));

        const diff = compareVersions('test-wf', 1, 2);
        expect(diff?.stepsModified).toContain('a');
    });

    test('detects trigger changes', () => {
        registerVersion(makeVersion({
            version: 1,
            definition: makeDefinition({ trigger: { type: 'manual' } }),
        }));
        registerVersion(makeVersion({
            version: 2,
            definition: makeDefinition({ trigger: { type: 'cron', schedule: '0 * * * *' } }),
        }));

        const diff = compareVersions('test-wf', 1, 2);
        expect(diff?.triggerChanged).toBe(true);
    });

    test('returns null for non-existent versions', () => {
        expect(compareVersions('test-wf', 1, 2)).toBeNull();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Filtered listing
// ─────────────────────────────────────────────────────────────────────────────

describe('listVersionedWorkflows', () => {
    test('filters by status', () => {
        registerVersion(makeVersion({ workflowId: 'a', version: 1, status: 'active' }));
        registerVersion(makeVersion({ workflowId: 'a', version: 2, status: 'draft' }));
        registerVersion(makeVersion({ workflowId: 'b', version: 1, status: 'active' }));

        const active = listVersionedWorkflows({ status: 'active' });
        expect(active).toHaveLength(2);
    });

    test('filters by workflowId', () => {
        registerVersion(makeVersion({ workflowId: 'a', version: 1 }));
        registerVersion(makeVersion({ workflowId: 'b', version: 1 }));

        const aOnly = listVersionedWorkflows({ workflowId: 'a' });
        expect(aOnly).toHaveLength(1);
        expect(aOnly[0].workflowId).toBe('a');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Clear
// ─────────────────────────────────────────────────────────────────────────────

describe('clearVersionStore', () => {
    test('removes all versions', () => {
        registerVersion(makeVersion({ workflowId: 'a', version: 1 }));
        registerVersion(makeVersion({ workflowId: 'b', version: 1 }));
        expect(getVersionCount()).toBe(2);

        clearVersionStore();
        expect(getVersionCount()).toBe(0);
    });
});
