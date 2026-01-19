/**
 * Support Staff Agents Unit Tests
 *
 * Tests for Smokey, Pops, Craig, Mrs. Parker, Day Day, Felisha, Roach, and other support agents.
 *
 * Note: Due to Jest ESM module resolution issues with genkit packages,
 * we test agents that don't directly import @/ai/genkit.
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
jest.mock('@/server/agents/deebo', () => ({
    deebo: { checkContent: jest.fn(), checkAge: jest.fn() },
    deeboCheckAge: jest.fn()
}));
jest.mock('@/server/services/python-sidecar', () => ({
    sidecar: { runAction: jest.fn().mockResolvedValue({ success: true }) }
}));

// Import agents that don't use genkit directly
import { smokeyAgent } from '@/server/agents/smokey';
import { craigAgent } from '@/server/agents/craig';
import { mrsParkerAgent } from '@/server/agents/mrsParker';
import { dayday } from '@/server/agents/dayday';
import { felisha } from '@/server/agents/felisha';
import { bigWormAgent } from '@/server/agents/bigworm';
import { moneyMikeAgent } from '@/server/agents/moneyMike';
import type { AgentMemory, SmokeyMemory, CraigMemory, MrsParkerMemory, MoneyMikeMemory } from '@/server/agents/schemas';

// Test data
const mockBrandMemory = {
    brand_profile: {
        id: 'test-brand-123',
        name: 'Test Cannabis Brand',
        state: 'CA'
    },
    priority_objectives: [
        { id: 'obj1', description: 'Grow customer base', status: 'active' }
    ],
    known_users: []
};

const createMockAgentMemory = (): AgentMemory => ({
    agent_id: 'test-agent-id',
    system_instructions: ''
});

const createSmokeyMemory = (): SmokeyMemory => ({
    ...createMockAgentMemory(),
    ux_experiments: []
});

describe('Smokey Agent (Budtender)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize with correct agent name', () => {
            expect(smokeyAgent.agentName).toBe('smokey');
        });

        it('should set budtender system instructions', async () => {
            const result = await smokeyAgent.initialize(mockBrandMemory as any, createSmokeyMemory());

            expect(result.system_instructions).toContain('Budtender');
        });
    });

    describe('orient', () => {
        it('should return user_request when stimulus provided', async () => {
            const result = await smokeyAgent.orient(
                mockBrandMemory as any,
                createSmokeyMemory(),
                'Recommend a strain for sleep'
            );

            expect(result).toBe('user_request');
        });
    });
});

describe('Craig Agent (Marketer)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize with correct agent name', () => {
            expect(craigAgent.agentName).toBe('craig');
        });

        it('should set marketing system instructions', async () => {
            const mockCraigMemory: CraigMemory = {
                ...createMockAgentMemory(),
                campaigns: []
            };

            const result = await craigAgent.initialize(mockBrandMemory as any, mockCraigMemory);

            expect(result.system_instructions).toBeDefined();
        });
    });

    describe('orient', () => {
        it('should return user_request when stimulus provided', async () => {
            const mockCraigMemory: CraigMemory = {
                ...createMockAgentMemory(),
                campaigns: []
            };

            const result = await craigAgent.orient(
                mockBrandMemory as any,
                mockCraigMemory,
                'Create an email campaign'
            );

            expect(result).toBe('user_request');
        });
    });
});

describe('Mrs. Parker Agent (Hostess)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize with correct agent name', () => {
            expect(mrsParkerAgent.agentName).toBe('mrs_parker');
        });

        it('should set loyalty-focused system instructions', async () => {
            const mockMrsParkerMemory: MrsParkerMemory = {
                ...createMockAgentMemory(),
                segments: [],
                at_risk_customers: []
            };

            const result = await mrsParkerAgent.initialize(mockBrandMemory as any, mockMrsParkerMemory);

            expect(result.system_instructions).toBeDefined();
        });
    });

    describe('orient', () => {
        it('should return user_request when stimulus provided', async () => {
            const mockMrsParkerMemory: MrsParkerMemory = {
                ...createMockAgentMemory(),
                segments: [],
                at_risk_customers: []
            };

            const result = await mrsParkerAgent.orient(
                mockBrandMemory as any,
                mockMrsParkerMemory,
                'Who are our at-risk customers?'
            );

            expect(result).toBe('user_request');
        });
    });
});

describe('Day Day Agent (SEO)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize with correct agent name', () => {
            expect(dayday.agentName).toBe('day_day');
        });

        it('should set SEO-focused system instructions', async () => {
            const result = await dayday.initialize(mockBrandMemory as any, createMockAgentMemory());

            expect(result.system_instructions).toContain('SEO');
            expect(result.system_instructions).toContain('Growth');
        });
    });

    describe('orient', () => {
        it('should return user_request when stimulus provided', async () => {
            const result = await dayday.orient(
                mockBrandMemory as any,
                createMockAgentMemory(),
                'Audit our homepage for SEO'
            );

            expect(result).toBe('user_request');
        });

        it('should return null when no stimulus', async () => {
            const result = await dayday.orient(
                mockBrandMemory as any,
                createMockAgentMemory(),
                undefined
            );

            expect(result).toBeNull();
        });
    });

    describe('act', () => {
        const mockTools = {
            auditPage: jest.fn().mockResolvedValue({ score: 85 }),
            generateMetaTags: jest.fn().mockResolvedValue({ title: 'Test', description: 'Test desc' }),
            getSearchConsoleStats: jest.fn().mockResolvedValue({ clicks: 1000 }),
            getGA4Traffic: jest.fn().mockResolvedValue({ sessions: 5000 }),
            findSEOOpportunities: jest.fn().mockResolvedValue({ keywords: [] }),
            lettaSaveFact: jest.fn().mockResolvedValue({ success: true })
        };

        it('should handle SEO tasks', async () => {
            const result = await dayday.act(
                mockBrandMemory as any,
                createMockAgentMemory(),
                'user_request',
                mockTools as any,
                'What are our top performing pages?'
            );

            expect(result.logEntry.action).toBe('seo_task_complete');
        });

        it('should return idle when no target', async () => {
            const result = await dayday.act(
                mockBrandMemory as any,
                createMockAgentMemory(),
                null as any,
                mockTools as any,
                undefined
            );

            expect(result.logEntry.action).toBe('idle');
        });
    });
});

describe('Felisha Agent (Operations)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize with correct agent name', () => {
            expect(felisha.agentName).toBe('felisha');
        });

        it('should set operations-focused system instructions', async () => {
            const result = await felisha.initialize(mockBrandMemory as any, createMockAgentMemory());

            expect(result.system_instructions).toContain('Operations');
            expect(result.system_instructions).toContain('Triage');
        });
    });

    describe('act', () => {
        const mockTools = {
            processMeetingTranscript: jest.fn().mockResolvedValue({ notes: [], actionItems: [] }),
            triageError: jest.fn().mockResolvedValue({ severity: 'low', assignee: 'dev' })
        };

        it('should handle triage tasks', async () => {
            const result = await felisha.act(
                mockBrandMemory as any,
                createMockAgentMemory(),
                'user_request',
                mockTools as any,
                'Process this meeting transcript'
            );

            expect(result.logEntry.action).toBe('triage_complete');
        });
    });
});

describe('Big Worm Agent (Deep Research)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize with correct agent name', () => {
            expect(bigWormAgent.agentName).toBe('bigworm');
        });

        it('should set research-focused system instructions', async () => {
            const mockBigWormMemory = {
                ...createMockAgentMemory(),
                active_researches: []
            };

            const result = await bigWormAgent.initialize(mockBrandMemory as any, mockBigWormMemory as any);

            expect(result.system_instructions).toContain('Big Worm');
            expect(result.system_instructions).toContain('intelligence');
        });
    });

    describe('act', () => {
        const mockTools = {
            pythonAnalyze: jest.fn().mockResolvedValue({ result: 'analysis complete' }),
            saveFinding: jest.fn().mockResolvedValue({ success: true })
        };

        it('should handle research tasks', async () => {
            const mockBigWormMemory = {
                ...createMockAgentMemory(),
                active_researches: []
            };

            const result = await bigWormAgent.act(
                mockBrandMemory as any,
                mockBigWormMemory as any,
                'user_request',
                mockTools as any,
                'Analyze market trends for Detroit'
            );

            expect(result.logEntry.action).toBe('deep_research_complete');
        });
    });
});

describe('Money Mike Agent (CFO)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize with correct agent name', () => {
            expect(moneyMikeAgent.agentName).toBe('money_mike');
        });

        it('should set financial system instructions', async () => {
            const mockMoneyMikeMemory: MoneyMikeMemory = {
                ...createMockAgentMemory(),
                pricing_experiments: []
            };

            const result = await moneyMikeAgent.initialize(mockBrandMemory as any, mockMoneyMikeMemory);

            expect(result.system_instructions).toContain('Money Mike');
            expect(result.system_instructions).toContain('CFO');
        });
    });

    describe('orient', () => {
        it('should return user_request when stimulus provided', async () => {
            const mockMoneyMikeMemory: MoneyMikeMemory = {
                ...createMockAgentMemory(),
                pricing_experiments: []
            };

            const result = await moneyMikeAgent.orient(
                mockBrandMemory as any,
                mockMoneyMikeMemory,
                'What are our margins?'
            );

            expect(result).toBe('user_request');
        });

        it('should return experiment ID when running experiment exists', async () => {
            const mockMoneyMikeMemory: MoneyMikeMemory = {
                ...createMockAgentMemory(),
                pricing_experiments: [
                    { id: 'exp-123', status: 'running', sku_ids: ['sku1'] }
                ]
            };

            const result = await moneyMikeAgent.orient(
                mockBrandMemory as any,
                mockMoneyMikeMemory,
                undefined
            );

            expect(result).toBe('exp-123');
        });
    });
});

describe('Agent Integration Patterns', () => {
    it('all testable agents should implement AgentImplementation interface', () => {
        const agents = [
            smokeyAgent,
            craigAgent,
            mrsParkerAgent,
            dayday,
            felisha,
            bigWormAgent,
            moneyMikeAgent
        ];

        agents.forEach(agent => {
            expect(agent.agentName).toBeDefined();
            expect(typeof agent.initialize).toBe('function');
            expect(typeof agent.orient).toBe('function');
            expect(typeof agent.act).toBe('function');
        });
    });

    it('all agents should handle user_request target', async () => {
        const agents = [dayday, felisha];
        const mockTools = {};

        for (const agent of agents) {
            const memory = await agent.initialize(mockBrandMemory as any, createMockAgentMemory());
            const result = await agent.act(
                mockBrandMemory as any,
                memory,
                'user_request',
                mockTools as any,
                'Test query'
            );

            expect(result.logEntry).toBeDefined();
            expect(result.updatedMemory).toBeDefined();
        }
    });
});
