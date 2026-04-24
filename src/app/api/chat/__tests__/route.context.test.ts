const mockUsageIncrement = jest.fn();
const mockCreateChatSession = jest.fn();
const mockGetConversationContext = jest.fn();
const mockAddMessageToSession = jest.fn();
const mockRunConsumerAgent = jest.fn();
const mockValidateInput = jest.fn();
const mockGetRiskLevel = jest.fn();
const mockHasGroundTruth = jest.fn();
const mockGetChatbotUpsells = jest.fn();
const mockArchiveSlackResponse = jest.fn();

jest.mock('next/server', () => ({
  NextRequest: class {
    url: string;
    nextUrl: URL;
    method: string;

    constructor(url: string, options: { method?: string } = {}) {
      this.url = url;
      this.nextUrl = new URL(url);
      this.method = options.method ?? 'POST';
    }
  },
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      json: async () => body,
      status: init?.status ?? 200,
      ok: (init?.status ?? 200) < 400,
    }),
  },
}));

jest.mock('@/server/middleware/with-protection', () => ({
  withProtection: (handler: any) => handler,
}));

jest.mock('@/server/services/usage', () => ({
  UsageService: {
    increment: (...args: any[]) => mockUsageIncrement(...args),
  },
}));

jest.mock('@/lib/chat/session-manager', () => ({
  createChatSession: (...args: any[]) => mockCreateChatSession(...args),
  getConversationContext: (...args: any[]) => mockGetConversationContext(...args),
  addMessageToSession: (...args: any[]) => mockAddMessageToSession(...args),
}));

jest.mock('@/server/agents/adapters/consumer-adapter', () => ({
  runConsumerAgent: (...args: any[]) => mockRunConsumerAgent(...args),
}));

jest.mock('@/server/security', () => ({
  validateInput: (...args: any[]) => mockValidateInput(...args),
  getRiskLevel: (...args: any[]) => mockGetRiskLevel(...args),
}));

jest.mock('@/server/grounding', () => ({
  hasGroundTruth: (...args: any[]) => mockHasGroundTruth(...args),
}));

jest.mock('@/server/services/upsell-engine', () => ({
  getChatbotUpsells: (...args: any[]) => mockGetChatbotUpsells(...args),
}));

jest.mock('@/server/services/slack-response-archive', () => ({
  archiveSlackResponse: (...args: any[]) => mockArchiveSlackResponse(...args),
}));

import { POST } from '../route';
import { NextRequest } from 'next/server';

describe('Chat API Route Context Injection', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateChatSession.mockResolvedValue('test-session-id');
    mockGetConversationContext.mockResolvedValue([]);
    mockRunConsumerAgent.mockResolvedValue({
      message: 'Here are your products',
      products: [
        {
          id: 'prod-1',
          name: 'Injected Blue Dream',
          price: 50,
        },
      ],
      clientAction: { type: 'open_product', productId: 'prod-1' },
    });
    mockValidateInput.mockImplementation((query: string) => ({
      blocked: false,
      sanitized: query,
      riskScore: 0,
      flags: [],
    }));
    mockGetRiskLevel.mockReturnValue('low');
    mockHasGroundTruth.mockReturnValue(false);
    mockGetChatbotUpsells.mockResolvedValue({ suggestions: [] });
    mockArchiveSlackResponse.mockResolvedValue(undefined);
  });

  it('passes injected products and pending product context to the consumer agent', async () => {
    const injectedProducts = [
      {
        id: 'prod-1',
        name: 'Injected Blue Dream',
        category: 'Flower',
        price: 50,
        imageUrl: 'http://test.com/image.jpg',
        description: 'Injected description',
        thcPercent: 25,
        cbdPercent: 0,
        url: 'http://test.com/prod-1',
      },
    ];

    const data = {
      query: 'Show me Blue Dream',
      userId: 'test-user',
      sessionId: 'existing-session',
      brandId: 'brand_123',
      state: 'Illinois',
      products: injectedProducts,
      pendingProductId: 'prod-1',
    };
    const req = new NextRequest('http://localhost:3000/api/chat');

    const res = await POST(req as any, data);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.products).toEqual([
      {
        id: 'prod-1',
        name: 'Injected Blue Dream',
        price: 50,
      },
    ]);
    expect(json.clientAction).toEqual({ type: 'open_product', productId: 'prod-1' });
    expect(mockRunConsumerAgent).toHaveBeenCalledWith('Show me Blue Dream', {
      userId: 'test-user',
      sessionId: 'existing-session',
      brandId: 'brand_123',
      state: 'Illinois',
      products: injectedProducts,
      conversationHistory: [],
      pendingProductId: 'prod-1',
    });
  });

  it('uses default brand and state values for anonymous requests', async () => {
    const data = {
      query: 'Show me Blue Dream',
      products: [],
    };
    const req = new NextRequest('http://localhost:3000/api/chat');

    await POST(req as any, data);

    expect(mockCreateChatSession).not.toHaveBeenCalled();
    expect(mockUsageIncrement).not.toHaveBeenCalled();
    expect(mockAddMessageToSession).not.toHaveBeenCalled();
    expect(mockRunConsumerAgent).toHaveBeenCalledWith('Show me Blue Dream', {
      userId: undefined,
      sessionId: undefined,
      brandId: '10982',
      state: 'Illinois',
      products: [],
      conversationHistory: [],
      pendingProductId: undefined,
    });
  });
});
