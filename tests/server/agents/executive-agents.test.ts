/**
 * Executive Agents Unit Tests
 *
 * Tests for Jack (CRO), Glenda (CMO), and executive agent implementations.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// MOCKS - Must be before imports
jest.mock('yaml', () => ({ parse: jest.fn(), stringify: jest.fn() }));
jest.mock('@mendable/firecrawl-js', () => ({ default: class FirecrawlApp { scrapeUrl = jest.fn(); crawlUrl = jest.fn(); } }));
jest.mock('@/ai/genkit', () => ({ ai: { generate: jest.fn().mockResolvedValue({ text: 'Mock response' }), defineTool: jest.fn() } }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/server/services/letta/block-manager', () => ({
    lettaBlockManager: { attachBlocksForRole: jest.fn().mockResolvedValue(true) }
}));
jest.mock('@/server/agents/harness', () => ({
    runMultiStepTask: jest.fn().mockResolvedValue({
        finalResult: 'Task completed successfully',
        steps: [{ tool: 'test', result: 'success' }]
    })
}));

// Imports
import { jackAgent } from '@/server/agents/jack';
import { glendaAgent } from '@/server/agents/glenda';
import { executiveAgent } from '@/server/agents/executive';
import type { ExecutiveMemory } from '@/server/agents/schemas';

// Test data
const mockBrandMemory = {
    brand_profile: {
        id: 'test-brand-123',
        name: 'Test Cannabis Brand',
        state: 'CA'
    },
    priority_objectives: [
        { id: 'obj1', description: 'Reach $100k MRR', status: 'active' }
    ]
};

const mockAgentMemory: ExecutiveMemory = {
    agent_id: 'test-agent-id',
    objectives: [],
    system_instructions: ''
};

describe('Jack Agent (CRO)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize with correct agent name', () => {
            expect(jackAgent.agentName).toBe('jack');
        });

        it('should set system instructions on initialization', async () => {
            const result = await jackAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });

            expect(result.system_instructions).toContain('Chief Revenue Officer');
            expect(result.system_instructions).toContain('REVENUE GROWTH');
            expect(result.system_instructions).toContain('Show me the money');
        });

        it('should copy objectives from brand memory', async () => {
            const result = await jackAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });

            expect(result.objectives).toHaveLength(1);
            expect(result.objectives[0].description).toContain('MRR');
        });
    });

    describe('orient', () => {
        it('should return user_request when stimulus provided', async () => {
            const result = await jackAgent.orient(mockBrandMemory as any, mockAgentMemory, 'What is our MRR?');

            expect(result).toBe('user_request');
        });

        it('should return null when no stimulus', async () => {
            const result = await jackAgent.orient(mockBrandMemory as any, mockAgentMemory, undefined);

            expect(result).toBeNull();
        });
    });

    describe('act', () => {
        const mockTools = {
            crmListUsers: jest.fn().mockResolvedValue({ users: [] }),
            crmGetStats: jest.fn().mockResolvedValue({ mrr: 50000 }),
            lettaSaveFact: jest.fn().mockResolvedValue({ success: true })
        };

        it('should handle user requests', async () => {
            const result = await jackAgent.act(
                mockBrandMemory as any,
                mockAgentMemory,
                'user_request',
                mockTools as any,
                'What is our current MRR?'
            );

            expect(result.logEntry.action).toBe('revenue_task_complete');
            expect(result.updatedMemory).toBeDefined();
        });

        it('should return idle state when no target', async () => {
            const result = await jackAgent.act(
                mockBrandMemory as any,
                mockAgentMemory,
                null as any,
                mockTools as any,
                undefined
            );

            expect(result.logEntry.action).toBe('idle');
            expect(result.logEntry.result).toContain('Show me the money');
        });
    });
});

describe('Glenda Agent (CMO)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize with correct agent name', () => {
            expect(glendaAgent.agentName).toBe('glenda');
        });

        it('should set marketing-focused system instructions', async () => {
            const result = await glendaAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });

            expect(result.system_instructions).toContain('Chief Marketing Officer');
            expect(result.system_instructions).toContain('BRAND AWARENESS');
            expect(result.system_instructions).toContain('ORGANIC GROWTH');
        });

        it('should include compliance guidance', async () => {
            const result = await glendaAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });

            expect(result.system_instructions).toContain('cannabis marketing compliance');
            expect(result.system_instructions).toContain('Deebo approval');
        });
    });

    describe('orient', () => {
        it('should return user_request when stimulus provided', async () => {
            const result = await glendaAgent.orient(mockBrandMemory as any, mockAgentMemory, 'Create a social campaign');

            expect(result).toBe('user_request');
        });

        it('should return null when no stimulus', async () => {
            const result = await glendaAgent.orient(mockBrandMemory as any, mockAgentMemory, undefined);

            expect(result).toBeNull();
        });
    });

    describe('act', () => {
        const mockTools = {
            getGA4Traffic: jest.fn().mockResolvedValue({ sessions: 1000 }),
            generateContent: jest.fn().mockResolvedValue({ content: 'Generated content' }),
            lettaSaveFact: jest.fn().mockResolvedValue({ success: true })
        };

        it('should handle marketing tasks', async () => {
            const result = await glendaAgent.act(
                mockBrandMemory as any,
                mockAgentMemory,
                'user_request',
                mockTools as any,
                'What is our organic traffic?'
            );

            expect(result.logEntry.action).toBe('marketing_task_complete');
            expect(result.updatedMemory).toBeDefined();
        });

        it('should return idle state when monitoring', async () => {
            const result = await glendaAgent.act(
                mockBrandMemory as any,
                mockAgentMemory,
                null as any,
                mockTools as any,
                undefined
            );

            expect(result.logEntry.action).toBe('idle');
            expect(result.logEntry.result).toContain('brand presence');
        });
    });
});

describe('Executive Agent Base', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize with base agent name', () => {
            expect(executiveAgent.agentName).toBe('executive_base');
        });

        it('should set executive system instructions', async () => {
            const result = await executiveAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });

            expect(result.system_instructions).toContain('Executive Boardroom');
            expect(result.system_instructions).toContain('Plan & Delegate');
        });
    });

    describe('orient', () => {
        it('should check for MRR objectives', async () => {
            const memoryWithMrrObjective = {
                ...mockAgentMemory,
                objectives: [{ id: 'mrr_goal', description: 'Reach MRR target', status: 'active' }]
            };

            const result = await executiveAgent.orient(mockBrandMemory as any, memoryWithMrrObjective, undefined);

            expect(result).toBe('mrr_check');
        });
    });
});

describe('Agent Tool Definitions', () => {
    it('Jack should have CRM and revenue tools defined', async () => {
        const agentMemory = await jackAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });

        // The tool definitions are inside act(), so we verify via system instructions
        expect(agentMemory.system_instructions).toContain('CRM Access');
        expect(agentMemory.system_instructions).toContain('Revenue Metrics');
        expect(agentMemory.system_instructions).toContain('Deal Management');
    });

    it('Glenda should have marketing and analytics tools defined', async () => {
        const agentMemory = await glendaAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });

        expect(agentMemory.system_instructions).toContain('Analytics');
        expect(agentMemory.system_instructions).toContain('Content');
        expect(agentMemory.system_instructions).toContain('Campaign');
        expect(agentMemory.system_instructions).toContain('SEO');
    });
});

describe('Agent Collaboration', () => {
    it('Jack should reference collaboration with other agents', async () => {
        const agentMemory = await jackAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });

        expect(agentMemory.system_instructions).toContain('Craig');
        expect(agentMemory.system_instructions).toContain('Mrs. Parker');
        expect(agentMemory.system_instructions).toContain('Pops');
    });

    it('Glenda should reference collaboration with other agents', async () => {
        const agentMemory = await glendaAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });

        expect(agentMemory.system_instructions).toContain('Craig');
        expect(agentMemory.system_instructions).toContain('Day Day');
        expect(agentMemory.system_instructions).toContain('Ezal');
        expect(agentMemory.system_instructions).toContain('Jack');
    });
});
