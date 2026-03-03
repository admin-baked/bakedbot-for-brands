// tests/delegation-tools.test.ts
// Unit tests for delegation tool definitions and implementation factory

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockDelegateToAgent = jest.fn();
const mockGenerateDelegationId = jest.fn(() => 'del_test_abc123');

jest.mock('@/server/services/agent-delegation', () => ({
    delegateToAgent: (...args: unknown[]) => mockDelegateToAgent(...args),
    generateDelegationId: () => mockGenerateDelegationId(),
}));

import {
    delegationToolDefs,
    makeDelegationToolsImpl,
} from '../src/server/tools/delegation-tools';
import type { AgentResponse } from '../src/types/agent-delegation';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeSuccessResponse(result = 'Task completed'): AgentResponse {
    return {
        requestId: 'del_test_abc123',
        fromAgent: 'deebo',
        status: 'completed',
        result,
        durationMs: 123,
    };
}

function makeFailedResponse(error = 'Agent error', status: AgentResponse['status'] = 'failed'): AgentResponse {
    return {
        requestId: 'del_test_abc123',
        fromAgent: 'deebo',
        status,
        error,
        durationMs: 99,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────────────────────────────────────

describe('delegationToolDefs', () => {
    test('exports an array with one tool definition', () => {
        expect(Array.isArray(delegationToolDefs)).toBe(true);
        expect(delegationToolDefs).toHaveLength(1);
    });

    test('tool is named delegateToAgent', () => {
        expect(delegationToolDefs[0].name).toBe('delegateToAgent');
    });

    test('tool has a description string', () => {
        expect(typeof delegationToolDefs[0].description).toBe('string');
        expect(delegationToolDefs[0].description.length).toBeGreaterThan(10);
    });

    test('tool description mentions key agents', () => {
        const desc = delegationToolDefs[0].description;
        expect(desc).toContain('deebo');
        expect(desc).toContain('craig');
        expect(desc).toContain('smokey');
    });

    test('schema requires toAgent and task fields', () => {
        const schema = delegationToolDefs[0].schema;

        // Valid input should parse
        expect(() => schema.parse({
            toAgent: 'deebo',
            task: 'Check compliance of this content',
        })).not.toThrow();
    });

    test('schema rejects missing toAgent', () => {
        const schema = delegationToolDefs[0].schema;
        expect(() => schema.parse({ task: 'Do something' })).toThrow();
    });

    test('schema rejects missing task', () => {
        const schema = delegationToolDefs[0].schema;
        expect(() => schema.parse({ toAgent: 'deebo' })).toThrow();
    });

    test('schema accepts optional context, priority', () => {
        const schema = delegationToolDefs[0].schema;
        const result = schema.parse({
            toAgent: 'pops',
            task: 'Run analytics',
            context: { orgId: 'org-1', metric: 'revenue' },
            priority: 'high',
        });

        expect(result.context).toEqual({ orgId: 'org-1', metric: 'revenue' });
        expect(result.priority).toBe('high');
    });

    test('schema validates priority enum values', () => {
        const schema = delegationToolDefs[0].schema;

        const validPriorities = ['low', 'normal', 'high', 'critical'];
        for (const p of validPriorities) {
            expect(() => schema.parse({ toAgent: 'deebo', task: 'Test', priority: p })).not.toThrow();
        }

        expect(() => schema.parse({ toAgent: 'deebo', task: 'Test', priority: 'urgent' })).toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// makeDelegationToolsImpl — success cases
// ─────────────────────────────────────────────────────────────────────────────

describe('makeDelegationToolsImpl — success', () => {
    test('returns object with delegateToAgent function', () => {
        const impl = makeDelegationToolsImpl('leo', 'org-1');
        expect(typeof impl.delegateToAgent).toBe('function');
    });

    test('calls delegateToAgent service with correct from/to/task', async () => {
        mockDelegateToAgent.mockResolvedValue(makeSuccessResponse());

        const impl = makeDelegationToolsImpl('leo', 'org-1');
        await impl.delegateToAgent({ toAgent: 'deebo', task: 'Check compliance' });

        expect(mockDelegateToAgent).toHaveBeenCalledWith(
            expect.objectContaining({
                fromAgent: 'leo',
                toAgent: 'deebo',
                task: 'Check compliance',
            }),
        );
    });

    test('injects orgId into context', async () => {
        mockDelegateToAgent.mockResolvedValue(makeSuccessResponse());

        const impl = makeDelegationToolsImpl('craig', 'org-xyz');
        await impl.delegateToAgent({
            toAgent: 'pops',
            task: 'Get revenue data',
            context: { month: 'march' },
        });

        expect(mockDelegateToAgent).toHaveBeenCalledWith(
            expect.objectContaining({
                context: { month: 'march', orgId: 'org-xyz' },
            }),
        );
    });

    test('context orgId works even without additional context', async () => {
        mockDelegateToAgent.mockResolvedValue(makeSuccessResponse());

        const impl = makeDelegationToolsImpl('smokey', 'org-abc');
        await impl.delegateToAgent({ toAgent: 'deebo', task: 'Check' });

        expect(mockDelegateToAgent).toHaveBeenCalledWith(
            expect.objectContaining({
                context: { orgId: 'org-abc' },
            }),
        );
    });

    test('works without orgId — context has only orgId:undefined', async () => {
        mockDelegateToAgent.mockResolvedValue(makeSuccessResponse());

        const impl = makeDelegationToolsImpl('linus'); // no orgId
        await impl.delegateToAgent({ toAgent: 'deebo', task: 'Check' });

        expect(mockDelegateToAgent).toHaveBeenCalledWith(
            expect.objectContaining({
                context: { orgId: undefined },
            }),
        );
    });

    test('passes priority through to delegateToAgent', async () => {
        mockDelegateToAgent.mockResolvedValue(makeSuccessResponse());

        const impl = makeDelegationToolsImpl('leo');
        await impl.delegateToAgent({ toAgent: 'deebo', task: 'Urgent check', priority: 'critical' });

        expect(mockDelegateToAgent).toHaveBeenCalledWith(
            expect.objectContaining({ priority: 'critical' }),
        );
    });

    test('uses generateDelegationId for request id', async () => {
        mockDelegateToAgent.mockResolvedValue(makeSuccessResponse());

        const impl = makeDelegationToolsImpl('leo');
        await impl.delegateToAgent({ toAgent: 'deebo', task: 'Test' });

        expect(mockGenerateDelegationId).toHaveBeenCalled();
        expect(mockDelegateToAgent).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'del_test_abc123' }),
        );
    });

    test('returns success=true with agentResponse when completed', async () => {
        mockDelegateToAgent.mockResolvedValue(makeSuccessResponse('Compliance: OK'));

        const impl = makeDelegationToolsImpl('leo');
        const result = await impl.delegateToAgent({ toAgent: 'deebo', task: 'Check' });

        expect(result.success).toBe(true);
        expect(result.agentResponse).toBe('Compliance: OK');
        expect(result.fromAgent).toBe('deebo');
        expect(result.durationMs).toBe(123);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// makeDelegationToolsImpl — failure cases
// ─────────────────────────────────────────────────────────────────────────────

describe('makeDelegationToolsImpl — failure', () => {
    test('returns success=false when delegation fails', async () => {
        mockDelegateToAgent.mockResolvedValue(makeFailedResponse('Agent crashed'));

        const impl = makeDelegationToolsImpl('leo');
        const result = await impl.delegateToAgent({ toAgent: 'deebo', task: 'Check' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Agent crashed');
        expect(result.status).toBe('failed');
    });

    test('returns success=false on timeout', async () => {
        mockDelegateToAgent.mockResolvedValue(makeFailedResponse('Timed out', 'timeout'));

        const impl = makeDelegationToolsImpl('leo');
        const result = await impl.delegateToAgent({ toAgent: 'deebo', task: 'Slow task' });

        expect(result.success).toBe(false);
        expect(result.status).toBe('timeout');
    });

    test('uses fallback error message when response.error is undefined', async () => {
        mockDelegateToAgent.mockResolvedValue({
            requestId: 'id',
            fromAgent: 'deebo',
            status: 'failed',
            // no error field
            durationMs: 0,
        });

        const impl = makeDelegationToolsImpl('leo');
        const result = await impl.delegateToAgent({ toAgent: 'deebo', task: 'Test' });

        expect(result.success).toBe(false);
        expect(result.error).toContain('failed'); // fallback message includes status
    });

    test('propagates durationMs on failure', async () => {
        mockDelegateToAgent.mockResolvedValue(makeFailedResponse('Error', 'failed'));

        const impl = makeDelegationToolsImpl('leo');
        const result = await impl.delegateToAgent({ toAgent: 'deebo', task: 'Test' });

        expect(result.durationMs).toBe(99);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multiple agents using the factory
// ─────────────────────────────────────────────────────────────────────────────

describe('makeDelegationToolsImpl — multi-agent', () => {
    test('each agent has its own fromAgent identity', async () => {
        mockDelegateToAgent.mockResolvedValue(makeSuccessResponse());

        const leoImpl = makeDelegationToolsImpl('leo', 'org-1');
        const craigImpl = makeDelegationToolsImpl('craig', 'org-1');

        await leoImpl.delegateToAgent({ toAgent: 'deebo', task: 'Leo asks' });
        await craigImpl.delegateToAgent({ toAgent: 'deebo', task: 'Craig asks' });

        const calls = mockDelegateToAgent.mock.calls;
        expect(calls[0][0].fromAgent).toBe('leo');
        expect(calls[1][0].fromAgent).toBe('craig');
    });

    test('agents can delegate to any other agent', async () => {
        mockDelegateToAgent.mockResolvedValue(makeSuccessResponse());

        const impl = makeDelegationToolsImpl('leo');
        const agents = ['deebo', 'craig', 'smokey', 'pops', 'big_worm', 'money_mike'];

        for (const agent of agents) {
            await impl.delegateToAgent({ toAgent: agent, task: 'Test task' });
        }

        expect(mockDelegateToAgent).toHaveBeenCalledTimes(agents.length);
    });
});
