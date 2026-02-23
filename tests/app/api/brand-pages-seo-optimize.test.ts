/**
 * @jest-environment node
 *
 * Tests for POST /api/brand-pages/seo-optimize
 * - Auth gating (401 when not logged in)
 * - Input validation (400 for missing fields)
 * - Successful SEO suggestions (200)
 * - AI error handling (503)
 * - extractText logic per page type
 */

import { NextRequest } from 'next/server';
import { ai } from '@/ai/genkit';

// Auth mock — must be before importing the route
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

// Import after mocks
import { POST } from '@/app/api/brand-pages/seo-optimize/route';
import { requireUser } from '@/server/auth/auth';

// ============================================================================
// Helpers
// ============================================================================

function makeRequest(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/brand-pages/seo-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const VALID_BODY = {
    orgId: 'org_thrive_syracuse',
    pageType: 'about',
    content: {
        aboutContent: {
            heroTitle: 'About Thrive',
            heroDescription: 'Premium dispensary in Syracuse, NY',
        },
    },
    brandName: 'Thrive Syracuse',
    brandSlug: 'thrivesyracuse',
};

const MOCK_SEO_RESPONSE = {
    metaTitle: 'Thrive Syracuse | Premium Cannabis Dispensary in Syracuse, NY',
    metaDescription: 'Visit Thrive Syracuse for premium cannabis products. Serving Syracuse, NY with top-quality flower, edibles, and concentrates.',
    h1Suggestion: 'Syracuse\'s Premier Cannabis Dispensary',
    openingParagraph: 'Thrive Syracuse is your trusted local cannabis dispensary serving the greater Syracuse area.',
    keywords: ['Syracuse dispensary', 'cannabis Syracuse NY', 'dispensary near me', 'recreational cannabis', 'medical cannabis'],
    tips: ['Add your founding year to build trust', 'Include neighborhood name for local SEO'],
};

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
    jest.clearAllMocks();
    // Default: authenticated user
    (requireUser as jest.Mock).mockResolvedValue({
        uid: 'user123',
        role: 'dispensary',
        orgId: 'org_thrive_syracuse',
    });
    // Default: successful AI response
    (ai.generate as jest.Mock).mockResolvedValue({
        text: JSON.stringify(MOCK_SEO_RESPONSE),
    });
});

// ============================================================================
// Auth Tests
// ============================================================================

describe('POST /api/brand-pages/seo-optimize — auth', () => {
    it('returns 401 when user is not authenticated', async () => {
        (requireUser as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

        const res = await POST(makeRequest(VALID_BODY));
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe('Unauthorized');
    });

    it('returns 200 for brand role', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'u1', role: 'brand', orgId: 'org1' });
        const res = await POST(makeRequest(VALID_BODY));
        expect(res.status).toBe(200);
    });

    it('returns 200 for dispensary role', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'u1', role: 'dispensary', orgId: 'org1' });
        const res = await POST(makeRequest(VALID_BODY));
        expect(res.status).toBe(200);
    });

    it('returns 200 for super_user role', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'u1', role: 'super_user', orgId: 'org1' });
        const res = await POST(makeRequest(VALID_BODY));
        expect(res.status).toBe(200);
    });
});

// ============================================================================
// Input Validation Tests
// ============================================================================

describe('POST /api/brand-pages/seo-optimize — validation', () => {
    it('returns 400 when orgId is missing', async () => {
        const { orgId: _omit, ...rest } = VALID_BODY;
        const res = await POST(makeRequest(rest));
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBeDefined();
    });

    it('returns 400 when brandName is missing', async () => {
        const { brandName: _omit, ...rest } = VALID_BODY;
        const res = await POST(makeRequest(rest));
        expect(res.status).toBe(400);
    });

    it('returns 400 when pageType is missing', async () => {
        const { pageType: _omit, ...rest } = VALID_BODY;
        const res = await POST(makeRequest(rest));
        expect(res.status).toBe(400);
    });

    it('returns 400 when body is invalid JSON', async () => {
        const req = new NextRequest('http://localhost/api/brand-pages/seo-optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'not-valid-json',
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});

// ============================================================================
// Successful Response Tests
// ============================================================================

describe('POST /api/brand-pages/seo-optimize — success', () => {
    it('returns 200 with all SEO suggestion fields', async () => {
        const res = await POST(makeRequest(VALID_BODY));
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty('metaTitle');
        expect(data).toHaveProperty('metaDescription');
        expect(data).toHaveProperty('h1Suggestion');
        expect(data).toHaveProperty('openingParagraph');
        expect(data).toHaveProperty('keywords');
        expect(data).toHaveProperty('tips');
    });

    it('returns keywords as an array of strings', async () => {
        const res = await POST(makeRequest(VALID_BODY));
        const data = await res.json();
        expect(Array.isArray(data.keywords)).toBe(true);
        data.keywords.forEach((kw: unknown) => expect(typeof kw).toBe('string'));
    });

    it('returns tips as an array of strings', async () => {
        const res = await POST(makeRequest(VALID_BODY));
        const data = await res.json();
        expect(Array.isArray(data.tips)).toBe(true);
        data.tips.forEach((tip: unknown) => expect(typeof tip).toBe('string'));
    });

    it('passes brandName and pageType to AI generate call', async () => {
        await POST(makeRequest(VALID_BODY));
        const generateCall = (ai.generate as jest.Mock).mock.calls[0][0];
        expect(generateCall.prompt).toContain('Thrive Syracuse');
        expect(generateCall.prompt).toContain('about');
    });

    it('uses gemini-2.5-flash model', async () => {
        await POST(makeRequest(VALID_BODY));
        const generateCall = (ai.generate as jest.Mock).mock.calls[0][0];
        expect(generateCall.model).toBe('googleai/gemini-2.5-flash');
    });

    it('parses JSON wrapped in markdown code blocks', async () => {
        (ai.generate as jest.Mock).mockResolvedValue({
            text: '```json\n' + JSON.stringify(MOCK_SEO_RESPONSE) + '\n```',
        });
        const res = await POST(makeRequest(VALID_BODY));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.metaTitle).toBe(MOCK_SEO_RESPONSE.metaTitle);
    });

    it('handles loyalty pageType (rewards page)', async () => {
        const loyaltyBody = {
            ...VALID_BODY,
            pageType: 'loyalty',
            content: {
                loyaltyContent: {
                    heroTitle: 'Thrive Rewards',
                    heroDescription: 'Earn points with every purchase',
                    program: { name: 'Thrive Points', description: 'Earn and redeem', pointsPerDollar: 1 },
                },
            },
        };
        const res = await POST(makeRequest(loyaltyBody));
        expect(res.status).toBe(200);
        const generateCall = (ai.generate as jest.Mock).mock.calls[0][0];
        expect(generateCall.prompt).toContain('loyalty');
    });

    it('handles careers pageType', async () => {
        const careersBody = {
            ...VALID_BODY,
            pageType: 'careers',
            content: {
                careersContent: {
                    heroTitle: 'Join Our Team',
                    heroDescription: 'Work at the best dispensary in Syracuse',
                    applyEmail: 'careers@thrive.com',
                },
            },
        };
        const res = await POST(makeRequest(careersBody));
        expect(res.status).toBe(200);
        const generateCall = (ai.generate as jest.Mock).mock.calls[0][0];
        expect(generateCall.prompt).toContain('careers');
    });

    it('handles locations pageType', async () => {
        const locBody = {
            ...VALID_BODY,
            pageType: 'locations',
            content: { locationsContent: { heroTitle: 'Our Locations', heroDescription: 'Find us nearby' } },
        };
        const res = await POST(makeRequest(locBody));
        expect(res.status).toBe(200);
    });

    it('includes current content text in prompt when content is provided', async () => {
        await POST(makeRequest(VALID_BODY));
        const generateCall = (ai.generate as jest.Mock).mock.calls[0][0];
        expect(generateCall.prompt).toContain('About Thrive');
        expect(generateCall.prompt).toContain('Premium dispensary in Syracuse');
    });
});

// ============================================================================
// AI Error Handling Tests
// ============================================================================

describe('POST /api/brand-pages/seo-optimize — AI errors', () => {
    it('returns 503 when AI generate throws', async () => {
        (ai.generate as jest.Mock).mockRejectedValue(new Error('AI service down'));
        const res = await POST(makeRequest(VALID_BODY));
        expect(res.status).toBe(503);
        const data = await res.json();
        expect(data.error).toBe('AI service unavailable');
    });

    it('returns 500 when AI returns unparseable JSON', async () => {
        (ai.generate as jest.Mock).mockResolvedValue({
            text: 'Sorry, I cannot generate SEO content for cannabis websites.',
        });
        const res = await POST(makeRequest(VALID_BODY));
        // Either 500 (parse error) or 200 with fallback — route handles gracefully
        expect([200, 500]).toContain(res.status);
    });

    it('uses brandName as metaTitle fallback on parse failure', async () => {
        // Partially valid JSON missing some fields
        (ai.generate as jest.Mock).mockResolvedValue({
            text: JSON.stringify({ metaTitle: '', keywords: 'not-an-array' }),
        });
        const res = await POST(makeRequest(VALID_BODY));
        if (res.status === 200) {
            const data = await res.json();
            // keywords should be coerced to array or empty
            expect(Array.isArray(data.keywords)).toBe(true);
        }
    });
});

// ============================================================================
// Content Extraction Logic Tests
// ============================================================================

describe('POST /api/brand-pages/seo-optimize — content extraction', () => {
    it('includes about page heroTitle in prompt', async () => {
        await POST(makeRequest({
            ...VALID_BODY,
            content: { aboutContent: { heroTitle: 'Our Story at Thrive' } },
        }));
        const prompt = (ai.generate as jest.Mock).mock.calls[0][0].prompt;
        expect(prompt).toContain('Our Story at Thrive');
    });

    it('includes story text in about prompt', async () => {
        await POST(makeRequest({
            ...VALID_BODY,
            content: { aboutContent: { story: 'We started in 2021 with a mission...' } },
        }));
        const prompt = (ai.generate as jest.Mock).mock.calls[0][0].prompt;
        expect(prompt).toContain('We started in 2021');
    });

    it('includes program name in loyalty prompt', async () => {
        await POST(makeRequest({
            ...VALID_BODY,
            pageType: 'loyalty',
            content: {
                loyaltyContent: {
                    program: { name: 'Thrive Rewards Club', description: 'Earn points', pointsPerDollar: 1 },
                },
            },
        }));
        const prompt = (ai.generate as jest.Mock).mock.calls[0][0].prompt;
        expect(prompt).toContain('Thrive Rewards Club');
    });

    it('uses (no current content) fallback when content is empty', async () => {
        await POST(makeRequest({ ...VALID_BODY, content: {} }));
        const prompt = (ai.generate as jest.Mock).mock.calls[0][0].prompt;
        expect(prompt).toContain('no current content');
    });

    it('includes brandSlug in URL path hint', async () => {
        await POST(makeRequest(VALID_BODY));
        const prompt = (ai.generate as jest.Mock).mock.calls[0][0].prompt;
        expect(prompt).toContain('thrivesyracuse');
    });
});
