import { runConsumerAgent } from '@/server/agents/adapters/consumer-adapter';
import { runAgentCore } from '@/server/agents/agent-runner';

const mockUpdateStreakAction = jest.fn().mockResolvedValue(undefined);

jest.mock('@/server/agents/agent-runner', () => ({
  runAgentCore: jest.fn(),
}));

jest.mock('@/app/actions/gamification', () => ({
  updateStreakAction: mockUpdateStreakAction,
}));

describe('runConsumerAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes searchMenu tool results into chatbot products', async () => {
    (runAgentCore as jest.Mock).mockResolvedValue({
      content: 'Here are some good options.',
      toolCalls: [
        {
          name: 'searchMenu',
          status: 'success',
          result: {
            products: [
              {
                id: 'prod-1',
                name: 'Blue Dream',
                category: 'Flower',
                price: 35,
                imageUrl: '',
                description: 'Relaxing classic',
                thc: 24,
                url: 'https://example.com/products/blue-dream',
              },
            ],
          },
        },
      ],
    });

    const result = await runConsumerAgent('show me flower', {
      brandId: 'brand-1',
      state: 'NY',
    });

    expect(result.message).toBe('Here are some good options.');
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      id: 'prod-1',
      name: 'Blue Dream',
      category: 'Flower',
      imageUrl: '/icon-192.png',
      description: 'Relaxing classic',
      url: 'https://example.com/products/blue-dream',
    });
    expect(mockUpdateStreakAction).toHaveBeenCalled();
  });

  it('maps rankProductsForSegment ids back to current menu context', async () => {
    (runAgentCore as jest.Mock).mockResolvedValue({
      content: 'These should match your vibe.',
      toolCalls: [
        {
          name: 'rankProductsForSegment',
          status: 'success',
          result: JSON.stringify(['prod-ctx']),
        },
      ],
    });

    const result = await runConsumerAgent('I want something social', {
      brandId: 'brand-1',
      state: 'NY',
      products: [
        {
          id: 'prod-ctx',
          name: 'Night Gummies',
          category: 'Edibles',
          price: 25,
          imageUrl: '',
          imageHint: '',
          description: 'Berry gummies',
          brandId: 'brand-1',
        },
      ],
    });

    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      id: 'prod-ctx',
      name: 'Night Gummies',
      category: 'Edibles',
      imageUrl: '/icon-192.png',
      reasoning: 'Picked for your stated preferences.',
    });
  });
});
