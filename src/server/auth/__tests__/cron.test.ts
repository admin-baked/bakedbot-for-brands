const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
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

describe('requireCronSecret', () => {
    let requireCronSecret: typeof import('../cron').requireCronSecret;
    const originalEnv = process.env;

    const makeRequest = (authHeader?: string) =>
        ({
            headers: {
                get: (name: string) =>
                    name.toLowerCase() === 'authorization' ? authHeader ?? null : null,
            },
        } as any);

    beforeAll(async () => {
        ({ requireCronSecret } = await import('../cron'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns 500 when CRON_SECRET is missing', async () => {
        delete process.env.CRON_SECRET;

        const req = makeRequest('Bearer anything');

        const result = await requireCronSecret(req, 'TEST_CRON');
        const body = await result?.json();

        expect(result?.status).toBe(500);
        expect(body).toEqual({ error: 'Server misconfiguration' });
        expect(mockLogger.error).toHaveBeenCalled();
    });

    it('returns 401 when authorization header is missing', async () => {
        process.env.CRON_SECRET = 'test-secret';
        const req = makeRequest();

        const result = await requireCronSecret(req, 'TEST_CRON');
        const body = await result?.json();

        expect(result?.status).toBe(401);
        expect(body).toEqual({ error: 'Unauthorized' });
        expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('returns 401 when authorization header does not match', async () => {
        process.env.CRON_SECRET = 'test-secret';
        const req = makeRequest('Bearer wrong-secret');

        const result = await requireCronSecret(req, 'TEST_CRON');
        const body = await result?.json();

        expect(result?.status).toBe(401);
        expect(body).toEqual({ error: 'Unauthorized' });
        expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('returns null when authorization header matches CRON_SECRET', async () => {
        process.env.CRON_SECRET = 'test-secret';
        const req = makeRequest('Bearer test-secret');

        const result = await requireCronSecret(req, 'TEST_CRON');

        expect(result).toBeNull();
    });
});
