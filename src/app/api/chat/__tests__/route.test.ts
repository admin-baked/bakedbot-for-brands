
// Mock next/server BEFORE importing route
jest.mock('next/server', () => {
  return {
    NextRequest: class {
      url: string;
      constructor(url: string, options: any = {}) {
        this.url = url;
        (this as any).json = async () => options; // Simplified: treat options as the parsed body for this mock
      }
    },
    NextResponse: {
      json: (body: any, init?: any) => ({
        json: async () => body,
        status: init?.status || 200,
        ok: true // simplified
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
    searchType: 'general',
    searchQuery: 'test query',
    intent: 'informational',
    filters: {},
  }),
  generateChatResponse: jest.fn().mockResolvedValue({
    message: 'Test AI response',
    shouldShowProducts: false,
  }),
}));

// Mock CannMenusService to avoid firebase-admin issues
jest.mock('@/server/services/cannmenus', () => ({
  CannMenusService: class {
    searchProducts() {
      return Promise.resolve({ products: [] });
    }
  }
}));

// Mock chemotype ranking
jest.mock('@/ai/chemotype-ranking', () => ({
  enrichProductsWithChemotypes: (p: any) => p,
  rankByChemotype: (p: any) => p,
}));

describe('Chat API Route (Demo Mode)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle "How does BakedBot work?" query', async () => {
        const data = {
            query: 'How does BakedBot work?',
            userId: 'test-user',
        };
        // Pass data directly as the "options" which my mock treats as the parsed body
        const req = new NextRequest('http://localhost:3000/api/chat', data as any);

        const res = await POST(req, data); 
        const json = await res.json();

        expect(json.ok).toBe(true);
        expect(json.message).toContain("Agentic Commerce OS");
        expect(json.message).toContain("Smokey");
        expect(json.message).toContain("Craig");
    });

    it('should handle "pricing" query', async () => {
        const data = {
            query: 'Explain the pricing model',
            userId: 'test-user',
        };
        const req = new NextRequest('http://localhost:3000/api/chat', data as any);

        const res = await POST(req, data);
        const json = await res.json();

        expect(json.ok).toBe(true);
        expect(json.message).toContain("Starter");
        expect(json.message).toContain("Growth");
        expect(json.message).toContain("Scale");
    });

    it('should fall through to standard processing for other queries', async () => {
         const data = {
            query: 'Find me some weed',
            userId: 'test-user',
        };
        const req = new NextRequest('http://localhost:3000/api/chat', data as any);

        // We expect the mock generateChatResponse to be called
        const res = await POST(req, data);
        const json = await res.json();

        expect(json.ok).toBe(true);
        expect(json.message).toBe('Test AI response');
    });
});
