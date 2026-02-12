/**
 * Tests for Campaign Open & Click Tracking API Routes
 *
 * Covers:
 *   - GET /api/track/campaign/open  (1x1 GIF pixel)
 *   - GET /api/track/campaign/click (302 redirect)
 */

// ---------------------------------------------------------------------------
// Mock next/server BEFORE any imports
// (jest.mock is hoisted, so classes must be defined inside the factory)
// ---------------------------------------------------------------------------

jest.mock('next/server', () => {
    class _MockNextRequest {
        url: string;
        constructor(input: string | URL, _init?: unknown) {
            this.url = typeof input === 'string' ? input : input.toString();
        }
    }

    class _MockNextResponse {
        body: unknown;
        status: number;
        headers: Map<string, string>;

        constructor(
            body?: unknown,
            init?: { status?: number; headers?: Record<string, string> },
        ) {
            this.body = body;
            this.status = init?.status || 200;
            this.headers = new Map(Object.entries(init?.headers || {}));
        }

        static redirect(url: string | URL, status = 307) {
            const dest = typeof url === 'string' ? url : url.toString();
            const res = new _MockNextResponse(null, { status });
            res.headers.set('Location', dest);
            return res;
        }
    }

    return {
        NextRequest: _MockNextRequest,
        NextResponse: _MockNextResponse,
    };
});

// ---------------------------------------------------------------------------
// Other mocks
// ---------------------------------------------------------------------------

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ exists: false }),
                update: jest.fn().mockResolvedValue(undefined),
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue({
                            exists: false,
                            data: () => ({}),
                        }),
                        update: jest.fn().mockResolvedValue(undefined),
                    }),
                }),
            }),
        }),
    }),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { NextRequest } from 'next/server';
import { GET as openGET } from '@/app/api/track/campaign/open/route';
import { GET as clickGET } from '@/app/api/track/campaign/click/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal response shape returned by the mocked NextResponse */
interface MockResponse {
    body: unknown;
    status: number;
    headers: Map<string, string>;
}

function makeRequest(url: string): NextRequest {
    const fullUrl = new URL(url, 'http://localhost').toString();
    return new NextRequest(fullUrl);
}

// ---------------------------------------------------------------------------
// Open tracking (/api/track/campaign/open)
// ---------------------------------------------------------------------------

describe('Campaign Open Tracking', () => {
    it('returns image/gif content type', async () => {
        const req = makeRequest('/api/track/campaign/open?rid=r1&cid=c1');
        const res = (await openGET(req)) as unknown as MockResponse;

        expect(res.headers.get('Content-Type')).toBe('image/gif');
    });

    it('returns Cache-Control: no-store header', async () => {
        const req = makeRequest('/api/track/campaign/open?rid=r1&cid=c1');
        const res = (await openGET(req)) as unknown as MockResponse;

        const cacheControl = res.headers.get('Cache-Control');
        expect(cacheControl).toContain('no-store');
    });

    it('still returns a GIF when query params are missing', async () => {
        const req = makeRequest('/api/track/campaign/open');
        const res = (await openGET(req)) as unknown as MockResponse;

        expect(res.headers.get('Content-Type')).toBe('image/gif');
        expect(res.status).toBe(200);
    });
});

// ---------------------------------------------------------------------------
// Click tracking (/api/track/campaign/click)
// ---------------------------------------------------------------------------

describe('Campaign Click Tracking', () => {
    it('returns 302 redirect when url param is provided', async () => {
        const destination = 'https://example.com/promo';
        const req = makeRequest(
            `/api/track/campaign/click?rid=r1&cid=c1&url=${encodeURIComponent(destination)}`,
        );
        const res = (await clickGET(req)) as unknown as MockResponse;

        expect(res.status).toBe(302);
    });

    it('redirect location matches the url param', async () => {
        const destination = 'https://example.com/promo';
        const req = makeRequest(
            `/api/track/campaign/click?rid=r1&cid=c1&url=${encodeURIComponent(destination)}`,
        );
        const res = (await clickGET(req)) as unknown as MockResponse;

        const location = res.headers.get('Location');
        expect(location).toBe(destination);
    });

    it('redirects to bakedbot.ai when url param is missing', async () => {
        const req = makeRequest('/api/track/campaign/click');
        const res = (await clickGET(req)) as unknown as MockResponse;

        expect(res.status).toBe(302);
        expect(res.headers.get('Location')).toBe('https://bakedbot.ai');
    });
});
