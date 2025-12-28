
// Polyfill standard Web APIs for Next.js in Node environment
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

// Mocks must be defined before imports
jest.mock('next/server', () => ({
    NextRequest: jest.fn().mockImplementation((url, init) => {
        // Use our polyfilled Request or simple object
        return {
            url,
            json: async () => init ? JSON.parse(init.body) : {}
        };
    }),
    NextResponse: {
        json: jest.fn().mockImplementation((data, init) => ({
            json: async () => data,
            status: init?.status || 200,
            ...data
        }))
    }
}));

import { POST } from '../route';

// Mocks
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

const { analyzeQuery } = require('@/ai/chat-query-handler');

describe('Unified Demo API', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('routes "create an image" to Craig (Marketing) and returns media', async () => {
        // Mock analysis to return marketing/create
        analyzeQuery.mockResolvedValue({
            searchType: 'marketing',
            marketingParams: { action: 'create_campaign' }
        });

        // Our route reads await request.json()
        const req = {
            json: async () => ({ prompt: 'Create an image of a cloud', agent: 'hq' })
        } as any;

        const res = await POST(req);
        // With our mock, NextResponse.json returns the data object directly merged or accessible
        // Let's assume our mock returns { ...data } or we inspect calls.
        
        // Actually, let's check how POST is called. It uses NextRequest.
        // But we passed a plain object above which works because we mocked next/server but 
        // the POST function expects the request object to have .json().
        
        // Wait, if I mocked NextRequest in the import, but POST takes `request: NextRequest`, 
        // at runtime in the test, `request` is whatever I pass to POST.
        // So passing `{ json: ... }` is correct for the argument.
        
        // However, the return value of POST is `NextResponse.json(...)`.
        // Our mock of NextResponse.json returns the object.
        const data = res; // based on our simple mock structure above

        expect(data.agent).toBe('craig'); 
        expect(data.generatedMedia).toBeDefined();
        expect(data.generatedMedia.type).toBe('image');
        expect(data.items[0].meta).toContain('BakedBot Content AI');
    });

    it('routes "competitor analysis" to Ezal', async () => {
        analyzeQuery.mockResolvedValue({
            searchType: 'competitive',
            competitiveParams: { action: 'track_competitor' }
        });

        const req = {
            json: async () => ({ prompt: 'Track Green Leaf', agent: 'hq' })
        } as any;

        const res = await POST(req);
        
        expect(res.agent).toBe('ezal');
        expect(res.items[0].title).toContain('Competitor');
    });

    it('defaults to Smokey for generic queries', async () => {
        analyzeQuery.mockResolvedValue({
            searchType: 'semantic' 
        });

        const req = {
            json: async () => ({ prompt: 'I want to relax', agent: 'hq' })
        } as any;

        const res = await POST(req);

        expect(res.agent).toBe('smokey');
    });
});
