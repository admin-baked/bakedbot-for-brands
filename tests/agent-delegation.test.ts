// tests/agent-delegation.test.ts
// Unit tests for the Agent-to-Agent Delegation Protocol

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock firebase/server-client
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: () => ({
                add: jest.fn().mockResolvedValue({ id: 'audit_123' }),
            }),
        },
    }),
}));

// Mock the agent actions module
const mockRunAgentChat = jest.fn();
jest.mock('@/app/dashboard/ceo/agents/actions', () => ({
    runAgentChat: (...args: unknown[]) => mockRunAgentChat(...args),
}));

import {
    delegateToAgent,
    generateDelegationId,
} from '../src/server/services/agent-delegation';
import type { AgentRequest } from '../src/types/agent-delegation';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<AgentRequest> = {}): AgentRequest {
    return {
        id: generateDelegationId(),
        fromAgent: 'craig',
        toAgent: 'deebo',
        task: 'Check compliance on this marketing copy',
        ...overrides,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
    // runAgentChat returns an object with .content (not a raw string)
    mockRunAgentChat.mockResolvedValue({
        content: 'Compliance check passed. No violations found.',
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateDelegationId
// ─────────────────────────────────────────────────────────────────────────────

describe('generateDelegationId', () => {
    test('generates unique IDs', () => {
        const id1 = generateDelegationId();
        const id2 = generateDelegationId();
        expect(id1).not.toBe(id2);
    });

    test('starts with "del_" prefix', () => {
        const id = generateDelegationId();
        expect(id).toMatch(/^del_/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sync delegation
// ─────────────────────────────────────────────────────────────────────────────

describe('delegateToAgent — sync mode', () => {
    test('returns completed response with result', async () => {
        mockRunAgentChat.mockResolvedValue({ content: 'All good!' });

        const response = await delegateToAgent(makeRequest());

        expect(response.status).toBe('completed');
        expect(response.result).toBe('All good!');
        expect(response.durationMs).toBeGreaterThanOrEqual(0);
        expect(response.fromAgent).toBe('deebo');
    });

    test('passes task as prompt to runAgentChat', async () => {
        const task = 'Analyze this product listing for NY compliance';
        await delegateToAgent(makeRequest({ task }));

        expect(mockRunAgentChat).toHaveBeenCalledWith(
            expect.stringContaining(task),
            'deebo',
            expect.any(Object),
        );
    });

    test('includes context in the prompt when provided', async () => {
        await delegateToAgent(makeRequest({
            context: { orgId: 'org_test', content: 'Buy weed!' },
        }));

        expect(mockRunAgentChat).toHaveBeenCalledWith(
            expect.stringContaining('orgId'),
            'deebo',
            expect.any(Object),
        );
    });

    test('returns failed response on agent error', async () => {
        mockRunAgentChat.mockRejectedValue(new Error('Agent crashed'));

        const response = await delegateToAgent(makeRequest());

        expect(response.status).toBe('failed');
        expect(response.error).toContain('Agent crashed');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unknown agent
// ─────────────────────────────────────────────────────────────────────────────

describe('delegateToAgent — unknown agent', () => {
    test('throws for unknown agent', async () => {
        await expect(
            delegateToAgent(makeRequest({ toAgent: 'nonexistent_agent_xyz' }))
        ).rejects.toThrow('Unknown agent');
    });

    test('does not call runAgentChat for unknown agent', async () => {
        try {
            await delegateToAgent(makeRequest({ toAgent: 'nonexistent_agent_xyz' }));
        } catch { /* expected */ }
        expect(mockRunAgentChat).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Timeout
// ─────────────────────────────────────────────────────────────────────────────

describe('delegateToAgent — timeout', () => {
    test('returns timeout response when agent takes too long', async () => {
        // Mock a slow agent that takes 200ms
        mockRunAgentChat.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve('late'), 200))
        );

        const response = await delegateToAgent(
            makeRequest({ timeoutMs: 50 }),
            { timeoutMs: 50 },
        );

        expect(response.status).toBe('timeout');
        expect(response.error).toContain('timed out');
    }, 10000);
});

// ─────────────────────────────────────────────────────────────────────────────
// Fallback agent
// ─────────────────────────────────────────────────────────────────────────────

describe('delegateToAgent — fallback', () => {
    test('tries fallback agent when primary fails', async () => {
        mockRunAgentChat.mockImplementation((prompt: string, agent: string) => {
            if (agent === 'deebo') throw new Error('Deebo offline');
            return { content: 'Fallback response from Craig' };
        });

        const response = await delegateToAgent(
            makeRequest({ toAgent: 'deebo' }),
            { fallbackAgent: 'craig' },
        );

        expect(response.status).toBe('completed');
        expect(response.result).toBe('Fallback response from Craig');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fire-and-forget mode
// ─────────────────────────────────────────────────────────────────────────────

describe('delegateToAgent — fire_and_forget', () => {
    test('returns immediately without waiting for result', async () => {
        mockRunAgentChat.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve('done'), 500))
        );

        const start = Date.now();
        const response = await delegateToAgent(
            makeRequest(),
            { mode: 'fire_and_forget' },
        );
        const elapsed = Date.now() - start;

        expect(response.status).toBe('completed');
        expect(response.result).toContain('dispatched');
        // Should return almost immediately (well under 500ms)
        expect(elapsed).toBeLessThan(200);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Delegation tools
// ─────────────────────────────────────────────────────────────────────────────

describe('delegation tools', () => {
    test('delegationToolDefs has correct shape', () => {
        const { delegationToolDefs } = require('../src/server/tools/delegation-tools');

        expect(delegationToolDefs).toHaveLength(1);
        expect(delegationToolDefs[0].name).toBe('delegateToAgent');
        expect(delegationToolDefs[0].schema).toBeDefined();
    });

    test('makeDelegationToolsImpl creates working executor', async () => {
        const { makeDelegationToolsImpl } = require('../src/server/tools/delegation-tools');

        const tools = makeDelegationToolsImpl('craig', 'org_test');
        expect(tools.delegateToAgent).toBeDefined();

        mockRunAgentChat.mockResolvedValue({ content: 'Delegated result' });
        const result = await tools.delegateToAgent({
            toAgent: 'deebo',
            task: 'Check compliance',
        });

        expect(result.success).toBe(true);
        expect(result.agentResponse).toBe('Delegated result');
    });
});
