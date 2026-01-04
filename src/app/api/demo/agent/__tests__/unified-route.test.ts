
// Polyfills
if (!global.Request) {
    global.Request = class Request {
        public url: string;
        public body: any;
        constructor(input: string | Request, init?: any) {
            this.url = typeof input === 'string' ? input : input.url;
            this.body = init?.body;
        }
        async json() { return JSON.parse(this.body); }
    } as any;
}
if (!global.Response) {
    global.Response = class Response {
        constructor(body?: any, init?: any) {}
    } as any;
}

// Mocks
jest.mock('next/server', () => ({
    NextRequest: jest.fn().mockImplementation((url, init) => ({
        url,
        json: async () => init ? JSON.parse(init.body) : {}
    })),
    NextResponse: {
        json: jest.fn().mockImplementation((data, init) => ({
            json: async () => data,
            status: init?.status || 200,
            ...data
        }))
    }
}));

jest.mock('@/ai/chat-query-handler', () => ({
  analyzeQuery: jest.fn(),
  QueryAnalysisSchema: {}
}));

jest.mock('@/ai/flows/generate-social-image', () => ({
  generateImageFromPrompt: jest.fn().mockResolvedValue('http://mock.url/image.png')
}));

jest.mock('@/ai/flows/generate-video', () => ({
  generateVideoFromPrompt: jest.fn().mockResolvedValue('http://mock.url/video.mp4')
}));

// Mock Email and SMS services
jest.mock('@/lib/notifications/blackleaf-service', () => ({
    blackleafService: {
        sendCustomMessage: jest.fn().mockResolvedValue(true)
    }
}));

jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn().mockResolvedValue({ success: true })
}));

import { POST } from '../route';
const { analyzeQuery } = require('@/ai/chat-query-handler');
const { blackleafService } = require('@/lib/notifications/blackleaf-service');
const { sendGenericEmail } = require('@/lib/email/dispatcher');

describe('Unified Demo API - New Features', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('routes "pricing model" queries to Money Mike', async () => {
        analyzeQuery.mockResolvedValue({ searchType: 'general' });
        const req = {
            json: async () => ({ prompt: 'Explain the pricing model', agent: 'hq' })
        } as any;

        const res = await POST(req);
        // Expect Moneymike
        expect(res.agent).toBe('moneymike');
        expect(res.items).toBeDefined();
        expect(res.items.length).toBeGreaterThan(0);
        expect(res.items[0].title).toBe('National Discovery Pricing');
    });

    it('prioritizes image generation when "image" is in the prompt', async () => {
        analyzeQuery.mockResolvedValue({
            searchType: 'marketing',
            marketingParams: { action: 'create_video' } 
        });
        const req = {
            json: async () => ({ prompt: 'Create an image of a dispensary', agent: 'hq' })
        } as any;

        const res = await POST(req);
        // Expect Image, not Video
        expect(res.generatedMedia).toBeDefined();
        expect(res.generatedMedia.type).toBe('image');
        expect(res.generatedMedia.url).toBe('http://mock.url/image.png');
    });

    it('detects email in prompt and triggers EmailDispatcher', async () => {
        analyzeQuery.mockResolvedValue({ searchType: 'general' });
        const req = {
            json: async () => ({ prompt: 'Send report to test@example.com please', agent: 'ezal' })
        } as any;

        const res = await POST(req);

        // Verify Email Sent
        expect(sendGenericEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'test@example.com',
            subject: expect.stringContaining('Market Scout Report')
        }));

        // Verify special response
        expect(res.items[0].title).toContain('Report Sent');
        expect(res.items[0].description).toContain('test@example.com');
    });

    it('detects phone number in prompt and triggers BlackleafService', async () => {
        analyzeQuery.mockResolvedValue({ searchType: 'general' });
        const req = {
            json: async () => ({ prompt: 'Alert me at 555-123-4567 regarding compliance', agent: 'deebo' })
        } as any;

        const res = await POST(req);

        // Verify SMS Sent
        expect(blackleafService.sendCustomMessage).toHaveBeenCalledWith(
            expect.stringContaining('555-123-4567'),
            expect.stringContaining('BakedBot Alert')
        );

        // Verify special response
        expect(res.items[0].title).toContain('Alert Sent');
        expect(res.items[0].description).toContain('555-123-4567');
    });
});
