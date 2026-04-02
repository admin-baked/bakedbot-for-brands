jest.mock('@/server/agents/agent-runner', () => ({
    runAgentCore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('@/app/actions/gamification', () => ({
    updateStreakAction: jest.fn().mockResolvedValue(undefined),
}));

import { runAgentCore } from '@/server/agents/agent-runner';
import { runConsumerAgent } from '../consumer-adapter';

const mockRunAgentCore = runAgentCore as jest.MockedFunction<typeof runAgentCore>;

describe('consumer adapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('answers age requirement questions without invoking the agent runtime', async () => {
        const result = await runConsumerAgent('Are you 18+ or 21+?', {
            brandId: '10982',
            state: 'New York',
            products: [],
        });

        expect(result).toEqual({
            message: '21+ only. New York requires a valid ID.',
            products: [],
            clientAction: undefined,
        });
        expect(mockRunAgentCore).not.toHaveBeenCalled();
    });

    it('falls back to deterministic menu search when the agent returns no products', async () => {
        mockRunAgentCore.mockResolvedValue({
            content: "I couldn't find any products matching that description.",
            toolCalls: [],
        } as any);

        const result = await runConsumerAgent('Do you have any edibles?', {
            brandId: '10982',
            state: 'New York',
            products: [
                {
                    id: 'prod-edible-1',
                    name: 'Midnight Gummies',
                    category: 'Edibles',
                    price: 18,
                    description: 'CBN gummies for nighttime and sleep support.',
                    stock: 10,
                },
                {
                    id: 'prod-flower-1',
                    name: 'Blue Dream',
                    category: 'Flower',
                    price: 35,
                    description: 'Balanced daytime hybrid flower.',
                    stock: 10,
                },
            ],
        });

        expect(result.products).toHaveLength(1);
        expect(result.products[0]?.name).toBe('Midnight Gummies');
        expect(result.message.toLowerCase()).toContain('edible');
    });
});
