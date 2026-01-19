
// Mock next/server BEFORE importing route
jest.mock('next/server', () => {
  return {
    NextRequest: class {
      url: string;
      constructor(url: string, options: any = {}) {
        this.url = url;
        (this as any).json = async () => options;
      }
    },
    NextResponse: {
      json: (body: any, init?: any) => ({
        json: async () => body,
        status: init?.status || 200,
        ok: true
      })
    }
  };
});

import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/server/middleware/with-protection', () => ({
  withProtection: (handler: any) => handler,
}));

jest.mock('@/server/services/usage', () => ({
  UsageService: {
    increment: jest.fn(),
  },
}));

jest.mock('@/lib/chat/session-manager', () => ({
  createChatSession: jest.fn().mockResolvedValue('test-session-id'),
  getConversationContext: jest.fn().mockResolvedValue([]),
  addMessageToSession: jest.fn(),
}));

jest.mock('@/ai/chat-query-handler', () => ({
  analyzeQuery: jest.fn().mockResolvedValue({
    searchType: 'products',
    searchQuery: 'test query',
    intent: 'buy',
    filters: {},
  }),
  generateChatResponse: jest.fn().mockResolvedValue({
    message: 'Here are your products',
    shouldShowProducts: true,
  }),
}));

// Mock CannMenusService
const mockSearchProducts = jest.fn().mockResolvedValue({ products: [] });
jest.mock('@/server/services/cannmenus', () => ({
  CannMenusService: class {
    searchProducts = mockSearchProducts;
  }
}));

// Mock chemotype ranking
jest.mock('@/ai/chemotype-ranking', () => ({
  enrichProductsWithChemotypes: (p: any) => p,
  rankByChemotype: (p: any) => p,
}));

describe('Chat API Route (Context Injection)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should use injected products when provided', async () => {
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
                url: 'http://test.com/prod-1'
            }
        ];

        const data = {
            query: 'Show me Blue Dream',
            userId: 'test-user',
            products: injectedProducts // Inject context
        };
        const req = new NextRequest('http://localhost:3000/api/chat', data as any);

        const res = await POST(req, data); 
        const json = await res.json();

        expect(json.ok).toBe(true);
        expect(json.products).toHaveLength(1);
        expect(json.products[0].name).toBe('Injected Blue Dream');
        expect(json.products[0].price).toBe(50); // Mapped correctly
        expect(json.products[0].description).toBe('Injected description'); 

        // Verify CannMenus was NOT called
        expect(mockSearchProducts).not.toHaveBeenCalled();
    });

    it('should fallback to CannMenus when no injected products provided', async () => {
        const data = {
            query: 'Show me Blue Dream',
            userId: 'test-user',
            // products: [] or undefined
        };
        const req = new NextRequest('http://localhost:3000/api/chat', data as any);

        await POST(req, data); 

        // Verify CannMenus WAS called
        expect(mockSearchProducts).toHaveBeenCalled();
    });
});
