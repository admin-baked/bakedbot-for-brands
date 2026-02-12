
import { craigAgent, CraigTools } from '../../../src/server/agents/craig';
import { BrandDomainMemory, CraigMemory } from '../../../src/server/agents/schemas';
import { AgentImplementation } from '../../../src/server/agents/harness';
import { logger } from '../../../src/lib/logger';

// Mock dependencies
jest.mock('../../../src/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../../../src/ai/genkit', () => ({
    ai: {
        generate: jest.fn(),
    },
}));

// Mock the harness import for runMultiStepTask
jest.mock('../../../src/server/agents/harness', () => ({
    runMultiStepTask: jest.fn().mockResolvedValue({
        finalResult: 'Mocked Result',
        steps: [],
    }),
}));

// Mock Letta block manager
jest.mock('../../../src/server/services/letta/block-manager', () => ({
    lettaBlockManager: {
        attachBlocksForRole: jest.fn().mockResolvedValue(undefined),
    },
}));

// Mock role ground truth loader
jest.mock('../../../src/server/grounding/role-loader', () => ({
    loadRoleGroundTruth: jest.fn().mockResolvedValue(null),
    buildRoleSystemPrompt: jest.fn().mockReturnValue(''),
}));

describe('Craig Agent (Marketer)', () => {
    let mockBrandMemory: BrandDomainMemory;
    let mockAgentMemory: CraigMemory;
    let mockTools: CraigTools;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBrandMemory = {
            brand_profile: { name: 'Test Brand' },
            priority_objectives: [
                { id: 'obj-1', description: 'Grow Revenue', status: 'active', owner: 'craig' },
                { id: 'obj-2', description: 'Brand Awareness', status: 'achieved', owner: 'craig' }
            ],
            constraints: { jurisdictions: ['CA'] },
            segments: [],
            experiments_index: [],
            playbooks: {}
        } as unknown as BrandDomainMemory;

        mockAgentMemory = {
            campaigns: [
                {
                    id: 'camp-1',
                    objective_id: 'obj-1', // Active objective
                    status: 'queued',
                    audience_segment: 'seg-1',
                    objective: 'Grow Revenue',
                    kpi: { metric: 'roi', target: 2, current: 0, test_window_days: 7 },
                    constraints: { jurisdictions: ['CA'], channels: ['email'], requires_deebo_check: true },
                    variants: []
                },
                {
                    id: 'camp-2',
                    objective_id: 'obj-2', // Achieved objective
                    status: 'running',
                    audience_segment: 'seg-2',
                    objective: 'Brand Awareness',
                    kpi: { metric: 'impressions', target: 1000, current: 500, test_window_days: 7 },
                    constraints: { jurisdictions: ['CA'], channels: ['social'], requires_deebo_check: false },
                    variants: []
                }
            ]
        } as unknown as CraigMemory;

        mockTools = {
            generateCopy: jest.fn(),
            validateCompliance: jest.fn(),
            sendSms: jest.fn(),
            getCampaignMetrics: jest.fn(),
            crmListUsers: jest.fn(),
            lettaUpdateCoreMemory: jest.fn(),
        };
    });

    describe('initialize', () => {
        it('should set system instructions', async () => {
            const result = await craigAgent.initialize(mockBrandMemory, mockAgentMemory);
            expect(result.system_instructions).toContain('You are Craig');
        });

        it('should pause campaigns if their objective is achieved', async () => {
            await craigAgent.initialize(mockBrandMemory, mockAgentMemory);

            // camp-2 should be completed because obj-2 is achieved
            const camp2 = mockAgentMemory.campaigns.find(c => c.id === 'camp-2');
            expect(camp2?.status).toBe('completed');
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Pausing campaign camp-2'));
        });

        it('should use BakedBot Mail branding in system instructions', async () => {
            const result = await craigAgent.initialize(mockBrandMemory, mockAgentMemory);
            const instructions = result.system_instructions as string;

            // Should contain BakedBot Mail
            expect(instructions).toContain('BakedBot Mail');

            // Should NOT contain Mailjet
            expect(instructions).not.toContain('Mailjet');
        });

        it('should use BakedBot SMS branding in system instructions', async () => {
            const result = await craigAgent.initialize(mockBrandMemory, mockAgentMemory);
            const instructions = result.system_instructions as string;

            // Should contain BakedBot SMS
            expect(instructions).toContain('BakedBot SMS');

            // Should NOT contain Blackleaf
            expect(instructions).not.toContain('Blackleaf');
        });

        it('should include white-label branding in tool instructions', async () => {
            const result = await craigAgent.initialize(mockBrandMemory, mockAgentMemory);
            const instructions = result.system_instructions as string;

            // Should describe triggering via BakedBot platforms
            expect(instructions).toMatch(/BakedBot Mail.*email/i);
            expect(instructions).toMatch(/BakedBot SMS.*text/i);
        });
    });

    describe('orient', () => {
        it('should prioritize user_request if stimulus is a string', async () => {
            const target = await craigAgent.orient(mockBrandMemory, mockAgentMemory, 'Help me write an email');
            expect(target).toBe('user_request');
        });

        it('should select a queued campaign if no user request', async () => {
            const target = await craigAgent.orient(mockBrandMemory, mockAgentMemory);
            expect(target).toBe('camp-1'); // camp-1 is queued and objective is active
        });

        it('should return null if no campaigns need attention', async () => {
             // Set all campaigns to completed
            mockAgentMemory.campaigns.forEach(c => c.status = 'completed');
            const target = await craigAgent.orient(mockBrandMemory, mockAgentMemory);
            expect(target).toBeNull();
        });
    });

    describe('act', () => {
        it('should handle user_request using runMultiStepTask', async () => {
            const result = await craigAgent.act(mockBrandMemory, mockAgentMemory, 'user_request', mockTools, 'Draft copy');
            
            expect(result.logEntry.action).toBe('campaign_task_complete');
            expect(result.logEntry.result).toBe('Mocked Result');
        });

        it('should handle autonomous campaign update (queued -> running)', async () => {
            // Target camp-1 (queued)
            const result = await craigAgent.act(mockBrandMemory, mockAgentMemory, 'camp-1', mockTools);
            
            const camp1 = result.updatedMemory.campaigns.find(c => c.id === 'camp-1');
            expect(camp1?.status).toBe('running');
            expect(result.logEntry.action).toBe('campaign_update');
        });

        it('should return no_action if target campaign not found', async () => {
             const result = await craigAgent.act(mockBrandMemory, mockAgentMemory, 'missing-id', mockTools);
             expect(result.logEntry.action).toBe('no_action');
        });
    });
});
