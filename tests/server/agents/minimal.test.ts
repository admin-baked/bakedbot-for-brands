
import { describe, it, expect, jest } from '@jest/globals';

// MOCKS
jest.mock('yaml', () => ({ parse: jest.fn(), stringify: jest.fn() }));
jest.mock('@mendable/firecrawl-js', () => ({ default: class FirecrawlApp { scrapeUrl = jest.fn(); crawlUrl = jest.fn(); } }));
jest.mock('@/ai/genkit', () => ({ ai: { generate: jest.fn().mockResolvedValue({ text: 'Mock' }) } }));
jest.mock('@/server/agents/deebo', () => ({ deebo: { checkContent: jest.fn(), checkAge: jest.fn() }, deeboCheckAge: jest.fn() }));
jest.mock('@/lib/notifications/blackleaf-service', () => ({ blackleafService: { sendCustomMessage: jest.fn() } }));
jest.mock('@/server/services/cannmenus', () => ({ CannMenusService: class MockCannMenus { searchProducts = jest.fn() } }));
jest.mock('@/server/tools/web-search', () => ({ searchWeb: jest.fn(), formatSearchResults: jest.fn() }));
jest.mock('@genkit-ai/googleai', () => ({ gemini15Flash: 'gemini-1.5-flash' }));
jest.mock('@genkit-ai/ai', () => ({ generate: jest.fn() }));
jest.mock('@genkit-ai/core', () => ({ defineFlow: jest.fn(c => c), runFlow: jest.fn() }));
jest.mock('@/app/dashboard/ceo/agents/actions', () => ({ runAgentChat: jest.fn() }));
jest.mock('@/server/services/letta/client', () => ({ lettaClient: { upsertMemory: jest.fn() } }));

// Import
import { defaultExecutiveTools } from '@/app/dashboard/ceo/agents/default-tools';

describe('Minimal Test with Import', () => {
    it('imports successfully', () => {
        expect(defaultExecutiveTools).toBeDefined();
    });
});
