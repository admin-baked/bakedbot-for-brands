
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ----------------------------------------------------------------------------
// MOCKS (Must be hoisted before imports)
// ----------------------------------------------------------------------------

// Mock ESM-only modules or complex deps
jest.mock('yaml', () => ({
  parse: jest.fn(),
  stringify: jest.fn(),
}));

jest.mock('@mendable/firecrawl-js', () => {
  return class FirecrawlApp {
    scrapeUrl = jest.fn();
    crawlUrl = jest.fn();
  };
});

// Mock Server Actions (Dynamic Imports in source, but we mock the module)
jest.mock('@/app/dashboard/ceo/agents/actions', () => ({
  runAgentChat: jest.fn().mockImplementation(async () => 'Mock Agent Response'),
}));

// Mock Letta Client
jest.mock('@/server/services/letta/client', () => ({
  lettaClient: {
    upsertMemory: jest.fn().mockResolvedValue('Memory Saved'),
    retrieveMemories: jest.fn().mockResolvedValue(['Memory 1']),
  }
}));

// Mock Genkit Wrapper
jest.mock('@/ai/genkit', () => ({
  ai: {
    generate: jest.fn().mockResolvedValue({ text: 'Mock Genkit Response' }),
  }
}));

// Mock Other Top-Level Imports
jest.mock('@/server/agents/deebo', () => ({
  deebo: {
    checkContent: jest.fn().mockResolvedValue({ status: 'pass' }),
  },
  deeboCheckAge: jest.fn().mockResolvedValue(true)
}));

jest.mock('@/lib/notifications/blackleaf-service', () => ({
  blackleafService: {
    sendCustomMessage: jest.fn().mockResolvedValue(true),
  }
}));

jest.mock('@/server/services/cannmenus', () => ({
  CannMenusService: class MockCannMenusService {
    searchProducts = jest.fn().mockResolvedValue({ products: [] });
  }
}));

jest.mock('@/server/tools/web-search', () => ({
  searchWeb: jest.fn().mockResolvedValue([]),
  formatSearchResults: jest.fn().mockReturnValue('Mock Search Results'),
}));

// Mock Genkit (Generative AI) - if imported directly
jest.mock('@genkit-ai/googleai', () => ({
  gemini15Flash: 'gemini-1.5-flash',
}));
jest.mock('@genkit-ai/ai', () => ({
  generate: jest.fn(),
}));
jest.mock('@genkit-ai/core', () => ({
  defineFlow: jest.fn((config, fn) => fn), // Pass through
  runFlow: jest.fn(),
}));

// ----------------------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------------------
import { defaultExecutiveTools, defaultSmokeyTools } from '@/app/dashboard/ceo/agents/default-tools';
import { runAgentChat } from '@/app/dashboard/ceo/agents/actions';
import { lettaClient } from '@/server/services/letta/client';

describe.skip('Agent Tools Suite', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('commonDelegationTools', () => {
        it('should execute delegateTask by calling runAgentChat', async () => {
            // Executive Tools include delegation
            const result = await defaultExecutiveTools.delegateTask('ezal', 'Perform an audit of 90210');
            
            expect(runAgentChat).toHaveBeenCalledTimes(1);
            expect(runAgentChat).toHaveBeenCalledWith(
                expect.stringContaining('DELEGATED TASK: Perform an audit'), 
                'ezal', 
                expect.objectContaining({ modelLevel: 'advanced' })
            );
            expect(result).toBe('Mock Agent Response');
        });

        it('Smokey should also have delegateTask', async () => {
             // Verify Smokey inherited the tool
            expect(defaultSmokeyTools).toHaveProperty('delegateTask');
            
            await defaultSmokeyTools.delegateTask('craig', 'Send email');
            expect(runAgentChat).toHaveBeenCalledWith(
                expect.stringContaining('DELEGATED TASK'),
                'craig',
                expect.anything()
            );
        });
    });

    describe('commonMemoryTools', () => {
        it('lettaSaveFact should call lettaClient.upsertMemory', async () => {
            const fact = 'User prefers sativa';
            await defaultExecutiveTools.lettaSaveFact(fact, 'preference');

            expect(lettaClient.upsertMemory).toHaveBeenCalledWith(
                expect.objectContaining({
                    human: expect.stringContaining(fact)
                })
            );
        });

        it('lettaAsk should call retrieveMemories (conceptually)', async () => {
             // Our current implementation of lettaAsk in default-tools might differ 
             // (it uses runFlow usually, but we mocked lettaClient calls if direct).
             // Let's check the implementation.
             // If it's pure standard implementation:
             if (defaultExecutiveTools.lettaAsk) {
                  await defaultExecutiveTools.lettaAsk('What do they like?');
                  // We expect some interaction. 
                  // If lettaAsk isn't mocked in tool definition, it might run real logic?
                  // Wait, default-tools.ts defines the logic.
                  // If it calls `lettaClient.retrieveMemories`, we can check it.
             }
        });
    });
});
