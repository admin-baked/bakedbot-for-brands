
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


jest.mock('@/server/repos/talkTrackRepo', () => ({
    findTalkTrackByTrigger: jest.fn().mockImplementation(async (prompt) => {
        if (prompt.includes('monitor competitor') || prompt.includes('price drop')) {
            return {
                id: 'dispensary-deal-scout',
                steps: [{
                    id: 'step-deal-hunt',
                    type: 'response',
                    message: "I've completed the Daily Deal Hunt",
                    thought: 'Simulated thought'
                }]
            };
        }
        if (prompt.includes('ezal') || prompt.includes('competitor') && !prompt.includes('monitor')) {
            return {
                id: 'ezal-competitive-intelligence',
                steps: [{
                    id: 'step-multi-vertical-research',
                    type: 'response',
                    message: 'Ezal Competitive Engine Initialized',
                    thought: 'Simulated thought'
                }]
            };
        }
         if (prompt.includes('investor demo')) {
            return {
                 id: 'ezal-competitive-intelligence',
                steps: [{
                    id: 'step-investor-demo',
                    type: 'response',
                    message: 'Investor Demo Mode Active',
                    thought: 'Simulated thought'
                }]
            };
        }
        if (prompt.includes('competitor intel')) {
            return {
                id: 'smokey-competitive-outreach',
                steps: [{
                    id: 'step-lead-source',
                    type: 'response',
                    message: 'found your lead sources',
                    thought: 'Simulated thought'
                }]
            };
        }
        if (prompt.includes('media outreach') || prompt.includes('find podcasts')) {
             return {
                id: 'media-outreach-automation',
                steps: [{
                    id: 'step-media-research',
                    type: 'response',
                    message: 'Daily Lead Research (25/25)',
                    thought: 'Simulated thought'
                }]
            };
        }
        return null; // Return null for other cases to allow normal flow
    })
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

    it('intercepts "ezal research" triggers and returns the Ezal Talk Track', async () => {
        analyzeQuery.mockResolvedValue({ searchType: 'general' });
        const req = {
            json: async () => ({ prompt: 'Start ezal research on competitors', agent: 'hq' })
        } as any;

        const res = await POST(req);
        // Expecting 'step-multi-vertical-research' or similar from Ezal track
        expect(res.id).toBeDefined();
        // The id returned is the step id, which we defined as 'step-multi-vertical-research' in talkTrackRepo.ts
        expect(res.id).toBe('step-multi-vertical-research');
        expect(res.message).toContain('Ezal Competitive Engine');
    });

    it('intercepts "investor demo" trigger for Ezal Investor mode', async () => {
        analyzeQuery.mockResolvedValue({ searchType: 'general' });
        const req = {
            json: async () => ({ prompt: 'show me an investor demo', agent: 'hq' })
        } as any;

        const res = await POST(req);
        
        expect(res.id).toBe('step-investor-demo');
        expect(res.message).toContain('Investor Demo Mode Active');
    });

    it('intercepts "competitor intel" for Smokey Lead Gen', async () => {
         analyzeQuery.mockResolvedValue({ searchType: 'general' });
         const req = {
             json: async () => ({ prompt: 'get me some competitor intel', agent: 'hq' })
         } as any;
 
         const res = await POST(req);
         // Expecting 'step-lead-source' from Smokey track (first step)
         // Wait, 'competitor intel' triggers 'smokey-competitive-outreach' track.
         // First step in that track is 'step-lead-source'
         expect(res.id).toBe('step-lead-source');
         expect(res.message).toContain('found your lead sources');
    });
    it('intercepts "media outreach" trigger for Media Automation track', async () => {
         analyzeQuery.mockResolvedValue({ searchType: 'general' });
         const req = {
             json: async () => ({ prompt: 'start media outreach', agent: 'hq' })
         } as any;
 
         const res = await POST(req);
         // Expecting 'step-media-research'
         expect(res.id).toBe('step-media-research');
         expect(res.message).toContain('Daily Lead Research');
    });
    it('intercepts "monitor competitor pricing" trigger for Deal Scout track', async () => {
         analyzeQuery.mockResolvedValue({ searchType: 'competitive' });
         const req = {
             json: async () => ({ prompt: 'Monitor competitor pricing and alert me when any competitor drops their prices more than 10%', agent: 'hq' })
         } as any;
 
         const res = await POST(req);
         // Expecting 'step-deal-hunt'
         expect(res.id).toBe('step-deal-hunt');
         expect(res.message).toContain('Daily Deal Hunt');
    });


});
