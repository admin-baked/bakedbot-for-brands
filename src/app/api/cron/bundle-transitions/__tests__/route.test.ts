const mockTransitionBundles = jest.fn();

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

jest.mock('next/server', () => ({
    NextResponse: {
        json: (body: unknown, init?: { status?: number }) => ({
            status: init?.status ?? 200,
            json: async () => body,
        }),
    },
}));

jest.mock('@/lib/logger', () => ({
    logger: mockLogger,
}));

jest.mock('@/server/services/bundle-scheduler', () => ({
    BundleSchedulerService: jest.fn().mockImplementation(() => ({
        transitionBundles: (...args: unknown[]) => mockTransitionBundles(...args),
    })),
}));

function makePostRequest(authHeader?: string) {
    return {
        headers: {
            get: (name: string) =>
                name.toLowerCase() === 'authorization' ? authHeader ?? null : null,
        },
    } as any;
}

function makeGetRequest(secret?: string) {
    const query = secret ? `?secret=${encodeURIComponent(secret)}` : '';
    return { url: `https://example.com/api/cron/bundle-transitions${query}` } as any;
}

describe('/api/cron/bundle-transitions route', () => {
    let GET: typeof import('../route').GET;
    let POST: typeof import('../route').POST;
    const originalEnv = process.env;

    beforeAll(async () => {
        ({ GET, POST } = await import('../route'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        mockTransitionBundles.mockResolvedValue({
            success: true,
            duration: 42,
            transitionsPerformed: [],
            errors: [],
        });
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns 500 when CRON_SECRET is missing', async () => {
        delete process.env.CRON_SECRET;

        const res = await POST(makePostRequest('Bearer any'));
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json).toEqual({ error: 'Server configuration error' });
    });

    it('returns 401 when authorization header is invalid', async () => {
        process.env.CRON_SECRET = 'expected';

        const res = await POST(makePostRequest('Bearer wrong'));
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('runs scheduler and returns transition summary when authorized', async () => {
        process.env.CRON_SECRET = 'expected';
        mockTransitionBundles.mockResolvedValue({
            success: true,
            duration: 99,
            transitionsPerformed: [{ id: 'bundle-1', from: 'scheduled', to: 'active' }],
            errors: [],
        });

        const res = await POST(makePostRequest('Bearer expected'));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(mockTransitionBundles).toHaveBeenCalledTimes(1);
        expect(json.success).toBe(true);
        expect(json.summary).toEqual({
            transitionsPerformed: 1,
            errorsEncountered: 0,
        });
    });

    it('returns 401 for GET when secret query param is missing', async () => {
        process.env.CRON_SECRET = 'expected';

        const res = await GET(makeGetRequest());
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('runs scheduler for GET when secret query param matches', async () => {
        process.env.CRON_SECRET = 'expected';
        mockTransitionBundles.mockResolvedValue({
            success: true,
            duration: 17,
            transitionsPerformed: [{ id: 'bundle-2', from: 'active', to: 'expired' }],
            errors: [],
        });

        const res = await GET(makeGetRequest('expected'));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(mockTransitionBundles).toHaveBeenCalledTimes(1);
        expect(json.success).toBe(true);
        expect(json.duration).toBe(17);
    });
});
