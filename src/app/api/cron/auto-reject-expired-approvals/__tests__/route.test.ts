const mockAutoRejectExpiredRequests = jest.fn();
const mockNotifyApprovalRejected = jest.fn();
const mockGetAdminFirestore = jest.fn();

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

jest.mock('@/server/services/approval-queue', () => ({
    autoRejectExpiredRequests: (...args: unknown[]) => mockAutoRejectExpiredRequests(...args),
}));

jest.mock('@/server/services/approval-notifications', () => ({
    notifyApprovalRejected: (...args: unknown[]) => mockNotifyApprovalRejected(...args),
}));

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: (...args: unknown[]) => mockGetAdminFirestore(...args),
}));

jest.mock('@/lib/logger', () => ({
    logger: mockLogger,
}));

function makeFirestoreForRejectedIds(
    rejectedIds: string[],
    docsById: Record<string, Record<string, unknown>>,
) {
    const collectionMock = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
            docs: rejectedIds.map((id) => ({ id })),
        }),
        doc: jest.fn((id: string) => ({
            get: jest.fn().mockResolvedValue({
                id,
                exists: Boolean(docsById[id]),
                data: () => docsById[id],
            }),
        })),
    };

    return {
        collection: jest.fn(() => collectionMock),
    };
}

function makeRequest(authHeader?: string) {
    return {
        headers: {
            get: (name: string) =>
                name.toLowerCase() === 'authorization' ? authHeader ?? null : null,
        },
    } as any;
}

describe('POST /api/cron/auto-reject-expired-approvals', () => {
    let GET: typeof import('../route').GET;
    let POST: typeof import('../route').POST;
    const originalEnv = process.env;

    beforeAll(async () => {
        ({ GET, POST } = await import('../route'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        mockGetAdminFirestore.mockReturnValue(makeFirestoreForRejectedIds([], {}));
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns 500 when CRON_SECRET is not configured', async () => {
        delete process.env.CRON_SECRET;
        mockAutoRejectExpiredRequests.mockResolvedValue(0);

        const req = makeRequest('Bearer anything');

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json).toEqual({ error: 'Server misconfiguration' });
    });

    it('returns 401 when authorization header is missing', async () => {
        process.env.CRON_SECRET = 'test-secret';
        mockAutoRejectExpiredRequests.mockResolvedValue(0);

        const req = makeRequest();

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('auto-rejects expired requests and sends rejection notifications', async () => {
        process.env.CRON_SECRET = 'test-secret';
        mockAutoRejectExpiredRequests.mockResolvedValue(2);

        const docsById = {
            'req-1': {
                id: 'req-1',
                status: 'rejected',
                operationType: 'cloud_scheduler_create',
            },
            'req-2': {
                id: 'req-2',
                status: 'rejected',
                operationType: 'cloud_scheduler_delete',
            },
        };

        mockGetAdminFirestore.mockReturnValue(
            makeFirestoreForRejectedIds(['req-1', 'req-2'], docsById),
        );

        const req = makeRequest('Bearer test-secret');

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.rejectedCount).toBe(2);
        expect(mockNotifyApprovalRejected).toHaveBeenCalledTimes(2);
        expect(mockNotifyApprovalRejected).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'req-1' }),
            'system',
        );
    });

    it('GET delegates to POST logic when authorized', async () => {
        process.env.CRON_SECRET = 'test-secret';
        mockAutoRejectExpiredRequests.mockResolvedValue(0);

        const req = makeRequest('Bearer test-secret');

        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(mockAutoRejectExpiredRequests).toHaveBeenCalledTimes(1);
    });
});
